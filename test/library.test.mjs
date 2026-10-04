// Run with: node test/library.test.mjs
import assert from 'node:assert/strict';
import { parseDef, writeDef, parseLibReply, libSet, libGet, libNew } from '../js/library.js';

const dummy = 'maxhp\n15\nmaxsp\n0\nstre\n1\ndext\n1\nwisd\n1\ninte\n1\ncons\n5\nimage\n54\ndescription\nA battered straw dummy.\nstationary\n.\n';
const d = parseDef('mob', dummy);
assert.equal(d.fields.maxhp, '15');
assert.equal(d.fields.image, '54');
assert.equal(d.fields.stationary, true);
assert.deepEqual(d.extra, ['maxsp', '0'], 'unknown keys kept');
d.fields.respawn = '30';
d.fields.maxhp = '40';
const back = writeDef('mob', d);
assert.ok(back.includes('maxhp\n40\n') && back.includes('respawn\n30\n') && back.includes('stationary\n') && back.includes('maxsp\n0\n') && back.endsWith('.\n'), back);
assert.deepEqual(parseDef('mob', back).fields.respawn, '30', 'round trip');

const mish = 'maxhp\n50000\ngiveitem\nexpert sword\n.50\nfaction\nlizard\nimage\n31\nskill\nDouble Attack\n100\nskill\ndodge\n80\nweilded\nmega fire\n.\n';
const m = parseDef('mob', mish);
assert.deepEqual(m.drops, [{ item: 'expert sword', chance: '.50' }]);
assert.deepEqual(m.skills, [{ name: 'Double Attack', level: '100' }, { name: 'dodge', level: '80' }]);
assert.equal(m.fields.wield, 'mega fire', 'weilded is the same as wield');
assert.deepEqual(m.extra, ['faction', 'lizard']);
const m2 = parseDef('mob', writeDef('mob', m));
assert.deepEqual([m2.drops, m2.skills, m2.fields.wield], [m.drops, m.skills, 'mega fire']);

const sword = parseDef('item', 'type\nweapon\ndescription\na plain, sturdy iron sword\ncost\n150\nmod\n175\nimage\n9\ndurability\n7500\n.\n');
assert.deepEqual(sword.fields, { type: 'weapon', description: 'a plain, sturdy iron sword', cost: '150', mod: '175', image: '9', durability: '7500' });
assert.equal(writeDef('item', sword), 'type\nweapon\ndescription\na plain, sturdy iron sword\nimage\n9\ncost\n150\nmod\n175\ndurability\n7500\n.\n');

const barrel = parseDef('prop', 'image\n69\ndescription\na large barrel\nshowname\nfalse\n \n');
assert.deepEqual(barrel.fields, { image: '69', description: 'a large barrel', showname: 'false' });

assert.deepEqual(parseLibReply('Lib: mob|training_dummy|' + Buffer.from(dummy).toString('base64')).text, dummy);
assert.deepEqual(parseLibReply('Lib: saved mob|training_dummy|3'), { saved: true, kind: 'mob', name: 'training_dummy', updated: 3 });
assert.equal(parseLibReply('Library is closed'), null);
assert.equal(libGet('mob', 'rat'), 'lib get mob rat');
assert.equal(libNew('mob', 'big rat', 'rat'), 'lib new mob big rat|rat');
assert.ok(libSet('item', 'x', 'é').startsWith('lib set item x|'));
console.log('ok - library');
