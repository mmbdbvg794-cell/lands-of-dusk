// Night lights for the old world's walled desert town (the Midnight Pub,
// the Warden's office): see tools/world/lights.mjs. The rock (49) round
// the desert is natural, so it gets no torches.
//   node tools/world/city.mjs tools/world/cities/lights-midnight.mjs <shortmap> <out dir>
import { lightsPlan, TORCH_ON } from '../lights.mjs';

export default lightsPlan({
  name: 'Midnight Pub town lights',
  box: [400, 0, 500, 105],
  lamp: 'brazier',
  clear: 1,
  walls: Object.keys(TORCH_ON).map(Number).filter((t) => t !== 49),
});
