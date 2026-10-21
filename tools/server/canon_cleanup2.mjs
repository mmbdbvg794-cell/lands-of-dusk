// The canon cleanup, part 2 (2026-10-21; LORE.md "Canon decisions" F-J),
// for a live server, in the shape of canon_cleanup.mjs: changes NPCs'
// conversations, walk-on scripts, the journal, signs and props in place.
// Nothing on the map changes; quest ids and flags stay the same.
//
//   node tools/server/canon_cleanup2.mjs <game dir> <out dir> [--no-aged]
//
// --no-aged leaves out step 4's aged signs (the original game's signs with
// a line that shows their age), so they can go in later on their own.
//
// Reads <game dir> (a copy of ~/DuskRPG: talk, defProps, props, signs,
// journal, defMoveActions), never writes it. Writes every changed file to
// <out dir> under its own path, <out dir>/REMOVE (files to delete: stale
// .dsko and Salharasha's), and <out dir>/ORIG.sha256 (the sums of the
// files it replaces, so canon_install.sh refuses a changed live). Install
// with tools/server/canon_install.sh; signs and props are only read at
// start-up, so restart straight after (no god "save" in between).
//
// Stops without writing anything if a conversation it touches was changed
// by hand (its script isn't what the editor makes of its .dlg), or if a
// line it replaces isn't there.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { talk as greystoneTalk } from '../world/cities/greystone.mjs';

const [, , game, out, flag] = process.argv;
const aged = flag !== '--no-aged';
if (!out) {
  console.error('usage: node tools/server/canon_cleanup2.mjs <game dir> <out dir> [--no-aged]');
  process.exit(2);
}

const problems = [];
const files = new Map(); // relative path -> new contents
const remove = new Set();
const enc = (rel) => (rel.endsWith('.dlg') || rel.endsWith('.json') ? 'utf8' : 'latin1');
const read = (rel) => readFileSync(`${game}/${rel}`, enc(rel));
const has = (rel) => existsSync(`${game}/${rel}`);
const current = (rel) => (files.has(rel) ? files.get(rel) : read(rel));
const put = (rel, text) => { files.set(rel, text); remove.delete(rel); };
const drop = (rel) => { if (has(rel)) remove.add(rel); files.delete(rel); };
// One exact piece of text swapped for another; it must be there once.
const swapOnce = (where, text, a, b) => {
  const n = text.split(a).length - 1;
  if (n !== 1) { problems.push(`${where}: ${n ? `${n} times` : 'not found'}: ${a}`); return text; }
  return text.replace(a, () => b);
};

// ---- conversations ----

const dialogues = new Map();
function load(name) {
  if (dialogues.has(name)) return dialogues.get(name);
  if (!has(`talk/${name}.dlg`)) { problems.push(`no talk/${name}.dlg`); return null; }
  const dlg = tidyDialogue(JSON.parse(read(`talk/${name}.dlg`)));
  if (toScript(name, dlg) !== read(`talk/${name}`)) { problems.push(`talk/${name} was changed by hand`); return null; }
  dialogues.set(name, dlg);
  return dlg;
}
// A stage by its "when" flag (and which one, if several share it).
const stage = (dlg, flag, nth = 0) => dlg.stages.filter((s) => s.when?.value === flag)[nth];
// Set a field that must hold `old` now.
function set(name, obj, key, old, now) {
  if (!obj) { problems.push(`${name}: no such stage or answer (for ${key})`); return; }
  if (obj[key] !== old) { problems.push(`${name}: ${key} is not "${old}" but "${obj[key]}"`); return; }
  obj[key] = now;
}
const answer = (st, label) => st?.answers?.find((a) => a.label === label);

// Step 1 (decision F): the Royal Guard keeps its name.
{
  const name = 'Armsmaster Doyle', dlg = load(name);
  if (dlg) set(name, dlg.stages[0], 'says', 'Silver, gold and plate, fit for the king\'s own guard. Stand at the counter and open the Shop tab, if your purse is deep.', 'Silver, gold and plate, fit for the Royal Guard. Stand at the counter and open the Shop tab, if your purse is deep.');
}

// Step 6 (decision I): the human tutorial is the last of the crossing.
{
  const name = 'Recruiter', dlg = load(name);
  if (dlg) {
    const start = stage(dlg, 'tutorialStart');
    set(name, start, 'says', 'Hey you! You look new here, fresh off the boat huh? (To chat: press Enter, then start with \' for those nearby or ; for everyone.)', 'Hey you! Waiting on a berth east, are you? Half the old world is. (To chat: press Enter, then start with \' for those nearby or ; for everyone.)');
    set(name, answer(start, 'Who me? Yes sir.'), 'reply', 'Well if you aren\'t headed for the mines, then you are headed for the army. Go through the door to the south and talk to the armorer and he will get you setup.', 'The ships take soldiers first. Go through the door to the south and the armorer will set you up.');
    const skip = answer(start, 'Fresh? No just show me the door. ');
    set(name, skip, 'reply', 'Suit yourself. Just don\'t say I didn\'t warn you - the Lands of Dusk aren\'t gentle with the unprepared.', 'Suit yourself. Just don\'t say I didn\'t warn you: the Lands of Dusk aren\'t gentle with the unprepared.');
    set(name, skip, 'label', 'Fresh? No just show me the door. ', 'Fresh? No just show me the door.');
    set(name, stage(dlg, 'tutorialStart2'), 'says', 'What are you doing back? go see the armorer now maggot!', 'What are you doing back? Go and see the armorer, maggot!');
    if (JSON.stringify(dlg.shouts) !== '[""]') problems.push(`Recruiter: shouts are ${JSON.stringify(dlg.shouts)}`);
    else dlg.shouts = ['Recruits! The ships take soldiers first!'];
  }
}
{
  const name = 'Quartermaster', dlg = load(name);
  if (dlg) {
    set(name, stage(dlg, 'tutorialStart6'), 'says', 'You\'re all set. Through the south door, step on the teleport stone, and it\'ll carry you to the city.', 'You\'re all set. Through the south door and onto the teleport stone: it\'ll take you down to the last ships. Kingshaven is on the other side.');
    set(name, answer(stage(dlg, 'tutorialStart5'), 'I have them'), 'reply', 'Good. Eat when you\'re hungry and drink when you\'re thirsty: use them from your Backpack. Now, through the south door and onto the teleport stone. Good luck out there.', 'Good. Eat when you\'re hungry and drink when you\'re thirsty: use them from your Backpack. Now, through the south door and onto the teleport stone. The ship won\'t wait.');
  }
}
{
  const name = 'Drill Sergeant', dlg = load(name);
  if (dlg) {
    // The second tutorialStart3 stage (the first is for one who's already
    // gutted the dummy).
    const st = stage(dlg, 'tutorialStart3', 1);
    set(name, st, 'says', 'Alright new recruit, get that gear equipped ( In Backpack Click wear next to Item). ', 'Alright, recruit, get that gear on. (In your Backpack, press Wear beside each.)');
    set(name, answer(st, 'Yes Sir'), 'reply', 'Alright, now get over there to that training dummy and give it a good hit (Stand right beside it, not diagonally, then click mob and click attack)', 'Now get over to that training dummy and give it a good hit. (Stand right beside it, not diagonally, click it and choose Attack.)');
  }
}

// Step 7 (decision J): Greystone once the drum is silent, as greystone.mjs
// builds it now.
for (const name of ['Old Bryn', 'Cook Dagna', 'Overseer Garrick']) {
  if (load(name)) dialogues.set(name, tidyDialogue(greystoneTalk(name)));
}

// ---- walk-on scripts ----

// [square, old, new]: new '' takes the whole line out.
const WALK = [
  // Step 6: the tutorial.
  ['125_366', 'You step off the boat, weary from your journey across the great sea. You look at the docks and see guards guiding refugees into the building nearby. You figure that\'s where you need to go.',
    'You step off the coaster that brought you down to Westsea Harbour, where the last ships sail east. Refugees crowd the docks waiting for a berth, and the guards are herding them into the building nearby. You figure that\'s where you need to go.'],
  ...['117_373', '142_392', '143_392'].map((sq) => [sq, '... and you find yourself on the plaza of Kingshaven, the free city across the sea, far from the war you fled. **',
    '... and you are on the deck of one of the last ships east, the quay falling away behind you. Days of grey sea later you step ashore at Kingshaven, the free city across the sea, far from the war you fled, and climb up to its plaza. **']),
  // Step 5 (decision H): out-of-world text.
  ['458_85', ' LOL! The door\'s locked! (Must be the only thing in this town that works!)', ' The door\'s locked.'],
  ['194_139', 'chat trigger "You get condition gatotic"\n', ''],
  ['199_945', 'You need a questkey from the KeyMaster, you may have to wait for him to re-spawn.', 'You need a questkey from the KeyMaster.'],
  ['15_10', 'Go east from this coordinate for some big game hunting', 'Go east from here for some big game hunting'],
  ['106_36', 'Please buy it. " endscipt\n', 'Please buy it."\n'],
  ['846_55', 'Mini Boss Battle! Mini Boss = Chaos (Liquid Form)', 'Chaos, in liquid form, waits ahead.'],
];
for (const [sq, a, b] of WALK) {
  const rel = `defMoveActions/${sq}`;
  if (!has(rel)) { problems.push(`no ${rel}`); continue; }
  put(rel, swapOnce(rel, current(rel), a, b));
  drop(`${rel}.dsko`); // the engine runs a stale .dsko instead of its script
}
// Step 3 (decision G): Salharasha took ship east. The guard no longer
// stops anyone (no one is left to give leave), and her cave is empty.
{
  const rel = 'defMoveActions/545_16';
  if (!has(rel) || !read(rel).includes('permission from Salharasha our towns elder')) problems.push(`${rel} isn't the old guard`);
  else {
    put(rel, 'chat trigger "Guard: Salharasha was our elder. She took ship east with the rest. Osric keeps us now."\nendscript\n');
    drop(`${rel}.dsko`);
  }
  if (!has('defMoveActions/943_19') || !read('defMoveActions/943_19').includes('My name is Salharasha')) problems.push('defMoveActions/943_19 isn\'t Salharasha\'s');
  drop('defMoveActions/943_19');
  drop('defMoveActions/943_19.dsko');
  drop('defProps/Salharasha');
}

// ---- the journal ----
{
  let j = current('journal');
  j = swapOnce('journal', j, 'tutorialStart|From Refugee to Soldier...|Fresh off the boat. The guards', 'tutorialStart|From Refugee to Soldier...|Waiting on a berth east. The guards');
  j = swapOnce('journal', j, 'The teleport stone in the room west of him leads to the city.', 'The teleport stone in the room west of him leads down to the last ships.');
  j = swapOnce('journal', j, 'The teleport stone at the end of the south hall leads to the city.', 'The teleport stone at the end of the south hall leads down to the last ships, and Kingshaven.');
  put('journal', j);
}

// ---- props ----
{
  // Salharasha, standing in her cave (each name a line, x and y below it).
  const lines = current('props').split('\n');
  const at = lines.findIndex((l, i) => l === 'Salharasha' && lines[i + 1] === '946' && lines[i + 2] === '19');
  if (at < 0) problems.push('props: no Salharasha at 946,19');
  else { lines.splice(at, 3); put('props', lines.join('\n')); }
  const watts = 'defProps/Watts';
  put(watts, swapOnce(watts, current(watts), 'his hands are on fire lol!)', 'his hands are on fire!)'));
}

// ---- signs: text, then x and y, three lines each ----

// Step 4 (decision G): the original game's signs, aged. Step 1: the keep.
const AGED = {
  '21,33': 'The paint is old and peeling: ',
  '33,35': 'Faded letters, half rubbed away: ',
  '35,24': 'Sun-bleached and cracked: ',
  '15,40': 'The paint has all but flaked away: ',
  '83,6': 'Scrawled in old chalk, faint now: ',
  '212,80': 'Weathered grey, the letters barely there: ',
  '203,62': 'The paint is old and peeling: ',
  '138,88': 'Moss has crept over the letters: ',
  '197,154': 'Faded letters, half rubbed away: ',
};
// Step 5 (decision H): [x,y, old text, new text or null to take it down].
const SIGNS = [
  ['1414,337', 'The Royal Keep of Kingshaven. Lord Steward Halvard governs here in Princess Elowen\'s name.', 'The Royal Keep of Kingshaven. The Lord Steward governs here in the princess\'s name.'],
  ['500,200', 'If I\'m forced to move from here, I quit this whole goddamn game.', null],
  ['500,200', 'BBarry.', null],
  ['55,38', 'Attention whoever made this land available to the public - This land is property of supersayanaaron and will not be available until further notice! thank you - SSA', null],
  ['121,78', 'sorry can\'t have houses yet', null],
  ['167,66', 'Xyphoid is probally working on this right now... that is if he\'s on', null],
  ['151,45', 'Under construction', null],
  ['159,45', 'Under construction', null],
  ['208,897', 'Quest beholders thrown...he may have to re-spawn', null],
  ['3,395', 'My Island', null],
  ['500,500', '"The END of the world :)"', null],
  ['426,170', 'You sigh because the path has ended, now back to that crapy desert.', 'You sigh because the path has ended, now back to that desert.'],
  ['459,77', 'Master Skills Training ground...Expert Players Only', 'Master Skills Training ground...Experts Only'],
  ['21,806', 'this way to "AOP Clan Hall"', 'this way to the clan hall'],
  ['199,899', 'Go to the far west of town for MTH clan hall', 'Go to the far west of town for the clan hall'],
  ['144,894', 'Entering the back alleys of mth hall.....be careful these thiefs are tricky!', 'Entering the back alleys.....be careful these thiefs are tricky!'],
];
{
  const lines = current('signs').split('\n');
  const trail = lines.at(-1) === '' ? lines.pop() : null;
  if (lines.length % 3) problems.push(`signs: ${lines.length} lines, not threes`);
  const signs = [];
  for (let i = 0; i + 2 < lines.length; i += 3) signs.push({ text: lines[i], at: `${lines[i + 1]},${lines[i + 2]}` });
  for (const [at, prefix] of aged ? Object.entries(AGED) : []) {
    const s = signs.filter((x) => x.at === at);
    if (s.length !== 1) { problems.push(`signs: ${s.length} at ${at}`); continue; }
    s[0].text = prefix + s[0].text.replace(/ {2,}/g, ' ').trim();
  }
  for (const [at, old, now] of SIGNS) {
    const s = signs.filter((x) => x.at === at && x.text === old);
    if (s.length !== 1) { problems.push(`signs: ${s.length} at ${at} reading "${old}"`); continue; }
    if (now === null) s[0].gone = true;
    else s[0].text = now;
  }
  const kept = signs.filter((s) => !s.gone).flatMap((s) => [s.text, ...s.at.split(',')]);
  put('signs', [...kept, ...(trail === null ? [] : [trail])].join('\n'));
}

// ---- write ----

for (const [name, dlg] of dialogues) {
  put(`talk/${name}.dlg`, JSON.stringify(dlg));
  put(`talk/${name}`, toScript(name, dlg));
  // Shouts the conversation makes; a .greet written by hand (the Drill
  // Sergeant's) stays when it makes none.
  const greet = toGreet(dlg);
  if (greet) put(`talk/${name}.greet`, greet + '\n');
  drop(`talk/${name}.dsko`);
}
for (const [rel, text] of [...files]) if (has(rel) && read(rel) === text) files.delete(rel);

if (problems.length) {
  console.error(`nothing written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const sums = [];
for (const [rel, text] of files) {
  mkdirSync(dirname(`${out}/${rel}`), { recursive: true });
  writeFileSync(`${out}/${rel}`, text, enc(rel));
  if (has(rel)) sums.push(`${createHash('sha256').update(readFileSync(`${game}/${rel}`)).digest('hex')}  ${rel}`);
}
for (const rel of remove) if (has(rel) && !rel.endsWith('.dsko')) sums.push(`${createHash('sha256').update(readFileSync(`${game}/${rel}`)).digest('hex')}  ${rel}`);
writeFileSync(`${out}/REMOVE`, [...remove].sort().join('\n') + (remove.size ? '\n' : ''));
writeFileSync(`${out}/ORIG.sha256`, sums.sort().join('\n') + '\n');
console.log(`changed or new ${files.size}, removed ${remove.size}`);
for (const rel of [...files.keys()].sort()) console.log(`  ${rel}`);
console.log(`removed:\n  ${[...remove].sort().join('\n  ')}`);
