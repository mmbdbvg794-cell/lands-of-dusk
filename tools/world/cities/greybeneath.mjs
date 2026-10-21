// The Grey Beneath: the first chain of the southern gate (LORE.md decisions
// P and Q). The grey blight comes back to the healed grove; it rises from
// a gate wearing thin under it, Kraghul's Dry Ones are digging at it, and
// three heartstones pin it. The gate holds; it isn't shut. Four quests for
// every race after The Green Wardens, and one for drow. Built by
// tools/world/city.mjs; the quests are in the God tab's quest wizard's
// shape (js/quests.js).
//
//   1 The Grey Comes Back   Ranger Faelwen: the grove again, its wolves,
//                           a grey root dug from its heart, to Faelwen
//                           and on to Loremistress Faelith
//   2 Cut by No Elf         Loremistress Faelith: the Elders' heartstone
//                           to Shaman Ithrae, and her answer back
//   3 Ash in the Roots      Ranger Faelwen: the root-crack, its Dry One
//                           diggers, an ashen brand
//   4 Hold the Door         Ranger Faelwen: the Ash-Sworn Breaker, then
//                           three heartstones round the crack
//   5 A Strand Pulled Thin  Priestess Ilvra (drow, after the welcome rite):
//                           the root-crack, and back to her
//
// Each of 1-4 needs the one before; 1 needs gw_grove. Places (absolute):
//   the withered grove's heart                    618, 1178
//   where the grey root is dug (sg_return step 3) 618, 1176
//   the root-crack (a prop; its square pins it)   620, 1179
// The NPCs are other plans' (greenwardens.mjs, lore.mjs, ssarakh.mjs,
// velkarath.mjs): on a live server the quests go into their saved
// conversations with tools/server/merge_quests.mjs, and Faelith's changed
// answer with tools/server/greybeneath_talk.mjs. sg_heart and sg_web set
// tale flags when done (reward.flags); lore_heartstone is in lore.mjs's
// TALES (so Keeper of Tales), lore_web isn't (drow only).

import { newQuest, newStep, questDepth } from '../../../js/quests.js';

const O = [600, 1160];
const at = (x, y) => [x - O[0], y - O[1]];

const FAELWEN = 'Ranger Faelwen';
const FAELITH = 'Loremistress Faelith';
const ITHRAE = 'Shaman Ithrae';
const ILVRA = 'Priestess Ilvra';
const GROVE = [618, 1178];
const DIG = [618, 1176];
const CRACK = [620, 1179];
export const CRACK_NAME = 'root-crack';

const ROOT = 'grey root';
const ELDERS = 'Elders\' heartstone';
const BRAND = 'ashen brand';
const ASH = 'cold grey ash';
const CLOAK = 'Thornward Cloak';
const DIGGER = 'dry one digger';
const BREAKER = 'Ash-Sworn Breaker';
const CRACK_ARRIVE = 'A crack in the earth between grey roots. Heat breathes out of it, with the smell of ash and old iron. Someone has been widening it with picks.';

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

const mobFile = (stats) => Object.entries(stats).flatMap(([k, v]) => (Array.isArray(v) ? v.flatMap((d) => [k, ...d]) : [k, v])).join('\n') + '\n.\n';
const itemFile = (fields) => Object.entries(fields).map(([k, v]) => `${k}\n${v}`).join('\n') + '\n.\n';

// Bravery 3: they never run. The diggers sit between the Dry One raiders
// (220 HP, strength 65) and the Sand Kings' Axemen (300 HP, 40): more HP
// than a raider, a softer hit. The Breaker is a chain finale (as the
// blighted bear: 350 HP, strength 70), with a faction of its own so only
// the one who attacks it fights it.
const MOBS = {
  [DIGGER]: { maxhp: 260, maxsp: 0, stre: 55, inte: 6, dext: 22, wisd: 4, cons: 25, bravery: '3.0', grouprelation: '0.9', image: 39, giveitem: [[BRAND, '0.6']], faction: 'dry one digger' },
  [BREAKER]: { maxhp: 350, maxsp: 20, stre: 70, inte: 10, dext: 30, wisd: 10, cons: 35, bravery: '3.0', grouprelation: '0.0', image: 39, faction: 'ash-sworn breaker' },
};

export const QUESTS = [
  quest('sg_return', {
    title: 'The Grey Comes Back',
    giver: FAELWEN,
    requires: 'gw_grove',
    offer: {
      says: 'I spoke too soon. The grove we healed has gone grey again, and worse. Will you go and look?',
      accept: 'I will look',
      acceptReply: 'East, as before. Bring me a root from the worst of it. Dig if you must.',
      decline: 'Not now',
      declineReply: 'The grove won\'t wait long.',
    },
    reminder: 'The withered grove, far east. Bring me a root.',
    reward: { gold: 150, exp: 500, items: [], says: '' },
    after: 'The grey is under our roots. I don\'t like it.',
  }, [
    ['place', '', { x: GROVE[0], y: GROVE[1], radius: 5, what: 'the withered grove', arrive: 'The grey has come back, worse. It runs along the roots, out from the grove\'s heart, and the ground is warm.', journal: 'Go back to the withered grove far east of Aelindor.' }],
    ['kill', '', { mob: 'blighted wolf', count: 5, what: 'blighted wolves slain', journal: 'Kill 5 blighted wolves in the grove.' }],
    ['bring', FAELWEN, { item: ROOT, take: false, says: 'Did you find the worst of it?', answer: 'A grey root', reply: 'Warm. Roots aren\'t warm. It isn\'t spreading through the soil. It\'s coming up. Faelith should see this.', journal: 'Dig a root from the grove\'s heart and bring it to Ranger Faelwen.' }],
    ['bring', FAELITH, { item: ROOT, take: true, says: 'Faelwen sent you? Show me.', answer: 'The grove\'s root', reply: 'Ash and old iron, from below. Not the wind, then. I was wrong, and I am too old to enjoy it.', journal: 'Take the grey root to Loremistress Faelith, by the Moonwell.' }],
  ]),

  quest('sg_heart', {
    title: 'Cut by No Elf',
    giver: FAELITH,
    requires: 'sg_return',
    offer: {
      says: 'The Elders kept the heartstone from the waking shrine. \'Cut by no elf,\' Faelwen said. I think I know who cut it. Will you take it to the mire-folk and ask?',
      accept: 'I will take it',
      acceptReply: 'The shaman in Ssarakh, Ithrae. The lizardfolk cut the old stones. Ask her if they cut this one.',
      decline: 'Not now',
      declineReply: 'The stone has kept this long.',
      effects: [{ kind: 'give', item: ELDERS }],
    },
    reminder: 'Take the Elders\' heartstone to Shaman Ithrae, in Ssarakh.',
    reward: { gold: 200, exp: 600, items: [], says: '', flags: ['lore_heartstone'] },
    after: 'A door under our woods. The songs never mentioned that.',
  }, [
    ['bring', ITHRAE, { item: ELDERS, take: true, says: 'You carry something old. Show me.', answer: 'A heartstone from the elves\' shrine', reply: 'Brood-cut. A sliver of warden stone. Our elders set keepers on the old posts, stone that wakes when the door below grows thin. Where there were keepers, there is a door.', journal: 'Take the Elders\' heartstone to Shaman Ithrae in Ssarakh.' }],
    ['talk', FAELITH, { says: 'What did the mire-folk say?', answer: 'It is warden stone', reply: 'Then the blight is no wind. There is a door under our woods, and it is wearing thin.', journal: 'Tell Loremistress Faelith what Ithrae said.' }],
  ]),

  quest('sg_ash', {
    title: 'Ash in the Roots',
    giver: FAELWEN,
    requires: 'sg_heart',
    offer: {
      says: 'Rangers have seen lizardfolk in the southern woods: the dry kind, far from their sands. They were at the grove. Find out what they\'re doing.',
      accept: 'I will find out',
      acceptReply: 'The grove\'s heart. Look for where the ground is warmest.',
      decline: 'Not yet',
      declineReply: 'Then they\'ll keep doing it.',
    },
    reminder: 'The grove\'s heart. Find what the Dry Ones are doing.',
    reward: { gold: 250, exp: 800, items: [], says: '' },
    after: 'Kraghul, in our woods.',
  }, [
    ['place', '', { x: CRACK[0], y: CRACK[1], radius: 2, what: 'the root-crack', arrive: CRACK_ARRIVE, journal: 'Find what the Dry Ones are doing at the grove\'s heart.' }],
    ['kill', '', { mob: DIGGER, count: 5, what: 'Dry One diggers slain', journal: 'Kill 5 Dry One diggers at the root-crack.' }],
    ['bring', FAELWEN, { item: BRAND, take: true, says: 'What did you find?', answer: 'An ashen brand', reply: 'A horned head, burned into iron. Kraghul\'s mark. He isn\'t raiding. He\'s digging.', journal: 'Bring an ashen brand back to Ranger Faelwen. The diggers carry them.' }],
  ]),

  quest('sg_hold', {
    title: 'Hold the Door',
    giver: FAELWEN,
    requires: 'sg_ash',
    offer: {
      says: 'Ithrae sent word on the Marsh Wren. A heartstone can\'t shut a door, but three can pin one. The shrine\'s gargoyles carry them. And whoever Kraghul left at that crack will have to be dealt with first.',
      accept: 'I will hold it',
      acceptReply: 'Three heartstones, then the crack. He won\'t have left the digging to diggers.',
      decline: 'Not yet',
      declineReply: 'Grow first. This is the worst thing I have asked.',
    },
    reminder: 'Three heartstones from the shrine. Then the root-crack.',
    reward: { gold: 600, exp: 2000, items: [CLOAK], says: 'Wardens\' work, with a thread from the grove in it. You\'ve earned a place under these trees.' },
    after: 'The woods are holding. So must we.',
  }, [
    ['kill', '', { mob: BREAKER, count: 1, what: 'the Ash-Sworn Breaker', journal: 'Gather three heartstones from the shrine gargoyles west of Aelindor, then kill the Ash-Sworn Breaker at the root-crack.' }],
    ['bring', FAELWEN, { item: ASH, take: true, says: 'You\'re back. The crack?', answer: 'Cold grey ash', reply: 'It holds. Not shut. Held. Whatever he wanted down there, he\'ll want it more now.', journal: 'Stand at the root-crack carrying three heartstones, then bring Faelwen what is left.' }],
  ]),

  // Drow only: Ilvra is in Velkarath, and the offer needs velkarath_done
  // (the welcome rite), as a quest "velkarath" would ("requires" is just
  // "<id>_done"; the God tab shows it as not found).
  quest('sg_web', {
    title: 'A Strand Pulled Thin',
    giver: ILVRA,
    requires: 'velkarath',
    offer: {
      says: 'Kneel. The Queen\'s web trembles in the south, under the surface elves\' woods: a strand pulled thin. Go up and see it with your own eyes, and tell me what pulls it.',
      accept: 'I will go',
      acceptReply: 'The west stair, up by Aelindor. Then east, to where their trees go grey.',
      decline: 'Not yet',
      declineReply: 'The Queen is patient. I am less so.',
    },
    reminder: 'The surface elves\' woods, where the trees go grey. See what pulls the strand.',
    reward: { gold: 200, exp: 600, items: [], says: '', flags: ['lore_web'] },
    after: 'The Queen watches the south now. So should you.',
  }, [
    ['place', '', { x: CRACK[0], y: CRACK[1], radius: 2, what: 'the root-crack', arrive: CRACK_ARRIVE, journal: 'Climb the west stair and find where the surface elves\' trees go grey.' }],
    ['talk', ILVRA, { says: 'Well?', answer: 'Dry Ones, digging', reply: 'Then the Horde wants the door, and the Queen\'s strand is all that holds it. Few on the surface know there is a web at all. Keep it so.', journal: 'Tell Priestess Ilvra what pulls at the strand.' }],
  ]),
];
const depths = { gw_grove: 2, velkarath: 0 };
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

// The root-crack's square, while Hold the Door's last step runs: three
// heartstones (taken one at a time, given back if there aren't three)
// pin it and leave cold grey ash. A hand-written script: tile rules can't
// count items.
const SET = '** You set the three heartstones round the crack. They grow cold, then colder. The heat stops breathing out of the ground, though the crack does not close. **';
const SHORT = 'Heat breathes out of the crack. Warden stone might hold it: three heartstones.';
export const crackScript = () => [
  'if hasCondition trigger sg_hold_2',
  '\tif ! hasItem trigger "cold grey ash"',
  '\t\tif hasItem trigger heartstone',
  '\t\t\tremoveItem trigger heartstone',
  '\t\t\tif hasItem trigger heartstone',
  '\t\t\t\tremoveItem trigger heartstone',
  '\t\t\t\tif hasItem trigger heartstone',
  '\t\t\t\t\tremoveItem trigger heartstone',
  `\t\t\t\t\tgiveItem trigger "${ASH}"`,
  `\t\t\t\t\tchat trigger "${SET}"`,
  '\t\t\t\t\tendscript',
  '\t\t\t\tend',
  '\t\t\t\tgiveItem trigger heartstone',
  '\t\t\tend',
  '\t\t\tgiveItem trigger heartstone',
  '\t\tend',
  `\t\tchat trigger "${SHORT}"`,
  '\tend',
  'end',
  'endscript',
  '',
].join('\n');

export default {
  name: 'The Grey Beneath',
  origin: O,
  size: [40, 40],
  seed: 1178,
  // Nothing on the map changes: a prop, two squares, monsters.
  mayBuild: () => false,
  build(p) {
    for (const [name, stats] of Object.entries(MOBS)) p.file(`defMobs/${name}`, mobFile(stats));
    p.file(`defItems/${ROOT}`, itemFile({ type: 'item', description: 'a grey, warm root from the grove', cost: 0, image: 6 }));
    p.file(`defItems/${ELDERS.toLowerCase()}`, itemFile({ type: 'item', description: 'the heartstone from the waking shrine, which the Elders kept: warm, humming, cut by no elf', cost: 0, image: 7 }));
    p.file(`defItems/${BRAND}`, itemFile({ type: 'item', description: 'iron burned with a horned head', cost: 2, image: 6 }));
    p.file(`defItems/${ASH}`, itemFile({ type: 'item', description: 'a handful of grey ash from the root-crack, cold as stone', cost: 0, image: 6 }));
    p.file(`defItems/${CLOAK.toLowerCase()}`, itemFile({ type: 'armor', kind: 'torso', description: 'Green Wardens\' work, woven with a thread from the healed grove', cost: 1200, mod: 120, image: 7, durability: -1 }));

    // The root-crack, and the squares.
    p.file(`defProps/${CRACK_NAME}`, itemFile({ description: 'a crack in the earth between grey roots; heat breathes out of it, with the smell of ash and old iron', image: 57, showname: 'true' }));
    p.prop(CRACK_NAME, ...at(...CRACK));
    p.file(`defMoveActions/${CRACK[0]}_${CRACK[1]}`, crackScript());
    p.action(...at(...DIG), [
      { when: { kind: 'flag', value: 'sg_root' }, speaker: '', says: '', effects: [] },
      { when: { kind: 'noflag', value: 'sg_return_3' }, speaker: '', says: '', effects: [] },
      { when: { kind: 'always', value: '' }, speaker: '', says: '** You dig at the grove\'s heart, among the grey roots. One comes up in your hand, grey and warm. **', effects: [{ kind: 'give', item: ROOT }, { kind: 'flag', flag: 'sg_root' }] },
    ]);

    // Kraghul's diggers round the crack, and the one set to break it.
    for (const [x, y] of [[619, 1181], [621, 1181], [617, 1180], [622, 1177], [622, 1179], [619, 1177]]) p.mob(DIGGER, 1, ...at(x, y));
    p.mob(BREAKER, 1, ...at(621, 1178));

    for (const q of QUESTS) p.quest(q);
    p.journalLine('lore_heartstone', 'Tale: The Heartstones', 'The heartstones of the waking shrine are warden stone, cut by the lizardfolk elders. The grey blight rises from a door beneath the southern woods.', true);
    p.journalLine('lore_web', 'Tale: The Queen\'s Web', 'The Spider Queen\'s web binds the gates under the world. Its southern strand is pulled thin.', true);
  },
};
