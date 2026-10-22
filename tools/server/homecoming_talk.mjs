// Homecoming (tools/world/cities/homecoming.mjs) in the saved conversations
// of a live server: the hc_ quests merged into Elowen, Old Bram and Lord
// Steward Halvard, and what people say once Elowen is home (standing
// lines): a stage per NPC per quest, tagged with that quest (so it sorts
// with the thank-yous, the furthest along first) and marked keep (so a
// merge leaves it: js/quests.js stripQuest), as
// tools/server/main_story_after.mjs. Every quest each NPC is in is then
// merged again, as merge_quests.mjs does, so the stages land in order.
//
//   node tools/server/homecoming_talk.mjs <game dir> <quests dir> <out dir>
//
// <quests dir> is the game's quests with the new ones in (the city
// bundle's). Reads <game dir>, never writes it. Writes the changed talk
// files to <out dir> with ORIG.sha256 and REMOVE for canon_install.sh.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { mergeQuest, questNpcs, tidyQuest } from '../../js/quests.js';
import { QUESTS } from '../world/cities/homecoming.mjs';

const [, , game, questsDir, out] = process.argv;
if (!out) {
  console.error('usage: node tools/server/homecoming_talk.mjs <game dir> <quests dir> <out dir>');
  process.exit(2);
}

// [NPC, quest done, what they say, own answers?] Without own answers a
// thank-you gets the NPC's greeting after it and its answers under it (Old
// Bram's boat); with them (Wenna's tales, Halvard's questions) the line
// stands alone, with the answers.
const AFTER = [
  ['Old Bram', 'hc_row', 'Rowed her home myself, like I said I would. Tam cried. Don\'t tell him I told you.', false],
  ['Old Wenna', 'hc_row', 'She sleeps in my back room and wakes before dawn every day. Old habits.', true],
  ['Tombkeeper Aldous', 'hc_row', 'Bram says she\'s gone east, home at last. I told the old king.', false],
  ['Lord Steward Halvard', 'hc_chair', 'Her Highness keeps me honest. It\'s tiring.', true],
  ['Royal Guard', 'hc_chair', 'The princess says bow to the people, not the chair. I\'m still getting used to it.', false],
];
const NPCS = [...new Set(['Elowen', 'Old Bram', 'Lord Steward Halvard', ...AFTER.map((a) => a[0])])];

const problems = [];
const files = new Map();
const read = (rel) => readFileSync(`${game}/${rel}`, rel.endsWith('.dlg') ? 'utf8' : 'latin1');
const quests = readdirSync(questsDir).filter((f) => f.endsWith('.json')).map((f) => tidyQuest(JSON.parse(readFileSync(`${questsDir}/${f}`, 'utf8'))))
  .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.id.localeCompare(b.id));
for (const q of QUESTS) if (!quests.some((x) => x.id === q.id)) problems.push(`no quests/${q.id}.json in ${questsDir}`);

for (const name of NPCS) {
  const rel = `talk/${name}`;
  let dlg = tidyDialogue(JSON.parse(read(`${rel}.dlg`)));
  if (toScript(name, dlg) !== read(rel)) { problems.push(`${rel} was changed by hand`); continue; }
  const home = [...dlg.stages].reverse().find((st) => !st.quest && st.when?.kind === 'always');
  for (const [, id, says, own] of AFTER.filter((a) => a[0] === name)) {
    const q = quests.find((x) => x.id === id);
    if (!q) continue;
    const flag = `${id}_done`;
    // Run again: a stage already there stays as it is.
    if (dlg.stages.some((st) => st.keep && st.when?.value === flag)) continue;
    dlg.stages.unshift({ quest: id, requires: q.requires, depth: Math.max(1, q.depth ?? 1), keep: true, when: { kind: 'flag', value: flag }, says, answers: own ? structuredClone(home?.answers ?? []) : [] });
  }
  const mine = quests.filter((q) => questNpcs(q).some((n) => n.toLowerCase() === name.toLowerCase()));
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
  writeFileSync(`${out}/${rel}`, text, rel.endsWith('.dlg') ? 'utf8' : 'latin1');
  if (existsSync(`${game}/${rel}`)) sums.push(`${createHash('sha256').update(readFileSync(`${game}/${rel}`)).digest('hex')}  ${rel}`);
  if (!rel.endsWith('.dlg') && !rel.endsWith('.greet') && existsSync(`${game}/${rel}.dsko`)) remove.push(`${rel}.dsko`);
}
writeFileSync(`${out}/ORIG.sha256`, sums.sort().join('\n') + '\n');
writeFileSync(`${out}/REMOVE`, remove.join('\n') + (remove.length ? '\n' : ''));
console.log(`changed ${files.size}:\n  ${[...files.keys()].join('\n  ')}`);
