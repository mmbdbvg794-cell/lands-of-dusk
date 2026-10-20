// Velkarath's talking Dark Elf Guard (the west tunnel), from velkarath.mjs:
// a short greeting with topics instead of one long speech.
//
//   node tools/server/fix_velkarath_guard.mjs <out dir>
//
// Writes <out dir>/Dark Elf Guard.dlg and Dark Elf Guard (the talk script);
// copy both into the game's talk/ (and remove its .dsko). No restart.
import { writeFileSync } from 'node:fs';
import { toScript } from '../../js/dialogue.js';
import { GUARD } from '../world/cities/velkarath.mjs';

const [, , outDir] = process.argv;
const name = 'Dark Elf Guard';
writeFileSync(`${outDir}/${name}.dlg`, JSON.stringify(GUARD));
writeFileSync(`${outDir}/${name}`, toScript(name, GUARD));
console.log(`${name}: written to ${outDir}`);
