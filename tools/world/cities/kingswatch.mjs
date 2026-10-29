// The King's Watch: a quest chain round Kingshaven, three quests for every
// race, from the Watch post outside the east gate. Built by
// tools/world/city.mjs; the quests are in the God tab's quest wizard's
// shape (js/quests.js), so they open and can be changed there afterwards.
//
//   1 Strays at the Farms     Sergeant Wexley: stray hounds at the north farms
//   2 The Coast Road          Sergeant Wexley: the thieves' hideout on the
//                             wooded point south-east, and the stolen purses
//   3 The Barrow in the Hills Sergeant Wexley: the dead walking in the hidden
//                             valley north-east, and the barrow's knight
//
// Each needs the one before. Places on the map (absolute):
//   the Watch post, outside the east gate          1499-1505, 340-344
//   the stray hounds, in the meadow north of the farms  around 1423, 285
//   the thieves' hideout, a ruin on the point      around 1491, 416
//   the barrow, in the valley in the hills         1559-1565, 288-292
// The monsters are new (defMobs files below), named so the Painted art
// draws them from a family (wolf, person, skeleton). Quests 1-2 suit a new
// character; the barrow's knight (320 HP, strength 70) is one to grow into.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const O = [1400, 270];
const at = (x, y) => [x - O[0], y - O[1]];

const WEXLEY = 'Sergeant Wexley';
const HIDEOUT = [1491, 416];
const BARROW = [1562, 290];

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

// A monster file (defMobs): the engine's keys, one per line, then ".".
const mobFile = (stats) => Object.entries(stats).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((d) => [k, ...d]) : [k, v])).join('\n') + '\n.\n';
const itemFile = (desc, image) => `type\nitem\ndescription\n${desc}\nimage\n${image}\n.\n`;

// Bravery 3 (server/Creatures.java FEARLESS): they never run. Strength by
// tier (<= 40 HP 28, <= 115 HP 40, <= 200 HP 55, the finale 70): damage is
// strength/2 x 0.5-1.5 less armour, and armour is mostly the target's DEX
// (a new character in a cloth shirt has about 11, a few levels on 20).
// Each den is one faction, so killing one sets the rest on you (the
// creature AI's grudges); the barrow's knight has a faction of its own, so it only
// fights the player who attacks it, not alongside its den.
const MOBS = {
  // No faction and no group courage: they fight back one at a time, not as a
  // pack (the 2026-10-15 play-test; tools/server/fix_playtest.py).
  'stray hound': { maxhp: 25, maxsp: 0, stre: 26, inte: 1, dext: 3, wisd: 3, cons: 6, bravery: '3.0', grouprelation: '0', image: 22 },
  'highway thief': { maxhp: 70, maxsp: 10, stre: 40, inte: 8, dext: 14, wisd: 6, cons: 10, bravery: '3.0', grouprelation: '0.5', image: 2, giveitem: [['stolen purse', '0.4']], faction: 'highway thief' },
  'barrow skeleton': { maxhp: 120, maxsp: 0, stre: 55, inte: 1, dext: 15, wisd: 1, cons: 15, bravery: '3.0', grouprelation: '0.9', image: 32, faction: 'barrow' },
  'barrow skeleton knight': { maxhp: 320, maxsp: 10, stre: 70, inte: 10, dext: 30, wisd: 10, cons: 30, bravery: '3.0', grouprelation: '0.9', image: 32, faction: 'barrow knight' },
};

const QUESTS = [
  quest('kw_strays', {
    title: 'Strays at the Farms',
    giver: WEXLEY,
    offer: {
      says: 'You there, you can swing a blade. Stray hounds are worrying the sheep at the farms north of the walls. Will you see to them?',
      accept: 'I will see to them',
      acceptReply: 'Good. Out of the north gate, west along the road, then up the lane beside Farmer Hollin\'s farm. Five of them should send the rest running.',
      decline: 'Not now',
      declineReply: 'The sheep won\'t thank you. Come back if you change your mind.',
    },
    reminder: 'The hounds are still in the meadow north of the farms: out of the north gate, west along the road, and up the lane beside Farmer Hollin\'s.',
    reward: { gold: 40, exp: 60, items: ['leather cap'], says: 'Take this cap. Every watchman starts with one.' },
    after: 'The farmers sleep again.',
  }, [
    ['kill', '', { mob: 'stray hound', count: 5, what: 'stray hounds driven off', journal: 'Kill 5 stray hounds in the meadow north of the farms (out of Kingshaven\'s north gate, west along the road, then up the lane beside Farmer Hollin\'s).' }],
    ['talk', WEXLEY, { says: 'Back from the farms?', answer: 'The hounds are gone', reply: 'Then the sheep are safe, and so is my ear from the farmers\' complaining.', journal: 'Tell Sergeant Wexley, at the Watch post outside the east gate (north of the road, behind the first houses), that the hounds are gone.' }],
  ]),

  quest('kw_coastroad', {
    title: 'The Coast Road',
    giver: WEXLEY,
    requires: 'kw_strays',
    offer: {
      says: 'Now pedlars on the coast road come in robbed: thieves, on the wooded point south-east of the city. Break them and bring back what they took.',
      accept: 'I will find them',
      acceptReply: 'Follow the shore south-east, past the fishing huts, onto the point. There\'s an old ruin in the trees out there. Start with that.',
      decline: 'Not yet',
      declineReply: 'They\'ll still be there. Thieves always are.',
    },
    reminder: 'The thieves are on the wooded point south-east of the city. Bring me a stolen purse.',
    reward: { gold: 90, exp: 160, items: ['broad sword'], says: 'A broad sword from the Watch armoury. You\'ve earned it.' },
    after: 'The coast road is quiet again.',
  }, [
    ['place', '', { x: HIDEOUT[0], y: HIDEOUT[1], radius: 4, what: 'the thieves\' hideout', arrive: 'Cold ashes, a torn sack, a scatter of empty purses. Someone has been living in this ruin.', journal: 'Find the thieves\' hideout in the ruin on the wooded point south-east of Kingshaven.' }],
    ['kill', '', { mob: 'highway thief', count: 4, what: 'highway thieves beaten', journal: 'Beat 4 highway thieves on the wooded point.' }],
    ['bring', WEXLEY, { item: 'stolen purse', take: true, says: 'Did you get back what they took?', answer: 'A stolen purse', reply: 'That\'s Pedlar Jory\'s, by the stitching. He\'ll weep with joy.', journal: 'Bring a stolen purse back to Sergeant Wexley. The thieves carry them.' }],
  ]),

  quest('kw_barrow', {
    title: 'The Barrow in the Hills',
    giver: WEXLEY,
    requires: 'kw_coastroad',
    notYet: 'One thing at a time. The coast road first.',
    offer: {
      says: 'No job for a fresh recruit, this: the dead walk round an old barrow in the hills north-east. Two of my men went; one came back. Will you go?',
      accept: 'I will go',
      acceptReply: 'Go east from here, then north into the hills. The valley opens to the east. Put the dead back in the ground, and whatever leads them.',
      decline: 'Not yet',
      declineReply: 'Wise. Grow a little first, and come back.',
    },
    reminder: 'The barrow is in the hidden valley in the hills north-east. Put the dead to rest.',
    reward: { gold: 200, exp: 450, items: ['iron helmet'], says: 'An iron helmet, the Captain\'s own spare. She insisted.' },
    after: 'The valley is quiet again. Kingshaven owes you more than it will ever say.',
  }, [
    ['place', '', { x: BARROW[0], y: BARROW[1], radius: 5, what: 'the barrow', arrive: 'A low mound of old stones, its door broken open from the inside. The air is cold, and something moves in the dark.', journal: 'Find the old barrow in the hidden valley in the hills north-east of Kingshaven.' }],
    ['kill', '', { mob: 'barrow skeleton', count: 5, what: 'barrow skeletons put to rest', journal: 'Put 5 barrow skeletons to rest in the valley.' }],
    ['kill', '', { mob: 'barrow skeleton knight', count: 1, what: 'the barrow\'s knight', journal: 'Destroy the skeleton knight in the barrow.' }],
    ['talk', WEXLEY, { says: 'You came back. That\'s more than I hoped.', answer: 'The barrow is quiet', reply: 'Then it\'s done. I\'ll have the stones sealed by morning.', journal: 'Tell Sergeant Wexley the barrow is quiet.' }],
  ]),
];

const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

const own = {
  [WEXLEY]: { shouts: ['The Watch needs hands! See Sergeant Wexley at the post!'], stages: [{ when: { kind: 'always', value: '' }, says: 'Keep your blade clean and your eyes open. That\'s the Watch.', answers: [] }] },
};
const talk = (name) => QUESTS.reduce((dlg, q) => mergeQuest(dlg, q, name), own[name]);

export default {
  name: 'The King\'s Watch',
  origin: O,
  size: [190, 170],
  seed: 53,
  // Grass and meadow only: no trees cut, no walls touched.
  mayBuild: (t) => [1, 36, 37].includes(t),
  build(p) {
    const P = (x, y) => at(x, y);
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file('defItems/stolen purse', itemFile('a purse of fine leather, slit at the strings', 7));

    // The Watch post outside the east gate.
    p.building(...P(1499, 340), 7, 5, { doors: [['s', 3]] });
    p.npc({ name: WEXLEY, look: 'Guard', desc: 'Sergeant Wexley of the King\'s Watch, grey at the temples, a notched sword at her hip.', x: 1502 - O[0], y: 342 - O[1], dlg: talk(WEXLEY) });
    p.sign('Watch Post', 'The King\'s Watch', ...P(1504, 346));

    // (No signposts to the Watch post or the meadow: signs are names only,
    // the user, 2026-10-29. The east gate guard and townsfolk point the way.)

    // Stray hounds in the meadow north of the farms.
    for (const [x, y] of [[1420, 282], [1424, 286], [1427, 280], [1419, 289], [1421, 291], [1422, 279]]) p.mob('stray hound', 1, ...P(x, y));

    // The thieves on the wooded point.
    for (const [x, y] of [[1489, 415], [1488, 413], [1492, 416], [1493, 419], [1495, 416]]) p.mob('highway thief', 1, ...P(x, y));

    // The barrow: a low ring of old stone, its door broken open.
    p.building(...P(BARROW[0] - 3, BARROW[1] - 2), 7, 5, { wall: 'S', floor: 'k', doors: [['s', 3]] });
    p.mob('barrow skeleton knight', 1, ...P(BARROW[0], BARROW[1]));
    for (const [x, y] of [[1552, 288], [1558, 284], [1566, 286], [1572, 292], [1556, 295], [1566, 296]]) p.mob('barrow skeleton', 1, ...P(x, y));
    p.sign('Old Barrow', 'Here lie the kings of the hill people. Let them sleep.', ...P(BARROW[0] + 4, BARROW[1] + 3));

    for (const q of QUESTS) p.quest(q);
  },
};
