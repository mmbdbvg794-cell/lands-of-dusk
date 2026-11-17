import assert from 'node:assert/strict';
import { renderedFrame, renderedGearLayers, hoverFrame, HOVER_MS } from '../js/renderer.js';

// A hovering flier (36-frame strip): only its facing's walk frames, never the standing one, and it changes over time.
for (let t = 0; t < 20; t++) { const n = hoverFrame(36, 2, t * HOVER_MS); if (n < 19 || n > 26) throw new Error(`hover frame ${n}`); }
if (hoverFrame(36, 1, 0) === hoverFrame(36, 1, HOVER_MS)) throw new Error('hover frames advance');
import { gearFromEquipment } from '../js/gear.js';

// Frames: 36-frame strips = 9 per direction (standing + 8-frame walk cycle).
assert.equal(renderedFrame(36, 2, { x: 4, y: 4 }, 1), 9, 'standing, facing south');
assert.deepEqual([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((p) => renderedFrame(36, 3, { x: 4, y: 0 }, p)), [10, 10, 11, 12, 13, 13], 'even tile: first half of the stride');
assert.deepEqual([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((p) => renderedFrame(36, 3, { x: 5, y: 0 }, p)), [14, 14, 15, 16, 17, 17], 'odd tile: second half');
assert.equal(renderedFrame(36, 7, { x: -3, y: 0 }, 0.5), 27 + 1 + 6, 'negative coordinates still alternate');
assert.equal(renderedFrame(8, 7, { x: 1, y: 0 }, 0.3), 7, 'classic 8-frame strip: frame = step');

// Layers.
const L = (name) => ({ name });
const layers = new Map([['0-torso', L('torso')], ['0-torso-robe', L('robe')], ['0-helm', L('helm')], ['0-weapon', L('weapon')]]);
const names = (list) => list.map((l) => `${l.sheet.name}:${l.colour}`);
const gear = {
  torso: { kind: 'robe', colour: '#3a4aa0' },
  helm: { kind: 'helm', colour: '#a4acb6' },
  weapon: { kind: 'sword', colour: '#b8773a' },
};
assert.deepEqual(names(renderedGearLayers(layers, 0, gear, 1)), ['robe:#3a4aa0', 'helm:#a4acb6', 'weapon:#b8773a'], 'facing south: weapon in front');
assert.deepEqual(names(renderedGearLayers(layers, 0, gear, 3)), ['robe:#3a4aa0', 'helm:#a4acb6', 'weapon:#b8773a'], 'facing east: right hand toward us');
assert.deepEqual(names(renderedGearLayers(layers, 0, gear, 0)), ['weapon:#b8773a', 'robe:#3a4aa0', 'helm:#a4acb6'], 'facing north: weapon behind');
assert.deepEqual(names(renderedGearLayers(layers, 0, gear, 2)), ['weapon:#b8773a', 'robe:#3a4aa0', 'helm:#a4acb6'], 'facing west: weapon behind');
assert.deepEqual(names(renderedGearLayers(layers, 0, { torso: { kind: 'plate', colour: '#a4acb6' } }, 1)), ['torso:#a4acb6'], 'no plate layer: falls back to the generic torso');
// Leggings: plate -> legs-plate, anything else -> legs-cloth; drawn under the torso.
const withLegs = new Map([...layers, ['0-legs-plate', L('greaves')], ['0-legs-cloth', L('pants')]]);
assert.deepEqual(names(renderedGearLayers(withLegs, 0, { ...gear, legs: { colour: '#a4acb6', plate: true } }, 1)),
  ['greaves:#a4acb6', 'robe:#3a4aa0', 'helm:#a4acb6', 'weapon:#b8773a'], 'plate leggings under the torso');
assert.deepEqual(names(renderedGearLayers(withLegs, 0, { legs: { colour: '#6a4a2a', plate: false } }, 0)),
  ['pants:#6a4a2a'], 'leather/cloth leggings');
assert.deepEqual(names(renderedGearLayers(withLegs, 0, { ...gear, legs: { colour: '#a4acb6', plate: true } }, 2)),
  ['weapon:#b8773a', 'greaves:#a4acb6', 'robe:#3a4aa0', 'helm:#a4acb6'], 'facing west: weapon behind, then legs');
assert.deepEqual(renderedGearLayers(layers, 0, { legs: { colour: '#a4acb6', plate: true } }, 1), [], 'no legs layer rendered yet: nothing drawn');
assert.deepEqual(renderedGearLayers(layers, 2, gear, 1), [], 'a look without layers draws none');
assert.deepEqual(renderedGearLayers(layers, 0, null, 1), [], 'no gear known: body only');
assert.deepEqual(renderedGearLayers(layers, 0, {}, 1), [], 'nothing worn: body only');

// Trims: a piece's "-trim" layer right after it, metal brighter, cloth darker.
import('../js/npcoutfits.js').then(({ trimColour }) => {
  const withTrim = new Map([...layers, ['0-torso-plate', L('plate')], ['0-torso-plate-trim', L('plate trim')], ['0-torso-trim', L('torso trim')]]);
  assert.deepEqual(names(renderedGearLayers(withTrim, 0, { torso: { kind: 'plate', colour: '#a4acb6' } }, 1)),
    ['plate:#a4acb6', `plate trim:${trimColour('#a4acb6', true)}`], 'plate and its brighter trim');
  assert.deepEqual(names(renderedGearLayers(withTrim, 0, { torso: { kind: 'robe', colour: '#3a4aa0' } }, 1)),
    ['robe:#3a4aa0'], 'a kind with its own layer but no trim: no trim');
  assert.deepEqual(names(renderedGearLayers(withTrim, 0, { torso: { kind: 'cloth', colour: '#6a4a2a' } }, 1)),
    ['torso:#6a4a2a', `torso trim:${trimColour('#6a4a2a', false)}`], 'generic torso with a trim: darker');
  console.log('rendered layer trim tests passed');
});

// Boots, shoes and hoods on players (the NPC layers): boots over the trousers and under the
// torso; a hood under a helm; nothing for what's only in the backpack.
const wardrobe = new Map([...layers, ['0-legs-cloth', L('pants')], ['0-npc-boots', L('boots')], ['0-npc-boots-trim', L('boots trim')],
  ['0-npc-shoes', L('shoes')], ['0-npc-hood', L('hood')]]);
const kit = (equipment, dir = 1) => renderedGearLayers(wardrobe, 0, gearFromEquipment(equipment), dir).map((l) => l.sheet.name);
// The engine has no feet slot: boots are worn on the legs. (A 'feet' slot is read too, if one appears.)
assert.deepEqual(kit({ legs: { name: 'leather boots' } }), ['boots', 'boots trim'], 'leather boots worn on the legs: boots, no trousers');
assert.deepEqual(kit({ legs: { name: 'leather pants' }, feet: { name: 'leather boots' }, torso: { name: 'iron suit' } }),
  ['pants', 'boots', 'boots trim', 'torso'], 'boots after the legs, before the torso');
assert.deepEqual(kit({ legs: { name: 'sandals of the giants' } }), ['shoes'], 'sandals: shoes');
assert.deepEqual(kit({ legs: { name: 'Air_Boots' } }), ['boots', 'boots trim'], 'case and underscores');
assert.deepEqual(kit({ skull: { name: 'grey hood' } }), ['hood'], 'a hood on the head');
assert.deepEqual(kit({ skull: { name: 'leather cap' } }), ['helm'], 'a cap is still a helm');
assert.deepEqual(names(renderedGearLayers(wardrobe, 0, { hood: { colour: '#808080' }, helm: { kind: 'helm', colour: '#a4acb6' } }, 1)),
  ['hood:#808080', 'helm:#a4acb6'], 'hood under the helm');
assert.deepEqual(kit({ legs: { name: 'leather boots' }, skull: { name: 'grey hood' }, wield: { name: 'iron sword' } }, 0),
  ['weapon', 'boots', 'boots trim', 'hood'], 'facing north: weapon behind');
assert.deepEqual(kit({}), [], 'boots only in the backpack: nothing drawn');
assert.equal(gearFromEquipment({ legs: { name: 'leather boots' } }).legs, undefined, 'boots are not trousers');

console.log('rendered layer tests passed');
