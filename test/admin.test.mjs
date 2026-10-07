// Run with: node test/admin.test.mjs
import assert from 'node:assert/strict';
import { parseAdmin, parseBug, parseLogin, duration } from '../js/admin.js';

const p = parseAdmin('AdminPlayer: flan|human|the Great|5|441|82|90|100|12345|1791341699245|151.240.93.8|0');
assert.deepEqual(p.player, { name: 'flan', race: 'human', title: 'the Great', privs: 5, x: 441, y: 82, hp: 90, maxhp: 100, exp: 12345, since: 1791341699245, address: '151.240.93.8', hidden: false });
assert.equal(parseAdmin('AdminPlayer: a|b|c|0|1|2|3|4|5|0|?|1').player.since, null, '0 = not known');
assert.equal(parseAdmin('AdminPlayer: too|few'), null);

// Bug reports are URL-encoded as Java's URLEncoder does (spaces as +).
const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+');
const b = parseAdmin('AdminBug: ' + enc('Bug report from hgate (2026-10-07 01:02): Stuck on a tree\nAt 692,217 I can\'t walk east.\nCharacter: hgate'));
assert.deepEqual(b.bug, { from: 'hgate', at: '2026-10-07 01:02', subject: 'Stuck on a tree', body: 'At 692,217 I can\'t walk east.\nCharacter: hgate' });
assert.equal(parseBug('just text').body, 'just text');
assert.equal(parseAdmin('AdminBug: %E0%A4%A').bug.body, '%E0%A4%A', 'bad encoding kept as it is');

assert.deepEqual(parseAdmin('AdminLogin: [2026-10-07 00:09:16] flan logged in from 151.240.93.116').login,
  { at: '2026-10-07 00:09:16', name: 'flan', address: '151.240.93.116', text: '[2026-10-07 00:09:16] flan logged in from 151.240.93.116' });
assert.equal(parseLogin('something else').name, '');
assert.equal(parseAdmin('AdminError: [2026-10-07] Error: boom').error, '[2026-10-07] Error: boom');

assert.deepEqual(parseAdmin('AdminPlayers: done'), { done: 'players', count: null });
assert.deepEqual(parseAdmin('AdminBugs: done|42'), { done: 'bugs', count: 42 });
assert.deepEqual(parseAdmin('AdminErrors: done|0'), { done: 'errors', count: 0 });
assert.equal(parseAdmin('flan says: AdminPlayer: x'), null, 'only whole lines');
assert.equal(parseAdmin('ServerInfo: done'), null);

assert.equal(duration(40 * 60000), '40 min');
assert.equal(duration((2 * 60 + 5) * 60000), '2 h 5 min');
assert.equal(duration((27 * 60) * 60000), '1 d 3 h');
console.log('ok - admin');
