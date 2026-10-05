// The God panel's logic: knowing you're a god, reading the server's name
// lists, and the commands that place things. No DOM; tested in node.
//
// Gods (privs above 2) are asked at login whether players may see them;
// that's the same level the server wants for placing things, so the
// question is how the client knows to show the panel.
//
// The server's god commands (Commands.adminCommands), all acting on the
// square you stand on:
//   <item name              an item on the ground
//   <mob name lev: N        a mob (level optional)
//   <prop name              a prop from defProps
//   <sign text              a sign
//   <merchant [name]        a merchant (then "madd"/"mremove" its wares)
//   >N                      ground tile N under you
//   <s                      save the map, mobs, merchants, signs and props
//   unset ID                remove a mob, item, sign, prop, merchant or door
//   teleport X Y            jump anywhere
//   wizinvis on|off         hide from players or not
// Storage (server/Storage.java): storage place barrel|chest [label], and
// storage remove (on its square).
// "list items|mobs|props" answer with opcode 20: a title ("Items:",
// "Mobiles:", "Props:") and one file name per line.

export const GOD_PROMPT = /^Do you want players to be able to see your presence\?/i;

const LIST_KINDS = { 'items:': 'items', 'mobiles:': 'mobs', 'props:': 'props' };

// Which list an opcode 20 message is, or null.
export function listKind(title) {
  return LIST_KINDS[String(title).trim().toLowerCase()] ?? null;
}

// The names in a list, cleaned of compiled caches and stray files, sorted.
// Items with capitals are left out: the server lowercases item names when
// it loads them, so those files can't be made.
export function cleanList(kind, lines) {
  const out = new Set();
  for (const raw of lines) {
    const name = raw.trim();
    if (!name || name.startsWith('.') || /\.(dsko|sh|log|bak|txt|zip)$/i.test(name) || name.endsWith('~')) continue;
    if (kind === 'items' && /[A-Z]/.test(name)) continue;
    out.add(name);
  }
  return [...out].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

// Names matching a search (every word, anywhere, any case).
export function search(names, query, limit = 200) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = names.filter((n) => words.every((w) => n.toLowerCase().includes(w)));
  return hits.slice(0, limit);
}

export const place = {
  item: (name) => `<${name}`,
  mob: (name, level) => (Number(level) > 0 ? `<${name} lev: ${Math.floor(Number(level))}` : `<${name}`),
  prop: (name) => `<prop ${name}`,
  // A prop that looks like `base` but has a name of its own (server/Props.java).
  namedProp: (base, name, desc = '') => `nameprop ${base}|${name.replace(/\|/g, ' ')}${desc ? `|${desc.replace(/\|/g, ' ')}` : ''}`,
  sign: (text) => `<sign ${text}`,
  namedSign: (name, text) => `namesign ${name.replace(/\|/g, ' ')}|${text}`,
  merchant: (name) => (name ? `<merchant ${name}` : '<merchant'),
  tile: (n) => `>${Math.floor(Number(n))}`,
  storage: (kind, label) => `storage place ${kind === 'chest' ? 'chest' : 'barrel'}${label ? ` ${label}` : ''}`,
};

export const SAVE_MAP = '<s';
// A message for whoever steps on your square (server/Props.java).
export const tileMessage = (speaker, text) => `tilemsg ${speaker.replace(/\|/g, ' ')}|${text}`;
export const tileClear = () => 'tilemsg clear';
// "Looks: George=Villager Man; ..." for props with names of their own.
export const PROP_LOOKS = 'prop looks';
export function parseLooks(line) {
  const m = /^Looks:\s*(.*)$/.exec(line.trim());
  if (!m) return null;
  const looks = new Map();
  for (const pair of m[1].split(';')) {
    const i = pair.indexOf('=');
    if (i > 0) looks.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1).trim().toLowerCase());
  }
  return looks;
}
export const listCommand = (kind) => `list ${kind}`;
export const unset = (id) => `unset ${id}`;
export const teleport = (x, y) => `teleport ${Math.floor(Number(x))} ${Math.floor(Number(y))}`;
export const wizinvis = (on) => `wizinvis ${on ? 'on' : 'off'}`;
export const addWare = (name) => `madd ${name}`;
export const removeWare = (name) => `mremove ${name}`;

// What "<s" saves: tiles, mobs, merchants (and their wares), signs and
// props. Items on the ground are never saved (they're gone after a
// restart), and storage saves itself.
export const SAVED_KINDS = new Set(['mob', 'prop', 'sign', 'merchant', 'tile', 'ware', 'remove']);

// A player's flags (conditions), for gods testing quests (server/Props.java).
export const flagsCommand = (id) => `flags ${id}`;
export const flagAdd = (id, flag) => `flagadd ${id}|${flag}`;
export const flagRemove = (id, flag) => `flagremove ${id}|${flag}`;
// "Flags: <id>|<name>|<flag>,<flag>" -> { id, name, flags }; a name that's
// empty means the player isn't there any more.
export function parseFlags(line) {
  const m = /^Flags: (\d+)\|([^|]*)\|(.*)$/.exec(line.trim());
  if (!m) return null;
  return { id: Number(m[1]), name: m[2], flags: m[3].split(',').map((f) => f.trim()).filter(Boolean) };
}

// The Server section (server/Admin.java "serverinfo"): a reply line ->
// { info: { up, players, usedMb, maxMb, errors, restartIn } } | { error }
// | { done: true } | null. restartIn is null when no restart is coming.
export function parseServerInfo(line) {
  const s = line.trim();
  if (s === 'ServerInfo: done') return { done: true };
  let m = /^ServerInfo: (\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(-|\d+)$/.exec(s);
  if (m) return { info: { up: Number(m[1]), players: Number(m[2]), usedMb: Number(m[3]), maxMb: Number(m[4]), errors: Number(m[5]), restartIn: m[6] === '-' ? null : Number(m[6]) } };
  m = /^ServerError: (.*)$/.exec(s);
  return m ? { error: m[1] } : null;
}

// "Up 3 h 12 min · 2 players · memory 140 of 256 MB · no errors today"
export function describeServer(i) {
  const m = Math.floor(i.up / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  const up = d ? `${d} d ${h % 24} h` : h ? `${h} h ${m % 60} min` : `${m} min`;
  const parts = [`Up ${up}`, i.players === 1 ? '1 player' : `${i.players} players`, `memory ${i.usedMb} of ${i.maxMb} MB`, i.errors ? `${i.errors} error${i.errors === 1 ? '' : 's'} today` : 'no errors today'];
  return { status: parts.join(' · '), restart: i.restartIn == null ? '' : `Restarting in ${i.restartIn} s.` };
}
