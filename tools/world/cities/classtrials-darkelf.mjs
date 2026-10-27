// The Dark elf tutorial's trial keeper on its own (classtrials.mjs), to install
// into a live game without rebuilding the tutorial: no squares change.
//   node tools/world/city.mjs tools/world/cities/classtrials-darkelf.mjs <shortmap> <out dir> <props.json>

import { trialYard } from './classtrials.mjs';

export default {
  name: 'Class trials darkelf',
  origin: [1260,850],
  size: [170,140],
  build(p) {
    trialYard(p, 'darkelf');
  },
};
