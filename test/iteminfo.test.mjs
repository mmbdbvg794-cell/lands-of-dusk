// Run with: node test/iteminfo.test.mjs
import assert from 'node:assert/strict';
import { describeItem } from '../js/iteminfo.js';

const info = {
  'red potion': { cost: 2000, desc: 'a red swirling potion', type: 'item', uses: 1 },
  'leather cap': { cost: 50, desc: 'a leather cap', kind: 'skull', mod: 10, type: 'armor' },
  'long sword': { cost: 100, desc: 'long sword', mod: 150, type: 'weapon' },
};
assert.deepEqual(describeItem(info, 'Red Potion'), { kind: 'Item', lines: [['Uses', '1'], ['Value', '2,000 gp']], desc: 'a red swirling potion' });
assert.deepEqual(describeItem(info, 'leather cap'), { kind: 'Helmet', lines: [['Armour', '+10'], ['Value', '50 gp']], desc: '' });
assert.deepEqual(describeItem(info, 'long_sword'), { kind: 'Weapon', lines: [['Damage', '+150'], ['Value', '100 gp']], desc: '' }, 'a description that only repeats the name is left out');
assert.equal(describeItem(info, 'nothing'), null);
assert.equal(describeItem(null, 'red potion'), null);
console.log('ok - iteminfo');
