// The Frozen Reach: a quest chain from the village in the east field (the
// old world's open grassland east of Midnight), three quests for every
// race, from the village's Reeve. Built by tools/world/city.mjs; the
// quests are in the God tab's quest wizard's shape (js/quests.js), so they
// open and can be changed there afterwards.
//
//   1 Wolves in the Field   Reeve Osric: white wolves in the field's south
//   2 Through the Trees     Reeve Osric: the gap in the tree line at the
//                           field's south-east corner, the frozen land
//                           beyond it, its frost bears and a pelt
//   3 The Frost Dragon      Reeve Osric: the lair at the far end of the
//                           frozen land, its ice skeletons and the dragon
//
// Each needs the one before. Places on the map (absolute):
//   the Reeve, in the village                 530, 14
//   the white wolves, the field's south       around 655, 205
//   the gap in the tree line                  690-698, 216-218
//   the frost bears, the frozen land's north  around 735, 240
//   the dragon's lair, the far south-east     around 795, 325
// The frozen land (x 676-810, y 215-365) was sealed off by a line of trees
// until this chain cut a gap in it; nothing else on the map changes. The
// monsters are new (defMobs files below), named so the Painted art draws
// them from a family (wolf, bear, skeleton, dragon). Quests 1-2 suit a new
// character; the frost dragon (350 HP, strength 45) is one to grow into.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const O = [510, 5];
const at = (x, y) => [x - O[0], y - O[1]];

const REEVE = 'Reeve Osric';
const GAP = [697, 217];
const LAIR = [795, 325];

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
// creature AI's grudges); the dragon has a faction of its own.
const MOBS = {
  'frost wolf': { maxhp: 28, maxsp: 0, stre: 28, inte: 1, dext: 3, wisd: 3, cons: 6, bravery: '3.0', grouprelation: '0.7', image: 21, faction: 'frost wolf' },
  'frost bear': { maxhp: 80, maxsp: 0, stre: 40, inte: 1, dext: 10, wisd: 3, cons: 13, bravery: '3.0', grouprelation: '0.5', image: 12, giveitem: [['frost pelt', '0.4']], faction: 'frost bear' },
  'ice skeleton': { maxhp: 125, maxsp: 0, stre: 55, inte: 1, dext: 15, wisd: 1, cons: 15, bravery: '3.0', grouprelation: '0.9', image: 32, faction: 'ice skeleton' },
  'frost dragon': { maxhp: 350, maxsp: 40, stre: 70, inte: 20, dext: 30, wisd: 20, cons: 35, bravery: '3.0', grouprelation: '0.9', image: 45, faction: 'frost dragon' },
};

const QUESTS = [
  quest('fr_wolves', {
    title: 'Wolves in the Field',
    giver: REEVE,
    offer: {
      says: 'You\'ve come a long way to find us. Perhaps the gods sent you. White wolves have come into the field, down at its south end. We\'ve never seen their like, and they\'ve taken two of our goats. Will you drive them off?',
      accept: 'I will drive them off',
      acceptReply: 'Thank you. Walk south through the field, past the stream. They den at the far end, by the tree line. Five should scare the rest away.',
      decline: 'Not now',
      declineReply: 'We\'ll keep the goats in, then. Come back if you can.',
    },
    reminder: 'The white wolves are at the field\'s south end, by the tree line.',
    reward: { gold: 40, exp: 60, items: ['pelt'], says: 'Take this pelt. Winters out here are long.' },
    after: 'The goats are out again. We\'ve few children left, but they named one after you.',
  }, [
    ['kill', '', { mob: 'frost wolf', count: 5, what: 'white wolves driven off', journal: 'Drive off 5 white wolves at the south end of the east field.' }],
    ['talk', REEVE, { says: 'Back from the south end?', answer: 'The wolves are gone', reply: 'Then we can sleep. But where did white wolves come from?', journal: 'Tell Reeve Osric, in the village at the top of the east field, that the wolves are gone.' }],
  ]),

  quest('fr_pass', {
    title: 'Through the Trees',
    giver: REEVE,
    requires: 'fr_wolves',
    offer: {
      says: 'I\'ve been thinking about those wolves. Old folk say there\'s a frozen land beyond the trees at the field\'s south-east corner, sealed off since before the village. The autumn storm brought trees down there. If there\'s a way through, the wolves found it. Will you look?',
      accept: 'I will look',
      acceptReply: 'Go to the south-east corner of the field, where the old trees stand. If there\'s a gap, go through. Bring back proof of what lives there.',
      decline: 'Not yet',
      declineReply: 'It\'s been sealed this long. A little longer won\'t hurt.',
    },
    reminder: 'Find the gap in the trees at the field\'s south-east corner, and bring back proof of what lives beyond.',
    reward: { gold: 90, exp: 160, items: ['bronze helmet'], says: 'A bronze helmet, from my father\'s days in the Watch. Wear it in good health.' },
    after: 'A frozen land, right on our doorstep. Nobody will believe it.',
  }, [
    ['place', '', { x: GAP[0], y: GAP[1], radius: 4, what: 'the gap in the trees', arrive: 'The storm has torn a gap in the old tree line. Beyond it, the ground turns white and the air bites. Paw prints lead in both ways.', journal: 'Find the gap in the tree line at the south-east corner of the east field.' }],
    ['kill', '', { mob: 'frost bear', count: 3, what: 'frost bears beaten', journal: 'Beat 3 frost bears in the frozen land beyond the trees.' }],
    ['bring', REEVE, { item: 'frost pelt', take: true, says: 'What did you find?', answer: 'A frost bear\'s pelt', reply: 'White as snow and twice as cold. The old folk were right.', journal: 'Bring a frost bear\'s pelt back to Reeve Osric. The frost bears carry them.' }],
  ]),

  quest('fr_dragon', {
    title: 'The Frost Dragon',
    giver: REEVE,
    requires: 'fr_pass',
    notYet: 'See what\'s beyond the trees first. Then we\'ll talk.',
    offer: {
      says: 'The old folk have one more story. A dragon of ice sleeps at the far end of the frozen land, and its waking drives the beasts out. With the trees down, nothing stands between it and us. This is no job for a fresh hand. Will you go?',
      accept: 'I will go',
      acceptReply: 'Cross the frozen land to its far south-east corner. Its lair is there, they say, guarded by the bones of those who tried before. Put it back to sleep. For good.',
      decline: 'Not yet',
      declineReply: 'Wise. Grow a little first, and come back.',
    },
    reminder: 'The frost dragon\'s lair is at the far south-east of the frozen land.',
    reward: { gold: 200, exp: 450, items: ['diamond belt'], says: 'A diamond belt. It\'s all the village had of worth, and you\'ve earned it twice over.' },
    after: 'The frozen land is quiet. The village owes you everything.',
  }, [
    ['place', '', { x: LAIR[0], y: LAIR[1], radius: 6, what: 'the dragon\'s lair', arrive: 'Old ice walls, and bones frozen into them. The cold here is alive, and it breathes.', journal: 'Find the frost dragon\'s lair at the far south-east of the frozen land.' }],
    ['kill', '', { mob: 'ice skeleton', count: 5, what: 'ice skeletons put to rest', journal: 'Put 5 ice skeletons to rest round the lair.' }],
    ['kill', '', { mob: 'frost dragon', count: 1, what: 'the frost dragon', journal: 'Kill the frost dragon.' }],
    ['talk', REEVE, { says: 'You came back! We saw the sky go strange.', answer: 'The dragon is dead', reply: 'Then we\'re safe. All of us, thanks to you.', journal: 'Tell Reeve Osric the frost dragon is dead.' }],
  ]),
];

const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

const own = {
  [REEVE]: { shouts: ['Travellers! The village could use a strong arm. See the Reeve!'], stages: [{ when: { kind: 'always', value: '' }, says: 'Goats, grass and quiet. There were forty families in this field once. Nine stayed.', answers: [
    { label: 'What\'s down the field?', reply: 'Some nights a cold light moves at the far end, and the dead walk with it. We bar the doors and don\'t look.', effects: [] },
  ] }] },
};
const talk = (name) => QUESTS.reduce((dlg, q) => mergeQuest(dlg, q, name), own[name]);

export default {
  name: 'The Frozen Reach',
  origin: O,
  size: [300, 360],
  seed: 71,
  oldWorld: true,
  // Only the trees in the gap are cut.
  mayBuild: (t) => [103, 64].includes(t),
  build(p) {
    const P = (x, y) => at(x, y);
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file('defItems/frost pelt', itemFile('a frost bear\'s pelt, white and stiff with cold', 7));

    p.npc({ name: REEVE, look: 'Villager Man', desc: 'Reeve Osric, sun-browned and sharp-eyed, a shepherd\'s crook in hand.', x: 530 - O[0], y: 14 - O[1], dlg: talk(REEVE) });
    p.sign('Southfield', 'Southfield village. Visitors welcome; wolves not.', ...P(527, 16));

    // White wolves at the field's south end.
    for (const [x, y] of [[650, 203], [656, 207], [662, 201], [668, 206], [653, 210], [660, 212]]) p.mob('frost wolf', 1, ...P(x, y));

    // The gap the storm tore in the tree line, and the stray trees in
    // front of it.
    p.fill(...P(690, 216), 9, 3, ',');

    // Frost bears in the frozen land's north.
    for (const [x, y] of [[725, 235], [738, 242], [748, 232], [733, 252]]) p.mob('frost bear', 1, ...P(x, y));

    // The lair: ice skeletons round the old walls, the dragon in the middle.
    for (const [x, y] of [[782, 318], [790, 312], [800, 316], [786, 330], [778, 326], [804, 322]]) p.mob('ice skeleton', 1, ...P(x, y));
    p.mob('frost dragon', 1, ...P(...LAIR));
    p.sign('Bones', 'Turn back.', ...P(775, 312));

    for (const q of QUESTS) p.quest(q);
  },
};
