// Run with: node test/atmosphere.test.mjs
import assert from 'node:assert/strict';
import { daylight, timeOfDay, weatherAt, outdoorShare, isOutdoorTile, DAY_MS, WEATHER_MS, Atmosphere } from '../js/atmosphere.js';

assert.equal(daylight(0), 1);
assert.equal(daylight(DAY_MS * 0.6).toFixed(2), "0.50");
assert.equal(daylight(DAY_MS * 0.7), 0);
assert.equal(daylight(DAY_MS * 0.95).toFixed(2), "0.50");
assert.equal(daylight(DAY_MS * 3 + 10), 1, 'repeats every day');
assert.deepEqual([0, 0.6, 0.7, 0.95].map((p) => timeOfDay(DAY_MS * p)), ['day', 'dusk', 'night', 'dawn']);

// The same weather for everyone through a slot, and a mix over many.
const t = 1_700_000_000_000;
const slot = Math.floor(t / WEATHER_MS) * WEATHER_MS;
assert.equal(weatherAt(slot + 1), weatherAt(slot + WEATHER_MS - 1));
const counts = { clear: 0, rain: 0, storm: 0 };
for (let i = 0; i < 2000; i++) counts[weatherAt(i * WEATHER_MS)]++;
assert.ok(counts.clear > 1000 && counts.rain > 300 && counts.storm > 80, JSON.stringify(counts));

assert.ok(isOutdoorTile(0) && isOutdoorTile(64) && !isOutdoorTile(11));
assert.deepEqual(outdoorShare([0, 0, 11, 11, null]), { outdoor: 0.5, snow: 0 });
assert.deepEqual(outdoorShare([140, 140, 0, 11], new Set([140])), { outdoor: 0.75, snow: 0.5 });
assert.deepEqual(outdoorShare([]), { outdoor: 0, snow: 0 });

const a = new Atmosphere();
const rainy = [...Array(200).keys()].map((i) => i * WEATHER_MS).find((x) => weatherAt(x) === 'rain');
assert.equal(a.state(rainy, { outdoor: 0.8, snow: 0 }).falling, 'rain');
assert.equal(a.state(rainy, { outdoor: 0.8, snow: 0.5 }).falling, 'snow');
assert.equal(a.state(rainy, { outdoor: 0.2, snow: 0 }).falling, null, 'indoors stays dry');
a.weather = false;
assert.equal(a.state(rainy, { outdoor: 0.8, snow: 0 }).falling, null, 'weather off');
a.night = false;
assert.equal(a.state(DAY_MS * 0.7, { outdoor: 1, snow: 0 }).light, 1, 'night off: always day');
console.log('ok - atmosphere');
