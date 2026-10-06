// Indoors for the weather (js/weather.js indoorSquares): rooms closed in by
// walls and doors, not open ground, not a walled town, and hand marks win.
import assert from 'node:assert/strict';
import { indoorSquares, greenCountry, caveFloor } from '../js/weather.js';

// A map from rows of characters: '#' wall (59), 'D' door (23), '.' floor
// (63), ',' grass (36), 'T' tree (64), '?' never seen.
function mapOf(rows) {
  const T = { '#': 59, D: 23, '.': 63, ',': 36, T: 64 };
  return (x, y) => (rows[y]?.[x] === undefined || rows[y][x] === '?' ? null : T[rows[y][x]]);
}

const town = mapOf([
  ',,,,,,,,,,,,',
  ',######,,,,,',
  ',#....#,TTT,',
  ',#....#,T,T,',
  ',##D###,TTT,',
  ',,,,,,,,,,,,',
]);
const inside = indoorSquares(town, 5, 3, 6);
assert.ok(inside.has('2,2') && inside.has('5,3'), 'the room is indoors');
assert.ok(!inside.has('0,0') && !inside.has('3,5'), 'the street is not');
assert.ok(!inside.has('9,3'), 'a clearing in trees is not a room');
assert.ok(!inside.has('3,4'), 'the door itself is not indoors');

// A room only partly seen still counts; a street running out of sight doesn't.
const half = mapOf(['#####', '#..??', '#####', ',,,??']);
assert.ok(indoorSquares(half, 2, 1, 4).has('1,1'));
assert.ok(!indoorSquares(half, 2, 1, 4).has('1,3'));

// A walled town (streets and grass inside) isn't a room, nor is a floor
// bigger than a hall.
const walled = ['#'.repeat(20), ...Array.from({ length: 6 }, () => '#' + '.'.repeat(9) + ','.repeat(9) + '#'), '#'.repeat(20)];
assert.ok(!indoorSquares(mapOf(walled), 5, 3, 15).has('5,3'));
const big = ['#'.repeat(20), ...Array.from({ length: 12 }, () => '#' + '.'.repeat(18) + '#'), '#'.repeat(20)];
assert.ok(!indoorSquares(mapOf(big), 10, 6, 15).has('10,6'));

// Hand marks win both ways.
const marked = indoorSquares(town, 5, 3, 6, new Map([['0,0', true], ['2,2', false]]));
assert.ok(marked.has('0,0') && !marked.has('2,2'));

// Fireflies: green country, not towns (but Aelindor), and wisps on cave floors.
const field = mapOf([',,,,,,,,,,,', ',,,,,,,,,,,', ',,,,,,,,,,,', ',,,,,,,,,,,', ',,,,,,,,,,,', ',,,,,,,,,,,', ',,,,,,,,,,,']);
assert.ok(greenCountry(field, 5, 3), 'a field has fireflies');
assert.ok(!greenCountry(town, 9, 1), 'grass by a house in town does not');
assert.ok(greenCountry((x, y) => (x === 460 && y === 1230 ? 36 : 59), 460, 1230), 'Aelindor does, walls or not');
assert.ok(caveFloor(() => 20, 0, 0) && !caveFloor(() => 49, 0, 0));

console.log('ok - weather indoors');
