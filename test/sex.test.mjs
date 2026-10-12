// Run with: node test/sex.test.mjs
import assert from 'node:assert/strict';
import { parseSex, sexCommand, maleImage, femaleImage, SEX_ASK } from '../js/sex.js';

assert.equal(SEX_ASK, 'sex');
assert.equal(parseSex('Sex: unset'), 'unset');
assert.equal(parseSex(' Sex: female\n'), 'female');
assert.equal(parseSex('Sex: male'), 'male');
assert.equal(parseSex('Sex: maybe'), null);
assert.equal(parseSex("You're already female. (A god can change it.)"), null);
assert.equal(parseSex('flan: Sex: unset'), null); // someone saying it in chat
assert.equal(sexCommand('female'), 'sex female');
assert.equal(sexCommand('anything'), 'sex male');
for (const [m, f] of [[0, 8], [1, 9], [2, 10], [6, 11]]) {
  assert.equal(femaleImage(m), f);
  assert.equal(femaleImage(f), f);
  assert.equal(maleImage(f), m);
  assert.equal(maleImage(m), m);
}
assert.equal(femaleImage(4), 4); // other characters keep their look
console.log('ok - sex');
