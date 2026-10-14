// The Circle's wood: the grass basin at 703,1216 (between the two
// mountains east of Aelindor and the lakes), made into deep forest for The
// Circle. Only grass and meadow become trees, about nine in ten; paths,
// sand, water, rock and the veins stay. In the middle a clearing is left
// for The Circle's grove (nothing built in it yet), reached by one narrow
// winding trail from the east, so the wood is thick but not sealed. Every
// monster's square, the squares round the veins, and a ring round the
// clearing stay open.
//
//   wood      an oval about 76 x 60 round 705,1218
//   clearing  a circle of radius 5 at 705,1218
//   trail     from the clearing east, winding, to the grass at ~744,1226
//
// It reads the map it is built against (city.mjs's <shortmap> argument)
// and the mobs and props files beside it, to keep to grass and keep
// monsters and veins free. Built by tools/world/city.mjs.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const O = [667, 1188], W = 77, H = 61;
const CX = 705, CY = 1218;
const GRASS = new Set([36, 1, 37]);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296);
}

function triples(path, step, off) {
  if (!existsSync(path)) return [];
  const l = readFileSync(path, 'latin1').replace(/\r/g, '').split('\n');
  const out = [];
  for (let i = 0; i + step <= l.length; i += step) {
    const x = Number(l[i + off]), y = Number(l[i + off + 1]);
    if (Number.isInteger(x) && Number.isInteger(y)) out.push([x, y]);
  }
  return out;
}

export default {
  name: "The Circle's wood",
  origin: O,
  size: [W, H],
  seed: 41,
  build(p) {
    const mapPath = process.argv[3];
    const map = readFileSync(mapPath);
    const R = map.readInt32BE(4);
    const tile = (x, y) => map.readUInt16BE(8 + (x * R + y) * 2);
    const dir = dirname(mapPath);
    const keep = new Set();
    const free = (x, y, r = 0) => { for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) keep.add(`${x + i},${y + j}`); };
    for (const [x, y] of triples(join(dir, 'mobs'), 4, 2)) free(x, y);
    for (const [x, y] of triples(join(dir, 'props'), 3, 1)) free(x, y, 2);

    // The trail: east from the clearing, wandering a little, to ~744,1226.
    const trail = new Set();
    let tx = CX + 5, ty = CY;
    const r = rng(7);
    while (tx < 745) {
      trail.add(`${tx},${ty}`);
      if (r() < 0.25 && ty < 1230) { ty += 1; trail.add(`${tx},${ty}`); }
      else if (r() < 0.12 && ty > 1210) { ty -= 1; trail.add(`${tx},${ty}`); }
      tx += 1;
    }
    for (const k of trail) keep.add(k);

    const pick = rng(11);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = O[0] + i, y = O[1] + j;
      const d = Math.hypot((x - CX) / (W / 2), (y - CY) / (H / 2));
      if (d > 1) continue;
      const c = Math.hypot(x - CX, y - CY);
      if (c <= 5) { if (GRASS.has(tile(x, y)) || tile(x, y) === 64 || tile(x, y) === 103) p.set(i, j, ','); continue; } // the clearing
      if (c <= 6.5) continue; // a ring left as it is round the clearing
      if (keep.has(`${x},${y}`) || !GRASS.has(tile(x, y))) continue;
      // Thick in the middle, thinning a little toward the edge.
      if (pick() < (d < 0.8 ? 0.92 : 0.75)) p.set(i, j, 'T');
    }
  },
};
