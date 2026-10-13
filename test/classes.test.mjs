// Run with: node test/classes.test.mjs
import assert from 'node:assert/strict';
import { parseClass, parseChoices, parseTiers, tierTag, classCommand, CLASS_ASK } from '../js/classes.js';

assert.equal(CLASS_ASK, 'class');
assert.equal(parseClass('Class: unset. Choose one: Fighter, Mage. Type class <name>.'), 'unset');
assert.deepEqual(parseClass('Class: priest|Priestess'), { id: 'priest', name: 'Priestess' });
assert.equal(parseClass('flan: Class: unset'), null);
assert.equal(parseClass("You're already a Mage."), null);
assert.equal(classCommand('Mage'), 'class mage');
assert.equal(classCommand('mage; quit'), 'class magequit');
const ch = parseChoices('ClassChoices: fighter|Fighter|Weapons, armour.;priest|Priest|Healing.');
assert.deepEqual(ch, [{ id: 'fighter', name: 'Fighter', blurb: 'Weapons, armour.' }, { id: 'priest', name: 'Priest', blurb: 'Healing.' }]);
assert.equal(parseChoices('Class: fighter|Fighter'), null);
const t = parseTiers('ClassTiers: dodge=barred;black magic group=core;druidic group=cross;mining=open');
assert.equal(t.get('dodge'), 'barred');
assert.equal(tierTag(t, 'Black Magic Group').kind, 'core');
assert.equal(tierTag(t, 'druidic group').text, 'Other class');
assert.equal(tierTag(t, 'Mining'), null);
assert.equal(tierTag(null, 'Dodge'), null);
assert.equal(parseTiers('ClassTiers: ').size, 0);
console.log('classes tests passed');
