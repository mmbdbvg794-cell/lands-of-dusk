// Run with: node test/god.test.mjs
import assert from 'node:assert/strict';
import { GOD_PROMPT, listKind, cleanList, search, place, SAVE_MAP, unset, teleport, wizinvis, addWare, removeWare, SAVED_KINDS } from '../js/god.js';

assert.ok(GOD_PROMPT.test('Do you want players to be able to see your presence? (yes/no)'));
assert.ok(!GOD_PROMPT.test('Do you want to leave your clan? (yes/no)'));

assert.equal(listKind('Items:'), 'items');
assert.equal(listKind('Mobiles:'), 'mobs');
assert.equal(listKind('Props:'), 'props');
assert.equal(listKind('Conf:'), null);

assert.deepEqual(cleanList('mobs', ['rat', 'rat.dsko', 'Bat', '.DS_Store', 'Cave Dragon', 'rat', '']), ['Bat', 'Cave Dragon', 'rat']);
assert.deepEqual(cleanList('items', ['red potion', 'Fire Orb', 'bulk_create_items.sh', 'dc.log', 'apple']), ['apple', 'red potion']);

assert.deepEqual(search(['iron sword', 'iron helmet', 'long sword'], 'SWORD'), ['iron sword', 'long sword']);
assert.deepEqual(search(['iron sword', 'iron helmet', 'long sword'], 'iron sw'), ['iron sword']);
assert.deepEqual(search(['a', 'b', 'c'], '', 2), ['a', 'b']);

assert.equal(place.item('red potion'), '<red potion');
assert.equal(place.mob('Cave Dragon', 3), '<Cave Dragon lev: 3');
assert.equal(place.mob('rat', ''), '<rat');
assert.equal(place.mob('rat', 0), '<rat');
assert.equal(place.prop('Armor Shop'), '<prop Armor Shop');
assert.equal(place.sign('Welcome!'), '<sign Welcome!');
assert.equal(place.merchant(''), '<merchant');
assert.equal(place.merchant('Bob'), '<merchant Bob');
assert.equal(place.tile('12'), '>12');
assert.equal(place.storage('chest', 'Guild'), 'storage place chest Guild');
assert.equal(place.storage('barrel', ''), 'storage place barrel');
assert.equal(SAVE_MAP, '<s');
assert.equal(unset(42), 'unset 42');
assert.equal(teleport('100', 200.7), 'teleport 100 200');
assert.equal(wizinvis(true), 'wizinvis on');
assert.equal(addWare('apple'), 'madd apple');
assert.equal(removeWare('apple'), 'mremove apple');
assert.ok(SAVED_KINDS.has('mob') && !SAVED_KINDS.has('item') && !SAVED_KINDS.has('storage'));
console.log('god tests passed');
