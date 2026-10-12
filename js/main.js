import { DuskConnection } from './connection.js';
import { makeDraggable } from './drag.js';
import { Hotbar } from './hotbar.js';
import { LoginFlow, isYesNo } from './login.js';
import { isDeath, parseLoss, lossSentence } from './death.js';
import { Sound } from './sound.js';
import { parseCast, effectKind, isCastFailure, landedOnMe, castCommand, compileMessages, decodeFx, parseSpellList, parseCooldown, Cooldowns, waitLabel } from './spells.js';
import { Spellbook } from './spellbook.js';
import { parseStats } from './stats.js';
import { bareName } from './world.js';
import { EntityMenu } from './entitymenu.js';
import { Explored } from './explored.js';
import { gearFromEquipment, parseWorn, wornCommand, weaponKind } from './gear.js';
import { chatKind, alsoGeneral, CombatTally } from './chatlog.js';
import { MapSync, decodeChunk } from './mapsync.js';
import { loadItemInfo } from './iteminfo.js';
import { JournalReader, JournalDefReader, NotesReader, TradeReader, parseFriends, parseMarkers, parseWhisper, MARKERS, MAP_NOTES, noteAdd, noteRemove } from './social.js';
import { SocialUI } from './socialui.js';
import { JournalEditor } from './journaleditor.js';
import { LibraryEditor } from './libraryeditor.js';
import { parseLibReply } from './library.js';
import { Atmosphere, AmbientSound, findSnowTiles, daylight, regionMap, isUnderground } from './atmosphere.js';
import { MusicPlayer, moodAt, moodForType, musicPanel, townAt } from './music.js';
import { AreaAmbience, areaCounts, areaMix } from './ambience.js';
import { MailView, parseMail } from './mail.js';
import { PartyView, parseParty, partyChatCommand } from './party.js';
import { AchievementsView, parseAchv } from './achievements.js';
import { bindWeather, setWeather } from './weather.js';
import { Ships, parseShip } from './ships.js';
import { StorageReader, isStorage, lookCommand, lockCommand, isBoxLine, isTeller, TELLER_REACH } from './storage.js';
import { storageReach } from './actions.js';
import { GOD_PROMPT, listKind, cleanList, parseLooks, PROP_LOOKS, parseFlags, parseServerInfo } from './god.js';
import { AdminView, parseAdmin } from './admin.js';
import { parseSpeech, parseTalkers, talkCommand, TALKERS } from './talk.js';
import { GodPanel } from './godpanel.js';
import { DialogueEditor } from './dialogueeditor.js';
import { TileEditor } from './tileeditor.js';
import { FlagsDialog } from './flagsdialog.js';
import { parseDialogueReply, parseTileReply, parseTileScriptReply } from './dialogue.js';
import { Minimap } from './minimap.js';
import { WorldMap, tileColours } from './worldmap.js';
import { Panels, setBar } from './panels.js';
import { Player } from './player.js';
import { OP, opName } from './protocol.js';
import { Renderer, swingStyleFor } from './renderer.js';
import { loadSheets, loadSheet, SpriteSheet } from './sprites.js';
import { describeRaces } from './races.js';
import { describeWho } from './who.js';
import { QuestEditor } from './questeditor.js';
import { parseQuestReply } from './quests.js';
import { World } from './world.js';

const $ = (id) => document.getElementById(id);
const output = $('output');
// The chat's tabs (General, Combat): see the chat tabs section below.
const lineCount = { general: 0, combat: 0, whisper: 0 };
const tally = new CombatTally();
let chatView = 'general';
const chatTabs = [...document.querySelectorAll('#chat-tabs [data-chat]')];

// The log follows the newest line unless you've scrolled up to read; then
// a "New messages" button offers the way back down. Whether it's
// following is decided by your scrolling, not by where it happens to be
// when a line arrives, so a log that changes size (a tab opening, the
// window resizing) doesn't lose its place.
let followLog = true;
const latestBtn = $('output-latest');
const logNearBottom = () => output.scrollHeight - output.scrollTop - output.clientHeight < 24;
function toLatest() {
  followLog = true;
  output.scrollTop = output.scrollHeight;
  latestBtn.hidden = true;
}
output.addEventListener('scroll', () => {
  followLog = logNearBottom();
  if (followLog) latestBtn.hidden = true;
});
latestBtn.addEventListener('click', toLatest);
new ResizeObserver(() => {
  if (followLog) output.scrollTop = output.scrollHeight;
}).observe(output);

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
// On the LAN the page is plain http and the bridge is on port 8765. From
// outside (https://duskserver.tailaee0f2.ts.net/play/, via Tailscale Funnel)
// the bridge is at /ws on the same address, over wss: an https page can't
// open a plain ws:// connection.
const SECURE = location.protocol === 'https:';
const DEFAULT_BRIDGE = SECURE ? `wss://${location.host}/ws` : 'ws://192.168.4.61:8765';
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
panels.itemArt = () => paintedItems || null; // item pictures, in either art style
loadItemInfo().then((info) => { panels.itemInfo = info; });
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let world = newWorld();
const renderer = new Renderer($('map'), world, $('map-wrap'));
// How someone strikes in a fight (the renderer's swings): by their weapon
// (yours, or another player's as the Painted style knows it); creatures by
// what they are: beasts claw, axemen chop, the rest slash.
const BEASTS = /wolf|hound|dog|bear|grizzly|cat\b|dragon|lizard\b|bat\b|rat\b|spider|scorpion|alligator|squid|octopus|dino|mole|slime|blob|slimer|imp\b|gargoyle/i;
renderer.swingStyle = (e) => {
  if (e.type === 4) {
    const n = bareName(e.name ?? '');
    return /axe/i.test(n) ? 'chop' : /dagger/i.test(n) ? 'stab' : BEASTS.test(n) ? 'claw' : 'slash';
  }
  const mine = e === world.self() ? player.equipment?.wield?.name : null;
  if (mine) return swingStyleFor(weaponKind(mine));
  const kind = renderer.others.get(e.id)?.weapon?.kind;
  return kind ? swingStyleFor(kind) : 'slash';
};
renderer.ships = new Ships();
renderer.farTile = (x, y) => minimap.explored.tileAt(x, y); // squares seen before, beyond the view
// For tests (localStorage dusk.debug = 1): the world, ships and renderer to read.
if (storage('get', 'dusk.debug')) Object.defineProperty(window, '__dusk', { get: () => ({ world, ships: renderer.ships, renderer, areaSound }) });
let sheetsFor = null; // resource address the current sheets came from
const minimap = new Minimap($('minimap'), new Explored());
const worldMap = new WorldMap($('world-map'), minimap);
// Which props are people, for the NPC name setting (from the art build).
fetch('art/painted/people.json').then((r) => (r.ok ? r.json() : [])).then((list) => {
  renderer.propPeople = new Set(list);
  renderer.invalidate();
}).catch(() => {});
$('map-btn').addEventListener('click', () => worldMap.toggle());
// Help: how to play, in a window (closes with ✕, Escape or a click outside it).
const helpDialog = $('help-dialog');
$('help-btn').addEventListener('click', () => helpDialog.showModal());
$('help-close').addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('click', (e) => { if (e.target === helpDialog) helpDialog.close(); });
// Gods (see god.js) get the God tab and Remove in the click menu.
let isGod = false;
const god = new GodPanel($('tab-god'), {
  send: (cmd, opts) => {
    if (opts?.quiet) { if (conn?.connected) conn.background(cmd); } else runCommand(cmd);
  },
  note: (t) => sysLine(t),
  tileSheet: () => renderer.sheets?.map ?? null,
  itemArt: () => renderer.items,
  people: () => renderer.propPeople,
  onNpcPlaced: (name) => dialogueEditor.edit(name),
  onTileEdit: (x, y) => tileEditor.edit(x, y),
  onUseCommand: (text) => {
    input.value = text;
    input.focus();
    input.setSelectionRange(text.length, text.length);
  },
  // The tab stays while the tools are popped out (it points at their
  // window); docked, it opens again.
  onFloat: (out) => {
    panels.setTabVisible('god', isGod);
    if (!out && isGod) panels.selectByName('god', true);
  },
  onJournal: () => journalEditor.show(),
  onLibrary: (kind) => libraryEditor.show(kind),
  onQuests: () => questEditor.show(),
  onAdmin: () => adminView.show(),
});
// Monsters, props and items (gods): from the God tab or a click menu.
const libraryEditor = new LibraryEditor($('library-editor'), {
  send: (cmd) => { if (conn?.connected) conn.background(cmd); },
  run: (cmd) => runCommand(cmd),
  lists: () => god.lists,
  fetchLists: () => god.opened(),
  sprites: () => renderer.sheets?.sprites ?? null,
  note: (t) => sysLine(t),
});
const quiet = (cmd) => { if (conn?.connected) conn.background(cmd); };
// Spell cooldowns: the spellbook and hotbar grey a spell out, with a
// countdown, until the server will let it be cast again.
const cooldowns = new Cooldowns();
let cooldownTimer = null;
function showCooldowns() {
  const now = Date.now();
  const left = (spell) => cooldowns.left(spell, now);
  spellbook.showCooldowns(left, waitLabel);
  hotbar.showCooldowns(left, waitLabel);
  cooldowns.tidy(now);
  clearTimeout(cooldownTimer);
  if (cooldowns.active) cooldownTimer = setTimeout(showCooldowns, 250);
}

// The quest wizard (gods), from the God tab.
const questEditor = new QuestEditor($('quest-editor'), { send: quiet, lists: () => god.lists, fetchLists: () => god.opened(), here: () => (world.hasMap ? { x: world.locX, y: world.locY } : null) });
// The quest journal's entries (gods), from the God tab.
const journalEditor = new JournalEditor($('journal-editor'), { send: quiet });
// Player mail (js/mail.js, server/Mail.java): the Mail tab.
const mailView = new MailView($('tab-mail'), { send: quiet, note: (t) => sysLine(t), badge: $('tab-mail-count'), friends: () => socialUI.friends.map((f) => f.name) });
document.querySelector('[data-tab="mail"]').addEventListener('click', () => mailView.refresh());
// Achievements (js/achievements.js): in the Journal tab, a banner when earned.
const achievementsView = new AchievementsView($('achievements'), { send: quiet, me: () => loginName, banner: (title, what) => showBossBanner(`★ Achievement: ${title}. ${what}.`, 'gold') });
// Parties (js/party.js, server/Party.java): the frame over the map.
const partyView = new PartyView($('party-frame'), $('party-invite'), { send: quiet, me: () => loginName, line: (t) => appendLine(t, 'party') });
// The admin page (js/admin.js): from the God tab, or #admin in the address.
const adminView = new AdminView($('admin-dialog'), { send: quiet, run: (cmd) => runCommand(cmd), me: () => loginName });
// The Journal, Friends and Trade tabs.
const socialUI = new SocialUI({
  panels,
  quiet,
  run: (cmd) => runCommand(cmd),
  player: () => player,
  whisper: (name) => startWhisper(name),
  note: (t) => sysLine(t),
});
const journalReader = new JournalReader();
const journalDefReader = new JournalDefReader();
const notesReader = new NotesReader();
const tradeReader = new TradeReader();
// "/name " in the chat box, ready for the message.
function startWhisper(name) {
  input.value = `/${name} `;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
// The dialogue editor (gods): from an NPC's click menu or the God tab.
const dialogueEditor = new DialogueEditor($('dialogue-editor'), {
  send: (cmd, opts) => {
    if (opts?.quiet) { if (conn?.connected) conn.background(cmd); } else runCommand(cmd);
    // After a save, the new NPC may now have something to say.
    if (/^talkedit set /.test(cmd) && conn?.connected) conn.background(TALKERS);
  },
  items: () => god.lists.items ?? [],
});
// The tile editor (gods): what happens on the square you stand on.
const tileEditor = new TileEditor($('tile-editor'), {
  send: (cmd, opts) => {
    if (opts?.quiet) { if (conn?.connected) conn.background(cmd); } else runCommand(cmd);
  },
  items: () => god.lists.items ?? [],
});
// A player's flags (gods): from the player's click menu.
const flagsDialog = new FlagsDialog($('flags-dialog'), {
  send: (cmd, opts) => {
    if (opts?.quiet) { if (conn?.connected) conn.background(cmd); } else runCommand(cmd);
  },
});
function setGod(on) {
  isGod = on;
  panels.isGod = on;
  panels.update('stats');
  if (!on) { god.dock(); adminView.close(); }
  panels.setTabVisible('god', on);
  if (on && location.hash === '#admin' && !adminView.open) setTimeout(openAdminWhenFree, 1500);
}
// #admin opens the admin page once the god's presence question (asked at
// login) is answered: it would cover the question on a phone, and the
// question swallows the first command sent while it waits.
function openAdminWhenFree(tries = 0) {
  if (yesNoWaiting && tries < 240) { setTimeout(() => openAdminWhenFree(tries + 1), 500); return; }
  if (isGod && !adminView.open) adminView.show();
}
const entityMenu = new EntityMenu(
  $('entity-menu'),
  (cmd) => {
    runCommand(cmd);
    if (/^unset \d/.test(cmd)) god.removed();
  },
  () => ({ x: world.locX, y: world.locY, range: player.range, god: isGod, storageOpen: panels.storage?.entity.id, talkers, looks: renderer.propLooks, friends: socialUI.friendNames, party: partyView.names }),
);
// Gods rename signs and change what they say.
entityMenu.onDialogue = (name) => dialogueEditor.edit(name);
entityMenu.onFlags = (id) => {
  const ent = world.entities.get(id);
  flagsDialog.edit(id, ent ? bareName(ent.name) : 'player');
};
entityMenu.onDescribe = (id) => {
  const ent = world.entities.get(id);
  const text = window.prompt(`What should "Look" say about ${ent ? bareName(ent.name) : 'this'}?`);
  if (text?.trim()) runCommand(`propdesc ${id}|${text.trim().replace(/\|/g, ' ')}`);
};
entityMenu.onSign = (what, id) => {
  const ent = world.entities.get(id);
  const answer = window.prompt(what === 'name' ? `Call this sign (now "${ent ? bareName(ent.name) : 'sign'}"):` : 'What should the sign say?');
  if (!answer?.trim()) return;
  runCommand(`${what === 'name' ? 'signname' : 'signtext'} ${id}|${answer.trim().replace(/\|/g, ' ')}`);
  if (what === 'text') god.removed(); // counts as an unsaved change: "<s" keeps it
};
// Gods lock a chest to a key item: only someone carrying it can open it.
entityMenu.onLock = (id) => {
  const ent = world.entities.get(id);
  const key = window.prompt(`Lock ${ent ? bareName(ent.name) : 'this chest'} so it only opens for someone carrying which item? (e.g. iron key)`);
  if (!key?.trim()) return;
  runCommand(lockCommand(id, key.trim()));
  if (panels.storage?.entity?.id === id) conn?.send(lookCommand(id));
};
entityMenu.onWhisper = (name) => startWhisper(name);
entityMenu.onLibrary = (kind, name) => libraryEditor.show(kind, name);
entityMenu.onStorage = (action, id) => (action === 'open' ? openStorage(id) : panels.setStorage(null));

// ---- NPCs talking (see talk.js) ----
//
// What an NPC says shows in a box on the map. When its script is waiting
// for an answer ("(training/world)"), the answers are buttons, and walking
// is paused so an arrow key isn't taken as the answer.

let talkers = new Set(); // lower-case names of NPCs with something to say
let speechAwaiting = false;
let speechTimer = null;
let speechFollow = 0; // until when replies to an answer join the box
let talkHold = 0; // until when keep-alive replies wait (see connection.js)

function showSpeech(sp) {
  clearTimeout(speechTimer);
  $('speech-who').textContent = sp.who;
  // An action ("acts") is just the words, in italics: no "says".
  const acting = sp.verb === 'acts';
  $('speech-verb').textContent = acting ? '' : sp.verb;
  $('speech-text').textContent = sp.text;
  $('speech-text').classList.toggle('acting', acting);
  // In a conversation (just talked, or answered) rather than a shout. Only
  // a shout is someone calling out; anything said to you ends with OK.
  const talking = sp.verb !== 'shouts' || Date.now() < talkHold || Date.now() < speechFollow;
  const choices = $('speech-choices');
  const buttons = sp.choices.map((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = c;
    b.addEventListener('click', () => runCommand(c));
    return b;
  });
  // The end of a conversation: OK closes it.
  if (!sp.choices.length && talking) {
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'primary';
    ok.textContent = 'OK';
    ok.addEventListener('click', hideSpeech);
    buttons.push(ok);
  }
  // Someone calling out to you: offer to talk to them.
  else if (!sp.choices.length && talkers.has(sp.who.toLowerCase())) {
    const npc = nearestNamed(sp.who);
    if (npc) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Talk to ${sp.who}`;
      b.addEventListener('click', () => runCommand(talkCommand(npc.id)));
      buttons.push(b);
    }
  }
  choices.replaceChildren(...buttons);
  for (const n of $('speech').querySelectorAll('.speech-note')) n.remove();
  speechAwaiting = sp.choices.length > 0;
  $('speech').hidden = false;
  speechTimer = setTimeout(hideSpeech, speechAwaiting ? 120000 : 12000);
}

function hideSpeech() {
  clearTimeout(speechTimer);
  $('speech').hidden = true;
  speechAwaiting = false;
}
$('speech-close').addEventListener('click', hideSpeech);

// Something that came back from an answer ("50 gp have been deposited."),
// shown under what the NPC said.
function noteSpeech(text) {
  const p = document.createElement('p');
  p.className = 'speech-note';
  p.textContent = text;
  $('speech-choices').before(p);
  clearTimeout(speechTimer);
  speechTimer = setTimeout(hideSpeech, 8000);
}

// Anything sent answers an NPC that was waiting.
function answeredSpeech() {
  if (!speechAwaiting) return;
  speechAwaiting = false;
  talkHold = Date.now() + 4000;
  speechFollow = Date.now() + 4000;
  $('speech-choices').replaceChildren();
  clearTimeout(speechTimer);
  // An answer the NPC doesn't reply to ends the talk: the box closes,
  // unless a reply comes (showSpeech and noteSpeech keep it open).
  speechTimer = setTimeout(hideSpeech, 1500);
}

// The closest entity with this name, for answering a shout.
function nearestNamed(name) {
  let best = null;
  let bestD = Infinity;
  for (const e of world.entities.values()) {
    if (e.type === 0 || bareName(e.name).toLowerCase() !== name.toLowerCase()) continue;
    const d = Math.max(Math.abs(e.x - world.locX), Math.abs(e.y - world.locY));
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

// Opens a barrel or chest you can reach, and asks what's in it.
function openStorage(id) {
  const ent = world.entities.get(id);
  if (!ent || !storageReach(ent, { x: world.locX, y: world.locY })) return;
  if (panels.setStorage(ent)) conn?.send(lookCommand(ent.id));
}
entityMenu.onShop = () => panels.openShop();
const hotbar = new Hotbar($('hotbar'), $('hotbar-picker'), $('map-wrap'), {
  send: (cmd) => runCommand(cmd),
  context: () => ({
    spells: parseSpellList(parseStats(player.stats).sections.find((s) => /spell/i.test(s.title))?.items ?? []).spells.map((s) => s.name),
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

// Installing as an app (manifest.json, sw.js): Chrome and Edge offer it
// themselves, through the Install button; on an iPhone or iPad it's
// Share, then Add to Home Screen.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
let installPrompt = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('install-row').hidden = false;
  $('install-app').hidden = false;
  $('install-hint').textContent = '';
});
$('install-app').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => null);
  installPrompt = null;
  $('install-row').hidden = true;
});
if (!standalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
  $('install-row').hidden = false;
  $('install-app').hidden = true;
  $('install-hint').textContent = 'To install: tap Share, then Add to Home Screen.';
}

// Night, weather and music (js/atmosphere.js): on unless turned off.
const atmosphere = new Atmosphere();
const ambient = new AmbientSound(sound);
atmosphere.onThunder = () => ambient.thunder();
// setWeather({ type, intensity, wind }) (js/weather.js) decides the weather
// here, for the Pixi layer and the canvas fallback alike.
bindWeather(atmosphere, () => renderer.invalidate());
// Weather per continent (js/regions.json); without it, everywhere has the
// Old World's.
fetch('js/regions.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
  if (d) { atmosphere.regionAt = regionMap(d); renderer.invalidate(); }
}).catch(() => {});
if (storage('get', 'dusk.debug') || location.hash === '#lights') window.setWeather = setWeather;
let rainLevel = -1;
// The music's weather duck (applyMusicLevel): 1 clear, 0.5 rain, 0 storm.
let musicBase = 0.6, musicDuck = 1, musicDuckTo = 1;
renderer.onWeather = (st) => {
  const level = st.falling === 'rain' && sound.enabled ? (st.storm ? 1 : Math.round(Math.max(0.2, Math.min(1, st.intensity ?? 0.6)) * 10) / 10) : 0;
  if (level !== rainLevel) { rainLevel = level; ambient.setRain(level); }
  // The music makes way for the weather (applyMusicLevel, below).
  musicDuckTo = st.storm ? 0 : st.falling === 'rain' ? 0.5 : 1;
};
const weatherBox = $('weather-toggle');
const nightBox = $('night-toggle');
const musicBox = $('music-toggle');
weatherBox.checked = storage('get', 'dusk.weather') !== '0';
nightBox.checked = storage('get', 'dusk.night') !== '0';
musicBox.checked = storage('get', 'dusk.music') !== '0';
function applyAtmosphere() {
  atmosphere.night = nightBox.checked;
  atmosphere.weather = weatherBox.checked;
  renderer.atmosphere = weatherBox.checked || nightBox.checked ? atmosphere : null;
  if (!weatherBox.checked && rainLevel > 0) { rainLevel = 0; ambient.setRain(0); }
  renderer.invalidate();
}
applyAtmosphere();
weatherBox.addEventListener('change', () => { storage('set', 'dusk.weather', weatherBox.checked ? '1' : '0'); applyAtmosphere(); });
nightBox.addEventListener('change', () => { storage('set', 'dusk.night', nightBox.checked ? '1' : '0'); applyAtmosphere(); });
// Lighting (js/lighting.js, PixiJS): torches, lava and lanterns light up the
// night, and spells glow. On unless turned off; Pixi is only fetched when
// it's on, and if it can't load the normal night stays.
const lightingBox = $('lighting-toggle');
lightingBox.checked = storage('get', 'dusk.lighting') !== '0';
let lighting = null, lightingLoading = null;
function applyLighting() {
  if (lighting) { lighting.setOn(lightingBox.checked); return; }
  if (!lightingBox.checked || lightingLoading) return;
  lightingLoading = import('./lighting.js')
    .then((m) => m.startLighting({ map: $('map'), dusk: () => ({ world, renderer }), nightOn: () => nightBox.checked, panel: location.hash === '#lights' }))
    .then((l) => { lighting = l; if (l) l.setOn(lightingBox.checked); else lightingBox.disabled = true; })
    .catch((e) => { console.warn('Lighting:', e); lightingBox.disabled = true; });
}
applyLighting();
lightingBox.addEventListener('change', () => { storage('set', 'dusk.lighting', lightingBox.checked ? '1' : '0'); applyLighting(); });
// Area music (js/music.js): tracks from music/manifest.json by the mood of
// where you are, crossfading; moods with no tracks yet get the generated
// music above. Its own volume and switch, apart from the sound effects'.
const music = new MusicPlayer({
  Howl: globalThis.Howl ?? null,
  Howler: globalThis.Howler ?? null,
  onFallback: (on) => ambient.setMusic(on, () => daylight()),
  onTrack: (t) => showTrack(t),
});
// "Now playing" over the map for a few seconds when the track changes
// (Settings > Track names turns it off).
const nowPlaying = $('now-playing');
const trackNamesBox = $('now-playing-toggle');
trackNamesBox.checked = storage('get', 'dusk.tracknames') !== '0';
trackNamesBox.addEventListener('change', () => storage('set', 'dusk.tracknames', trackNamesBox.checked ? '1' : '0'));
let nowPlayingTimer = 0;
// The world boss banner, over the map for 12 seconds.
let bossBannerTimer = 0;
function showBossBanner(text, style = '') {
  const el = $('boss-banner');
  el.textContent = text;
  el.classList.toggle('gold', style === 'gold');
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('show'));
  sound.play(style === 'gold' || /fallen/.test(text) ? 'holy' : 'earth');
  clearTimeout(bossBannerTimer);
  bossBannerTimer = setTimeout(() => {
    el.classList.remove('show');
    bossBannerTimer = setTimeout(() => { el.hidden = true; }, 900);
  }, 12000);
}
function showTrack(t) {
  if (!trackNamesBox.checked || !t.title) return;
  nowPlaying.textContent = `♪ ${t.title}`;
  if (t.author) {
    const by = document.createElement('span');
    by.className = 'np-by';
    by.textContent = ` · ${t.author}`;
    nowPlaying.append(by);
  }
  nowPlaying.hidden = false;
  requestAnimationFrame(() => nowPlaying.classList.add('show'));
  clearTimeout(nowPlayingTimer);
  nowPlayingTimer = setTimeout(() => {
    nowPlaying.classList.remove('show');
    nowPlayingTimer = setTimeout(() => { nowPlaying.hidden = true; }, 900);
  }, 5000);
}
music.on = musicBox.checked;
const musicVolume = $('music-volume');
// The music's volume is the slider's times a duck that follows the weather:
// down to half in rain, out in a storm, eased over a few seconds.
function applyMusicLevel() {
  music.setVolume(musicBase * musicDuck);
  ambient.setMusicVolume(musicBase * musicDuck);
}
function setMusicVolume(v, save = true) {
  musicBase = Math.max(0, Math.min(1, v));
  applyMusicLevel();
  musicVolume.value = String(Math.round(musicBase * 100));
  if (save) storage('set', 'dusk.musicvolume', musicVolume.value);
}
setInterval(() => {
  if (Math.abs(musicDuckTo - musicDuck) < 0.01) { if (musicDuck !== musicDuckTo) { musicDuck = musicDuckTo; applyMusicLevel(); } return; }
  musicDuck += (musicDuckTo - musicDuck) * 0.08;
  applyMusicLevel();
}, 150);
setMusicVolume(Number(storage('get', 'dusk.musicvolume') ?? 60) / 100, false);
musicVolume.addEventListener('input', () => setMusicVolume(Number(musicVolume.value) / 100));
musicBox.addEventListener('change', () => { storage('set', 'dusk.music', musicBox.checked ? '1' : '0'); applySound(); });
// #music-test plays the placeholder tones in music/test/ instead.
fetch(location.hash === '#music-test' ? 'music/manifest.test.json' : 'music/manifest.json', { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : null)).then((m) => music.load(m)).catch(() => music.load(null));
// Music waits for the first press or key (browsers only play sound after one).
const startMusic = () => {
  removeEventListener('pointerdown', startMusic, true);
  removeEventListener('keydown', startMusic, true);
  music.unlock();
};
addEventListener('pointerdown', startMusic, true);
addEventListener('keydown', startMusic, true);
document.addEventListener('visibilitychange', () => music.setHidden(document.hidden));
// The mood: forced by opcode 12 (no server sends it yet) or the debug
// panel, else the place's. A place's mood has to hold for two looks (4 s)
// before the music follows, so a walk along a town's edge doesn't flip it.
let musicOverride = null;
let lastPlace = null;
function placeMood() {
  if (!loaded) return null;
  const x = world.locX, y = world.locY;
  const aboard = [...renderer.ships.ships.values()].some((s) => s.x === x && s.y === y);
  return moodAt({ x, y, light: daylight(), underground: isUnderground(x, y), aboard, region: atmosphere.regionAt?.(x, y) ?? null });
}
function setMusicOverride(mood) {
  musicOverride = mood;
  music.setMood(mood ?? placeMood());
}
setInterval(() => {
  const place = placeMood();
  const settled = place === lastPlace;
  lastPlace = place;
  if (!musicOverride && settled) music.setMood(place);
}, 2000);
// Area sounds (js/ambience.js): birds, wind, waves, drips... from the
// squares in view and the time of day; quieter birds in the rain.
const areaSound = new AreaAmbience(sound);
const ambienceVolume = $('ambience-volume');
sound.setAmbienceVolume(Number(storage('get', 'dusk.ambiencevolume') ?? 50) / 100);
ambienceVolume.value = String(Math.round(sound.ambienceVolume * 100));
ambienceVolume.addEventListener('input', () => { sound.setAmbienceVolume(Number(ambienceVolume.value) / 100); storage('set', 'dusk.ambiencevolume', ambienceVolume.value); });
const ambienceBox = $('ambience-toggle');
ambienceBox.checked = storage('get', 'dusk.ambience') !== '0';
areaSound.setOn(ambienceBox.checked);
ambienceBox.addEventListener('change', () => { storage('set', 'dusk.ambience', ambienceBox.checked ? '1' : '0'); areaSound.setOn(ambienceBox.checked); });
setInterval(() => {
  if (!loaded || !world.tiles?.length) return;
  const mix = areaMix(areaCounts(world.tiles.flat(), renderer.snowTiles ?? undefined), { light: daylight(), underground: isUnderground(world.locX, world.locY), town: !!townAt(world.locX, world.locY) });
  if (rainLevel > 0) { mix.birds *= 1 - rainLevel; mix.gulls *= 1 - rainLevel * 0.7; mix.crickets *= 1 - rainLevel; }
  areaSound.update(mix);
}, 2000);
if (location.hash.startsWith('#music')) {
  musicPanel({ player: music, setOverride: setMusicOverride, getOverride: () => musicOverride, setVolume: (v) => setMusicVolume(v) });
  window.music = music;
}
// The sky changes slowly: redraw now and then even when nothing moves.
setInterval(() => renderer.invalidate(), 30000);
// localStorage key for this character's explored tiles, set once we know
// who's logging in; until then tiles are only kept in memory.
let exploredKey = null;
let loginName = null;
let targetId = -1; // Dusk.java's targetID; -1 means none

const ARROWS = { ArrowUp: 'n', ArrowDown: 's', ArrowLeft: 'w', ArrowRight: 'e' };
const WASD = { w: 'n', s: 's', a: 'w', d: 'e' };

// ---- setup -----------------------------------------------------------------

// A saved plain ws:// address can't work from an https page; use the default.
const savedServer = storage('get', 'dusk.server');
serverUrl.value =
  new URLSearchParams(location.search).get('server') ||
  (SECURE && savedServer?.startsWith('ws://') ? null : savedServer) ||
  DEFAULT_BRIDGE;
// The protocol trace is for debugging, so it starts off on every visit
// rather than being remembered (it floods the chat with raw messages).
traceBox.checked = false;
storage('set', 'dusk.trace', '0');
namesBox.checked = storage('get', 'dusk.names') !== '0';
renderer.showNames = namesBox.checked;
const npcNamesBox = $('npc-names');
npcNamesBox.checked = storage('get', 'dusk.npcnames') !== '0';
renderer.showNpcNames = npcNamesBox.checked;
npcNamesBox.addEventListener('change', () => {
  storage('set', 'dusk.npcnames', npcNamesBox.checked ? '1' : '0');
  renderer.showNpcNames = npcNamesBox.checked;
  renderer.invalidate();
});
const objectNamesBox = $('object-names');
objectNamesBox.checked = storage('get', 'dusk.objectnames') === '1';
renderer.showObjectNames = objectNamesBox.checked;
objectNamesBox.addEventListener('change', () => {
  storage('set', 'dusk.objectnames', objectNamesBox.checked ? '1' : '0');
  renderer.showObjectNames = objectNamesBox.checked;
  renderer.invalidate();
});
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

// The explored map is kept on the server too (js/mapsync.js), so it
// follows you to another device: fetched a moment after logging in, and
// what changes is sent back every so often.
const MAP_LOAD_DELAY_MS = 3000;
const MAP_RETRY_MS = 10000;
const MAP_SYNC_MS = 15000;
const mapSync = new MapSync({
  send: (cmd) => { if (conn?.connected) conn.background(cmd); },
  explored: () => minimap.explored,
  onMerged: () => {
    // The rest that follows you about: notes, friends, map pins.
    quiet(MAP_NOTES);
    quiet(MARKERS);
    socialUI.refreshFriends();
    minimap.setExplored(minimap.explored);
    worldMap.invalidate();
    saveExplored();
  },
});
let mapLoadTimer = 0;
function loadServerMap() {
  clearTimeout(mapLoadTimer);
  const ask = () => {
    if (mapSync.loaded || mapSync.asked >= 2 || !conn?.connected) return;
    mapSync.load();
    mapLoadTimer = setTimeout(ask, MAP_RETRY_MS);
  };
  mapLoadTimer = setTimeout(ask, MAP_LOAD_DELAY_MS);
}
setInterval(() => mapSync.tick(), MAP_SYNC_MS);

// Sound: the speaker button mutes everything (sound effects, rain and
// music); the Settings switches turn sound effects and music on or off
// each on their own. The two volume sliders (top bar, and Settings on
// phones) stay in step.
const volumes = [...document.querySelectorAll('.volume')];
const soundBox = $('sound-toggle');
// The speaker used to flip the Sound switch, so "sound off" saved from
// then was really a mute.
if (storage('get', 'dusk.muted') === null && storage('get', 'dusk.sound') === '0') {
  storage('set', 'dusk.muted', '1');
  storage('set', 'dusk.sound', '1');
}
let muted = storage('get', 'dusk.muted') === '1';
soundBox.checked = storage('get', 'dusk.sound') !== '0';
function applySound() {
  sound.enabled = soundBox.checked && !muted;
  music.setOn(musicBox.checked && !muted);
  const btn = $('mute-btn');
  btn.textContent = muted ? '🔇' : '🔊';
  btn.setAttribute('aria-pressed', String(muted));
  btn.title = muted ? 'Muted (click for sound and music)' : 'Sound and music on (click to mute)';
}
function setMuted(on) {
  muted = on;
  storage('set', 'dusk.muted', on ? '1' : '0');
  applySound();
}
function setSoundOn(on) {
  soundBox.checked = on;
  storage('set', 'dusk.sound', on ? '1' : '0');
  applySound();
}
applySound();
sound.setVolume(Number(storage('get', 'dusk.volume') ?? 60) / 100);
for (const v of volumes) {
  v.value = String(Math.round(sound.volume * 100));
  v.addEventListener('input', () => {
    sound.setVolume(Number(v.value) / 100);
    for (const w of volumes) if (w !== v) w.value = v.value;
    storage('set', 'dusk.volume', v.value);
    if (Number(v.value) > 0) {
      if (muted) setMuted(false);
      if (!soundBox.checked) setSoundOn(true);
    }
  });
  // A sample at the new level once you let go.
  v.addEventListener('change', () => sound.play('hit'));
}
soundBox.addEventListener('change', () => setSoundOn(soundBox.checked));
$('mute-btn').addEventListener('click', () => {
  setMuted(!muted);
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
// Tabs that come and go (God, Shop, Storage) aren't reopened from last time.
const steadyTab = ['inv', 'equip', 'book', 'stats', 'journal', 'friends'].includes(savedTab) ? savedTab : 'inv';
panels.selectByName(steadyTab, savedOpen ? savedOpen === '1' : window.innerWidth >= 800);
panels.onToggle = (tab, open) => {
  storage('set', 'dusk.panel', `${tab}:${open ? 1 : 0}`);
  if (tab === 'god' && open) god.opened();
  if (tab === 'journal' && open) socialUI.refreshJournal();
  if (tab === 'friends' && open) socialUI.refreshFriends();
};

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

// The closed beta (server/dusk_bridge.py, server/betagate.py). The bridge's
// /status says whether a key is needed; then the key field shows, and the
// connection opens with the key, or with the token the bridge gave this
// browser for it last time, so it's typed once.
const BETA_KEY = 'dusk.betakey';
const BETA_TOKEN = 'dusk.betatoken';
const BETA_MESSAGES = {
  required: 'This is a closed beta: enter your beta key to play.',
  invalid: 'Invalid or revoked beta key. Check it and try again.',
  used: 'That beta key has already been used. Ask for a new one.',
  revoked: 'Your beta key has been revoked.',
  blocked: 'Too many attempts. Please wait a while before trying again.',
  full: 'The beta is full right now, try again in a few minutes.',
};
let betaGate = false;
$('login-key').value = storage('get', BETA_KEY) ?? '';

function betaStatusUrl(bridge) {
  try {
    const u = new URL(bridge);
    u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
    u.pathname = u.pathname.replace(/\/+$/, '') + '/status';
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}

function showBeta(on, keyUrl = '') {
  betaGate = on;
  $('login-beta').hidden = !on;
  const link = $('login-key-link');
  link.hidden = !keyUrl;
  if (keyUrl) link.href = keyUrl;
}

// An old bridge has no /status: then there's no gate to show.
function refreshBeta() {
  const url = betaStatusUrl(serverUrl.value.trim());
  if (!url || typeof fetch !== 'function') return Promise.resolve();
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), 5000);
  return fetch(url, { cache: 'no-store', signal: ctl?.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => j && showBeta(!!j.gate, typeof j.keyUrl === 'string' && /^(https?:|mailto:)/.test(j.keyUrl) ? j.keyUrl : ''))
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

// The Discord invite (DISCORD_URL in beta.conf, via apply.py) on the login.
function showDiscord() {
  if (typeof fetch !== 'function') return;
  fetch('apply/api/info', { cache: 'no-store', credentials: 'omit' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const url = j && typeof j.discord === 'string' && /^https:\/\//.test(j.discord) ? j.discord : '';
      const line = $('login-discord');
      line.hidden = !url;
      if (url) line.querySelector('a').href = url;
    })
    .catch(() => {});
}

// What to open the connection with, or null when no key is needed.
function betaCredentials() {
  if (!betaGate) return null;
  const typed = $('login-key').value.trim().toUpperCase();
  const token = storage('get', BETA_TOKEN);
  const saved = storage('get', BETA_KEY) ?? '';
  // A newly typed key goes with the token, which the bridge tries first.
  if (token) return typed && typed !== saved ? { token, key: typed } : { token };
  return typed ? { key: typed } : null;
}

function forgetBeta() {
  storage('remove', BETA_TOKEN);
  storage('remove', BETA_KEY);
  $('login-key').value = '';
}

// The bridge's answer to the key, or a notice later (a revoked key).
function betaAnswer(a) {
  if (a.ok) {
    if (a.token) storage('set', BETA_TOKEN, a.token);
    const typed = $('login-key').value.trim().toUpperCase();
    if (a.gate && typed) storage('set', BETA_KEY, typed);
    return;
  }
  const text = BETA_MESSAGES[a.code] || a.message || BETA_MESSAGES.invalid;
  if (a.code === 'invalid' || a.code === 'revoked' || a.code === 'used') forgetBeta();
  if (a.code === 'required' || a.code === 'invalid' || a.code === 'revoked' || a.code === 'used') showBeta(true, $('login-key-link').hidden ? '' : $('login-key-link').href);
  dropReason = text;
  // Reconnecting with the same key can't help.
  if (a.code !== 'full') creds = null;
  if (loginFlow) {
    failLogin(text);
    if (a.code !== 'full' && a.code !== 'blocked') $('login-key').focus();
  }
}

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
serverUrl.addEventListener('change', () => {
  $('login-server').textContent = serverUrl.value.trim();
  refreshBeta();
});
refreshBeta();
showDiscord();

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
    // Over https the resource server is the root of the same address.
    img.src = SECURE ? `${location.origin}/images/players.gif` : `http://${host}:${FALLBACK_RC_PORT}/images/players.gif`;
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
  // To the gods in the game too (server/Mail.java), when logged in; the
  // server answers in the chat.
  const inGame = conn?.connected && player.name;
  if (inGame) {
    const { subject: s, body: b } = bugReport();
    conn.background(`bugreport ${encodeURIComponent(s.replace(/^\[Dusk web\] /, ''))} ${encodeURIComponent(b)}`);
  }
  location.href = link;
  $('bug-msg').textContent = (inGame ? 'Sent to the gods in the game (the chat says when it arrives). ' : '') +
    `Your email app should open with the message. If nothing happened, use Copy text and send it to ${BUG_EMAIL} yourself.`;
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
  // A trade request: Accept or Decline.
  if ($('prompt-bar').dataset.mode === 'trade') {
    quiet(b.dataset.answer === 'yes' ? 'trade accept' : 'trade decline');
    hideTradeRequest();
    return;
  }
  yesNoWaiting = false;
  runCommand(b.dataset.answer);
  $('prompt-bar').hidden = true;
});

// A yes/no question from the server is waiting for its answer.
let yesNoWaiting = false;

function startLogin(name, password, again = false) {
  creds = { name, password };
  yesNoWaiting = false;
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
  const beta = betaCredentials();
  if (betaGate && !beta) {
    failLogin(BETA_MESSAGES.required);
    $('login-key').focus();
    return;
  }
  connect(serverUrl.value.trim(), beta);
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
  refreshBeta();
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
  // M opens and closes the world map (not while typing); Escape closes it.
  if (worldMap.open && e.key === 'Escape') {
    e.preventDefault();
    worldMap.close();
    return;
  }
  if (!inInput && !inOtherField && (e.key === 'm' || e.key === 'M') && document.body.classList.contains('playing')) {
    e.preventDefault();
    worldMap.toggle();
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
    walk(dir);
  }
});

// One step, from the keys or the on-screen arrows.
function walk(dir) {
  // An NPC is waiting for an answer: a step would be taken as one.
  if (speechAwaiting) {
    $('speech').classList.remove('nudge');
    void $('speech').offsetWidth;
    $('speech').classList.add('nudge');
    return;
  }
  conn.send(dir);
}

// The on-screen arrows: a press takes a step, and holding keeps walking,
// like holding an arrow key.
const DPAD_FIRST_MS = 380;
const DPAD_REPEAT_MS = 260;
let dpadHeld = null; // { id, timer }
function dpadRelease(e) {
  if (!dpadHeld || (e && e.pointerId !== dpadHeld.id)) return;
  clearTimeout(dpadHeld.timer);
  dpadHeld.button.classList.remove('held');
  dpadHeld = null;
}
for (const b of document.querySelectorAll('#dpad [data-dir]')) {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!canAct()) return;
    dpadRelease();
    try { b.setPointerCapture(e.pointerId); } catch {}
    const again = () => {
      if (!canAct()) return dpadRelease();
      walk(b.dataset.dir);
      dpadHeld.timer = setTimeout(again, DPAD_REPEAT_MS);
    };
    dpadHeld = { id: e.pointerId, button: b, timer: 0 };
    b.classList.add('held');
    walk(b.dataset.dir);
    dpadHeld.timer = setTimeout(again, DPAD_FIRST_MS);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, dpadRelease);
  // Keyboard users (Enter / Space on a focused arrow) get one step.
  b.addEventListener('click', (e) => { if (e.detail === 0 && canAct()) walk(b.dataset.dir); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
window.addEventListener('blur', () => dpadRelease());

// Shown on touch screens unless Settings says otherwise.
const dpadMode = $('dpad-mode');
const coarse = window.matchMedia('(pointer: coarse)');
function applyDpad() {
  const mode = dpadMode.value;
  $('dpad').hidden = !(mode === 'on' || (mode === 'auto' && coarse.matches));
}
dpadMode.value = ['auto', 'on', 'off'].includes(storage('get', 'dusk.dpad')) ? storage('get', 'dusk.dpad') : 'auto';
dpadMode.addEventListener('change', () => { storage('set', 'dusk.dpad', dpadMode.value); applyDpad(); });
coarse.addEventListener?.('change', applyDpad);
applyDpad();

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
  // A barrel or chest in reach, with nothing else there but you, opens or
  // closes with the click itself (gods get the menu, for Remove).
  const others = here.filter((ent) => !(ent.type === 0 && ent.x === world.locX && ent.y === world.locY));
  if (!isGod && others.length === 1 && isStorage(others[0]) && storageReach(others[0], { x: world.locX, y: world.locY })) {
    if (panels.storage?.entity.id === others[0].id) panels.setStorage(null);
    else openStorage(others[0].id);
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
$('target-flee').addEventListener('click', () => runCommand('flee'));
panels.onActions = () => updateTarget();

setMode('login');
if ($('login-name').value) $('login-pass').focus();
else $('login-name').focus();

// How many are playing, under the login (who.json, see who.html).
fetch('who.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    const w = describeWho(data, Date.now());
    if (data?.updated && !w.count.startsWith("Can't")) $('login-who-count').textContent = `· ${w.count}`;
  })
  .catch(() => {});

// ---- connection ------------------------------------------------------------

// A random ID this browser keeps, sent to the bridge so gods can ban a
// device as well as an account (server/Bans.java).
function deviceId() {
  let id = storage('get', 'dusk.device');
  if (!/^[a-z0-9-]{8,64}$/.test(id ?? '')) {
    id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    storage('set', 'dusk.device', id);
  }
  return id;
}
function withDevice(url) {
  try {
    const u = new URL(url);
    u.searchParams.set('device', deviceId());
    return u.toString();
  } catch {
    return url;
  }
}

function connect(url, beta = null) {
  if (!/^wss?:\/\//.test(url)) {
    errLine('Bridge address should start with ws:// or wss://');
    return;
  }
  storage('set', 'dusk.server', url);
  loaded = false;
  targetId = -1;
  player = panels.player = new Player();
  panels.setOnMerchant(null);
  setGod(false);
  // The whole-world view is for gods; fetched again if this login is one.
  worldMap.full = null;
  worldMap.overview = null;
  godMap.asked = false;
  panels.renderAll();
  saveExplored();
  exploredKey = loginName = null;
  minimap.setExplored(new Explored());
  mapSync.reset();
  world = newWorld();
  renderer.ships?.clear();
  renderer.world = world;
  renderer.resize();
  setState('pending');
  sysLine(`Connecting to ${url}…`);

  conn = new DuskConnection(withDevice(url), beta);
  conn.addEventListener('beta', (e) => betaAnswer(e.detail));
  // Background lines wait while logging in (the server reads the next
  // line as the answer to "Is that correct? (yes/no)" and the like) and
  // while an NPC waits for an answer.
  conn.holdBackground = () => !!loginFlow || speechAwaiting || yesNoWaiting || Date.now() < talkHold;
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
  for (const id of world.takeRement()) conn?.background(`rement ${id}`);
  if (stepped && stepsBox.checked) sound.play('step');
  // One sound per combat line: a real hit beats a 0, which beats a dodge.
  const newHits = world.hits.slice(hitsBefore);
  if (newHits.length) {
    sound.play(newHits.some((h) => h.kind === 'hit' && h.text !== '0') ? 'hit' : newHits.some((h) => h.kind === 'hit') ? 'miss' : 'dodge');
  }
  if (msg.op === OP.MAP) {
    minimap.paint(minimap.explored.record(msg.x, msg.y, msg.tiles));
    minimap.setCentre(msg.x, msg.y);
    worldMap.setPlayer(msg.x, msg.y);
  }
  if (targetId !== -1 && (msg.op === OP.ENTITY || msg.op === OP.REMOVE_ENTITY || msg.op === OP.MAP)) updateTarget();
  // A player coming into view: what are they wearing?
  if (msg.op === OP.ENTITY && msg.type === 0) askWorn(Date.now(), 30000);

  const part = player.apply(msg);
  if (part) {
    panels.update(part);
    if (part === 'items') socialUI.renderTrade();
    if (part === 'status') showPanels();
    if (part === 'equipment') dressSelf();
  }
  // On a merchant's square? (Dusk.java enables its Merchant button this way.)
  if (msg.op === OP.MAP || msg.op === OP.ENTITY || msg.op === OP.REMOVE_ENTITY || (msg.op >= OP.MOVE_NORTH && msg.op <= OP.MOVE_EAST)) {
    panels.setOnMerchant([...world.entities.values()].find((e) => e.type === 2 && e.x === world.locX && e.y === world.locY));
    // An open barrel or chest closes once it's out of reach (a deposit
    // box: two squares from its teller).
    const open = panels.storage && world.entities.get(panels.storage.entity.id);
    const reach = panels.storage?.box ? TELLER_REACH : 1;
    if (panels.storage && !(open && Math.abs(open.x - world.locX) <= reach && Math.abs(open.y - world.locY) <= reach)) panels.setStorage(null);
    if (isGod) {
      god.setPos(world.locX, world.locY);
      god.setMerchant(panels.onMerchant, player.shop.wares);
    }
  } else if (isGod && part === 'shop') {
    god.setMerchant(panels.onMerchant, player.shop.wares);
  }
  // The menu's entities may have moved, left, or come into attack range.
  if (entityMenu.open && (msg.op === OP.ENTITY || msg.op === OP.REMOVE_ENTITY || msg.op === OP.MAP || msg.op === OP.RANGE ||
      (msg.op >= OP.MOVE_NORTH && msg.op <= OP.MOVE_EAST))) entityMenu.refresh(world);

  switch (msg.op) {
    case OP.TEXT: {
      // The "talk names" answer is for the menu, not the chat.
      const names = parseTalkers(msg.text);
      if (names) { talkers = names; renderer.talkers = names; renderer.invalidate(); break; }
      // The server's copy of the explored map: never shown in chat.
      if (mapSync.feed(msg.text)) break;
      // Journal, friends, map pins and notes, and trading (js/social.js).
      if (socialLine(msg.text)) break;
      // Gods' whole world map.
      if (isGod && godMapLine(msg.text)) break;
      // The definitions editor's answers.
      // Ferries at sea (js/ships.js): never shown in chat.
      const ship = parseShip(msg.text);
      if (ship) { renderer.ships.update(ship); renderer.invalidate(); break; }
      const lib = isGod && parseLibReply(msg.text);
      if (lib) { libraryEditor.reply(lib); break; }
      if (isGod && libraryEditor.failed(msg.text)) break;
      const worn = parseWorn(msg.text);
      if (worn) { if (worn.id != null) { wornAnswered.add(worn.id); renderer.setOtherGear(worn.id, gearFromEquipment(worn.equipment)); } break; }
      // A spell cooling down (server/Skills.java): greyed out until it's ready.
      const cd = parseCooldown(msg.text);
      if (cd) { cooldowns.start(cd, Date.now()); showCooldowns(); break; }
      const questReply = isGod && parseQuestReply(msg.text);
      if (questReply) { questEditor.reply(questReply); break; }
      if (isGod && questEditor.swallow(msg.text)) break;
      const dlgReply = parseDialogueReply(msg.text);
      if (dlgReply) { if (!questEditor.dialogue(dlgReply)) dialogueEditor.loaded(dlgReply); break; }
      const serverReply = isGod && parseServerInfo(msg.text);
      if (serverReply) { god.serverReply(serverReply); adminView.serverReply(serverReply); break; }
      const adminReply = isGod && parseAdmin(msg.text);
      if (adminReply) { adminView.reply(adminReply); break; }
      const achvReply = parseAchv(msg.text);
      if (achvReply && achievementsView.reply(achvReply)) break;
      const partyReply = parseParty(msg.text);
      if (partyReply && partyView.reply(partyReply)) break;
      const mailReply = parseMail(msg.text);
      if (mailReply && mailView.reply(mailReply)) break;
      if (mailView.sent(msg.text.trim())) break;
      const flagsReply = parseFlags(msg.text);
      if (flagsReply) { flagsDialog.loaded(flagsReply); break; }
      const tileReply = parseTileReply(msg.text);
      if (tileReply) { tileEditor.loaded(tileReply); break; }
      const tileScript = parseTileScriptReply(msg.text);
      if (tileScript) { tileEditor.scriptReply(tileScript); break; }
      if (isGod && tileEditor.scriptFailed(msg.text)) break;
      const looks = parseLooks(msg.text);
      if (looks) { renderer.propLooks = looks; renderer.invalidate(); break; }
      // A world boss rising or falling (server/WorldBoss.java): a banner
      // too, and a rumble; the line stays in the chat.
      if (/^World boss: /.test(msg.text.trim())) showBossBanner(msg.text.trim().slice(12));
      const sp = parseSpeech(msg.text);
      if (sp) showSpeech(sp);
      else if (Date.now() < speechFollow && !$('speech').hidden && msg.text.trim()) noteSpeech(msg.text.trim());
      // A deposit box reply opens the box, at the teller beside you.
      if (isBoxLine(msg.text) && !panels.storage?.box) {
        const teller = [...world.entities.values()].find((e) => isTeller(e, renderer.propLooks) && Math.abs(e.x - world.locX) <= TELLER_REACH && Math.abs(e.y - world.locY) <= TELLER_REACH);
        if (teller) panels.setStorage(teller, { box: true });
      }
      const st = panels.storage ? storageReader.feed(msg.text) : null;
      if (st?.listing) panels.setStorageListing(st.listing);
      // An NPC's action reads as just its words in chat too.
      if (!st?.hide && !(isGod && god.expecting(msg.text))) addText(sp?.verb === 'acts' ? `${sp.text}` : msg.text);
      serverLine(msg.text);
      break;
    }
    case OP.COLOR_TEXT:
      addText(msg.text, `rgb(${readable(msg.r, msg.g, msg.b).join(',')})`);
      serverLine(msg.text);
      break;
    case OP.LOADED:
      loaded = true;
      break;
    case OP.EDIT_OR_LIST: {
      // Name lists for the God tab ("list items", ...).
      const kind = listKind(msg.title);
      if (kind && isGod) {
        god.setList(kind, cleanList(kind, msg.lines));
        if (libraryEditor.open) libraryEditor.fillNames();
      }
      break;
    }
    case OP.PLAY_MUSIC:
      // Never sent by this server (its playMusic is empty); 0 = back to
      // the place's mood, 1 = combat (js/music.js moodForType).
      if (Number.isFinite(msg.type)) setMusicOverride(moodForType(msg.type));
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
    // (Not from an https page: browsers block plain http images there.)
    const fallback = SECURE ? `${location.origin}/` : `http://${new URL(c.url.replace(/^ws/, 'http')).hostname}:${FALLBACK_RC_PORT}/`;
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
  if (conn === c) {
    c.send('playerloaded true');
    c.send(TALKERS); // which NPCs have something to say
    c.send(PROP_LOOKS); // props with names of their own, and what they look like
  }
}

// ---- art style ---------------------------------------------------------------
//
// Pixel is the server's own sheets. Painted is the same world repainted
// (tools/paintart: map tiles by painter.js, characters and creatures by
// figures.js, built into art/painted/ next to this page), loaded the first
// time it's picked. Any painted sheet that fails falls back to Pixel's.

let pixelSheets = null;
let paintedSheets = null;
let paintedNamed = null; // { sheet, index } once loaded, false if unavailable
let paintedItems = null; // the same, for items by name
// Reads storage listings (see storage.js) while you're next to storage.
const storageReader = new StorageReader();
let artStyle = storage('get', 'dusk.art') === 'painted' ? 'painted' : 'pixel';
// Two switches, kept in step: Pixel | Painted in the top bar, and a menu in
// Settings (shown instead on phones).
function setArt(style) {
  artStyle = style;
  storage('set', 'dusk.art', style);
  $('art-style').value = style;
  for (const b of document.querySelectorAll('#art-toggle [data-art]')) b.setAttribute('aria-checked', String(b.dataset.art === style));
  applyArt();
}
$('art-style').addEventListener('change', (e) => setArt(e.target.value));
// The look: Classic (stone and parchment, like the website) or Modern.
function setLook(look) {
  document.body.classList.toggle('classic', look === 'classic');
  storage('set', 'dusk.look', look);
  for (const b of document.querySelectorAll('#look-toggle [data-look]')) b.setAttribute('aria-checked', String(b.dataset.look === look));
  $('look-style').value = look;
}
$('look-style').addEventListener('change', (e) => setLook(e.target.value));
setLook(storage('get', 'dusk.look') === 'modern' ? 'modern' : 'classic');
$('look-toggle').addEventListener('click', (e) => {
  const b = e.target.closest('[data-look]');
  if (b) setLook(b.dataset.look);
});
$('art-toggle').addEventListener('click', (e) => {
  const b = e.target.closest('[data-art]');
  if (b) setArt(b.dataset.art);
});
$('art-style').value = artStyle;
for (const b of document.querySelectorAll('#art-toggle [data-art]')) b.setAttribute('aria-checked', String(b.dataset.art === artStyle));

// Other players' gear (Painted style): asked for as they come into view,
// and again every so often while they're visible.
// A question sent while logging in can go unanswered, so one with no
// answer is asked again after a few seconds rather than half a minute.
const wornAsked = new Map(); // entity ID -> when last asked
const wornAnswered = new Set(); // entity IDs answered since last asked
function askWorn(now = Date.now(), every = 30000) {
  if (artStyle !== 'painted' || !conn?.connected) return;
  const self = world.self();
  for (const e of world.entities.values()) {
    if (e.type !== 0 || e === self) continue;
    const wait = wornAnswered.has(e.id) ? every : 4000;
    if (now - (wornAsked.get(e.id) ?? 0) < wait) continue;
    wornAsked.set(e.id, now);
    wornAnswered.delete(e.id);
    conn.background(wornCommand(e.id));
  }
}
setInterval(() => askWorn(), 3000);

// In the Painted style your own character wears what you have equipped.
function dressSelf() {
  renderer.setGear(artStyle === 'painted' ? gearFromEquipment(player.equipment) : null);
  if (artStyle === 'painted') { wornAsked.clear(); askWorn(); }
}

// A Painted sheet drawn by name plus its index: { sheet, index }, or false
// if it isn't there. `size`: the frame side for a grid sheet.
async function loadNamed(name, size) {
  const [sheet, index] = await Promise.all([
    loadSheet(`art/painted/${name}.png`, size),
    fetch(`art/painted/${name}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  return sheet && index ? { sheet, index: new Map(Object.entries(index)) } : false;
}

async function applyArt() {
  let sheets = pixelSheets;
  if (artStyle === 'painted' && pixelSheets) {
    if (!paintedSheets) {
      const [map, players, sprites] = await Promise.all(['map', 'players', 'sprites'].map((n) => loadSheet(`art/painted/${n}.png`)));
      paintedSheets = { map, players, sprites };
      if (!map && !players && !sprites) errLine('The Painted art isn\'t available on this server yet; showing Pixel.');
    }
    sheets = {
      ...pixelSheets,
      map: paintedSheets.map ?? pixelSheets.map,
      players: paintedSheets.players ?? pixelSheets.players,
      sprites: paintedSheets.sprites ?? pixelSheets.sprites,
    };
  }
  if (!sheets) return;
  // Item pictures in the Backpack, Storage and Shop, whatever the style.
  if (paintedItems === null) {
    paintedItems = await loadNamed('items', 128);
    panels.renderItems();
    panels.update('equipment');
  }
  renderer.paintedEffects = artStyle === 'painted';
  renderer.blendGround = artStyle === 'painted';
  renderer.bigTrees = artStyle === 'painted';
  // Creatures drawn by name, in the Painted style.
  if (artStyle === 'painted') {
    // A grid of 256-pixel frames (tools/paintart/bestiary.js).
    if (paintedNamed === null) paintedNamed = await loadNamed('named', 256);
    if (paintedItems === null) paintedItems = await loadNamed('items', 128);
    renderer.named = paintedNamed || null;
    renderer.items = paintedItems || null;
    panels.update('equipment'); // item pictures on the body
  } else {
    renderer.named = null;
    renderer.items = null;
  }
  dressSelf();
  // Which tiles are snow, for snow instead of rain (measured once, from
  // the painted tiles: the game's own picture is on another server, which
  // the browser won't let a page read).
  if (!renderer.snowTiles) {
    renderer.snowTiles = new Set();
    const measure = (sheet) => { const found = sheet && findSnowTiles(sheet); if (found) renderer.snowTiles = found; return !!found; };
    if (!measure(paintedSheets?.map)) loadSheet('art/painted/map.png').then(measure).catch(() => {});
  }
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
  // In a fight the card shows even with nothing targeted (a creature that
  // attacked you), for its Flee button.
  const fighting = panels.player.actions.includes('flee');
  $('target-card').hidden = !ent && !fighting;
  $('target-flee').hidden = !fighting;
  spellbook.refreshTarget();
  for (const id of ['bar-target', 'target-look', 'target-clear']) $(id).hidden = !ent;
  if (!ent) {
    $('target-name').textContent = 'In a fight';
    $('target-attack').hidden = true;
    return;
  }
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
  // The dialogue editor's save is one long line of base64: don't echo it.
  if (/^talkedit set /.test(cmd)) {
    conn.send(cmd);
    echoLine(`talkedit set ${cmd.slice(13).split('|')[0]} (dialogue)`);
    return;
  }
  if (/^tileset /.test(cmd)) {
    conn.send(cmd);
    echoLine('tileset (tile action)');
    return;
  }
  if (/^talk \d/.test(cmd)) talkHold = Date.now() + 4000;
  answeredSpeech();
  // Anything typed answers a waiting yes/no question.
  if (yesNoWaiting) {
    yesNoWaiting = false;
    $('prompt-bar').hidden = true;
  }
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
  // Only gods are asked this, at login.
  if (GOD_PROMPT.test(text.trim())) setGod(true);
  if (handleLogin(text)) return;
  if (isDeath(text)) showDeath();
  const loss = losses && parseLoss(text);
  if (loss) {
    Object.assign(losses, loss);
    $('death-loss').textContent = lossSentence(losses);
  }
  if (isYesNo(text) && !parseSpeech(text)) {
    $('prompt-text').textContent = text.trim().replace(/\s*\(yes\/no\)\s*$/i, '');
    $('prompt-bar').hidden = false;
    // The server takes the next line as the answer: nothing in the
    // background (map sync, keep-alives) may go first.
    yesNoWaiting = true;
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

// Clears the target here only. This server has no way to clear one:
// "target -1 <id>" throws ArrayIndexOutOfBoundsException on it (the
// reference code handled it; the running server doesn't), and the Java
// client never sent it either.
function clearTarget() {
  if (targetId === -1) return;
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
  // "%" talks to your party (server/Party.java).
  conn.send((!secret && partyChatCommand(text)) || text);
  echoLine(secret ? '*'.repeat(text.length) : text);
  $('prompt-bar').hidden = true; // typed an answer instead
  answeredSpeech();
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
  loadServerMap();
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
  // Server lines are sorted into General or Combat; our own are General.
  const kind = cls ? 'general' : chatKind(text);
  const div = document.createElement('div');
  div.className = `line k-${kind}${cls ? ` ${cls}` : ''}${kind === 'combat' && alsoGeneral(text) ? ' k-both' : ''}`;
  if (color) div.style.color = color;
  const stamp = document.createElement('span');
  stamp.className = 'stamp';
  stamp.textContent = new Date().toTimeString().slice(0, 5) + ' ';
  div.append(stamp, kind === 'combat' ? text.replace(/^\t+/, '') : text);
  output.appendChild(div);
  lineCount[kind]++;
  // Each kind keeps its own last MAX_LINES, so a long fight doesn't push
  // the conversation out.
  if (lineCount[kind] > MAX_LINES) {
    output.querySelector(`.line.k-${kind}`)?.remove();
    lineCount[kind]--;
  }
  if (kind === 'combat' && !cls && tally.feed(text, player.name)) renderTally();
  // Whispers show in General too, and flag their own tab as well.
  if (!chatShows(div) || (kind === 'whisper' && chatView !== 'whisper')) markUnread(kind);
  // What you type always brings you back to the latest.
  if (cls === 'echo') followLog = true;
  if (followLog) output.scrollTop = output.scrollHeight;
  else if (chatShows(div)) latestBtn.hidden = false;
}

// ---- journal, friends, map pins, trading ------------------------------------

// A line for one of them: handled (and kept out of chat unless it says
// something worth seeing), true; else false.
function socialLine(text) {
  // A quest step done out in the world (kills, a place): an open Journal
  // catches up. The line still shows.
  if (text.trim() === 'Your journal has been updated.' && !$('tab-journal').hidden) socialUI.refreshJournal();
  let r = journalReader.feed(text);
  if (r) { if (r.done) socialUI.setJournal(r.done); return true; }
  r = journalDefReader.feed(text);
  if (r) { if (r.done) { journalEditor.loaded(r.done); dialogueEditor.journalLoaded(r.done); } return true; }
  r = notesReader.feed(text);
  if (r) { if (r.done) { worldMap.notes = r.done; worldMap.invalidate(); } return true; }
  const friends = parseFriends(text);
  if (friends) { socialUI.setFriends(friends); return true; }
  const markers = parseMarkers(text);
  if (markers) { worldMap.markers = markers; markersAt = Date.now(); worldMap.invalidate(); return true; }
  r = tradeReader.feed(text);
  if (!r) return false;
  if (r.request) showTradeRequest(r.request);
  if (r.table) { hideTradeRequest(); socialUI.setTrade(r.table); }
  if (r.closed !== undefined || r.done !== undefined) {
    hideTradeRequest();
    socialUI.endTrade();
    appendLine(r.closed ?? r.done, 'sys');
  }
  return true;
}

// Someone asks to trade: Accept / Decline in the prompt bar.
function showTradeRequest(name) {
  const bar = $('prompt-bar');
  bar.dataset.mode = 'trade';
  $('prompt-text').textContent = `${name} wants to trade with you.`;
  bar.querySelector('[data-answer="yes"]').textContent = 'Accept';
  bar.querySelector('[data-answer="no"]').textContent = 'Decline';
  bar.hidden = false;
}
function hideTradeRequest() {
  const bar = $('prompt-bar');
  if (bar.dataset.mode !== 'trade') return;
  delete bar.dataset.mode;
  bar.querySelector('[data-answer="yes"]').textContent = 'Yes';
  bar.querySelector('[data-answer="no"]').textContent = 'No';
  bar.hidden = true;
}

// Clicking a whisper answers it.
output.addEventListener('click', (e) => {
  const line = e.target.closest('.line.k-whisper');
  if (!line || window.getSelection()?.toString()) return;
  const w = parseWhisper(line.textContent.replace(/^\d\d:\d\d /, ''));
  if (w) startWhisper(w.who);
});

// World map notes, and the pins (fetched again when the map opens, if old).
let markersAt = 0;
worldMap.onAddNote = (x, y, text) => {
  quiet(noteAdd(x, y, text));
  worldMap.notes = [...worldMap.notes.filter((n) => n.x !== x || n.y !== y), { x, y, text }];
  worldMap.invalidate();
};
worldMap.onRemoveNote = (x, y) => {
  quiet(noteRemove(x, y));
  worldMap.notes = worldMap.notes.filter((n) => n.x !== x || n.y !== y);
  worldMap.invalidate();
};
worldMap.onGoto = (x, y) => { if (isGod && conn?.connected) conn.send(`teleport ${x} ${y}`); };
worldMap.onShow = () => {
  worldMap.god = isGod;
  if (Date.now() - markersAt > 120000) quiet(MARKERS);
  // Gods see the whole world, fetched the first time they look.
  if (isGod && !godMap.asked) {
    godMap.asked = true;
    godMap.full = new Explored();
    godMap.pending = [];
    worldMap.say('Loading the whole world…');
    quiet('godmap');
  }
};
const godMap = { asked: false, full: null, pending: [] };
// The whole map's chunks ("GodMap: <cx,cy> <data>", then "GodMap: done").
function godMapLine(text) {
  const t = text.trim();
  let m = /^GodMap: (-?\d+,-?\d+) (\S+)$/.exec(t);
  if (m) {
    const full = godMap.full;
    godMap.pending.push(decodeChunk(m[2]).then((tiles) => { if (tiles && full) full.chunks.set(m[1], tiles); }));
    return true;
  }
  if (/^GodMap: done \d+$/.test(t)) {
    const full = godMap.full;
    Promise.all(godMap.pending).then(async () => {
      const sheet = paintedSheets?.map ?? await loadSheet('art/painted/map.png').catch(() => null);
      if (full === godMap.full && isGod) { worldMap.say(null); worldMap.setFull(full, tileColours(sheet)); }
    });
    return true;
  }
  return false;
}
// Friends' comings and goings.
setInterval(() => { if (conn?.connected && loaded) socialUI.refreshFriends(); }, 30000);

// ---- chat tabs and options --------------------------------------------------


// Whether a line shows in the current tab.
function chatShows(line) {
  if (chatView === 'combat') return line.classList.contains('k-combat');
  if (chatView === 'whisper') return line.classList.contains('k-whisper');
  return !line.classList.contains('k-combat') || line.classList.contains('k-both') || output.classList.contains('mixed');
}

function markUnread(kind) {
  if (kind === chatView || (kind === 'combat' && output.classList.contains('mixed'))) return;
  const tab = chatTabs.find((t) => t.dataset.chat === kind);
  if (tab) tab.querySelector('.unread').hidden = false;
}

function setChatView(view) {
  chatView = view;
  output.dataset.view = view;
  for (const t of chatTabs) {
    const on = t.dataset.chat === view;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on) t.querySelector('.unread').hidden = true;
  }
  $('combat-tally').hidden = view !== 'combat' || !$('chat-tally-toggle').checked;
  toLatest();
}
for (const t of chatTabs) t.addEventListener('click', () => setChatView(t.dataset.chat));
$('chat-tabs').addEventListener('keydown', (e) => {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!step) return;
  const i = chatTabs.findIndex((t) => t.dataset.chat === chatView);
  const next = chatTabs[(i + step + chatTabs.length) % chatTabs.length];
  setChatView(next.dataset.chat);
  next.focus();
});

let tallyQueued = false;
function renderTally() {
  if (tallyQueued) return;
  tallyQueued = true;
  requestAnimationFrame(() => {
    tallyQueued = false;
    const swings = tally.hits + tally.misses;
    const values = { ...tally, rate: swings ? `${Math.round((100 * tally.hits) / swings)}%` : '–' };
    for (const b of document.querySelectorAll('#combat-tally [data-tally]')) b.textContent = values[b.dataset.tally].toLocaleString();
  });
}
$('tally-reset').addEventListener('click', () => { tally.reset(); renderTally(); });

// Options, remembered on this device.
const chatSize = $('chat-size');
const chatStamps = $('chat-stamps');
const chatMixed = $('chat-mixed');
const chatTallyBox = $('chat-tally-toggle');
function applyChatOptions() {
  output.classList.remove('size-s', 'size-m', 'size-l', 'size-xl');
  output.classList.add(`size-${chatSize.value}`);
  output.classList.toggle('stamps', chatStamps.checked);
  output.classList.toggle('mixed', chatMixed.checked);
  $('combat-tally').hidden = chatView !== 'combat' || !chatTallyBox.checked;
  if (followLog) output.scrollTop = output.scrollHeight;
}
chatSize.value = ['s', 'm', 'l', 'xl'].includes(storage('get', 'dusk.chatsize')) ? storage('get', 'dusk.chatsize') : 'm';
chatStamps.checked = storage('get', 'dusk.chatstamps') === '1';
chatMixed.checked = storage('get', 'dusk.chatmixed') === '1';
chatTallyBox.checked = storage('get', 'dusk.chattally') !== '0';
applyChatOptions();
chatSize.addEventListener('change', () => { storage('set', 'dusk.chatsize', chatSize.value); applyChatOptions(); });
chatStamps.addEventListener('change', () => { storage('set', 'dusk.chatstamps', chatStamps.checked ? '1' : '0'); applyChatOptions(); });
chatMixed.addEventListener('change', () => { storage('set', 'dusk.chatmixed', chatMixed.checked ? '1' : '0'); applyChatOptions(); });
chatTallyBox.addEventListener('change', () => { storage('set', 'dusk.chattally', chatTallyBox.checked ? '1' : '0'); applyChatOptions(); });
$('chat-clear').addEventListener('click', () => {
  for (const line of [...output.querySelectorAll('.line')]) {
    if (!chatShows(line)) continue;
    line.remove();
    lineCount[line.classList.contains('k-combat') ? 'combat' : line.classList.contains('k-whisper') ? 'whisper' : 'general']--;
  }
  $('chat-opts').open = false;
  toLatest();
});
// The menu sits over everything (the chat box clips what overflows it),
// below the button, or above it when there's no room below.
$('chat-opts').addEventListener('toggle', () => {
  const menu = $('chat-opts').querySelector('.chat-opts-menu');
  if (!$('chat-opts').open) return;
  const r = $('chat-opts').querySelector('summary').getBoundingClientRect();
  const h = menu.offsetHeight;
  menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  menu.style.top = r.bottom + 4 + h <= window.innerHeight - 8 ? `${r.bottom + 4}px` : `${Math.max(8, r.top - 4 - h)}px`;
});
// The options close when you click elsewhere.
document.addEventListener('pointerdown', (e) => {
  if ($('chat-opts').open && !e.target.closest('#chat-opts')) $('chat-opts').open = false;
});

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
  input.placeholder = state === 'on' ? "Type a command, ' to say, ; to gossip…" : 'Not connected';
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
    if (op === 'remove') return localStorage.removeItem(key);
    return op === 'get' ? localStorage.getItem(key) : localStorage.setItem(key, value);
  } catch {
    return null;
  }
}
