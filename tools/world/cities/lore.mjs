import { dawnward } from './dawnward.mjs';
import { firetown } from './firetown.mjs';

// The lore of Dusk, in pieces round the world (LORE.md is the whole story;
// players only ever get it a piece at a time, each place telling its own
// side). Built by tools/world/city.mjs; nothing on the map changes.
//
//   Old Wenna the Chronicler   Kingshaven plaza       1429, 351
//   the Stone of the Crossing  Kingshaven plaza       1427, 351 (read: 1427, 352)
//   Loremistress Faelith       Aelindor, the Moonwell 462, 1247
//   Archivist Zyrith           Velkarath              1340, 914
//   the broken warden stone    Velkarath              1357, 909 (read: 1357, 910)
//   King Aldric's proclamation City of Light          86, 153 (read: 86, 154)
//   the last sailings notice   Westsea Harbour quay   97, 354 (read: 96, 354)
// Shaman Ithrae in Ssarakh tells the lizardfolk's tales (TALES.brood...,
// used by ssarakh.mjs). Each tale sets a flag lore_<key> and adds a "Tale:"
// line to the journal; the achievement Keeper of Tales (achievements.mjs)
// is all of them.

// key -> [title, the tale, the journal line]
export const TALES = {
  // Old Wenna, in Kingshaven: a refugee who crossed as a girl.
  crossing: ['The Crossing',
    'Forty ships left Westsea Harbour, packed to the rails, and sailed east. Storms took nine of them. We ate tar-soaked biscuit and rainwater for a month, and when we sighted this coast my mother wept, because there was nothing on it. We built Kingshaven out of the ships themselves.',
    'Old Wenna told me of the crossing: forty ships out of Westsea, nine lost, and Kingshaven built from the hulls of the rest.'],
  throne: ['The Empty Throne',
    'There is a throne in the keep that nobody sits on. King Aldric sent his daughter, the Princess Elowen, on the last ship, the Dawnward, to rule us here. The Dawnward never came. So we named the city Kingshaven, the king\'s haven, and we keep it ready for her.',
    'Kingshaven keeps an empty throne for Princess Elowen, King Aldric\'s daughter, whose ship, the Dawnward, never arrived.'],
  fall: ['The War',
    'Firetown burned first. We saw it from Westsea: a red glow on the sea, every night. Then the burning things came west, and behind them came our own dead, walking. My father said the dead wore the old king\'s colours. He said a prince led them.',
    'Old Wenna remembers Firetown burning, and the dead marching behind the fire, led by a prince.'],
  memorial: ['The Stone of the Crossing',
    'The Stone of the Crossing. Carved with the names of the nine ships the sea took, and every soul aboard them. Below them, in newer, rougher letters: THE DAWNWARD. NOT LOST. NOT YET.',
    'The Stone of the Crossing in Kingshaven names the nine ships lost. Someone has added the Dawnward: not lost, not yet.'],

  // Loremistress Faelith, in Aelindor.
  ships: ['When the Ships Came',
    'We watched the human ships come in, from the cliffs. Starving, frightened, far too many to turn away. The Elder Council argued for a week. In the end we gave them the western coast and seed for one spring. They have been loud neighbours ever since. Mostly good ones.',
    'The elves watched the refugee ships come in, and after a week of argument gave the humans the western coast.'],
  blight: ['The Grey Blight',
    'The grey rot in our groves began the year the ships came. It smells of ash and old iron, and nothing in this land burns like that. The Wardens cut it back, and it comes again. I think the wind carries it from across the sea, from whatever is burning there.',
    'The blight in Aelindor\'s groves began the year the ships came, and smells of ash. Faelith thinks it blows from the burning across the sea.'],
  sundering: ['The Sundering',
    'Long ago some of our kin went down under the earth and did not come back up. The songs call it the Sundering, and say they went in pride. The Drow say they went on guard. Lately I have begun to wonder which songs are true.',
    'The elves sing that the Drow went below in pride, in the Sundering. The Drow say they went on guard.'],

  // Archivist Zyrith, in Velkarath.
  gates: ['The Sealed Gates',
    'There are gates under the world, to places that should never touch ours. Seven of them, sealed in the first age with warden stones that the mire-folk cut. Our people went below to keep them. The surface elves call that the Sundering. We call it duty.',
    'There are seven gates under the world, sealed with warden stones the lizardfolk cut. The Drow went below to guard them.'],
  morvane: ['Morvane',
    'Forty years ago a human prince came to our markets: Morvane of Zilen, King Aldric\'s younger brother. He paid in gold and asked only about the gate under Firetown. We sold him nothing. He found it anyway.',
    'Morvane, King Aldric\'s younger brother, came to Velkarath asking about the gate under Firetown.'],
  tremor: ['The Night the Gate Opened',
    'The deep shook for three days. Lava rose in the east galleries, and the ember dragon, asleep since before Velkarath was cut, woke and climbed toward the heat. Morvane wanted an army that could not die. He opened the gate, and the Ashen Horde came through and gave him one: every soul it killed rose for him. In the end he died too, and rose their king.',
    'Morvane opened the gate under Firetown. The Ashen Horde came through, and the dead it made rose for him, until he rose as the Skeleton King.'],
  shard: ['The Broken Warden Stone',
    'A slab of black-green stone, carried up from the deep, carved with seven gates and seven stones. Six stones are whole. The seventh is split clean through, and the gate beside it is carved with a flame.',
    'In Velkarath I saw a carving of the seven gates. The seventh stone, by the gate of flame, is broken.'],

  // Shaman Ithrae, in Ssarakh.
  brood: ['The Brood Remembers',
    'We were here before the elves sang their first song. The brood remembers it all, egg to egg. When the gates were sealed, it was our elders who cut the stones. The Brood Stone in the plaza is the last of them still whole.',
    'The lizardfolk elders cut the warden stones that sealed the gates. Ssarakh\'s Brood Stone is the last one whole.'],
  dryones: ['The Dry Ones',
    'Some of the brood left the mire long ago for the sands, and dried out in more ways than one. Sand Kings, they call themselves. Now they bow to a horned, scaled warlord who came out of the fire across the sea: Kraghul. Brood should not bow to anything.',
    'The Sand Kings of the desert are lizardfolk who left the mire. They bow to Kraghul, the warlord of the Ashen Horde.'],
  wyrms: ['The Wyrms',
    'The night the gate opened, the Brood Stone grew warm, and the old wyrms woke: fire, stone and frost. They wake when the world is torn. If you meet one, do not stand in front of it. Old, you call them? To you. The brood remembers their mothers.',
    'The old wyrms, fire, stone and frost, woke when the gate opened. They wake when the world is torn.'],

  // The old world.
  proclamation: ['King Aldric\'s Proclamation',
    'A proclamation, cut in stone and half blackened by fire: BY ORDER OF ALDRIC, KING OF ZILEN. The road to Firetown is closed. My brother Morvane is named traitor to the crown, and outlaw. Whoever sees him shall... The rest is scorched away.',
    'In the City of Light, King Aldric\'s proclamation names his brother Morvane a traitor and closes the road to Firetown.'],
  lastships: ['The Last Sailings',
    'A torn, salt-stained notice: LAST SAILINGS. All who can, go east across the sea. The Dawnward sails at first light with Her Highness the Princess Elowen. Gods keep the City of Light.',
    'At Westsea Harbour, a torn notice of the last sailings: the Dawnward was to carry Princess Elowen east.'],
  // The Grey Beneath (greybeneath.mjs): Ithrae's answer in Cut by No Elf
  // sets this flag when the quest is done; nobody tells it from a menu.
  heartstone: ['The Heartstones',
    'Brood-cut. A sliver of warden stone. Our elders set keepers on the old posts, stone that wakes when the door below grows thin. Where there were keepers, there is a door.',
    'The heartstones of the waking shrine are warden stone, cut by the lizardfolk elders. The grey blight rises from a door beneath the southern woods.'],
};
export const LORE_FLAGS = Object.keys(TALES).map((k) => `lore_${k}`);

// An answer that tells a tale (and remembers it).
export const tale = (key) => ({
  label: TALES[key][0],
  reply: TALES[key][1],
  effects: [{ kind: 'flag', flag: `lore_${key}` }],
});
// Someone who tells tales: what they say first, then a tale for each key.
export const teller = (says, keys, bye = 'Another time.') => ({
  shouts: [],
  stages: [{ when: { kind: 'always', value: '' }, says, answers: [...keys.map(tale), { label: 'Farewell', reply: bye, effects: [] }] }],
});

// Archivist Zyrith: "a long way down" is for surface folk; a drow born in
// Velkarath hears her own greeting (the eighth play-test,
// tools/server/fix_playtest8_talk.mjs).
export const ZYRITH_DROW = 'One of our own, with questions. Ask them quietly.';
function zyrith() {
  const d = teller('You have come a long way down to ask questions. Ask them quietly.', ['gates', 'morvane', 'tremor'], 'The dark keeps you.');
  d.stages.unshift({ when: { kind: 'race', value: 'darkelf' }, says: ZYRITH_DROW, answers: structuredClone(d.stages[0].answers) });
  return d;
}

// A stone or notice: read once (stepping in front of it), the tale is told
// and remembered; after that, walking past says nothing.
function readOnce(p, key, x, y) {
  p.farAction(x, y, [
    { when: { kind: 'flag', value: `lore_${key}` }, speaker: '', says: '', effects: [] },
    { when: { kind: 'always', value: '' }, speaker: '', says: TALES[key][1], effects: [{ kind: 'flag', flag: `lore_${key}` }] },
  ]);
}

const propFile = (desc, image) => `description\n${desc}\nimage\n${image}\n.\n`;

export default {
  name: 'Tales of Dusk',
  origin: [0, 0],
  size: [1, 1],
  seed: 1,
  oldWorld: true, // the proclamation and the notice are in the old world
  mayBuild: () => false,
  build(p) {
    // Kingshaven.
    p.npc({ name: 'Old Wenna', look: 'Villager Woman', desc: 'Old Wenna the Chronicler, white-haired and sharp-eyed, a book of names on her knee.', x: 1429, y: 351,
      dlg: firetown('Old Wenna', dawnward('Old Wenna', teller('Sit, sit. I was a girl of nine when the ships came over from the old world. Ask, and I will tell you what I remember.', ['crossing', 'throne', 'fall'], 'Mind how you go.'))) });
    p.file('defProps/Stone of the Crossing', propFile(TALES.memorial[1], 5));
    p.prop('Stone of the Crossing', 1427, 351);
    readOnce(p, 'memorial', 1427, 352);

    // Aelindor.
    p.npc({ name: 'Loremistress Faelith', look: 'Elf Woman', desc: 'Loremistress Faelith, ageless and still, her sleeves stained with old ink.', x: 462, y: 1247,
      dlg: teller('Few short-lived folk ask about the past, and fewer listen. Which will you be?', ['ships', 'blight', 'sundering'], 'Walk softly.') });

    // Velkarath.
    p.npc({ name: 'Archivist Zyrith', look: 'Dark Elf Woman', desc: 'Archivist Zyrith, thin as a shadow, a lamp of blue fungus at her side.', x: 1340, y: 914,
      dlg: firetown('Archivist Zyrith', zyrith()) });
    p.file('defProps/Broken Warden Stone', propFile(TALES.shard[1], 48));
    p.prop('Broken Warden Stone', 1357, 909);
    readOnce(p, 'shard', 1357, 910);

    // The old world.
    p.file('defProps/Proclamation Stone', propFile(TALES.proclamation[1], 48));
    p.prop('Proclamation Stone', 86, 153);
    readOnce(p, 'proclamation', 86, 154);
    p.file('defProps/Torn Notice', propFile(TALES.lastships[1], 1));
    p.prop('Torn Notice', 97, 354);
    readOnce(p, 'lastships', 96, 354);

    // The journal: a line for each tale (Ithrae's too).
    for (const [key, [title, , line]] of Object.entries(TALES)) p.journalLine(`lore_${key}`, `Tale: ${title}`, line, true);
  },
};
