// Run with: node test/explored.test.mjs
import assert from 'node:assert/strict';
import { Explored, CHUNK } from '../js/explored.js';

const grid = (n, f) => Array.from({ length: n }, (_, x) => Array.from({ length: n }, (_, y) => f(x, y)));

const e = new Explored();
assert.equal(e.tileAt(0, 0), null, 'nothing seen yet');

// A 3x3 view around (10, 20): tiles[vx][vy], world x = 10 - 1 + vx.
const changed = e.record(10, 20, grid(3, (x, y) => x * 10 + y));
assert.equal(changed.length, 9);
assert.equal(e.tileAt(9, 19), 0);
assert.equal(e.tileAt(11, 19), 20);
assert.equal(e.tileAt(9, 21), 2);
assert.equal(e.tileAt(12, 20), null, 'outside the view stays unknown');
assert.equal(e.dirty, true);

// Seeing the same tiles again changes nothing; a changed tile is reported.
assert.deepEqual(e.record(10, 20, grid(3, (x, y) => x * 10 + y)), []);
assert.deepEqual(e.record(10, 20, grid(3, (x, y) => (x === 1 && y === 1 ? 99 : x * 10 + y))), [[10, 20, 99]]);

// Views across chunk edges and at negative coordinates.
e.record(0, 0, grid(3, () => 5));
assert.equal(e.tileAt(-1, -1), 5);
assert.equal(e.tileAt(1, 1), 5);
assert.ok(e.chunkAt(-1, -1) && e.chunkAt(0, 0));
e.record(CHUNK, 3, grid(3, () => 6));
assert.equal(e.tileAt(CHUNK - 1, 2), 6);
assert.equal(e.tileAt(CHUNK + 1, 4), 6);

// Round trip through the saved form.
const saved = e.serialize();
const back = Explored.deserialize(saved);
for (const [x, y] of [[9, 19], [10, 20], [-1, -1], [CHUNK + 1, 4]]) assert.equal(back.tileAt(x, y), e.tileAt(x, y));
assert.equal(back.tileAt(50, 50), null);
assert.deepEqual([...back.chunks.keys()].sort(), [...e.chunks.keys()].sort());

// Merging a save keeps this session's tiles and fills in the rest.
const now = new Explored();
now.record(10, 20, grid(3, () => 42));
now.merge(back);
assert.equal(now.tileAt(10, 20), 42, 'newer tile wins');
assert.equal(now.tileAt(-1, -1), 5, 'saved tile filled in');

// Damaged saves start afresh rather than throwing.
for (const bad of ['', 'nope', '{"v":2}', '{"v":1,"chunk":32,"chunks":{"0,0":"!!"}}', `{"v":1,"chunk":16,"chunks":{}}`]) {
  assert.equal(Explored.deserialize(bad).chunks.size, 0, bad);
}
console.log('ok - explored tiles');
