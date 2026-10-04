// Grows the world map: the existing map stays exactly as it is (same
// coordinates, nothing changed) in the top-left corner, and the new space
// to the east and south is filled with natural land: continents separated
// from the old world by a sea channel, a climate by latitude (snow in the
// north, deserts in the warm south), mountains of the blocking rock tiles,
// rivers running downhill to the sea, beaches, and every coast finished in
// the matching shore tiles.
//
//   node tools/world/generate.mjs <old shortmap> <new shortmap> [size] [seed]
//
// size defaults to 2000, seed to 1. Writes <new shortmap>.png too: a
// preview, a pixel a square. The shortmap format: two big-endian ints
// (columns, rows), then a big-endian short per square, column by column.

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const [, , inPath, outPath, sizeArg = '2000', seedArg = '1'] = process.argv;
const SIZE = Number(sizeArg);
const SEED = Number(seedArg);
const TILES = JSON.parse(readFileSync(new URL('./tiles.json', import.meta.url), 'utf8'));

// ---- the tiles used ----
const T = {
  ocean: 0,
  grass: 36, meadow: 1, sand: 38, snow: 109,
  oak: 64, oak2: 103, palm: 102, palmSand: 124, autumn: 25, autumn2: 26,
  rocksGrass: 37, rocksSand: 39, rockyGround: 104,
  // Mountain tiles that repeat cleanly: stone and rock block the way,
  // the rocky ground and stones-on-grass/sand/snow are walkable slopes.
  stone: 59, stone2: 98, rock: 49, rocky2: 95, rocksSnow: 122, boulder: 58,
};
// Shore pieces: water with land along these sides ('N', 'E', 'S', 'W',
// or two of them) or only in a corner ('NE'...), from tools/world/tiles.json's
// measured patterns. One set per kind of land.
const SHORES = {
  grass: { W: 66, E: 67, N: 68, S: 69, WS: 70, NW: 71, ES: 72, NE: 73, cSE: 74, cNE: 75, cNW: 76, cSW: 77 },
  sand: { W: 78, E: 79, N: 80, S: 81, WS: 82, NW: 83, ES: 84, NE: 85, cSE: 86, cNE: 87, cNW: 88, cSW: 89 },
  snow: { cNW: 110, cNE: 111, cSE: 112, cSW: 113, N: 114, E: 115, S: 116, W: 117, NW: 118, NE: 119, ES: 120, WS: 121 },
};
const SHORE_TILES = new Set(Object.values(SHORES).flatMap((s) => Object.values(s)));

// ---- noise ----
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, octaves = 5) {
  let sum = 0, amp = 1, f = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * f, y * f, s + o * 101) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}
const rand = (x, y, k) => hash(x, y, SEED * 7919 + k);

// ---- the old map ----
const old = readFileSync(inPath);
const OLD_C = old.readInt32BE(0), OLD_R = old.readInt32BE(4);
const map = new Uint16Array(SIZE * SIZE).fill(T.ocean); // map[x * SIZE + y], as the file
const isOld = (x, y) => x < OLD_C && y < OLD_R;
for (let x = 0; x < OLD_C; x++) for (let y = 0; y < OLD_R; y++) map[x * SIZE + y] = old.readUInt16BE(8 + (x * OLD_R + y) * 2);
const at = (x, y) => map[x * SIZE + y];
const set = (x, y, t) => { if (!isOld(x, y)) map[x * SIZE + y] = t; };

// ---- elevation, moisture, temperature (new squares only) ----
const MARGIN = 70; // sea between the old world and new land
const EDGE = 50; // sea at the world's edge
const elev = new Float32Array(SIZE * SIZE);
const moist = new Float32Array(SIZE * SIZE);
const temp = new Float32Array(SIZE * SIZE);
for (let x = 0; x < SIZE; x++) {
  for (let y = 0; y < SIZE; y++) {
    if (isOld(x, y)) continue;
    let e = fbm(x / 520, y / 520, SEED, 4) * 0.65 + fbm(x / 130, y / 130, SEED + 50, 4) * 0.27 + fbm(x / 30, y / 30, SEED + 90, 3) * 0.08;
    // Ridges: mountain ranges along the noise's middle line.
    const r = 1 - Math.abs(fbm(x / 260, y / 260, SEED + 200, 4) * 2 - 1);
    e += Math.max(0, r - 0.75) * 0.9;
    // Sea near the old world and the edge of the world.
    const dOld = Math.max(x < OLD_C ? 0 : x - (OLD_C - 1), y < OLD_R ? 0 : y - (OLD_R - 1));
    if (dOld < MARGIN * 2) e -= Math.max(0, (MARGIN * 2 - dOld) / (MARGIN * 2)) ** 1.5 * 0.45;
    const dEdge = Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y);
    if (dEdge < EDGE * 2) e -= ((EDGE * 2 - dEdge) / (EDGE * 2)) ** 2 * 0.5;
    elev[x * SIZE + y] = e;
    moist[x * SIZE + y] = fbm(x / 300, y / 300, SEED + 400, 4);
    // North is cold, south warm, with some wobble.
    temp[x * SIZE + y] = y / SIZE + (fbm(x / 400, y / 400, SEED + 600, 3) - 0.5) * 0.35;
  }
}
const SEA = 0.5; // land above this
const MOUNT = 0.66, PEAK = 0.72;

// ---- land and sea ----
const land = new Uint8Array(SIZE * SIZE);
for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) if (!isOld(x, y)) land[x * SIZE + y] = elev[x * SIZE + y] > SEA ? 1 : 0;

// Rivers: from high ground, downhill to the sea, two squares wide.
const river = new Uint8Array(SIZE * SIZE);
let rivers = 0;
for (let i = 0; i < 4000 && rivers < 40; i++) {
  let x = Math.floor(rand(i, 1, 11) * SIZE), y = Math.floor(rand(i, 2, 11) * SIZE);
  if (isOld(x, y) || elev[x * SIZE + y] < MOUNT - 0.02 || elev[x * SIZE + y] > PEAK) continue;
  const path = [];
  const seen = new Set();
  for (let step = 0; step < 900; step++) {
    path.push([x, y]);
    seen.add(x * SIZE + y);
    if (!land[x * SIZE + y]) break;
    // The lowest neighbour (a little noise so it meanders), never back.
    let best = null, bestE = Infinity;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= SIZE - 1 || ny >= SIZE - 1 || isOld(nx, ny) || seen.has(nx * SIZE + ny)) continue;
      const ne = elev[nx * SIZE + ny] + rand(nx, ny, 13) * 0.012;
      if (ne < bestE) { bestE = ne; best = [nx, ny]; }
    }
    if (!best) break;
    [x, y] = best;
  }
  const end = path[path.length - 1];
  if (path.length < 40 || land[end[0] * SIZE + end[1]]) continue; // only rivers that reach the sea
  for (const [px, py] of path) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const nx = px + dx, ny = py + dy;
    if (!isOld(nx, ny)) river[nx * SIZE + ny] = 1;
  }
  rivers++;
}
for (let k = 0; k < SIZE * SIZE; k++) if (river[k]) land[k] = 0;

// Water too narrow for a shore piece (land on opposite sides, or in two
// opposite corners only) becomes land; repeated until none is left.
const isLand = (x, y) => (x < 0 || y < 0 || x >= SIZE || y >= SIZE ? false : isOld(x, y) ? at(x, y) !== T.ocean && !SHORE_TILES.has(at(x, y)) && at(x, y) !== 65 : land[x * SIZE + y] === 1);
for (let pass = 0; pass < 6; pass++) {
  let changed = 0;
  for (let x = 1; x < SIZE - 1; x++) {
    for (let y = 1; y < SIZE - 1; y++) {
      if (isOld(x, y) || land[x * SIZE + y]) continue;
      const n = isLand(x, y - 1), s = isLand(x, y + 1), w = isLand(x - 1, y), e = isLand(x + 1, y);
      const ne = isLand(x + 1, y - 1), nw = isLand(x - 1, y - 1), se = isLand(x + 1, y + 1), sw = isLand(x - 1, y + 1);
      const edges = n + s + w + e;
      const bad = (n && s) || (w && e) || edges >= 3 || (edges === 0 && ((ne && sw) || (nw && se))) ||
        (edges === 1 && ((n && (sw || se)) || (s && (nw || ne)) || (w && (ne || se)) || (e && (nw || sw)))) ||
        (edges === 2 && ((n && w && se) || (n && e && sw) || (s && w && ne) || (s && e && nw)));
      if (bad) { land[x * SIZE + y] = 1; changed++; }
    }
  }
  if (!changed) break;
}

// ---- what grows where ----
function biome(x, y) {
  const k = x * SIZE + y, e = elev[k], m = moist[k], t = temp[k];
  const nearSea = e < SEA + 0.018;
  const cold = t < 0.07, chilly = t < 0.2, hot = t > 0.68;
  // Mountains as solid masses: a rock core, a fringe of boulders, then
  // walkable rocky foothills with clusters of stones (grouped by noise,
  // not scattered square by square).
  const lumpy = fbm(x / 9, y / 9, SEED + 1000, 2);
  const desert = hot && m < 0.42;
  if (e > PEAK + 0.035) return cold ? T.stone2 : desert ? T.rock : T.stone;
  if (e > PEAK) return cold ? T.stone : desert ? (lumpy > 0.5 ? T.rock : T.rocky2) : T.stone2;
  if (e > MOUNT) {
    if (cold) return lumpy > 0.45 ? T.rocksSnow : T.snow;
    if (desert) return e > MOUNT + 0.02 ? T.rocky2 : T.rocksSand;
    return e > MOUNT + 0.02 ? (lumpy > 0.6 ? T.rocky2 : T.rockyGround) : T.rocksGrass;
  }
  // Snowfields with the odd boulder and hardy tree.
  if (cold) return rand(x, y, 14) < 0.01 ? T.boulder : T.snow;
  if (nearSea) return hot || m < 0.55 ? T.sand : rand(x, y, 6) < 0.5 ? T.sand : T.grass;
  if (hot && m < 0.42) return rand(x, y, 7) < 0.03 ? T.rocksSand : T.sand; // desert
  // Woods: dense in patches (so there are clearings and paths).
  const wood = fbm(x / 22, y / 22, SEED + 800, 3);
  const forest = m > 0.52 && wood > 0.5;
  if (forest && rand(x, y, 8) < 0.62) {
    if (hot) return T.palm;
    if (chilly) return rand(x, y, 9) < 0.5 ? T.autumn : T.autumn2;
    return rand(x, y, 9) < 0.5 ? T.oak : T.oak2;
  }
  if (rand(x, y, 10) < (forest ? 0.05 : 0.012)) return hot ? T.palm : chilly ? T.autumn : T.oak;
  // Grass and meadow in broad patches, not speckled.
  const patch = fbm(x / 45, y / 45, SEED + 900, 3) + (chilly ? 0.12 : 0) - (m - 0.45) * 0.6;
  return patch > 0.56 ? T.meadow : T.grass;
}
for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) if (!isOld(x, y) && land[x * SIZE + y]) set(x, y, biome(x, y));

// ---- shores ----
const landKind = (t) => (t === T.snow ? 'snow' : t === T.sand || t === T.rocksSand || t === T.palmSand ? 'sand' : 'grass');
for (let x = 1; x < SIZE - 1; x++) {
  for (let y = 1; y < SIZE - 1; y++) {
    if (isOld(x, y) || land[x * SIZE + y]) continue;
    const L = (dx, dy) => isLand(x + dx, y + dy);
    const n = L(0, -1), s = L(0, 1), w = L(-1, 0), e = L(1, 0);
    let key = null;
    if (n && w) key = 'NW'; else if (n && e) key = 'NE'; else if (s && w) key = 'WS'; else if (s && e) key = 'ES';
    else if (n) key = 'N'; else if (s) key = 'S'; else if (w) key = 'W'; else if (e) key = 'E';
    else if (L(1, -1)) key = 'cNE'; else if (L(-1, -1)) key = 'cNW'; else if (L(1, 1)) key = 'cSE'; else if (L(-1, 1)) key = 'cSW';
    if (!key) continue;
    // The shore's kind from the land beside it (most of it).
    const kinds = { grass: 0, sand: 0, snow: 0 };
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]]) if (L(dx, dy)) kinds[landKind(at(x + dx, y + dy))]++;
    const kind = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0][0];
    set(x, y, SHORES[kind][key]);
  }
}

// ---- write ----
const out = Buffer.alloc(8 + SIZE * SIZE * 2);
out.writeInt32BE(SIZE, 0);
out.writeInt32BE(SIZE, 4);
for (let i = 0; i < SIZE * SIZE; i++) out.writeUInt16BE(map[i], 8 + i * 2);
writeFileSync(outPath, out);

// A preview: each square its tile's average colour.
const rgb = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
  const c = TILES.colours[at(x, y)] ?? [255, 0, 255];
  rgb.set(c, (y * SIZE + x) * 3);
}
writeFileSync(outPath + '.png', png(SIZE, SIZE, rgb));
const count = (pred) => { let n = 0; for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) if (!isOld(x, y) && pred(x, y)) n++; return n; };
const newSquares = SIZE * SIZE - OLD_C * OLD_R;
console.log(`map ${SIZE}x${SIZE}; old ${OLD_C}x${OLD_R} kept; new land ${(100 * count((x, y) => land[x * SIZE + y]) / newSquares).toFixed(1)}% of the new space; rivers ${rivers}`);

function png(w, h, rgbData) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgbData.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function crc32(buf) {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
