// The human tutorial's Drill Sergeant (no plan file; built in the God tab).
// Play-test 4 found the other tutorials' trainers made anyone who had
// already beaten a dummy click through "wear your gear" and "strike a
// dummy" first; grove.mjs, hatchery.mjs and velkarath.mjs now take the
// stuffing at once. This gives the Sergeant the same stage: told to wear
// the gear (tutorialStart3) and carrying straw stuffing -> the hand-in.
//
//   node tools/server/fix_drill_sergeant.mjs <Drill Sergeant.dlg> <out dir>
//
// Writes <out dir>/Drill Sergeant.dlg and Drill Sergeant (the talk script).
// An already fixed one is left as is. His gate (tileactions/139_377.json
// and .block) now says "Report to me first" (fix_playtest4b.py).
import { readFileSync, writeFileSync } from 'node:fs';
import { toScript } from '../../js/dialogue.js';

const [, , input, outDir] = process.argv;
const name = 'Drill Sergeant';
const dlg = JSON.parse(readFileSync(input, 'utf8'));
if (dlg.stages.some((st) => st.also?.kind === 'item' && st.also.value === 'straw stuffing')) {
  console.log(`${name}: nothing to fix`);
  process.exit(0);
}
const i = dlg.stages.findIndex((st) => st.when?.kind === 'flag' && st.when.value === 'tutorialStart3');
const handIn = dlg.stages.find((st) => st.when?.kind === 'flag' && st.when.value === 'tutorialStart4')?.answers?.find((a) => a.needs?.value === 'straw stuffing');
if (i < 0 || !handIn) throw new Error(`${name}: the stages aren't as expected`);
dlg.stages.splice(i, 0, {
  when: { kind: 'flag', value: 'tutorialStart3' },
  also: { kind: 'item', value: 'straw stuffing' },
  says: 'Geared up and that dummy already gutted, without being told? Hand it over, recruit.',
  answers: [{ ...handIn, effects: handIn.effects.map((e) => (e.kind === 'unflag' && e.flag === 'tutorialStart4' ? { ...e, flag: 'tutorialStart3' } : e)) }],
});
writeFileSync(`${outDir}/${name}.dlg`, JSON.stringify(dlg));
writeFileSync(`${outDir}/${name}`, toScript(name, dlg));
console.log(`${name}: takes the stuffing at once from anyone who already has it`);
