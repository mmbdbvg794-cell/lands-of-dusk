// Run with: node test/craftadmin.test.mjs
import assert from 'node:assert/strict';
import { parseCraftAdmin, recipeRows, recipesText, saveRecipesCommand } from '../js/craftadmin.js';

assert.deepEqual(parseCraftAdmin('CraftStatus: iron vein|73|5'), { source: { name: 'iron vein', placed: 73, usedUp: 5 } });
assert.deepEqual(parseCraftAdmin('CraftStatus: working|2'), { working: 2 });
assert.deepEqual(parseCraftAdmin('CraftStatus: done'), { done: true });
const file = '# hello\nforge|0|bronze bar|2 bronze ore\n\nanvil|6|bronze sword|3 bronze bar\nbad line\nalchemy|70|moonpetal elixir|2 moonpetal, 1 brewed blue potion\n';
const b64 = btoa(file);
assert.equal(parseCraftAdmin(`CraftRecipes: ${b64}`).recipes, file);
assert.equal(parseCraftAdmin('CraftRecipes: ').recipes, '');
assert.equal(parseCraftAdmin('Recipes saved: 3 recipes.'), null);
const rows = recipeRows(file);
assert.equal(rows.length, 3);
assert.deepEqual(rows[2], { station: 'alchemy', level: 70, result: 'moonpetal elixir', needs: '2 moonpetal, 1 brewed blue potion' });
// Round trip: the same recipes, with the file's own heading.
const text = recipesText(rows);
assert.deepEqual(recipeRows(text), rows);
assert.match(text, /^# What forges/);
// Bars and new lines can't break a line; levels kept 0-100; empty rows dropped.
const odd = recipesText([{ station: 'anvil', level: 250, result: 'a|b', needs: 'x\ny' }, { station: 'forge', level: 3, result: '', needs: '' }]);
assert.match(odd, /^anvil\|100\|a b\|x y$/m);
assert.equal(recipeRows(odd).length, 1);
assert.match(saveRecipesCommand(rows), /^craft recipes set [A-Za-z0-9+/=]+$/);
console.log('ok - craftadmin');
