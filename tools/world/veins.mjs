// Ore veins for mining (server/Crafting.java): small clusters against
// mountain faces (the brown rock), the ore by how far out they are, as the
// spawn areas are: bronze near the ferry landings, then iron, coal, and
// mithril far out in the new lands; bronze, iron and coal in the old world.
//
//   node tools/world/veins.mjs <shortmap> <props> <merchants> <signs> > veins.json
//
// Prints [{ name, x, y }]. The same map always gives the same veins.

import { readFileSync } from 'node:fs';

const [, , mapPath, propsPath, merchantsPath, signsPath] = process.argv;
if (!signsPath) {
  console.error('usage: node tools/world/veins.mjs <shortmap> <props> <merchants> <signs>');
  process.exit(2);
}

const map = readFileSync(mapPath);
const COLS = map.readInt32BE(0), ROWS = map.readInt32BE(4);
const tile = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS ? 0 : map.readUInt16BE(8 + (x * ROWS + y) * 2));
// As in spawns.mjs.
const WALK = new Set([1, 20, 23, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 106, 109, 122, 126, 127, 128, 129, 137, 138, 139, 140, 141, 142, 149, 150, 158, 159, 168, 169, 172, 173]);
// Mountain rock only: the grey stones (58, 59, 98) are walls in towns too.
const MOUNTAIN = new Set([49, 95, 104]);
const KEEP_OUT = [
  [380, 1150, 540, 1340], [1640, 1250, 1740, 1350], [1240, 830, 1450, 1010], [1366, 282, 1526, 454],
  [376, 1221, 406, 1251], [671, 1469, 701, 1499], [1474, 1392, 1504, 1422],
  [1640, 900, 1720, 990], // Ssarakh
];
const out = (x, y) => KEEP_OUT.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
// Where players start out in the new lands: the ferry landings and the
// four home cities (Kingshaven, Velkarath's Fire Well, Ssarakh's heart,
// Aelindor's Moonwell). How far out a place is counts from the nearest, so
// every race has easy ore and herbs near home (server/Crafting.java's
// trees use the same).
const ARRIVALS = [[444, 1184], [1691, 1303], [1440, 352], [1345, 912], [1695, 943], [457, 1233]];
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
// What a cluster holds, by tier: one name per vein.
const ORES = {
  1: ['bronze vein', 'bronze vein', 'bronze vein'],
  2: ['iron vein', 'iron vein', 'bronze vein'],
  3: ['coal seam', 'iron vein', 'coal seam'],
  4: ['mithril vein', 'coal seam', 'mithril vein'],
};
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

// A square a vein can go on: open ground, with mountain on at least two
// of its four sides' neighbours (a face, not a lone rock), and open ground
// beside it to stand on.
const rockAround = (x, y) => {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && MOUNTAIN.has(tile(x + dx, y + dy))) n++;
  return n;
};
const openAround = (x, y) => {
  let n = 0;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && WALK.has(tile(x + dx, y + dy))) n++;
  return n;
};
const fits = (x, y) => WALK.has(tile(x, y)) && !taken.has(`${x},${y}`) && !out(x, y) && rockAround(x, y) >= 3 && openAround(x, y) >= 3;

// A fixed shuffle, so the same map gives the same veins.
let seed = 20261012;
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
// A cluster round x, y: the centre and squares close by that fit too; false
// if there's no room for two.
function cluster(x, y, tier, world) {
  if (centres.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < SPACING)) return false;
  const spots = [[x, y]];
  for (let r = 1; r <= 3 && spots.length < 3; r++) {
    for (let dx = -r; dx <= r && spots.length < 3; dx++) for (let dy = -r; dy <= r && spots.length < 3; dy++) {
      const sx = x + dx, sy = y + dy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !fits(sx, sy)) continue;
      if (spots.some(([px, py]) => Math.abs(px - sx) <= 1 && Math.abs(py - sy) <= 1)) continue; // room to stand between them
      spots.push([sx, sy]);
    }
  }
  if (spots.length < 2) return false;
  centres.push([x, y]);
  count[world][tier] = (count[world][tier] ?? 0) + 1;
  spots.forEach(([sx, sy], i) => {
    taken.add(`${sx},${sy}`);
    veins.push({ name: ORES[world === 'old' ? Math.min(tier, 3) : tier][i], x: sx, y: sy, tier });
  });
  return true;
}

// First, a few easy clusters near each home city (the four after the two
// landings), whatever the random order would give them.
const NEAR_HOME = 300, PER_HOME = 3;
for (const [hx, hy] of ARRIVALS.slice(2)) {
  const near = candidates.filter(([x, y]) => Math.hypot(x - hx, y - hy) < NEAR_HOME).sort((a, b) => Math.hypot(a[0] - hx, a[1] - hy) - Math.hypot(b[0] - hx, b[1] - hy));
  let got = 0;
  for (const [x, y] of near) {
    if (got >= PER_HOME) break;
    if (fits(x, y) && cluster(x, y, 1, oldWorld(x, y) ? 'old' : 'new')) got++;
  }
}

for (const [x, y] of candidates) {
  const world = oldWorld(x, y) ? 'old' : 'new';
  const tier = tierAt(x, y);
  if ((count[world][tier] ?? 0) >= (WANT[world][tier] ?? 0)) continue;
  if (!fits(x, y)) continue;
  cluster(x, y, tier, world);
}

console.error('clusters', JSON.stringify(count), 'veins', veins.length, Object.entries(veins.reduce((m, v) => ((m[v.name] = (m[v.name] ?? 0) + 1), m), {})).map((e) => e.join(' ')).join(', '));
console.log(JSON.stringify(veins.map(({ name, x, y }) => ({ name, x, y }))));
