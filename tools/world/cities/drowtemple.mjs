// The Drow Priesthood's trainer, in Velkarath's Temple of the Spider Queen
// (1360-1376 x 894-904), beside Priestess Ilvra (1370,899): the drow school
// (server/Classes.java shows and teaches it only to Priests and Priestesses).
// Built by tools/world/city.mjs.
export default {
  name: 'The Drow Priesthood (trainer)',
  origin: [1372, 899],
  size: [1, 1],
  seed: 51,
  build(p) {
    p.merchant(0, 0, ['train:drow group', 'train:Spell Power'], 'Drow Priesthood Trainer');
  },
};
