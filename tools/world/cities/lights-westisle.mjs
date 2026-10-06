// Night lights for the walled compound on the old world's western isle
// (the sparring room, the spells, the harder quest): see tools/world/lights.mjs.
//   node tools/world/city.mjs tools/world/cities/lights-westisle.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'West isle lights',
  box: [110, 860, 220, 925],
  lamp: 'lamp post',
  clear: 1,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
