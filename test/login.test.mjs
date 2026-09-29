// Run with: node test/login.test.mjs
import assert from 'node:assert/strict';
import { LoginFlow, isYesNo } from '../js/login.js';

// An existing character.
let f = new LoginFlow('flan', 'secret');
assert.equal(f.feed('This game is running DuskServer'), null, 'other lines are left alone');
assert.deepEqual(f.feed('Enter your login name:'), { send: 'flan' });
assert.deepEqual(f.feed('Enter your password:'), { send: 'secret' });
assert.deepEqual(f.feed('Login Accepted.'), { done: true });
assert.equal(f.feed('Enter your password:'), null, 'nothing more once in');

// Wrong password.
f = new LoginFlow('flan', 'nope');
f.feed('Enter your login name:');
f.feed('Enter your password:');
assert.deepEqual(f.feed('Incorrect Password.'), { failed: 'Wrong password.' });

// A new character: the player confirms, then the password is set twice.
f = new LoginFlow('newbie', 'pw');
f.feed('Enter your login name:');
assert.deepEqual(f.feed('newbie, Is that correct? (yes/no)'), { confirmNew: 'newbie' });
assert.deepEqual(f.feed('Enter a new password:'), { send: 'pw' });
assert.deepEqual(f.feed('Confirm that password:'), { send: 'pw' });
assert.deepEqual(f.feed('Login Accepted.'), { done: true });

// A refused name, and a ban.
f = new LoginFlow('b4d', 'pw');
f.feed('Enter your login name:');
assert.deepEqual(f.feed('Not a valid name. This may because you left it blank or used invalid symbols. Please try again.'), { failed: 'That name can only use letters.' });
f = new LoginFlow('flan', 'pw');
f.feed('Enter your login name:');
assert.deepEqual(f.feed('Then what IS your name?'), { failed: `The server didn't accept the name "flan".` });
f = new LoginFlow('flan', 'pw');
assert.deepEqual(f.feed('That account has been banned from this server.'), { failed: 'That account is banned from this server.' });

assert.ok(isYesNo('Do you want players to be able to see your presence? (yes/no)'));
assert.ok(isYesNo('flan, Is that correct? (yes/no) '));
assert.ok(!isYesNo('You feel thirsty.'));
console.log('ok - login');
