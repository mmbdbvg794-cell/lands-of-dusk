// Run with: node test/quests.test.mjs
import assert from 'node:assert/strict';
import { questDepth, withArticle, placesFile, newQuest, newStep, questProblems, questFlags, questJournal, killsFile, questStagesFor, mergeQuest, stripQuest, questNpcs, questSave, parseQuestReply, tidyQuest, rewardLine, describeFlag, cleanQuestId } from '../js/quests.js';
import { toScript, flagsOf, fromBase64 } from '../js/dialogue.js';

// Farmer Joe's wolves: kill 5, see the hunter, bring a pelt back.
const q = newQuest('Wolf Trouble!');
assert.equal(q.id, 'wolf_trouble');
Object.assign(q, { title: 'Wolf Trouble', giver: 'Farmer Joe' });
q.offer.says = 'Wolves keep taking my sheep. Will you thin them out?';
q.steps.push({ ...newStep('kill'), mob: 'wolf', count: 5, what: 'wolves slain', journal: 'Kill 5 wolves in the fields east of the farm.' });
q.steps.push({ ...newStep('talk', 'Old Hunter'), says: 'Joe sent you? Take this pelt to him.', journal: 'Tell the Old Hunter, in the woods, the wolves are dealt with.' });
q.steps.push({ ...newStep('bring', 'Farmer Joe'), item: 'wolf pelt', says: 'Is that a wolf pelt?', journal: 'Bring the wolf pelt back to Farmer Joe.' });
q.reward = { gold: 50, exp: 100, items: ['leather cap'], says: 'You saved my flock!' };
assert.deepEqual(questProblems(q), []);
assert.deepEqual(questFlags(q), ['wolf_trouble_on', 'wolf_trouble_1', 'wolf_trouble_2', 'wolf_trouble_3', 'wolf_trouble_done']);
assert.deepEqual(questNpcs(q), ['Farmer Joe', 'Old Hunter']);
assert.equal(killsFile(q), 'wolf_trouble_1|wolf|5|wolf_trouble_2|wolves slain\n');
assert.equal(questJournal(q).length, 4);
assert.deepEqual(questJournal(q).at(-1), { flag: 'wolf_trouble_done', title: 'Wolf Trouble', text: 'You saved my flock!', done: true });
assert.equal(rewardLine(q), 'You receive a leather cap, 50 gold and 100 experience.');

// The giver: done, the pelt, still running, the offer; in that order.
const joe = questStagesFor(q, 'Farmer Joe');
assert.deepEqual(joe.map((s) => [s.when.kind, s.when.value]), [['flag', 'wolf_trouble_done'], ['flag', 'wolf_trouble_3'], ['flag', 'wolf_trouble_on'], ['noflag', 'wolf_trouble_done']]);
assert.ok(joe.every((s) => s.quest === 'wolf_trouble'));
const pelt = joe[1].answers[0];
assert.deepEqual(pelt.needs, { kind: 'item', value: 'wolf pelt' });
assert.deepEqual(pelt.effects.map((e) => e.kind), ['take', 'unflag', 'unflag', 'flag', 'gold', 'exp', 'give']);
assert.equal(pelt.next.says, rewardLine(q));
assert.deepEqual(joe[3].answers[0].effects, [{ kind: 'flag', flag: 'wolf_trouble_on' }, { kind: 'flag', flag: 'wolf_trouble_1' }]);
// The hunter only has his step.
const hunter = questStagesFor(q, 'old hunter');
assert.equal(hunter.length, 1);
assert.deepEqual(hunter[0].answers[0].effects, [{ kind: 'unflag', flag: 'wolf_trouble_2' }, { kind: 'flag', flag: 'wolf_trouble_3' }]);

// Merging keeps the NPC's own talk after the quest, and saving again
// replaces the quest's stages rather than adding more.
const own = { shouts: ['Hello!'], stages: [{ when: { kind: 'always', value: '' }, says: 'Nice weather.', answers: [] }] };
const once = mergeQuest(own, q, 'Farmer Joe');
const twice = mergeQuest(once, q, 'Farmer Joe');
assert.equal(twice.stages.length, 5);
assert.equal(twice.stages.at(-1).says, 'Nice weather.');
assert.deepEqual(stripQuest(twice, 'wolf_trouble').stages, own.stages);
// Another quest's "still running" comes after this one's step, before its offer.
const other = { ...twice, stages: [{ quest: 'other', when: { kind: 'flag', value: 'other_on' }, says: 'x', answers: [] }, ...twice.stages] };
assert.deepEqual(mergeQuest(other, q, 'Farmer Joe').stages.map((s) => s.when.value), ['wolf_trouble_3', 'other_on', 'wolf_trouble_on', 'wolf_trouble_done', 'wolf_trouble_done', '']);
// A new NPC still ends with something.
assert.equal(mergeQuest({ shouts: [], stages: [] }, q, 'Old Hunter').stages.at(-1).when.kind, 'always');
// And it all becomes a talk script with its flags.
const script = toScript('Farmer Joe', once);
assert.match(script, /if hasCondition trigger wolf_trouble_3\n/);
assert.match(script, /if ! hasItem trigger "wolf pelt"/);
assert.ok(flagsOf(once).includes('wolf_trouble_done'));

// Repeatable: no done flag, offered again.
const rep = tidyQuest({ ...q, repeatable: true });
const repJoe = questStagesFor(rep, 'Farmer Joe');
assert.equal(repJoe.at(-1).when.value, 'wolf_trouble_on');
assert.ok(!repJoe.some((s) => s.when.value === 'wolf_trouble_done'));
assert.ok(!repJoe[0].answers[0].effects.some((e) => e.flag === 'wolf_trouble_done'));
assert.equal(repJoe.at(-1).answers[0].once, undefined, 'no wait unless asked');

// A wait between takings: the accept works once per wait, and quests can
// share the wait's flag (a bounty board's posters).
const daily = tidyQuest({ ...q, repeatable: true, again: { minutes: 1200, flag: 'bounty_kh', says: 'Come back tomorrow.' } });
const offerD = questStagesFor(daily, 'Farmer Joe').at(-1);
assert.deepEqual(offerD.answers[0].once, { flag: 'bounty_kh', minutes: 1200, says: 'Come back tomorrow.' });
assert.ok(questFlags(daily).includes('bounty_kh') && questFlags(daily).includes('timernow'));
assert.match(toScript('Farmer Joe', mergeQuest({ stages: [] }, daily, 'Farmer Joe')), /flagtimer bounty_kh 1200/);
// While the wait lasts it's said up front, not after accepting; someone on
// the quest still gets the reminder first.
const dailyJoe = questStagesFor(daily, 'Farmer Joe');
const waitAt = dailyJoe.findIndex((s) => s.when.kind === 'flag' && s.when.value === 'bounty_kh');
assert.ok(waitAt > dailyJoe.findIndex((s) => s.when.value === 'wolf_trouble_on' && s.when.kind === 'flag'), 'after the reminder');
assert.equal(waitAt, dailyJoe.length - 2, 'just before the offer');
assert.deepEqual(dailyJoe[waitAt].answers, []);
assert.equal(dailyJoe[waitAt].says, 'Come back tomorrow.');
assert.ok(!repJoe.some((s) => s.when.kind === 'flag' && /again|bounty/.test(s.when.value)), 'no wait stage without a wait');
// Merged (sorted among all the NPC's stages), it still comes after the
// reminder and just before the offer.
const mergedD = mergeQuest({ stages: [] }, daily, 'Farmer Joe').stages;
const at = (pred) => mergedD.findIndex(pred);
const waitM = at((s) => s.when.value === 'bounty_kh'), onM = at((s) => s.when.kind === 'flag' && s.when.value === 'wolf_trouble_on'), offerM = at((s) => s.when.kind === 'noflag' && s.when.value === 'wolf_trouble_on');
assert.ok(onM < waitM && waitM === offerM - 1, `reminder ${onM}, wait ${waitM}, offer ${offerM}`);
const ownFlag = tidyQuest({ ...q, repeatable: true, again: { minutes: 60 } });
assert.equal(questStagesFor(ownFlag, 'Farmer Joe').at(-1).answers[0].once.flag, 'wolf_trouble_again');
assert.equal(questStagesFor(tidyQuest({ ...q, again: { minutes: 60 } }), 'Farmer Joe').at(-1).answers[0].once, undefined, 'only for repeatable quests');
assert.deepEqual(tidyQuest({ id: 'x' }).again, { minutes: 0, flag: '', says: '' });

// What's missing.
assert.ok(questProblems(newQuest()).length >= 4);
const killLast = tidyQuest({ ...q, steps: [q.steps[0]] });
assert.ok(questProblems(killLast).some((p) => /last step/.test(p)));

// The server's side.
const save = questSave(q);
const [id, json, kills, places] = save.slice('quest set '.length).split('|');
assert.equal(id, 'wolf_trouble');
assert.deepEqual(JSON.parse(fromBase64(json)).flags, questFlags(q));
assert.equal(fromBase64(kills), killsFile(q));
assert.equal(fromBase64(places), '');
assert.deepEqual(parseQuestReply('Quest: wolf_trouble|Wolf Trouble'), { list: { id: 'wolf_trouble', title: 'Wolf Trouble' } });
assert.deepEqual(parseQuestReply('Quest: done'), { listDone: true });
assert.equal(parseQuestReply(`QuestDef: wolf_trouble|${json}`).def.steps.length, 3);
assert.deepEqual(parseQuestReply('QuestWho: wolf_trouble|flan|wolf_trouble_1 (3 of 5)|1'), { who: { id: 'wolf_trouble', name: 'flan', flag: 'wolf_trouble_1 (3 of 5)', online: true } });
assert.deepEqual(parseQuestReply('QuestSaved: wolf_trouble'), { saved: 'wolf_trouble' });
assert.equal(parseQuestReply('Hello'), null);
assert.equal(describeFlag(q, 'wolf_trouble_1 (3 of 5)'), 'Step 1: kill 5 wolf (3 of 5)');
assert.equal(describeFlag(q, 'wolf_trouble_3'), 'Step 3: bring wolf pelt to Farmer Joe');
assert.equal(describeFlag(q, 'wolf_trouble_done'), 'Finished');
assert.equal(cleanQuestId('  The Lost Ring '), 'the_lost_ring');

// A journey: go to the watchtower, then back to the captain, but only
// after Wolf Trouble is done.
const w = newQuest('watch');
Object.assign(w, { title: 'The Silent Tower', giver: 'Captain Ros', requires: 'wolf_trouble', notYet: 'Help Farmer Joe first.' });
w.offer.says = 'The tower went quiet. Go and look.';
w.steps.push({ ...newStep('place'), x: 120, y: '340', what: 'the old watchtower', journal: 'Go to the old watchtower north of town.' });
assert.ok(questProblems(w).some((p) => /last step/.test(p) && /journey/.test(p)));
w.steps.push({ ...newStep('talk', 'Captain Ros'), says: 'Well?', journal: 'Tell Captain Ros what you found.' });
assert.deepEqual(questProblems(w), []);
assert.equal(placesFile(w), 'watch_1|120|340|3|watch_2|You have reached the old watchtower.\n');
w.steps[0].arrive = 'The tower | is silent.';
w.steps[0].radius = 99;
assert.equal(placesFile(w), 'watch_1|120|340|20|watch_2|The tower   is silent.\n');
assert.equal(killsFile(w), '');
assert.deepEqual(questNpcs(w), ['Captain Ros']);
assert.equal(describeFlag(w, 'watch_1'), 'Step 1: go to the old watchtower (120, 340)');
const ros = questStagesFor(w, 'Captain Ros');
assert.deepEqual(ros.map((s) => [s.when.kind, s.when.value]), [['flag', 'watch_done'], ['flag', 'watch_2'], ['flag', 'watch_on'], ['noflag', 'watch_done'], ['noflag', 'wolf_trouble_done']]);
assert.deepEqual(ros[3].also, { kind: 'flag', value: 'wolf_trouble_done' });
assert.equal(ros[4].says, 'Help Farmer Joe first.');
// Its talk script asks for both conditions on the offer.
assert.match(toScript('Captain Ros', mergeQuest({ stages: [] }, w, 'Captain Ros')), /hasCondition trigger wolf_trouble_done/);
// Without a "not yet" line they just talk as usual.
w.notYet = '';
assert.equal(questStagesFor(w, 'Captain Ros').length, 4);
// Problems: no place, needing itself.
const bad = tidyQuest({ ...w, requires: 'watch', steps: [{ kind: 'place', x: '', y: 5, what: '', journal: 'x' }, w.steps[1]] });
const probs = questProblems(bad).join(' ');
assert.match(probs, /where\?/);
assert.match(probs, /name the place/);
assert.match(probs, /can't need itself/);
assert.equal(fromBase64(questSave(w).split('|')[3]), placesFile(w));
assert.equal(tidyQuest({ id: 'old' }).requires, '');
// Both quests at one NPC: steps first, then running, offers, not yet,
// and the thank-yous last (finishing one mustn't hide the next's offer).
w.notYet = 'Help Farmer Joe first.';
const both = mergeQuest(mergeQuest(own, q, 'Captain Ros'), w, 'Captain Ros');
assert.deepEqual(both.stages.map((s) => s.when.value || s.says), ['watch_2', 'watch_on', 'watch_done', 'wolf_trouble_done', 'watch_done', 'Nice weather.']);
assert.deepEqual(both.stages.map((s) => s.quest ?? '-'), ['watch', 'watch', 'watch', 'watch', 'watch', '-']);
const joeBoth = mergeQuest(mergeQuest(own, q, 'Farmer Joe'), { ...w, giver: 'Farmer Joe', steps: [w.steps[0], { ...w.steps[1], npc: 'Farmer Joe' }] }, 'Farmer Joe');
// (The later quest's offer first: it only shows once the first is done, so
// it hides nothing, and the first quest's offer mustn't hide it.)
assert.deepEqual(joeBoth.stages.map((s) => `${s.when.kind} ${s.when.value}`.trim()), [
  'flag wolf_trouble_3', 'flag watch_2', 'flag wolf_trouble_on', 'flag watch_on',
  'noflag watch_done', 'noflag wolf_trouble_done', 'noflag wolf_trouble_done', 'flag watch_done', 'flag wolf_trouble_done', 'always']);
// Saving the first again keeps steps first and thank-yous last.
const again2 = mergeQuest(joeBoth, q, 'Farmer Joe');
assert.deepEqual(again2.stages.map((s) => s.when.value).slice(0, 2).sort(), ['watch_2', 'wolf_trouble_3']);
assert.equal(again2.stages.length, joeBoth.stages.length);
// The thank-yous: watch needs wolf_trouble, so its thanks come first,
// however they were saved.
assert.deepEqual(joeBoth.stages.filter((s) => /_done$/.test(s.when.value) && s.when.kind === 'flag').map((s) => s.when.value), ['watch_done', 'wolf_trouble_done']);
assert.deepEqual(again2.stages.filter((s) => /_done$/.test(s.when.value) && s.when.kind === 'flag').map((s) => s.when.value), ['watch_done', 'wolf_trouble_done']);
assert.equal(questStagesFor(w, 'Captain Ros')[0].requires, 'wolf_trouble');
assert.deepEqual(['leather gloves', 'iron sword', 'steel helmet'].map(withArticle), ['leather gloves', 'an iron sword', 'a steel helmet']);
// The frontier's shape: quests 1, 2 and 4 at Mar, 3 at Tam. Mar can't see
// that 4 comes after 2 (3 isn't hers), so the saved depths decide: 4's
// thanks first, then 2's, then 1's.
const chain = ['c1', 'c2', 'c3', 'c4'].map((id, i) => Object.assign(newQuest(id), { title: id, giver: i === 2 ? 'Tam' : 'Mar', requires: i ? `c${i}` : '', steps: [{ ...newStep('talk', i === 2 ? 'Tam' : 'Mar'), journal: 'x' }] }));
const depths = {};
for (const c of chain) depths[c.id] = c.depth = questDepth(c, (id) => depths[id]);
assert.deepEqual(chain.map((c) => c.depth), [0, 1, 2, 3]);
const thanks = (d) => d.stages.filter((s) => s.when.kind === 'flag' && /_done$/.test(s.when.value)).map((s) => s.when.value);
const mar = [chain[0], chain[1], chain[3]].reduce((d, c) => mergeQuest(d, c, 'Mar'), own);
assert.deepEqual(thanks(mar), ['c4_done', 'c2_done', 'c1_done']);
// Saving quest 2 again doesn't change that.
assert.deepEqual(thanks(mergeQuest(mar, chain[1], 'Mar')), ['c4_done', 'c2_done', 'c1_done']);
// Saved before depths existed (no depth): still at least 1 for needing one.
assert.equal(questStagesFor({ ...chain[3], depth: 0 }, 'Mar')[0].depth, 1);
console.log('ok - quests');

// An NPC's own conversation stays reachable through a quest's stages.
{
  const teller = { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'Ask me anything.', answers: [{ label: 'The war', reply: 'Long story.', effects: [] }, { label: 'Farewell', reply: 'Go well.', effects: [] }] }] };
  const qq = { ...newQuest('tale_q'), title: 'T', giver: 'Gran', steps: [{ ...newStep('talk', 'Gran'), says: 'Well?', answer: 'Done', reply: 'Good.' }] };
  qq.offer.says = 'Will you help?';
  qq.after = 'Thank you.';
  const m1 = mergeQuest(teller, qq, 'Gran');
  const offer = m1.stages.find((st) => st.when.kind === 'noflag' && st.when.value === 'tale_q_done');
  assert.deepEqual(offer.answers.map((a) => a.label), ['I will help', 'Not now', 'The war', 'Farewell']);
  const after = m1.stages.find((st) => st.when.kind === 'flag' && st.when.value === 'tale_q_done');
  assert.equal(after.says, 'Thank you. Ask me anything.');
  assert.deepEqual(after.answers.map((a) => a.label), ['The war', 'Farewell']);
  const reminder = m1.stages.find((st) => st.when.kind === 'flag' && st.when.value === 'tale_q_on');
  assert.deepEqual(reminder.answers.map((a) => a.label), ['The war', 'Farewell']);
  // The step itself is left alone.
  const step = m1.stages.find((st) => st.when.value === 'tale_q_1');
  assert.deepEqual(step.answers.map((a) => a.label), ['Done']);
  // Again: nothing doubles.
  const m2 = mergeQuest(m1, qq, 'Gran');
  assert.deepEqual(m2.stages.map((st) => [st.says, st.answers.length]), m1.stages.map((st) => [st.says, st.answers.length]));
  // And another quest merged after keeps the first quest's stages right.
  const q2 = { ...newQuest('tale_r'), title: 'R', giver: 'Gran', requires: 'tale_q', steps: [{ ...newStep('talk', 'Gran') }] };
  const m3 = mergeQuest(m2, q2, 'Gran');
  assert.equal(m3.stages.find((st) => st.when.kind === 'flag' && st.when.value === 'tale_q_done').answers.length, 2);
  console.log('ok - own conversation kept');
}

{
  // A chain's thank-yous: the next offer opens with the one before it
  // (it was hidden behind that offer), and the last takes turns with the
  // NPC's own greeting (hidden behind every quest stage).
  const mk = (id, requires, after, offer) => ({ ...newQuest(id), title: id, giver: 'Dask', requires, after, offer: { ...newQuest(id).offer, says: offer }, steps: [{ ...newStep('talk', 'Dask') }] });
  const a = mk('dk_a', '', 'Picks ringing again.', 'Slimes in the workings.');
  const b = mk('dk_b', 'dk_a', 'We will raise a stone.', 'My miners never came back.');
  const own = { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'Mind the shafts.', answers: [] }] };
  const d = [a, b].reduce((x, q) => mergeQuest(x, q, 'Dask'), own);
  const offer = (id) => d.stages.find((s) => s.quest === id && s.when.kind === 'noflag');
  assert.equal(offer('dk_a').says, 'Slimes in the workings.');
  assert.equal(offer('dk_b').says, 'Picks ringing again. My miners never came back.');
  const done = (id) => d.stages.find((s) => s.when.kind === 'flag' && s.when.value === `${id}_done`);
  assert.deepEqual(done('dk_b').lines, ['Mind the shafts.']);
  assert.equal(done('dk_a').lines, undefined);
  // A greeting that acts out a scene isn't mixed in.
  const scene = { stages: [{ when: { kind: 'always', value: '' }, verb: 'acts', says: 'A woman in chains.', answers: [] }] };
  assert.equal([a, b].reduce((x, q) => mergeQuest(x, q, 'Dask'), scene).stages.find((s) => s.when.value === 'dk_b_done').lines, undefined);
  // Merging again changes nothing (says rebuilt from each stage's own words).
  const again = mergeQuest(d, b, 'Dask');
  assert.deepEqual(again.stages.map((s) => [s.says, s.lines]), d.stages.map((s) => [s.says, s.lines]));
  console.log('ok - chain thank-yous heard');
}
