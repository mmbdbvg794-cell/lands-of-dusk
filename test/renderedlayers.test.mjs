import assert from 'node:assert/strict';
import { renderedFrame, renderedGearLayers } from '../js/renderer.js';

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

console.log('rendered layer tests passed');
