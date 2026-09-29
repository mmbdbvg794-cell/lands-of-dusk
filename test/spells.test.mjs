// Run with: node test/spells.test.mjs
import assert from 'node:assert/strict';
import { effectKind, defaultAim, castCommand, isCastFailure, landedOnMe } from '../js/spells.js';

assert.equal(effectKind('mend'), 'heal');
assert.equal(effectKind(' Mend '), 'heal');
assert.equal(effectKind('hells fire'), 'fire');
assert.equal(effectKind('curse'), 'dark');
assert.equal(effectKind('bless'), 'holy');
assert.equal(effectKind('something new'), 'arcane');

assert.equal(defaultAim('mend'), 'self');
assert.equal(defaultAim('bless'), 'self');
assert.equal(defaultAim('meteor'), 'target');
assert.equal(defaultAim('unknown'), 'target');

// One word as is; spaces mean quotes, as LivingThing.castSpell expects.
assert.equal(castCommand('mend'), 'cast mend');
assert.equal(castCommand('mend', 'bob'), 'cast mend bob');
assert.equal(castCommand('hells fire', 'slimer'), 'cast "hells fire" slimer');
assert.equal(castCommand('hells fire'), 'cast "hells fire"');

assert.ok(isCastFailure("You don't know that spell."));
assert.ok(isCastFailure("You don't have enough mp to cast that spell."));
assert.ok(isCastFailure('You do not see them here.'));
assert.ok(!isCastFailure('You focus energy into mending your wounds.'));

assert.equal(landedOnMe('You feel slightly less wounded.'), 'heal');
assert.equal(landedOnMe('You feel thirsty.'), null);
console.log('ok - spells');

import { parseCast, spellName } from '../js/spells.js';
assert.deepEqual(parseCast('cast mend'), { spell: 'mend', target: '' });
assert.deepEqual(parseCast('cast mend bob'), { spell: 'mend', target: 'bob' });
assert.deepEqual(parseCast('Cast "hells fire" big slimer'), { spell: 'hells fire', target: 'big slimer' });
assert.equal(parseCast('look 5'), null);
assert.equal(parseCast('castle'), null);
assert.equal(spellName('mend'), 'mend');
assert.equal(spellName('mend (85%)'), 'mend');
assert.equal(spellName('meteor 40%'), 'meteor');
assert.equal(spellName('hells fire: 12'), 'hells fire');
console.log('ok - spell commands');

import { compileMessages } from '../js/spells.js';
const msgs = compileMessages({
  mend: { caster: ['You do not see them here.', 'You focus energy into mending your wounds.', "You focus on mending {name}'s wounds."], target: ['You feel slightly less wounded.'] },
  armor: { caster: ['You surround yourself in a magical shield'], target: ["{name}'s magical shield surrounds you."] },
});
assert.equal(msgs.castBy('You focus energy into mending your wounds.'), 'mend');
assert.equal(msgs.castBy("You focus on mending Big Bob's wounds."), 'mend');
assert.equal(msgs.castBy('You do not see them here.'), null, 'failure lines are not successes');
assert.equal(msgs.castBy('You surround yourself in a magical shield.'), 'armor', 'a trailing full stop is optional');
assert.equal(msgs.landedBy("flan's magical shield surrounds you."), 'armor');
assert.equal(msgs.landedBy('You feel slightly less wounded.'), 'mend');
assert.equal(msgs.landedBy('You feel thirsty.'), null);
assert.equal(compileMessages(null).castBy('x'), null);
console.log('ok - spell messages');
