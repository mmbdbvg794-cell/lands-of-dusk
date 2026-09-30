// Run with: node test/stats.test.mjs
import assert from 'node:assert/strict';
import { parseStats } from '../js/stats.js';
import { playerConditions } from '../js/stats.js';

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

// With no bonus the server leaves the "+ n" off.
{
  const t = parseStats(['100 gp', '0 exp', 'str: 7', 'int: 7', 'dex: 7', 'con: 7 + -1', 'wis: 7 + -1', 'DamMod: 0', 'AC: 39']);
  assert.deepEqual(t.attributes.map((a) => [a.key, a.base, a.bonus]), [['str', 7, 0], ['int', 7, 0], ['dex', 7, 0], ['con', 7, -1], ['wis', 7, -1]]);
  assert.deepEqual(t.values.map((v) => v.label), ['Damage modifier', 'Armour (AC)']);
}

// Only hunger and thirst are shown to players, not quest flags.
assert.deepEqual(playerConditions(['thief', 'visitedSlots', 'thirst', 'nohunger', 'Hunger', 'playing']), ['Thirsty', 'Hungry']);
assert.deepEqual(playerConditions([]), []);
console.log('ok - player conditions');

