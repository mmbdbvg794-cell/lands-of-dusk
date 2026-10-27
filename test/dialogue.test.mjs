// Run with: node test/dialogue.test.mjs
import assert from 'node:assert/strict';
import { toTileScript, tileFlagsOf, tileSaveCommand, parseTileReply, newRule, newWalk, canMoveExpr, blockedText } from '../js/dialogue.js';
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
// Needs, taking gold, a gold condition and a follow-up question.
const shop = { stages: [
  { when: { kind: 'gold', value: 10 }, says: 'Welcome, customer.', answers: [
    { label: 'Buy potion', reply: 'Here you are.', needs: { kind: 'gold', value: 50 }, effects: [{ kind: 'takegold', amount: 50 }, { kind: 'give', item: 'red potion' }] },
    { label: 'Chat', reply: 'Nice weather.', effects: [], next: { says: 'Heard about the wolves?', answers: [
      { label: 'Yes', reply: 'Terrible business.', effects: [] },
      { label: 'Tell me', reply: 'Ask Elder Martha.', needs: { kind: 'flag', value: 'met_martha' }, effects: [] },
    ] } },
  ] },
] };
const s3 = toScript('Shopkeep', shop);
assert.equal(s3, `#Shopkeep's dialogue, made with the God tab's dialogue editor.
#Change it there: saving the editor rewrites this file.
if ! < trigger cash 10
	chat trigger "Shopkeep says: Welcome, customer. (buy potion/chat)"
	input trigger answer
	if strequals answer "buy potion"
		if < trigger cash 50
			chat trigger "Shopkeep says: You don't have enough gold for that. It's 50 gp."
			endscript
		end
		inc trigger cash - 0 50
		giveitem trigger "red potion"
		chat trigger "Shopkeep says: Here you are."
		endscript
	end
	if strequals answer "chat"
		chat trigger "Shopkeep says: Nice weather."
		chat trigger "Shopkeep says: Heard about the wolves? (yes/tell me)"
		input trigger answer2
		if strequals answer2 "yes"
			chat trigger "Shopkeep says: Terrible business."
			endscript
		end
		if strequals answer2 "tell me"
			if ! hasCondition trigger met_martha
				chat trigger "Shopkeep says: You can't do that yet."
				endscript
			end
			chat trigger "Shopkeep says: Ask Elder Martha."
			endscript
		end
		chat trigger "Shopkeep says: Hm? Talk to me again when you've made up your mind."
		endscript
	end
	chat trigger "Shopkeep says: Hm? Talk to me again when you've made up your mind."
	endscript
end
chat trigger "Shopkeep doesn't seem to notice you."
endscript
`);
assert.deepEqual(flagsOf(shop), ['met_martha']);
// Tile actions: the doorway before the Recruiter.
const door = [
  { when: { kind: 'noflag', value: 'newplayertrain' }, speaker: 'Recruiter', says: 'You there! Come and see me.', effects: [{ kind: 'flag', flag: 'newplayertrain' }] },
  { when: { kind: 'always', value: '' }, speaker: '', says: '', effects: [] },
];
assert.equal(toTileScript(door), `#Tile action, made in the God tab.
#Change it there: saving the tile editor rewrites this file.
if ! hasCondition trigger newplayertrain
	addCondition trigger newplayertrain
	chat trigger "Recruiter says: You there! Come and see me."
	endscript
end
endscript
endscript
`);
assert.match(toTileScript([{ when: { kind: 'always' }, speaker: '', says: 'A cold wind blows.', effects: [] }]), /^chat trigger "A cold wind blows."$/m);
assert.deepEqual(tileFlagsOf(door, newWalk()), ['newplayertrain']);
// The next door: only players with the tutorial flag may step on.
const gate = { kind: 'flag', flag: 'tutorial', speaker: 'Guard', says: 'Talk to the Recruiter first.' };
assert.equal(canMoveExpr(gate), 'hasCondition trigger tutorial');
assert.equal(canMoveExpr({ kind: 'noflag', flag: 'banished' }), '! hasCondition trigger banished');
assert.equal(canMoveExpr({ kind: 'nobody' }), 'false');
assert.equal(canMoveExpr(newWalk()), '');
// Of a race, or with a flag (Aelindor's counters): the script's "or" is prefix.
const friends = { kind: 'raceorflag', race: 'elf', flag: 'aelindor_done' };
assert.equal(canMoveExpr(friends), 'or isRace trigger elf hasCondition trigger aelindor_done');
assert.equal(canMoveExpr({ kind: 'raceorflag', race: 'elf', flag: '' }), 'isRace trigger elf');
assert.deepEqual(tileFlagsOf([], friends), ['aelindor_done']);
// Conversations and tile rules can ask about race too.
assert.match(toScript('Sylwen', { shouts: [], stages: [{ when: { kind: 'norace', value: 'elf' }, says: 'Not for you.', answers: [] }] }), /if ! isRace trigger elf\n/);
assert.equal(canMoveExpr({ kind: 'flag', flag: '' }), '');
assert.equal(blockedText(gate), 'Guard says: Talk to the Recruiter first.');
assert.equal(blockedText({ says: 'The way is barred.' }), 'The way is barred.');
const [th, tr, ts, tc, tb] = tileSaveCommand({ rules: door, walk: gate }).split('|');
assert.ok(th.startsWith('tileset '));
assert.deepEqual(JSON.parse(fromBase64(th.slice(8))), { rules: door, walk: gate });
assert.equal(fromBase64(tr), toTileScript(door));
assert.deepEqual(ts.split(',').sort(), ['newplayertrain', 'tutorial']);
assert.equal(fromBase64(tc), 'hasCondition trigger tutorial');
assert.equal(fromBase64(tb), 'Guard says: Talk to the Recruiter first.');
assert.deepEqual(parseTileReply(`TileAction: 127_372|${toBase64(JSON.stringify({ rules: door, walk: gate }))}`), { x: 127, y: 372, rules: door, walk: gate, other: false });
// Saved before walking rules: just the rules.
assert.deepEqual(parseTileReply(`TileAction: 127_372|${toBase64(JSON.stringify(door))}`), { x: 127, y: 372, rules: door, walk: newWalk(), other: false });
assert.deepEqual(parseTileReply('TileAction: 5_6|'), { x: 5, y: 6, rules: [newRule()], walk: newWalk(), other: false });
assert.equal(parseTileReply('TileAction: 38_32|!').other, true);
console.log('ok - dialogue');

// Journal entries on "Set flag" effects.
{
  const { journalEntriesOf, fillJournal } = await import('../js/dialogue.js');
  const dlg = { shouts: [], stages: [{ when: { kind: 'always' }, says: 'Help?', answers: [
    { label: 'yes', reply: 'Thanks', effects: [{ kind: 'flag', flag: 'wolves', journal: { title: "Martha's Wolves", text: 'Bring her a wolf pelt.' } }, { kind: 'gold', amount: 5 }],
      next: { says: 'Hurry', answers: [{ label: 'ok', reply: '', effects: [{ kind: 'flag', flag: 'wolves_hurry', journal: { title: '  ', text: 'x' } }] }] } },
    { label: 'no', reply: 'Oh', effects: [{ kind: 'flag', flag: 'refused' }] },
  ] }] };
  assert.deepEqual(journalEntriesOf(dlg), [{ flag: 'wolves', title: "Martha's Wolves", text: 'Bring her a wolf pelt.', done: false }], 'only flags with a title');
  const filled = fillJournal(JSON.parse(JSON.stringify(dlg)), new Map([['refused', { title: 'Refused', text: 'You said no.', done: true }]]));
  assert.deepEqual(filled.stages[0].answers[1].effects[0].journal, { title: 'Refused', text: 'You said no.', done: true });
  console.log('ok - dialogue journal');
}
{
  const { toTileScript } = await import('../js/dialogue.js');
  const s = toTileScript([{ when: { kind: 'flag', value: 'x' }, speaker: '', says: '', effects: [{ kind: 'bind', x: 17, y: 10 }, { kind: 'teleport', x: 17, y: 10 }] }]);
  assert.ok(/addCondition trigger bindnow\n\s*order trigger "bindat 17 10"\n\s*set trigger locxy 17 10/.test(s), s);
  console.log('ok - bind effect');
  const { toScript } = await import('../js/dialogue.js');
  const sc = toScript('X', { shouts: [], stages: [{ when: { kind: 'always' }, says: 'Don\u2019t say I didn\u2019t warn you \u2014 \u201cbe careful\u201d\u2026', answers: [] }] });
  assert.ok(sc.includes("Don't say I didn't warn you - 'be careful'..."), sc);
  assert.ok(/^[\x09\x0a\x20-\x7e]*$/.test(sc), 'plain bytes only');
  console.log('ok - plain punctuation');
}

// How lines are spoken.
{
  const { toScript, toTileScript, blockedText } = await import('../js/dialogue.js');
  const sc = toScript('Guard', { shouts: [], stages: [{ when: { kind: 'always' }, verb: 'acts', says: 'The guard looks you up and down.', answers: [{ label: 'ok', reply: 'Move along!', replyVerb: 'shouts', effects: [] }] }] });
  assert.ok(sc.includes('chat trigger "Guard acts: The guard looks you up and down. (ok)"'), sc);
  assert.ok(sc.includes('chat trigger "Guard shouts: Move along!"'), sc);
  assert.ok(toScript('G', { shouts: [], stages: [{ when: { kind: 'always' }, says: 'Hi', answers: [] }] }).includes('"G says: Hi"'), 'says by default');
  assert.ok(toTileScript([{ when: { kind: 'always' }, speaker: 'The Guard', verb: 'acts', says: 'looks you over', effects: [] }]).includes('"The Guard acts: looks you over"'));
  assert.equal(blockedText({ speaker: 'Guard', verb: 'shouts', says: 'Halt!' }), 'Guard shouts: Halt!');
  console.log('ok - verbs');
}

// Hand-written tile scripts.
{
  const { parseTileReply, parseTileScriptReply, tileScriptCommand } = await import('../js/dialogue.js');
  const r = parseTileReply('TileAction: 3_4|!' + Buffer.from('set trigger locxy 1 1\nendscript\n').toString('base64'));
  assert.deepEqual([r.other, r.script], [true, 'set trigger locxy 1 1\nendscript\n']);
  assert.equal(parseTileReply('TileAction: 3_4|!').script, '', 'older servers: no text');
  assert.deepEqual(parseTileScriptReply('TileScript: replaced 3_4'), { done: 'replaced', x: 3, y: 4 });
  assert.ok(tileScriptCommand('endscript').startsWith('tilescript '));
  console.log('ok - tile scripts');
}

// Trying a conversation out.
{
  const { stageFor, tryAnswer } = await import('../js/dialogue.js');
  const nym = { shouts: [], stages: [
    { when: { kind: 'flag', value: 'friend' }, also: { kind: 'item', value: 'apple' }, says: 'An apple for me?', answers: [] },
    { when: { kind: 'always', value: '' }, says: 'Hello.', answers: [
      { label: 'Gift', reply: 'Here.', effects: [{ kind: 'give', item: 'apple' }, { kind: 'flag', flag: 'friend' }], once: { flag: 'once_nym', minutes: 0, says: 'Only one each!' } },
      { label: 'Buy', reply: 'Thanks.', needs: { kind: 'gold', value: 5 }, effects: [{ kind: 'takegold', amount: 5 }] },
    ] },
  ] };
  const p = { flags: new Set(), items: [], gold: 3, race: 'elf' };
  assert.equal(stageFor(nym, p), 1);
  assert.deepEqual(tryAnswer(nym.stages[1].answers[1], p, 'Nym').lines, ["Nym says: You don't have enough gold for that. It's 5 gp."]);
  const gift = tryAnswer(nym.stages[1].answers[0], p, 'Nym');
  assert.equal(gift.lines[0], 'Nym says: Here.');
  assert.ok(p.flags.has('friend') && p.flags.has('once_nym') && p.items.includes('apple'));
  assert.deepEqual(tryAnswer(nym.stages[1].answers[0], p, 'Nym').lines, ['Nym says: Only one each!']);
  // Now both of the first stage's conditions hold.
  assert.equal(stageFor(nym, p), 0);
  assert.equal(stageFor({ stages: [{ when: { kind: 'flag', value: 'x' }, says: '', answers: [] }] }, p), -1);
  // The script: "and" first, the once flag, a random pick.
  const script = toScript('Nym', { shouts: [], stages: [{ ...nym.stages[0], lines: ['Is that an apple?'] }, nym.stages[1]] });
  assert.match(script, /^if and hasCondition trigger friend hasItem trigger "apple"$/m);
  assert.match(script, /\tif < rand 0\.5000\n\t\tchat trigger "Nym says: An apple for me\?"\n\t\tendscript\n\tend\n\tchat trigger "Nym says: Is that an apple\?"/);
  assert.match(script, /\tif hasCondition trigger once_nym\n\t\tchat trigger "Nym says: Only one each!"/);
  const timed = toScript('Nym', { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'Hi', answers: [{ label: 'Gift', reply: '', effects: [], once: { flag: 'once_nym', minutes: 30 } }] }] });
  assert.match(timed, /\taddCondition trigger timernow\n\torder trigger "flagtimer once_nym 30"/);
  assert.ok(flagsOf({ stages: [{ when: { kind: 'always' }, answers: [{ label: 'g', effects: [], once: { flag: 'once_nym', minutes: 30 } }] }] }).includes('timernow'));
  console.log('ok - trying conversations');
}

// ---- the player's sex: a condition, and {male|female} words ----
{
  const { bySex, hasSexed, stageFor, tryAnswer } = await import('../js/dialogue.js');
  assert.equal(bySex('Welcome, {sir|madam}!', 'male'), 'Welcome, sir!');
  assert.equal(bySex('Welcome, {sir|madam}!', 'female'), 'Welcome, madam!');
  assert.equal(bySex('Welcome, {sir|madam}!', ''), 'Welcome, sir!');
  assert.equal(bySex('Welcome, {sir|madam|friend}!', ''), 'Welcome, friend!');
  assert.equal(bySex('{He|She} said {his|her} piece.', 'female'), 'She said her piece.');
  assert.equal(bySex('No {braces} here, {a|b|c|d}', 'female'), 'No {braces} here, {a|b|c|d}');
  assert.equal(hasSexed('plain'), false);
  assert.equal(hasSexed('{lad|lass}'), true);
  assert.equal(hasSexed('{lad|lass}'), true); // no regex state left behind

  const dlg = {
    shouts: ['Over here, {lad|lass|stranger}!'],
    stages: [
      { when: { kind: 'sex', value: 'female' }, says: 'Good day, {sir|madam}.', answers: [] },
      { when: { kind: 'always', value: '' }, says: 'Well met, {lad|lass|traveller}.', answers: [
        { label: 'Thanks', reply: 'Off you go, {son|daughter}.', effects: [] },
      ] },
    ],
  };
  assert.equal(toScript('Gran', dlg), `#Gran's dialogue, made with the God tab's dialogue editor.
#Change it there: saving the editor rewrites this file.
if hasCondition trigger female
	if hasCondition trigger female
		chat trigger "Gran says: Good day, madam."
	end
	if ! hasCondition trigger female
		chat trigger "Gran says: Good day, sir."
	end
	endscript
end
if hasCondition trigger female
	chat trigger "Gran says: Well met, lass. (thanks)"
end
if hasCondition trigger male
	chat trigger "Gran says: Well met, lad. (thanks)"
end
if and ! hasCondition trigger male ! hasCondition trigger female
	chat trigger "Gran says: Well met, traveller. (thanks)"
end
input trigger answer
if strequals answer "thanks"
	if hasCondition trigger female
		chat trigger "Gran says: Off you go, daughter."
	end
	if ! hasCondition trigger female
		chat trigger "Gran says: Off you go, son."
	end
	endscript
end
chat trigger "Gran says: Hm? Talk to me again when you've made up your mind."
endscript
endscript
`);
  assert.equal(toGreet(dlg), 'Over here, stranger!');
  // "male" means not female, so those who haven't chosen count as male.
  assert.match(toScript('X', { stages: [{ when: { kind: 'sex', value: 'male' }, says: 'hi', answers: [] }] }), /^if ! hasCondition trigger female$/m);
  // Try it.
  const her = { flags: new Set(), items: [], gold: 0, race: 'human', sex: 'female' };
  const him = { ...her, sex: 'male' };
  assert.equal(stageFor(dlg, her), 0);
  assert.equal(stageFor(dlg, him), 1);
  assert.deepEqual(tryAnswer(dlg.stages[1].answers[0], him, 'Gran').lines, ['Gran says: Off you go, son.']);
  // Tile actions too.
  assert.match(toTileScript([{ when: { kind: 'always' }, speaker: '', says: 'You feel {strong|graceful}.', effects: [] }]), /if hasCondition trigger female\n\tchat trigger "You feel graceful."\nend/);
}

console.log('ok - sex words');

// Answers with punctuation also match without it.
{
  const { looseLabel } = await import('../js/dialogue.js');
  assert.equal(looseLabel('Who me? Yes sir.'), 'who me yes sir');
  assert.equal(looseLabel('Here, sir'), 'here sir');
  assert.equal(looseLabel('farewell'), 'farewell');
  assert.equal(looseLabel("Elowen's letter"), 'elowens letter');
  const s2 = toScript('Rec', { stages: [{ when: { kind: 'always' }, says: 'Hey', answers: [{ label: 'Here, sir', reply: 'Good.', effects: [] }, { label: 'No', reply: 'Fine.', effects: [] }] }] });
  assert.match(s2, /^if or strequals answer "here, sir" strequals answer "here sir"$/m);
  assert.match(s2, /^if strequals answer "no"$/m);
  console.log('ok - loose answers');
}

// A tile rule with a second condition.
{
  const s3 = toTileScript([{ when: { kind: 'item', value: 'shard' }, also: { kind: 'item', value: 'stone' }, speaker: '', says: 'Sealed.', effects: [] }]);
  assert.match(s3, /^if and hasItem trigger "shard" hasItem trigger "stone"$/m);
  console.log('ok - tile also');
}
// A paid blessing: gold checked, taken, then all HP and MP back.
{
  const priest = { stages: [{ when: { kind: 'always', value: '' }, says: 'Peace.', answers: [
    { label: 'Blessing', reply: 'Be whole.', needs: { kind: 'gold', value: 50 }, effects: [{ kind: 'takegold', amount: 50 }, { kind: 'heal' }] },
  ] }] };
  const script = toScript('Priest', priest);
  assert.match(script, /< trigger cash 50[\s\S]*inc trigger cash - 0 50\n\t*inc trigger hp 1000000\n\t*inc trigger mp 1000000/);
}

// Classes: the picker at a tutorial's end stone (only for those who haven't
// chosen), trying a class in a training yard, stopping.
{
  const s = toTileScript([
    { when: { kind: 'flag', value: 'elfTut6' }, also: { kind: 'noflag', value: 'classchosen' }, speaker: '', says: 'The stone stays dark.', effects: [{ kind: 'class', what: 'pick' }] },
    { when: { kind: 'flag', value: 'elfTut6' }, speaker: '', says: 'Away!', effects: [{ kind: 'teleport', x: 1, y: 2 }] },
  ]);
  assert.match(s, /if and hasCondition trigger elfTut6 ! hasCondition trigger classchosen\n\torder trigger "class pick"\n\tchat trigger "The stone stays dark\."\n\tendscript\nend\nif hasCondition trigger elfTut6\n\tset trigger locxy 1 2/);
  const keeper = { shouts: [], stages: [{ when: { kind: 'always', value: '' }, says: 'Which?', answers: [
    { label: 'Fighter', reply: 'Then fight.', effects: [{ kind: 'class', what: 'try', id: 'Fighter!' }] },
    { label: 'Enough', reply: 'As you like.', effects: [{ kind: 'class', what: 'end' }] },
    { label: 'Nothing', reply: '', effects: [{ kind: 'class', what: 'try', id: '' }] },
  ] }] };
  const script = toScript('Keeper', keeper);
  assert.match(script, /order trigger "class try fighter"/);
  assert.match(script, /order trigger "class end"/);
  assert.doesNotMatch(script, /class try "?\n/);
  console.log('ok - class effects');
}
