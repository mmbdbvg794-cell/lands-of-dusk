// Run with: node test/chatlog.test.mjs
import assert from 'node:assert/strict';
import { chatKind, alsoGeneral, CombatTally } from '../js/chatlog.js';

assert.equal(chatKind('\tflan did 5 to rat, flan did 3 to rat.'), 'combat');
assert.equal(chatKind('\trat dodged flan\'s attack.'), 'combat');
assert.equal(chatKind('Shrine gargoyles broken: 2 of 4.'), 'combat', 'a quest count');
assert.ok(alsoGeneral('Shrine gargoyles broken: 4 of 4. Done!'), 'and in General too');
assert.ok(alsoGeneral('Your journal has been updated.'));
assert.equal(chatKind('flan: we need 2 of them'), 'general');
assert.equal(chatKind('\trat is killed.'), 'combat');
assert.equal(chatKind('You get 4 exp.'), 'combat');
assert.equal(chatKind('You have lost 3gp'), 'combat');
assert.equal(chatKind('bluntman has been killed by orc'), 'combat');
assert.equal(chatKind('-flan has attacked rat'), 'combat');
assert.equal(chatKind('rat is out of range.'), 'combat');
assert.equal(chatKind('flan: hello there'), 'general');
assert.equal(chatKind('Drill Sergeant says: Hey you!'), 'general');
assert.equal(chatKind('You feel hungry.'), 'general');
assert.equal(chatKind(''), 'general');
assert.equal(chatKind('bluntman tells you: hi'), 'whisper');
assert.equal(chatKind('You tell bluntman: hey'), 'whisper');
assert.equal(alsoGeneral('\tYou have died.'), true);
assert.equal(alsoGeneral('You got a rat tail'), true);
assert.equal(alsoGeneral('\trat is killed.'), false);

const t = new CombatTally();
assert.equal(t.feed('\tflan did 5 to rat, flan did 0 to rat, rat dodged flan\'s attack.', 'Flan'), true);
assert.equal(t.feed('\trat did 2 to flan, flan dodged rat\'s attack.', 'flan'), true);
t.feed('\trat is killed.', 'flan');
t.feed('\tYou get 12 gp.', 'flan');
t.feed('\tYou get 30 experience.', 'flan');
t.feed('You get 4 exp.', 'flan');
t.feed('\tYou have died.', 'flan');
assert.deepEqual({ ...t }, { kills: 1, deaths: 1, dealt: 5, taken: 2, hits: 1, misses: 2, dodged: 1, exp: 34, gold: 12, best: 5 });
assert.equal(t.feed('flan: hi', 'flan'), false);
t.reset();
assert.equal(t.kills + t.dealt + t.exp, 0);
console.log('ok - chatlog');
