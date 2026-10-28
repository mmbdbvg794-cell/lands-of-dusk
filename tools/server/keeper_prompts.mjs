// The trial keepers speak up when a tutorial's straw stuffing is handed in,
// and stop shouting at passers-by (tools/world/cities/classtrials.mjs), in
// live's talk files: the plans have it for rebuilds, this puts it into the
// conversations as they are now (gods may have changed them).
//
//   node tools/server/keeper_prompts.mjs <dir>
//
// <dir> holds copies of live's talk/ files for the trainers and keepers
// (<name>, <name>.dlg, <name>.greet). Each trainer's hand-in answers (the
// ones that need the straw stuffing) get the keeper's prompt as their
// follow-up, built from the keeper's live answers; each keeper's shouts go.
// Changed files are written over the copies (scripts recompiled as the God
// tab's editor would) and the .greet files that should go are listed in
// <dir>/remove.txt. Running it again changes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { toScript, tidyDialogue } from '../../js/dialogue.js';
import { KEEPERS, keeperPrompt } from '../world/cities/classtrials.mjs';

const TRAINERS = { human: 'Drill Sergeant', elf: 'Ranger Thandril', darkelf: 'Blademistress Zeerith', lizardman: 'Hunt-Master Kreeth' };
const dir = process.argv[2];
if (!dir) throw new Error('usage: node tools/server/keeper_prompts.mjs <dir>');
const read = (name) => tidyDialogue(JSON.parse(fs.readFileSync(path.join(dir, `${name}.dlg`), 'utf8')));
const write = (name, dlg) => {
  fs.writeFileSync(path.join(dir, `${name}.dlg`), JSON.stringify(dlg));
  fs.writeFileSync(path.join(dir, name), toScript(name, dlg) + '\n');
};
const remove = [];
const handIns = (node, out = []) => {
  for (const a of node.answers ?? []) {
    if (a.needs?.kind === 'item' && a.needs.value === 'straw stuffing') out.push(a);
    if (a.next) handIns(a.next, out);
  }
  return out;
};

for (const [race, trainer] of Object.entries(TRAINERS)) {
  const keeper = KEEPERS[race].name;
  const kdlg = read(keeper);
  if (kdlg.shouts.length) {
    kdlg.shouts = [];
    write(keeper, kdlg);
    console.log(`${keeper}: shouts taken out`);
  }
  if (fs.existsSync(path.join(dir, `${keeper}.greet`))) remove.push(`${keeper}.greet`);
  const tdlg = read(trainer);
  const answers = tdlg.stages.flatMap((st) => handIns(st));
  if (!answers.length) throw new Error(`${trainer}: no straw stuffing hand-in found`);
  let added = 0;
  for (const a of answers) {
    if (a.next?.speaker === keeper) continue;
    if (a.next) throw new Error(`${trainer}: a hand-in already has a follow-up of its own`);
    a.next = keeperPrompt(race, kdlg);
    added++;
  }
  if (added) write(trainer, tdlg);
  console.log(`${trainer}: ${added} of ${answers.length} hand-ins now followed by ${keeper}`);
}
fs.writeFileSync(path.join(dir, 'remove.txt'), remove.map((f) => f + '\n').join(''));
console.log(`greet files to remove: ${remove.join(', ') || 'none'}`);
