// The weather layer's particle pools with a stand-in Pixi: flames rise off a burning creature
// (js/creatures.js FX), day or night, and fade; none without a source.
import assert from 'node:assert/strict';

const ctx2d = new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => ctx2d }) };
class Node { constructor(o = {}) { Object.assign(this, o); this.children = []; this.anchor = { set() {} }; this.position = { set() {} }; } addChild(...c) { this.children.push(...c); } addParticle(p) { this.children.push(p); } }
const chain = () => { const g = new Proxy({}, { get: () => () => g }); return g; };
const PIXI = { Texture: { from: () => ({}) }, ParticleContainer: Node, Particle: Node, Container: Node, Sprite: Node, Graphics: class { constructor() { return chain(); } } };

const { createWeather } = await import('../js/weather.js');
const { FX } = await import('../js/creatures.js');
const w = createWeather(PIXI, { lowEnd: false });
const motes = w.above.children[2]; // flies, embers, motes, flash, overlay
assert.ok(motes, 'a pool for the motes');

const world = { tileAt: () => 0 };
const frame = (flames, now, fxShare = 1) => w.update({ dt: 0.05, now, world, renderer: {}, st: { weather: 'clear', intensity: 0, wind: 0 }, cam: { x: 100, y: 100 }, r: 5, c: 64, w: 704, h: 704, night: 0, fires: [], flames, fxShare });
const source = (fx, x = 100, y = 100, id = 1) => ({ id, fx, dir: 1, pts: [[x, y - 0.3], [x - 0.2, y - 0.1]], head: [x, y - 0.3], box: { x0: x - 0.3, y0: y - 0.5, x1: x + 0.3, y1: y + 0.5 }, colour: 0x40ff60 });
const src = [source(FX.burning), source(FX.burning, 99, 100, 2)];
for (let i = 0; i < 20; i++) frame(src, 1000 + i * 50);
assert.ok(w.shown >= 2, `flames show in daylight (${w.shown})`);
assert.ok(w.shown <= 20, `at most each part's share a creature (${w.shown})`);
assert.equal(w.active, 'slow', 'flames keep the layer ticking');
for (let i = 0; i < 40; i++) frame([], 3000 + i * 50);
assert.equal(w.shown, 0, 'no source, no flames');
// Every effect makes particles; smoke goes in its own (painted, not added) pool.
const smoke = w.above.children[3];
assert.ok(smoke && smoke !== motes && smoke.blendMode !== 'add', 'a painted pool for smoke, breath and drips');
for (const name of Object.keys(FX)) {
  let most = 0; // some come now and then: the most at once over a few seconds
  for (let i = 0; i < 160; i++) { frame([source(FX[name])], 6000 + i * 50); most = Math.max(most, w.shown); }
  assert.ok(most > 0, `${name}: particles show (${most})`);
  for (let i = 0; i < 80; i++) frame([], 20000 + i * 50);
}
// A crowd of smoky creatures doesn't take more than the pools hold.
const crowd = Array.from({ length: 40 }, (_, i) => source(FX.shadow, 95 + (i % 10), 98 + Math.floor(i / 10), i));
for (let i = 0; i < 40; i++) frame(crowd, 30000 + i * 50);
assert.ok(w.shown <= w.cap.motes + w.cap.smoke, `capped (${w.shown})`);
// The strip colour: ghostly wisps take the creature's own.
for (let i = 0; i < 80; i++) frame([source(FX.ghostly)], 40000 + i * 50);
const tints = motes.children.filter((p) => p.live && p.alpha > 0).map((p) => p.tint);
assert.ok(tints.length && tints.every((t) => t === 0x40ff60), "wisps in the picture's colour");
// Low effects: half each creature's particles.
for (let i = 0; i < 80; i++) frame([], 50000 + i * 50);
const most = (share, t0) => { let m = 0; for (let i = 0; i < 60; i++) { frame([source(FX.burning)], t0 + i * 50, share); m = Math.max(m, w.shown); } for (let i = 0; i < 80; i++) frame([], t0 + 5000 + i * 50); return m; };
const fullN = most(1, 60000), lowN = most(0.5, 70000);
assert.equal(fullN, FX.burning.parts[0].per, `full: every particle (${fullN})`);
assert.equal(lowN, FX.burning.parts[0].per / 2, `low: half (${lowN})`);
console.log('weather motes test passed');
