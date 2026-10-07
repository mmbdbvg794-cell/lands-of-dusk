// Run with: node test/mailparty.test.mjs
import assert from 'node:assert/strict';
import { parseMail, mailSend, when } from '../js/mail.js';
import { parseParty, partyChatCommand } from '../js/party.js';

const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+');
assert.deepEqual(parseMail(`MailItem: 1791400000000|flan|1791400000000|0|${enc('Meet me at the bank, 2 + 2')}`).item,
  { id: '1791400000000', from: 'flan', when: 1791400000000, read: false, text: 'Meet me at the bank, 2 + 2' });
assert.deepEqual(parseMail('MailList: done|3'), { listDone: true, unread: 3 });
assert.equal(parseMail(`MailBody: 5|hgate|100|${enc('line one\nline two')}`).body.text, 'line one\nline two');
assert.deepEqual(parseMail('MailDeleted: 5'), { deleted: '5' });
assert.deepEqual(parseMail('MailNew: flan|2'), { arrived: { from: 'flan', unread: 2 } });
assert.deepEqual(parseMail('MailNew: |4'), { arrived: { from: '', unread: 4 } });
assert.equal(parseMail('flan says: MailNew: x|1'), null);
assert.equal(mailSend(' hgate ', 'Hi there & bye'), 'mail send hgate Hi%20there%20%26%20bye');
const now = new Date(2026, 9, 7, 15, 0).getTime();
assert.match(when(new Date(2026, 9, 7, 9, 5).getTime(), now), /^today /);
assert.match(when(new Date(2026, 9, 6, 9, 5).getTime(), now), /^yesterday /);

assert.deepEqual(parseParty('Party: flan|flan:90:100:441:82,hgate:20:3000:450:85'), { party: { leader: 'flan', members: [
  { name: 'flan', hp: 90, maxhp: 100, x: 441, y: 82 }, { name: 'hgate', hp: 20, maxhp: 3000, x: 450, y: 85 }] } });
assert.deepEqual(parseParty('Party: none'), { none: true });
assert.deepEqual(parseParty('PartyInvite: flan'), { invite: 'flan' });
assert.deepEqual(parseParty('DuelInvite: flan'), { duel: 'flan' });
assert.deepEqual(parseParty('PartyChat: flan|over here | quick'), { chat: { from: 'flan', text: 'over here | quick' } });
assert.equal(parseParty('Party time!'), null);
assert.equal(partyChatCommand('%  follow me'), 'party say follow me');
assert.equal(partyChatCommand("'hello"), null);
console.log('ok - mail and party');
