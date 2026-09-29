// Run with: node test/stats.test.mjs
import assert from 'node:assert/strict';
import { parseStats } from '../js/stats.js';

// Opcode 8 as captured.
const s = parseStats([
  '37 gp', '0 exp', 'str: 7 + -1', 'int: 7 + 1', 'dex: 7 + 2', 'con: 7 + -2', 'wis: 7 + -2',
  'DamMod: 600', 'Range: 1', 'AC: 42', '', 'Stamina: 30/30',
  '-Affected by-', 'thirst', '-Skills-', '-Spells-',
]);
assert.equal(s.gold, 37);
assert.equal(s.exp, 0);
assert.deepEqual(s.attributes.map((a) => [a.label, a.base, a.bonus]), [
  ['Strength', 7, -1], ['Intelligence', 7, 1], ['Dexterity', 7, 2], ['Constitution', 7, -2], ['Wisdom', 7, -2],
]);
assert.deepEqual(s.values, [
  { label: 'Damage modifier', value: '600' },
  { label: 'Range', value: '1' },
  { label: 'Armour (AC)', value: '42' },
]);
assert.deepEqual(s.bars, [{ label: 'Stamina', value: 30, max: 30 }]);
assert.deepEqual(s.sections, [
  { title: 'Affected by', items: ['thirst'] },
  { title: 'Skills', items: [] },
  { title: 'Spells', items: [] },
]);
assert.deepEqual(s.other, []);

// Anything unrecognised is kept, not lost.
const odd = parseStats(['Welcome', 'foo: 3 + 1', 'Level: 4']);
assert.deepEqual(odd.other, ['Welcome']);
assert.deepEqual(odd.attributes, [], 'only the five known attributes');
assert.deepEqual(odd.values, [{ label: 'foo', value: '3 + 1' }, { label: 'Level', value: '4' }]);
assert.equal(parseStats([]).gold, null);
console.log('ok - stats');
