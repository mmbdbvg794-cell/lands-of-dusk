// The Green Wardens: a quest chain round Aelindor, three quests for every
// race that comes to the elven city, from a ranger on the road north of
// its gate. Built by tools/world/city.mjs; the quests are in the God
// tab's quest wizard's shape (js/quests.js).
//
//   1 Foul Water           Ranger Faelwen: slimers fouling the lake shore
//                          east of the city
//   2 The Waking Stones    Ranger Faelwen: the old shrine on the eastern
//                          slopes of the western mountains, its gargoyles,
//                          a heartstone
//   3 The Withered Grove   Ranger Faelwen: the blight in the woods far east,
//                          its wolves, and the bear at its heart
//
// Each needs the one before. Places on the map (absolute):
//   Ranger Faelwen, on the road north of the gate   466, 1206
//   the lake slimers, round the lake's west shore   around 560, 1275
//   the old shrine                                  around 395, 1250
//   the withered grove                              around 618, 1178
// Quests 1-2 suit a new character; the blighted bear (360 HP, strength
// 44) is one to grow into.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const O = [380, 1170];
const at = (x, y) => [x - O[0], y - O[1]];

const FAELWEN = 'Ranger Faelwen';
const SHRINE = [395, 1250];
const GROVE = [618, 1178];

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

// A monster file (defMobs): the engine's keys, one per line, then ".".
const mobFile = (stats) => Object.entries(stats).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((d) => [k, ...d]) : [k, v])).join('\n') + '\n.\n';
const itemFile = (desc, image) => `type\nitem\ndescription\n${desc}\nimage\n${image}\n.\n`;

// Bravery 3 (server/Creatures.java FEARLESS): they never run. The weakest
// are strength 16, dexterity 3, so a new character in a cloth shirt feels
// them (damage is strength/2 x 0.5-1.5 less the target's dexterity).
// Each den is one faction, so killing one sets the rest on you (the
// creature AI's grudges); the blighted bear has a faction of its own, so it only
// fights the player who attacks it, not alongside its den.
const MOBS = {
  'lake slimer': { maxhp: 30, maxsp: 0, stre: 16, inte: 1, dext: 3, wisd: 1, cons: 8, bravery: '3.0', grouprelation: '0.9', image: 33, faction: 'lake slimer' },
  'shrine gargoyle': { maxhp: 60, maxsp: 10, stre: 22, inte: 2, dext: 6, wisd: 2, cons: 12, bravery: '3.0', grouprelation: '0.6', image: 4, giveitem: [['heartstone', '0.4']], faction: 'shrine gargoyle' },
  'blighted wolf': { maxhp: 140, maxsp: 0, stre: 26, inte: 1, dext: 20, wisd: 4, cons: 18, bravery: '3.0', grouprelation: '0.9', image: 21, faction: 'blight' },
  'blighted bear': { maxhp: 360, maxsp: 0, stre: 44, inte: 1, dext: 20, wisd: 4, cons: 35, bravery: '3.0', grouprelation: '0.9', image: 12, faction: 'blighted bear' },
};

const QUESTS = [
  quest('gw_water', {
    title: 'Foul Water',
    giver: FAELWEN,
    offer: {
      says: 'Well met, traveller. Slimers have come up out of the lake east of the city, and where they crawl the water sours. The Moonwell is fed from that lake. Will you drive them back?',
      accept: 'I will drive them back',
      acceptReply: 'Follow the shore east of the city. Five should be enough to turn the rest.',
      decline: 'Not now',
      declineReply: 'The lake will wait, for a while.',
    },
    reminder: 'The slimers are on the lake shore east of the city.',
    reward: { gold: 40, exp: 60, items: ['leather belt'], says: 'A ranger\'s belt. Wear it, and the woods will know you.' },
    after: 'The water is sweet again. The trees remember kindness.',
  }, [
    ['kill', '', { mob: 'lake slimer', count: 5, what: 'lake slimers destroyed', journal: 'Destroy 5 lake slimers on the lake shore east of Aelindor.' }],
    ['talk', FAELWEN, { says: 'The shore is quieter. Was that you?', answer: 'The slimers are gone', reply: 'Then the Moonwell runs clean. Thank you.', journal: 'Tell Ranger Faelwen, on the road north of Aelindor\'s gate, that the slimers are gone.' }],
  ]),

  quest('gw_stones', {
    title: 'The Waking Stones',
    giver: FAELWEN,
    requires: 'gw_water',
    offer: {
      says: 'An old shrine stands on the eastern slopes of the western mountains, older than Aelindor. Its stone guardians have woken, and they strike at anyone who passes. Something stirs them. Bring me a heartstone from one, and I may learn what.',
      accept: 'I will go to the shrine',
      acceptReply: 'West of the city, where the woods meet the mountains. The gargoyles there are not the common kind. Mind their fists.',
      decline: 'Not yet',
      declineReply: 'Stone is patient. So am I.',
    },
    reminder: 'The shrine is west of the city, on the mountains\' eastern slopes. Bring me a heartstone.',
    reward: { gold: 90, exp: 160, items: ['long sword'], says: 'A long sword of elven steel. It is lighter than it looks.' },
    after: 'The heartstone hums with something old. The Elders are studying it.',
  }, [
    ['place', '', { x: SHRINE[0], y: SHRINE[1], radius: 4, what: 'the old shrine', arrive: 'Broken pillars, moss-covered steps, and pedestals standing empty. Their guardians are awake.', journal: 'Find the old shrine on the eastern slopes of the mountains west of Aelindor.' }],
    ['kill', '', { mob: 'shrine gargoyle', count: 4, what: 'shrine gargoyles broken', journal: 'Break 4 shrine gargoyles at the old shrine.' }],
    ['bring', FAELWEN, { item: 'heartstone', take: true, says: 'Did you find a heartstone?', answer: 'A heartstone', reply: 'Feel how it hums. This was cut by no elf. I must show the Elders.', journal: 'Bring a heartstone to Ranger Faelwen. The shrine gargoyles carry them.' }],
  ]),

  quest('gw_grove', {
    title: 'The Withered Grove',
    giver: FAELWEN,
    requires: 'gw_stones',
    notYet: 'The shrine first. One mystery at a time.',
    offer: {
      says: 'The heartstone pointed east. Far east of the city a grove is withering, and the beasts that live there have turned. Wolves with grey, rotten fur, and something larger at the heart of it. Go, and end it.',
      accept: 'I will end it',
      acceptReply: 'East, past the lake and through the woods. You will know the grove when the leaves turn grey. Be careful. This is no task for the green.',
      decline: 'Not yet',
      declineReply: 'Grow stronger. The blight will still be there, I fear.',
    },
    reminder: 'The withered grove is far east of the city. End the blight.',
    reward: { gold: 200, exp: 450, items: ['elven chain mail'], says: 'Elven chain mail, woven in the Moonwell\'s light. Few outside the city ever wear it.' },
    after: 'The grove is greening again. The Green Wardens count you one of their own.',
  }, [
    ['place', '', { x: GROVE[0], y: GROVE[1], radius: 5, what: 'the withered grove', arrive: 'The leaves here are grey and curling, the bark split and weeping. The blight is strongest here.', journal: 'Find the withered grove in the woods far east of Aelindor.' }],
    ['kill', '', { mob: 'blighted wolf', count: 4, what: 'blighted wolves slain', journal: 'Kill 4 blighted wolves in the withered grove.' }],
    ['kill', '', { mob: 'blighted bear', count: 1, what: 'the blighted bear', journal: 'Kill the blighted bear at the heart of the withered grove.' }],
    ['talk', FAELWEN, { says: 'I felt the woods breathe out. Was it you?', answer: 'The blight is ended', reply: 'Then the grove will heal. The Wardens will not forget this.', journal: 'Tell Ranger Faelwen the blight is ended.' }],
  ]),
];

const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

const own = {
  [FAELWEN]: { shouts: ['Travellers! The Green Wardens need help!'], stages: [{ when: { kind: 'always', value: '' }, says: 'Walk softly. The woods are listening.', answers: [] }] },
};
const talk = (name) => QUESTS.reduce((dlg, q) => mergeQuest(dlg, q, name), own[name]);

export default {
  name: 'The Green Wardens',
  origin: O,
  size: [260, 160],
  seed: 67,
  // Nothing is built: monsters, signs and one NPC.
  mayBuild: () => false,
  build(p) {
    const P = (x, y) => at(x, y);
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file('defItems/heartstone', itemFile('a fist-sized stone, warm, humming faintly', 7));

    p.npc({ name: FAELWEN, look: 'Elf Woman', desc: 'Ranger Faelwen of the Green Wardens, cloaked in leaf-green, a longbow on her back.', x: 466 - O[0], y: 1206 - O[1], dlg: talk(FAELWEN) });
    p.sign('Green Wardens', 'The Green Wardens. Help for the woods, asked and given.', ...P(468, 1210));

    for (const [x, y] of [[534, 1269], [545, 1266], [560, 1276], [575, 1280], [584, 1290], [566, 1272]]) p.mob('lake slimer', 1, ...P(x, y));
    for (const [x, y] of [[391, 1254], [399, 1245], [388, 1256], [394, 1258], [400, 1253]]) p.mob('shrine gargoyle', 1, ...P(x, y));
    p.sign('Old Shrine', 'Carved too worn to read. The pedestals are empty.', ...P(397, 1248));
    for (const [x, y] of [[615, 1179], [617, 1176], [619, 1174], [621, 1176], [622, 1173]]) p.mob('blighted wolf', 1, ...P(x, y));
    p.mob('blighted bear', 1, ...P(618, 1179));
    p.sign('Withered Grove', 'The leaves are grey here.', ...P(615, 1182));

    for (const q of QUESTS) p.quest(q);
  },
};
