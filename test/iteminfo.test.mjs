// Run with: node test/iteminfo.test.mjs
import assert from 'node:assert/strict';
import { describeItem, armourPoints } from '../js/iteminfo.js';

const info = {
  'red potion': { cost: 2000, desc: 'a red swirling potion', type: 'item', uses: 1 },
  'leather cap': { cost: 50, desc: 'a leather cap', kind: 'skull', mod: 10, type: 'armor' },
  'long sword': { cost: 100, desc: 'long sword', mod: 150, type: 'weapon' },
};
assert.deepEqual(describeItem(info, 'Red Potion'), { kind: 'Item', lines: [['Uses', '1'], ['Value', '2,000 gp']], desc: 'a red swirling potion' });
// Armour is what it really adds (a helmet counts 0.2 of its mod).
assert.deepEqual(describeItem(info, 'leather cap'), { kind: 'Helmet', lines: [['Armour', '+2'], ['Value', '50 gp']], desc: '' });
assert.equal(armourPoints('arms', 200), '+10', 'a shield');
assert.equal(armourPoints('torso', 50), '+20', 'a suit');
assert.equal(armourPoints('legs', 50), '+2.5');
assert.equal(armourPoints('feet', 30), '+30', 'a slot the server doesn\'t count: as it is');
assert.deepEqual(describeItem(info, 'long_sword'), { kind: 'Weapon', lines: [['Damage', '+150'], ['Value', '100 gp']], desc: '' }, 'a description that only repeats the name is left out');
assert.equal(describeItem(info, 'nothing'), null);
assert.equal(describeItem(null, 'red potion'), null);
// Range and requirements (2026-10-21 rebalance).
{
  const d = describeItem({ 'steel helmet': { type: 'armor', kind: 'skull', mod: 150, needs: 'STR 30' }, 'cheap bow': { type: 'ranged', mod: 140, range: 4 } }, 'steel helmet');
  assert.deepEqual(d.lines.find((l) => l[0] === 'Needs'), ['Needs', 'Strength 30']);
  const b = describeItem({ 'cheap bow': { type: 'ranged', mod: 140, range: 4 } }, 'cheap bow');
  assert.deepEqual(b.lines.find((l) => l[0] === 'Range'), ['Range', '4 squares']);
}
console.log('ok - iteminfo');
