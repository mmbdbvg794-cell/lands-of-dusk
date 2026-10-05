// Run with: node test/leaderboard.test.mjs
import assert from 'node:assert/strict';
import { describeBoard } from '../js/leaderboard.js';

const now = 1_000_000_000;
const b = describeBoard({ updated: now - 120000, players: [
  { name: 'Aria', race: 'elf', title: 'the brave.', exp: 123456, maxhp: 80, stats: 60, quests: 4, playtime: 5 * 3600000 + 5 },
  { name: 'Bo', race: 'darkelf', title: '', exp: 10, maxhp: 20, stats: 35, quests: 0, playtime: 0 },
  { name: '', exp: 99 },
] }, now);
assert.equal(b.rows.length, 2);
assert.deepEqual(b.rows[0], { rank: 1, name: 'Aria', title: 'the brave', race: 'Elf', exp: '123,456', quests: 4, hp: '80', stats: '60', played: '5 hours' });
assert.equal(b.rows[1].race, 'Dark elf');
assert.equal(b.rows[1].played, 'under an hour');
assert.match(b.note, /last 2 min ago/);
assert.match(describeBoard({ updated: now - 3600000, players: [] }, now).note, /may be down/);
assert.equal(describeBoard(null, now).rows.length, 0);
console.log('ok - leaderboard');
