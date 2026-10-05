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
  const g = new Float32Array(C * R).fill(Infinity), from = new Int32Array(C * R).fill(-1);
  const open = [[0, sx * R + sy]]; g[sx * R + sy] = 0;
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  // A binary heap.
  const push = (e) => { open.push(e); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p][0] <= open[i][0]) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r < open.length && open[r][0] < open[m][0]) m = r; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
  open.length = 0; push([h(sx, sy), sx * R + sy]);
  let n = 0;
  while (open.length) {
    const [, i] = pop(); const x = Math.floor(i / R), y = i % R; n++;
    if (x === gx && y === gy) break;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
      const j = nx * R + ny; if (clear[j] < need(nx, ny)) continue;
      const cost = g[i] + (dx && dy ? 1.414 : 1);
      if (cost < g[j]) { g[j] = cost; from[j] = i; push([cost + h(nx, ny), j]); }
    }
  }
  const pts = []; for (let i = gx * R + gy; i >= 0; i = from[i]) pts.push([Math.floor(i / R), i % R]);
  pts.reverse();
  if (pts[0][0] !== sx || pts[0][1] !== sy) return null;
  // Into single N/S/E/W steps (a diagonal is two steps).
  const steps = [pts[0]];
  for (let k = 1; k < pts.length; k++) { const [px, py] = steps.at(-1), [x, y] = pts[k]; if (x !== px && y !== py) steps.push([x, py]); steps.push([x, y]); }
  return { pts, steps };
}
const r = route(FROM.split(',').map(Number), TO.split(',').map(Number));
if (!r) { console.error('no route with enough open water'); process.exit(1); }
writeFileSync(OUT, r.steps.map(([x, y]) => `${x} ${y}`).join('\n') + '\n');
console.log(`${r.steps.length} steps: ${(r.steps.length / 4 / 60).toFixed(1)} minutes at 4 squares a second`);
