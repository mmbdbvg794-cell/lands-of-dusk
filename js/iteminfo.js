// What an item is, for the Backpack's details: from js/iteminfo.json
// (tools/iteminfo.py, built from the server's defItems). No DOM; tested in
// node.

const SLOT_WORDS = { torso: 'Body armour', skull: 'Helmet', arms: 'Arms', legs: 'Legs', hands: 'Gloves', waist: 'Belt', eyes: 'Eyes', neck: 'Neck', feet: 'Boots' };

// How much of an armour piece's "mod" counts towards armour, by where it's
// worn (the server's LivingThing.getArmorMod): a suit counts most, gloves
// and sleeves little, so a shield's +200 is 10 real points and a suit's
// +50 is 20.
export const ARMOUR_WEIGHT = { torso: 0.4, skull: 0.2, waist: 0.15, arms: 0.05, legs: 0.05, hands: 0.05, eyes: 0.05, neck: 0.05 };

// What a piece adds to your armour: "+10", "+2.5".
export function armourPoints(kind, mod) {
  const w = ARMOUR_WEIGHT[kind];
  if (w == null) return `+${mod}`;
  return `+${Math.round(w * mod * 10) / 10}`;
}

// { kind, lines: [[label, value]], desc } for an item, or null if unknown.
export function describeItem(info, name) {
  const key = name?.toLowerCase().replace(/_/g, ' ');
  const i = info?.[key];
  if (!i) return null;
  const lines = [];
  let kind = 'Item';
  if (i.type === 'weapon') kind = 'Weapon';
  else if (i.type === 'ranged') kind = 'Ranged weapon';
  else if (i.type === 'armor') kind = SLOT_WORDS[i.kind] ?? 'Armour';
  if ((i.type === 'weapon' || i.type === 'ranged') && i.mod) lines.push(['Damage', `+${i.mod}`]);
  if (i.type === 'armor' && i.mod) lines.push(['Armour', armourPoints(i.kind, i.mod)]);
  if (i.type === 'ranged' && i.range > 0) lines.push(['Range', `${i.range} squares`]);
  // What stronger gear needs to be worn (the server's gearneeds file).
  if (i.needs) lines.push(['Needs', i.needs.replace(/^STR /, 'Strength ').replace(/^DEX /, 'Dexterity ').replace(/^INT /, 'Intelligence ')]);
  if (i.uses > 0) lines.push(['Uses', String(i.uses)]);
  if (i.cost > 0) lines.push(['Value', `${i.cost.toLocaleString('en')} gp`]);
  // A description that only says the name again ("a long sword") is left out.
  const desc = i.desc && i.desc.toLowerCase().replace(/^an? /, '') !== key ? i.desc : '';
  return { kind, lines, desc };
}

let loaded = null;
export function loadItemInfo(url = 'js/iteminfo.json') {
  loaded ??= fetch(url).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return loaded;
}
