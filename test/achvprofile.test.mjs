// Run with: node test/achvprofile.test.mjs
import assert from 'node:assert/strict';
import { parseAchv } from '../js/achievements.js';
import { describeProfile } from '../js/profile.js';

assert.deepEqual(parseAchv('Achv: hunter|Hunter|Defeat 100 creatures|0|42|100').item, { id: 'hunter', title: 'Hunter', what: 'Defeat 100 creatures', earned: 0, progress: 42, goal: 100 });
assert.equal(parseAchv('Achv: first_blood|First Blood|Win your first fight|1791400000000|1|1').item.earned, 1791400000000);
assert.deepEqual(parseAchv('Achv: done|hgate'), { done: 'hgate' });
assert.deepEqual(parseAchv('Achievement: Dragonslayer|Slay the ember dragon, the stone dragon and the frost dragon'), { earned: { title: 'Dragonslayer', what: 'Slay the ember dragon, the stone dragon and the frost dragon' } });
assert.equal(parseAchv('hgate has earned Hunter!'), null);

const data = { updated: 1791400000000, players: { hgate: { name: 'hgate', race: 'human', title: 'the newbie.', exp: 1251, maxhp: 3000, stats: { str: 1, dex: 1, con: 80, int: 7, wis: 7 },
  gear: [{ slot: 'Weapon', item: 'broad sword' }], quests: ['Strays at the Farms'], achievements: [{ id: 'a', title: 'First Blood', what: 'Win', when: 1 }, { id: 'b', title: 'Hunter', what: 'Defeat', when: 5 }], playtime: 7379618, online: true } } };
const p = describeProfile(data, 'HGate');
assert.equal(p.found, true);
assert.equal(p.race, 'Human');
assert.equal(p.cls, '');
assert.equal(describeProfile({ players: { a: { name: 'a', race: 'darkelf', class: 'Priestess' } } }, 'a').cls, 'Priestess');
assert.deepEqual(p.facts.find((f) => f[0] === 'Played'), ['Played', '2 h 2 min']);
assert.deepEqual(p.gear, [['Weapon', 'broad sword']]);
assert.deepEqual(p.achievements.map((a) => a.title), ['Hunter', 'First Blood'], 'newest first');
assert.equal(describeProfile(data, 'nobody').found, false);
assert.equal(describeProfile({ updated: null, players: [] }, 'hgate').found, false, 'the empty fallback');
assert.equal(describeProfile(data, '').found, false);
console.log('ok - achievements and profiles');
