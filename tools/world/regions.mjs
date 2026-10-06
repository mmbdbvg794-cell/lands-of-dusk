// Weather regions: which continent (or the open sea) each part of the map
// belongs to, for js/atmosphere.js's weather per region.
//
//   node tools/world/regions.mjs <shortmap> [out json]
//
// The map is looked at in CELL x CELL squares: a cell with any land in it
// is land. Connected land is one landmass; the big ones are named by a
// place on them (SEEDS), and every other bit of land (small islands, the
// Underdark's box) takes the nearest named one's region. Sea within COAST
// cells of land shares that land's weather (so the weather doesn't turn
// at the beach); the rest is the open sea.
//
// Writes js/regions.json: { cell, w, h, names, runs } where runs is the
// grid (index cy * w + cx) run-length coded as [region, count, ...].
// Run it again after big changes to the land (new continents, not towns).

import { readFileSync, writeFileSync } from 'node:fs';

const [, , mapPath, outPath = new URL('../../js/regions.json', import.meta.url).pathname] = process.argv;
if (!mapPath) {
  console.error('usage: node tools/world/regions.mjs <shortmap> [out json]');
  process.exit(1);
}

const CELL = 4;
const COAST = 8; // cells (32 squares)
// Water: ocean, the lake tile, and the grass/sand/snow shore pieces
// (tools/world/generate.mjs SHORES).
const WATER = new Set([0, 65, ...Array.from({ length: 24 }, (_, i) => 66 + i), ...Array.from({ length: 12 }, (_, i) => 110 + i)]);
// Region names, in order (the index is what the grid holds); 'sea' first.
const NAMES = ['sea', 'old', 'north', 'south', 'east', 'mid'];
// A square on each named landmass.
const SEEDS = [
  ['old', 500, 200], // the old world, Westsea Harbour
  ['old', 70, 850], // the old world's western isle
  ['north', 1414, 400], // Kingshaven
  ['south', 466, 1206], // Aelindor
  ['east', 1691, 1303], // Eastreach
  ['east', 1900, 1310], // the isle off Eastreach
  ['mid', 1800, 950], // the land between Kingshaven's and Eastreach's
];

const map = readFileSync(mapPath);
const C = map.readInt32BE(0), R = map.readInt32BE(4);
const W = Math.ceil(C / CELL), H = Math.ceil(R / CELL);
const land = new Uint8Array(W * H);
for (let x = 0; x < C; x++) for (let y = 0; y < R; y++) {
  if (!WATER.has(map.readUInt16BE(8 + (x * R + y) * 2))) land[Math.floor(y / CELL) * W + Math.floor(x / CELL)] = 1;
}
const near4 = (k) => {
  const x = k % W, y = (k - x) / W, out = [];
  if (x > 0) out.push(k - 1);
  if (x < W - 1) out.push(k + 1);
  if (y > 0) out.push(k - W);
  if (y < H - 1) out.push(k + W);
  return out;
};

// Name each seeded landmass (the land cell nearest the seed, then all
// land connected to it).
const region = new Int8Array(W * H).fill(-1);
for (const [name, sx, sy] of SEEDS) {
  const id = NAMES.indexOf(name);
  let start = -1, best = Infinity;
  const cx = Math.floor(sx / CELL), cy = Math.floor(sy / CELL);
  for (let k = 0; k < W * H; k++) {
    if (!land[k]) continue;
    const d = (k % W - cx) ** 2 + (Math.floor(k / W) - cy) ** 2;
    if (d < best) { best = d; start = k; }
  }
  if (region[start] >= 0) continue;
  region[start] = id;
  const q = [start];
  while (q.length) for (const j of near4(q.pop())) if (land[j] && region[j] < 0) { region[j] = id; q.push(j); }
}

// Everything else from the nearest named land: unnamed land always, sea
// only within COAST cells of land. One breadth-first spread from all named
// land works out the nearest (owner) for every cell.
const owner = Int8Array.from(region);
const dist = new Int32Array(W * H).fill(-1);
let front = [];
for (let k = 0; k < W * H; k++) if (region[k] >= 0) { dist[k] = 0; front.push(k); }
for (let d = 1; front.length; d++) {
  const next = [];
  for (const k of front) for (const j of near4(k)) {
    if (dist[j] >= 0) continue;
    dist[j] = d;
    owner[j] = owner[k];
    next.push(j);
  }
  front = next;
}
// How far each cell is from any land at all (named or not).
const shore = new Int32Array(W * H).fill(-1);
front = [];
for (let k = 0; k < W * H; k++) if (land[k]) { shore[k] = 0; front.push(k); }
for (let d = 1; front.length; d++) {
  const next = [];
  for (const k of front) for (const j of near4(k)) if (shore[j] < 0) { shore[j] = d; next.push(j); }
  front = next;
}
for (let k = 0; k < W * H; k++) region[k] = land[k] || shore[k] <= COAST ? owner[k] : 0;

const runs = [];
for (let k = 0; k < W * H; k++) {
  if (runs.length && runs[runs.length - 2] === region[k]) runs[runs.length - 1]++;
  else runs.push(region[k], 1);
}
writeFileSync(outPath, JSON.stringify({ cell: CELL, w: W, h: H, names: NAMES, runs }) + '\n');
const count = NAMES.map((n, i) => `${n} ${region.filter((r) => r === i).length}`).join(', ');
console.log(`${outPath}: ${W}x${H} cells of ${CELL}, ${runs.length / 2} runs (${count})`);
