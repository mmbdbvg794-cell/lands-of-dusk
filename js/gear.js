// What your character is wearing, for the Painted style: the equipment
// (opcode 7, item names by slot) turned into what figure.js draws. The
// server only sends names, so the shape and colour come from words in the
// name ("bronze helmet", "long sword", "wizards cloak"); anything it doesn't
// recognise is drawn as plain steel.

// Materials, first match wins (so "blood stained dagger" is blood, not
// steel). Colours are the metal or cloth's middle tone.
const MATERIALS = [
  [/\bcoal\b/, '#2c2a2a'],
  [/blood|ruby|devil|hell|satan/, '#a0222a'],
  [/chaos|anarchy|annihil|anihil|darkness|dark|death|dead|shadow|soul/, '#5a3478'],
  [/demon|daemon/, '#6a2020'],
  [/diamond/, '#c4ecf8'],
  [/crystal|ice|clouds?/, '#a8d8f0'],
  [/emerald|shifty|serpent/, '#2e9a64'],
  [/dragon|scale|lizard/, '#3c7a40'],
  [/platinum/, '#e6e6ee'],
  [/titanium/, '#8a94a8'],
  [/alumin/, '#c6cacf'],
  [/mithril/, '#9ec8e8'], // (smithed: tools/server/install_crafting.py)
  [/silver|mythril|masamune|excalibur/, '#d4d8e2'],
  [/energy|lightning|thor|vortan|vortanic/, '#5ac8f0'],
  [/gold|golden|sun|solar|light|holy|god|divine|heaven|nova/, '#e2b436'],
  [/bronze|copper/, '#b8773a'],
  [/fire|flame|burn|lava/, '#e0582a'],
  [/sand/, '#d6bc84'],
  [/rust/, '#8e5a3a'],
  [/elderwood/, '#d8d0b0'],
  [/\byew\b/, '#9a4a2a'],
  [/\bash\b/, '#c8a878'],
  [/\boak\b|\bwood\b|wooden|redwood|quarter staff/, '#8a5a30'],
  [/leather|jerkin|hide|pelt|grizzly|bear|skin/, '#7a4a26'],
  [/cloth|shirt|tunic|toga|sash|newbie vest|garb/, '#cbb896'],
  [/wizard|robe|cloak|cape|mage/, '#3a4aa0'],
  [/iron|generic|basic|newbie/, '#80848c'],
  [/steel|plate|stone/, '#a4acb6'],
];
const STEEL = '#a4acb6';

export function material(name) {
  const n = name.toLowerCase().replace(/_/g, ' ');
  for (const [re, colour] of MATERIALS) if (re.test(n)) return colour;
  return STEEL;
}

// Weapons by shape. Spells some servers hand out as weapons (fireball,
// summon demon) are held as a glowing orb.
const WEAPONS = [
  [/crossbow/, 'crossbow'],
  [/bow/, 'bow'],
  [/spear|lance|pike|trident/, 'spear'],
  [/staff|rod|wand/, 'staff'],
  [/pick/, 'pick'],
  [/shovel/, 'shovel'],
  [/dagger|knife|spike|shank/, 'dagger'],
  [/axe|sickle|scythe/, 'axe'],
  [/hammer|mace|club|flail/, 'hammer'],
  [/claw|fist/, 'claw'],
  [/sword|blade|saber|sabre|cutlas|excalibur|masamune|reaver|twinkle|einhanzer|war soul/, 'sword'],
  [/fire|lightning|bolt|demon|stone|orb|gp/, 'orb'],
];

export function weaponKind(name) {
  const n = name.toLowerCase().replace(/_/g, ' ');
  for (const [re, kind] of WEAPONS) if (re.test(n)) return kind;
  return 'sword';
}

// Body armour: plate, chain, leather, hide, cloth, or a robe (down to the
// feet). Cloaks and capes are worn over whatever's underneath.
export function torsoKind(n) {
  if (/cloak|cape/.test(n)) return 'cape';
  if (/robe|garb|toga/.test(n)) return 'robe';
  if (/chain/.test(n)) return 'chain';
  if (/leather|jerkin|vest/.test(n)) return 'leather';
  if (/hide|pelt|skin|scale|bear/.test(n)) return 'hide';
  if (/shirt|tunic|sash/.test(n)) return 'cloth';
  return 'plate';
}

export function helmKind(n) {
  if (/cap\b|hood/.test(n)) return 'cap';
  if (/skull|horn/.test(n)) return 'horned';
  if (/mask/.test(n)) return 'mask';
  if (/plate helm|giants|demon/.test(n)) return 'great';
  return 'helm';
}

// Footwear and hoods (Painted style's rendered figures draw them as boots, shoes and a
// hood). The engine has no feet slot: boots and sandals are worn on the legs ("air
// boots", "sandals of the giants"), hoods on the skull, so they're told apart by name.
export function footwearKind(n) {
  if (/\b(jack)?boots?\b/.test(n)) return 'boots';
  if (/\b(shoes?|sandals?|slippers?|moccasins?)\b/.test(n)) return 'shoes';
  return null;
}
export const isHood = (n) => /\b(hood|cowl)s?\b/.test(n);

// Magic weapons glow; the colour is the blade's own.
const GLOWS = /fire|flame|burn|hell|ice|crystal|lightning|energy|light|solar|holy|god|chaos|dark|soul|excalibur|masamune|emerald|nova|orb/;

// A wielded weapon's effect (js/creatures.js WEAPON_FX), from whole words in its name:
// "Flaming Longsword" flaming, "Mithril Dagger" glint; "Darkwood Staff" none ("dark" isn't a
// word of it), "Iron Sword" none. The first that matches, in this order.
const WEAPON_WORDS = [
  ['flaming', /\b(flaming|fire|flame|flames|burning|ember|embers|inferno)\b/],
  ['frost', /\b(frost|ice|frozen|glacial|winter)\b/],
  ['glint', /\b(mithril|elven|silver|holy|blessed)\b/],
  ['shadow', /\b(shadow|dark|void|cursed|doom)\b/],
  ['venom', /\b(venom|poison|poisoned|toxic|plague)\b/],
];
export function weaponFx(name) {
  const n = String(name ?? '').toLowerCase().replace(/_/g, ' ');
  for (const [fx, re] of WEAPON_WORDS) if (re.test(n)) return fx;
  return null;
}

// equipment: { slot: { name, id } | null } as Player keeps it. Returns
// only what's worn; figure.js draws the race's own clothes for the rest.
export function gearFromEquipment(equipment = {}) {
  const gear = {};
  const name = (slot) => equipment[slot]?.name?.toLowerCase().replace(/_/g, ' ') ?? null;
  const w = name('wield');
  if (w) {
    gear.weapon = { kind: weaponKind(w), colour: material(w), glow: GLOWS.test(w) };
    const fx = weaponFx(w);
    if (fx) gear.weapon.fx = fx;
  }
  const t = name('torso');
  if (t) gear.torso = { kind: torsoKind(t), colour: material(t) };
  const h = name('skull');
  if (h && isHood(h)) gear.hood = { colour: material(h) };
  else if (h) gear.helm = { kind: helmKind(h), colour: material(h) };
  const a = name('arms');
  if (a) {
    if (/shield|field|crest/.test(a)) gear.shield = { colour: material(a) };
    else gear.sleeves = material(a);
  }
  const l = name('legs');
  if (l && footwearKind(l)) gear.feet = { kind: footwearKind(l), colour: material(l) };
  else if (l) gear.legs = { colour: material(l), plate: !/leather|pants|cloth/.test(l) };
  const f = name('feet'); // (no such slot today; ready if the engine gets one)
  if (f && footwearKind(f)) gear.feet = { kind: footwearKind(f), colour: material(f) };
  const g = name('hands');
  if (g) gear.hands = material(g);
  const b = name('waist');
  if (b) gear.belt = material(b);
  const nk = name('neck');
  if (nk) gear.neck = material(nk);
  const e = name('eyes');
  if (e) gear.eyes = material(e);
  return gear;
}

// A key that changes exactly when the drawing would.
export const gearKey = (gear) => JSON.stringify(gear);

// Other players: the server's "worn <id>" answers
// "Worn: <id>|wield=iron sword;torso=iron suit" (server/Props.java).
export const wornCommand = (id) => `worn ${id}`;
export function parseWorn(line) {
  const m = /^Worn: (\d*)\|(.*)$/.exec(line.trim());
  if (!m) return null;
  const equipment = {};
  for (const pair of m[2].split(';')) {
    const i = pair.indexOf('=');
    if (i > 0) equipment[pair.slice(0, i).trim()] = { name: pair.slice(i + 1).trim() };
  }
  return { id: m[1] === '' ? null : Number(m[1]), equipment };
}
