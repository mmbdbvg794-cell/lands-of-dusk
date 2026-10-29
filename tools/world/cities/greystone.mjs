// Greystone Mine: a working mine in the mountains north of Kingshaven,
// marked on flan's map ("New mine here" / "New Mine inside"). Built by
// tools/world/city.mjs. Its quest chain, The Old Drift (2026-10-21), for
// every race; the quests are in the God tab's quest wizard's shape
// (js/quests.js):
//
//   1 Crawlers in the Sump   Overseer Garrick: tunnel crawlers in the old
//                            sump below the lower workings
//   2 The Old Drift          Overseer Garrick: the drift that caved in
//                            twenty years ago with six miners in it, dug
//                            open; duergar delvers at its end, and a brass
//                            lamp for Old Bryn (his brother Wil's)
//   3 The Knocking Below     Old Bryn: the Grey Delve under the drift, its
//                            guards and Thrumgar the Grey Warlord, whose
//                            drum is the knocking Bryn hears
//
// Each needs the one before. Quests 1-2 suit a new character; Thrumgar
// (330 HP, strength 70) is one to grow into, like the barrow's knight.
// The rubble at the drift's mouth (923, 221-222) lets through only those
// with gs_dig, set on taking quest 2.
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
//     the old drift, its rubble at 923, 221-222      914-937 x 221-236
//     the lost crew's camp (the drift's end)         928-946 x 236-248
//     the Grey Delve (duergar), down a hole          922-948 x 257-282
//     the bunkhouse (Cook Dagna), north of the hall  860-881 x 201-211
//     the sump (tunnel crawlers), south-west         841-862 x 264-282
// The rest of the box is solid rock. The rock is drawn as grey fieldstone
// (tile 98), as in Velkarath, not 'R' (49, which looks like a cobbled
// floor); the drift's rubble keeps 49.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const O = [840, 195]; // the mine box's top-left corner
const DOOR = [1482, 192]; // in the cliff face, entered from the west
const OUTSIDE = [1480, 192];
const UP = [871, 224]; // the stairs back up
const IN = [871, 226]; // where the door brings you

const OVERSEER = 'Overseer Garrick';
const SHOPKEEP = 'Hessa Pickwright';
const MINER = 'Old Bryn';
const HAULER = 'Tess the Hauler';
const COOK = 'Cook Dagna';
const DIGGER = 'Digger Rook';
const SLEEPER = 'Petra Coalhand';

const LAMP = 'brass lamp'; // Wil's: Old Bryn knows it
const RUBBLE = [[923, 221], [923, 222]];
const CAMP = [937, 242]; // the drift's end
const DELVE = [935, 270];

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

// A monster file (defMobs): the engine's keys, one per line, then ".".
const mobFile = (stats) => Object.entries(stats).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((d) => [k, ...d]) : [k, v])).join('\n') + '\n.\n';
const itemFile = (desc, image) => `type\nitem\ndescription\n${desc}\nimage\n${image}\n.\n`;

// Bravery 3: they never run. Strength by tier as in kingswatch.mjs. The
// crawlers have no faction and no group courage (one at a time, like the
// stray hounds); each duergar den is one faction; Thrumgar has his own,
// so he only fights the one who attacks him.
const MOBS = {
  'tunnel crawler': { maxhp: 30, maxsp: 0, stre: 28, inte: 1, dext: 3, wisd: 1, cons: 8, bravery: '3.0', grouprelation: '0', image: 29 },
  'duergar delver': { maxhp: 80, maxsp: 10, stre: 40, inte: 8, dext: 12, wisd: 6, cons: 12, bravery: '3.0', grouprelation: '0.6', image: 4, giveitem: [[LAMP, '0.5']], faction: 'duergar delver' },
  'duergar guard': { maxhp: 120, maxsp: 10, stre: 55, inte: 8, dext: 15, wisd: 6, cons: 15, bravery: '3.0', grouprelation: '0.9', image: 4, faction: 'grey delve' },
  'Thrumgar the Grey Warlord': { maxhp: 330, maxsp: 20, stre: 70, inte: 12, dext: 30, wisd: 10, cons: 32, bravery: '3.0', grouprelation: '0.9', image: 4, faction: 'thrumgar' },
};

const QUESTS = [
  quest('gs_crawlers', {
    title: 'Crawlers in the Sump',
    giver: OVERSEER,
    offer: {
      says: 'Looking for work? Tunnel crawlers have come up into the old sump, below the lower workings. They chew through the cart ropes. Kill five.',
      accept: 'I\'ll clear them',
      acceptReply: 'South to the lower workings, then down the wet tunnel at its west end.',
      decline: 'Not now',
      declineReply: 'Then mind the carts.',
    },
    reminder: 'Five crawlers, in the sump below the lower workings.',
    reward: { gold: 40, exp: 60, items: ['bronze helmet'], says: 'Here, a proper helmet. Rocks fall.' },
    after: 'The carts run again.',
  }, [
    ['kill', '', { mob: 'tunnel crawler', count: 5, what: 'tunnel crawlers killed', journal: 'Kill 5 tunnel crawlers in the sump, down the wet tunnel at the west end of Greystone\'s lower workings.' }],
    ['talk', OVERSEER, { says: 'Well?', answer: 'The sump is clear', reply: 'Good work.', journal: 'Tell Overseer Garrick, in the mine\'s entry hall.' }],
  ]),

  quest('gs_drift', {
    title: 'The Old Drift',
    giver: OVERSEER,
    requires: 'gs_crawlers',
    offer: {
      says: 'Those crawlers came from somewhere, and Bryn won\'t stop about his knocking. So I\'m opening the old drift. Six men were in it when the roof fell, twenty years back. Go and see what\'s there.',
      accept: 'I\'ll go in',
      acceptReply: 'Rook\'s shifted enough rubble to squeeze past. East end of the gallery.',
      decline: 'Not yet',
      declineReply: 'It\'s waited twenty years.',
      effects: [{ kind: 'flag', flag: 'gs_dig' }],
    },
    reminder: 'The old drift, past the rubble at the east end of the gallery.',
    reward: { gold: 90, exp: 160, items: ['iron gloves'], says: 'Take these. You\'ve earned them.' },
    after: 'The drift stays open. Mind yourself down there.',
  }, [
    ['place', '', { x: CAMP[0], y: CAMP[1], radius: 5, what: 'the old drift\'s end', arrive: 'Old bedrolls, a cold fire, bones. And new tunnels in the walls, cut from below. No human pick made those.', journal: 'Squeeze past the rubble at the east end of the gallery and follow the old drift to its end.' }],
    ['kill', '', { mob: 'duergar delver', count: 4, what: 'duergar delvers slain', journal: 'Kill 4 duergar delvers at the old drift\'s end.' }],
    ['bring', MINER, { item: LAMP, take: true, says: 'That light. Where did you get it?', answer: 'In the old drift', reply: 'It\'s my brother Wil\'s. He went in with the crew. Grey dwarves, then. That\'s my knocking. Tell Garrick.', journal: 'One of the delvers carries a brass lamp. Show it to Old Bryn in the miners\' camp.' }],
    ['talk', OVERSEER, { says: 'Well?', answer: 'Duergar, digging up from below', reply: 'Grey dwarves. In my mine. Bryn will have more to say.', journal: 'Tell Overseer Garrick what is in the old drift.' }],
  ]),

  quest('gs_knocking', {
    title: 'The Knocking Below',
    giver: MINER,
    requires: 'gs_drift',
    offer: {
      says: 'Hear it? Still knocking. They\'re digging under the drift, toward the deep seam, and something beats the time for them. Stop it.',
      accept: 'I\'ll stop it',
      acceptReply: 'There\'s a hole at the drift\'s end. Go down.',
      decline: 'Not yet',
      declineReply: 'Don\'t leave it long.',
    },
    reminder: 'Down the hole at the drift\'s end. Stop that drum.',
    reward: { gold: 200, exp: 450, items: ['bronze shield'], says: 'Garrick sent this down for you. Bronze, from our own ore.' },
    after: 'Quiet down there now. I sleep, some nights.',
  }, [
    ['place', '', { x: DELVE[0], y: DELVE[1], radius: 6, what: 'the Grey Delve', arrive: 'A hall cut square and true, hot forges, and a great iron drum. The knocking is loud here.', journal: 'Go down the hole at the old drift\'s end.' }],
    ['kill', '', { mob: 'duergar guard', count: 4, what: 'duergar guards slain', journal: 'Kill 4 duergar guards in the Grey Delve.' }],
    ['kill', '', { mob: 'Thrumgar the Grey Warlord', count: 1, what: 'Thrumgar', journal: 'Kill Thrumgar the Grey Warlord, who beats the drum.' }],
    ['talk', MINER, { says: 'Listen. Hear that?', answer: 'The drum is silent', reply: 'Nothing. First quiet in a year. Wil can rest.', journal: 'Go back to Old Bryn in the miners\' camp.' }],
  ]),
];

const always = (says, answers = []) => ({ when: { kind: 'always', value: '' }, says, answers });
const go = (says, x, y) => [{ when: { kind: 'always', value: '' }, speaker: '', says, effects: [{ kind: 'teleport', x, y }] }];

const TALK = {
  [OVERSEER]: {
    shouts: ['Mind the carts!', 'Picks are at Pickwright\'s, west of the hall.'],
    stages: [always('Welcome to Greystone. Bronze and iron in the east gallery, coal below, mithril in the deep seam. Just don\'t bring the roof down.', [
      { label: 'How do I mine?', reply: 'Buy a pick from Hessa, stand by a vein and work it. The better you get, the harder the rock you can break. A worked-out vein comes back in time.' },
      { label: 'The old drift?', reply: 'East, past the gallery. It caved in twenty years back, with six men inside.' },
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
    stages: [always('Forty years I\'ve swung a pick in this hill. The stone talks, if you listen.', [
      { label: 'What does it say?', reply: 'Lately? Knocking. Down past the deep seam, where nobody\'s dug.' },
      { label: 'The old drift?', reply: 'My brother Wil was in it when it fell.' },
    ])],
  },
  [HAULER]: {
    shouts: [],
    stages: [always('Ore goes up, bars come down, and I carry the both of them. The forge and anvil here are free to use, if you know your way round them.')],
  },
  [COOK]: {
    shouts: ['Hot food! Cold ale!'],
    stages: [
      { when: { kind: 'flag', value: 'gs_knocking_done' }, says: 'Sit, eat. Stand at the table to buy.', answers: [
        { label: 'The knocking?', reply: 'Stopped. Now the bunkhouse complains about the snoring instead.' },
      ] },
      always('Sit, eat. Stand at the table to buy.', [
        { label: 'The knocking?', reply: 'Bryn\'s knocking? Half the bunkhouse hears it at night. The other half snores.' },
      ]),
    ],
  },
  [DIGGER]: {
    shouts: [],
    stages: [
      { when: { kind: 'flag', value: 'gs_dig' }, says: 'We\'ve shifted enough to squeeze past. After you.', answers: [] },
      always('Twenty years that rubble\'s sat there. Garrick says it stays.'),
    ],
  },
  [SLEEPER]: {
    shouts: [],
    stages: [always('Night shift. Let me sleep.')],
  },
};

const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);
// Once a player has silenced the drum (gs_knocking_done), the mine talks
// of it. Bryn's thank-you is his own greeting, changed; Garrick's is a
// stage of a quest he isn't in, so it sorts with the thank-yous, ahead of
// his own gs_drift one (mergeQuest leaves other quests' stages alone).
const QUIET = 'gs_knocking_done';
const AFTER = {
  [MINER]: { says: 'Forty years I\'ve swung a pick in this hill. It\'s quiet now. I\'d near forgotten the sound of it.', answers: [
    { label: 'What does it say?', reply: 'Nothing, lately. Good.' },
    { label: 'The old drift?', reply: 'My brother Wil was in it when it fell. His lamp\'s come home, at least.' },
  ] },
  [OVERSEER]: { says: TALK[OVERSEER].stages[0].says, answers: [
    TALK[OVERSEER].stages[0].answers[0],
    { label: 'The old drift?', reply: 'Open again. Mind the hole at its end; I\'ve no wish to send anyone else down it.' },
  ] },
};
export const talk = (name) => {
  const dlg = QUESTS.reduce((d, q) => mergeQuest(d, q, name), TALK[name]);
  const after = AFTER[name];
  if (!after) return dlg;
  const stage = { quest: 'gs_knocking', requires: 'gs_drift', depth: 2, when: { kind: 'flag', value: QUIET }, says: after.says, answers: structuredClone(after.answers) };
  const at = dlg.stages.findIndex((st) => st.when?.kind === 'flag' && st.when.value === QUIET);
  if (at >= 0) dlg.stages[at] = stage;
  else dlg.stages.splice(dlg.stages.findIndex((st) => st.when?.kind === 'flag' && /_done$/.test(st.when.value)), 0, stage);
  return dlg;
};

export default {
  name: 'Greystone Mine',
  origin: O,
  size: [110, 90],
  seed: 1482,
  oldWorld: true, // the box is below x, y 1000 (the old map's corner), but it's empty void
  // First built in void (tile 0); the whole box is the mine's own now, so
  // a rebuild may write over any of it.
  mayBuild: () => true,
  build(p) {
    const M = (x, y) => [x - O[0], y - O[1]];

    // The way in: a door in the grey cliff, and a sign beside it.
    p.farTile(...DOOR, '<');
    p.farAction(...DOOR, go('You push through the heavy door into Greystone Mine.', IN[0], IN[1]));
    p.sign('Greystone Mine', 'Greystone Mine', ...M(OUTSIDE[0], OUTSIDE[1] - 1));

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
    p.sign('Pickwright\'s Tools', 'Pickwright\'s Tools', ...M(862, 223));

    // The hall: the overseer, lamps, a cart of ore.
    p.npc({ name: OVERSEER, look: 'Villager Man', desc: 'Overseer Garrick, a ledger under one arm and rock dust in his beard.', x: 875 - O[0], y: 223 - O[1], dlg: talk(OVERSEER) });
    p.prop('barrel', ...M(877, 229));
    p.prop('pickaxe', ...M(866, 229));

    // East gallery.
    p.fill(...M(880, 224), 6, 3, 'e');
    p.oval(...M(885, 211), 31, 23, 'e');
    // The old drift, caved in: a stub of tunnel ending in rubble.
    p.fill(...M(914, 221), 9, 2, 'e');
    p.sign('The Old Drift', 'Caved in. Do not dig. - G.', ...M(921, 221));

    // Down to the lower workings and the miners' camp.
    p.fill(...M(870, 232), 3, 8, 'e');
    p.oval(...M(860, 239), 34, 21, 'e');
    p.npc({ name: MINER, look: 'hermit', desc: 'Old Bryn, bent as a pick handle, eyes half shut.', x: 865 - O[0], y: 247 - O[1], dlg: talk(MINER) });
    p.npc({ name: HAULER, look: 'Villager Woman', desc: 'Tess the hauler, a sack of ore on her back.', x: 874 - O[0], y: 246 - O[1], dlg: TALK[HAULER] });
    p.prop('campfire', ...M(868, 249));
    p.prop('barrel', ...M(864, 251));
    p.prop('chair', ...M(866, 250));
    p.prop('forge', ...M(876, 243));
    p.prop('anvil', ...M(878, 243));
    p.sign('Lower Workings', 'The Lower Workings', ...M(871, 241));

    // The deep seam: dark stone, mithril.
    p.fill(...M(892, 251), 6, 3, 'k');
    p.oval(...M(896, 249), 23, 19, 'k');
    p.sign('The Deep Seam', 'The Deep Seam', ...M(898, 252));

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

    // ---- 2026-10-21: the quest chain's places, and the bunkhouse ----
    // Everything below comes after the veins, so a rebuild puts them where
    // they've always been.

    // Lamps on the rock round a hall: a rock square beside the floor, every
    // few squares, in a fixed order.
    const lamps = (x0, y0, x1, y1, apart) => {
      const lit = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const [px, py] = M(x, y);
        if (p.at(px, py) !== 'R') continue;
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => 'ek='.includes(p.at(px + dx, py + dy)))) continue;
        if (lit.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < apart)) continue;
        lit.push([x, y]);
      }
      for (const [x, y] of lit) p.set(...M(x, y), 'i');
    };

    // The bunkhouse, up a passage from the hall's north end.
    p.fill(...M(870, 211), 3, 9, 'e');
    p.building(...M(860, 201), 22, 11, { wall: 'S', floor: '=', doors: [['s', 11]] });
    for (const [x, y] of [[862, 203], [865, 203], [868, 203], [862, 209], [865, 209], [868, 209]]) p.prop('bunk', ...M(x, y));
    p.prop('chest', ...M(870, 203));
    p.prop('chest', ...M(870, 209));
    p.npc({ name: SLEEPER, look: 'Villager Woman', desc: 'Petra Coalhand, boots still on, one eye open.', x: 863 - O[0], y: 206 - O[1], dlg: TALK[SLEEPER] });
    p.fill(...M(877, 203), 1, 4, '#'); // Dagna's table
    p.npc({ name: COOK, look: 'Villager Woman', desc: 'Cook Dagna, ladle in hand, flour to the elbows.', x: 879 - O[0], y: 204 - O[1], dlg: talk(COOK) });
    p.merchant(...M(876, 204), ['sandwich', 'mushroom', 'water', 'ale'], 'Dagna\'s Kitchen');
    p.prop('chair', ...M(874, 207));
    p.prop('chair', ...M(876, 208));
    p.prop('barrel', ...M(880, 209));
    p.sign('Bunkhouse', 'The Bunkhouse', ...M(872, 215));

    // The sump: down a wet tunnel from the lower workings' south-west end,
    // with black pools in it. Tunnel crawlers.
    p.fill(...M(864, 257), 2, 9, 'e');
    p.fill(...M(856, 264), 10, 2, 'e');
    p.oval(...M(841, 264), 22, 19, 'e');
    p.fill(...M(845, 273), 4, 3, 'b');
    p.fill(...M(853, 278), 3, 2, 'b');
    p.sign('The Sump', 'The old sump. Wet, dark, and crawling.', ...M(862, 265));
    for (const [x, y] of [[853, 269], [847, 270], [850, 276], [857, 273], [844, 279], [849, 281]]) p.mob('tunnel crawler', 1, ...M(x, y));
    lamps(841, 263, 866, 283, 9);

    // The old drift, dug out past the rubble: east, then down to the lost
    // crew's camp. Only those Garrick sends get past the rubble.
    for (const [x, y] of RUBBLE) {
      p.set(...M(x, y), 49);
      p.walk(...M(x, y), { kind: 'flag', flag: 'gs_dig', speaker: '', says: 'Fallen rock chokes the drift. Overseer Garrick says who digs here.' });
    }
    p.npc({ name: DIGGER, look: 'Villager Man', desc: 'Digger Rook, leaning on a shovel by the rubble.', x: 917 - O[0], y: 222 - O[1], dlg: TALK[DIGGER] });
    p.fill(...M(924, 221), 14, 2, 'e');
    p.fill(...M(936, 223), 2, 14, 'e');
    p.prop('skull', ...M(927, 222));
    p.prop('barrel', ...M(931, 221));
    p.oval(...M(928, 236), 19, 13, 'e');
    p.prop('campfire', ...M(937, 241));
    p.prop('bunk', ...M(931, 239));
    p.prop('bunk', ...M(931, 244));
    p.prop('skull', ...M(934, 246));
    p.prop('skull', ...M(942, 238));
    p.prop('pickaxe', ...M(940, 246));
    p.prop('chest', ...M(944, 242));
    p.sign('Scratched in the Rock', 'SIX OF US. AIR GOING. THEY ARE DIGGING. NOT OURS. W.A.', ...M(939, 237));
    for (const [x, y] of [[933, 241], [940, 239], [943, 244], [936, 246], [930, 242]]) p.mob('duergar delver', 1, ...M(x, y));
    lamps(923, 220, 939, 236, 8);

    // The Grey Delve: down a hole at the camp's south side, a hall the
    // duergar cut square, with forges, pillars, a lava pocket and a stub of
    // tunnel heading for the deep seam.
    p.fill(...M(936, 249), 2, 9, 'k');
    p.oval(...M(922, 257), 27, 26, 'k');
    p.fill(...M(926, 261), 19, 18, 'k');
    for (const [x, y] of [[930, 265], [940, 265], [930, 273], [940, 273]]) p.fill(...M(x, y), 2, 2, 'R');
    p.fill(...M(944, 267), 2, 3, 'L');
    p.fill(...M(918, 270), 5, 1, 'k');
    p.sign('Fresh Pick Marks', 'Fresh pick marks, heading west and up. Toward the deep seam.', ...M(919, 270));
    p.prop('forge', ...M(927, 268));
    p.prop('anvil', ...M(927, 270));
    p.prop('brazier', ...M(935, 262));
    p.prop('brazier', ...M(935, 278));
    p.prop('chest', ...M(943, 278));
    // Thrumgar's drum: the knocking Old Bryn hears (the barrel's picture).
    p.file('defProps/great iron drum', 'image\n69\ndescription\na great drum of iron, as wide as a cart, its face dented from years of beating\nshowname\ntrue\n.\n');
    p.prop('great iron drum', ...M(938, 279));
    for (const [x, y] of [[928, 263], [942, 262], [933, 269], [942, 274], [928, 277]]) p.mob('duergar guard', 1, ...M(x, y));
    p.mob('Thrumgar the Grey Warlord', 1, ...M(937, 277));
    lamps(921, 248, 949, 284, 10);

    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    // Cost 30 (sells for 15): delvers still drop it after The Old Drift.
    p.file(`defItems/${LAMP}`, `type\nitem\ndescription\na dented brass miner's lamp, W.A. scratched on the handle\ncost\n30\nimage\n7\n.\n`);
    for (const q of QUESTS) p.quest(q);

    // The rock as grey fieldstone (tile 98), not 'R' (49, drawn as a
    // cobbled floor). Both block.
    for (let y = 0; y < 90; y++) for (let x = 0; x < 110; x++) if (p.at(x, y) === 'R') p.set(x, y, 98);
  },
};
