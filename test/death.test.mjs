// Run with: node test/death.test.mjs
import assert from 'node:assert/strict';
import { isDeath, parseLoss, lossSentence } from '../js/death.js';

// As Battle.class sends them.
assert.ok(isDeath('\tYou have died.'));
assert.ok(!isDeath('The slimer has died.'));
assert.ok(!isDeath('\tslimer is killed.'));

assert.deepEqual(parseLoss('You have lost 120gp'), { gold: 120 });
assert.deepEqual(parseLoss('You have lost 3400exp'), { exp: 3400 });
assert.deepEqual(parseLoss('You have lost 5 gp.'), { gold: 5 });
assert.equal(parseLoss('You have lost your way.'), null);

assert.equal(lossSentence({ gold: 120, exp: 3400 }), 'You lost 120 gold and 3,400 experience.');
assert.equal(lossSentence({ exp: 50 }), 'You lost 50 experience.');
assert.equal(lossSentence({}), '');
assert.equal(lossSentence(), '');
console.log('ok - death');
