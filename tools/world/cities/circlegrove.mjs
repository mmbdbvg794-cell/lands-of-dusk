// The Circle's grove: the clearing in The Circle's wood (circlewood.mjs),
// radius 5 round 705,1218, furnished. Seven standing stones in a ring,
// open on the east where the trail comes in; a campfire in the middle;
// The Circle's trainer (nature group: only members see and learn it,
// server/Classes.java); three herb patches to gather (moonpetal, the
// rarest, with wolfsbane and mandrake; server/Crafting.java knows them by
// name). Build after circlewood.mjs. Built by tools/world/city.mjs.
export default {
  name: "The Circle's grove",
  origin: [700, 1213],
  size: [11, 11],
  seed: 42,
  build(p) {
    const at = (x, y) => [x - 700, y - 1213];
    // Standing stones (rough rock) at radius 4, none on the east (the trail).
    for (const [x, y] of [[708, 1221], [705, 1222], [702, 1221], [701, 1218], [702, 1215], [705, 1214], [708, 1215]]) p.set(...at(x, y), 'R');
    p.prop('campfire', ...at(705, 1218));
    p.merchant(...at(705, 1220), ['train:nature group', 'train:Spell Power'], 'Circle Trainer');
    p.prop('moonpetal patch', ...at(703, 1219));
    p.prop('wolfsbane patch', ...at(707, 1217));
    p.prop('mandrake patch', ...at(703, 1217));
  },
};
