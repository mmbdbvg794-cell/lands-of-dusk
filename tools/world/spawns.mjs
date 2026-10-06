// Spawn areas for the new lands: dens of a few creatures each, fitted to
// the ground they're on (woods, plains, desert, beach, snow, rocky hills)
// and harder the further they are from where the ferries land.
//
//   node tools/world/spawns.mjs <shortmap> <defMobs names file> <out dir>
//
// Writes <out dir>/bundle.json for tools/world/install_city.py (monsters
// only: no squares change) and prints what it placed. The same map always
// gives the same dens.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [, , mapPath, namesPath, outDir] = process.argv;
if (!outDir) {
  console.error('usage: node tools/world/spawns.mjs <shortmap> <defMobs names file> <out dir>');
  process.exit(2);
}

const map = readFileSync(mapPath);
const COLS = map.readInt32BE(0), ROWS = map.readInt32BE(4);
const tile = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS ? 0 : map.readUInt16BE(8 + (x * ROWS + y) * 2));
const known = new Set(readFileSync(namesPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));

// Squares a player (and a creature) can stand on (defTileScripts "true").
const WALK = new Set([1, 20, 23, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 106, 109, 122, 126, 127, 128, 129, 137, 138, 139, 140, 141, 142, 149, 150, 158, 159]);
const OAK = new Set([64, 103]), AUTUMN = new Set([25, 26]), PALM = new Set([102, 124]);
const SAND = new Set([38, 39]), SNOW = new Set([109, 122, ...Array.from({ length: 12 }, (_, i) => 110 + i)]);
const ROCKY = new Set([37, 104, 95, 49, 59, 98, 58]);
const WATER = new Set([0, 65, ...Array.from({ length: 24 }, (_, i) => 66 + i)]);

// Where nothing spawns: cities, the grove, ports, stairs and the sealed
// underground block (x0, y0, x1, y1).
const KEEP_OUT = [
  [380, 1150, 540, 1340], // Aelindor, its landing and the Grove of Waking
  [1640, 1250, 1740, 1350], // Eastreach port
  [1240, 830, 1450, 1010], // the underground (Velkarath)
  [1366, 282, 1526, 454], // Kingshaven, and a little room round it
  [376, 1221, 406, 1251], [671, 1469, 701, 1499], [1474, 1392, 1504, 1422], // stairs down
];
const out = (x, y) => KEEP_OUT.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
// Where players arrive in the new lands, for how hard a place is.
const ARRIVALS = [[444, 1184], [1691, 1303]];
const tierAt = (x, y) => {
  const d = Math.min(...ARRIVALS.map(([ax, ay]) => Math.hypot(x - ax, y - ay)));
  return d < 220 ? 1 : d < 450 ? 2 : d < 750 ? 3 : 4;
};

// What lives where, by how far out (tier 1 near the landings, 4 far away).
const LIVES = {
  // Every one has a picture that fits (sprites.png, or a Painted family by
  // name, tools/paintart/bestiary.js): no sapling (a slot machine) or
  // pictureless Forest Ogre, Blizzardo and Ice demon.
  woods: { 1: ['sprite', 'dhouly'], 2: ['Black dog', 'wolf', 'cat'], 3: ['grizzly', 'Hound', 'stalker'], 4: ['Tree Wolf', 'Forest Soldier', 'dark fairy'] },
  autumn: { 1: ['sprite', 'dhouly'], 2: ['wolf', 'Black dog'], 3: ['Hound', 'grizzly'], 4: ['Tree Wolf', 'Forest Soldier'] },
  plains: { 1: ['sprite', 'Lizard', 'dhouly'], 2: ['Black dog', 'wolf', 'green blob'], 3: ['Bug', 'kobold', 'Imp'], 4: ['Gladiator', 'Imp', 'stalfos'] },
  desert: { 1: ['Lizard'], 2: ['Mole', 'green blob'], 3: ['Lizard Axeman', 'lizard axewarrior', 'Bug'], 4: ['Scorpion', 'Stone lizard', 'Wurm'] },
  beach: { 1: ['octopus'], 2: ['slimer', 'blob'], 3: ['squid', 'blob'], 4: ['alligator', 'Water Shade'] },
  snow: { 1: ['icedemon'], 2: ['ice giant'], 3: ['ghost', 'ice giant'], 4: ['Skeleton knight', 'Water Shade', 'stalfos'] },
  rocky: { 1: ['gargoyle'], 2: ['Mole', 'rubble'], 3: ['Stone lizard', 'mega mole'], 4: ['stalfos', 'dragon'] },
};
for (const [biome, tiers] of Object.entries(LIVES)) {
  for (const names of Object.values(tiers)) for (const n of names) if (!known.has(n)) throw new Error(`${biome}: no monster called "${n}" in defMobs`);
}

// The ground round a square, as one word.
function biomeAt(x, y) {
  const c = { oak: 0, autumn: 0, palm: 0, sand: 0, snow: 0, rocky: 0, water: 0, land: 0 };
  for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) {
    const t = tile(x + dx, y + dy);
    if (WATER.has(t)) { c.water++; continue; }
    c.land++;
    if (OAK.has(t)) c.oak++;
    else if (AUTUMN.has(t)) c.autumn++;
    else if (PALM.has(t)) c.palm++;
    else if (SAND.has(t)) c.sand++;
    else if (SNOW.has(t)) c.snow++;
    else if (ROCKY.has(t)) c.rocky++;
  }
  if (c.snow > c.land * 0.4) return 'snow';
  if (c.water > 45 && (c.sand > 10 || c.palm > 5)) return 'beach';
  if (c.sand > c.land * 0.45) return 'desert';
  if (c.rocky > c.land * 0.3) return 'rocky';
  if (c.autumn > 25) return 'autumn';
  if (c.oak > 25 || c.palm > 25) return 'woods';
  return 'plains';
}

// A seeded random number, so the same map gives the same dens.
let seed = 20261005;
const rand = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296);

// Den sites: one try per 70-square cell of the new lands.
const CELL = 70, RADIUS = 4;
const dens = [];
const taken = new Set();
for (let cx = 0; cx < COLS; cx += CELL) for (let cy = 0; cy < ROWS; cy += CELL) {
  if (cx + CELL <= 1000 && cy + CELL <= 1000) continue; // the old world
  if (rand() < 0.6) continue; // not every cell: room between dens
  // A spot in the cell with enough open ground round it.
  for (let tries = 0; tries < 12; tries++) {
    const x = cx + Math.floor(rand() * CELL), y = cy + Math.floor(rand() * CELL);
    if ((x < 1000 && y < 1000) || out(x, y) || !WALK.has(tile(x, y))) continue;
    const spots = [];
    for (let dx = -RADIUS; dx <= RADIUS; dx++) for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      const sx = x + dx, sy = y + dy;
      if (WALK.has(tile(sx, sy)) && !out(sx, sy) && !(sx < 1000 && sy < 1000) && !taken.has(`${sx},${sy}`)) spots.push([sx, sy]);
    }
    if (spots.length < 25) continue;
    const biome = biomeAt(x, y), tier = tierAt(x, y);
    const names = LIVES[biome][tier];
    const size = tier === 4 ? 2 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 3);
    const mobs = [];
    for (let i = 0; i < size && spots.length; i++) {
      const [sx, sy] = spots.splice(Math.floor(rand() * spots.length), 1)[0];
      taken.add(`${sx},${sy}`);
      mobs.push({ name: names[Math.floor(rand() * names.length)], level: 1, x: sx, y: sy });
    }
    dens.push({ x, y, biome, tier, mobs });
    break;
  }
}

const mobs = dens.flatMap((d) => d.mobs);
const bundle = {
  name: 'Spawn areas',
  oldWorld: false,
  area: { x: 0, y: 0, w: COLS, h: ROWS },
  tiles: [], props: [], merchants: [], signs: [], mobs,
  // Imp's own file wears a demonSkin condition the game never had (its
  // loading stopped with an error there): an empty one.
  files: {}, copies: [], sets: [], journal: [], conditions: ['demonSkin'],
};
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/bundle.json`, JSON.stringify(bundle, null, 1));
writeFileSync(`${outDir}/dens.json`, JSON.stringify(dens.map(({ x, y, biome, tier, mobs: m }) => ({ x, y, biome, tier, n: m.length }))));

// What was placed.
const count = {};
for (const d of dens) {
  const k = `${d.biome} tier ${d.tier}`;
  count[k] = (count[k] ?? 0) + d.mobs.length;
}
console.log(`${dens.length} dens, ${mobs.length} monsters`);
for (const [k, n] of Object.entries(count).sort()) console.log(`  ${k}: ${n}`);
