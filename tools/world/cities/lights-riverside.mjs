// Night lights for Riverside, the old world's village east of the river
// (Riverside Inn, the Sabin mines): see tools/world/lights.mjs.
//   node tools/world/city.mjs tools/world/cities/lights-riverside.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'Riverside lights',
  box: [167, 50, 260, 260],
  lamp: 'lamp post',
  clear: 1,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
