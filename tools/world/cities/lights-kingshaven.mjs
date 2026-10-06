// Night lights for Kingshaven: see tools/world/lights.mjs.
// Kingshaven: inside the walls, the harbour and the edge of the sprawl.
//   node tools/world/city.mjs tools/world/cities/lights-kingshaven.mjs <shortmap> <out dir> <props.json>
import { lightsPlan } from '../lights.mjs';

export default lightsPlan({
  name: 'Kingshaven lights',
  box: [1380, 300, 1500, 410],
  lamp: 'lamp post',
  maxLamps: 80,
  campfires: [[1490, 418]], // the thieves' hideout on the point
});
