// Run with: node test/shop.test.mjs
import assert from 'node:assert/strict';
import { parseWare, parseWares, buyCommand, sellCommand } from '../js/shop.js';

assert.deepEqual(parseWare('120gp)long sword'), { name: 'long sword', price: 120, currency: 'gp' });
assert.deepEqual(parseWare('(120gp)long sword'), { name: 'long sword', price: 120, currency: 'gp' });
assert.deepEqual(parseWare('500exp)swords'), { name: 'swords', price: 500, currency: 'exp' });
assert.deepEqual(parseWare('35gp)pet'), { name: 'pet', price: 35, currency: 'gp' });
assert.deepEqual(parseWare('odd)thing'), { name: 'thing', price: null, currency: 'gp' }, 'unknown price still usable');
assert.equal(parseWare(''), null);

assert.deepEqual(parseWares(['5gp)apple', '5gp)apple', '9gp)ale']).map((w) => w.name), ['apple', 'ale']);

assert.equal(buyCommand('apple'), 'buy 1 apple');
assert.equal(buyCommand('red potion', 5), 'buy 5 red potion');
assert.equal(buyCommand('apple', 0), 'buy 1 apple');
assert.equal(buyCommand('apple', 'x'), 'buy 1 apple');
assert.equal(sellCommand('dagger', 2.7), 'sell 2 dagger');
assert.equal(sellCommand('dagger', 5000), 'sell 999 dagger');
console.log('ok - shop');
{
  const { wareLabel } = await import('../js/shop.js');
  assert.equal(wareLabel('train:double attack'), 'Double Attack');
  assert.equal(wareLabel('train:Dexterity'), 'Dexterity');
  assert.equal(wareLabel('red potion'), 'red potion');
  console.log('ok - wareLabel');
}
