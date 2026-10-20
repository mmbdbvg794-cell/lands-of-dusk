import { readFileSync, writeFileSync } from 'node:fs';
import { toScript } from '../../js/dialogue.js';
const [, , D, list] = process.argv;
for (const name of readFileSync(list, 'utf8').split('\n').filter(Boolean)) {
  const dlg = JSON.parse(readFileSync(`${D}/${name}.dlg`, 'latin1'));
  writeFileSync(`${D}/${name}`, toScript(name, dlg), 'latin1');
}
console.log('regenerated');
