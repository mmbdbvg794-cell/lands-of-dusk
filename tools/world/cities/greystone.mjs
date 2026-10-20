// Greystone Mine: a working mine in the mountains north of Kingshaven,
// marked on flan's map ("New mine here" / "New Mine inside"). Built by
// tools/world/city.mjs. No quests yet: the overseer and the miners are
// there to hang them on later (God tab → Quests…).
//
// Places on the map (absolute):
//   the door, in the grey cliff north of Kingshaven  1482, 192
//     (walk up from Kingshaven's north side, ~200 steps; you come back
//     out at 1480, 192)
//   the mine, dug in the void (like Velkarath)       840-949 x 195-284
//     entry hall 863-880 x 218-232 (stairs up 871,224, you arrive 871,226)
//     Pickwright's shop, west of the hall            851-861 x 221-229
//     east gallery (bronze, iron)                    885-915 x 211-233
//     lower workings + miners' camp (iron, coal,
//       the forge and anvil)                         860-893 x 239-259
//     the deep seam (mithril, coal)                  896-918 x 249-267
//     the old drift (collapsed: dig on from here)    916-923 x 221-222
// The rest of the box is solid rock, left for the mine to grow into.

const O = [840, 195]; // the mine box's top-left corner
const DOOR = [1482, 192]; // in the cliff face, entered from the west
const OUTSIDE = [1480, 192];
const UP = [871, 224]; // the stairs back up
const IN = [871, 226]; // where the door brings you

const OVERSEER = 'Overseer Garrick';
const SHOPKEEP = 'Hessa Pickwright';
const MINER = 'Old Bryn';
const HAULER = 'Tess the Hauler';

const always = (says, answers = []) => ({ when: { kind: 'always', value: '' }, says, answers });
const go = (says, x, y) => [{ when: { kind: 'always', value: '' }, speaker: '', says, effects: [{ kind: 'teleport', x, y }] }];

const TALK = {
  [OVERSEER]: {
    shouts: ['Mind the carts!', 'Picks are at Pickwright\'s, west of the hall.'],
    stages: [always('Welcome to Greystone. Bronze and iron in the east gallery, coal below, mithril in the deep seam. Just don\'t bring the roof down.', [
      { label: 'How do I mine?', reply: 'Buy a pick from Hessa, stand by a vein and work it. The better you get, the harder the rock you can break. A worked-out vein comes back in time.' },
      { label: 'The old drift?', reply: 'East, past the gallery. It caved in years back. Nobody\'s been brave enough, or paid enough, to dig it out.' },
      { label: 'Any work?', reply: 'Not today. Come back and ask me again; there\'s always something going wrong in a mine.' },
    ])],
  },
  [SHOPKEEP]: {
    shouts: ['Picks! Hammers! Sharp and sound!'],
    stages: [always('Picks for the rock, hammers for the anvil. Stand at my counter and open the Shop tab.', [
      { label: 'Thank you', reply: 'Mind your fingers.' },
    ])],
  },
  [MINER]: {
    shouts: [],
    stages: [always('Forty years I\'ve swung a pick in this hill. The stone talks, if you listen. Lately it\'s been saying things I don\'t like.', [
      { label: 'Like what?', reply: 'Knocking. Down past the deep seam, where nobody\'s dug. Probably nothing. Probably.' },
    ])],
  },
  [HAULER]: {
    shouts: [],
    stages: [always('Ore goes up, bars come down, and I carry the both of them. The forge and anvil here are free to use, if you know your way round them.')],
  },
};

export default {
  name: 'Greystone Mine',
  origin: O,
  size: [110, 90],
  seed: 1482,
  oldWorld: true, // the box is below x, y 1000 (the old map's corner), but it's empty void
  mayBuild: (t) => t === 0,
  build(p) {
    const M = (x, y) => [x - O[0], y - O[1]];

    // The way in: a door in the grey cliff, and a sign beside it.
    p.farTile(...DOOR, '<');
    p.farAction(...DOOR, go('You push through the heavy door into Greystone Mine.', IN[0], IN[1]));
    p.sign('Greystone Mine', 'Greystone Mine. Picks sold inside. Mind the carts.', ...M(OUTSIDE[0], OUTSIDE[1] - 1));

    // The mine: rock all round, then the halls dug out.
    p.fill(0, 0, 110, 90, 'R');
    p.oval(...M(863, 218), 18, 15, 'e'); // entry hall
    p.set(...M(...UP), 'U');
    p.action(...M(...UP), go('You climb back up into the daylight.', OUTSIDE[0], OUTSIDE[1]));

    // Pickwright's shop: a stone room off the hall's west side.
    p.building(...M(851, 221), 11, 9, { wall: 'S', floor: '=', doors: [['e', 4]] });
    p.fill(...M(862, 224), 2, 3, 'e'); // from the door to the hall
    p.fill(...M(854, 223), 1, 5, '#'); // the counter
    p.npc({ name: SHOPKEEP, look: 'Villager Woman', desc: 'Hessa Pickwright, sleeves rolled, a pick handle over each shoulder.', x: 853 - O[0], y: 225 - O[1], dlg: TALK[SHOPKEEP] });
    p.merchant(...M(855, 225), ['mining pick', 'smithing hammer', 'water', 'apple'], 'Pickwright\'s Tools');
    p.prop('pickaxe', ...M(852, 222));
    p.prop('barrel', ...M(852, 228));
    p.sign('Pickwright\'s Tools', 'Pickwright\'s: picks, hammers, water.', ...M(862, 223));

    // The hall: the overseer, lamps, a cart of ore.
    p.npc({ name: OVERSEER, look: 'Villager Man', desc: 'Overseer Garrick, a ledger under one arm and rock dust in his beard.', x: 875 - O[0], y: 223 - O[1], dlg: TALK[OVERSEER] });
    p.prop('barrel', ...M(877, 229));
    p.prop('pickaxe', ...M(866, 229));
    p.sign('Entry Hall', 'East: the gallery (bronze, iron). South: the lower workings (iron, coal) and the deep seam (mithril).', ...M(873, 224));

    // East gallery.
    p.fill(...M(880, 224), 6, 3, 'e');
    p.oval(...M(885, 211), 31, 23, 'e');
    // The old drift, caved in: a stub of tunnel ending in rubble.
    p.fill(...M(914, 221), 9, 2, 'e');
    p.sign('The Old Drift', 'Caved in. Do not dig. - G.', ...M(921, 221));

    // Down to the lower workings and the miners' camp.
    p.fill(...M(870, 232), 3, 8, 'e');
    p.oval(...M(860, 239), 34, 21, 'e');
    p.npc({ name: MINER, look: 'hermit', desc: 'Old Bryn, bent as a pick handle, eyes half shut.', x: 865 - O[0], y: 247 - O[1], dlg: TALK[MINER] });
    p.npc({ name: HAULER, look: 'Villager Woman', desc: 'Tess the hauler, a sack of ore on her back.', x: 874 - O[0], y: 246 - O[1], dlg: TALK[HAULER] });
    p.prop('campfire', ...M(868, 249));
    p.prop('barrel', ...M(864, 251));
    p.prop('chair', ...M(866, 250));
    p.prop('forge', ...M(876, 243));
    p.prop('anvil', ...M(878, 243));
    p.sign('Lower Workings', 'Lower Workings. Forge and anvil free to all. The deep seam is east and down.', ...M(871, 241));

    // The deep seam: dark stone, mithril.
    p.fill(...M(892, 251), 6, 3, 'k');
    p.oval(...M(896, 249), 23, 19, 'k');
    p.sign('The Deep Seam', 'The Deep Seam. Mithril, for those who can break it.', ...M(898, 252));

    // Lamps on the walls: torch squares in the rock round each hall.
    for (const [x, y] of [[866, 218], [876, 218], [863, 225], [893, 211], [906, 212], [886, 222], [914, 225], [867, 239], [884, 240], [861, 249], [892, 248], [903, 249], [912, 252], [898, 266]]) {
      if (p.at(...M(x, y)) === 'R') p.set(...M(x, y), 'i');
    }

    // The veins: along each hall's walls (floor with rock round it and room
    // to stand), spaced out, in a fixed order so a rebuild puts them back.
    let seed = 1482;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const veins = (x0, y0, x1, y1, ores) => {
      const placed = [];
      const isRock = (x, y) => 'Ri'.includes(p.at(x, y));
      const isFloor = (x, y) => 'ek'.includes(p.at(x, y));
      const spots = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) spots.push(M(x, y));
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      for (const [px, py] of spots) {
        if (placed.length >= ores.length) break;
        if (!isFloor(px, py)) continue;
        let rock = 0, open = 0;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) { if (isRock(px + dx, py + dy)) rock++; else if (isFloor(px + dx, py + dy)) open++; }
        if (rock < 3 || open < 3) continue;
        if (placed.some(([qx, qy]) => Math.hypot(qx - px, qy - py) < 6)) continue;
        if ([...p.props, ...p.signs, ...p.merchants].some((o) => Math.abs(o.x - px) <= 2 && Math.abs(o.y - py) <= 2)) continue;
        placed.push([px, py]);
        p.prop(ores[placed.length - 1], px, py);
      }
      if (placed.length < ores.length) p.notes.push(`only ${placed.length} of ${ores.length} veins fit in ${x0},${y0}-${x1},${y1}`);
    };
    veins(885, 211, 915, 233, ['bronze vein', 'bronze vein', 'iron vein', 'bronze vein', 'iron vein', 'bronze vein', 'iron vein', 'bronze vein']);
    veins(860, 239, 893, 259, ['iron vein', 'coal seam', 'iron vein', 'coal seam', 'iron vein', 'coal seam', 'coal seam']);
    veins(896, 249, 918, 267, ['mithril vein', 'coal seam', 'mithril vein', 'mithril vein', 'coal seam', 'mithril vein']);
  },
};
