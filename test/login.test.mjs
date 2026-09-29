// Run with: node test/login.test.mjs
import assert from 'node:assert/strict';
import { LoginFlow, isYesNo } from '../js/login.js';

// An existing character. The name goes first, unasked, as the server expects.
let f = new LoginFlow('flan', 'secret');
assert.deepEqual(f.start(), { send: 'flan' });
assert.equal(f.feed('This game is running DuskServer'), null, 'other lines are left alone');
assert.deepEqual(f.feed('Enter your password:'), { send: 'secret' });
assert.deepEqual(f.feed('Login Accepted.'), { done: true });
assert.equal(f.feed('Enter your password:'), null, 'nothing more once in');

// Wrong password.
f = new LoginFlow('flan', 'nope');
f.start();
f.feed('Enter your password:');
assert.deepEqual(f.feed('Incorrect Password.'), { failed: 'Wrong password.' });

// A new character: the player confirms, then the password is set twice.
f = new LoginFlow('newbie', 'pw');
f.start();
assert.deepEqual(f.feed('newbie, Is that correct? (yes/no)'), { confirmNew: 'newbie' });
assert.deepEqual(f.feed('Enter a new password:'), { send: 'pw' });
assert.deepEqual(f.feed('Confirm that password:'), { send: 'pw' });

// ...and, as the live server does it, the race comes after Login Accepted,
// listing every file in defRaces (so .DS_Store too).
assert.deepEqual(f.feed('Login Accepted.'), { accepted: true });
assert.equal(f.feed('This game is running DuskServer v2.7.3.'), null);
assert.deepEqual(f.feed('Choose one of the following races:'), { races: [] });
assert.equal(f.feed('.DS_Store'), null, 'dotfiles are not races');
assert.deepEqual(f.feed('lizardman'), { races: ['lizardman'] });
assert.deepEqual(f.feed('darkelf'), { races: ['lizardman', 'darkelf'] });
assert.deepEqual(f.feed('That is not a valid race, please choose again.'), { raceError: true });
assert.deepEqual(f.pickRace('darkelf'), { send: 'darkelf', done: true });
assert.equal(f.feed('elf'), null, 'nothing more once in');

// An existing character is in at Login Accepted.
f = new LoginFlow('flan', 'pw');
f.start();
f.feed('Enter your password:');
assert.deepEqual(f.feed('Login Accepted.'), { done: true });

// A refused name, and a ban.
f = new LoginFlow('b4d', 'pw');
f.start();
assert.deepEqual(f.feed('Not a valid name. This may because you left it blank or used invalid symbols. Please try again.'), { failed: 'That name can only use letters.' });
// Asked for the name after sending it means it was refused.
f = new LoginFlow('flan', 'pw');
f.start();
assert.deepEqual(f.feed('Enter your login name:'), { failed: `The server didn't accept the name "flan".` });
f = new LoginFlow('flan', 'pw');
f.start();
assert.deepEqual(f.feed('Then what IS your name?'), { failed: `The server didn't accept the name "flan".` });
f = new LoginFlow('flan', 'pw');
assert.deepEqual(f.feed('That account has been banned from this server.'), { failed: 'That account is banned from this server.' });

assert.ok(isYesNo('Do you want players to be able to see your presence? (yes/no)'));
assert.ok(isYesNo('flan, Is that correct? (yes/no) '));
assert.ok(!isYesNo('You feel thirsty.'));
console.log('ok - login');
