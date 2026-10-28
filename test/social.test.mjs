// Run with: node test/social.test.mjs
import assert from 'node:assert/strict';
import {
  JournalReader, JournalDefReader, NotesReader, TradeReader, parseFriends, parseMarkers, parseWhisper,
  journalSet, noteAdd, tradeGold, mergeQuests, journalSections,
} from '../js/social.js';

const j = new JournalReader();
assert.deepEqual(j.feed('Journal: Wolves|Kill 5 wolves for Martha.|0'), { done: null, hide: true });
j.feed('Journal: Wolves|Martha thanked you.|1');
j.feed('Journal: The Recruit|Talk to the sergeant.|0');
assert.deepEqual(j.feed('Journal: end 3'), { done: [
  { title: 'The Recruit', text: 'Talk to the sergeant.', done: false },
  { title: 'Wolves', text: 'Martha thanked you.', done: true },
], hide: true });
assert.equal(j.feed('flan: Journal: hi'), null);
assert.deepEqual(mergeQuests([]), []);
assert.deepEqual(mergeQuests([{ title: 'T', text: 'step 1', done: false }, { title: 'T', text: 'step 3', done: false }]), [{ title: 'T', text: 'step 3', done: false }], 'the latest step');
assert.deepEqual(mergeQuests([{ title: 'T', text: 'done', done: true }, { title: 'T', text: 'later', done: false }]), [{ title: 'T', text: 'done', done: true }], 'done wins');

assert.deepEqual(journalSections([]), []);
assert.deepEqual(journalSections([
  { title: 'Friend of Aelindor', text: 'Named a friend.', done: true },
  { title: 'Tale: The Sundering', text: 'The elves sing...', done: true },
  { title: 'Bounty: Lake Slimers', text: 'Kill 5 slimers.', done: false },
  { title: 'The Coast Road', text: 'Go east.', done: false },
]), [
  { id: 'quests', name: 'Quests', open: [{ title: 'The Coast Road', text: 'Go east.', done: false }], done: [{ title: 'Friend of Aelindor', text: 'Named a friend.', done: true }] },
  { id: 'bounties', name: 'Bounties', open: [{ title: 'Lake Slimers', text: 'Kill 5 slimers.', done: false }], done: [] },
  { id: 'lore', name: 'Lore', open: [], done: [{ title: 'The Sundering', text: 'The elves sing...', done: true }] },
], 'sorted into sections, prefixes off');
assert.equal(journalSections([{ title: 'Tale: X', text: '', done: false }])[0].done.length, 1, 'a tale is never in progress');

const d = new JournalDefReader();
d.feed('JournalDef: wolfquest|Wolves|Kill 5 wolves.|0');
assert.deepEqual(d.feed('JournalDef: end 1').done, [{ flag: 'wolfquest', title: 'Wolves', text: 'Kill 5 wolves.', done: false }]);
assert.equal(journalSet({ flag: 'wq', title: 'A|B', text: 'line\nbreak', done: true }), 'journal set wq|A B|line break|1');

const n = new NotesReader();
n.feed('MapNote: 10|-3|wolves here');
n.feed('MapNote: bad line');
assert.deepEqual(n.feed('MapNote: end 1').done, [{ x: 10, y: -3, text: 'wolves here' }]);
assert.equal(noteAdd(1, 2, 'my | chest'), 'mapnote add 1 2 my   chest');

assert.deepEqual(parseFriends('Friends: bluntman=1,mara=0'), [{ name: 'bluntman', online: true }, { name: 'mara', online: false }]);
assert.deepEqual(parseFriends('Friends: '), []);
assert.equal(parseFriends('Friendship is magic'), null);

assert.deepEqual(parseMarkers('Markers: bank|Bank Teller|120|360;shop|<x>Bob|5|6;bad|x|y|z'), [
  { kind: 'bank', name: 'Bank Teller', x: 120, y: 360 },
  { kind: 'shop', name: 'Bob', x: 5, y: 6 },
]);
assert.deepEqual(parseMarkers('Markers: '), []);

assert.deepEqual(parseWhisper('bluntman tells you: hey there'), { who: 'bluntman', incoming: true, text: 'hey there' });
assert.deepEqual(parseWhisper('You tell bluntman: hi'), { who: 'bluntman', incoming: false, text: 'hi' });
assert.equal(parseWhisper('Drill Sergeant says: hi'), null);

const t = new TradeReader();
assert.deepEqual(t.feed('Trade: request bluntman'), { request: 'bluntman', hide: true });
t.feed('Trade: with bluntman');
t.feed('Trade: mine 50|1|red potion;fairy dust');
t.feed('Trade: theirs 0|0|');
assert.deepEqual(t.feed('Trade: end'), { table: {
  with: 'bluntman', mine: { gold: 50, ready: true, items: ['red potion', 'fairy dust'] }, theirs: { gold: 0, ready: false, items: [] },
}, hide: true });
assert.deepEqual(t.feed('Trade: closed bluntman called the trade off.'), { closed: 'bluntman called the trade off.', hide: false });
assert.deepEqual(t.feed('Trade: done The trade with bluntman is done.'), { done: 'The trade with bluntman is done.', hide: false });
assert.equal(t.feed('Tradesman says: hi'), null);
assert.equal(tradeGold('12.7'), 'trade gold 12');
assert.equal(tradeGold('-5'), 'trade gold 0');
console.log('ok - social');
