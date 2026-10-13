// The Zilen Legacy: a quest chain round the City of Light, three quests for
// every race, from the Tombkeeper in King Zilen's graveyard (the walled yard
// in the forest at the city's north-west corner). Built by
// tools/world/city.mjs; the quests are in the God tab's quest wizard's
// shape (js/quests.js), so they open and can be changed there afterwards.
//
//   1 Robbers at the Grave   Tombkeeper Aldous: grave thieves in a glade
//                            west of the south road, and the grave goods
//   2 The King's Crown       Tombkeeper Aldous: the robbers' leader in a
//                            ruined tower east of the south road
//   3 The King's Guard       Tombkeeper Aldous: the crypt under the robbers'
//                            camp, its skeletons and the skeleton warlord
//
// Each needs the one before. Places on the map (absolute):
//   the Tombkeeper, in the graveyard                42, 111
//   the robbers' glade, off the south road (x 106)  61-87, 271-289 (trail y 280)
//   the ruined tower, off the south road            134-160, 241-259 (trail y 250)
//   the crypt (sealed; stairs in the robbers' glade) 12-55, 236-279
// The old world is forest with roads, so the glades and trails are cut
// from trees, and the crypt is dug out of forest no one can reach, with
// stairs down from the glade and up again. The monsters are new (defMobs
// files below), named so the Painted art draws them from a family
// (person, skeleton). Quests 1-2 suit a new character; the skeleton
// warlord (330 HP, strength 43) is one to grow into.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';
import { dawnward } from './dawnward.mjs';
import { firetown } from './firetown.mjs';

const O = [12, 105];
const at = (x, y) => [x - O[0], y - O[1]];

const KEEPER = 'Tombkeeper Aldous';
const GLADE = [74, 280]; // the robbers' camp
const TOWER = [147, 250];
const CRYPT = [12, 236]; // the crypt's top-left corner
const CRYPT_DOWN = [78, 276]; // the stairs down, in the robbers' glade
const CRYPT_IN = [20, 243]; // where the stairs down bring you
const CRYPT_UP = [20, 241]; // the stairs back up
const WARLORD = [40, 274];

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
// creature AI's grudges); the bosses have factions of their own.
const MOBS = {
  'grave thief': { maxhp: 30, maxsp: 0, stre: 28, inte: 4, dext: 3, wisd: 3, cons: 7, bravery: '3.0', grouprelation: '0.6', image: 2, giveitem: [['grave goods', '0.5']], faction: 'grave thief' },
  'robber guard': { maxhp: 70, maxsp: 10, stre: 40, inte: 6, dext: 13, wisd: 5, cons: 10, bravery: '3.0', grouprelation: '0.6', image: 2, faction: 'robber' },
  'robber boss': { maxhp: 110, maxsp: 10, stre: 40, inte: 8, dext: 15, wisd: 6, cons: 13, bravery: '3.0', grouprelation: '0.5', image: 2, giveitem: [['zilen crown', '1.0']], faction: 'robber boss' },
  'crypt skeleton': { maxhp: 120, maxsp: 0, stre: 55, inte: 1, dext: 15, wisd: 1, cons: 15, bravery: '3.0', grouprelation: '0.9', image: 32, faction: 'crypt' },
  'skeleton warlord': { maxhp: 330, maxsp: 10, stre: 70, inte: 10, dext: 30, wisd: 10, cons: 30, bravery: '3.0', grouprelation: '0.9', image: 32, faction: 'skeleton warlord' },
};

const QUESTS = [
  quest('zl_robbers', {
    title: 'Robbers at the Grave',
    giver: KEEPER,
    offer: {
      says: 'Look at this. Spade marks, at the foot of good King Zilen\'s own grave. Grave thieves, from the forest south of the city. They took what was buried with his queen, too. Will you go after them?',
      accept: 'I will go after them',
      acceptReply: 'Bless you. Take the south road out of the city. Partway down, a trail cuts west into the trees. Their camp is at the end of it. Bring back what they took.',
      decline: 'Not now',
      declineReply: 'The dead are patient. I am less so. Come back if you change your mind.',
    },
    reminder: 'The grave thieves are camped west of the south road. Bring back the grave goods.',
    reward: { gold: 40, exp: 60, items: ['leather gloves'], says: 'Take these gloves. A gravedigger\'s, but good leather.' },
    after: 'The queen\'s grave is whole again. The old king can rest easier.',
  }, [
    ['kill', '', { mob: 'grave thief', count: 4, what: 'grave thieves beaten', journal: 'Beat 4 grave thieves at their camp, west of the road south of the City of Light.' }],
    ['bring', KEEPER, { item: 'grave goods', take: true, says: 'Did you find what they took?', answer: 'The grave goods', reply: 'Her silver comb, her prayer beads. I will put them back where they belong, tonight.', journal: 'Bring the grave goods back to Tombkeeper Aldous, in King Zilen\'s graveyard. The thieves carry them.' }],
  ]),

  quest('zl_crown', {
    title: 'The King\'s Crown',
    giver: KEEPER,
    requires: 'zl_robbers',
    offer: {
      says: 'Something is still missing. King Zilen\'s crown, buried on his brow. The thieves you beat were only diggers. Their leader keeps the best pieces in an old ruined tower east of the south road. Will you bring the crown home?',
      accept: 'I will bring it home',
      acceptReply: 'Take the south road again. A little nearer the city than the robbers\' trail, another path cuts east into the forest. The tower is at its end. Mind his guards.',
      decline: 'Not yet',
      declineReply: 'The crown has waited this long. It will wait for you.',
    },
    reminder: 'The robbers\' leader is in the ruined tower east of the south road. Bring me King Zilen\'s crown.',
    reward: { gold: 90, exp: 160, items: ['bronze sword'], says: 'A bronze sword from the graveyard\'s old armoury. The king would want you to have it.' },
    after: 'The crown is back on the king\'s brow, where it belongs.',
  }, [
    ['place', '', { x: TOWER[0], y: TOWER[1], radius: 5, what: 'the ruined tower', arrive: 'A broken stone tower in a clearing, its roof long gone. Fresh tracks lead in and out. Someone is living here.', journal: 'Find the ruined tower east of the road south of the City of Light.' }],
    ['kill', '', { mob: 'robber boss', count: 1, what: 'the robbers\' leader', journal: 'Beat the robbers\' leader in the ruined tower.' }],
    ['bring', KEEPER, { item: 'zilen crown', take: true, says: 'Is that a glint of gold I see?', answer: 'King Zilen\'s crown', reply: 'It is. Dented, but it is his. Thank you, friend.', journal: 'Bring King Zilen\'s crown back to Tombkeeper Aldous. The robbers\' leader has it.' }],
  ]),

  quest('zl_crypt', {
    title: 'The King\'s Guard',
    giver: KEEPER,
    requires: 'zl_crown',
    notYet: 'The crown first, friend. One thing at a time.',
    offer: {
      says: 'Since the crown came home, the ground has been cold. The thieves dug deeper than they knew: their camp sits on the old crypt of the king\'s guard, and they broke it open. Zilen\'s guard have woken, and their warlord with them. This is no work for a fresh hand. Will you go down?',
      accept: 'I will go down',
      acceptReply: 'There are stairs in the robbers\' camp, under the stones. Go down, put the guard back to rest, and their warlord too.',
      decline: 'Not yet',
      declineReply: 'Wise. Grow a little first, and come back.',
    },
    reminder: 'The crypt is under the robbers\' camp, west of the south road. Put the king\'s guard back to rest.',
    reward: { gold: 200, exp: 450, items: ['iron breastplate'], says: 'An iron breastplate, from the guard\'s own stores. They will not need it now.' },
    after: 'The crypt is quiet. King Zilen\'s guard sleep again, and the city never knew.',
  }, [
    ['place', '', { x: CRYPT_IN[0], y: CRYPT_IN[1], radius: 4, what: 'the crypt', arrive: 'Cold stone, old bones, and a long hall going down into the dark. Somewhere ahead, armour scrapes.', journal: 'Go down the stairs in the robbers\' camp into the crypt of King Zilen\'s guard.' }],
    ['kill', '', { mob: 'crypt skeleton', count: 5, what: 'crypt skeletons put to rest', journal: 'Put 5 crypt skeletons to rest in the burial hall.' }],
    ['kill', '', { mob: 'skeleton warlord', count: 1, what: 'the skeleton warlord', journal: 'Destroy the skeleton warlord in the crypt\'s inner hall.' }],
    ['talk', KEEPER, { says: 'You came back up. Thank the gods.', answer: 'The crypt is quiet', reply: 'Then the king\'s guard sleep. I will have the stairs sealed.', journal: 'Tell Tombkeeper Aldous the crypt is quiet.' }],
  ]),
];

const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

const own = {
  [KEEPER]: { shouts: ['Respect the dead, traveller. And if you have a strong arm, see the Tombkeeper.'], stages: [{ when: { kind: 'always', value: '' }, says: 'King Zilen lies here, and his queen beside him. I keep them company.', answers: [] }] },
};
const talk = (name) => QUESTS.reduce((dlg, q) => mergeQuest(dlg, q, name), own[name]);

const say = (says, x, y) => [{ when: { kind: 'always', value: '' }, speaker: '', says, effects: [{ kind: 'teleport', x, y }] }];

export default {
  name: 'The Zilen Legacy',
  origin: O,
  size: [150, 186],
  seed: 61,
  oldWorld: true,
  // Forest and open ground only: the glades and trails are cut from trees
  // and the crypt from forest no one can reach. Nothing built is touched.
  mayBuild: (t) => [64, 103, 36, 1, 37, 28, 29, 30, 31, 32, 33, 34].includes(t),
  build(p) {
    const P = (x, y) => at(x, y);
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file('defItems/grave goods', itemFile('a silver comb and a string of prayer beads, grave-cold', 7));
    p.file('defItems/zilen crown', itemFile('King Zilen\'s crown, old gold, dented at one side', 7));

    // The Tombkeeper, in the graveyard.
    p.npc({ name: KEEPER, look: 'hermit', desc: 'Tombkeeper Aldous, stooped and grey, a ring of old iron keys at his belt.', x: 42 - O[0], y: 111 - O[1], dlg: firetown(KEEPER, dawnward(KEEPER, talk(KEEPER))) });

    // The robbers' glade, west of the south road (the road is x 106).
    p.path([P(105, 280), P(88, 280)]);
    p.oval(...P(61, 271), 27, 19, ',');
    p.path([P(88, 280), P(80, 280)]);
    for (const [x, y] of [[66, 276], [70, 284], [74, 274], [69, 279], [79, 284], [64, 282]]) p.mob('grave thief', 1, ...P(x, y));
    p.prop('campfire', ...P(72, 279));
    // The crypt's mouth: a ring of old stones over the stairs.
    p.building(...P(CRYPT_DOWN[0] - 2, CRYPT_DOWN[1] - 2), 5, 5, { wall: 'S', floor: 'k', doors: [['s', 2]] });
    p.set(...P(...CRYPT_DOWN), 'u');
    p.action(...P(...CRYPT_DOWN), say('You go down the old stair, into the cold dark.', CRYPT_IN[0], CRYPT_IN[1]));

    // The ruined tower, east of the south road.
    p.path([P(107, 250), P(134, 250)]);
    p.oval(...P(134, 241), 27, 19, ',');
    p.building(...P(TOWER[0] - 3, TOWER[1] - 3), 7, 7, { wall: 'S', floor: 'k', doors: [['w', 3]] });
    p.mob('robber boss', 1, ...P(TOWER[0] + 1, TOWER[1]));
    for (const [x, y] of [[140, 246], [139, 254], [153, 245], [154, 255]]) p.mob('robber guard', 1, ...P(x, y));
    p.sign('Old Tower', 'Keep out. This means you.', ...P(TOWER[0] - 5, TOWER[1] + 1));

    // The crypt: stone all round, an entry hall, a long stair-hall down to
    // the burial hall, and the inner hall where the warlord waits.
    const C = (x, y) => P(CRYPT[0] + x, CRYPT[1] + y);
    p.fill(...C(0, 0), 44, 44, 'S');
    p.fill(...C(4, 3), 9, 7, 'k'); // entry hall
    p.set(...P(...CRYPT_UP), 'U');
    p.action(...P(...CRYPT_UP), say('You climb back up into the forest air.', CRYPT_DOWN[0], CRYPT_DOWN[1] + 1));
    p.fill(...C(7, 10), 3, 12, 'k'); // stair-hall
    p.fill(...C(2, 22), 40, 9, 'k'); // burial hall
    for (const x of [4, 10, 16, 22, 28, 34, 40]) p.set(...C(x, 21), 'i');
    p.fill(...C(27, 31), 3, 4, 'k'); // passage down
    p.fill(...C(17, 35), 22, 7, 'M'); // inner hall
    for (const x of [19, 26, 33, 37]) p.set(...C(x, 34), 'i');
    for (const [x, y] of [[16, 25], [22, 28], [28, 24], [34, 27], [38, 25], [10, 27]]) p.mob('crypt skeleton', 1, ...C(x, y));
    p.mob('skeleton warlord', 1, ...P(...WARLORD));
    for (const [x, y] of [[5, 25], [5, 28], [20, 24], [31, 29]]) p.prop('coffin', ...C(x, y));

    for (const q of QUESTS) p.quest(q);
  },
};
