// The lizardman isles' creatures: new swamp monsters (their defMobs files)
// in dens over the swamp (swamp_islands.py), harder the further they are
// from Ssarakh, and the old spawns that don't belong in a swamp (wolves,
// dogs, moles...) taken out. Built by tools/world/city.mjs; no squares
// change.
//
//   MOBS=<the game's mobs file> node tools/world/city.mjs \
//     tools/world/cities/swampmobs.mjs <shortmap> <out dir> [props json]
//
// Dens go only where you can walk to from the Brood Stone, and not in
// Ssarakh or the Hatching Pools. The same map always gives the same dens.
//
//   tier 1 (within 70 of the Brood Stone)  bog slime, mire lizard
//   tier 2 (70-140)                        bog crawler, swamp serpent
//   tier 3 (140-210)                       marsh wisp, mire hound
//   tier 4 (further)                       swamp horror, dry one raider
// (Dry One raiders are the Sand Kings' lizardfolk, Kraghul's, raiding the
// isles: see LORE.md.)

import { readFileSync } from 'node:fs';
import { HEART } from './ssarakh.mjs';

const mobFile = (stats) => Object.entries(stats).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((d) => [k, ...d]) : [k, v])).join('\n') + '\n.\n';
const base = { maxsp: 0, inte: 1, wisd: 2, bravery: '3.0', grouprelation: '0.9' };

// Strength by HP, as the other new monsters (HANDOVER: monster tuning).
// Tiers 1 and 2 don't gang up (grouprelation 0, no faction: play-test 3),
// as Kingshaven's stray hounds.
export const MOBS = {
  'bog slime': { ...base, description: 'A quivering heap of green bog-slime, smelling of rot.', maxhp: 30, stre: 28, dext: 3, cons: 8, image: 33, giveitem: [['mushroom', '0.3']], grouprelation: '0' },
  'mire lizard': { ...base, description: 'A mud-coloured lizard as long as a man, all teeth and patience.', maxhp: 38, stre: 28, dext: 8, cons: 8, image: 28, grouprelation: '0' },
  'bog crawler': { ...base, description: 'A pale, many-legged thing that crawls up out of the bog pools.', maxhp: 75, stre: 40, dext: 10, cons: 12, image: 29, grouprelation: '0' },
  'swamp serpent': { ...base, description: 'A thick green serpent, coiled in the reeds.', maxhp: 95, stre: 40, dext: 14, cons: 14, image: 26, giveitem: [['mandrake', '0.25']], grouprelation: '0' },
  'marsh wisp': { ...base, description: 'A drifting green light with a face in it. The brood says they are the drowned.', maxhp: 110, stre: 45, dext: 28, cons: 10, wisd: 10, image: 36, giveitem: [['blue potion', '0.2']], faction: 'marsh wisp' },
  'mire hound': { ...base, description: 'A black, slick-furred hound that hunts the mire in packs.', maxhp: 160, stre: 55, dext: 20, cons: 18, image: 38, faction: 'mire hound' },
  'swamp horror': { ...base, description: 'A writhing mass of roots, weed and bone that has learned to walk.', maxhp: 300, stre: 70, dext: 16, cons: 30, image: 41, giveitem: [['red potion', '0.4']], faction: 'swamp horror' },
  'dry one raider': { ...base, description: 'A Sand King raider, one of the Dry Ones, sun-scarred and sworn to Kraghul.', maxhp: 220, stre: 65, dext: 22, cons: 25, image: 39, giveitem: [['bronze sword', '0.08'], ['red potion', '0.3']], faction: 'dry ones' },
};
const TIERS = [['bog slime', 'mire lizard'], ['bog crawler', 'swamp serpent'], ['marsh wisp', 'mire hound'], ['swamp horror', 'dry one raider']];
const tierAt = (x, y) => { const d = Math.hypot(x - HEART[0], y - HEART[1]); return d < 70 ? 0 : d < 140 ? 1 : d < 210 ? 2 : 3; };

const BOX = [1580, 740, 1960, 1150]; // the isles (swamp_islands.py)
const KEEP_OUT = [
  [1650, 905, 1745, 1005], // Ssarakh and its harbour
  [1840, 984, 1918, 1032], // the Hatching Pools
];
// Old spawns that don't belong in a swamp (slimes and blobs stay).
const UNFIT = new Set(['wolf', 'Black dog', 'Mole', 'Bug', 'Hound', 'stalker', 'lizard axewarrior', 'Lizard Axeman']);
const WALK = new Set([1, 20, 23, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 106, 109, 122, 126, 127, 128, 129, 149, 150, 158, 159, 168, 169, 172, 173]);
const SPACING = 18; // squares between dens, at least

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export default {
  name: 'Swamp creatures',
  origin: [0, 0],
  size: [1, 1],
  seed: 41,
  mayBuild: () => false,
  build(p) {
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));

    const map = readFileSync(process.argv[3]);
    const ROWS = map.readInt32BE(4);
    const tile = (x, y) => map.readUInt16BE(8 + (x * ROWS + y) * 2);
    const inBox = (x, y) => x >= BOX[0] && x <= BOX[2] && y >= BOX[1] && y <= BOX[3];
    const kept = (x, y) => !KEEP_OUT.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);

    // Where you can walk to from the Brood Stone.
    const key = (x, y) => x * 4096 + y;
    const reach = new Set([key(...HEART)]);
    const q = [HEART];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (!inBox(nx, ny) || reach.has(key(nx, ny)) || !WALK.has(tile(nx, ny))) continue;
        reach.add(key(nx, ny));
        q.push([nx, ny]);
      }
    }
    const open = (x, y) => reach.has(key(x, y)) && kept(x, y);

    // Dens: on a jittered grid, each at a square with room round it.
    const r = rng(41);
    const dens = [];
    for (let gx = BOX[0]; gx <= BOX[2]; gx += SPACING) {
      for (let gy = BOX[1]; gy <= BOX[3]; gy += SPACING) {
        const x = gx + Math.floor(r() * SPACING), y = gy + Math.floor(r() * SPACING);
        if (!open(x, y)) continue;
        const room = [];
        for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if ((dx || dy) && open(x + dx, y + dy)) room.push([x + dx, y + dy]);
        if (room.length < 14) continue;
        if (dens.some((d) => Math.hypot(d.x - x, d.y - y) < SPACING)) continue;
        dens.push({ x, y, room });
      }
    }
    const count = [0, 0, 0, 0];
    for (const d of dens) {
      const t = tierAt(d.x, d.y);
      count[t]++;
      const [a, b] = r() < 0.5 ? TIERS[t] : [...TIERS[t]].reverse();
      const who = t === 3 ? [a, a, b] : [a, a, b, a];
      const spots = [...d.room].sort(() => r() - 0.5);
      who.forEach((name, i) => p.mob(name, 1, spots[i][0], spots[i][1]));
    }
    console.log(`swamp dens: ${dens.length} (by tier ${count.join(', ')})`);

    // The old spawns that don't fit, taken out.
    const lines = readFileSync(process.env.MOBS, 'utf8').replace(/\r/g, '').split('\n');
    let gone = 0;
    for (let i = 0; i + 3 < lines.length;) {
      const [name, level, x, y] = [lines[i], Number(lines[i + 1]), Number(lines[i + 2]), Number(lines[i + 3])];
      if (Number.isInteger(level) && Number.isInteger(x) && Number.isInteger(y)) {
        if (UNFIT.has(name) && inBox(x, y)) { p.dropMob(name, level, x, y); gone++; }
        i += 4;
      } else i++;
    }
    console.log(`old spawns taken out: ${gone}`);
  },
};
