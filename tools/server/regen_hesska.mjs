// Chieftain Hesska's dialogue from ssarakh.mjs (HESSKA) merged with her
// Dawnward quests, as the plan builds it: short welcome with topics.
//
//   node tools/server/regen_hesska.mjs <out dir>
//
// Writes <out dir>/Chieftain Hesska.dlg and Chieftain Hesska (the talk
// script); copy both into the game's talk/ (and remove its .dsko).
import { writeFileSync } from 'node:fs';
import { toScript } from '../../js/dialogue.js';
import { dawnward } from '../world/cities/dawnward.mjs';
import { HESSKA } from '../world/cities/ssarakh.mjs';

const [, , outDir] = process.argv;
const name = 'Chieftain Hesska';
const dlg = dawnward(name, structuredClone(HESSKA));
writeFileSync(`${outDir}/${name}.dlg`, JSON.stringify(dlg));
writeFileSync(`${outDir}/${name}`, toScript(name, dlg));
console.log(`${name}: written to ${outDir}`);
