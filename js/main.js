import { DuskConnection } from './connection.js';
import { makeDraggable } from './drag.js';
import { Hotbar } from './hotbar.js';
import { LoginFlow, isYesNo } from './login.js';
import { isDeath, parseLoss, lossSentence } from './death.js';
import { Sound } from './sound.js';
import { parseCast, effectKind, isCastFailure, landedOnMe, castCommand, compileMessages, decodeFx } from './spells.js';
import { Spellbook } from './spellbook.js';
import { parseStats } from './stats.js';
import { bareName } from './world.js';
import { EntityMenu } from './entitymenu.js';
import { Explored } from './explored.js';
import { Minimap } from './minimap.js';
import { Panels, setBar } from './panels.js';
import { Player } from './player.js';
import { OP, opName } from './protocol.js';
import { Renderer } from './renderer.js';
import { loadSheets, SpriteSheet } from './sprites.js';
import { describeRaces } from './races.js';
import { World } from './world.js';

const $ = (id) => document.getElementById(id);
const output = $('output');
const input = $('input');
const serverUrl = $('server-url');
const connectBtn = $('connect-btn');
const sendBtn = $('send-btn');
const dot = $('status-dot');
const traceBox = $('trace');
const namesBox = $('names');
const minimapBox = $('minimap-toggle');
const hotbarBox = $('hotbar-toggle');
const stepsBox = $('steps-toggle');

const MAX_LINES = 2000;
const HISTORY_MAX = 100;
const DEFAULT_BRIDGE = 'ws://192.168.4.61:8765';
// The game server's own ResourceServer, tried on the bridge's host if the
// address from opcode 1 doesn't serve the sprite sheets.
const FALLBACK_RC_PORT = 8000;
// How often explored tiles are written to localStorage while playing.
const SAVE_EXPLORED_MS = 10000;
// A cast's effect waits this long for a "You don't have enough mp" or
// similar reply before it plays.
const CAST_WAIT_MS = 350;
// How long the login card waits for the server's first question.
const LOGIN_TIMEOUT_MS = 12000;
// After "Create character", if the server asks something the card doesn't
// know, show the game (and its chat) after this long so it can be answered.
const NEW_CHAR_FALLBACK_MS = 10000;
// Lines that explain why the server dropped us, shown on the overlay.
const DROP_REASONS = [/disconnected for being idle/i, /another logon under this name/i, /^Goodbye/i];

let conn = null;
let loaded = false;
const history = [];
let historyPos = 0;
const finePointer = window.matchMedia?.('(pointer: fine)');
let player = new Player();
const panels = new Panels(document.body, player, (cmd) => runCommand(cmd));
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let world = newWorld();
const renderer = new Renderer($('map'), world, $('map-wrap'));
let sheetsFor = null; // resource address the current sheets came from
const minimap = new Minimap($('minimap'), new Explored());
const entityMenu = new EntityMenu(
  $('entity-menu'),
  (cmd) => runCommand(cmd),
  () => ({ x: world.locX, y: world.locY, range: player.range }),
);
entityMenu.onShop = () => panels.openShop();
const hotbar = new Hotbar($('hotbar'), $('hotbar-picker'), $('map-wrap'), {
  send: (cmd) => runCommand(cmd),
  context: () => ({
    spells: parseStats(player.stats).sections.find((s) => /spell/i.test(s.title))?.items ?? [],
    actions: player.actions,
    items: player.groupedItems().map((g) => g.name),
    itemId: (name) => player.items.find((i) => i.name.toLowerCase() === name.toLowerCase())?.id ?? null,
    target: world.entities.get(targetId) ?? null,
  }),
  load: (key) => storage('get', key),
  save: (key, value) => storage('set', key, value),
});
// Casts whose effects are waiting for a possible failure reply, oldest
// first; the server answers casts in order.
const pendingCasts = [];
// Each spell's own success and "landed on you" lines, once spellinfo.json loads.
let spellMessages = compileMessages(null);
const spellbook = new Spellbook($('tab-book'), {
  cast: (spell, atTarget) => {
    const t = atTarget ? world.entities.get(targetId) : null;
    runCommand(castCommand(spell, t ? bareName(t.name) : ''));
  },
  toHotbar: (spell) => hotbar.addSpell(spell),
  hasTarget: () => world.entities.has(targetId),
});
panels.onSpells = (listed) => spellbook.setKnown(listed);
fetch('js/spellinfo.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((info) => {
    if (!info) return;
    spellbook.setInfo(info);
    spellMessages = compileMessages(info);
  })
  .catch(() => {});
const sound = new Sound();
// localStorage key for this character's explored tiles, set once we know
// who's logging in; until then tiles are only kept in memory.
let exploredKey = null;
let loginName = null;
let targetId = -1; // Dusk.java's targetID; -1 means none

const ARROWS = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e' };
const WASD = { w: 'n', s: 's', a: 'w', d: 'e' };

// ---- setup -----------------------------------------------------------------

serverUrl.value =
  new URLSearchParams(location.search).get('server') ||
  storage('get', 'dusk.server') ||
  DEFAULT_BRIDGE;
traceBox.checked = storage('get', 'dusk.trace') === '1';
traceBox.addEventListener('change', () => storage('set', 'dusk.trace', traceBox.checked ? '1' : '0'));
namesBox.checked = storage('get', 'dusk.names') !== '0';
renderer.showNames = namesBox.checked;
namesBox.addEventListener('change', () => {
  storage('set', 'dusk.names', namesBox.checked ? '1' : '0');
  renderer.showNames = namesBox.checked;
  renderer.invalidate();
});

minimapBox.checked = storage('get', 'dusk.minimap') !== '0';
$('minimap').hidden = !minimapBox.checked;
minimapBox.addEventListener('change', () => {
  storage('set', 'dusk.minimap', minimapBox.checked ? '1' : '0');
  $('minimap').hidden = !minimapBox.checked;
  minimap.invalidate();
});
// Drag the minimap anywhere over the map; it remembers where. Settings
// has a button to put it back in the bottom-right corner.
const savedPos = (storage('get', 'dusk.minimap.pos') ?? '').split(',').map(Number);
const minimapDrag = makeDraggable($('minimap'), $('map-stage'), {
  pos: savedPos.length === 2 && savedPos.every((v) => v >= 0 && v <= 1) ? savedPos : [1, 1],
  onMove: (pos) => storage('set', 'dusk.minimap.pos', pos.map((v) => v.toFixed(3)).join(',')),
});
$('minimap-reset').addEventListener('click', () => minimapDrag.reset());
$('minimap').addEventListener('click', () => minimap.cycleZoom());
setInterval(saveExplored, SAVE_EXPLORED_MS);

// Sound: the speaker button and the Settings checkbox both mute; the two
// volume sliders (top bar, and Settings on phones) stay in step.
const volumes = [...document.querySelectorAll('.volume')];
function setSoundOn(on) {
  sound.enabled = on;
  $('sound-toggle').checked = on;
  const btn = $('mute-btn');
  btn.textContent = on ? '🔊' : '🔇';
  btn.setAttribute('aria-pressed', String(!on));
  btn.title = on ? 'Sound on (click to mute)' : 'Muted (click for sound)';
  storage('set', 'dusk.sound', on ? '1' : '0');
}
setSoundOn(storage('get', 'dusk.sound') !== '0');
sound.setVolume(Number(storage('get', 'dusk.volume') ?? 60) / 100);
for (const v of volumes) {
  v.value = String(Math.round(sound.volume * 100));
  v.addEventListener('input', () => {
    sound.setVolume(Number(v.value) / 100);
    for (const w of volumes) if (w !== v) w.value = v.value;
    storage('set', 'dusk.volume', v.value);
    if (!sound.enabled && Number(v.value) > 0) setSoundOn(true);
  });
  // A sample at the new level once you let go.
  v.addEventListener('change', () => sound.play('hit'));
}
$('sound-toggle').addEventListener('change', (e) => setSoundOn(e.target.checked));
$('mute-btn').addEventListener('click', () => {
  setSoundOn(!sound.enabled);
  if (sound.enabled) sound.play('heal');
});

// Chat across the bottom (like the Java client) or under the side column.
$('chat-bottom').checked = storage('get', 'dusk.chatbottom') !== '0';
document.body.classList.toggle('chat-bottom', $('chat-bottom').checked);
$('chat-bottom').addEventListener('change', (e) => {
  document.body.classList.toggle('chat-bottom', e.target.checked);
  storage('set', 'dusk.chatbottom', e.target.checked ? '1' : '0');
  output.scrollTop = output.scrollHeight;
  // Resize right away rather than waiting on the resize observers.
  renderer.resize();
  hotbar.place();
  minimap.invalidate();
});

stepsBox.checked = storage('get', 'dusk.steps') !== '0';
stepsBox.addEventListener('change', () => storage('set', 'dusk.steps', stepsBox.checked ? '1' : '0'));

hotbarBox.checked = storage('get', 'dusk.hotbar.on') !== '0';
hotbarBox.addEventListener('change', () => {
  storage('set', 'dusk.hotbar.on', hotbarBox.checked ? '1' : '0');
  $('hotbar').hidden = !hotbarBox.checked || !$('char-card').offsetParent;
  if (!hotbarBox.checked) hotbar.closePicker();
  hotbar.place();
});
// On a phone there's no black space beside the map, so the bar starts
// along the top edge instead, until it's moved.
try {
  hotbar.setDock(JSON.parse(storage('get', 'dusk.hotbar.dock') ?? 'null') ??
    (window.innerWidth < 900 ? { edge: 'top', along: 0 } : null));
} catch {}
hotbar.onDock = (dock) => storage('set', 'dusk.hotbar.dock', JSON.stringify(dock));
hotbar.useKey('default');
addEventListener('pagehide', saveExplored);

// The panel starts folded on narrow screens, where the output needs the
// room, unless it was left open last time.
const panelState = storage('get', 'dusk.panel');
const [savedTab, savedOpen] = panelState ? panelState.split(':') : [];
panels.selectByName(savedTab ?? 'inv', savedOpen ? savedOpen === '1' : window.innerWidth >= 800);
panels.onToggle = (tab, open) => storage('set', 'dusk.panel', `${tab}:${open ? 1 : 0}`);

// ---- logging in --------------------------------------------------------------
//
// The login card answers the server's name and password questions (see
// js/login.js), then swaps to the game. If the connection drops while
// playing, an overlay offers Reconnect with the same name and password.

let loginFlow = null; // while logging in
let loginTimer = null;
let creds = null; // { name, password } for Reconnect
let inGame = false; // past "Login Accepted." on this connection
let quitting = false; // the player pressed Log out
let dropReason = '';

const LOGIN_KEY = 'dusk.login';
try {
  const saved = JSON.parse(storage('get', LOGIN_KEY) ?? 'null');
  if (saved?.name) {
    $('login-name').value = saved.name;
    $('login-pass').value = saved.password ?? '';
    $('login-remember').checked = !!saved.password;
  }
} catch {}
$('login-server').textContent = serverUrl.value;
serverUrl.addEventListener('change', () => ($('login-server').textContent = serverUrl.value.trim()));

$('connect-form').addEventListener('submit', (e) => {
  e.preventDefault();
  storage('set', 'dusk.server', serverUrl.value.trim());
  $('login-server').textContent = serverUrl.value.trim();
  $('settings').open = false;
});

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('login-name').value.trim();
  const password = $('login-pass').value;
  if (!name || !password) return;
  // Remembered on this device only when ticked; otherwise just the name.
  storage('set', LOGIN_KEY, JSON.stringify($('login-remember').checked ? { name, password } : { name }));
  startLogin(name, password);
});
$('login-create').addEventListener('click', () => {
  $('login-new').hidden = true;
  conn?.send('yes');
  loginMessage('Creating your character…');
  armNewCharFallback();
});
$('race-buttons').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-race]');
  if (!b || !loginFlow) return;
  const race = b.dataset.race;
  conn?.send(loginFlow.pickRace(race).send);
  // The race is the last question; the game starts from here.
  $('login-races').hidden = true;
  clearTimeout(loginTimer);
  clearTimeout(newCharTimer);
  loginFlow = null;
  enterGame();
});

// What each race gives (from js/raceinfo.json), for the race buttons, and
// players.gif to show what each looks like.
let raceInfo = {};
fetch('js/raceinfo.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((info) => (raceInfo = describeRaces(info)))
  .catch(() => {});
let playerSheet = null;

// players.gif comes from the game's resource server on the bridge's host
// (the address opcode 1 would give isn't known yet during login).
function loadPlayerSheet() {
  if (playerSheet) return Promise.resolve(playerSheet);
  if (renderer.sheets?.players) return Promise.resolve((playerSheet = renderer.sheets.players));
  return new Promise((resolve) => {
    let host = '';
    try {
      host = new URL(serverUrl.value.trim().replace(/^ws/, 'http')).hostname;
    } catch {}
    const img = new Image();
    img.onload = () => resolve((playerSheet = new SpriteSheet(img)));
    img.onerror = () => resolve(null);
    img.src = `http://${host}:${FALLBACK_RC_PORT}/images/players.gif`;
  });
}

function raceButton(race) {
  const d = raceInfo[race];
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.race = race;
  b.className = 'race';
  const pic = document.createElement('canvas');
  pic.className = 'race-pic';
  pic.width = pic.height = 40;
  pic.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.className = 'race-name';
  name.textContent = race;
  b.append(pic, name);
  if (d) {
    const tags = document.createElement('span');
    tags.className = 'race-tags';
    tags.textContent = d.tags.join('  ') || 'no bonuses';
    b.append(tags);
    if (d.elsewhere) {
      const note = document.createElement('span');
      note.className = 'race-note';
      note.textContent = d.note;
      b.append(note);
    }
    b.title = d.title;
    b.setAttribute('aria-label', d.title);
    // Standing, facing south (frame 2 of the race's 8 in players.gif).
    if (d.image !== null) {
      loadPlayerSheet().then((sheet) => sheet?.draw(pic.getContext('2d'), d.image * 8 + 2, 0, 0, 40));
    }
  }
  return b;
}

let newCharTimer = null;
function armNewCharFallback() {
  clearTimeout(newCharTimer);
  newCharTimer = setTimeout(() => {
    if (loginFlow && !inGame) {
      sysLine('The server is asking something more; answer it here.');
      enterGame();
    }
  }, NEW_CHAR_FALLBACK_MS);
}
$('login-cancel').addEventListener('click', () => {
  $('login-new').hidden = true;
  conn?.send('no');
  failLogin('Not created. Check the name, or pick another.');
});
$('reconnect').addEventListener('click', () => creds && startLogin(creds.name, creds.password, true));
$('overlay-logout').addEventListener('click', () => showLogin());
connectBtn.addEventListener('click', () => logOut());
$('forget-login').addEventListener('click', () => {
  storage('set', LOGIN_KEY, JSON.stringify({ name: $('login-name').value.trim() }));
  $('login-pass').value = '';
  $('login-remember').checked = false;
  $('forget-login').textContent = 'Forgotten';
  setTimeout(() => ($('forget-login').textContent = 'Forget saved login'), 1500);
});

// ---- bug reports -------------------------------------------------------------
//
// A web page can't send email by itself, so this fills in a message to the
// admins and hands it to the player's email app (a mailto: link), with
// Copy text for when there isn't one.

const BUG_EMAIL = 'duskadmins@gmail.com';
// Email links much longer than this get cut off by some mail apps.
const MAILTO_MAX = 1800;
const bugDialog = $('bug-dialog');

$('report-bug').addEventListener('click', () => {
  $('settings').open = false;
  $('bug-msg').textContent = '';
  bugDialog.showModal();
  $('bug-subject').focus();
});
$('bug-cancel').addEventListener('click', () => bugDialog.close());
$('bug-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const { subject, body } = bugReport();
  let link = mailto(subject, body);
  // Trim the chat lines first if the link is too long.
  for (let lines = 12; link.length > MAILTO_MAX && lines >= 0; lines -= 3) link = mailto(subject, bugReport(lines).body);
  location.href = link;
  $('bug-msg').textContent = `Your email app should open with the message. If nothing happened, use Copy text and send it to ${BUG_EMAIL} yourself.`;
});
$('bug-copy').addEventListener('click', async () => {
  const { subject, body } = bugReport();
  const ok = await copyText(`To: ${BUG_EMAIL}\nSubject: ${subject}\n\n${body}`);
  $('bug-msg').textContent = ok
    ? `Copied. Paste it into an email to ${BUG_EMAIL}.`
    : `Couldn't copy here; please email ${BUG_EMAIL} yourself.`;
});

// The clipboard API only works on https pages; this client is served over
// plain http on the LAN, so fall back to copying from a hidden text box.
async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      // It can wait on a permission prompt; don't wait forever.
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => setTimeout(reject, 1000)),
      ]);
      return true;
    } catch {}
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
  bugDialog.append(box); // inside the dialog, so the modal lets it take focus
  box.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {}
  box.remove();
  return ok;
}

function bugReport(chatLines = 12) {
  const subject = `[Dusk web] ${$('bug-subject').value.trim() || 'Bug report'}`;
  let body = $('bug-text').value.trim();
  if ($('bug-details').checked) {
    const lines = [...output.querySelectorAll('.line:not(.trace)')].slice(-chatLines).map((l) => l.textContent);
    body += [
      '',
      '',
      '--- details ---',
      `Page: ${location.origin}${location.pathname}`,
      `Browser: ${navigator.userAgent}`,
      `Screen: ${screen.width}x${screen.height}, window ${innerWidth}x${innerHeight}, scale ${devicePixelRatio}`,
      `Server: ${serverUrl.value}`,
      `Character: ${player.name ?? '(not logged in)'} at ${player.x}, ${player.y}, HP ${player.hp}/${player.maxhp}`,
      `Time: ${new Date().toISOString()}`,
      ...(lines.length ? ['Last chat lines:', ...lines.map((l) => `  ${l}`)] : []),
    ].join('\n');
  }
  return { subject, body };
}

function mailto(subject, body) {
  return `mailto:${BUG_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Yes / No for questions like "Do you want players to be able to see your
// presence? (yes/no)".
$('prompt-bar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-answer]');
  if (!b) return;
  runCommand(b.dataset.answer);
  $('prompt-bar').hidden = true;
});

function startLogin(name, password, again = false) {
  creds = { name, password };
  quitting = false;
  dropReason = '';
  $('overlay').hidden = true;
  $('login-new').hidden = true;
  $('login-races').hidden = true;
  $('login-play').disabled = true;
  loginMessage(again ? 'Reconnecting…' : 'Connecting…');
  if (again) sysLine('Reconnecting…');
  if (conn) {
    conn.close();
    conn = null;
  }
  connect(serverUrl.value.trim());
  if (!conn) return failLogin('The server address under Settings should start with ws:// or wss://');
  loginFlow = new LoginFlow(name, password);
  useExploredFor(name);
  clearTimeout(loginTimer);
  loginTimer = setTimeout(() => {
    if (loginFlow && loginFlow.state === 'name') failLogin('The server didn\'t answer. Is it running?');
  }, LOGIN_TIMEOUT_MS);
}

// Feeds a server line to the login; true if it was part of logging in.
function handleLogin(text) {
  if (!loginFlow) return false;
  const r = loginFlow.feed(text);
  if (!r) return false;
  if (r.send !== undefined) conn?.send(r.send);
  else if (r.confirmNew) {
    $('login-new-name').textContent = r.confirmNew;
    $('login-new').hidden = false;
    loginMessage('');
  } else if (r.races) {
    clearTimeout(newCharTimer);
    $('race-buttons').replaceChildren(...r.races.map(raceButton));
    $('login-races').hidden = false;
    loginMessage('');
  } else if (r.raceError) {
    $('login-races').hidden = false;
    loginMessage('The server didn\'t accept that race; pick another.', true);
  } else if (r.failed) failLogin(r.failed);
  else if (r.accepted) {
    // A new character: its race question is next.
    loginMessage('Character created. Choosing a race…');
    armNewCharFallback();
  } else if (r.done) {
    clearTimeout(loginTimer);
    clearTimeout(newCharTimer);
    $('login-races').hidden = true;
    loginFlow = null;
    enterGame();
  }
  return true;
}

function enterGame() {
  inGame = true;
  $('login-play').disabled = false;
  loginMessage('');
  setMode('game');
  input.focus();
}

function failLogin(message) {
  clearTimeout(loginTimer);
  loginFlow = null;
  inGame = false;
  quitting = true; // not a dropped game, so no Reconnect overlay
  conn?.close();
  showLogin();
  loginMessage(message, true);
}

function showLogin() {
  $('overlay').hidden = true;
  $('login-play').disabled = false;
  $('login-new').hidden = true;
  $('login-races').hidden = true;
  clearTimeout(newCharTimer);
  if (conn) {
    quitting = true;
    conn.close();
  }
  setMode('login');
  $('login-pass').focus();
}

// Log out: "quit" lets the server save and say goodbye before we close.
function logOut() {
  quitting = true;
  if (conn?.connected) {
    conn.send('quit');
    const c = conn;
    setTimeout(() => c.close(), 800);
  }
  showLogin();
  loginMessage('Logged out.');
}

function loginMessage(text, error = false) {
  $('login-msg').textContent = text;
  $('login-msg').classList.toggle('error', error);
}

// The login screen, or the game.
function setMode(mode) {
  document.body.classList.toggle('in-login', mode === 'login');
  document.body.classList.toggle('playing', mode === 'game');
  connectBtn.hidden = mode !== 'game';
  if (mode === 'game') renderer.resize();
}

// Lost the connection mid-game: offer Reconnect over the map.
function connectionLost() {
  if (!inGame || quitting) return;
  $('overlay-title').textContent = 'Connection lost';
  $('overlay-text').textContent = dropReason || 'The connection to the server closed.';
  $('reconnect').hidden = !creds;
  $('overlay').hidden = false;
  $('reconnect').focus();
}

$('input-form').addEventListener('submit', (e) => {
  e.preventDefault();
  submitInput();
});

// Arrow keys walk, like Dusk.java's keyPressed(), including while the
// command box has focus, as long as it's empty; with text in it, Up/Down
// browse the command history instead. WASD walks when you're not typing.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const inInput = e.target === input;
  const typing = inInput && input.value !== '';
  if (typing && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    if (input.type === 'password' || history.length === 0) return;
    e.preventDefault();
    historyPos = Math.max(0, Math.min(history.length, historyPos + (e.key === 'ArrowUp' ? -1 : 1)));
    input.value = history[historyPos] ?? '';
    return;
  }
  const inOtherField = !inInput && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName);
  if (e.key === 'Enter' && !inInput && !inOtherField && !input.disabled) {
    e.preventDefault();
    input.focus();
    return;
  }
  // 1-9 and 0 use the hotbar slots, like the arrows only while the command
  // box is empty.
  if (!typing && !inOtherField && !$('hotbar').hidden && /^[0-9]$/.test(e.key) && canAct()) {
    if (hotbar.pressKey(e.key)) e.preventDefault();
    return;
  }
  const dir = typing || inOtherField ? null : ARROWS[e.key] ?? (inInput ? null : WASD[e.key.toLowerCase()]);
  if (dir && canAct()) {
    e.preventDefault();
    conn.send(dir);
  }
});

// Clicking the map: an empty square walks there ("goto x y"), like
// Dusk.java's mouseClicked(). Anything else opens a menu of what you can
// do to it; a creature or player is also targeted, as in Java, so its HP
// shows in the status line.
$('map').addEventListener('click', (e) => {
  if (entityMenu.consumeDismiss()) return;
  const cell = renderer.cellAt(e);
  if (!cell || !canAct()) return;
  const [vx, vy] = cell;
  const here = [...world.entities.values()].filter((ent) => {
    const [ex, ey] = world.toView(ent.x, ent.y);
    return ex === vx && ey === vy;
  });
  if (here.length === 0) {
    conn.send(`goto ${vx + world.locX - world.viewRange} ${vy + world.locY - world.viewRange}`);
    return;
  }
  const target = here.find((ent) => ent.type === 0 || ent.type === 4);
  if (target) targetEntity(target);
  const box = $('map-stage').getBoundingClientRect();
  // e.detail is 0 for a keyboard "click", which should focus the first choice.
  entityMenu.show(here, world.displayNames(), e.clientX - box.left, e.clientY - box.top, e.detail === 0);
});

// The target card's buttons act on whatever is targeted now.
$('target-attack').addEventListener('click', () => targetCommand(`a ${targetId}`));
$('target-look').addEventListener('click', () => targetCommand(`look ${targetId}`));
$('target-clear').addEventListener('click', clearTarget);

setMode('login');
if ($('login-name').value) $('login-pass').focus();
else $('login-name').focus();

// ---- connection ------------------------------------------------------------

function connect(url) {
  if (!/^wss?:\/\//.test(url)) {
    errLine('Bridge address should start with ws:// or wss://');
    return;
  }
  storage('set', 'dusk.server', url);
  loaded = false;
  targetId = -1;
  player = panels.player = new Player();
  panels.setOnMerchant(null);
  panels.renderAll();
  saveExplored();
  exploredKey = loginName = null;
  minimap.setExplored(new Explored());
  world = newWorld();
  renderer.world = world;
  renderer.resize();
  setState('pending');
  sysLine(`Connecting to ${url}…`);

  conn = new DuskConnection(url);
  conn.addEventListener('open', () => {
    setState('on');
    sysLine('Connected. Waiting for the server…');
    // The server waits for the name before saying anything.
    if (loginFlow) conn?.send(loginFlow.start().send);
  });
  conn.addEventListener('message', (e) => handle(e.detail));
  conn.addEventListener('error', (e) => errLine(e.detail.message));
  const c = conn;
  conn.addEventListener('close', (e) => {
    if (conn !== c) return; // an older connection, replaced by a reconnect
    conn = null;
    saveExplored();
    setState('off');
    sysLine(`Disconnected${e.detail.code && e.detail.code !== 1000 ? ` (code ${e.detail.code})` : ''}.`);
    if (loginFlow) failLogin('Couldn\'t reach the game. Check the server address under Settings.');
    else connectionLost();
    inGame = false;
  });
  conn.connect();
}

function handle(msg) {
  if (traceBox.checked) traceLine(msg);

  const hitsBefore = world.hits.length;
  // A one-square step, for the footstep sound.
  const stepped = msg.op === OP.MAP && world.hasMap && Math.abs(msg.x - world.locX) + Math.abs(msg.y - world.locY) === 1;
  if (world.apply(msg)) {
    if (msg.op === OP.MAP_SIZE) renderer.resize();
    else renderer.invalidate();
  }
  for (const id of world.takeRement()) conn?.send(`rement ${id}`);
  if (stepped && stepsBox.checked) sound.play('step');
  // One sound per combat line: a real hit beats a 0, which beats a dodge.
  const newHits = world.hits.slice(hitsBefore);
  if (newHits.length) {
    sound.play(newHits.some((h) => h.kind === 'hit' && h.text !== '0') ? 'hit' : newHits.some((h) => h.kind === 'hit') ? 'miss' : 'dodge');
  }
  if (msg.op === OP.MAP) {
    minimap.paint(minimap.explored.record(msg.x, msg.y, msg.tiles));
    minimap.setCentre(msg.x, msg.y);
  }
  if (targetId !== -1 && (msg.op === OP.ENTITY || msg.op === OP.REMOVE_ENTITY || msg.op === OP.MAP)) updateTarget();

  const part = player.apply(msg);
  if (part) {
    panels.update(part);
    if (part === 'status') showPanels();
  }
  // On a merchant's square? (Dusk.java enables its Merchant button this way.)
  if (msg.op === OP.MAP || msg.op === OP.ENTITY || msg.op === OP.REMOVE_ENTITY || (msg.op >= OP.MOVE_NORTH && msg.op <= OP.MOVE_EAST)) {
    panels.setOnMerchant([...world.entities.values()].find((e) => e.type === 2 && e.x === world.locX && e.y === world.locY));
  }
  // The menu's entities may have moved, left, or come into attack range.
  if (entityMenu.open && (msg.op === OP.ENTITY || msg.op === OP.REMOVE_ENTITY || msg.op === OP.MAP || msg.op === OP.RANGE ||
      (msg.op >= OP.MOVE_NORTH && msg.op <= OP.MOVE_EAST))) entityMenu.refresh(world);

  switch (msg.op) {
    case OP.TEXT:
      addText(msg.text);
      serverLine(msg.text);
      break;
    case OP.COLOR_TEXT:
      addText(msg.text, `rgb(${readable(msg.r, msg.g, msg.b).join(',')})`);
      serverLine(msg.text);
      break;
    case OP.LOADED:
      loaded = true;
      break;
    case OP.PLAY_SFX: {
      // Spell scripts send effects as sound numbers (see decodeFx).
      const fx = decodeFx(msg.index);
      if (fx) serverEffect(fx);
      else if (Number.isFinite(msg.index)) sound.server(msg.index);
      break;
    }
    case OP.NOT_LOADED:
      loaded = false;
      break;
    case OP.RESOURCE_ADDRESS:
      loadGraphics(msg.address);
      break;
    case OP.TARGET_HP: {
      // Like Dusk.java: a positive HP updates the target, anything else
      // means it's gone.
      const ent = world.entities.get(targetId);
      if (ent && msg.hp > 0) ent.hp = msg.hp;
      else targetId = -1;
      updateTarget();
      break;
    }
    case OP.DISCONNECT:
    case -1:
      sysLine('Server closed the session.');
      break;
    default:
      if (msg.unknown) errLine(`Unknown opcode ${msg.op}, skipped line: ${JSON.stringify(msg.rest)}`);
  }
}

// Loads the sprite sheets, then tells the server we're ready, like
// GraphicsThread.run() (which sends "playerloaded true" even if loading
// failed, so the login carries on regardless).
async function loadGraphics(address) {
  const c = conn;
  const candidates = [address];
  try {
    const fallback = `http://${new URL(c.url.replace(/^ws/, 'http')).hostname}:${FALLBACK_RC_PORT}/`;
    if (fallback !== address) candidates.push(fallback);
  } catch {}

  if (sheetsFor !== address) {
    let sheets = null;
    for (const base of candidates) {
      sysLine(`Loading graphics from ${base}…`);
      sheets = await loadSheets(base);
      if (sheets.errors.length === 0) break;
      for (const err of sheets.errors) errLine(err);
    }
    if (sheets.errors.length === 0) {
      sheetsFor = address;
      const { map, players, sprites } = sheets;
      sysLine(`Graphics loaded: ${map.count} tiles, ${players.count / 8} player images, ${sprites.count} sprites.`);
    }
    pixelSheets = sheets;
    await applyArt();
  }
  if (conn === c) c.send('playerloaded true');
}

// ---- art style ---------------------------------------------------------------
//
// Pixel is the server's own sheets. Smooth is the same art redrawn at 4x
// with a pixel-art smoothing filter (tools/smoothart.py, run on the server
// into art/smooth/ next to this page), loaded the first time it's picked.

let pixelSheets = null;
let smoothSheets = null;
let artStyle = storage('get', 'dusk.art') === 'smooth' ? 'smooth' : 'pixel';
$('art-style').value = artStyle;
$('art-style').addEventListener('change', (e) => {
  artStyle = e.target.value;
  storage('set', 'dusk.art', artStyle);
  applyArt();
});

async function applyArt() {
  let sheets = pixelSheets;
  if (artStyle === 'smooth') {
    if (!smoothSheets) {
      const loaded = await loadSheets('art/smooth/', { path: '', ext: 'png' });
      if (loaded.errors.length === 0) smoothSheets = loaded;
      else errLine('The Smooth art isn\'t available on this server yet; showing Pixel.');
    }
    sheets = smoothSheets ?? pixelSheets;
  }
  if (!sheets) return;
  renderer.setSheets(sheets);
  minimap.setSheet(sheets.map);
  if (sheets.players) playerSheet = sheets.players;
}

// With "reduce motion" on, walkers jump square to square instead of sliding.
function newWorld() {
  const w = new World();
  if (reduceMotion?.matches) w.stepMs = 0;
  return w;
}

function canAct() {
  return conn?.connected && world.hasMap;
}

// Dusk.java's targetEntity(): never yourself, and the server is told the
// old target too.
function targetEntity(ent) {
  if (ent.type === 0 && ent.x === world.locX && ent.y === world.locY) return;
  const old = targetId;
  targetId = ent.id;
  conn.send(`target ${targetId} ${old}`);
  updateTarget();
}

function updateTarget() {
  const ent = world.entities.get(targetId);
  $('target-card').hidden = !ent;
  spellbook.refreshTarget();
  if (!ent) return;
  $('target-name').textContent = world.displayNames().get(ent.id) ?? ent.name;
  setBar($('bar-target'), ent.hp, ent.maxhp);
  // Only creatures can be fought; a targeted player just shows their health.
  $('target-attack').hidden = ent.type !== 4;
}

function targetCommand(cmd) {
  if (targetId !== -1) runCommand(cmd);
}

// Every command from a button, menu or hotbar slot goes out here, as if
// typed.
function runCommand(cmd) {
  if (!conn?.connected) return;
  conn.send(cmd);
  echoLine(cmd);
  noteSent(cmd);
  // Like MainFrame's txtInput.requestFocus(), so the arrow keys walk
  // again; not on touch screens, where it would pop up the keyboard.
  if (finePointer?.matches) input.focus();
}

// Watches what we send for casts, to play the spell's effect on whoever it
// was aimed at, unless the server says it failed (see handleCastReply).
function noteSent(cmd) {
  const cast = parseCast(cmd);
  if (!cast) return;
  const name = cast.target.toLowerCase();
  const target = name ? [...world.entities.values()].find((e) => bareName(e.name).toLowerCase() === name) : null;
  const on = target ? target.id : 'self';
  const kind = effectKind(cast.spell);
  const pending = {
    fire() {
      clearTimeout(pending.timer);
      const i = pendingCasts.indexOf(pending);
      if (i !== -1) pendingCasts.splice(i, 1);
      // The server's copy of this effect may have come first.
      const e = on === 'self' ? world.self() : world.entities.get(on);
      if (e && world.recentEffect(kind, e.x, e.y, FX_REPEAT_MS)) return;
      world.addEffect(on, kind);
      sound.play(kind);
      renderer.invalidate();
    },
  };
  // Played when the spell's own success line arrives, or after a short
  // wait for spells whose lines we don't know.
  pending.timer = setTimeout(() => pending.fire(), CAST_WAIT_MS);
  pendingCasts.push(pending);
}

// ---- death ---------------------------------------------------------------------
//
// "You have died." brings up the death screen; the gold and experience the
// server takes arrive just after and fill it in. The server revives you
// itself (conf/onDeath), so Continue only has to close it.

let losses = null; // { gold, exp } while the death screen is up

function showDeath() {
  losses = {};
  $('death-loss').textContent = '';
  $('death').hidden = false;
  document.body.classList.add('dead');
  sound.play('death');
  $('death-ok').focus({ preventScroll: true });
}

function hideDeath() {
  if ($('death').hidden) return;
  $('death').hidden = true;
  document.body.classList.remove('dead');
  losses = null;
  if (finePointer?.matches) input.focus();
}

$('death-ok').addEventListener('click', hideDeath);
document.addEventListener('keydown', (e) => {
  if (!$('death').hidden && (e.key === 'Escape' || (e.key === 'Enter' && e.target !== input))) {
    e.preventDefault();
    hideDeath();
  }
}, true);

// Every line of server text, after it's shown: login, yes/no questions,
// why we might be about to be dropped, deaths, and spell replies.
function serverLine(text) {
  if (handleLogin(text)) return;
  if (isDeath(text)) showDeath();
  const loss = losses && parseLoss(text);
  if (loss) {
    Object.assign(losses, loss);
    $('death-loss').textContent = lossSentence(losses);
  }
  if (isYesNo(text)) {
    $('prompt-text').textContent = text.trim().replace(/\s*\(yes\/no\)\s*$/i, '');
    $('prompt-bar').hidden = false;
  }
  if (DROP_REASONS.some((re) => re.test(text.trim()))) dropReason = text.trim();
  handleCastReply(text);
}

// A spell effect from the server, seen by everyone near it. Our own casts
// already drew theirs (and played the sound), so skip a repeat.
const FX_REPEAT_MS = 2000;
function serverEffect({ kind, x, y }) {
  if (world.recentEffect(kind, x, y, FX_REPEAT_MS)) return;
  world.addEffect({ x, y }, kind);
  if (world.inView(x, y)) sound.play(kind);
  renderer.invalidate();
}

function handleCastReply(text) {
  if (pendingCasts.length && isCastFailure(text)) clearTimeout(pendingCasts.shift().timer);
  else if (pendingCasts.length && spellMessages.castBy(text)) pendingCasts[0].fire();
  const landed = spellMessages.landedBy(text);
  const kind = landed ? effectKind(landed) : landedOnMe(text);
  if (kind) {
    world.addEffect('self', kind);
    sound.play(kind);
    renderer.invalidate();
  }
}

// The server's "target" command with -1 clears it and drops the old one.
function clearTarget() {
  if (targetId === -1) return;
  conn?.send(`target -1 ${targetId}`);
  targetId = -1;
  updateTarget();
}

function submitInput() {
  if (!conn?.connected) return;
  const text = input.value;
  const secret = input.type === 'password';
  // The first thing typed at login is the character name (as in the
  // capture: name, password, then the rest), which the minimap is saved under.
  if (!secret && !loginName && !world.hasMap && text.trim()) useExploredFor(text.trim());
  conn.send(text);
  echoLine(secret ? '*'.repeat(text.length) : text);
  $('prompt-bar').hidden = true; // typed an answer instead
  if (!secret) noteSent(text);
  if (!secret && text.trim()) {
    if (history[history.length - 1] !== text) history.push(text);
    if (history.length > HISTORY_MAX) history.shift();
  }
  historyPos = history.length;
  input.value = '';
  input.type = 'text';
}

// Loads this character's saved exploration into the minimap and saves
// under their name from now on.
function useExploredFor(name) {
  loginName = name;
  player.name = name;
  panels.renderStatus();
  let host = 'unknown';
  try {
    host = new URL(conn.url.replace(/^ws/, 'http')).host;
  } catch {}
  exploredKey = `dusk.explored.${host}.${name.toLowerCase()}`;
  hotbar.useKey(`${host}.${name.toLowerCase()}`);
  const saved = storage('get', exploredKey);
  if (saved) {
    minimap.explored.merge(Explored.deserialize(saved));
    minimap.setExplored(minimap.explored);
  }
}

// Stays dirty if the write fails (storage full or blocked), so it's retried.
function saveExplored() {
  const explored = minimap.explored;
  if (!exploredKey || !explored.dirty) return;
  try {
    localStorage.setItem(exploredKey, explored.serialize());
    explored.dirty = false;
  } catch {}
}

// ---- output ----------------------------------------------------------------

function addText(text, color) {
  // The server doesn't mark password prompts, so guess from the text (not
  // while the login card is answering them).
  if (!loaded && !loginFlow && /password/i.test(text)) input.type = 'password';
  appendLine(text, null, color);
}

function sysLine(t) {
  appendLine(t, 'sys');
}

function errLine(t) {
  appendLine(t, 'err');
}

function echoLine(t) {
  appendLine(`> ${t}`, 'echo');
}

function traceLine(msg) {
  const { op, ...rest } = msg;
  let detail = JSON.stringify(rest);
  if (detail.length > 200) detail = detail.slice(0, 200) + '…';
  appendLine(`[${op} ${opName(op)}] ${detail}`, 'trace');
}

function appendLine(text, cls, color) {
  const atBottom = output.scrollHeight - output.scrollTop - output.clientHeight < 40;
  const div = document.createElement('div');
  div.className = cls ? `line ${cls}` : 'line';
  if (color) div.style.color = color;
  div.textContent = text;
  output.appendChild(div);
  while (output.childElementCount > MAX_LINES) output.firstElementChild.remove();
  if (atBottom) output.scrollTop = output.scrollHeight;
}

// Server colors were picked for the Java client's white text area; lift
// anything too dark to read on our dark background.
function readable(r, g, b) {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum >= 110) return [r, g, b];
  const t = Math.min(1, (110 - lum) / 180 + 0.25);
  return [r, g, b].map((c) => Math.round(c + (255 - c) * t));
}

// ---- UI state --------------------------------------------------------------

function setState(state) {
  dot.className = `dot ${state}`;
  $('status-text').textContent = { on: 'Connected', pending: 'Connecting…', off: 'Disconnected' }[state];
  const live = state !== 'off';
  serverUrl.disabled = live;
  input.disabled = sendBtn.disabled = state !== 'on';
  input.placeholder = state === 'on' ? 'Type a command…' : 'Not connected';
  if (!live) {
    input.type = 'text';
    $('char-card').hidden = true;
    $('panel').hidden = true;
    $('target-card').hidden = true;
    $('hotbar').hidden = true;
    $('prompt-bar').hidden = true;
    hotbar.closePicker();
    hideDeath();
  } else {
    $('settings').open = false;
  }
}

// Shown from the first status or map message, i.e. once logged in.
function showPanels() {
  $('char-card').hidden = false;
  $('panel').hidden = false;
  $('hotbar').hidden = !hotbarBox.checked;
  hotbar.place();
}

function storage(op, key, value) {
  try {
    return op === 'get' ? localStorage.getItem(key) : localStorage.setItem(key, value);
  } catch {
    return null;
  }
}
