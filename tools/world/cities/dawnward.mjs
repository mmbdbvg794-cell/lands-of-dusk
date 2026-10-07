// The Dawnward: a quest chain after the lost princess (LORE.md: Princess
// Elowen sailed on the Dawnward, the last ship of the crossing, and never
// came). Built by tools/world/city.mjs; the quests are in the God tab's
// quest wizard's shape (js/quests.js).
//
//   1 Word from the Mire        Old Wenna (Kingshaven): a bell with a rising
//                               sun in Ssarakh's market; ask Trader Kossk
//   2 The Wreck on the East Shore  Trader Kossk (Ssarakh): the Dawnward's
//                               wreck on the isles' east shore, Dry One
//                               raiders stripping it, and a silver locket
//                               in the captain's cabin
//   3 What the Brood Remembers  Chieftain Hesska (Ssarakh): the brood pulled
//                               a girl from the wreck; Shaman Ithrae taught
//                               her the warden stones
//   4 The Princess's Road       Shaman Ithrae: Tombkeeper Aldous (the City
//                               of Light) keeps the letter she left at King
//                               Zilen's grave; take the news, and the
//                               locket, home to Old Wenna
//
// The ending leaves her alive, or not, somewhere in the fire at Firetown,
// with a shard of the Brood Stone: a thread for a later chain.
//
// The NPCs belong to other plans (lore.mjs: Old Wenna; ssarakh.mjs: Kossk,
// Hesska, Ithrae; zilen.mjs: Tombkeeper Aldous). Each of those runs its
// NPC's conversation through dawnward() below, so their quest stages are
// there whichever plan is installed last. This plan builds the wreck, its
// raiders, the locket and the reward, and keeps the quests themselves.
//
// The wreck (absolute): 1929-1941, 1068-1074, on the shore; the locket is
// found stepping into the captain's cabin (1939, 1071) while quest 2 runs.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const WENNA = 'Old Wenna';
const KOSSK = 'Trader Kossk';
const HESSKA = 'Chieftain Hesska';
const ITHRAE = 'Shaman Ithrae';
const ALDOUS = 'Tombkeeper Aldous';
const WRECK = [1932, 1071];
const CABIN = [1939, 1071];
const LOCKET = 'silver locket';
const PENDANT = 'sunrise pendant';

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

export const QUESTS = [
  quest('dw_word', {
    title: 'Word from the Mire',
    giver: WENNA,
    offer: {
      says: 'Sit a moment. A sailor off the Marsh Wren swears he saw a ship\'s bell for sale in Ssarakh\'s market, cast with a rising sun. The Dawnward\'s bell had a rising sun on it. I was nine; I remember. Will you go and ask?',
      accept: 'I will go to Ssarakh',
      acceptReply: 'Bless you. The Marsh Wren sails from Eastreach. Ask the traders in Ssarakh\'s market where that bell came from.',
      decline: 'Not now',
      declineReply: 'It has waited forty years. It can wait a little longer.',
    },
    reminder: 'Have you been to Ssarakh? Ask the traders there about the bell with the rising sun.',
    reward: { gold: 40, exp: 120, says: 'Then I was right to hope.' },
    after: 'Find out what you can. I have waited a long time.',
  }, [
    ['talk', KOSSK, { says: 'Buy, buy! Oh, a warm-blood with questions. What is it?', answer: 'The bell with the rising sun', reply: 'Ah, that bell! A brood-hunter brought it in, green with age, and a sailor bought it. The hunter found it on a wreck on the east shore of the isles, past the far willows. Bad country: the Dry Ones raid there.', journal: 'Ask the traders in Ssarakh\'s market about the ship\'s bell with a rising sun.' }],
  ]),

  quest('dw_wreck', {
    title: 'The Wreck on the East Shore',
    giver: KOSSK,
    requires: 'dw_word',
    offer: {
      says: 'You want to see the wreck? Hsss. The Dry Ones have been stripping it, board by board. Drive them off and look for yourself, if you must.',
      accept: 'Show me the way',
      acceptReply: 'Go east, all the way across the isles, to the far shore. The wreck lies half in the sea. Look in what is left of the captain\'s cabin: warm-bloods keep their treasures there.',
      decline: 'Not now',
      declineReply: 'The wreck is patient. Wrecks are.',
    },
    reminder: 'The wreck is on the far east shore of the isles. Mind the Dry Ones.',
    reward: { gold: 120, exp: 350, items: ['red potion', 'red potion'], says: 'A locket, from a wreck no one remembers. Take these. You look like you need them.' },
    after: 'Show that locket to the Chieftain. She is older than she looks, and she looks very old.',
  }, [
    ['place', '', { x: WRECK[0], y: WRECK[1], radius: 4, what: 'the wreck on the east shore', arrive: 'Black ribs of a great ship lie across the shore, half in the sea. On a broken board by the stern, sun-bleached letters: DAWNW...', journal: 'Find the wreck on the far east shore of the isles.' }],
    ['kill', '', { mob: 'dry one raider', count: 4, what: 'Dry One raiders driven off', journal: 'Drive off the Dry One raiders stripping the wreck: kill 4.' }],
    ['bring', KOSSK, { item: LOCKET, take: false, says: 'Back alive! Did you find anything?', answer: 'A silver locket', reply: 'A locket, with a rising sun on it, and a girl\'s face inside. Hsss. Take that to the Chieftain.', journal: 'Search the captain\'s cabin at the seaward end of the wreck, then bring what you find to Trader Kossk.' }],
  ]),

  quest('dw_brood', {
    title: 'What the Brood Remembers',
    giver: HESSKA,
    requires: 'dw_wreck',
    offer: {
      says: 'Kossk says you carry something from the old wreck. Show me.',
      accept: 'Here',
      acceptReply: 'Hold it to the light... yes. Let me look.',
      decline: 'Not now',
      declineReply: 'When you are ready, warm-blood.',
    },
    reminder: 'Speak with Shaman Ithrae. She knew the girl best.',
    reward: { gold: 100, exp: 400, says: 'The brood remembers her. Now you do too.' },
    after: 'Follow her road, if you can. The brood would like to know how it ends.',
  }, [
    ['bring', HESSKA, { item: LOCKET, take: false, says: 'The locket. Let me see it.', answer: 'The silver locket', reply: 'I have seen this face. Forty winters ago a storm put a warm-blood ship on our east shore. The brood pulled one girl from the water, half drowned, holding that locket. She stayed with us a year. She learned our tongue. She asked a great many questions, mostly of Ithrae.', journal: 'Show the silver locket to Chieftain Hesska in the Hall of the Brood.' }],
    ['talk', ITHRAE, { says: 'Hesska sent you. About the girl.', answer: 'Tell me about her', reply: 'Elowen, she called herself, a king\'s daughter. She asked how the gates under the world were sealed, and I told her: with warden stones, cut by our elders. She asked if one could be cut again. I said only with the brood\'s blessing. The brood gave it. She took a shard of the Brood Stone and sailed west, for the old world.', journal: 'Ask Shaman Ithrae about the girl from the wreck.' }],
  ]),

  quest('dw_road', {
    title: 'The Princess\'s Road',
    giver: ITHRAE,
    requires: 'dw_brood',
    offer: {
      says: 'She sent word once, years after: a message carried by a Marsh Wren sailor, saying only that she had knelt at her grandfather\'s grave. If anyone knows where she went from there, it is whoever keeps that grave.',
      accept: 'I will find the grave',
      acceptReply: 'King Zilen lies in the City of Light, across the sea. Go well.',
      decline: 'Not now',
      declineReply: 'Patience, warm-blood. The brood has plenty.',
    },
    reminder: 'King Zilen\'s grave is in the City of Light, in the old world. Ask whoever keeps it.',
    reward: { gold: 300, exp: 900, items: [PENDANT], says: 'Here. My mother made this pendant for the princess, before we sailed: a rising sun, in gold. It has never been worn. Wear it for her.' },
    after: 'The throne is still empty. But now we know where she went. That is more than we had.',
  }, [
    ['talk', ALDOUS, { says: 'Another visitor for the old king? You have the look of someone asking after someone.', answer: 'I seek Princess Elowen', reply: 'Elowen. Twelve years ago a grey-haired woman knelt at this grave, with a green stone in her hand, and left a letter for whoever came asking. Here, read it. "To whoever comes asking. I am Elowen, Aldric\'s daughter. The sea did not take me; the mire did, and the brood gave me back. My uncle opened the gate under Firetown. I mean to close it. If I do not come back, the stone is with me, somewhere in the fire. Do not let them keep the throne empty forever. E."', journal: 'Find whoever keeps King Zilen\'s grave in the City of Light, and ask after Princess Elowen.' }],
    ['bring', WENNA, { item: LOCKET, take: true, says: 'You came back. Tell me. Tell me all of it.', answer: 'The locket, and her letter', reply: 'She lived. She lived, and she went back into the fire to undo what he did. Oh, child. Forty years we kept that chair warm for her, and she was braver than all of us.', journal: 'Take the news, and the silver locket, home to Old Wenna in Kingshaven.' }],
  ]),
];
const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

// The chain's stages in an NPC's conversation (the NPC's own plan calls it).
export const dawnward = (name, dlg) => QUESTS.reduce((d, q) => mergeQuest(d, q, name), dlg);

const itemFile = (fields) => Object.entries(fields).map(([k, v]) => `${k}\n${v}`).join('\n') + '\n.\n';

export default {
  name: 'The Dawnward',
  origin: [1918, 1060],
  size: [33, 22],
  seed: 53,
  oldWorld: true, // Tombkeeper Aldous's quest is in the old world
  // The shore: swamp, sand, shore pieces and the sea.
  mayBuild: (t) => [0, 168, 169, 170, 171, 172, 38, 27, 1, 36].includes(t) || (t >= 78 && t <= 89),
  build(p) {
    const A = (x, y) => [x - 1918, y - 1060];
    const F = (x, y, w, h, ch) => p.fill(...A(x, y), w, h, ch);
    const S = (x, y, ch) => p.set(...A(x, y), ch);

    // The wreck: a broken hull across the shore, bow in the sea, the stern
    // stove in (the way in), the deck rotten through in places.
    F(1930, 1068, 11, 1, 'W');
    F(1930, 1074, 11, 1, 'W');
    F(1941, 1069, 1, 5, 'W');
    S(1929, 1069, 'W'); S(1929, 1073, 'W');
    F(1930, 1069, 11, 5, 'P');
    for (const [x, y] of [[1933, 1069], [1934, 1069], [1936, 1073], [1931, 1073]]) S(x, y, 'b');
    // The captain's cabin, walled off at the bow.
    for (const y of [1069, 1070, 1072, 1073]) S(1937, y, 'W');
    p.farAction(...CABIN, [
      { when: { kind: 'flag', value: 'dw_locket' }, speaker: '', says: '', effects: [] },
      { when: { kind: 'noflag', value: 'dw_wreck_on' }, speaker: '', says: 'Rotten boards, black water, and the smell of the sea. Whatever was here is long gone.', effects: [] },
      { when: { kind: 'always', value: '' }, speaker: '', says: '** In the rot of the captain\'s cabin something glints: a silver locket, a rising sun on its lid. Inside, a girl\'s face, painted small. **', effects: [{ kind: 'give', item: LOCKET }, { kind: 'flag', flag: 'dw_locket' }] },
    ]);
    p.sign('Wreck', 'The wreck of a great ship. On a board by the stern, sun-bleached letters: DAWNW...', ...A(1927, 1071));

    // The Dry Ones stripping it.
    for (const [x, y] of [[1926, 1066], [1926, 1076], [1922, 1071], [1931, 1071], [1935, 1072]]) p.mob('dry one raider', 1, ...A(x, y));

    p.file(`defItems/${LOCKET}`, itemFile({ type: 'item', description: 'a silver locket with a rising sun on its lid; inside, a girl\'s face, painted small', cost: 1, image: 6 }));
    p.file(`defItems/${PENDANT}`, itemFile({ type: 'armor', kind: 'neck', description: 'a rising sun in gold on a fine chain, made for a princess before the crossing', cost: 800, mod: 70, image: 7, durability: -1 }));

    for (const q of QUESTS) p.quest(q);
  },
};
