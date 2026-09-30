// Run with: node test/dialogue.test.mjs
import assert from 'node:assert/strict';
import { newDialogue, toScript, toGreet, flagsOf, cleanFlag, cleanLabel, saveCommand, loadCommand, parseDialogueReply, toBase64, fromBase64 } from '../js/dialogue.js';

// The wolf-pelt quest: four stages, first that fits wins.
const wolves = {
  shouts: ['Traveller! A word, please.', ''],
  stages: [
    { when: { kind: 'flag', value: 'wolfquest_done' }, says: 'Thank you again for dealing with those wolves.', answers: [] },
    { when: { kind: 'item', value: 'wolf pelt' }, says: 'Is that a wolf pelt?', answers: [
      { label: 'Hand it over', reply: 'Wonderful! Here is your reward.', effects: [
        { kind: 'take', item: 'wolf pelt' }, { kind: 'gold', amount: 100 }, { kind: 'exp', amount: 50 }, { kind: 'flag', flag: 'wolfquest_done' }, { kind: 'unflag', flag: 'wolfquest' },
      ] },
      { label: 'Not yet', reply: 'Take your time.', effects: [] },
    ] },
    { when: { kind: 'flag', value: 'wolfquest' }, says: 'Still waiting on that pelt, friend.', answers: [] },
    { when: { kind: 'always', value: '' }, says: 'Wolves plague our flocks. Will you help?', answers: [
      { label: 'Yes', reply: 'Bring me a wolf pelt.', effects: [{ kind: 'flag', flag: 'wolfquest' }] },
      { label: 'No', reply: 'A pity.', effects: [] },
    ] },
    { when: { kind: 'always', value: '' }, says: 'never reached', answers: [] },
  ],
};

const script = toScript('Elder Martha', wolves);
assert.equal(script, `#Elder Martha's dialogue, made with the God tab's dialogue editor.
#Change it there: saving the editor rewrites this file.
if hasCondition trigger wolfquest_done
	chat trigger "Elder Martha says: Thank you again for dealing with those wolves."
	endscript
end
if hasItem trigger "wolf pelt"
	chat trigger "Elder Martha says: Is that a wolf pelt? (hand it over/not yet)"
	input trigger answer
	if strequals answer "hand it over"
		removeItem trigger "wolf pelt"
		inc trigger cash 100
		inc trigger exp 50
		addCondition trigger wolfquest_done
		removeCondition trigger wolfquest
		chat trigger "Elder Martha says: Wonderful! Here is your reward."
		endscript
	end
	if strequals answer "not yet"
		chat trigger "Elder Martha says: Take your time."
		endscript
	end
	chat trigger "Elder Martha says: Hm? Talk to me again when you've made up your mind."
	endscript
end
if hasCondition trigger wolfquest
	chat trigger "Elder Martha says: Still waiting on that pelt, friend."
	endscript
end
chat trigger "Elder Martha says: Wolves plague our flocks. Will you help? (yes/no)"
input trigger answer
if strequals answer "yes"
	addCondition trigger wolfquest
	chat trigger "Elder Martha says: Bring me a wolf pelt."
	endscript
end
if strequals answer "no"
	chat trigger "Elder Martha says: A pity."
	endscript
end
chat trigger "Elder Martha says: Hm? Talk to me again when you've made up your mind."
endscript
endscript
`);
assert.equal(toGreet(wolves), 'Traveller! A word, please.');
assert.deepEqual(flagsOf(wolves).sort(), ['wolfquest', 'wolfquest_done']);

// Text can't break out of the script's strings; flags and labels are tidied.
assert.equal(cleanFlag(' wolf quest!'), 'wolf_quest_');
assert.equal(cleanLabel('Yes (please)'), 'yes please');
assert.match(toScript('Bob', { stages: [{ when: { kind: 'always' }, says: 'Say "hi"', answers: [] }] }), /Bob says: Say 'hi'"/);
// Effects missing their values are left out; a doesn't-have-flag stage.
const s2 = toScript('Bob', { stages: [{ when: { kind: 'noflag', value: 'met' }, says: 'Hello stranger.', answers: [{ label: 'hi', reply: '', effects: [{ kind: 'give', item: '' }, { kind: 'teleport', x: '10', y: '20' }, { kind: 'gold', amount: 0 }] }] }] });
assert.match(s2, /^if ! hasCondition trigger met$/m);
assert.match(s2, /^\t\tset trigger locxy 10 20$/m);
assert.doesNotMatch(s2, /giveitem|inc trigger cash/);
assert.deepEqual(newDialogue().stages.length, 1);

// Saving and loading.
assert.equal(fromBase64(toBase64('Grüße, "Martha"')), 'Grüße, "Martha"');
const cmd = saveCommand('Elder Martha', wolves);
const [head, dlg, scr, greet, flags] = cmd.split('|');
assert.equal(head, 'talkedit set Elder Martha');
assert.deepEqual(JSON.parse(fromBase64(dlg)), wolves);
assert.equal(fromBase64(scr), script);
assert.equal(fromBase64(greet), 'Traveller! A word, please.');
assert.deepEqual(flags.split(',').sort(), ['wolfquest', 'wolfquest_done']);
assert.equal(loadCommand('Elder Martha'), 'talkedit get Elder Martha');
assert.deepEqual(parseDialogueReply(`Dialogue: Elder Martha|${toBase64(JSON.stringify(wolves))}`), { name: 'Elder Martha', dialogue: wolves, handWritten: false });
assert.equal(parseDialogueReply('Dialogue: Drill Sergeant|!').handWritten, true);
assert.deepEqual(parseDialogueReply('Dialogue: New Guy|').dialogue, newDialogue());
assert.equal(parseDialogueReply('Hello'), null);
console.log('ok - dialogue');
