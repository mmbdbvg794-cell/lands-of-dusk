// Saelin's Armoury: a stall in Aelindor, on the meadow west of the south
// avenue, below the shop row (the user, 2026-10-30: the bowyer should sell
// just bows). Saelin is Caelum's sister, who weaves the elven mail he used
// to sell; his bows stay with him, her armour and blades are here.
// Built by tools/world/city.mjs; tools/server/split_caelum.py takes the
// same wares off Caelum's shelf and points his "Elven mail?" answer here.
//
//   counter     466-468, 1255 (wooden, like Ssuli's at Last Water)
//   Saelin      467, 1256, behind it
//   shop square 467, 1254, in front: elves and friends of Aelindor only
//   sign        469, 1254

const O = [460, 1250];
const at = (x, y) => [x - O[0], y - O[1]];
const SAELIN = 'Saelin';

export const WARES = ['elven chain mail', 'leafsilver helm', 'leafsilver sleeves', 'leafsilver gloves', 'leafsilver belt', 'leafsilver leggings', 'redwood sword', 'ash staff', 'quarter staff', 'woodcutter\'s axe'];

// As Aelindor's other shopkeepers (aelindor.mjs shop()).
const STRANGER = 'Forgive me, traveller, but I serve only the elves of Aelindor and those the Elder has named our friends. Speak with Elder Faelar, in his hall north-west of the Moonwell.';
const TEXT = 'Mail and blades, leafsilver and redwood. Stand at my counter and look in the Shop tab.';
const OPEN = [
  { label: 'Elven mail?', reply: 'Link by link, by moonlight. It turns a blade and weighs no more than a shirt.' },
  { label: 'Thank you', reply: 'Go well.' },
];
const DLG = {
  shouts: ['Elven mail and leafsilver!'],
  stages: [
    { when: { kind: 'flag', value: 'aelindor_done' }, says: TEXT, answers: OPEN },
    { when: { kind: 'norace', value: 'elf' }, says: STRANGER, answers: [] },
    { when: { kind: 'always', value: '' }, says: TEXT, answers: OPEN },
  ],
};

export default {
  name: 'Saelin\'s Armoury',
  origin: O,
  size: [12, 8],
  seed: 89,
  // The meadow and the plaza's stone only; the avenue's path stays.
  mayBuild: (t) => [36, 127].includes(t),
  build(p) {
    for (let x = 466; x <= 468; x++) p.set(...at(x, 1255), '#');
    p.npc({ name: SAELIN, look: 'Elf Woman', desc: 'Saelin the armourer, Caelum\'s sister, a coil of fine silver links over her arm.', x: 467 - O[0], y: 1256 - O[1], dlg: DLG });
    p.merchant(...at(467, 1254), WARES, 'Saelin\'s Armoury');
    p.walk(...at(467, 1254), { kind: 'raceorflag', race: 'elf', flag: 'aelindor_done', speaker: SAELIN, verb: 'says',
      says: 'I serve the elves of Aelindor and their friends. Speak with Elder Faelar, in his hall north-west of the Moonwell.' });
    p.sign('Saelin\'s Armoury', 'Saelin\'s Armoury', ...at(469, 1254));
  },
};
