// Run with: node test/god.test.mjs
import assert from 'node:assert/strict';
import { parseLooks, PROP_LOOKS, tileMessage, tileClear, flagsCommand, flagAdd, flagRemove, parseFlags } from '../js/god.js';
import { GOD_PROMPT, listKind, cleanList, search, place, SAVE_MAP, unset, teleport, wizinvis, addWare, removeWare, SAVED_KINDS } from '../js/god.js';

assert.ok(GOD_PROMPT.test('Do you want players to be able to see your presence? (yes/no)'));
assert.ok(!GOD_PROMPT.test('Do you want to leave your clan? (yes/no)'));

assert.equal(listKind('Items:'), 'items');
assert.equal(listKind('Mobiles:'), 'mobs');
assert.equal(listKind('Props:'), 'props');
assert.equal(listKind('Conf:'), null);

assert.deepEqual(cleanList('mobs', ['rat', 'rat.dsko', 'Bat', '.DS_Store', 'Cave Dragon', 'rat', '']), ['Bat', 'Cave Dragon', 'rat']);
assert.deepEqual(cleanList('items', ['red potion', 'Fire Orb', 'bulk_create_items.sh', 'dc.log', 'apple']), ['apple', 'red potion']);

assert.deepEqual(search(['iron sword', 'iron helmet', 'long sword'], 'SWORD'), ['iron sword', 'long sword']);
assert.deepEqual(search(['iron sword', 'iron helmet', 'long sword'], 'iron sw'), ['iron sword']);
assert.deepEqual(search(['a', 'b', 'c'], '', 2), ['a', 'b']);

assert.equal(place.item('red potion'), '<red potion');
assert.equal(place.mob('Cave Dragon', 3), '<Cave Dragon lev: 3');
assert.equal(place.mob('rat', ''), '<rat');
assert.equal(place.mob('rat', 0), '<rat');
assert.equal(place.prop('Armor Shop'), '<prop Armor Shop');
assert.equal(place.sign('Welcome!'), '<sign Welcome!');
assert.equal(place.merchant(''), '<merchant');
assert.equal(place.merchant('Bob'), '<merchant Bob');
assert.equal(place.tile('12'), '>12');
assert.equal(place.storage('chest', 'Guild'), 'storage place chest Guild');
assert.equal(place.storage('barrel', ''), 'storage place barrel');
assert.equal(SAVE_MAP, '<s');
assert.equal(unset(42), 'unset 42');
assert.equal(teleport('100', 200.7), 'teleport 100 200');
assert.equal(wizinvis(true), 'wizinvis on');
assert.equal(addWare('apple'), 'madd apple');
assert.equal(removeWare('apple'), 'mremove apple');
assert.ok(SAVED_KINDS.has('mob') && !SAVED_KINDS.has('item') && !SAVED_KINDS.has('storage'));
assert.equal(place.namedProp('Villager Man', 'George'), 'nameprop Villager Man|George');
assert.equal(place.namedProp('Guard', 'A|B'), 'nameprop Guard|A B');
assert.deepEqual(parseLooks('Looks: George=Villager Man; Military Captain=Guard'), new Map([['george', 'villager man'], ['military captain', 'guard']]));
assert.deepEqual(parseLooks('Looks: '), new Map());
assert.equal(parseLooks('You look around.'), null);
assert.equal(PROP_LOOKS, 'prop looks');
assert.equal(place.namedSign('Bank', 'Deposits and withdrawals'), 'namesign Bank|Deposits and withdrawals');
assert.equal(tileMessage('Bank Teller', 'Stand here to talk to me.'), 'tilemsg Bank Teller|Stand here to talk to me.');
assert.equal(tileMessage('', 'Beware!'), 'tilemsg |Beware!');
assert.equal(tileClear(), 'tilemsg clear');
assert.equal(flagsCommand(12), 'flags 12');
assert.equal(flagAdd(12, 'tutorial'), 'flagadd 12|tutorial');
assert.equal(flagRemove(12, 'tutorial'), 'flagremove 12|tutorial');
assert.deepEqual(parseFlags('Flags: 2073|testerthree|nothirst,tutorial'), { id: 2073, name: 'testerthree', flags: ['nothirst', 'tutorial'] });
assert.deepEqual(parseFlags('Flags: 5|bob|'), { id: 5, name: 'bob', flags: [] });
assert.deepEqual(parseFlags('Flags: 5||'), { id: 5, name: '', flags: [] });
assert.equal(parseFlags('Talkers: a'), null);
// The Server section.
{
  const { parseServerInfo, describeServer } = await import('../js/god.js');
  const r = parseServerInfo('ServerInfo: 11520|2|140|256|0|-');
  assert.deepEqual(r, { info: { up: 11520, players: 2, usedMb: 140, maxMb: 256, errors: 0, restartIn: null } });
  assert.deepEqual(describeServer(r.info), { status: 'Up 3 h 12 min · 2 players · memory 140 of 256 MB · no errors today', restart: '' });
  const c = parseServerInfo('ServerInfo: 90000|1|10|20|3|42').info;
  assert.deepEqual(describeServer(c), { status: 'Up 1 d 1 h · 1 player · memory 10 of 20 MB · 3 errors today', restart: 'Restarting in 42 s.' });
  assert.deepEqual(parseServerInfo('ServerError: [12:00] Error x|y'), { error: '[12:00] Error x|y' });
  assert.deepEqual(parseServerInfo('ServerInfo: done'), { done: true });
  assert.equal(parseServerInfo('Hello'), null);
}
console.log('god tests passed');
