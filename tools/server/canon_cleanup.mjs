// The canon cleanup of 2026-10-15 (LORE.md "Canon decisions"), for a live
// server: changes NPCs' saved conversations, quests, journal lines and
// walk-on scripts in place instead of reinstalling the cities (which would
// undo dialogue changed in the God tab since). Nothing on the map changes;
// quest ids and flags stay the same.
//
//   node tools/server/canon_cleanup.mjs <game dir> <out dir>
//
// Reads <game dir> (a copy of ~/DuskRPG: talk, quests, defProps, props,
// journal, defMoveActions, rc), never writes it. Writes every changed or
// new file to <out dir> under its own path, and <out dir>/REMOVE lists the
// files to delete (renamed NPCs' old files and the stale .dsko of every
// script changed). tools/server/canon_install.sh applies it. Run
// merge_quests.mjs after it for the quest NPCs (see canon_install.sh).
//
// Stops without writing anything if a conversation it touches was changed
// by hand (its script isn't what the editor makes of its .dlg), or if a
// line it replaces isn't there.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { HALVARD, HALVARD_DESC, HALVARD_DLG } from '../world/cities/capital.mjs';
import { TALES } from '../world/cities/lore.mjs';

const [, , game, out] = process.argv;
if (!out) {
  console.error('usage: node tools/server/canon_cleanup.mjs <game dir> <out dir>');
  process.exit(2);
}

// Renamed NPCs (decision E), and King Aldric, who becomes the steward.
const RENAMES = [
  ['Herbalist Wenna', 'Herbalist Linnet'],
  ['Reeve Tamsin', 'Reeve Osric'],
  ['Tamsin the Tailor', 'Corra the Tailor'],
];
// Other spellings in their props' descriptions.
const DESC = [['Tamsin the tailor', 'Corra the tailor']];
// Lines changed in an NPC's conversation: [old, new], each must be there.
const LINES = {
  'Royal Guard': [['Bow before the king, or keep your distance.', 'The chair is the princess\'s. Bow to it, or keep your distance.']],
  'Flora of Kingshaven': [['My grandmother says Kingshaven was a fishing village once. Now look at it.', 'My grandmother says there was nothing on this shore when the ships came. Now look at it.']],
  'Prue of Kingshaven': [['They say the king hasn\'t slept since the ships stopped coming from the old world.', 'They say the steward hasn\'t slept since the ships stopped bringing word of the king.']],
  'Old Wenna': [['So we named the city Kingshaven, the king\'s harbour, and we keep it ready for her.', 'So we named the city Kingshaven, the king\'s haven, and we keep it ready for her.']],
  'Shaman Ithrae': [['They wake when the world is torn. If you meet one, do not stand in front of it.', TALES.wyrms[1].slice(TALES.wyrms[1].indexOf('They wake'))]],
  'Foreman Dask': [['Rock, sweat and silver. That\'s the Izaru mine.', 'Rock, sweat and silver. Half my diggers took ship east. The rest of us are too stubborn or too poor.']],
  'Reeve Osric': [['Goats, grass and quiet. We like it that way out here.', 'Goats, grass and quiet. There were forty families in this field once. Nine stayed.']],
};
// Answers added to an NPC's own conversation (their last "always" stage).
const ANSWERS = {
  'Reeve Osric': [{ label: 'What\'s down the field?', reply: 'Some nights a cold light moves at the far end, and the dead walk with it. We bar the doors and don\'t look.', effects: [] }],
};
// Quest changes: id -> [[path in the quest, old, new]].
const QUESTS = {
  zl_crown: [
    [['steps', 2, 'reply'], 'It is. Dented, but it is his. Thank you, friend.', 'It is. Dented, but his. Thieves melt gold; they don\'t keep crowns. Someone paid for this one.'],
    [['after'], 'The crown is back on the king\'s brow, where it belongs.', 'The crown is back on the king\'s brow. Whoever paid for it will want it again.'],
  ],
  fr_wolves: [[['after'], 'The goats are out again. The children named one after you.', 'The goats are out again. We\'ve few children left, but they named one after you.']],
  iz_slimes: [[['after'], 'The picks are ringing again. That\'s the best sound in Midnight.', 'The picks are ringing again. The only sound left in Midnight worth hearing.']],
};

const problems = [];
const files = new Map(); // relative path -> new contents (latin1 string)
const remove = new Set();
// Conversations and quests are JSON in UTF-8; scripts and the rest latin1.
const enc = (rel) => (rel.endsWith('.dlg') || rel.endsWith('.json') ? 'utf8' : 'latin1');
const read = (rel) => readFileSync(`${game}/${rel}`, enc(rel));
const has = (rel) => existsSync(`${game}/${rel}`);
const current = (rel) => (files.has(rel) ? files.get(rel) : read(rel));
const put = (rel, text) => { files.set(rel, text); remove.delete(rel); };
const drop = (rel) => { if (has(rel)) remove.add(rel); files.delete(rel); };
// Every string in a JSON value, changed by f.
const mapStrings = (v, f) => (typeof v === 'string' ? f(v) : Array.isArray(v) ? v.map((x) => mapStrings(x, f)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, f)])) : v);
const swap = (old, now) => (s) => s.split(old).join(now);

// ---- conversations ----

const dialogues = new Map(); // NPC name -> dlg, as it will be saved
const oldName = new Map(); // new name -> the name its files have on the server
function load(name) {
  if (dialogues.has(name)) return dialogues.get(name);
  const from = oldName.get(name) ?? name;
  if (!has(`talk/${from}.dlg`)) { problems.push(`no talk/${from}.dlg`); return null; }
  const dlg = tidyDialogue(JSON.parse(read(`talk/${from}.dlg`)));
  if (toScript(from, dlg) !== read(`talk/${from}`)) { problems.push(`talk/${from} was changed by hand`); return null; }
  dialogues.set(name, dlg);
  return dlg;
}

// Renames: the conversation (and any line naming them in it), the prop's
// file, the placed prop, quests, journal lines, walk-on scripts, the help.
for (const [from, to] of RENAMES) {
  oldName.set(to, from);
  const dlg = load(to);
  if (dlg) dialogues.set(to, mapStrings(dlg, swap(from, to)));
  for (const ext of ['', '.dlg', '.greet', '.dsko']) drop(`talk/${from}${ext}`);
  if (!has(`defProps/${from}`)) problems.push(`no defProps/${from}`);
  else {
    let prop = [[from, to], ...DESC].reduce((t, [x, y]) => swap(x, y)(t), read(`defProps/${from}`));
    if (to === 'Reeve Osric') prop = prop.replace('\nlook\nVillager Woman\n', '\nlook\nVillager Man\n');
    put(`defProps/${to}`, prop);
    drop(`defProps/${from}`);
  }
}
// King Aldric -> Lord Steward Halvard, on the same spot.
if (!has('talk/King Aldric.dlg') || !has('defProps/King Aldric')) problems.push('no King Aldric to replace');
else {
  for (const ext of ['', '.dlg', '.greet', '.dsko']) drop(`talk/King Aldric${ext}`);
  dialogues.set(HALVARD, tidyDialogue(structuredClone(HALVARD_DLG)));
  put(`defProps/${HALVARD}`, read('defProps/King Aldric').replace(/^description\n.*\n/, `description\n${HALVARD_DESC}\n`));
  drop('defProps/King Aldric');
}
// The placed props: each name is a line of its own, x and y below it.
{
  const lines = current('props').split('\n');
  const names = new Map([...RENAMES, ['King Aldric', HALVARD]]);
  let n = 0;
  for (let i = 0; i + 2 < lines.length; i++) {
    if (names.has(lines[i]) && /^\d+$/.test(lines[i + 1]) && /^\d+$/.test(lines[i + 2])) { lines[i] = names.get(lines[i]); n++; i += 2; }
  }
  if (n !== names.size) problems.push(`props: renamed ${n} of ${names.size}`);
  put('props', lines.join('\n'));
}

// Changed lines.
for (const [name, pairs] of Object.entries(LINES)) {
  const dlg = load(name);
  if (!dlg) continue;
  let text = JSON.stringify(dlg);
  for (const [a, b] of pairs) {
    if (!text.includes(JSON.stringify(a).slice(1, -1))) { problems.push(`${name}: line not found: ${a}`); continue; }
    text = JSON.stringify(mapStrings(JSON.parse(text), swap(a, b)));
  }
  dialogues.set(name, JSON.parse(text));
}
// Added answers, in the NPC's own (last "always", not a quest's) stage.
for (const [name, answers] of Object.entries(ANSWERS)) {
  const dlg = load(name);
  if (!dlg) continue;
  const home = [...dlg.stages].reverse().find((st) => !st.quest && st.when?.kind === 'always');
  if (!home) { problems.push(`${name}: no conversation of their own`); continue; }
  for (const a of answers) if (!home.answers.some((x) => x.label === a.label)) home.answers.push(structuredClone(a));
}

// ---- quests ----

const questFiles = readdirSync(`${game}/quests`).filter((f) => f.endsWith('.json'));
for (const f of questFiles) {
  const rel = `quests/${f}`;
  let q = JSON.parse(read(rel));
  const before = JSON.stringify(q);
  for (const [from, to] of RENAMES) q = mapStrings(q, swap(from, to));
  for (const [path, a, b] of QUESTS[q.id] ?? []) {
    const last = path[path.length - 1];
    const at = path.slice(0, -1).reduce((o, k) => o?.[k], q);
    if (at?.[last] !== a) { problems.push(`${q.id} ${path.join('.')}: not "${a}"`); continue; }
    at[last] = b;
  }
  if (JSON.stringify(q) !== before) put(rel, JSON.stringify(q));
}
for (const id of Object.keys(QUESTS)) if (!questFiles.includes(`${id}.json`)) problems.push(`no quest ${id}`);

// ---- journal lines, walk-on scripts, the help ----

const swapAll = (s) => RENAMES.reduce((t, [from, to]) => swap(from, to)(t), s);
for (const rel of ['journal', 'rc/javahelp.txt']) {
  if (!has(rel)) { problems.push(`no ${rel}`); continue; }
  const now = swapAll(read(rel));
  if (now !== read(rel)) put(rel, now);
}
for (const f of readdirSync(`${game}/defMoveActions`)) {
  if (f.endsWith('.dsko')) continue;
  const rel = `defMoveActions/${f}`;
  const was = read(rel), now = swapAll(was);
  if (now === was) continue;
  put(rel, now);
  drop(`${rel}.dsko`); // the engine runs a stale .dsko instead of its script
}

// ---- write ----

for (const [name, dlg] of dialogues) {
  put(`talk/${name}.dlg`, JSON.stringify(dlg));
  put(`talk/${name}`, toScript(name, dlg));
  const greet = toGreet(dlg);
  if (greet) put(`talk/${name}.greet`, greet + '\n');
  else drop(`talk/${name}.greet`);
  drop(`talk/${name}.dsko`);
}
// Only what really changes.
for (const [rel, text] of [...files]) if (has(rel) && read(rel) === text) files.delete(rel);

if (problems.length) {
  console.error(`nothing written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
for (const [rel, text] of files) {
  mkdirSync(dirname(`${out}/${rel}`), { recursive: true });
  writeFileSync(`${out}/${rel}`, text, enc(rel));
}
writeFileSync(`${out}/REMOVE`, [...remove].sort().join('\n') + (remove.size ? '\n' : ''));
console.log(`changed or new ${files.size}, removed ${remove.size}`);
for (const rel of [...files.keys()].filter((r) => !r.startsWith('defMoveActions/')).sort()) console.log(`  ${rel}`);
const walk = [...files.keys()].filter((r) => r.startsWith('defMoveActions/')).length;
if (walk) console.log(`  defMoveActions: ${walk} walk-on scripts`);
console.log(`removed:\n  ${[...remove].filter((r) => !r.startsWith('defMoveActions/')).join('\n  ')}\n  defMoveActions: ${[...remove].filter((r) => r.startsWith('defMoveActions/')).length} stale .dsko`);
