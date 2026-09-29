// Run with: node test/actions.test.mjs
import assert from 'node:assert/strict';
import { entityActions, distance, TYPE } from '../js/actions.js';

const me = { x: 10, y: 10, range: 1 };
const labels = (acts) => acts.map((a) => (a.disabled ? `${a.label} (${a.hint})` : a.label));

const slimer = { id: 77, name: 'slimer', type: TYPE.MOB, x: 11, y: 11 };
assert.equal(distance(slimer, 10, 10), 1, 'diagonal counts as one');
assert.deepEqual(entityActions(slimer, me), [{ label: 'Attack', cmd: 'a 77' }, { label: 'Look', cmd: 'look 77' }]);

const far = { ...slimer, x: 13 };
assert.deepEqual(labels(entityActions(far, me)), ['Attack (too far)', 'Look']);
assert.deepEqual(labels(entityActions(far, { ...me, range: 3 })), ['Attack', 'Look'], 'ranged weapons reach further');
assert.deepEqual(labels(entityActions(far, { ...me, range: 0 })), ['Attack (too far)', 'Look'], 'range 0 still means adjacent');

assert.deepEqual(labels(entityActions({ id: 5, name: 'bob', type: TYPE.PLAYER, x: 12, y: 10 }, me)), ['Look']);
assert.deepEqual(entityActions({ id: 6, name: 'flan', type: TYPE.PLAYER, x: 10, y: 10 }, me), [
  { label: 'Look at yourself', cmd: 'look 6' },
]);
assert.deepEqual(entityActions({ id: 8, name: 'torch', type: TYPE.ITEM, x: 10, y: 9 }, me), [
  { label: 'Pick up', cmd: 'get torch' },
  { label: 'Look', cmd: 'look 8' },
]);
assert.deepEqual(entityActions({ id: 9, name: 'door', type: TYPE.DOOR, x: 10, y: 9 }, me)[0], { label: 'Open', cmd: 'opendoor 9' });
assert.deepEqual(entityActions({ id: 3, name: 'sign', type: TYPE.SIGN, x: 1, y: 1 }, me), [{ label: 'Read', cmd: 'look 3' }]);
assert.deepEqual(labels(entityActions({ id: 2, name: 'rock', type: TYPE.PROP, x: 1, y: 1 }, me)), ['Look']);
console.log('ok - entity actions');
