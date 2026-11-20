// Weapon effects (Painted style): a wielded weapon's name -> its effect on whole words
// (js/gear.js weaponFx), every effect defined (js/creatures.js WEAPON_FX), and the effect sits
// on the weapon layer's own pixels (its box in the frame), wherever the frame puts it.
import assert from 'node:assert/strict';
const { weaponFx, gearFromEquipment } = await import('../js/gear.js');
const { WEAPON_FX, opaqueBox, weaponFxSource, fxPoint } = await import('../js/creatures.js');
const { weaponLayer, fxMovesOnCanvas } = await import('../js/renderer.js');

const cases = {
  flaming: ['Flaming Longsword', 'fire blade', 'Ember Dagger', 'burning_axe', 'Inferno Staff', 'sword of flame'],
  frost: ['Frost Brand', 'ice sword', 'Frozen Spear', 'Glacial Hammer', 'winter axe'],
  glint: ['Mithril Dagger', 'Elven Bow', 'silver sword', 'Holy Mace', 'blessed staff'],
  shadow: ['Shadow Blade', 'dark sword', 'Void Staff', 'Cursed Axe', 'Doom Hammer'],
  venom: ['Venom Dagger', 'poison spear', 'Toxic Blade', 'plague scythe'],
};
for (const [fx, names] of Object.entries(cases)) for (const n of names) assert.equal(weaponFx(n), fx, n);
for (const n of ['Iron Sword', 'Darkwood Staff', 'Firebrand', 'icepick', 'silverware', 'Steel Axe', '', null]) assert.equal(weaponFx(n), null, String(n));
assert.equal(weaponFx("Champion's Blade"), 'flaming', 'the gauntlet prize, by name');
assert.equal(weaponFx("champion's_blade"), 'flaming');
for (const fx of Object.keys(cases)) assert.ok(WEAPON_FX[fx], `${fx} is defined`);

// the gear carries it (yours, and another player's from "worn")
assert.equal(gearFromEquipment({ wield: { name: 'Flaming Longsword' } }).weapon.fx, 'flaming');
assert.equal(gearFromEquipment({ wield: { name: 'Iron Sword' } }).weapon.fx, undefined);

// the layer it's drawn on, as renderedGearLayers picks it
const layers = new Map([['6-weapon', 'plain'], ['6-weapon-bow', 'bow']]);
assert.equal(weaponLayer(layers, 6, { weapon: { kind: 'sword' } }), 'plain');
assert.equal(weaponLayer(layers, 6, { weapon: { kind: 'bow' } }), 'bow');
assert.equal(weaponLayer(layers, 6, {}), null);

// A weapon layer frame: a blade up the right of a 64-pixel frame (x 44-47, y 10-39). The
// effect's anchor, points and particle box fall inside the weapon's box, not the figure's.
const W = 64, data = new Uint8ClampedArray(W * W * 4);
for (let y = 10; y < 40; y++) for (let x = 44; x < 48; x++) data[(y * W + x) * 4 + 3] = 255;
const box = opaqueBox(data, W, W);
assert.ok(box.left > 0.6 && box.right < 0.8 && box.top > 0.1 && box.bottom < 0.65, JSON.stringify(box));
const [wx0, wy0] = fxPoint(50, 50, [box.left, box.top]);
const [wx1, wy1] = fxPoint(50, 50, [box.right, box.bottom]);
const inside = ([x, y]) => x >= wx0 - 1e-9 && x <= wx1 + 1e-9 && y >= wy0 - 1e-9 && y <= wy1 + 1e-9;
const src = weaponFxSource(50, 50, box);
assert.ok(inside(src.anchor), `anchor ${src.anchor} in the weapon's box`);
for (const pt of [...src.pts, src.head]) assert.ok(inside(pt), `point ${pt} in the weapon's box`);
assert.deepEqual(src.box, { x0: wx0, y0: wy0, x1: wx1, y1: wy1 });
// a swing frame moves the blade: the anchor moves with it
const d2 = new Uint8ClampedArray(W * W * 4);
for (let y = 30; y < 34; y++) for (let x = 20; x < 56; x++) d2[(y * W + x) * 4 + 3] = 255;
const swung = weaponFxSource(50, 50, opaqueBox(d2, W, W));
assert.ok(Math.abs(swung.anchor[0] - src.anchor[0]) > 0.05 || Math.abs(swung.anchor[1] - src.anchor[1]) > 0.05, 'follows the frame');

// which ones keep the map redrawing on the effect clock: flames flicker, the glint travels;
// frost's glow is steady; smoke and drips are particles only
const full = { bob: true, ground: true };
assert.ok(fxMovesOnCanvas(WEAPON_FX.flaming, full));
assert.ok(fxMovesOnCanvas(WEAPON_FX.glint, full));
for (const f of ['frost', 'shadow', 'venom']) assert.ok(!fxMovesOnCanvas(WEAPON_FX[f], full), f);
console.log('weapon fx test passed');
