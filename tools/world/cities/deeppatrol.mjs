// The Deep Patrol: a quest chain in the caverns round Velkarath, three
// quests for the dark elves who come up out of the tutorial (only dark
// elves can reach the underground). Built by tools/world/city.mjs; the
// quests are in the God tab's quest wizard's shape (js/quests.js).
//
//   1 Slime in the Cisterns   Patrol Leader Jhaelra: cave slimes in the
//                             north-east cavern
//   2 The Lost Patrol         Patrol Leader Jhaelra: the patrol's last camp at
//                             the mouth of the great north-west cavern,
//                             duergar raiders, the patrol's signet
//   3 The Ember Hollow        Patrol Leader Jhaelra: magma slimes and the
//                             young ember dragon in the lava hollow south-east
//
// Each needs the one before. Places on the map (absolute):
//   Patrol Leader Jhaelra, in the town near the Fire Well    1356, 914
//   the cave slimes, north-east cavern                       around 1402, 872
//   the patrol's last camp, mouth of the north-west cavern   around 1310, 870
//   the Ember Hollow, west of the lava pocket                around 1400, 964
// Not the western cave (1264-1282, 904-916): that's where the stairs from
// the surface come down, and a den there would greet every arrival. The
// Bats deeper in the north-west cavern (velkarath.mjs) are left out of it:
// they don't start fights, and they'd kill a new character who did.
// Quests 1-2 suit a dark elf fresh from the tutorial; the ember dragon
// (350 HP, strength 45) is one to grow into.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const O = [1250, 850];
const at = (x, y) => [x - O[0], y - O[1]];

const JHAELRA = 'Patrol Leader Jhaelra';
const CAMP = [1310, 870];
const HOLLOW = [1400, 964];

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

// A monster file (defMobs): the engine's keys, one per line, then ".".
const mobFile = (stats) => Object.entries(stats).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((d) => [k, ...d]) : [k, v])).join('\n') + '\n.\n';
const itemFile = (desc, image) => `type\nitem\ndescription\n${desc}\nimage\n${image}\n.\n`;

// Each den is one faction, so killing one sets the rest on you (the
// creature AI's grudges); the ember dragon has a faction of its own, so it only
// fights the player who attacks it, not alongside its den.
const MOBS = {
  'cave slime': { maxhp: 30, maxsp: 0, stre: 6, inte: 1, dext: 5, wisd: 1, cons: 8, bravery: '1.0', grouprelation: '0.9', image: 33, faction: 'cave slime' },
  'duergar soldier': { maxhp: 80, maxsp: 10, stre: 15, inte: 8, dext: 12, wisd: 6, cons: 12, bravery: '1.5', grouprelation: '0.6', image: 4, giveitem: [['patrol signet', '0.35']], faction: 'duergar' },
  'magma slime': { maxhp: 130, maxsp: 0, stre: 24, inte: 1, dext: 12, wisd: 1, cons: 20, bravery: '2.0', grouprelation: '0.9', image: 33, faction: 'magma' },
  'ember dragon': { maxhp: 350, maxsp: 40, stre: 45, inte: 20, dext: 30, wisd: 20, cons: 35, bravery: '2.0', grouprelation: '0.9', image: 45, faction: 'ember dragon' },
};

const QUESTS = [
  quest('dp_slime', {
    title: 'Slime in the Cisterns',
    giver: JHAELRA,
    offer: {
      says: 'You. The Matron\'s newest blade. Cave slimes have crept into the north-east cavern and are fouling the water we draw there. Clear them, and I\'ll know whether you\'re worth a place on my patrol.',
      accept: 'I will clear them',
      acceptReply: 'The cavern is north-east of the town. Five should do. Don\'t let them touch your boots.',
      decline: 'Not now',
      declineReply: 'Then stay out of my way.',
    },
    reminder: 'The slimes are still in the north-east cavern.',
    reward: { gold: 40, exp: 60, items: ['leather gloves'], says: 'Take these gloves. Slime eats leather slower than skin.' },
    after: 'The water runs clean. You may yet be worth something.',
  }, [
    ['kill', '', { mob: 'cave slime', count: 5, what: 'cave slimes destroyed', journal: 'Destroy 5 cave slimes in the cavern north-east of Velkarath.' }],
    ['talk', JHAELRA, { says: 'Well?', answer: 'The water is clean', reply: 'Good. I heard you didn\'t run. That matters more.', journal: 'Report to Patrol Leader Jhaelra, near the Fire Well.' }],
  ]),

  quest('dp_lostpatrol', {
    title: 'The Lost Patrol',
    giver: JHAELRA,
    requires: 'dp_slime',
    offer: {
      says: 'Three days ago I sent four blades into the great cavern north-west of the town. None came back. Find their last camp. If duergar took them, make the grey dwarves pay, and bring me the patrol\'s signet. It must not stay in their hands.',
      accept: 'I will find them',
      acceptReply: 'Take the narrow passage north-west of the town, up into the great cavern. Their camp was just inside its mouth. Leave the bats alone.',
      decline: 'Not yet',
      declineReply: 'Every hour you wait, the trail grows colder.',
    },
    reminder: 'The great cavern, up the passage north-west of the town. Find the camp, and bring me the signet.',
    reward: { gold: 90, exp: 160, items: ['assassin blade'], says: 'An assassin\'s blade, from the House armoury. Use it well.' },
    after: 'The House remembers those who bring its own home.',
  }, [
    ['place', '', { x: CAMP[0], y: CAMP[1], radius: 4, what: 'the patrol\'s last camp', arrive: 'A scattered camp: bedrolls slashed, a lamp smashed, and heavy boot-prints that are no elf\'s. Duergar.', journal: 'Find the lost patrol\'s last camp at the mouth of the great cavern north-west of Velkarath.' }],
    ['kill', '', { mob: 'duergar soldier', count: 4, what: 'duergar soldiers slain', journal: 'Kill 4 duergar soldiers round the patrol\'s camp.' }],
    ['bring', JHAELRA, { item: 'patrol signet', take: true, says: 'The signet. Do you have it?', answer: 'The patrol signet', reply: 'Their deaths are answered, then. I will tell the Matron.', journal: 'Bring the patrol\'s signet back to Patrol Leader Jhaelra. The duergar carry it.' }],
  ]),

  quest('dp_ember', {
    title: 'The Ember Hollow',
    giver: JHAELRA,
    requires: 'dp_lostpatrol',
    notYet: 'The lost patrol first. Then we\'ll talk.',
    offer: {
      says: 'Something has nested in the hollow by the lava, south-east. Magma slimes, and behind them a young ember dragon, growing fat on the heat. If it grows any larger it will come for the town. Kill it while it\'s young.',
      accept: 'I will kill it',
      acceptReply: 'South-east of the town, down by the lava. Clear the slimes, then the dragon. Bring me nothing; just come back alive.',
      decline: 'Not yet',
      declineReply: 'Sharpen yourself first. A dragon is a dragon, however young.',
    },
    reminder: 'The Ember Hollow, by the lava south-east. The slimes, then the dragon.',
    reward: { gold: 200, exp: 450, items: ['steel plate mail'], says: 'Plate mail, made for a Patrol Leader. I have another.' },
    after: 'They\'re singing your name in the House. Don\'t let it go to your head.',
  }, [
    ['place', '', { x: HOLLOW[0], y: HOLLOW[1], radius: 5, what: 'the Ember Hollow', arrive: 'Heat beats up from the lava. The rock is scorched black, and something large has been sleeping here.', journal: 'Find the Ember Hollow by the lava south-east of Velkarath.' }],
    ['kill', '', { mob: 'magma slime', count: 4, what: 'magma slimes destroyed', journal: 'Destroy 4 magma slimes in the Ember Hollow.' }],
    ['kill', '', { mob: 'ember dragon', count: 1, what: 'the ember dragon', journal: 'Kill the young ember dragon in the Ember Hollow.' }],
    ['talk', JHAELRA, { says: 'You\'re alive. And the dragon?', answer: 'The dragon is dead', reply: 'Then Velkarath sleeps easier, and so do I.', journal: 'Tell Patrol Leader Jhaelra the ember dragon is dead.' }],
  ]),
];

const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

const own = {
  [JHAELRA]: { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'Keep your blade sharp and your voice low. The deep is listening.', answers: [] }] },
};
const talk = (name) => QUESTS.reduce((dlg, q) => mergeQuest(dlg, q, name), own[name]);

export default {
  name: 'The Deep Patrol',
  origin: O,
  size: [180, 140],
  seed: 61,
  // Nothing is built: monsters, a sign and one NPC.
  mayBuild: () => false,
  build(p) {
    const P = (x, y) => at(x, y);
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file('defItems/patrol signet', itemFile('a silver signet ring, a spider worked into its face', 7));

    p.npc({ name: JHAELRA, look: 'Dark Elf Woman', desc: 'Patrol Leader Jhaelra, scarred and watchful, two short blades crossed at her back.', x: 1356 - O[0], y: 914 - O[1], dlg: talk(JHAELRA) });

    for (const [x, y] of [[1395, 868], [1402, 872], [1408, 870], [1398, 876], [1406, 877], [1408, 874]]) p.mob('cave slime', 1, ...P(x, y));
    for (const [x, y] of [[1308, 865], [1312, 868], [1309, 875], [1313, 872], [1306, 871]]) p.mob('duergar soldier', 1, ...P(x, y));
    for (const [x, y] of [[1395, 962], [1400, 960], [1404, 963], [1396, 968], [1402, 972]]) p.mob('magma slime', 1, ...P(x, y));
    p.mob('ember dragon', 1, ...P(1406, 961));
    p.sign('Ember Hollow', 'Turn back. Something nests here.', ...P(1395, 957));

    for (const q of QUESTS) p.quest(q);
  },
};
