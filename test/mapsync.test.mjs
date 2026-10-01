// Run with: node test/mapsync.test.mjs
import assert from 'node:assert/strict';
import { MapSync, parseMapLine, encodeChunk, decodeChunk, mapSave, MAP_LOAD } from '../js/mapsync.js';
import { Explored, CHUNK, UNKNOWN } from '../js/explored.js';

assert.deepEqual(parseMapLine('Map: 3,-1 z:abc_-'), { key: '3,-1', data: 'z:abc_-' });
assert.deepEqual(parseMapLine('Map: done 12'), { done: 12 });
assert.equal(parseMapLine('Map of the world'), null);
assert.equal(mapSave('1,2', 'b:xx'), 'mapsave 1,2 b:xx');

// Round trip, compressed and plain.
const tiles = new Uint16Array(CHUNK * CHUNK).fill(UNKNOWN);
for (let i = 0; i < 200; i++) tiles[i * 3] = i % 160;
const z = await encodeChunk(tiles);
assert.ok(/^[zb]:[A-Za-z0-9_-]+$/.test(z), z.slice(0, 20));
assert.ok(z.length < 1500, `compressed to ${z.length}`);
assert.deepEqual(await decodeChunk(z), tiles);
assert.equal(await decodeChunk('z:not-really'), null);
assert.equal(await decodeChunk('q:abc'), null);

// A login: the server's chunks fold in (what's seen here wins), then what
// differs goes back up.
const ex = new Explored();
const view = Array.from({ length: 3 }, () => [5, 5, 5]);
ex.record(1, 1, view); // tiles 0..2 x 0..2 = 5, in chunk 0,0
const server = new Uint16Array(CHUNK * CHUNK).fill(UNKNOWN);
server[0] = 9; // seen here as 5: ours wins
server[40] = 7; // only the server knows
const far = new Uint16Array(CHUNK * CHUNK).fill(UNKNOWN);
far[5] = 3;
const sent = [];
let merged = 0;
const sync = new MapSync({ send: (c) => sent.push(c), explored: () => ex, onMerged: () => merged++ });
sync.load();
assert.deepEqual(sent, [MAP_LOAD]);
assert.equal(sync.feed('Map: 0,0 ' + await encodeChunk(server)), true);
assert.equal(sync.feed('Map: 4,4 ' + await encodeChunk(far)), true);
assert.equal(sync.feed('Map: done 2'), true);
await new Promise((r) => setTimeout(r, 50));
assert.equal(merged, 1);
assert.equal(ex.tileAt(0, 0), 5);
assert.equal(ex.tileAt(40 % CHUNK, Math.floor(40 / CHUNK)), 7);
assert.equal(ex.tileAt(4 * CHUNK + 5, 4 * CHUNK), 3);
sent.length = 0;
assert.equal(await sync.tick(), 1, 'only the chunk that differs from the server');
assert.ok(sent[0].startsWith('mapsave 0,0 '));
assert.equal(await sync.tick(), 0, 'nothing new');
ex.record(1, 1, view); // the same again: no change
assert.equal(await sync.tick(), 0);
ex.record(70, 70, Array.from({ length: 3 }, () => [8, 8, 8]));
sent.length = 0;
assert.equal(await sync.tick(), 1);
assert.ok(sent[0].startsWith('mapsave 2,2 '));
assert.equal(sync.feed('flan: hi'), false);
console.log('ok - mapsync');
