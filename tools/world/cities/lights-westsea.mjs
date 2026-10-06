// Night lights for Westsea Harbour, the old world's ferry pier: see
// tools/world/lights.mjs.
//   node tools/world/city.mjs tools/world/cities/lights-westsea.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'Westsea Harbour lights',
  box: [60, 330, 160, 400],
  lamp: 'lamp post',
  clear: 1,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
