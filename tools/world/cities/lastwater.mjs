// Last Water: an outpost round the spring in the southern desert (the
// user, 2026-10-29, from flan's map note "Oaisis" at 784,1523). Caravans
// fill their skins here before the deep sand. Built by tools/world/city.mjs.
//
// No quests and no new story: the locals have rumours at most (the desert
// keeps its mysteries). Drow come out of the west now and then (Velkarath's
// south stair is at 686,1484), and nobody says from where.
//
// Places on the map (absolute):
//   the spring (left as the map has it)          777-783, 1522-1528
//   the wall, gates west and east on the street  770-800, 1513-1540
//   Wellkeeper Amsel's house                     791-799, 1514-1519
//   Ssuli's stall, north of the street           792-795, 1529-1531
//   the rest tent, bedrolls along its south side 774-785, 1535-1539
// Coyotes (60 HP) roam near the walls; sand worms (800 HP) further out.

const O = [760, 1505];
const at = (x, y) => [x - O[0], y - O[1]];

// The spring and its shore, as the map has them (rows: y -> [x from, x to]).
const SPRING = { 1522: [777, 782], 1523: [776, 783], 1524: [776, 783], 1525: [776, 783], 1526: [777, 783], 1527: [778, 782], 1528: [780, 781] };

const AMSEL = 'Wellkeeper Amsel', SSULI = 'Ssuli the Trader', GUARD = 'Outpost Guard';
const BED_PRICE = 10;

const ask = (label, reply) => ({ label, reply, effects: [] });
const bye = ask('Farewell', 'Go well, and drink before you go.');
const talk = (text, answers, shouts = []) => ({ shouts, stages: [{ when: { kind: 'always', value: '' }, says: text, answers: [...answers, bye] }] });

const AMSEL_DLG = talk('Water\'s free. Trouble isn\'t. What do you need?', [
  ask('This place?', 'Last Water. Caravans fill their skins here before the deep sand. Nobody owns the spring; I keep it clean.'),
  ask('A bed?', `The tent south of the spring. ${BED_PRICE} gold: walk onto a bedroll.`),
  ask('The desert?', 'Coyotes near the walls. Further out, sand worms. Further than that, nobody comes back to say.'),
  ask('Visitors?', 'Drow, now and then, out of the west. Where from, they don\'t say. They pay in silver.'),
]);
const SSULI_DLG = talk('Water, food, a little of everything. Stand in front of me and open the Shop tab.', [
  ask('Far from the mire?', 'Hsss. The mire is crowded. The sand is quiet.'),
], ['Water and food! Last chance before the sand!']);
const GUARD_DLG = talk('Keep your blade sheathed inside the walls.', [
  ask('Coyotes?', 'They come at dusk. Outside the walls, hunt what you like.'),
]);

// A bedroll in the rest tent: a night's sleep for a few coins (walked onto).
const BEDROLL = `#A bedroll in the rest tent at Last Water (tools/world/cities/lastwater.mjs).
if < trigger cash ${BED_PRICE}
	chat trigger " A bedroll is ${BED_PRICE} gold. Come back when you have it."
	endscript
end
inc trigger cash - 0 ${BED_PRICE}
set trigger hp trigger maxhp
set trigger mp trigger maxmp
chat trigger " You pay ${BED_PRICE} gold, sleep through the heat of the day, and wake refreshed."
endscript
`;

export default {
  name: 'Last Water',
  origin: O,
  size: [50, 40],
  seed: 1523,
  // Desert sand only: the spring and its shore stay as they are.
  mayBuild: (t) => t === 38 || t === 39,
  build(p) {
    const F = (x, y, w, h, ch) => p.fill(...at(x, y), w, h, ch);
    const S = (x, y, ch) => p.set(...at(x, y), ch);

    // Green round the spring, and its trees.
    p.oval(...at(773, 1519), 15, 13, ',');
    for (const [y, [x0, x1]] of Object.entries(SPRING)) for (let x = x0; x <= x1; x++) S(x, Number(y), ' ');
    for (const [x, y] of [[775, 1520], [785, 1520], [774, 1529], [786, 1529], [780, 1531], [779, 1519]]) S(x, y, 'T');

    // The wall, gates west and east where the street runs through.
    F(770, 1513, 31, 1, 'S');
    F(770, 1540, 31, 1, 'S');
    F(770, 1513, 1, 28, 'S');
    F(800, 1513, 1, 28, 'S');
    F(770, 1533, 31, 1, 'e'); // the street, through both gates
    F(789, 1514, 1, 19, 'e'); // and north to the Wellkeeper's door
    F(790, 1520, 6, 1, 'e');

    // Wellkeeper Amsel's house, its door on the lane.
    p.building(...at(791, 1514), 9, 6, { wall: 'W', floor: 'P', doors: [['s', 4]] });
    p.npc({ name: AMSEL, look: 'Villager', desc: 'Wellkeeper Amsel, lean and sun-dark, sand in every crease.', x: 795 - O[0], y: 1516 - O[1], dlg: AMSEL_DLG });
    p.prop('chair', ...at(793, 1516));
    p.prop('well', ...at(786, 1525));

    // Ssuli's stall: Ssuli behind the counter, the shop square in front.
    F(792, 1530, 4, 1, '#');
    S(794, 1530, 'e');
    p.npc({ name: SSULI, look: 'lizardfolk', desc: 'Ssuli, a lizardfolk trader a long way from the mire, wrapped against the sun.', x: 794 - O[0], y: 1529 - O[1], dlg: SSULI_DLG });
    p.merchant(...at(794, 1531), ['water', 'apple', 'sandwich', 'ale', 'healing potion'], 'Ssuli\'s Stall');
    for (const [x, y] of [[791, 1529], [796, 1529]]) p.prop('barrel', ...at(x, y));
    p.prop('campfire', ...at(787, 1531));

    // The rest tent, bedrolls along its far side.
    p.building(...at(774, 1535), 12, 5, { wall: 'W', floor: 'P', doors: [['n', 6]] });
    for (const x of [776, 778, 782, 784]) {
      p.prop('bed', ...at(x, 1538));
      p.file(`defMoveActions/${x}_1537`, BEDROLL);
    }

    // Guards at the gates.
    p.npc({ name: GUARD, look: 'Guard', desc: 'A guard of Last Water, face wrapped against the sand.', x: 772 - O[0], y: 1532 - O[1], dlg: GUARD_DLG });
    p.prop(GUARD, ...at(798, 1532));
    p.sign('Last Water', `Last Water. Shade, water, and a bed (${BED_PRICE} gold). Keep the peace.`, ...at(768, 1532));

    // Coyotes near the walls; sand worms out in the deep sand.
    for (const [x, y] of [[752, 1518], [755, 1548], [812, 1510], [815, 1546], [790, 1555], [764, 1500]]) p.mob('Coyote', 1, ...at(x, y));
    for (const [x, y] of [[840, 1585], [725, 1600], [870, 1505], [805, 1625]]) p.mob('sand worm', 1, ...at(x, y));
  },
};
