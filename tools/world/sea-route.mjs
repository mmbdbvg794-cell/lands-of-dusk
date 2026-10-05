// A ferry's route between two docks, through open water (keeping 3
// squares from any shore, 2 near the docks), as single N/S/E/W steps:
//
//   node --max-old-space-size=4096 tools/world/sea-route.mjs <shortmap> <x,y> <x,y> <out.txt>
//
// writes "x y" a line, dock to dock (server/Ferry.java sails it both ways).
// Diagonals become staircases; the server smooths the ship's heading.
import { readFileSync, writeFileSync } from 'node:fs';
const [, , MAP, FROM, TO, OUT] = process.argv;
if (!OUT) { console.error('usage: node tools/world/sea-route.mjs <shortmap> <x,y> <x,y> <out.txt>'); process.exit(2); }
const b = readFileSync(MAP), C = b.readInt32BE(0), R = b.readInt32BE(4);
const t = (x, y) => (x < 0 || y < 0 || x >= C || y >= R ? -1 : b.readUInt16BE(8 + (x * R + y) * 2));
const SHIP = new Set([131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148]);
const water = (x, y) => { const v = t(x, y); return v === 0 || v === 65 || SHIP.has(v); };
// Clearance: how far (Chebyshev) to the nearest non-water, capped.
const CAP = 4;
const clear = new Uint8Array(C * R);
// Distance transform by BFS from land.
const q = [];
for (let x = 0; x < C; x++) for (let y = 0; y < R; y++) { if (!water(x, y)) { clear[x * R + y] = 0; q.push(x * R + y); } else clear[x * R + y] = 255; }
for (let h = 0; h < q.length; h++) { const i = q[h], x = Math.floor(i / R), y = i % R, d = clear[i]; if (d >= CAP) continue;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue; const j = nx * R + ny; if (clear[j] > d + 1) { clear[j] = d + 1; q.push(j); } } }
// A* on 8 directions, needing clearance 3 (2 near the docks).
function route([sx, sy], [gx, gy]) {
  const need = (x, y) => Math.min(Math.hypot(x - sx, y - sy), Math.hypot(x - gx, y - gy)) < 10 ? 2 : 3;
  const N = C * R;
  const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  // A binary heap in typed arrays (keys, and the squares they're for).
  let cap = 1 << 20, keys = new Float64Array(cap), vals = new Int32Array(cap), size = 0;
  const push = (k, v) => {
    if (size === cap) { cap *= 2; const nk = new Float64Array(cap); nk.set(keys); keys = nk; const nv = new Int32Array(cap); nv.set(vals); vals = nv; }
    let i = size++;
    while (i > 0) { const p = (i - 1) >> 1; if (keys[p] <= k) break; keys[i] = keys[p]; vals[i] = vals[p]; i = p; }
    keys[i] = k; vals[i] = v;
  };
  const pop = () => {
    const top = vals[0], k = keys[--size], v = vals[size];
    let i = 0;
    for (;;) { let m = 2 * i + 1; if (m >= size) break; if (m + 1 < size && keys[m + 1] < keys[m]) m++; if (keys[m] >= k) break; keys[i] = keys[m]; vals[i] = vals[m]; i = m; }
    keys[i] = k; vals[i] = v;
    return top;
  };
  g[sx * R + sy] = 0; push(h(sx, sy), sx * R + sy);
  while (size) {
    const i = pop(); if (done[i]) continue; done[i] = 1;
    const x = Math.floor(i / R), y = i % R;
    if (x === gx && y === gy) break;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
      const j = nx * R + ny; if (done[j] || clear[j] < need(nx, ny)) continue;
      const cost = g[i] + (dx && dy ? 1.414 : 1);
      if (cost < g[j]) { g[j] = cost; from[j] = i; push(cost + h(nx, ny), j); }
    }
  }
  if (from[gx * R + gy] < 0) return null;
  const pts = []; for (let i = gx * R + gy; i >= 0; i = from[i]) pts.push([Math.floor(i / R), i % R]);
  pts.reverse();
  // Into single N/S/E/W steps (a diagonal is two steps).
  const steps = [pts[0]];
  for (let k = 1; k < pts.length; k++) { const [px, py] = steps.at(-1), [x, y] = pts[k]; if (x !== px && y !== py) steps.push([x, py]); steps.push([x, y]); }
  return { pts, steps };
}
const r = route(FROM.split(',').map(Number), TO.split(',').map(Number));
if (!r) { console.error('no route with enough open water'); process.exit(1); }
writeFileSync(OUT, r.steps.map(([x, y]) => `${x} ${y}`).join('\n') + '\n');
console.log(`${r.steps.length} steps: ${(r.steps.length / 4 / 60).toFixed(1)} minutes at 4 squares a second`);
