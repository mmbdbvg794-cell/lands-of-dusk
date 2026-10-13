// The Firetown Expedition: the chain after The Dawnward (LORE.md). Princess
// Elowen went into the fire at Firetown with a shard of the Brood Stone to
// close the gate her uncle opened. She's alive: twelve years a prisoner of
// the Fallen in Firetown's cells. Built by tools/world/city.mjs; the quests
// are in the God tab's quest wizard's shape (js/quests.js).
//
//   1 The Second Page         Tombkeeper Aldous (City of Light): Elowen left
//                             a second page, for one the brood has met. It
//                             says what a gate needs; ask Shaman Ithrae
//   2 The Warden Stone        Archivist Zyrith (Velkarath): clear the magma
//                             slimes from the Ember Hollow; she gives a
//                             fragment of the broken warden stone
//   3 Across the Burning Sea  Old Bram (Westsea Harbour) rows you to
//                             Firetown's cells, past the king's closed road;
//                             the grey-haired prisoner in the last cell is
//                             Elowen
//   4 The Prisoner of Firetown  Elowen: the Ashen Gaoler, captain of the
//                             Fallen, wears the shard; kill him, bring it
//   5 Closing the Rift        Elowen teaches the words; take the shard and
//                             the fragment to the rift at the passage's end
//                             (the square before it does the sealing, and
//                             gives an ember of the rift); bring the ember
//                             back. Reward: Dawnbreaker, and her letter
//   6 Word for Kingshaven     take Elowen's letter to Old Wenna. Achievement
//                             The Rift Sealed (ft_word_done)
//
// Per player (the user's choice): Elowen stays in her cell for everyone,
// and talks to each by how far they've come; nothing changes for others.
//
// Firetown's cells (370-397, 348-383) are reached only by teleports: Old
// Bram rows you in to 380,351, and Tam, his grandson, at 379,352 rows you
// back. The way to the rift avoids the old square at 384,349 that drops a
// human to 1 HP (it runs along row 348).
//
// The NPCs of quests 1, 2 and 6 belong to other plans (zilen.mjs: Aldous;
// ssarakh.mjs: Ithrae; lore.mjs: Zyrith, Old Wenna), which run their
// conversations through firetown() below as they do dawnward(); on a live
// server tools/server/merge_quests.mjs puts the stages into their saved
// conversations instead of reinstalling those plans.

import { newQuest, newStep, mergeQuest, questDepth } from '../../../js/quests.js';

const ALDOUS = 'Tombkeeper Aldous';
const ITHRAE = 'Shaman Ithrae';
const ZYRITH = 'Archivist Zyrith';
const WENNA = 'Old Wenna';
const BRAM = 'Old Bram';
const TAM = 'Tam';
const ELOWEN = 'Elowen';
const FRAGMENT = 'warden stone fragment';
const SHARD = 'brood stone shard';
const EMBER = 'ember of the rift';
const LETTER = "Elowen's letter";
const SWORD = 'Dawnbreaker';
const GAOLER = 'Ashen Gaoler';
const RIFT = 'the rift';

const LANDING = [380, 351];
const WESTSEA = [95, 358];
const RIFT_AT = [394, 379]; // the passage's dead end
const RIFT_STEP = [393, 379]; // the square before it

const quest = (id, fields, steps) => {
  const q = newQuest(id);
  Object.assign(q, fields, { offer: { ...q.offer, ...fields.offer }, reward: { ...q.reward, ...fields.reward } });
  q.steps = steps.map(([kind, npc, s]) => ({ ...newStep(kind, npc), ...s }));
  return q;
};

export const QUESTS = [
  quest('ft_page', {
    title: 'The Second Page',
    giver: ALDOUS,
    requires: 'dw_road',
    notYet: 'The old king sleeps. Let him.',
    offer: {
      says: 'You again, with the brood\'s mud still on your boots. Good. There was a second page to her letter. She said: give it only to one who has sat with the brood and come back. Will you read it?',
      accept: 'I will read it',
      acceptReply: '"If you are reading this, the mire trusted you, and so do I. A gate is shut with three things: warden stone, Brood Stone, and words in the old tongue. I have the Brood Stone. The rest Ithrae knows. Ask her what I asked. E." The ink runs at the end. She wrote it in a hurry.',
      decline: 'Not now',
      declineReply: 'It has waited twelve years in my coat. It can wait.',
    },
    reminder: 'Ask Shaman Ithrae, in Ssarakh, what Elowen asked her.',
    reward: { gold: 150, exp: 500, says: 'Warden stone. The Drow broke one, they say, the night the gate opened.' },
    after: 'Go carefully. The old king would want his granddaughter home.',
  }, [
    ['talk', ITHRAE, { says: 'You carry her words. I can smell the ink.', answer: 'What did Elowen ask you?', reply: 'How a gate is shut. I told her: warden stone, cut by the elders; a piece of the Brood Stone, to wake it; and the old words, spoken over the wound. The brood gave her the shard and I gave her the words. Warden stone she did not have. The last whole one is ours, and it stays. But the Drow keep a broken one in Velkarath, and the Archivist there keeps its pieces.', journal: 'Shaman Ithrae, in Ssarakh, knows what Elowen asked about the gates.' }],
  ]),

  quest('ft_stone', {
    title: 'The Warden Stone',
    giver: ZYRITH,
    requires: 'ft_page',
    offer: {
      says: 'A surface-dweller asking after the broken warden stone. The last to ask was a grey-haired woman from the sea, twelve years ago, and I refused her. I have been sorry since. If you want a piece of it, earn it: the magma slimes are crawling out of the Ember Hollow toward my archive again.',
      accept: 'I will clear them',
      acceptReply: 'The Ember Hollow is south-east of the town, by the lava. Six of them, and I will cut you a fragment.',
      decline: 'Not now',
      declineReply: 'The stone has waited forty years. So can I.',
    },
    reminder: 'Six magma slimes, in the Ember Hollow south-east of Velkarath.',
    reward: { gold: 200, exp: 700, items: [FRAGMENT], says: 'Here: a fragment of the broken warden stone. It is cold. It is always cold. Take it to the fire, and do what she meant to do.' },
    after: 'Tell her, if you find her: the Archivist is sorry.',
  }, [
    ['kill', '', { mob: 'magma slime', count: 6, what: 'magma slimes cleared from the Ember Hollow', journal: 'Clear the magma slimes from the Ember Hollow, south-east of Velkarath: kill 6.' }],
    ['talk', ZYRITH, { says: 'The archive is quiet again. You have done what I asked.', answer: 'The Hollow is clear', reply: 'Then the stone is yours.', journal: 'Go back to Archivist Zyrith in Velkarath.' }],
  ]),

  quest('ft_cross', {
    title: 'Across the Burning Sea',
    giver: BRAM,
    requires: 'ft_stone',
    notYet: 'Firetown? The king closed that road, and the sea\'s worse. Come back when you\'ve a reason I can\'t argue with.',
    offer: {
      says: 'Firetown. The king closed the road, but not the sea. That stone in your pack is cold enough to keep the fire off a small boat, I reckon. I rowed a grey-haired woman across, twelve years back. Never rowed her home.',
      accept: 'Row me across',
      acceptReply: 'Hold on, then. Tam waits at the far landing to bring folk back. If there\'s anyone left to bring.',
      effects: [{ kind: 'teleport', x: LANDING[0], y: LANDING[1] }],
      decline: 'Not yet',
      declineReply: 'The fire\'ll keep.',
    },
    reminder: 'Back so soon?',
    reward: { gold: 100, exp: 600, says: 'She\'s alive? Then I\'ll row her home myself, when she\'s ready.' },
    after: 'Thank you, for finding her.',
  }, [
    ['place', '', { x: LANDING[0], y: LANDING[1], radius: 3, what: 'the cells of Firetown', arrive: 'Heat like an open oven. Rows of cells, black with old smoke. In the last cell along the west wall, a grey-haired woman lifts her head.', journal: 'Cross to Firetown with Old Bram, at Westsea Harbour.' }],
    ['talk', ELOWEN, { says: 'Another prisoner? No. You walk like someone who came here on purpose.', answer: 'Princess Elowen?', reply: 'Nobody has called me that in a long time. Yes. I came to shut my uncle\'s gate, and the Fallen took me at the door of it. Twelve years. They keep me because the rift likes a king\'s blood near it. Who sent you? No, it doesn\'t matter. Listen.', journal: 'Find out who the grey-haired prisoner in Firetown\'s cells is.' }],
    ['talk', BRAM, { says: 'Back already? Well? Did you find her?', answer: 'She is alive', reply: 'Alive. Twelve years in that oven. Some folk are made of something else.', journal: 'Tell Old Bram, at Westsea Harbour, what you found.' }],
  ]),

  quest('ft_free', {
    title: 'The Prisoner of Firetown',
    giver: ELOWEN,
    requires: 'ft_cross',
    offer: {
      says: 'The Fallen took the shard from me, the one the brood gave me. Their gaoler wears it on a chain, down the passage, where the rift is. Bring it back and I can teach you the words to shut the gate. I can\'t walk that far any more.',
      accept: 'I will bring it',
      acceptReply: 'He is ash and anger, and he does not die easily. Go along the north wall: the floor by the cell door is cursed against my people.',
      decline: 'Not yet',
      declineReply: 'I have waited twelve years. Waiting is the one thing I am good at.',
    },
    reminder: 'The Ashen Gaoler, down the passage toward the rift. He wears the shard.',
    reward: { gold: 150, exp: 900, says: 'It\'s still warm. The brood\'s stone is always warm. Now listen, and remember.' },
    after: 'Listen to the words. Say them back to me.',
  }, [
    ['kill', '', { mob: GAOLER, count: 1, what: 'the Ashen Gaoler destroyed', journal: 'Destroy the Ashen Gaoler, down the passage from the cells toward the rift.' }],
    ['bring', ELOWEN, { item: SHARD, take: false, says: 'Is it... let me see it.', answer: 'The Brood Stone shard', reply: 'Hold it up to the light. There. The brood\'s green, under all that soot.', journal: 'Bring the Brood Stone shard back to Elowen.' }],
  ]),

  quest('ft_seal', {
    title: 'Closing the Rift',
    giver: ELOWEN,
    requires: 'ft_free',
    offer: {
      says: 'The words are short. The brood never wasted any. Carry the shard and the warden stone to the rift at the end of the passage, stand before it, and say: "Under the world, be still." The stones will do the rest. Will you?',
      accept: 'I will close it',
      acceptReply: 'Under the world, be still. Don\'t say it until you\'re standing at the edge.',
      decline: 'Not yet',
      declineReply: 'Gather yourself first. It will try to stop you.',
    },
    reminder: 'The rift, at the end of the passage. Carry the shard and the warden stone, and stand at its edge.',
    reward: { gold: 600, exp: 2500, items: [SWORD, LETTER], says: 'I felt it close. Like a door in a house where someone has been shouting for forty years, and stops. Take this: Dawnbreaker, my grandfather\'s sword. They took it from me at the door and the gaoler kept it; it was with the shard. And this letter, for Kingshaven.' },
    after: 'Go home. I will follow when I can walk that passage on my own feet.',
  }, [
    ['bring', ELOWEN, { item: EMBER, take: true, says: 'You came back. Is it...?', answer: 'The rift is closed', reply: 'An ember from its edge, gone cold. It is closed.', journal: 'Take the shard and the warden stone to the rift at the end of the passage and stand at its edge. Then go back to Elowen.' }],
  ]),

  quest('ft_word', {
    title: 'Word for Kingshaven',
    giver: ELOWEN,
    requires: 'ft_seal',
    offer: {
      says: 'Old Wenna is still alive? She was nine when we sailed. Will you carry my letter to her?',
      accept: 'I will take it home',
      acceptReply: 'Tell her not to keep the chair warm. Tell her to keep the people warm.',
      decline: 'Not now',
      declineReply: 'Then keep it safe for me.',
    },
    reminder: 'My letter, to Old Wenna in Kingshaven.',
    reward: { gold: 200, exp: 800, says: '' },
    after: 'Wenna has my letter? Good. Thank you, for all of it. I can almost walk the passage now. Almost.',
  }, [
    ['bring', WENNA, { item: LETTER, take: true, says: 'You have that look again. Sit. Tell me.', answer: "Elowen's letter", reply: 'Her hand. Older, but hers. "Dear Wenna. I am alive, and the gate is shut. I will come home when I can walk. Do not keep the chair warm for me; keep the people warm. E." Oh. Oh, child. Forty years.', journal: "Take Elowen's letter to Old Wenna in Kingshaven." }],
  ]),
];
const depths = {};
for (const q of QUESTS) depths[q.id] = q.depth = questDepth(q, (id) => depths[id]);

// The chain's stages in an NPC's conversation (the NPC's own plan calls it).
export const firetown = (name, dlg) => QUESTS.reduce((d, q) => mergeQuest(d, q, name), dlg);

const say = (text, answers = []) => ({ says: text, answers });
const row = (to, label) => ({ label, reply: '', effects: [{ kind: 'teleport', x: to[0], y: to[1] }] });

// Old Bram: the quest, and the boat. His own conversation offers the boat;
// quest stages carry an NPC's own answers (js/quests.js mergeQuest), so the
// quest's reminder and thank-you offer it too, and taking the quest rows
// you over (offer.effects). Before the quest is open to you, his "not
// yet" stage comes first, and has no boat.
function bram() {
  return firetown(BRAM, {
    shouts: ['Boats! Boats for anywhere the ferries won\'t go!'],
    stages: [
      { when: { kind: 'always', value: '' }, ...say('The boat\'s ready, if you want Firetown.', [row(LANDING, 'Row me across')]) },
    ],
  });
}

// Elowen in her cell: her quests, or how far each player has come.
function elowen() {
  return firetown(ELOWEN, {
    shouts: [],
    stages: [
      { when: { kind: 'always', value: '' }, verb: 'acts', ...say('A grey-haired woman in chains, too thin, too still. Her eyes follow you, but she says nothing.') },
    ],
  });
}

const tam = () => ({
  shouts: ['Boat back to Westsea! Before it cooks!'],
  stages: [{ when: { kind: 'always', value: '' }, ...say('Grandad says I\'m to row anyone back who wants it. Do you? The heat\'s worse every hour.', [row(WESTSEA, 'Row me back')]) }],
});

const itemFile = (fields) => Object.entries(fields).map(([k, v]) => `${k}\n${v}`).join('\n') + '\n.\n';

export default {
  name: 'The Firetown Expedition',
  // The cells and the passage to the rift; Old Bram stands off the grid,
  // at Westsea Harbour. Nothing on the map changes.
  origin: [362, 345],
  size: [40, 42],
  seed: 61,
  oldWorld: true,
  mayBuild: () => false,
  build(p) {
    const A = (x, y) => [x - 362, y - 345];
    p.npc({ name: ELOWEN, look: 'prisoner', desc: 'A grey-haired woman in chains, too thin for the heat. Under the soot, a face from an old locket.', ...xy(A(369, 348)), dlg: elowen() });
    p.npc({ name: TAM, look: 'Villager', desc: 'Tam, Old Bram\'s grandson, red-faced from the heat, an oar over his shoulder.', ...xy(A(379, 352)), dlg: tam() });
    p.npc({ name: BRAM, look: 'hermit', desc: 'Old Bram the boatman, brown as an old rope.', ...xy(A(96, 358)), dlg: bram() });

    // The rift, at the passage's dead end; the square before it seals it.
    p.file(`defProps/${RIFT}`, itemFile({ description: 'a crack in the floor, glowing like the inside of a furnace; heat and whispers pour out of it', image: 57 }));
    p.prop(RIFT, ...A(...RIFT_AT));
    p.farAction(...RIFT_STEP, [
      { when: { kind: 'flag', value: 'ft_rift_sealed' }, speaker: '', says: 'Cold black stone where the rift was. Far below, something has stopped shouting.', effects: [] },
      { when: { kind: 'noflag', value: 'ft_seal_on' }, speaker: '', says: '** The rift breathes heat and whispers in a tongue that hurts to hear. You cannot go nearer. **', effects: [] },
      { when: { kind: 'item', value: SHARD }, also: { kind: 'item', value: FRAGMENT }, speaker: '', says: '** "Under the world, be still." The shard flares green in your hand, the warden stone goes colder than ice, and both pull toward the rift like iron to a lodestone. The crack groans shut. Where it was, an ember lies on the stone, already going grey. **', effects: [{ kind: 'take', item: SHARD }, { kind: 'take', item: FRAGMENT }, { kind: 'give', item: EMBER }, { kind: 'flag', flag: 'ft_rift_sealed' }] },
      { when: { kind: 'always', value: '' }, speaker: '', says: 'The rift roars. You need both the Brood Stone shard and the warden stone fragment to close it.', effects: [] },
    ]);

    // The Fallen along the passage, and their gaoler by the rift.
    for (const [x, y] of [[395, 354], [397, 360], [394, 368], [396, 373]]) p.mob('Fallen', 1, ...A(x, y));
    p.mob(GAOLER, 1, ...A(392, 377));
    p.file(`defMobs/${GAOLER}`, itemFile({
      description: 'the Ashen Gaoler: a Fallen in a burnt gaoler\'s coat, ash for skin, a green stone on a chain at its neck',
      maxhp: 900, maxsp: 100, stre: 70, dext: 35, cons: 40, inte: 20, wisd: 20, bravery: 3.0, grouprelation: 0.5,
      image: 14, faction: 'demon', giveitem: `${SHARD}\n1.0`,
    }));

    // (Item files have lower-case names: the engine lower-cases the name it
    // looks for, so "Dawnbreaker" is in defItems/dawnbreaker.)
    p.file(`defItems/${FRAGMENT.toLowerCase()}`, itemFile({ type: 'item', description: 'a fragment of the broken warden stone of Velkarath; it is always cold', cost: 1, image: 6 }));
    p.file(`defItems/${SHARD.toLowerCase()}`, itemFile({ type: 'item', description: 'a shard of the Brood Stone, green under the soot, and warm', cost: 1, image: 6 }));
    p.file(`defItems/${EMBER.toLowerCase()}`, itemFile({ type: 'item', description: 'an ember from the edge of the rift, gone cold and grey', cost: 1, image: 6 }));
    p.file(`defItems/${LETTER.toLowerCase()}`, itemFile({ type: 'item', description: 'a letter in Princess Elowen\'s hand, for Old Wenna in Kingshaven', cost: 1, image: 6 }));
    p.file(`defItems/${SWORD.toLowerCase()}`, itemFile({ type: 'weapon', description: 'Dawnbreaker, the sword of the House of Zilen: a rising sun on the pommel, and an edge that never dulls', cost: 15000, mod: 900, image: 9, durability: 50000 }));

    for (const q of QUESTS) p.quest(q);
  },
};

const xy = ([x, y]) => ({ x, y });
