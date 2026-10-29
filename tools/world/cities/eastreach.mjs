// Eastreach: a ferry port on the eastern continent's west-facing beach.
// Built by tools/world/city.mjs; the ferry network is in ferry.mjs.

import { captain, clearMooring } from './ferry.mjs';

const O = [1680, 1294];

export default {
  name: 'Eastreach',
  origin: O,
  size: [20, 18],
  seed: 37,
  // The beach and the sea beside it.
  mayBuild: (t) => [38, 39, 36, 1, 0].includes(t) || (t >= 66 && t <= 89),
  build(p) {
    const at = (x, y) => [x - O[0], y - O[1]];
    // A boathouse on the beach.
    p.building(...at(1682, 1300), 6, 5, { doors: [['e', 2]] });
    p.prop('chair', ...at(1684, 1302));
    // The pier, three planks wide; the ferry docks beside it.
    p.fill(...at(1689, 1302), 7, 3, '=');
    clearMooring(p, 'eastreach');
    p.npc({ name: 'Captain Brann', look: 'Villager Man', desc: 'Captain Brann, weathered as an old sail.', x: 1695 - O[0], y: 1303 - O[1], dlg: captain('eastreach', 'Ships west to Westsea Harbour and Aelindor Landing!') });
    p.sign('Eastreach', 'Eastreach', ...at(1688, 1305));
  },
};
