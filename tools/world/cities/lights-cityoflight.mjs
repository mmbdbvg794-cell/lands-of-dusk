// Night lights for the City of Light, the old world's walled castle town:
// see tools/world/lights.mjs. Its streets are three squares wide, so lamps
// need only one clear square round them; natural rock (49) gets no torches.
//   node tools/world/city.mjs tools/world/cities/lights-cityoflight.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'City of Light lights',
  box: [30, 95, 165, 215],
  lamp: 'lamp post',
  clear: 1,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
