// The Lizardfolk tutorial's trial keeper on its own (classtrials.mjs), to install
// into a live game without rebuilding the tutorial: no squares change.
//   node tools/world/city.mjs tools/world/cities/classtrials-lizardman.mjs <shortmap> <out dir> <props.json>

import { trialYard } from './classtrials.mjs';

export default {
  name: 'Class trials lizardman',
  origin: [1846,990],
  size: [66,36],
  build(p) {
    trialYard(p, 'lizardman');
  },
};
