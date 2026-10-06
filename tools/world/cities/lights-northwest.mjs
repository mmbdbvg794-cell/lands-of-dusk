// Night lights for the old world's north-west village (the Information
// Office, the town smithy) and the houses round it: see tools/world/lights.mjs.
//   node tools/world/city.mjs tools/world/cities/lights-northwest.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'North-west village lights',
  box: [0, 0, 135, 75],
  lamp: 'lamp post',
  clear: 1,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
