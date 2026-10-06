// Night lights for a town: torches on its walls, lamp posts (or braziers)
// in its open streets and squares, and campfires where asked. A plan for
// tools/world/city.mjs is made from what's on the map, so each town's
// plan (tools/world/cities/lights-*.mjs) is a box and a few choices:
//
//   lightsPlan({ name, box: [x0, y0, x1, y1], lamp: 'lamp post', ... })
//
// The map is the one city.mjs is given (its second argument), with the
// props, signs and mobs files beside it, so nothing is lit twice and
// nothing lands on a sign or a shopkeeper.
//
//   Torches   a wall square whose face looks onto a walkable square below
//             it (a street, a room), with wall to its left and right, and
//             no torch within TORCH_GAP squares. The torch tile for each
//             wall: 24 is the old one on the dark wall (11); 160-167 are on
//             the others (tools/server/torchwalls.py).
//   Lamps     a paved open square (no wall within two squares), no door within
//             two squares, nothing standing there, LAMP_GAP from any other
//             lamp or torch. Props don't block walking.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const TORCH_ON = { 11: 24, 59: 160, 58: 161, 98: 162, 97: 163, 60: 164, 62: 165, 101: 166, 49: 167 };
const TORCHES = new Set([24, 160, 161, 162, 163, 164, 165, 166, 167]);
const WALK = new Set([1, 20, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 105, 109, 122, 126, 127, 128, 129, 137, 138, 139, 140, 141, 142, 149, 150]);
const DOORS = new Set([23, 158, 159]);
// Where a lamp may stand: streets and squares (path pieces 28-34, plazas,
// mosaic) and Velkarath's dark stone (20): not grass, fields, or the
// marble, plank and tiled floors indoors. And two clear squares all round
// (no wall), which keeps them out of rooms with a paved floor.
const PAVED = new Set([20, 28, 29, 30, 31, 32, 33, 34, 105, 127]);
const TORCH_GAP = 5, LAMP_GAP = 8;

function readMap(path) {
  const map = readFileSync(path);
  const C = map.readInt32BE(0), R = map.readInt32BE(4);
  return { C, R, at: (x, y) => (x < 0 || y < 0 || x >= C || y >= R ? 0 : map.readUInt16BE(8 + (x * R + y) * 2)) };
}

// Where things already stand: props, signs and mobs ("name, x, y" or
// "name, level, x, y" records).
function taken(dir) {
  const out = new Set();
  for (const [file, n] of [['props', 3], ['signs', 3], ['mobs', 4], ['merchants', 0]]) {
    const p = join(dir, file);
    if (!existsSync(p)) continue;
    const L = readFileSync(p, 'latin1').split('\n');
    if (file === 'merchants') {
      for (let i = 0; i < L.length - 2; i++) if (L[i].trim() === 'Merchant') out.add(`${+L[i + 1]},${+L[i + 2]}`);
      continue;
    }
    for (let i = 0; i + n <= L.length; i += n) {
      const x = +L[i + n - 2], y = +L[i + n - 1];
      if (Number.isInteger(x) && Number.isInteger(y)) out.add(`${x},${y}`);
    }
  }
  return out;
}

// What to light in a box of the map: { torches: [[x, y, tile]], lamps: [[x, y]] }.
export function findLights(mapPath, { box: [x0, y0, x1, y1], walls = Object.keys(TORCH_ON).map(Number), lamps = true, maxLamps = 40, skip = [] }) {
  const { at } = readMap(mapPath);
  const busy = taken(dirname(mapPath));
  const out = (x, y) => skip.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
  const lit = []; // every light so far, existing torches included
  for (let x = x0 - TORCH_GAP; x <= x1 + TORCH_GAP; x++) for (let y = y0 - TORCH_GAP; y <= y1 + TORCH_GAP; y++) if (TORCHES.has(at(x, y))) lit.push([x, y]);
  const near = (x, y, gap) => lit.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - y)) < gap);
  const torches = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = at(x, y);
    if (!walls.includes(t) || out(x, y)) continue;
    if (!WALK.has(at(x, y + 1)) || busy.has(`${x},${y + 1}`)) continue; // its face looks onto open ground
    if (at(x - 1, y) !== t || at(x + 1, y) !== t) continue; // the middle of a wall, not its end
    if (near(x, y, TORCH_GAP)) continue;
    torches.push([x, y, TORCH_ON[t]]);
    lit.push([x, y]);
  }
  const lampsAt = [];
  if (lamps) {
    for (let y = y0; y <= y1 && lampsAt.length < maxLamps; y++) for (let x = x0; x <= x1 && lampsAt.length < maxLamps; x++) {
      if (!PAVED.has(at(x, y)) || busy.has(`${x},${y}`) || out(x, y)) continue;
      let open = true;
      for (let dx = -2; dx <= 2 && open; dx++) for (let dy = -2; dy <= 2 && open; dy++) if (!WALK.has(at(x + dx, y + dy)) && !DOORS.has(at(x + dx, y + dy))) open = false;
      for (let dx = -2; dx <= 2 && open; dx++) for (let dy = -2; dy <= 2 && open; dy++) if (DOORS.has(at(x + dx, y + dy)) || busy.has(`${x + dx},${y + dy}`)) open = false;
      if (!open || near(x, y, LAMP_GAP)) continue;
      lampsAt.push([x, y]);
      lit.push([x, y]);
    }
  }
  return { torches, lamps: lampsAt };
}

const PROP_FILES = {
  'lamp post': 'image\n56\ndescription\na lamp post, its lantern lit at dusk\nshowname\nfalse\n',
  brazier: 'image\n55\ndescription\nan iron brazier, full of hot coals\nshowname\nfalse\n',
  campfire: 'image\n57\ndescription\na campfire, crackling in a ring of stones\nshowname\nfalse\n',
};

// A plan for tools/world/city.mjs. lamp: the prop for the open squares
// ('lamp post' or 'brazier', or null for none); campfires: [[x, y]].
export function lightsPlan({ name, box, lampBox = box, lamp = 'lamp post', campfires = [], extra = [], maxLamps = 40, walls, skip = [] }) {
  // The plan covers the box and every campfire (torches are only looked for
  // in the box, lamps only in lampBox).
  const xs = [box[0], box[2], ...campfires.map((c) => c[0]), ...extra.map((e) => e[1])];
  const ys = [box[1], box[3], ...campfires.map((c) => c[1]), ...extra.map((e) => e[2])];
  const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  return {
    name,
    // The first 1000 x 1000 is the old world: plans there must say so.
    oldWorld: x0 < 1000 && y0 < 1000,
    origin: [x0, y0],
    size: [x1 - x0 + 1, y1 - y0 + 1],
    seed: 1,
    // Only walls become torches (the plan's own tiles); nothing else changes.
    mayBuild: (t) => t in TORCH_ON,
    build(p) {
      const mapPath = process.argv[3];
      const { torches } = findLights(mapPath, { box, lamps: false, walls, skip });
      const { lamps } = lamp ? findLights(mapPath, { box: lampBox, lamps: true, maxLamps, walls: [], skip }) : { lamps: [] };
      for (const [x, y, tile] of torches) p.tileNumber(x - x0, y - y0, tile);
      for (const [file, text] of Object.entries(PROP_FILES)) p.file(`defProps/${file}`, text);
      for (const [x, y] of lamps) p.prop(lamp, x - x0, y - y0);
      for (const [x, y] of campfires) p.prop('campfire', x - x0, y - y0);
      for (const [kind, x, y] of extra) p.prop(kind, x - x0, y - y0);
      p.notes = [...(p.notes ?? []), `${torches.length} torches, ${lamps.length} ${lamp ?? 'lamps'}s, ${campfires.length} campfires`];
    },
  };
}
