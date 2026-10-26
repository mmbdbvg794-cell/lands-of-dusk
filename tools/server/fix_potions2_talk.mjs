// The potion renames' conversation part (tools/server/fix_potions2.py has
// the rest): Trader Kossk's dw_wreck reward is two strong healing potions,
// not red potions, and Alchemist Pell's "Blue potion?" asks about the
// rejuvenation potion at its new price.
//
//   node tools/server/fix_potions2_talk.mjs <game dir> <out dir>
//
// Reads <game dir> (talk/), never writes it. Writes the changed talk files
// to <out dir> with ORIG.sha256 and REMOVE for canon_install.sh.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { PELL_REJUVENATION } from '../world/cities/capital.mjs';

const [, , game, out] = process.argv;
if (!out) {
  console.error('usage: node tools/server/fix_potions2_talk.mjs <game dir> <out dir>');
  process.exit(2);
}
const read = (r) => readFileSync(`${game}/${r}`, r.endsWith('.dlg') ? 'utf8' : 'latin1');
const EDITS = {
  'Trader Kossk': (dlg) => JSON.parse(JSON.stringify(dlg).replaceAll('red potion', 'strong healing potion')),
  'Alchemist Pell': (dlg) => {
    for (const st of dlg.stages) {
      for (const a of st.answers ?? []) {
        if (a.label === 'Blue potion?') Object.assign(a, PELL_REJUVENATION);
      }
    }
    return dlg;
  },
};
const files = new Map();
for (const [name, edit] of Object.entries(EDITS)) {
  const rel = `talk/${name}`;
  const dlg = tidyDialogue(JSON.parse(read(`${rel}.dlg`)));
  if (toScript(name, dlg) !== read(rel)) {
    console.error(`nothing written: ${rel} was changed by hand`);
    process.exit(1);
  }
  const next = edit(structuredClone(dlg));
  files.set(`${rel}.dlg`, JSON.stringify(next));
  files.set(rel, toScript(name, next));
  const greet = toGreet(next);
  if (greet) files.set(`${rel}.greet`, greet + '\n');
}
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
