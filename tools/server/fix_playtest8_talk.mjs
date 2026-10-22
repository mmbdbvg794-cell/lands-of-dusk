// The eighth play-test's conversation fix (tools/server/fix_playtest8.py
// has the rest): Archivist Zyrith greets a drow, born in Velkarath, as one
// of her own, not as someone who has "come a long way down". An NPC stage
// of her own (race darkelf) before her greeting, with the same tales;
// every quest she is in is merged again, as merge_quests.mjs does.
//
//   node tools/server/fix_playtest8_talk.mjs <game dir> <out dir>
//
// Reads <game dir> (talk/, quests/), never writes it. Writes the changed
// talk files to <out dir> with ORIG.sha256 and REMOVE for canon_install.sh.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { mergeQuest, questNpcs, tidyQuest } from '../../js/quests.js';
import { ZYRITH_DROW } from '../world/cities/lore.mjs';

const [, , game, out] = process.argv;
if (!out) {
  console.error('usage: node tools/server/fix_playtest8_talk.mjs <game dir> <out dir>');
  process.exit(2);
}
const NAME = 'Archivist Zyrith';
const rel = `talk/${NAME}`;
const read = (r) => readFileSync(`${game}/${r}`, r.endsWith('.dlg') ? 'utf8' : 'latin1');
let dlg = tidyDialogue(JSON.parse(read(`${rel}.dlg`)));
if (toScript(NAME, dlg) !== read(rel)) {
  console.error(`nothing written: ${rel} was changed by hand`);
  process.exit(1);
}
if (!dlg.stages.some((st) => !st.quest && st.when?.kind === 'race')) {
  const home = [...dlg.stages].reverse().find((st) => !st.quest && st.when?.kind === 'always');
  dlg.stages.splice(dlg.stages.indexOf(home), 0, { when: { kind: 'race', value: 'darkelf' }, says: ZYRITH_DROW, answers: structuredClone(home.answers) });
}
const quests = readdirSync(`${game}/quests`).filter((f) => f.endsWith('.json')).map((f) => tidyQuest(JSON.parse(readFileSync(`${game}/quests/${f}`, 'utf8'))))
  .filter((q) => questNpcs(q).some((n) => n.toLowerCase() === NAME.toLowerCase()))
  .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.id.localeCompare(b.id));
dlg = quests.reduce((d, q) => mergeQuest(d, q, NAME), dlg);
const files = new Map([[`${rel}.dlg`, JSON.stringify(dlg)], [rel, toScript(NAME, dlg)]]);
const greet = toGreet(dlg);
if (greet) files.set(`${rel}.greet`, greet + '\n');
for (const [r, text] of [...files]) if (existsSync(`${game}/${r}`) && read(r) === text) files.delete(r);
const sums = [], remove = [];
for (const [r, text] of files) {
  mkdirSync(dirname(`${out}/${r}`), { recursive: true });
  writeFileSync(`${out}/${r}`, text, r.endsWith('.dlg') ? 'utf8' : 'latin1');
  if (existsSync(`${game}/${r}`)) sums.push(`${createHash('sha256').update(readFileSync(`${game}/${r}`)).digest('hex')}  ${r}`);
  if (!r.endsWith('.dlg') && !r.endsWith('.greet') && existsSync(`${game}/${r}.dsko`)) remove.push(`${r}.dsko`);
}
writeFileSync(`${out}/ORIG.sha256`, sums.sort().join('\n') + '\n');
writeFileSync(`${out}/REMOVE`, remove.join('\n') + (remove.length ? '\n' : ''));
console.log(`changed ${files.size}:\n  ${[...files.keys()].join('\n  ')}`);
