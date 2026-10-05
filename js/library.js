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
    ['type', 'Type', ['item', 'weapon', 'ranged', 'armor', 'food', 'drink']],
    ['kind', 'Worn on (armour)', ['', 'torso', 'skull', 'arms', 'legs', 'hands', 'waist', 'feet', 'neck', 'eyes']],
    ['description', 'Description', 'long'],
    ['image', 'Picture', 'image'],
    ['cost', 'Value (gp)', 'number'],
    ['mod', 'Damage / armour', 'number'],
    ['durability', 'Durability', 'number'],
    ['range', 'Range (bows: squares it reaches)', 'number'],
    ['uses', 'Uses (0 = unlimited)', 'number'],
    ['onuse', 'Script when used', 'text'],
    ['onwear', 'Script when worn', 'text'],
    ['onunwear', 'Script when taken off', 'text'],
  ],
};
const TWO = new Set(['giveitem', 'skill']);
const NONE = new Set(['stationary']);
const ALIASES = { weilded: 'wield' };

// "Lib: <kind>|<name>|<base64>" -> { kind, name, text }; "Lib: saved
// <kind>|<name>|<n>" -> { saved: true, kind, name, updated }; else null.
export function parseLibReply(line) {
  const t = line.trim();
  let m = /^Lib: saved (mob|prop|item|script)\|(.+)\|(\d+)$/.exec(t);
  if (m) return { saved: true, kind: m[1], name: m[2], updated: Number(m[3]) };
  m = /^Lib: (mob|prop|item|script)\|(.+)\|([A-Za-z0-9+/=]*)$/.exec(t);
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

// ---- The item maker ----
// What an item does when used (healing, food, drink, a message) or while
// it's worn (stat bonuses), as plain numbers, and the scripts that do it:
// scripts/<item>.use, .wear and .unwear (server/Library.java "lib set
// script"). Each script starts with the numbers it was made from, so the
// editor can read them back.

// [key, label]: the use effects, then what wearing it adds.
export const USE_EFFECTS = [
  ['hp', 'Heals HP'], ['mp', 'Restores MP'],
  ['food', 'Keeps hunger away for (seconds; food: 2700 = 45 min)'], ['drink', 'Keeps thirst away for (seconds; drink: 2700 = 45 min)'],
];
export const WEAR_EFFECTS = [
  ['strengthbonus', 'STR'], ['dexteritybonus', 'DEX'], ['intelligencebonus', 'INT'], ['constitutionbonus', 'CON'], ['wisdombonus', 'WIS'],
  ['hpbonus', 'Max HP'], ['mpbonus', 'Max MP'], ['acbonus', 'AC'], ['dammodbonus', 'Damage'],
];
const MADE = '#Made by the item maker: ';
export const effectScriptName = (item, what) => `${item}.${what}`;

const num = (v) => Math.trunc(Number(v) || 0);
// A script string can't hold a double quote.
const words = (v) => String(v ?? '').replace(/["\r\n]/g, ' ').trim();
// The script language reads "-5" badly; "- 0 5" is its own minus.
const signed = (n) => (n < 0 ? `- 0 ${-n}` : String(n));

// { hp, mp, food, drink, message, gone } -> the use script, or '' if it
// does nothing. gone: the item is used up (removed) when used.
export function useScript(item, e) {
  const lines = [MADE + JSON.stringify(cleanUse(e))];
  if (words(e.message)) lines.push(`chat trigger "${words(e.message)}"`);
  if (num(e.hp) > 0) lines.push(`inc trigger hp ${num(e.hp)}`);
  if (num(e.mp) > 0) lines.push(`inc trigger mp ${num(e.mp)}`);
  if (num(e.food) > 0) lines.push(`addconditionwithduration trigger nohunger ${num(e.food)}`);
  if (num(e.drink) > 0) lines.push(`addconditionwithduration trigger nothirst ${num(e.drink)}`);
  if (lines.length === 1) return '';
  if (e.gone) lines.push(`removeitem trigger "${words(item)}"`);
  lines.push('endscript');
  return lines.join('\n') + '\n';
}
function cleanUse(e) {
  const out = {};
  for (const [k] of USE_EFFECTS) if (num(e?.[k]) > 0) out[k] = num(e[k]);
  if (words(e?.message)) out.message = words(e.message);
  if (e?.gone) out.gone = true;
  return out;
}

// { strengthbonus: 2, acbonus: 5, ... } -> { wear, unwear } scripts, or
// null if it adds nothing. Taking it off takes back what wearing gave.
export function wearScripts(e) {
  const bonuses = WEAR_EFFECTS.map(([k]) => [k, num(e?.[k])]).filter(([, n]) => n !== 0);
  if (!bonuses.length) return null;
  const head = MADE + JSON.stringify(Object.fromEntries(bonuses));
  const make = (sign) => [head, ...bonuses.map(([k, n]) => `inc trigger ${k} ${signed(sign * n)}`), 'endscript'].join('\n') + '\n';
  return { wear: make(1), unwear: make(-1) };
}

// A script the item maker made -> its numbers; null for any other script.
export function readMade(text) {
  const first = String(text ?? '').split('\n')[0];
  if (!first.startsWith(MADE)) return null;
  try {
    return JSON.parse(first.slice(MADE.length));
  } catch {
    return null;
  }
}

// Starting points for a new item: its fields, and what using or wearing
// it does.
export const ITEM_TEMPLATES = {
  weapon: { fields: { type: 'weapon', mod: '5', cost: '50', durability: '500', description: 'A new weapon.' } },
  bow: { fields: { type: 'ranged', mod: '4', range: '5', cost: '60', durability: '500', description: 'A new bow.' } },
  armour: { fields: { type: 'armor', kind: 'torso', mod: '10', cost: '50', durability: '500', description: 'A new piece of armour.' } },
  charm: { fields: { type: 'armor', kind: 'neck', mod: '0', cost: '200', durability: '-1', description: 'A new charm.' }, wear: { wisdombonus: 1 } },
  food: { fields: { type: 'item', cost: '10', uses: '1', description: 'Something to eat.' }, use: { food: 2700, message: '*Munch munch*', gone: true } },
  drink: { fields: { type: 'item', cost: '10', uses: '1', description: 'Something to drink.' }, use: { drink: 2700, message: '*Gulp gulp*', gone: true } },
  potion: { fields: { type: 'item', cost: '50', uses: '1', description: 'A healing potion.' }, use: { hp: 25, message: 'You feel better.', gone: true } },
};
