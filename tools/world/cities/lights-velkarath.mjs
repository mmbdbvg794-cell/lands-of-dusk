// Night lights for Velkarath: see tools/world/lights.mjs.
// Velkarath and its caverns: torches on the cave rock, braziers in the
// open (dark elves keep fire, not lanterns). The sealed tutorial caves
// (1260-1310, 950-975) keep their own lighting.
//   node tools/world/city.mjs tools/world/cities/lights-velkarath.mjs <shortmap> <out dir> <props.json>
import { lightsPlan } from '../lights.mjs';

export default lightsPlan({
  name: 'Velkarath lights',
  box: [1262, 852, 1428, 988],
  lamp: 'brazier',
  lampBox: [1300, 885, 1400, 945], // braziers in the town itself; the caves get torches
  maxLamps: 60,
  skip: [[1260, 950, 1310, 975]],
});
