// Rewrites NPC talk scripts made by the dialogue editor with the current
// js/dialogue.js, after a change to how scripts are written. Only scripts
// exactly as the old writer made them are touched (one a god or a tool
// changed by hand is left alone and listed).
//
//   node tools/server/regen_talk.mjs <old dialogue.js> <talk dir> <out dir>
//
// Writes each changed script to <out dir> and lists them.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { toScript } from '../../js/dialogue.js';

const [, , oldPath, talkDir, outDir] = process.argv;
const old = await import(pathToFileURL(oldPath).href);
const changed = [], kept = [], same = [];
for (const f of readdirSync(talkDir)) {
  if (!f.endsWith('.dlg')) continue;
  const name = f.slice(0, -4);
  const scriptPath = `${talkDir}/${name}`;
  if (!existsSync(scriptPath)) continue;
  let dlg;
  try { dlg = JSON.parse(readFileSync(`${talkDir}/${f}`, 'utf8')); } catch { kept.push(`${name} (unreadable .dlg)`); continue; }
  const now = readFileSync(scriptPath, 'latin1');
  if (old.toScript(name, dlg) !== now) { kept.push(name); continue; }
  const fresh = toScript(name, dlg);
  if (fresh === now) { same.push(name); continue; }
  writeFileSync(`${outDir}/${name}`, fresh, 'latin1');
  changed.push(name);
}
console.log(`rewritten ${changed.length}: ${changed.join(', ')}`);
console.log(`unchanged ${same.length}; left alone (not as the editor wrote them) ${kept.length}: ${kept.join(', ')}`);
