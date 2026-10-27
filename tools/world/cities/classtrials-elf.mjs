// The Elf tutorial's trial keeper on its own (classtrials.mjs), to install
// into a live game without rebuilding the tutorial: no squares change.
//   node tools/world/city.mjs tools/world/cities/classtrials-elf.mjs <shortmap> <out dir> <props.json>

import { trialYard } from './classtrials.mjs';

export default {
  name: 'Class trials elf',
  origin: [408,1290],
  size: [66,36],
  build(p) {
    trialYard(p, 'elf');
  },
};
