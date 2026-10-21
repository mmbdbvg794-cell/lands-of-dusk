// The Grey Beneath (tools/world/cities/greybeneath.mjs) in the saved
// conversations of a live server: the sg_ quests merged into Ranger
// Faelwen, Loremistress Faelith, Shaman Ithrae and Priestess Ilvra (every
// quest each is in, again, as merge_quests.mjs does), and Faelith's own
// "The Grey Blight" answer told differently once Cut by No Elf is done: a
// kept stage (js/quests.js stripQuest) tagged sg_heart, ahead of the
// quest's own thank-you, with her greeting and menu, that one answer
// changed and the same lore_blight flag.
//
//   node tools/server/greybeneath_talk.mjs <game dir> <quests dir> <out dir>
//
// <quests dir> is the game's quests with the new ones in (the city
// bundle's). Writes the changed talk files to <out dir> with ORIG.sha256
// and REMOVE for canon_install.sh.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { mergeQuest, questNpcs, tidyQuest } from '../../js/quests.js';
import { QUESTS } from '../world/cities/greybeneath.mjs';

const [, , game, questsDir, out] = process.argv;
if (!out) {
  console.error('usage: node tools/server/greybeneath_talk.mjs <game dir> <quests dir> <out dir>');
  process.exit(2);
}
const NPCS = ['Ranger Faelwen', 'Loremistress Faelith', 'Shaman Ithrae', 'Priestess Ilvra'];
const BLIGHT = 'The Grey Blight';
const BLIGHT_NOW = 'I told travellers the wind carried it. I was wrong. It comes up from a door beneath our woods.';

const problems = [];
const files = new Map();
const read = (rel) => readFileSync(`${game}/${rel}`, rel.endsWith('.dlg') ? 'utf8' : 'latin1');
const quests = readdirSync(questsDir).filter((f) => f.endsWith('.json')).map((f) => tidyQuest(JSON.parse(readFileSync(`${questsDir}/${f}`, 'utf8'))))
  .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.id.localeCompare(b.id));
for (const q of QUESTS) if (!quests.some((x) => x.id === q.id)) problems.push(`no quests/${q.id}.json in ${questsDir}`);
const heart = quests.find((q) => q.id === 'sg_heart');

for (const name of NPCS) {
  const rel = `talk/${name}`;
  let dlg = tidyDialogue(JSON.parse(read(`${rel}.dlg`)));
  if (toScript(name, dlg) !== read(rel)) { problems.push(`${rel} was changed by hand`); continue; }
  if (name === 'Loremistress Faelith' && heart && !dlg.stages.some((st) => st.keep && st.when?.value === 'sg_heart_done')) {
    const home = [...dlg.stages].reverse().find((st) => !st.quest && st.when?.kind === 'always');
    const blight = home?.answers?.find((a) => a.label === BLIGHT);
    if (!blight) problems.push(`Faelith has no "${BLIGHT}" answer`);
    else {
      const answers = structuredClone(home.answers);
      answers.find((a) => a.label === BLIGHT).reply = BLIGHT_NOW;
      dlg.stages.unshift({ quest: 'sg_heart', requires: heart.requires, depth: Math.max(1, heart.depth ?? 1), keep: true, when: { kind: 'flag', value: 'sg_heart_done' }, says: `${heart.after} ${home.says}`, answers });
    }
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
