// What the main story's NPCs say once a later quest is done (2026-10-21):
// each NPC's last thank-you used to stand as their greeting for good, so
// Old Wenna still said "Find out what you can" with Elowen found. Adds a
// stage per later quest, tagged with that quest (so it sorts with the
// thank-yous, the furthest along first) and marked keep (so merging a
// quest again leaves it: js/quests.js stripQuest). Shaman Ithrae's
// dw_road thank-you comes from the quest's "after" line, changed in the
// quest file. Every quest each NPC is in is then merged again, as
// merge_quests.mjs does, so the stages land in order.
//
//   node tools/server/main_story_after.mjs <game dir> <out dir>
//
// Reads <game dir> (talk/, quests/), never writes it. Writes the changed
// files to <out dir> with ORIG.sha256 and REMOVE for canon_install.sh.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { mergeQuest, questNpcs, tidyQuest } from '../../js/quests.js';

const [, , game, out] = process.argv;
if (!out) {
  console.error('usage: node tools/server/main_story_after.mjs <game dir> <out dir>');
  process.exit(2);
}

const ROAD_AFTER = ['The throne is still empty. But now we know where she went. That is more than we had.', 'Now you know her road. The brood is patient for the rest.'];
// [NPC, quest done, what they say, own answers?] Without own answers the
// merge puts the NPC's greeting after the line and its answers under it,
// as for any thank-you; with them (Wenna's tales), the line stands alone.
const AFTER = [
  ['Old Wenna', 'ft_word', 'Sit, child. I read her letter every night. \'Keep the people warm.\' I am trying.', true],
  ['Old Wenna', 'dw_road', 'She lived. I keep saying it, to see if it\'s still true.', true],
  ['Shaman Ithrae', 'ft_word', 'The Brood Stone grew cool last night, for the first time in forty winters. You shut it, then.', false],
  ['Archivist Zyrith', 'ft_word', 'You found her, and the gate is shut. Perhaps I am a little less sorry.', false],
  ['Tombkeeper Aldous', 'ft_word', 'The old king\'s granddaughter is alive. I told him this morning. I think he heard.', false],
  // Added the same evening.
  ['Trader Kossk', 'dw_brood', 'Hsss. The Chieftain kept your locket? Then the girl was real. Buy something, warm-blood.', false],
  ['Chieftain Hesska', 'ft_word', 'The shard did its work. The brood remembers you now, warm-blood.', false],
  ['Chieftain Hesska', 'dw_road', 'Ithrae told me where her road went. The brood remembers her.', false],
];

const problems = [];
const files = new Map();
const read = (rel) => readFileSync(`${game}/${rel}`, rel.endsWith('.dlg') || rel.endsWith('.json') ? 'utf8' : 'latin1');

const quests = new Map();
for (const id of ['dw_word', 'dw_wreck', 'dw_brood', 'dw_road', 'ft_page', 'ft_stone', 'ft_cross', 'ft_free', 'ft_seal', 'ft_word', 'zl_robbers', 'zl_crown', 'zl_crypt']) {
  const rel = `quests/${id}.json`;
  if (!existsSync(`${game}/${rel}`)) { problems.push(`no ${rel}`); continue; }
  quests.set(id, tidyQuest(JSON.parse(read(rel))));
}
const road = quests.get('dw_road');
if (road) {
  if (road.after === ROAD_AFTER[1]) {
    // done already
  } else if (road.after !== ROAD_AFTER[0]) problems.push(`dw_road after is "${road.after}"`);
  else {
    road.after = ROAD_AFTER[1];
    const raw = JSON.parse(read('quests/dw_road.json'));
    raw.after = ROAD_AFTER[1];
    files.set('quests/dw_road.json', JSON.stringify(raw));
  }
}

for (const name of [...new Set(AFTER.map((a) => a[0]))]) {
  const rel = `talk/${name}`;
  let dlg = tidyDialogue(JSON.parse(read(`${rel}.dlg`)));
  if (toScript(name, dlg) !== read(rel)) { problems.push(`${rel} was changed by hand`); continue; }
  const home = [...dlg.stages].reverse().find((st) => !st.quest && st.when?.kind === 'always');
  for (const [, id, says, own] of AFTER.filter((a) => a[0] === name)) {
    const q = quests.get(id);
    if (!q) continue;
    const flag = `${id}_done`;
    // Run again: a stage already there stays as it is.
    if (dlg.stages.some((st) => st.keep && st.when?.value === flag)) continue;
    const tag = q.requires ? { quest: id, requires: q.requires, depth: Math.max(1, q.depth ?? 1) } : { quest: id };
    dlg.stages.unshift({ ...tag, keep: true, when: { kind: 'flag', value: flag }, says, answers: own ? structuredClone(home?.answers ?? []) : [] });
  }
  // Every quest they're in, merged again (the chain's order: those a
  // chain needs first, as merge_quests.mjs).
  const mine = [...quests.values()].filter((q) => questNpcs(q).some((n) => n.toLowerCase() === name.toLowerCase()))
    .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.id.localeCompare(b.id));
  dlg = mine.reduce((d, q) => mergeQuest(d, q, name), dlg);
  files.set(`${rel}.dlg`, JSON.stringify(dlg));
  files.set(rel, toScript(name, dlg));
  const greet = toGreet(dlg);
  if (greet) files.set(`${rel}.greet`, greet + '\n');
}

if (problems.length) {
  console.error(`nothing written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
for (const [rel, text] of [...files]) if (existsSync(`${game}/${rel}`) && read(rel) === text) files.delete(rel);
const sums = [], remove = [];
for (const [rel, text] of files) {
  mkdirSync(dirname(`${out}/${rel}`), { recursive: true });
  writeFileSync(`${out}/${rel}`, text, rel.endsWith('.dlg') || rel.endsWith('.json') ? 'utf8' : 'latin1');
  if (existsSync(`${game}/${rel}`)) sums.push(`${createHash('sha256').update(readFileSync(`${game}/${rel}`)).digest('hex')}  ${rel}`);
  if (rel.startsWith('talk/') && !rel.endsWith('.dlg') && !rel.endsWith('.greet') && existsSync(`${game}/${rel}.dsko`)) remove.push(`${rel}.dsko`);
}
writeFileSync(`${out}/ORIG.sha256`, sums.sort().join('\n') + '\n');
writeFileSync(`${out}/REMOVE`, remove.join('\n') + (remove.length ? '\n' : ''));
console.log(`changed ${files.size}:\n  ${[...files.keys()].join('\n  ')}`);
