// Run with: node test/ambience.test.mjs
import assert from 'node:assert/strict';
import { areaCounts, areaMix } from '../js/ambience.js';

const view = (pairs) => pairs.flatMap(([t, n]) => Array(n).fill(t));
const woods = areaCounts(view([[64, 60], [36, 40], [20, 21]]));
assert.equal(woods.trees, 60);
assert.equal(woods.total, 121);
const day = areaMix(woods, { light: 1 }), night = areaMix(woods, { light: 0 });
assert.ok(day.birds > 0.8 && day.crickets === 0, 'birds by day');
assert.ok(night.crickets > 0.8 && night.birds === 0 && night.owls > 0.8, 'crickets and owls at night');
assert.equal(day.waves, 0);

const shore = areaMix(areaCounts(view([[65, 70], [38, 30], [36, 21]])), { light: 1 });
assert.ok(shore.waves > 0.9 && shore.gulls > 0.9, 'waves and gulls by the sea');

const snow = areaMix(areaCounts(view([[109, 100], [36, 21]]), new Set([109])), { light: 1 });
assert.ok(snow.wind > 0.8 && snow.birds < 0.1, 'wind and no birds on snow');

const cave = areaMix(areaCounts(view([[20, 121]])), { underground: true });
assert.deepEqual([cave.cave, cave.drips, cave.birds, cave.wind], [1, 1, 0, 0]);

const empty = areaMix(areaCounts([null, null]), { light: 1 });
assert.ok(empty.birds === 0 && empty.waves === 0 && empty.wind > 0, 'nothing in view: a breath of wind');
// A town's sandy streets aren't the desert.
const streets = areaCounts(view([[38, 90], [59, 31]]));
assert.ok(areaMix(streets, { light: 1 }).wind > 0.6 && areaMix(streets, { light: 1, town: true }).wind < 0.3);
console.log('ok - ambience');
