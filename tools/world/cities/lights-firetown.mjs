// Night lights for Firetown, the old world's island castle in the south
// sea: see tools/world/lights.mjs.
//   node tools/world/city.mjs tools/world/cities/lights-firetown.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'Firetown lights',
  box: [330, 335, 500, 430],
  lamp: 'brazier',
  clear: 1,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
