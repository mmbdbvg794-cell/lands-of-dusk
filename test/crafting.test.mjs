// Run with: node test/crafting.test.mjs
import assert from 'node:assert/strict';
import { parseWorking, parseRecipe, craftActions, isVein, isPatch, isStation, smithCommand, makeCommand, usedUpLook, WORKED_OUT, PICKED } from '../js/crafting.js';

assert.deepEqual(parseWorking('Working: 4200|Mining the iron vein'), { ms: 4200, what: 'Mining the iron vein' });
assert.deepEqual(parseWorking('Working: done'), { done: true });
assert.equal(parseWorking('You mine some iron ore.'), null);
assert.deepEqual(parseRecipe('Recipe: forge|15|iron bar|2 iron ore|3'), { recipe: { station: 'forge', level: 15, result: 'iron bar', needs: '2 iron ore', can: 3 } });
assert.deepEqual(parseRecipe('Recipe: forge|35|steel bar|2 iron ore, 2 coal|0').recipe.needs, '2 iron ore, 2 coal');
assert.deepEqual(parseRecipe('Recipes: forge,anvil|12'), { stations: ['forge', 'anvil'], level: 12 });
assert.equal(parseRecipe('Recipes are fun'), null);
assert.ok(isVein('Iron Vein') && isVein('coal seam') && !isVein('veiny thing'));
assert.ok(isStation('forge') && isStation('anvil') && isStation('old forge') && !isStation('forget-me-not'));
assert.equal(smithCommand('bronze bar'), 'smith bronze bar');
assert.equal(smithCommand('bronze bar', 5), 'smith bronze bar 5');

const me = { x: 10, y: 10 };
assert.deepEqual(craftActions({ id: 7, x: 11, y: 9, image: 59 }, 'iron vein', me), [{ label: 'Mine', cmd: 'mine 7' }]);
assert.equal(craftActions({ id: 7, x: 13, y: 9, image: 59 }, 'iron vein', me)[0].cmd, 'goto 13 9');
assert.equal(craftActions({ id: 7, x: 11, y: 9, image: WORKED_OUT }, 'iron vein', me)[0].disabled, true);
assert.deepEqual(craftActions({ id: 8, x: 12, y: 12 }, 'forge', me), [{ label: 'Smelt…', cmd: 'smith' }]);
assert.deepEqual(craftActions({ id: 9, x: 8, y: 10 }, 'anvil', me), [{ label: 'Smith…', cmd: 'smith' }]);
assert.equal(craftActions({ id: 9, x: 5, y: 10 }, 'anvil', me)[0].cmd, 'goto 5 10');
assert.equal(craftActions({ id: 3, x: 10, y: 11 }, 'chair', me), null);
// Herbs and alchemy.
assert.ok(isPatch('Mandrake Patch') && isPatch('azeala bush') && !isPatch('pumpkin patch'));
assert.ok(isStation('alchemy table'));
assert.deepEqual(craftActions({ id: 4, x: 10, y: 11, image: 66 }, 'mandrake patch', me), [{ label: 'Gather', cmd: 'gather 4' }]);
assert.equal(craftActions({ id: 4, x: 10, y: 11, image: PICKED }, 'mandrake patch', me)[0].disabled, true);
assert.deepEqual(craftActions({ id: 5, x: 11, y: 11 }, 'alchemy table', me), [{ label: 'Brew…', cmd: 'brew' }]);
assert.equal(craftActions({ id: 5, x: 15, y: 11 }, 'alchemy table', me)[0].label, 'Go to the alchemy table');
assert.equal(makeCommand('brew', 'brewed red potion', 3), 'brew brewed red potion 3');
assert.equal(usedUpLook('iron vein', WORKED_OUT), 'worked-out vein');
assert.equal(usedUpLook('lavender patch', PICKED), 'picked patch');
assert.equal(usedUpLook('lavender patch', 67), null);
assert.equal(usedUpLook('chair', WORKED_OUT), null);
assert.deepEqual(parseRecipe('Recipes: alchemy|7'), { stations: ['alchemy'], level: 7 });
console.log('ok - crafting');
