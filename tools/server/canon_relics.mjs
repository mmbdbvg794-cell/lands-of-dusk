// The canon cleanup, part 2, step 4 (decision G): the old world's living
// NPCs keep their character but sound like people hanging on in an emptied
// land. Approved by flan 2026-10-21. Same shape as canon_cleanup2.mjs:
//
//   node tools/server/canon_relics.mjs <game dir> <out dir>
//   (stage = the copy with the bundle applied)
//   node tools/server/merge_quests.mjs <stage>/talk <stage>/quests <out dir>/talk "Reeve Osric"
//
// then tools/server/canon_install.sh. Walk-on scripts and talk take effect
// at once; no restart. Stops without writing if a line isn't there.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

const [, , game, out] = process.argv;
if (!out) {
  console.error('usage: node tools/server/canon_relics.mjs <game dir> <out dir>');
  process.exit(2);
}

const problems = [];
const files = new Map();
const remove = new Set();
const has = (rel) => existsSync(`${game}/${rel}`);
const read = (rel) => readFileSync(`${game}/${rel}`, rel.endsWith('.json') ? 'utf8' : 'latin1');
const swapOnce = (where, text, a, b) => {
  const n = text.split(a).length - 1;
  if (n !== 1) { problems.push(`${where}: ${n ? `${n} times` : 'not found'}: ${a}`); return text; }
  return text.replace(a, () => b);
};

// [squares, old, new]
const WALK = [
  [['440_76'], 'Welcome to the best place to buy mining equipment! Hope you find everything ok.', 'Welcome. Still the best mining gear in the old world, and hardly anyone left to dig with it. Take your time.'],
  [['440_79'], '" Welcome " name trigger ". Happy shopping."', '" Welcome, " name trigger ". Mind the dust; I don\'t sweep much now."'],
  [['440_79'], '" Thank you. " name trigger ", come again."', '" Thank you, " name trigger ". Come again, if you\'re still here."'],
  [['442_72'], 'Izaru\'s is world famous for its mining equipment though.', 'Izaru\'s gear was famous once, when there were miners to buy it.'],
  [['463_63'], 'Innkeeper says: Sweet dreams!', 'Innkeeper says: Sweet dreams. Take any bed; they\'re all empty.'],
  [['464_60', '464_62', '465_61'], 'Innkeeper says: Thank you for coming.', 'Innkeeper says: Thank you for coming. Not many do, these days.'],
  [['479_37'], 'Trank says: Congratulations! I know you\'ll be one of our best!', 'Trank says: Congratulations. You\'ll be one of our best. There aren\'t many of us left to beat.'],
  [['479_38'], 'All the thieves clap for you. Hurray!', 'The thieves who stayed clap for you. It doesn\'t fill the hall.'],
  [['479_45'], 'Welcome to the thief training center. If you see Trank', 'Welcome to the thief training center, what\'s left of it. If you see Trank'],
  [['195_197'], 'The ExitMan waves as you walk away, hopeing you come back again.', 'The ExitMan waves as you walk away. He waves at everyone who leaves. Few come back.'],
  [['7_966'], 'If you bring it back to me, I\'ll pay you with amazing riches.', 'Bring it back and I\'ll pay you with what\'s left of the family\'s riches. It\'s still a fair bit.'],
  [['7_966'], 'Spend those riches wisely."', 'Spend those riches wisely; there won\'t be more."'],
];
const walk = new Map();
for (const [squares, a, b] of WALK) {
  for (const sq of squares) {
    const rel = `defMoveActions/${sq}`;
    if (!has(rel)) { problems.push(`no ${rel}`); continue; }
    walk.set(rel, swapOnce(rel, walk.get(rel) ?? read(rel), a, b));
    if (has(`${rel}.dsko`)) remove.add(`${rel}.dsko`);
  }
}
for (const [rel, text] of walk) files.set(rel, text);

// Reeve Osric's last quest (frozenreach.mjs): its thank-you and its "after".
{
  const rel = 'quests/fr_dragon.json';
  if (!has(rel)) problems.push(`no ${rel}`);
  else {
    const q = JSON.parse(read(rel));
    const step = q.steps.find((s) => s.reply === 'Then we\'re safe. All of us, thanks to you.');
    if (!step) problems.push('fr_dragon: no "Then we\'re safe. All of us" step');
    else step.reply = 'Then we\'re safe, the nine families of us, thanks to you.';
    if (q.after !== 'The frozen land is quiet. The village owes you everything.') problems.push(`fr_dragon after is "${q.after}"`);
    else q.after = 'The frozen land is quiet. Nine families sleep easier, and every one of them knows your name.';
    files.set(rel, JSON.stringify(q));
  }
}

if (problems.length) {
  console.error(`nothing written:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const sums = [];
for (const [rel, text] of files) {
  mkdirSync(dirname(`${out}/${rel}`), { recursive: true });
  writeFileSync(`${out}/${rel}`, text, rel.endsWith('.json') ? 'utf8' : 'latin1');
  sums.push(`${createHash('sha256').update(readFileSync(`${game}/${rel}`)).digest('hex')}  ${rel}`);
}
writeFileSync(`${out}/REMOVE`, [...remove].sort().join('\n') + (remove.size ? '\n' : ''));
writeFileSync(`${out}/ORIG.sha256`, sums.sort().join('\n') + '\n');
console.log(`changed ${files.size}, removed ${remove.size}`);
