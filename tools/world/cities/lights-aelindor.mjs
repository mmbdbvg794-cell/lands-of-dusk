// Night lights for Aelindor: see tools/world/lights.mjs.
// Aelindor: the oval among the oaks, and its landing to the north.
//   node tools/world/city.mjs tools/world/cities/lights-aelindor.mjs <shortmap> <out dir> <props.json>
import { lightsPlan } from '../lights.mjs';

export default lightsPlan({
  name: 'Aelindor lights',
  box: [430, 1175, 510, 1280],
  lamp: 'lamp post',
  maxLamps: 24,
});
