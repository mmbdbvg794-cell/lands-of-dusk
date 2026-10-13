// Puts quests' stages into NPCs' saved conversations on a live server,
// instead of reinstalling the cities those NPCs belong to (which would
// undo dialogue changed in the God tab since). For each NPC with a saved
// conversation: every quest in <quests dir> that involves them (giver or a
// step's NPC) is merged again with js/quests.js mergeQuest, which also
// keeps the NPC's own conversation reachable through quest stages. Running
// it again changes nothing.
//
//   node tools/server/merge_quests.mjs <talk dir> <quests dir> <out dir> [NPC name...]
//
// Writes each changed .dlg and script to <out dir>. An NPC whose script
// isn't what the editor makes of its .dlg (changed by hand) is left alone
// and listed. With names, only those NPCs.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { toScript, toGreet, tidyDialogue } from '../../js/dialogue.js';
import { mergeQuest, questNpcs, tidyQuest } from '../../js/quests.js';

const [, , talkDir, questsDir, outDir, ...only] = process.argv;
if (!outDir) {
  console.error('usage: node tools/server/merge_quests.mjs <talk dir> <quests dir> <out dir> [NPC name...]');
  process.exit(2);
}
const quests = readdirSync(questsDir).filter((f) => f.endsWith('.json')).map((f) => tidyQuest(JSON.parse(readFileSync(`${questsDir}/${f}`, 'utf8'))))
  // Those a chain needs go first, so stages come out in the chain's order.
  .sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0) || a.id.localeCompare(b.id));
const names = only.length ? only : readdirSync(talkDir).filter((f) => f.endsWith('.dlg')).map((f) => f.slice(0, -4));
mkdirSync(outDir, { recursive: true });
const changed = [], hand = [];
for (const name of names) {
  const dlgPath = `${talkDir}/${name}.dlg`, scriptPath = `${talkDir}/${name}`;
  if (!existsSync(dlgPath) || !existsSync(scriptPath)) continue;
  let dlg;
  try { dlg = tidyDialogue(JSON.parse(readFileSync(dlgPath, 'utf8'))); } catch { hand.push(`${name} (unreadable)`); continue; }
  const now = readFileSync(scriptPath, 'latin1');
  if (toScript(name, dlg) !== now) { hand.push(name); continue; }
  const mine = quests.filter((q) => questNpcs(q).some((n) => n.toLowerCase() === name.toLowerCase()));
  if (!mine.length) continue;
  const merged = mine.reduce((d, q) => mergeQuest(d, q, name), dlg);
  const script = toScript(name, merged);
  if (script === now) continue;
  writeFileSync(`${outDir}/${name}.dlg`, JSON.stringify(merged));
  writeFileSync(`${outDir}/${name}`, script, 'latin1');
  const greet = toGreet(merged);
  if (greet) writeFileSync(`${outDir}/${name}.greet`, greet + '\n');
  changed.push(`${name} (${mine.map((q) => q.id).join(', ')})`);
}
console.log(`rewritten ${changed.length}:\n  ${changed.join('\n  ')}`);
if (hand.length) console.log(`left alone (changed by hand): ${hand.join(', ')}`);
