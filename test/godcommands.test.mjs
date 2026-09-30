// Run with: node test/godcommands.test.mjs
import assert from 'node:assert/strict';
import { GOD_COMMANDS, commandStart } from '../js/godcommands.js';

assert.equal(commandStart('teleport <x> <y>'), 'teleport ');
assert.equal(commandStart('<<item>'), '<');
assert.equal(commandStart('<prop <name>'), '<prop ');
assert.equal(commandStart('<sign <text>'), '<sign ');
assert.equal(commandStart('><tile>'), '>');
assert.equal(commandStart('nameprop <prop>|<name>|<description>'), 'nameprop ');
assert.equal(commandStart('storage list'), 'storage list');
assert.equal(commandStart('<s'), '<s');
for (const c of GOD_COMMANDS) assert.ok(c.use && c.desc && c.group && [3, 4, 5].includes(c.level), c.use);
console.log('ok - god commands');
