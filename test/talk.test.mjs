// Run with: node test/talk.test.mjs
import assert from 'node:assert/strict';
import { parseSpeech, parseTalkers, talkCommand, TALKERS } from '../js/talk.js';

assert.deepEqual(parseSpeech("Drill Sergeant says: Hey you! Get to training now... unless you think you're ready for the world? (training/world)"), {
  who: 'Drill Sergeant', verb: 'says', text: "Hey you! Get to training now... unless you think you're ready for the world?", choices: ['training', 'world'],
});
assert.deepEqual(parseSpeech('Drill Sergeant shouts: Hey you! Yes, you!'), { who: 'Drill Sergeant', verb: 'shouts', text: 'Hey you! Yes, you!', choices: [] });
assert.deepEqual(parseSpeech('Old Man asks: Will you help? (yes/no/maybe later)').choices, ['yes', 'no', 'maybe later']);
// Brackets that aren't a choice stay in the text.
assert.equal(parseSpeech('Bob says: I found it (finally).').text, 'I found it (finally).');
assert.equal(parseSpeech('You feel hungry.'), null);
assert.equal(parseSpeech('flan: hello there'), null);

assert.deepEqual(parseTalkers('Talkers: Drill Sergeant, Bank Teller'), new Set(['drill sergeant', 'bank teller']));
assert.deepEqual(parseTalkers('Talkers: '), new Set());
assert.equal(parseTalkers('Talk to whom?'), null);
assert.equal(talkCommand(12), 'talk 12');
assert.equal(TALKERS, 'talk names');
// A single answer, as the dialogue editor writes it.
assert.deepEqual(parseSpeech('Tom says: Want to hear a story? (sure)').choices, ['sure']);
assert.deepEqual(parseSpeech('Tom says: Once upon a time (long ago)').choices, ['long ago']);
assert.deepEqual(parseSpeech('Tom says: That was Bob (The Brave)').choices, [], 'capitals: just brackets');
assert.deepEqual(parseSpeech('Drill Sergeant says: Bring me some! (Stand beside it, then click.) (here, sir)').choices, ['here, sir'], 'punctuation in a single answer');
assert.equal(parseSpeech('Drill Sergeant says: Bring me some! (Stand beside it, then click.) (here, sir)').text, 'Bring me some! (Stand beside it, then click.)');
assert.deepEqual(parseSpeech('The Guard acts: The guard looks you up and down. (ok)'), { who: 'The Guard', verb: 'acts', text: 'The guard looks you up and down.', choices: ['ok'] });
console.log('ok - talk');
