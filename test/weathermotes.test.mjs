// The weather layer's particle pools with a stand-in Pixi: flames rise off a burning creature
// (js/creatures.js FX), day or night, and fade; none without a source.
import assert from 'node:assert/strict';

const ctx2d = new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => ctx2d }) };
class Node { constructor(o = {}) { Object.assign(this, o); this.children = []; this.anchor = { set() {} }; this.position = { set() {} }; } addChild(...c) { this.children.push(...c); } addParticle() {} }
const chain = () => { const g = new Proxy({}, { get: () => () => g }); return g; };
const PIXI = { Texture: { from: () => ({}) }, ParticleContainer: Node, Particle: Node, Container: Node, Sprite: Node, Graphics: class { constructor() { return chain(); } } };

const { createWeather } = await import('../js/weather.js');
const { FX } = await import('../js/creatures.js');
const w = createWeather(PIXI, { lowEnd: false });
const motes = w.above.children[2]; // flies, embers, motes, flash, overlay
assert.ok(motes, 'a pool for the motes');

const world = { tileAt: () => 0 };
const frame = (flames, now) => w.update({ dt: 0.05, now, world, renderer: {}, st: { weather: 'clear', intensity: 0, wind: 0 }, cam: { x: 100, y: 100 }, r: 5, c: 64, w: 704, h: 704, night: 0, fires: [], flames });
const src = [{ x: 100, y: 99.6, fx: FX.burning }, { x: 99.7, y: 99.8, fx: FX.burning }];
for (let i = 0; i < 20; i++) frame(src, 1000 + i * 50);
assert.ok(w.shown >= 2, `flames show in daylight (${w.shown})`);
assert.equal(w.active, 'slow', 'flames keep the layer ticking');
for (let i = 0; i < 40; i++) frame([], 3000 + i * 50);
assert.equal(w.shown, 0, 'no source, no flames');
console.log('weather motes test passed');
