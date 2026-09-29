// Run with: node test/races.test.mjs
import assert from 'node:assert/strict';
import { describeRaces } from '../js/races.js';

// As generated from the live server's defRaces.
const d = describeRaces({
  darkelf: { bonuses: { DEX: 3, INT: 2 }, image: 2, start: { x: 110, y: 96 } },
  elf: { bonuses: { DEX: 1, INT: 2, WIS: 2 }, image: 1, start: { x: 3, y: 0 } },
  human: { bonuses: { CON: 1, DEX: 1, INT: 1, STR: 1, WIS: 1 }, image: 0, start: { x: 3, y: 0 } },
  lizardman: { bonuses: { DEX: 1, INT: 2, WIS: 2 }, image: 6, start: { x: 3, y: 0 } },
});

assert.deepEqual(d.human.tags, ['+1 STR', '+1 DEX', '+1 INT', '+1 CON', '+1 WIS'], 'in the usual stat order');
assert.equal(d.human.total, 5);
assert.deepEqual(d.darkelf.tags, ['+3 DEX', '+2 INT']);
assert.equal(d.darkelf.elsewhere, true, 'darkelves start apart from the rest');
assert.equal(d.elf.elsewhere, false);
assert.equal(d.lizardman.image, 6);
assert.equal(d.darkelf.note, 'starts in the Underdark', 'a named starting point');
assert.equal(d.darkelf.title, 'Darkelf: +3 Dexterity, +2 Intelligence. Starts in the Underdark.');
assert.equal(d.elf.note, null);
assert.equal(d.elf.title, 'Elf: +1 Dexterity, +2 Intelligence, +2 Wisdom.');

// Penalties, no bonuses, and every race starting in one place.
const e = describeRaces({
  orc: { bonuses: { STR: 3, INT: -2 }, start: { x: 1, y: 1 } },
  plain: { bonuses: {}, start: { x: 1, y: 1 } },
});
assert.deepEqual(e.orc.tags, ['+3 STR', '-2 INT']);
assert.equal(e.orc.total, 1);
assert.equal(e.plain.title, 'Plain: no stat bonuses.');
assert.equal(e.orc.elsewhere, false, 'no note when all start together');
const f = describeRaces({
  a: { bonuses: {}, start: { x: 1, y: 1 } },
  b: { bonuses: {}, start: { x: 1, y: 1 } },
  c: { bonuses: {}, start: { x: 50, y: 50 } },
});
assert.equal(f.c.note, 'starts elsewhere', 'an unnamed starting point');
assert.equal(f.c.title, 'C: no stat bonuses. Starts somewhere other than the other races (50, 50).');
assert.deepEqual(describeRaces(null), {});
console.log('ok - races');
