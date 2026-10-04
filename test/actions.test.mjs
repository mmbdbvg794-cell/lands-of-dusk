// Run with: node test/actions.test.mjs
import assert from 'node:assert/strict';
import { entityActions, distance, TYPE } from '../js/actions.js';

const me = { x: 10, y: 10, range: 1 };
const labels = (acts) => acts.map((a) => (a.disabled ? `${a.label} (${a.hint})` : a.label));

const slimer = { id: 77, name: 'slimer', type: TYPE.MOB, x: 11, y: 11 };
assert.equal(distance(slimer, 10, 10), 2, 'a diagonal is two steps, as the server counts');
assert.deepEqual(entityActions({ ...slimer, y: 10 }, me), [{ label: 'Attack', cmd: 'a 77' }, { label: 'Look', cmd: 'look 77' }]);
assert.deepEqual(entityActions(slimer, me)[0].disabled, true, 'diagonal: too far for melee');

const far = { ...slimer, x: 13, y: 10 };
assert.deepEqual(labels(entityActions(far, me)), ['Attack (too far)', 'Look']);
assert.deepEqual(labels(entityActions(far, { ...me, range: 3 })), ['Attack', 'Look'], 'ranged weapons reach further');
assert.deepEqual(labels(entityActions(far, { ...me, range: 0 })), ['Attack (too far)', 'Look'], 'range 0 still means adjacent');

assert.deepEqual(labels(entityActions({ id: 5, name: 'bob', type: TYPE.PLAYER, x: 12, y: 10 }, me)), ['Look', 'Whisper', 'Trade', 'Add friend']);
assert.deepEqual(labels(entityActions({ id: 5, name: '<clan>Bob', type: TYPE.PLAYER, x: 19, y: 10 }, { ...me, friends: new Set(['bob']) })), ['Look', 'Whisper', 'Trade (get closer)', 'Remove friend']);
assert.equal(entityActions({ id: 5, name: '<clan>Bob', type: TYPE.PLAYER, x: 12, y: 10 }, me).find((a) => a.label === 'Trade').cmd, 'trade Bob');
assert.deepEqual(entityActions({ id: 6, name: 'flan', type: TYPE.PLAYER, x: 10, y: 10 }, me), [
  { label: 'Look at yourself', cmd: 'look 6' },
]);
assert.deepEqual(entityActions({ id: 8, name: 'torch', type: TYPE.ITEM, x: 10, y: 9 }, me), [
  { label: 'Pick up', cmd: 'get torch' },
  { label: 'Look', cmd: 'look 8' },
]);
assert.deepEqual(entityActions({ id: 9, name: 'door', type: TYPE.DOOR, x: 10, y: 9 }, me)[0], { label: 'Open', cmd: 'opendoor 9' });
assert.deepEqual(entityActions({ id: 3, name: 'sign', type: TYPE.SIGN, x: 1, y: 1 }, me), [{ label: 'Read', cmd: 'look 3' }]);
assert.deepEqual(entityActions({ id: 2, name: 'shopkeeper', type: TYPE.MERCHANT, x: 12, y: 10 }, me)[0], { label: 'Go to shop', cmd: 'goto 12 10' });
assert.deepEqual(labels(entityActions({ id: 2, name: 'shopkeeper', type: TYPE.MERCHANT, x: 10, y: 10 }, me)), ['Shop', 'Look']);
assert.deepEqual(labels(entityActions({ id: 7, name: 'rock', type: 9, x: 1, y: 1 }, me)), ['Look'], 'unknown types can still be looked at');
// Gods can remove anything but players; storage only from its square.
const god = { ...me, god: true };
assert.deepEqual(entityActions(slimer, god).at(-1), { label: 'Remove (god)', cmd: 'unset 77', god: true });
assert.deepEqual(labels(entityActions({ id: 3, name: 'sign', type: TYPE.SIGN, x: 1, y: 1 }, god)), ['Read', 'Rename (god)', 'Edit text (god)', 'Remove (god)']);
assert.deepEqual(labels(entityActions({ id: 5, name: 'bob', type: TYPE.PLAYER, x: 12, y: 10 }, god)), ['Look', 'Whisper', 'Trade', 'Add friend', 'Flags (god)']);
assert.deepEqual(entityActions({ id: 4, name: 'barrel', type: TYPE.SIGN, x: 10, y: 10 }, god).at(-1), { label: 'Remove (god)', cmd: 'storage remove', god: true });
assert.deepEqual(labels(entityActions({ id: 4, name: 'barrel', type: TYPE.SIGN, x: 11, y: 10 }, god)), ['Open', 'Remove (god) (stand on it)']);
assert.equal(entityActions(slimer, me).some((a) => a.god), false, 'not for players');

// Storage opens and closes by hand, from next to it.
const barrel = { id: 4, name: 'Water barrel', type: TYPE.SIGN, x: 11, y: 10 };
assert.deepEqual(entityActions(barrel, me), [{ label: 'Open', storage: 'open' }]);
assert.deepEqual(entityActions(barrel, { ...me, storageOpen: 4 }), [{ label: 'Close', storage: 'close' }]);
assert.deepEqual(entityActions({ ...barrel, x: 14 }, me), [{ label: 'Go to the barrel', cmd: 'goto 14 10' }]);
// NPCs with something to say get Talk (from two squares), others don't.
const sarge = { id: 30, name: 'Drill Sergeant', type: TYPE.SIGN, x: 12, y: 10 };
const talkers = new Set(['drill sergeant']);
assert.deepEqual(entityActions(sarge, { ...me, talkers })[0], { label: 'Talk', cmd: 'talk 30' });
assert.deepEqual(entityActions({ ...sarge, x: 14 }, { ...me, talkers })[0], { label: 'Go talk to Drill Sergeant', cmd: 'goto 14 10' });
assert.equal(entityActions(sarge, me).some((a) => a.label === 'Talk'), false);
assert.equal(entityActions({ id: 5, name: 'drill sergeant', type: TYPE.PLAYER, x: 11, y: 10 }, { ...me, talkers }).some((a) => a.label === 'Talk'), false, 'not players');
assert.equal(entityActions({ id: 5, name: 'bob', type: TYPE.PLAYER, x: 11, y: 10 }, me).some((a) => a.flags), false, 'flags are for gods');
assert.deepEqual(entityActions(sarge, me), [{ label: 'Look', cmd: 'look 30' }], 'props are looked at, signs read');
// Tellers from five squares, named ones too; named props talk like their look.
const looks = new Map([['gringotts', 'bank teller'], ['george', 'villager man']]);
const teller = { id: 40, name: 'Gringotts', type: TYPE.SIGN, image: 5, x: 14, y: 10 };
assert.deepEqual(labels(entityActions(teller, { ...me, looks, talkers: new Set(['bank teller']) })).slice(0, 2), ['Talk', 'Deposit box']);
assert.deepEqual(labels(entityActions({ ...teller, x: 16 }, { ...me, looks, talkers: new Set(['bank teller']) }))[0], 'Go talk to Gringotts');
// Signs: read; gods can rename and rewrite them.
const bankSign = { id: 41, name: 'Bank', type: TYPE.SIGN, image: 1, x: 11, y: 10 };
assert.deepEqual(labels(entityActions(bankSign, me)), ['Read']);
assert.deepEqual(labels(entityActions(bankSign, god)), ['Read', 'Rename (god)', 'Edit text (god)', 'Remove (god)']);
console.log('ok - entity actions');
