// The Human tutorial's trial keeper on its own (classtrials.mjs), to install
// into a live game without rebuilding the tutorial: no squares change.
//   node tools/world/city.mjs tools/world/cities/classtrials-human.mjs <shortmap> <out dir> <props.json>

import { trialYard } from './classtrials.mjs';

export default {
  name: 'Class trials human',
  origin: [0,0],
  size: [148,394],
  build(p) {
    trialYard(p, 'human');
  },
};
