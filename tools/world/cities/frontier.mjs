// The Eastreach Frontier: the first quest chain, four quests for every race
// around the Eastreach ferry port. Built by tools/world/city.mjs; the
// quests are in the God tab's quest wizard's shape (js/quests.js), so they
// open and can be changed there afterwards.
//
//   1 Fresh Off the Boat   Warden Marr: drive the lizards off the supplies
//   2 The Dark Lookout     Warden Marr: the lookout on the ridge, Scout Kell, wild dogs
//   3 Roots and Remedies   Old Tamsin: slimer ooze for Kell's poultice
//   4 The Sand Kings       Warden Marr: the lizardmen's camp, Axemen, a scale
//
// Each needs the one before. Places on the map (absolute):
//   the Warden's Post, a hall west of the boathouse   1662-1670, 1293-1299
//   the old lookout on the ridge's north spur         1612-1616, 1339-1343
//   Scout Kell's camp at the edge of the woods        1574, 1358
//   Old Tamsin's cabin, east of the stream            1576-1581, 1384-1388
//   the slimer marsh south of the cabin               around 1580, 1396
//   the Sand Kings' camp, deep in the northern dunes  around 1590, 1180
// The quest monsters' dens (black dogs, slimers, Lizard Axemen) are added
// here; the lizards of quest 1 are the dens the spawn areas already put in
// the dunes west of the port (1604,1278 and 1617,1256). Quests 1-3 suit a
// new character (Lizards, black dogs and slimers: 20-30 HP, strength 4-8);
// the Sand Kings' Axemen (300 HP, strength 40) are a goal to grow into.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const O = [1490, 1160];
const at = (x, y) => [x - O[0], y - O[1]];

const MARR = 'Warden Marr', KELL = 'Scout Kell', TAMSIN = 'Old Tamsin';
const LOOKOUT = [1614, 1341];
const CAMP = [1590, 1180];

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

const QUESTS = [
  quest('er_supplies', {
    title: 'Fresh Off the Boat',
    giver: MARR,
    offer: {
      says: 'Another boat, another pair of hands. Lizards from the dunes have been gnawing through our supply crates. Will you thin them out for me?',
      accept: 'I will do it',
      acceptReply: 'Good. The dunes start just west of the post. Four of them should teach the rest some manners.',
      decline: 'Not now',
      declineReply: 'The crates won\'t guard themselves. Come back when you\'re ready.',
    },
    reminder: 'The lizards are still at the crates. The dunes are just west of here.',
    reward: { gold: 30, exp: 50, items: ['leather gloves'], says: 'Take these gloves. Sand gets everywhere out here.' },
    after: 'You\'ve earned your place here. Keep your eyes open out there.',
  }, [
    ['kill', '', { mob: 'Lizard', count: 4, what: 'lizards driven off', journal: 'Kill 4 Lizards in the dunes just west of Eastreach.' }],
    ['talk', MARR, { says: 'Back already, and in one piece?', answer: 'The lizards are dealt with', reply: 'Then the crates are safe for another week.', journal: 'Tell Warden Marr at the Warden\'s Post that the lizards are dealt with.' }],
  ]),

  quest('er_lookout', {
    title: 'The Dark Lookout',
    giver: MARR,
    requires: 'er_supplies',
    offer: {
      says: 'The lookout on the ridge to the south-west has gone dark. Scout Kell was posted there and hasn\'t sent word in two days. Will you go and see?',
      accept: 'I will find Kell',
      acceptReply: 'Head south-west across the grass to the ridge, and climb its northern spur. Be careful.',
      decline: 'Not now',
      declineReply: 'Then I\'ll pray Kell can wait.',
    },
    reminder: 'Any word of Kell? The lookout is on the ridge\'s northern spur, south-west of here.',
    reward: { gold: 60, exp: 120, items: ['iron helmet'], says: 'Take this helmet. Kell would want it worn by someone with sense.' },
    after: 'Kell is resting easier. If you haven\'t, go and see Old Tamsin.',
  }, [
    ['place', '', { x: LOOKOUT[0], y: LOOKOUT[1], radius: 3, what: 'the old lookout', arrive: 'The lookout\'s fire is long cold. There is blood on the stones, and tracks lead west towards the trees.', journal: 'Go to the old lookout on the ridge south-west of Eastreach and find out what happened to Scout Kell.' }],
    ['talk', KELL, { says: 'Easy! Easy... you\'re not one of those dogs. Thank the stars. A pack of wild dogs drove me off the ridge, and I\'ve been hiding here since.', answer: 'I will deal with the dogs', reply: 'They\'re between here and the ridge. Five of them, maybe more.', journal: 'Follow the tracks west from the lookout to the edge of the woods.' }],
    ['kill', '', { mob: 'black dog', count: 5, what: 'wild dogs slain', journal: 'Kill 5 wild dogs near Scout Kell\'s camp at the edge of the woods.' }],
    ['talk', KELL, { says: 'The howling has stopped. Was that you?', answer: 'The pack is broken', reply: 'I owe you my life. Tell the Warden I\'m alive. I can\'t walk that far on this leg.', journal: 'Tell Scout Kell the dogs are dealt with.' }],
    ['talk', MARR, { says: 'You found Kell? Alive?', answer: 'Alive, but hurt', reply: 'Thank the tides. He\'ll need more than bandages. Old Tamsin keeps a cabin by the stream in the woods south of the ridge. If anyone can mend him, she can.', journal: 'Tell Warden Marr that Scout Kell is alive.' }],
  ]),

  quest('er_remedy', {
    title: 'Roots and Remedies',
    giver: TAMSIN,
    requires: 'er_lookout',
    notYet: 'Hm? Another lost settler. I\'ve nothing for you. Go and bother the Warden.',
    offer: {
      says: 'You\'ve the look of someone the Warden sent. Kell, is it? Dog bites fester. I can make a poultice, but I need ooze from the slimers in the marsh south of here, and my knees won\'t take the mud.',
      accept: 'I will get the ooze',
      acceptReply: 'Six of them should give enough. Mind they don\'t stick to you.',
      decline: 'Not now',
      declineReply: 'Kell\'s leg won\'t wait for ever.',
    },
    reminder: 'Six slimers, in the marsh just south of the cabin. Go on.',
    reward: { gold: 40, exp: 150, items: ['iron sword'], says: 'Here, take my sword. I won\'t be swinging it for a while.' },
    after: 'Kell is on the mend, thanks to you. Now let an old woman have her quiet.',
  }, [
    ['kill', '', { mob: 'slimer', count: 6, what: 'slimers burst', journal: 'Burst 6 slimers in the marsh south of Old Tamsin\'s cabin.' }],
    ['talk', TAMSIN, { says: 'That smell! You\'ve brought it. Give me a moment...', answer: 'Here you go', reply: 'There. Take this poultice to Kell, and tell him to keep that leg still for once.', journal: 'Bring the blob ooze back to Old Tamsin.' }],
    ['talk', KELL, { says: 'Is that one of Tamsin\'s poultices? Stars, it stinks.', answer: 'Hold still', reply: 'Ah! ... Ah. That\'s better. Much better.', journal: 'Take Old Tamsin\'s poultice to Scout Kell at his camp.' }],
  ]),

  quest('er_sandkings', {
    title: 'The Sand Kings',
    giver: MARR,
    requires: 'er_remedy',
    notYet: 'Have you been to Old Tamsin\'s cabin? Kell won\'t mend without her help.',
    offer: {
      says: 'Kell says those dogs were running from something. Our scouts found tracks of lizardmen, the big ones with axes, camped deep in the northern dunes. If they come for the post, we\'re finished. Will you find their camp and break them?',
      accept: 'I will break them',
      acceptReply: 'Their camp is far north, past the lizard nests. Bring me a scale from one of the Axemen. The settlers will want proof.',
      decline: 'Not yet',
      declineReply: 'Get your strength up. They aren\'t lizards you can kick aside.',
    },
    reminder: 'The Sand Kings\' camp is far north in the dunes. Bring me a scale from one of the Axemen.',
    reward: { gold: 150, exp: 400, items: ['serpent scales'], says: 'These were made for the first Warden of Eastreach. I think they fit you better.' },
    after: 'Eastreach stands because of you. The settlers know your name now.',
  }, [
    ['place', '', { x: CAMP[0], y: CAMP[1], radius: 5, what: 'the Sand Kings\' camp', arrive: 'Crude banners of bone and hide ring a trampled fire pit. This is the Sand Kings\' camp.', journal: 'Find the lizardmen\'s camp far north in the dunes above Eastreach.' }],
    ['kill', '', { mob: 'Lizard Axeman', count: 3, what: 'Lizard Axemen slain', journal: 'Kill 3 Lizard Axemen at the Sand Kings\' camp.' }],
    ['bring', MARR, { item: 'lizard scale', take: true, says: 'Well? Do you have proof?', answer: 'A lizard scale', reply: 'So it\'s true, and it\'s done. The settlers will sleep tonight.', journal: 'Bring a lizard scale to Warden Marr as proof. The Axemen sometimes drop one.' }],
  ]),
];

// Where each comes in the chain (the wizard works this out when saving).
const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

// What each NPC says when no quest stage fits, then the quests' stages.
const own = {
  [MARR]: { shouts: ['The Warden\'s Post is open. Newcomers, come and see me!'], stages: [{ when: { kind: 'always', value: '' }, says: 'Eastreach won\'t build itself. Mind the dunes, and the dark.', answers: [] }] },
  [KELL]: { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'Quiet out here. I like it that way, now.', answers: [] }] },
  [TAMSIN]: { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'Herbs, roots and quiet. That\'s all I ask of the world.', answers: [] }] },
};
const talk = (name) => QUESTS.reduce((dlg, q) => mergeQuest(dlg, q, name), own[name]);

export default {
  name: 'Eastreach Frontier',
  origin: O,
  size: [200, 250],
  seed: 41,
  // Grass, slopes and sand only: no trees cut, no water filled.
  mayBuild: (t) => [1, 36, 37, 38, 39].includes(t),
  build(p) {
    const P = (x, y) => at(x, y);

    // The Warden's Post: a hall on the sand west of the boathouse, its
    // door facing the pier.
    p.building(...P(1662, 1293), 9, 7, { doors: [['e', 3]] });
    p.prop('chair', ...P(1664, 1295));
    p.npc({ name: MARR, look: 'Villager Woman', desc: 'Warden Isolde Marr, sun-browned and sharp-eyed, keeper of the settlement.', x: 1666 - O[0], y: 1296 - O[1], dlg: talk(MARR) });
    p.sign('Warden\'s Post', 'The Warden\'s Post', ...P(1672, 1298));

    // The old lookout: a tumbledown ring of stone on the ridge's north spur.
    p.building(...P(1612, 1339), 5, 5, { wall: 'S', floor: 'k', doors: [['n', 2]] });
    for (const [x, y] of [[1616, 1340], [1612, 1342], [1615, 1343]]) p.set(...P(x, y), 'k');
    p.sign('Old Lookout', 'The Old Lookout', ...P(1614, 1338));

    // Scout Kell's camp at the edge of the woods, and the wild dogs.
    p.fill(...P(1572, 1356), 5, 5, 'e');
    p.npc({ name: KELL, look: 'Guard', desc: 'Scout Kell, pale and bandaged, a bow across his knees.', x: 1574 - O[0], y: 1358 - O[1], dlg: talk(KELL) });
    for (const [x, y] of [[1574, 1340], [1577, 1342], [1580, 1339], [1576, 1345], [1582, 1344], [1579, 1347]]) p.mob('black dog', 1, ...P(x, y));

    // Old Tamsin's cabin, east of the stream, door to the north.
    p.building(...P(1576, 1384), 6, 5, { doors: [['n', 2]] });
    p.npc({ name: TAMSIN, look: 'hermit', desc: 'Old Tamsin, bent as a willow root, smelling of herbs.', x: 1579 - O[0], y: 1386 - O[1], dlg: talk(TAMSIN) });
    p.sign('Tamsin\'s Cabin', 'Tamsin\'s Cabin', ...P(1580, 1383));
    // The marsh south of it.
    for (const [x, y] of [[1576, 1394], [1580, 1395], [1584, 1394], [1578, 1398], [1582, 1398], [1586, 1397], [1580, 1400]]) p.mob('slimer', 1, ...P(x, y));

    // The Sand Kings' camp: a trampled fire pit in the deep dunes.
    p.fill(...P(CAMP[0] - 2, CAMP[1] - 1), 5, 3, 'e');
    for (const [x, y] of [[1586, 1177], [1594, 1178], [1588, 1184], [1593, 1183], [1597, 1181]]) p.mob('Lizard Axeman', 1, ...P(x, y));

    for (const q of QUESTS) p.quest(q);
  },
};
