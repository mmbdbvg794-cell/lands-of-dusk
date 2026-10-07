// The Izaru Deeps: a quest chain from Midnight, three quests for every race,
// from the mine foreman outside the Izaru Mine Shop. Built by
// tools/world/city.mjs; the quests are in the God tab's quest wizard's
// shape (js/quests.js), so they open and can be changed there afterwards.
//
//   1 Slimes in the Workings  Foreman Dask: rock slimes in the upper workings
//   2 The Missing Miners      Foreman Dask: the miners' camp deeper down,
//                             the stalkers who took them, and a miner's lamp
//   3 What Woke Below         Foreman Dask: the deep chamber, its cinder
//                             slimes and the stone dragon
//
// Each needs the one before. Places on the map (absolute):
//   the foreman, outside the mine shop      441, 82
//   the mine stairs, on the south plaza     450, 85
//   the mine (sealed, dug from rock and forest south of the desert)
//                                           340-403, 280-333
//     entry hall 344-354 x 284-290, upper workings 356-380 x 283-294,
//     miners' camp 368-390 x 304-312, deep chamber 360-400 x 320-331
// The monsters are new (defMobs files below), named so the Painted art
// draws them from a family (slime, person, dragon). Quests 1-2 suit a new
// character; the stone dragon (340 HP, strength 44) is one to grow into.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const O = [340, 80]; // from Midnight's plaza down to the mine
const MINE = [340, 280]; // the mine's top-left corner
const FOREMAN = 'Foreman Dask';
const STAIRS = [450, 85]; // down, on Midnight's south plaza
const IN = [348, 287]; // where the stairs bring you
const UP = [348, 285]; // the stairs back up
const CAMP = [379, 308];
const DEEP = [380, 326];

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
// creature AI's grudges); the dragon has a faction of its own.
const MOBS = {
  'rock slime': { maxhp: 30, maxsp: 0, stre: 16, inte: 1, dext: 3, wisd: 1, cons: 8, bravery: '3.0', grouprelation: '0.9', image: 33, faction: 'rock slime' },
  'mine stalker': { maxhp: 75, maxsp: 10, stre: 24, inte: 6, dext: 14, wisd: 5, cons: 11, bravery: '3.0', grouprelation: '0.6', image: 4, giveitem: [['miners lamp', '0.4']], faction: 'mine stalker' },
  'cinder slime': { maxhp: 130, maxsp: 0, stre: 23, inte: 1, dext: 12, wisd: 1, cons: 20, bravery: '3.0', grouprelation: '0.9', image: 33, faction: 'cinder' },
  'stone dragon': { maxhp: 340, maxsp: 40, stre: 44, inte: 20, dext: 28, wisd: 20, cons: 35, bravery: '3.0', grouprelation: '0.9', image: 45, faction: 'stone dragon' },
};

const QUESTS = [
  quest('iz_slimes', {
    title: 'Slimes in the Workings',
    giver: FOREMAN,
    offer: {
      says: 'You look like you can hold a blade. My diggers won\'t go below. Slimes have come up through the rock into the upper workings, and they eat through boots. Clear them out and the Izaru mine works again.',
      accept: 'I will clear them out',
      acceptReply: 'The stairs are on the plaza, just south of here. Go down and through the first hall. The workings open up beyond it. Six should do.',
      decline: 'Not now',
      declineReply: 'The rock isn\'t going anywhere. Neither are the slimes.',
    },
    reminder: 'The slimes are in the upper workings, down the stairs on the south plaza.',
    reward: { gold: 40, exp: 60, items: ['leather pants'], says: 'Here, digger\'s leathers. Slime won\'t eat through these.' },
    after: 'The picks are ringing again. That\'s the best sound in Midnight.',
  }, [
    ['kill', '', { mob: 'rock slime', count: 6, what: 'rock slimes cleared', journal: 'Clear 6 rock slimes from the upper workings of the Izaru mine (the stairs are on Midnight\'s south plaza).' }],
    ['talk', FOREMAN, { says: 'Well? Are my workings clear?', answer: 'The slimes are gone', reply: 'Good. My diggers owe you a drink, and they\'ll grumble about it.', journal: 'Tell Foreman Dask, outside the Izaru Mine Shop, that the workings are clear.' }],
  ]),

  quest('iz_miners', {
    title: 'The Missing Miners',
    giver: FOREMAN,
    requires: 'iz_slimes',
    offer: {
      says: 'Two of my best went deeper than they should, after a seam of silver. That was a week ago. Their camp is past the workings and down. Find out what happened to them.',
      accept: 'I will find them',
      acceptReply: 'Go through the workings and take the tunnel down. Their camp is at the bottom of it. Bring back whatever you find of them.',
      decline: 'Not yet',
      declineReply: 'They\'ve waited a week. Don\'t make it two.',
    },
    reminder: 'The miners\' camp is past the upper workings and down the tunnel. Bring me something of theirs.',
    reward: { gold: 90, exp: 160, items: ['iron gloves'], says: 'Iron gloves. One of them would want you to have his.' },
    after: 'At least now we know. We\'ll raise a stone for them on the plaza.',
  }, [
    ['place', '', { x: CAMP[0], y: CAMP[1], radius: 5, what: 'the miners\' camp', arrive: 'A cold fire, two bedrolls, a pick dropped mid-swing. Pale shapes move at the edge of the lamplight.', journal: 'Find the missing miners\' camp, past the upper workings of the Izaru mine.' }],
    ['kill', '', { mob: 'mine stalker', count: 4, what: 'mine stalkers beaten', journal: 'Beat 4 mine stalkers round the miners\' camp.' }],
    ['bring', FOREMAN, { item: 'miners lamp', take: true, says: 'Did you find them?', answer: 'A miner\'s lamp', reply: 'That\'s Holt\'s lamp, his initials on the handle. Thank you for bringing it back.', journal: 'Bring a miner\'s lamp back to Foreman Dask. The stalkers carry them.' }],
  ]),

  quest('iz_deep', {
    title: 'What Woke Below',
    giver: FOREMAN,
    requires: 'iz_miners',
    notYet: 'Find my miners first. Then we\'ll talk about the deep.',
    offer: {
      says: 'The stalkers came up from somewhere, and so did the slimes. Below the miners\' camp the rock gets hot, and something down there breathes. The old diggers called it a stone dragon. This is no job for a fresh hand. Will you go?',
      accept: 'I will go',
      acceptReply: 'Past the camp, the tunnel goes down to the deep chamber. Clear out what\'s burning down there, and the thing that woke it.',
      decline: 'Not yet',
      declineReply: 'Wise. Grow a little first, and come back.',
    },
    reminder: 'The deep chamber is below the miners\' camp. Put down the stone dragon.',
    reward: { gold: 200, exp: 450, items: ['bastard sword'], says: 'A bastard sword. Izaru forged it years ago, for whoever finally did this.' },
    after: 'The deep is cold again. The Izaru mine owes you its life.',
  }, [
    ['place', '', { x: DEEP[0], y: DEEP[1], radius: 6, what: 'the deep chamber', arrive: 'Heat rolls off pools of molten rock. Something huge shifts in the glow, and the stone itself seems to breathe.', journal: 'Find the deep chamber below the miners\' camp in the Izaru mine.' }],
    ['kill', '', { mob: 'cinder slime', count: 5, what: 'cinder slimes cleared', journal: 'Clear 5 cinder slimes from the deep chamber.' }],
    ['kill', '', { mob: 'stone dragon', count: 1, what: 'the stone dragon', journal: 'Kill the stone dragon in the deep chamber.' }],
    ['talk', FOREMAN, { says: 'You\'re alive. I didn\'t dare hope.', answer: 'The deep is quiet', reply: 'Then the mine is ours again. Midnight won\'t forget it.', journal: 'Tell Foreman Dask the deep is quiet.' }],
  ]),
];

const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

const own = {
  [FOREMAN]: { shouts: ['Hands wanted for the Izaru mine! See the foreman!'], stages: [{ when: { kind: 'always', value: '' }, says: 'Rock, sweat and silver. That\'s the Izaru mine.', answers: [] }] },
};
const talk = (name) => QUESTS.reduce((dlg, q) => mergeQuest(dlg, q, name), own[name]);

const go = (says, x, y) => [{ when: { kind: 'always', value: '' }, speaker: '', says, effects: [{ kind: 'teleport', x, y }] }];

export default {
  name: 'The Izaru Deeps',
  origin: O,
  size: [120, 254],
  seed: 67,
  oldWorld: true,
  // The mine is dug from rock and forest no one can reach. The stairs on
  // the plaza are a far square (placed on purpose).
  mayBuild: (t) => [49, 64, 103].includes(t),
  build(p) {
    const M = (x, y) => [x - O[0], y - O[1]];
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file('defItems/miners lamp', itemFile('a dented miner\'s lamp, initials scratched on the handle', 7));

    // The foreman, outside the mine shop, and the stairs on the plaza.
    p.npc({ name: FOREMAN, look: 'Villager Man', desc: 'Foreman Dask, broad and dusty, a pick over one shoulder.', x: 441 - O[0], y: 82 - O[1], dlg: talk(FOREMAN) });
    p.farTile(...STAIRS, 'u');
    p.farAction(...STAIRS, go('You go down the mine stairs, into the warm dark.', IN[0], IN[1]));

    // The mine: rock all round, dug out hall by hall.
    p.fill(...M(...MINE), 64, 54, 'R');
    p.fill(...M(344, 284), 11, 7, 'e'); // entry hall
    p.set(...M(...UP), 'U');
    p.action(...M(...UP), go('You climb the stairs back up to Midnight.', STAIRS[0], STAIRS[1] + 1));
    p.fill(...M(355, 286), 2, 3, 'e'); // to the workings
    p.oval(...M(356, 283), 25, 12, 'e'); // upper workings
    p.fill(...M(376, 294), 3, 10, 'e'); // tunnel down
    p.oval(...M(368, 303), 23, 10, 'e'); // miners' camp
    p.fill(...M(386, 312), 3, 8, 'e'); // tunnel down again
    p.oval(...M(360, 319), 41, 13, 'k'); // deep chamber
    for (const [x, y] of [[366, 323], [367, 324], [392, 327], [393, 326], [393, 327], [374, 329]]) p.set(...M(x, y), 'L');
    for (const [x, y] of [[344, 283], [352, 283], [362, 282], [372, 282], [380, 302], [368, 307], [362, 319], [396, 321]]) p.set(...M(x, y), 'i');
    for (const [x, y] of [[360, 287], [365, 290], [370, 286], [374, 291], [377, 287], [363, 285]]) p.mob('rock slime', 1, ...M(x, y));
    for (const [x, y] of [[372, 305], [384, 307], [386, 310], [374, 310]]) p.mob('mine stalker', 1, ...M(x, y));
    for (const [x, y] of [[368, 322], [372, 327], [388, 323], [384, 329], [396, 325], [377, 321]]) p.mob('cinder slime', 1, ...M(x, y));
    p.mob('stone dragon', 1, ...M(380, 325));
    p.prop('pickaxe', ...M(377, 308));
    p.prop('campfire', ...M(380, 307));
    p.prop('barrel', ...M(371, 308));
    p.sign('Upper Workings', 'Izaru Mine. Mind your head, mind your feet, mind the slimes.', ...M(352, 287));

    for (const q of QUESTS) p.quest(q);
  },
};
