// The path from the west stair to Aelindor Landing (the eighth AI
// play-test, 2026-10-22, ~/dusk-playtest archive/run8). Coming up the west
// stair from Velkarath (velkarath.mjs STAIRS, the top at 392, 1236), the
// tester was told the ships lie north-east, walked into the forest that
// way, came out on the inlet's west shore a dozen squares from the pier and
// followed it north, away from it. The way is open ground all along (105
// squares), only nothing marks it: a dirt path now runs from the stair's
// stony clearing north, then north-east in long straight runs round the
// trees, to the foot of the pier (ferry.mjs: the pier at 444, 1184), and a
// signpost at the top of the stair points along it.
//
// Built by tools/world/city.mjs; installed with install_city.py.

const O = [385, 1180];
const at = ([x, y]) => [x - O[0], y - O[1]];

// The corners, found on the map: the fewest turns over grass, meadow and
// sand, a square clear of the trees where it can be. It starts where the
// stair's cobbled clearing ends (the cobbles lead up to it).
export const ROUTE = [[393, 1222], [393, 1200], [412, 1200], [412, 1193], [431, 1193], [431, 1184], [441, 1184], [441, 1185], [444, 1185]];
const SIGN = [394, 1235];

export default {
  name: 'The Landing Path',
  origin: O,
  size: [65, 60],
  seed: 1236,
  // Only over grass (36, and 37 with stones), meadow (1) and sand (38).
  mayBuild: (t) => t === 36 || t === 37 || t === 1 || t === 38,
  build(p) {
    p.path(ROUTE.map(at), '.');
    p.sign('To Aelindor Landing', 'Follow the path north, then north-east round the trees: Aelindor Landing and its ships. Velkarath is down the stair.', ...at(SIGN));
  },
};
