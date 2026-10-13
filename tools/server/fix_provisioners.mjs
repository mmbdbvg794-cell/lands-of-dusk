// The tutorial provisioners (Nym for the dark elves, Mossa for the
// lizardfolk, Merrin for the elves, the human Quartermaster) asked for the
// water, then in a follow-up for the food ("right here"): anyone who typed
// anything else got "Hm?". This turns that into one answer, "I have them",
// checking both, as tools/world/cities/velkarath.mjs, hatchery.mjs and
// grove.mjs now build it.
//
//   node tools/server/fix_provisioners.mjs <in.dlg> <out dir>
//
// Writes <out dir>/<name>.dlg and <name> (the talk script) for the NPC the
// .dlg belongs to (named by the file). An already fixed one is left as is.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { toScript } from '../../js/dialogue.js';

const [, , input, outDir] = process.argv;
const name = basename(input, '.dlg');
const dlg = JSON.parse(readFileSync(input, 'utf8'));
// The stage whose answer has a follow-up that needs an item (the food).
const i = dlg.stages.findIndex((st) => st.answers?.some((a) => a.next?.answers?.some((b) => b.needs?.kind === 'item')));
if (i < 0) {
  console.log(`${name}: nothing to fix`);
  process.exit(0);
}
const st = dlg.stages[i];
const a = st.answers.find((x) => x.next);
const b = a.next.answers.find((x) => x.needs?.kind === 'item');
const food = b.needs.value;
const both = { ...st, also: { kind: 'item', value: food }, answers: [{ label: a.label, reply: b.reply, needs: a.needs, effects: b.effects }] };
const short = { ...st, answers: [{ label: a.label, reply: '', needs: { kind: 'item', value: food }, effects: [] }] };
dlg.stages.splice(i, 1, both, short);
writeFileSync(`${outDir}/${name}.dlg`, JSON.stringify(dlg));
writeFileSync(`${outDir}/${name}`, toScript(name, dlg));
console.log(`${name}: one answer now checks the ${a.needs?.value ?? 'first item'} and the ${food}`);
