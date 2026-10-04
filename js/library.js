// The game's definitions (server/Library.java): a monster's, prop's or
// item's file, read into fields for the God tab's editor and written back.
// No DOM; tested in node.
//
// The files are lines of "key" then its value(s): most keys take one
// value, "giveitem" (item, chance) and "skill" (name, level) take two, and
// "stationary" none; the file ends with ".". Keys the editor doesn't know
// are kept as they were, after the ones it does.

export const libGet = (kind, name) => `lib get ${kind} ${name}`;
export const libSet = (kind, name, text) => `lib set ${kind} ${name}|${toB64(text)}`;
export const libNew = (kind, name, template = '') => `lib new ${kind} ${name}|${template}`;

const toB64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromB64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b), (c) => c.charCodeAt(0)));

// What the editor shows, per kind: [key, label, type]. type: 'number',
// 'text', 'long' (a longer text), 'flag' (no value), 'item' (an item
// name), 'image' (a picture number), or a list of choices.
export const FIELDS = {
  mob: [
    ['description', 'Description', 'long'],
    ['image', 'Picture', 'image'],
    ['maxhp', 'Max HP', 'number'], ['maxmp', 'Max MP', 'number'],
    ['stre', 'STR', 'number'], ['inte', 'INT', 'number'], ['dext', 'DEX', 'number'], ['cons', 'CON', 'number'], ['wisd', 'WIS', 'number'],
    ['bravery', 'Bravery (0 to 1: how likely to fight on)', 'text'],
    ['stationary', "Stays put (doesn't wander)", 'flag'],
    ['respawn', 'Respawn after (seconds; 0 = never; empty = server default)', 'number'],
    ['wield', 'Weapon', 'item'], ['torso', 'Body armour', 'item'], ['skull', 'Helmet', 'item'], ['arms', 'Arms / shield', 'item'],
    ['legs', 'Legs', 'item'], ['waist', 'Belt', 'item'],
    ['race', 'Race', 'text'], ['title', 'Title', 'text'], ['clan', 'Clan', 'text'],
  ],
  prop: [
    ['description', 'Description', 'long'],
    ['image', 'Picture', 'image'],
    ['showname', 'Show its name', ['', 'true', 'false']],
    ['look', 'Looks like (another prop)', 'text'],
  ],
  item: [
    ['type', 'Type', ['item', 'weapon', 'ranged', 'armor']],
    ['kind', 'Worn on (armour)', ['', 'torso', 'skull', 'arms', 'legs', 'hands', 'waist', 'feet', 'neck', 'eyes']],
    ['description', 'Description', 'long'],
    ['image', 'Picture', 'image'],
    ['cost', 'Value (gp)', 'number'],
    ['mod', 'Damage / armour', 'number'],
    ['durability', 'Durability', 'number'],
    ['uses', 'Uses (0 = unlimited)', 'number'],
    ['onuse', 'Script when used', 'text'],
  ],
};
const TWO = new Set(['giveitem', 'skill']);
const NONE = new Set(['stationary']);
const ALIASES = { weilded: 'wield' };

// "Lib: <kind>|<name>|<base64>" -> { kind, name, text }; "Lib: saved
// <kind>|<name>|<n>" -> { saved: true, kind, name, updated }; else null.
export function parseLibReply(line) {
  const t = line.trim();
  let m = /^Lib: saved (mob|prop|item)\|(.+)\|(\d+)$/.exec(t);
  if (m) return { saved: true, kind: m[1], name: m[2], updated: Number(m[3]) };
  m = /^Lib: (mob|prop|item)\|(.+)\|([A-Za-z0-9+/=]*)$/.exec(t);
  if (!m) return null;
  try {
    return { kind: m[1], name: m[2], text: fromB64(m[3]) };
  } catch {
    return null;
  }
}

// A file -> { fields: { key: value | true }, drops: [{ item, chance }],
// skills: [{ name, level }], extra: [lines] }.
export function parseDef(kind, text) {
  const known = new Set((FIELDS[kind] ?? []).map(([k]) => k));
  const lines = text.replace(/\r/g, '').split('\n');
  const out = { fields: {}, drops: [], skills: [], extra: [] };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === '.') break;
    if (!raw) continue;
    const key = ALIASES[raw.toLowerCase()] ?? raw.toLowerCase();
    if (NONE.has(key)) { out.fields[key] = true; continue; }
    if (kind === 'mob' && TWO.has(key)) {
      const a = lines[++i] ?? '', b = lines[++i] ?? '';
      if (key === 'giveitem') out.drops.push({ item: a.trim(), chance: b.trim() });
      else out.skills.push({ name: a.trim(), level: b.trim() });
      continue;
    }
    if (known.has(key) && !(key in out.fields)) { out.fields[key] = lines[++i] ?? ''; continue; }
    // Unknown (or a repeat): kept with the line after it.
    out.extra.push(raw, lines[++i] ?? '');
  }
  return out;
}

// Back to a file.
export function writeDef(kind, def) {
  const out = [];
  for (const [key] of FIELDS[kind] ?? []) {
    const v = def.fields[key];
    if (NONE.has(key)) { if (v) out.push(key); continue; }
    if (v === undefined || v === null || String(v).trim() === '') continue;
    out.push(key, String(v).replace(/\n/g, ' ').trim());
  }
  if (kind === 'mob') {
    for (const d of def.drops) if (d.item?.trim()) out.push('giveitem', d.item.trim(), String(d.chance || '1').trim());
    for (const s of def.skills) if (s.name?.trim()) out.push('skill', s.name.trim(), String(s.level || '0').trim());
  }
  out.push(...def.extra);
  out.push('.');
  return out.join('\n') + '\n';
}
