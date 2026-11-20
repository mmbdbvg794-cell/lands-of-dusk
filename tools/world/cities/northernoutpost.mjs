// The Northern Outpost: a stone fort on the snowfield at the top of the
// world, south of flan's "Northern Outpost" sign (1496,54). Built by
// tools/world/city.mjs. Structure only: no NPCs, shops or monsters yet.
//
//   the fort's walls                          1494-1524, 57-77
//   the gate, in the north wall, facing the sign   1509,57
//   four corner towers, torches at the gate and the keep's door
//   barracks (north-west): four beds and a chest
//   storehouse and forge (north-east): forge, anvil, barrels, chest
//   the keep (south): the commander's bed, a chair, a chest
//   the yard: a campfire and a well; a packed-earth road from the sign
//
// Every building stands at least two squares clear of the walls, the
// towers and each other, so the whole yard can be walked round. (The
// first version, 2026-11-20 03:41, had them against the walls, which left
// one-square pockets reachable only diagonally; this one replaces it: it
// covers all of the old one, puts snow back on every square it doesn't
// build, and takes away the old props.)
//
// It may build over the snow (109, with rocks 58 and stony ground 122)
// and the first version's tiles. The Skeleton knights and Water Shades at
// 1513-1514, 41-48 are outside it, to the north-east, and stay.
const SNOW = 109;
const OLD_FORT = [59, 58, 62, 63, 40, 24, 23, 20, 158, 159];
const OLD_PROPS = [
  ['bed', 1496, 61], ['bed', 1496, 62], ['bed', 1496, 63], ['bed', 1496, 64], ['chest', 1499, 61],
  ['forge', 1516, 61], ['anvil', 1515, 61], ['barrel', 1516, 64], ['barrel', 1515, 64], ['chest', 1513, 64],
  ['bed', 1510, 67], ['chair', 1506, 69], ['chest', 1502, 67], ['campfire', 1503, 63], ['well', 1509, 63],
];

export default {
  name: 'Northern Outpost',
  origin: [1494, 53],
  size: [31, 25],
  seed: 7,
  mayBuild: (t) => t === SNOW || t === 122 || OLD_FORT.includes(t),
  build(p) {
    const at = (x, y) => [x - 1494, y - 53];
    for (const [name, x, y] of OLD_PROPS) p.dropProp(name, ...at(x, y));

    // The first version's road and its old gate approach go back to snow;
    // the new road runs from the sign to the new gate.
    p.fill(...at(1494, 55), 31, 2, SNOW);
    p.path([at(1497, 55), at(1509, 55), at(1509, 56)], 'e');

    // The curtain wall, snow inside it, the gate and its torches.
    p.fill(...at(1494, 57), 31, 21, 'S');
    p.fill(...at(1495, 58), 29, 19, SNOW);
    p.set(...at(1509, 57), 'D');
    p.set(...at(1508, 57), 'i');
    p.set(...at(1510, 57), 'i');

    // Corner towers.
    for (const [x, y] of [[1494, 57], [1522, 57], [1494, 75], [1522, 75]]) p.fill(...at(x, y), 3, 3, 's');

    // Barracks, north-west, door on the yard side.
    p.building(...at(1498, 61), 7, 6, { wall: '#', floor: 'P', doors: [['e', 2]] });
    for (const y of [62, 63, 64, 65]) p.prop('bed', ...at(1499, y));
    p.prop('chest', ...at(1503, 62));

    // Storehouse and forge, north-east, door on the yard side.
    p.building(...at(1514, 61), 7, 6, { wall: '#', floor: 'P', doors: [['w', 2]] });
    p.prop('forge', ...at(1519, 62));
    p.prop('anvil', ...at(1518, 62));
    p.prop('barrel', ...at(1519, 65));
    p.prop('barrel', ...at(1518, 65));
    p.prop('chest', ...at(1515, 65));

    // The keep, south, its door facing the gate; a clear row behind it.
    p.building(...at(1504, 69), 11, 6, { wall: 'S', floor: 'k', doors: [['n', 5]] });
    p.set(...at(1508, 69), 'i');
    p.set(...at(1510, 69), 'i');
    p.prop('bed', ...at(1513, 70));
    p.prop('chair', ...at(1509, 72));
    p.prop('chest', ...at(1505, 70));

    // The yard: a road from the gate to the keep, a campfire and a well.
    p.path([at(1509, 58), at(1509, 68)], 'e');
    p.prop('campfire', ...at(1506, 67));
    p.prop('well', ...at(1512, 67));
  },
};
