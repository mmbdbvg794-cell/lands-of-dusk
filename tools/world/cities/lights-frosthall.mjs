// Night lights for the walled ice-floored house in the old world at
// 250,262 (shops, no sign): torches on its walls only, see tools/world/lights.mjs.
//   node tools/world/city.mjs tools/world/cities/lights-frosthall.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'Frost hall lights',
  box: [245, 235, 280, 290],
  lamp: null,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
