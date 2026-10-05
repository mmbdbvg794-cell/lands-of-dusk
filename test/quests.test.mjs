// Run with: node test/quests.test.mjs
import assert from 'node:assert/strict';
import { newQuest, newStep, questProblems, questFlags, questJournal, killsFile, questStagesFor, mergeQuest, stripQuest, questNpcs, questSave, parseQuestReply, tidyQuest, rewardLine, describeFlag, cleanQuestId } from '../js/quests.js';
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
// Another quest's stages stay first.
const other = { ...twice, stages: [{ quest: 'other', when: { kind: 'flag', value: 'other_on' }, says: 'x', answers: [] }, ...twice.stages] };
assert.equal(mergeQuest(other, q, 'Farmer Joe').stages[0].quest, 'other');
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

// What's missing.
assert.ok(questProblems(newQuest()).length >= 4);
const killLast = tidyQuest({ ...q, steps: [q.steps[0]] });
assert.ok(questProblems(killLast).some((p) => /last step/.test(p)));

// The server's side.
const save = questSave(q);
const [id, json, kills] = save.slice('quest set '.length).split('|');
assert.equal(id, 'wolf_trouble');
assert.deepEqual(JSON.parse(fromBase64(json)).flags, questFlags(q));
assert.equal(fromBase64(kills), killsFile(q));
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
console.log('ok - quests');
