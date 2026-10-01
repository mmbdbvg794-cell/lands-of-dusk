// What an item is, for the Backpack's details: from js/iteminfo.json
// (tools/iteminfo.py, built from the server's defItems). No DOM; tested in
// node.

const SLOT_WORDS = { torso: 'Body armour', skull: 'Helmet', arms: 'Arms', legs: 'Legs', hands: 'Gloves', waist: 'Belt', eyes: 'Eyes', neck: 'Neck', feet: 'Boots' };

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
  if (i.type === 'armor' && i.mod) lines.push(['Armour', `+${i.mod}`]);
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
