// Night lights for Eastreach: see tools/world/lights.mjs.
// Eastreach port and the Warden's Post; campfires at the frontier camps.
//   node tools/world/city.mjs tools/world/cities/lights-eastreach.mjs <shortmap> <out dir> <props.json>
import { lightsPlan } from '../lights.mjs';

export default lightsPlan({
  name: 'Eastreach lights',
  box: [1640, 1280, 1700, 1320],
  lamp: 'lamp post',
  maxLamps: 12,
  campfires: [[1576, 1359], [1590, 1180]], // Scout Kell's camp, the Sand Kings' camp
});
