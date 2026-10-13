// Herb patches for herbalism (server/Crafting.java): small clusters at the
// edges of woods, the herb by how far out they are, as the spawn areas
// are: mushrooms and mandrake near the ferry landings, then lavender,
// wolfsbane, azeala, and moonpetal far out in the new lands; up to
// wolfsbane in the old world. Made from veins.mjs.
//
//   node tools/world/herbs.mjs <shortmap> <props> <merchants> <signs> > herbs.json
//
// Prints [{ name, x, y }]. The same map always gives the same veins.

import { readFileSync } from 'node:fs';

const [, , mapPath, propsPath, merchantsPath, signsPath] = process.argv;
if (!signsPath) {
  console.error('usage: node tools/world/herbs.mjs <shortmap> <props> <merchants> <signs>');
  process.exit(2);
}

const map = readFileSync(mapPath);
const COLS = map.readInt32BE(0), ROWS = map.readInt32BE(4);
const tile = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS ? 0 : map.readUInt16BE(8 + (x * ROWS + y) * 2));
// As in spawns.mjs.
const WALK = new Set([1, 20, 23, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 106, 109, 122, 126, 127, 128, 129, 137, 138, 139, 140, 141, 142, 149, 150, 158, 159, 168, 169, 172, 173]);
// Trees (as spawns.mjs: oak, autumn, palm).
const TREES = new Set([64, 103, 25, 26, 102, 124]);
const KEEP_OUT = [
  [380, 1150, 540, 1340], [1640, 1250, 1740, 1350], [1240, 830, 1450, 1010], [1366, 282, 1526, 454],
  [376, 1221, 406, 1251], [671, 1469, 701, 1499], [1474, 1392, 1504, 1422],
  [1640, 900, 1720, 990], // Ssarakh
];
const out = (x, y) => KEEP_OUT.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
const ARRIVALS = [[444, 1184], [1691, 1303]];
const oldWorld = (x, y) => x < 1000 && y < 1000;
// Tier 1-4 in the new lands (as spawns.mjs); the old world, from the
// human start, only 1-3.
const tierAt = (x, y) => {
  if (oldWorld(x, y)) {
    const d = Math.hypot(x - 125, y - 365);
    return d < 250 ? 1 : d < 500 ? 2 : 3;
  }
  const d = Math.min(...ARRIVALS.map(([ax, ay]) => Math.hypot(x - ax, y - ay)));
  return d < 220 ? 1 : d < 450 ? 2 : d < 750 ? 3 : 4;
};
// What a cluster holds, by tier: one name per patch.
const ORES = {
  1: ['mushroom patch', 'mandrake patch', 'mushroom patch'],
  2: ['mandrake patch', 'lavender patch', 'mandrake patch'],
  3: ['lavender patch', 'wolfsbane patch', 'azeala bush'],
  4: ['moonpetal patch', 'wolfsbane patch', 'azeala bush'],
};
// The old world's third tier: no azeala.
const OLD3 = ['lavender patch', 'wolfsbane patch', 'lavender patch'];
// How many clusters, by world and tier.
const WANT = { new: { 1: 18, 2: 18, 3: 16, 4: 14 }, old: { 1: 10, 2: 8, 3: 5 } };
const SPACING = 30; // between cluster centres

// Squares something already stands on.
const taken = new Set();
const triples = (path) => {
  const l = readFileSync(path, 'latin1').replace(/\r/g, '').split('\n');
  for (let i = 0; i + 2 < l.length && l[i]; i += 3) taken.add(`${l[i + 1].trim()},${l[i + 2].trim()}`);
};
triples(propsPath);
triples(signsPath);
{
  const l = readFileSync(merchantsPath, 'latin1').replace(/\r/g, '').split('\n');
  for (let i = 0; i + 2 < l.length; i++) if (l[i] === 'Merchant') taken.add(`${l[i + 1].trim()},${l[i + 2].trim()}`);
}

// A square a patch can go on: open ground at a wood's edge (trees on at
// least three of the squares round it), with open ground beside it to
// stand on.
const rockAround = (x, y) => {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && TREES.has(tile(x + dx, y + dy))) n++;
  return n;
};
const openAround = (x, y) => {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && WALK.has(tile(x + dx, y + dy))) n++;
  return n;
};
const fits = (x, y) => WALK.has(tile(x, y)) && !taken.has(`${x},${y}`) && !out(x, y) && rockAround(x, y) >= 3 && openAround(x, y) >= 3;

// A fixed shuffle, so the same map gives the same veins.
let seed = 20261013;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const candidates = [];
for (let x = 2; x < COLS - 2; x += 3) for (let y = 2; y < ROWS - 2; y += 3) if (fits(x, y)) candidates.push([x, y]);
for (let i = candidates.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
}

const centres = [];
const veins = [];
const count = { new: {}, old: {} };
for (const [x, y] of candidates) {
  const world = oldWorld(x, y) ? 'old' : 'new';
  const tier = tierAt(x, y);
  if ((count[world][tier] ?? 0) >= (WANT[world][tier] ?? 0)) continue;
  if (centres.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < SPACING)) continue;
  // The cluster: the centre and squares close by that fit too.
  const spots = [[x, y]];
  for (let r = 1; r <= 3 && spots.length < 3; r++) {
    for (let dx = -r; dx <= r && spots.length < 3; dx++) for (let dy = -r; dy <= r && spots.length < 3; dy++) {
      const sx = x + dx, sy = y + dy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !fits(sx, sy)) continue;
      if (spots.some(([px, py]) => Math.abs(px - sx) <= 1 && Math.abs(py - sy) <= 1)) continue; // room to stand between them
      spots.push([sx, sy]);
    }
  }
  if (spots.length < 2) continue;
  centres.push([x, y]);
  count[world][tier] = (count[world][tier] ?? 0) + 1;
  spots.forEach(([sx, sy], i) => {
    taken.add(`${sx},${sy}`);
    veins.push({ name: (world === 'old' && tier === 3 ? OLD3 : ORES[world === 'old' ? Math.min(tier, 3) : tier])[i], x: sx, y: sy, tier });
  });
}

console.error('clusters', JSON.stringify(count), 'placed', veins.length, Object.entries(veins.reduce((m, v) => ((m[v.name] = (m[v.name] ?? 0) + 1), m), {})).map((e) => e.join(' ')).join(', '));
console.log(JSON.stringify(veins.map(({ name, x, y }) => ({ name, x, y }))));
