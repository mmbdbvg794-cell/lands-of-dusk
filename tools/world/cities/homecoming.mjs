// Homecoming: the chain after The Firetown Expedition (LORE.md decisions N
// and R). Elowen comes home to Kingshaven, will not sit on the throne, and
// gets her uncle's first threat. Three quests for every race. Built by
// tools/world/city.mjs; the quests are in the God tab's quest wizard's
// shape (js/quests.js).
//
//   1 The Long Row Home        Elowen (Firetown): tell Old Bram she's
//                              ready. Done, she's in Kingshaven for you
//   2 The Empty Chair          Elowen (Kingshaven): Lord Steward Halvard
//                              in the keep, and back to her
//   3 Who Comes for the Chair  Elowen: the old graves above the beach, the
//                              risen king's-men, the Grey Herald and his
//                              sealed letter. Achievement The Chair Stays
//                              Cold (hc_herald_done)
//
// Each needs the one before; 1 needs ft_word. Per player: Elowen is one NPC
// in two places (server/Props.java, defPropPlaces): in her cell for players
// without hc_row_done, beside Old Wenna on Kingshaven's plaza for those
// with it. One conversation (talk/ is per name), which branches on the
// same flags. Places (absolute):
//   Elowen's cell                                  369, 348
//   Elowen at home, beside Old Wenna (1429, 351)   1430, 351
//   the old graves above the beach                 1570-1585, 435-445
// The monsters are shared, as every finale's. The NPCs are other plans'
// (firetown.mjs: Elowen, Old Bram; capital.mjs: Halvard, the Royal Guard;
// lore.mjs: Old Wenna; zilen.mjs: Aldous): on a live server
// tools/server/homecoming_talk.mjs merges the quests and the standing
// lines into their saved conversations.

import { newQuest, newStep, questDepth } from '../../../js/quests.js';

const O = [1420, 340];
const at = (x, y) => [x - O[0], y - O[1]];

const ELOWEN = 'Elowen';
const BRAM = 'Old Bram';
const HALVARD = 'Lord Steward Halvard';
export const CELL = [369, 348];
export const HOME = [1430, 351];
const GRAVES = [1577, 440];

const LETTER = 'sealed letter';
const BELT = 'gaol-chain belt';
const KINGSMAN = 'risen king\'s-man';
const HERALD = 'Grey Herald';
// Her look at home: a prop of its own, so she isn't Wenna's double
// (tools/paintart/items.js paints it by name).
export const HOME_LOOK = 'grey-haired woman';

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

const mobFile = (stats) => Object.entries(stats).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((d) => [k, ...d]) : [k, v])).join('\n') + '\n.\n';
const itemFile = (fields) => Object.entries(fields).map(([k, v]) => `${k}\n${v}`).join('\n') + '\n.\n';

// Bravery 3: they never run. The king's-men are the barrow skeletons' tier
// (120 HP, strength 55); the Herald is a chain finale (as the Ash-Sworn
// Breaker: 350 HP, strength 70), with a faction of its own so only the one
// who attacks it fights it. It always drops the letter.
const MOBS = {
  [KINGSMAN]: { description: 'a dead man risen from the old graves, in the tattered colours of King Zilen', maxhp: 120, maxsp: 0, stre: 55, inte: 1, dext: 15, wisd: 1, cons: 15, bravery: '3.0', grouprelation: '0.9', image: 32, faction: 'risen king\'s-man' },
  [HERALD]: { description: 'the Grey Herald: a dead thing in a grey hooded robe, a letter sealed with black wax at its belt', maxhp: 350, maxsp: 20, stre: 70, inte: 10, dext: 30, wisd: 10, cons: 35, bravery: '3.0', grouprelation: '0.0', image: 32, giveitem: [[LETTER, '1.0']], faction: 'grey herald' },
};

export const QUESTS = [
  quest('hc_row', {
    title: 'The Long Row Home',
    giver: ELOWEN,
    requires: 'ft_word',
    offer: {
      says: 'I walked to the end of the passage this morning, and back. Bram once promised me a boat home. Will you tell him I\'m ready?',
      accept: 'I\'ll tell him',
      acceptReply: 'Tell him the woman he rowed across is ready to be rowed back. He\'ll know.',
      decline: 'Not now',
      declineReply: 'I\'ve waited twelve years. A few more days won\'t break me.',
    },
    reminder: 'Old Bram, at Westsea Harbour. Tell him I\'m ready.',
    reward: { gold: 150, exp: 500, items: [], says: '' },
    after: 'Bram rowed like a young man. I\'m with Wenna now. Come and see me.',
  }, [
    ['talk', BRAM, { says: 'Back from the fire again?', answer: 'Elowen is ready to come home', reply: 'Is she now. Forty years late, but the boat\'s ready. I\'ll row her to Westsea myself and see her onto the Royal Swan. Tam can mind the landing.', journal: 'Tell Old Bram, at Westsea Harbour, that Elowen is ready to come home.' }],
  ]),

  quest('hc_chair', {
    title: 'The Empty Chair',
    giver: ELOWEN,
    requires: 'hc_row',
    offer: {
      says: 'Halvard wants me in the keep. Will you come? I\'d rather have someone there who\'s seen me in chains.',
      accept: 'I\'ll come',
      acceptReply: 'Then let\'s get it done.',
      decline: 'Not now',
      declineReply: 'The chair has waited forty years.',
    },
    reminder: 'The keep. Halvard\'s waiting, and so is that chair.',
    reward: { gold: 200, exp: 600, items: [], says: '' },
    after: 'The chair stays cold. It\'s better that way.',
  }, [
    ['talk', HALVARD, { says: 'Highness, the chair...', answer: 'She won\'t sit', reply: 'No. I can see she won\'t. Then I keep the city, and she keeps me honest. Tell her I\'m glad she\'s home.', journal: 'Go with Elowen to the keep and speak to Lord Steward Halvard.' }],
    ['talk', ELOWEN, { says: 'Well? Did he sulk?', answer: 'He\'s glad you\'re home', reply: 'Good. Wenna kept that chair warm forty years. Let it go cold. A chair isn\'t a kingdom; the people are.', journal: 'Go back to Elowen, at Old Wenna\'s.' }],
  ]),

  quest('hc_herald', {
    title: 'Who Comes for the Chair',
    giver: ELOWEN,
    requires: 'hc_chair',
    // (No notYet: before hc_chair is done her hc_chair stages always come
    // first, and in her cell it would cut in on Across the Burning Sea.)
    offer: {
      says: 'Wexley\'s watchmen have seen dead men on the coast road at night, in my grandfather\'s colours. I know whose dead those are. Find out what they want.',
      accept: 'I\'ll find out',
      acceptReply: 'South-east along the shore. They walk at the old graves above the beach.',
      decline: 'Not yet',
      declineReply: 'Then go stronger. They don\'t tire.',
    },
    reminder: 'The dead on the coast road. Find out what they want.',
    reward: { gold: 600, exp: 2000, items: [BELT], says: 'Keep it. I don\'t need it any more.' },
    after: 'He\'ll come himself one day. Let him find the chair cold and the people warm.',
  }, [
    ['place', '', { x: GRAVES[0], y: GRAVES[1], radius: 6, what: 'the old graves above the beach', arrive: 'Old graves above the beach, the crossing\'s dead. Some are open, and the earth is thrown outward.', journal: 'Find the dead men on the coast road, south-east of Kingshaven.' }],
    ['kill', '', { mob: KINGSMAN, count: 5, what: 'risen king\'s-men put back in the ground', journal: 'Put 5 risen king\'s-men back in the ground.' }],
    ['kill', '', { mob: HERALD, count: 1, what: 'the Grey Herald', journal: 'Find what leads them.' }],
    ['bring', ELOWEN, { item: LETTER, take: true, says: 'What did they want?', answer: 'They carried this', reply: '\'Niece. The chair is mine by blood. Give it up, or I will come and take it. M.\' ...He always signed with one letter. So do I. I learned it from him.', journal: 'The Grey Herald carried a sealed letter. Take it to Elowen.' }],
  ]),
];
const depths = { ft_word: 6 };
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

// The old graves: three rows of four, a headstone with the grave below
// it; the open ones are bare earth.
const STONES = [1572, 1575, 1578, 1582].flatMap((x) => [436, 439, 442].map((y) => [x, y]));
const OPEN = new Set(['1575,436', '1582,439', '1572,442', '1578,439', '1575,442']);

export default {
  name: 'Homecoming',
  origin: O,
  size: [170, 110],
  seed: 1430,
  // Only the open graves change the map: earth over grass or meadow.
  mayBuild: (t) => t === 1 || t === 36,
  build(p) {
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file(`defItems/${LETTER}`, itemFile({ type: 'item', description: 'a letter sealed with black wax, no device', cost: 0, image: 6 }));
    p.file(`defItems/${BELT}`, itemFile({ type: 'armor', kind: 'waist', description: 'the chain from her cell, broken', cost: 1200, mod: 200, image: 7, durability: -1 }));

    // Elowen in two places: her cell's prop as it is, hidden once she's
    // home; a second "Elowen" beside Wenna, shown only then.
    p.file(`defProps/${HOME_LOOK}`, itemFile({ description: 'a grey-haired woman', image: 5 }));
    p.file(`defPropPlaces/${ELOWEN}@${CELL[0]}_${CELL[1]}`, itemFile({ hiddenIf: 'hc_row_done' }));
    p.file(`defPropPlaces/${ELOWEN}@${HOME[0]}_${HOME[1]}`, itemFile({ shownIf: 'hc_row_done', look: HOME_LOOK, description: 'A grey-haired woman in a plain cloak. Too thin still, but standing straight.' }));
    p.prop(ELOWEN, ...at(...HOME));

    // The graves, and the dead that walk them.
    for (const [x, y] of STONES) {
      p.prop('grave', ...at(x, y));
      if (OPEN.has(`${x},${y}`)) p.set(...at(x, y + 1), 'e');
    }
    for (const [x, y] of [[1570, 438], [1574, 441], [1577, 435], [1584, 440], [1573, 445], [1580, 444]]) p.mob(KINGSMAN, 1, ...at(x, y));
    p.mob(HERALD, 1, ...at(1580, 441));

    for (const q of QUESTS) p.quest(q);
  },
};
