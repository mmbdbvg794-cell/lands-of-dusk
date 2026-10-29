// Water barrels (the user, 2026-10-29): one in each bounty-board town and
// at Last Water. Talk to one to drink (not thirsty, as a flask of water)
// and fill every waterskin you carry. Waterskins hold three drinks: each
// drink turns a full one half-full, then nearly empty, then empty, and the
// empty one waits for a barrel (js/dialogue.js WATERSKINS, the "drink" and
// "fill" effects). Shops that sell water sell full waterskins too
// (tools/server/add_waterskins.py).
//
// Built by tools/world/city.mjs like the bounty boards: no squares change,
// the barrels stand on open ground beside each town's board, given in map
// coordinates (the plan's grid is a single square at 0,0).

import { WATERSKINS, THIRST_TICKS } from '../../../js/dialogue.js';

const BARREL = 'Water Barrel';
const SPOTS = [
  [1445, 354], // Kingshaven, south-west of the bounty board
  [480, 1225], // Aelindor
  [1346, 909], // Velkarath
  [1677, 1307], // Eastreach
  [106, 155], // the City of Light
  [446, 81], // Midnight
  [533, 14], // Southfield
  [1694, 948], // Ssarakh
  [784, 1530], // Last Water, by the spring
];

const DLG = {
  shouts: [],
  stages: [{
    when: { kind: 'always', value: '' },
    // Actions, not speech: the client shows just the words, in italics.
    verb: 'acts',
    says: 'A barrel of fresh water, with a dipper on a string.',
    answers: [
      { label: 'Drink', reply: 'Cold and clean. Any waterskin you carry is full again.', replyVerb: 'acts', effects: [{ kind: 'drink' }, { kind: 'fill' }] },
      { label: 'Leave it', reply: 'You leave the dipper hanging.', replyVerb: 'acts', effects: [] },
    ],
  }],
};

const itemFile = (desc, cost, onuse) => `type\nitem\ndescription\n${desc}\ncost\n${cost}\nimage\n6\n${onuse ? `onuse\n${onuse}\n` : ''}.\n`;
const DESCS = [
  'a leather waterskin, full: three drinks of water',
  'a leather waterskin, half full: two drinks left',
  'a leather waterskin, nearly empty: one drink left',
  'an empty leather waterskin. Fill it at a water barrel',
];
const LINES = ['*Gulp* Cool water from your waterskin.', '*Gulp* Your waterskin is getting light.', '*Gulp* The last of your water.'];
const script = (i) => `chat trigger "${LINES[i]}"
addconditionwithduration trigger nothirst ${THIRST_TICKS}
removeitem trigger "${WATERSKINS[i]}"
giveitem trigger "${WATERSKINS[i + 1]}"
endscript
`;

export default {
  name: 'Water Barrels',
  origin: [0, 0],
  size: [1, 1],
  seed: 83,
  oldWorld: true,
  mayBuild: () => false, // no squares change
  build(p) {
    WATERSKINS.forEach((name, i) => {
      const last = i === WATERSKINS.length - 1;
      p.file(`defItems/${name}`, itemFile(DESCS[i], i === 0 ? 25 : 5, last ? null : `waterskin_${i}`));
      if (!last) p.file(`scripts/waterskin_${i}`, script(i));
    });
    const [[x0, y0], ...rest] = SPOTS;
    p.npc({ name: BARREL, look: 'barrel', desc: 'A barrel of fresh water, with a dipper on a string.', x: x0, y: y0, dlg: DLG });
    for (const [x, y] of rest) p.prop(BARREL, x, y);
  },
};
