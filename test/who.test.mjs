// Run with: node test/who.test.mjs
import assert from 'node:assert/strict';
import { describeWho } from '../js/who.js';

const now = 1_800_000_000_000;
const w = describeWho({ updated: now - 10_000, players: [
  { name: 'flan', race: 'human', title: 'the newbie.', god: true, since: now - 3_700_000, clan: null, leader: false },
  { name: 'Aria', race: 'darkelf', title: null, god: false, since: now - 20_000, clan: 'Night Blades', leader: true },
] }, now);
assert.equal(w.count, '2 players online');
assert.deepEqual(w.rows.map((r) => r.name), ['Aria', 'flan'], 'sorted by name');
assert.deepEqual(w.rows[1], { name: 'flan', race: 'Human', title: 'the newbie', god: true, clan: '', online: 'online 1 h 1 min' });
assert.equal(w.rows[0].race, 'Dark elf');
assert.equal(w.rows[0].online, 'online just now');
assert.equal(w.rows[0].clan, 'Night Blades (leader)');
assert.equal(describeWho({ updated: now, players: [{ name: 'x', clan: 'Wolves', leader: false }] }, now).rows[0].clan, 'Wolves');
assert.equal(w.updated, 'Updated just now.');
assert.equal(describeWho({ updated: now, players: [] }, now).count, 'Nobody is playing right now.');
assert.equal(describeWho({ updated: now, players: [{ name: 'x', race: 'elf' }] }, now).count, '1 player online');
// No file yet, or a server that stopped writing it.
assert.equal(describeWho(null, now).rows.length, 0);
assert.match(describeWho({ updated: now - 600_000, players: [{ name: 'x' }] }, now).empty, /hasn't updated/);
console.log('ok - who');
