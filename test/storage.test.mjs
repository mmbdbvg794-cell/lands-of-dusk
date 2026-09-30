// Run with: node test/storage.test.mjs
import assert from 'node:assert/strict';
import { StorageReader, nearStorage, isStorage, groupContents, putCommand, takeCommand, lookCommand, storageKind, isTeller, isBoxLine, boxPut, boxTake } from '../js/storage.js';

const r = new StorageReader();
assert.equal(r.feed('You feel hungry.'), null);
assert.deepEqual(r.feed('The chest is empty.'), { listing: { name: 'chest', items: [] }, hide: true });
assert.deepEqual(r.feed('The Guild barrel holds 2 items:'), { listing: null, hide: true });
assert.deepEqual(r.feed('- red potion'), { listing: null, hide: true });
assert.deepEqual(r.feed('- iron sword'), { listing: { name: 'Guild barrel', items: ['red potion', 'iron sword'] }, hide: true });
assert.deepEqual(r.feed('The chest holds 1 item:'), { listing: null, hide: true });
assert.deepEqual(r.feed('- apple'), { listing: { name: 'chest', items: ['apple'] }, hide: true });
// A listing cut short by another line is dropped, and that line read as usual.
r.feed('The chest holds 3 items:');
r.feed('- apple');
assert.equal(r.feed('You feel hungry.'), null);
assert.equal(r.feed('- apple'), null);
assert.deepEqual(r.feed("There's no storage here."), { listing: { none: true }, hide: false });

const ents = [
  { id: 1, type: 3, name: 'barrel', x: 5, y: 5 },
  { id: 2, type: 3, name: 'Guild chest', x: 6, y: 6 },
  { id: 3, type: 3, name: 'fountain', x: 4, y: 4 },
  { id: 4, type: 1, name: 'chest', x: 4, y: 5 }, // an item called chest, on the ground
];
assert.equal(nearStorage(ents, 5, 5).id, 1);
assert.equal(nearStorage(ents, 6, 6).id, 2);
assert.equal(nearStorage(ents, 7, 7).id, 2);
assert.equal(nearStorage(ents, 4, 5).id, 1);
assert.equal(nearStorage(ents, 9, 9), null);
assert.ok(isStorage({ type: 3, name: '<x>barrel' }));
assert.ok(!isStorage({ type: 3, name: 'barrels of fun' }));
assert.equal(storageKind('Guild chest'), 'chest');
assert.equal(storageKind('barrel'), 'barrel');

assert.deepEqual(groupContents(['apple', 'sword', 'apple']), [{ name: 'apple', count: 2 }, { name: 'sword', count: 1 }]);
assert.equal(lookCommand(7), 'storage #7');
assert.equal(putCommand(42, 7), 'storage #7 put 42');
assert.equal(takeCommand('red potion', 7), 'storage #7 take red potion');
// Deposit boxes.
assert.deepEqual(r.feed('The deposit box holds 1 item:'), { listing: null, hide: true });
assert.deepEqual(r.feed('- dagger'), { listing: { name: 'deposit box', items: ['dagger'] }, hide: true });
assert.deepEqual(r.feed("You don't have a deposit box yet. One costs 500 gp."), { listing: { name: 'deposit box', items: [], noBox: 500 }, hide: false });
assert.ok(isBoxLine('The deposit box is empty.') && isBoxLine("You don't have a deposit box yet. One costs 500 gp."));
assert.ok(!isBoxLine('The chest is empty.'));
assert.ok(isTeller({ type: 3, name: 'Bank Teller' }) && !isTeller({ type: 3, name: 'couch' }));
assert.equal(boxPut(9), 'box put 9');
assert.equal(boxTake('iron sword'), 'box take iron sword');
console.log('storage tests passed');
