// The Northern Outpost: a stone fort on the snowfield at the top of the
// world, south of flan's "Northern Outpost" sign (1496,54). Built by
// tools/world/city.mjs. Structure only: no NPCs, shops or monsters yet.
//
//   the fort's walls                          1494-1518, 57-73
//   the gate, in the north wall, facing the sign   1506,57
//   four corner towers, torches at the gate and the keep's door
//   barracks (west): four beds and a chest
//   storehouse and forge (east): forge, anvil, barrels, chest
//   the keep (south): the commander's bed, a chair, a chest
//   the yard: a campfire and a well; a packed-earth road from the sign
//
// The snow round it (tile 109, with rocks 58 and stony ground 122) is all
// it may build over. The Skeleton knights and Water Shades at 1513-1514,
// 41-48 are outside it, to the north-east, and are left where they are.
export default {
  name: 'Northern Outpost',
  origin: [1494, 53],
  size: [25, 21],
  seed: 7,
  mayBuild: (t) => t === 109 || t === 58 || t === 122,
  build(p) {
    const at = (x, y) => [x - 1494, y - 53];

    // The road from the sign to the gate.
    p.path([at(1497, 55), at(1506, 55), at(1506, 56)], 'e');

    // The curtain wall, the gate and its torches.
    p.fill(...at(1494, 57), 25, 17, 'S');
    p.fill(...at(1495, 58), 23, 15, ' ');
    p.set(...at(1506, 57), 'D');
    p.set(...at(1505, 57), 'i');
    p.set(...at(1507, 57), 'i');

    // Corner towers.
    for (const [x, y] of [[1494, 57], [1516, 57], [1494, 71], [1516, 71]]) p.fill(...at(x, y), 3, 3, 's');

    // Barracks, against the west wall.
    p.building(...at(1495, 60), 6, 6, { wall: '#', floor: 'P', doors: [['e', 2]] });
    for (const y of [61, 62, 63, 64]) p.prop('bed', ...at(1496, y));
    p.prop('chest', ...at(1499, 61));

    // Storehouse and forge, against the east wall.
    p.building(...at(1512, 60), 6, 6, { wall: '#', floor: 'P', doors: [['w', 2]] });
    p.prop('forge', ...at(1516, 61));
    p.prop('anvil', ...at(1515, 61));
    p.prop('barrel', ...at(1516, 64));
    p.prop('barrel', ...at(1515, 64));
    p.prop('chest', ...at(1513, 64));

    // The keep, against the south wall, its door facing the gate.
    p.building(...at(1501, 66), 11, 7, { wall: 'S', floor: 'k', doors: [['n', 5]] });
    p.set(...at(1505, 66), 'i');
    p.set(...at(1507, 66), 'i');
    p.prop('bed', ...at(1510, 67));
    p.prop('chair', ...at(1506, 69));
    p.prop('chest', ...at(1502, 67));

    // The yard: a road from the gate to the keep, a campfire and a well.
    p.path([at(1506, 58), at(1506, 65)], 'e');
    p.prop('campfire', ...at(1503, 63));
    p.prop('well', ...at(1509, 63));
  },
};
