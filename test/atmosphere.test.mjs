// Run with: node test/atmosphere.test.mjs
import assert from 'node:assert/strict';
import { daylight, timeOfDay, weatherAt, weatherDetail, regionMap, CLIMATES, outdoorShare, isOutdoorTile, DAY_MS, WEATHER_MS, Atmosphere } from '../js/atmosphere.js';
import { readFileSync } from 'node:fs';

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
const counts = { clear: 0, rain: 0, storm: 0, fog: 0 };
for (let i = 0; i < 2000; i++) counts[weatherAt(i * WEATHER_MS)]++;
assert.ok(counts.clear > 950 && counts.rain > 350 && counts.storm > 100 && counts.fog > 150, JSON.stringify(counts));

// Each region keeps to its odds, rolls its own weather, and varies how
// hard and which way.
for (const [region, climate] of Object.entries(CLIMATES)) {
  const n = { clear: 0, rain: 0, storm: 0, fog: 0 };
  for (let i = 0; i < 4000; i++) {
    const d = weatherDetail(i * WEATHER_MS, region);
    n[d.weather]++;
    assert.ok(d.intensity >= 0 && d.intensity <= 1 && Math.abs(d.wind) <= 1, JSON.stringify(d));
    if (d.weather === 'clear') assert.equal(d.intensity, 0);
  }
  for (const w of Object.keys(n)) assert.ok(Math.abs(n[w] / 4000 - climate[w]) < 0.03, `${region} ${w}: ${n[w]}`);
}
let differ = 0;
for (let i = 0; i < 200; i++) differ += weatherAt(i * WEATHER_MS, 'old') !== weatherAt(i * WEATHER_MS, 'sea');
assert.ok(differ > 40, `regions roll apart (${differ})`);
const rains = [...Array(400).keys()].map((i) => weatherDetail(i * WEATHER_MS, 'sea')).filter((d) => d.weather === 'rain');
assert.ok(new Set(rains.map((d) => d.intensity.toFixed(2))).size > 10 && rains.some((d) => d.wind < 0) && rains.some((d) => d.wind > 0));

// The region map: the cities sit in their own regions, mid-ocean is sea.
const regionAt = regionMap(JSON.parse(readFileSync(new URL('../js/regions.json', import.meta.url))));
assert.deepEqual([[95, 357], [1414, 380], [466, 1206], [1691, 1310], [1000, 600], [-5, 10], [5000, 5000]].map(([x, y]) => regionAt(x, y)),
  ['old', 'north', 'south', 'east', 'sea', 'sea', 'sea']);

assert.ok(isOutdoorTile(0) && isOutdoorTile(64) && !isOutdoorTile(11));
assert.deepEqual(outdoorShare([0, 0, 11, 11, null]), { outdoor: 0.5, snow: 0 });
assert.deepEqual(outdoorShare([140, 140, 0, 11], new Set([140])), { outdoor: 0.75, snow: 0.5 });
assert.deepEqual(outdoorShare([]), { outdoor: 0, snow: 0 });

const a = new Atmosphere();
const rainy = [...Array(200).keys()].map((i) => i * WEATHER_MS).find((x) => weatherAt(x) === 'rain');
assert.equal(a.state(rainy, { outdoor: 0.8, snow: 0 }).falling, 'rain');
assert.equal(a.state(rainy, { outdoor: 0.8, snow: 0.5 }).falling, 'snow');
assert.equal(a.state(rainy, { outdoor: 0.2, snow: 0 }).falling, null, 'indoors stays dry');
const away = [...Array(400).keys()].map((i) => i * WEATHER_MS).find((x) => weatherAt(x, 'old') === 'rain' && weatherAt(x, 'east') === 'clear');
a.regionAt = regionAt;
assert.equal(a.state(away, { outdoor: 0.8, snow: 0 }, [95, 357]).falling, 'rain');
assert.equal(a.state(away, { outdoor: 0.8, snow: 0 }, [1691, 1310]).falling, null, 'dry in the East');
assert.equal(a.state(away, { outdoor: 0.8, snow: 0 }, [1691, 1310]).region, 'east');
a.weather = false;
assert.equal(a.state(rainy, { outdoor: 0.8, snow: 0 }).falling, null, 'weather off');
a.night = false;
assert.equal(a.state(DAY_MS * 0.7, { outdoor: 1, snow: 0 }).light, 1, 'night off: always day');
console.log('ok - atmosphere');
