// Name labels in the Painted style: a big creature's (mishaven) goes just above the top of its
// picture; a person's stays under the feet. One frame drawn with stand-in canvas and DOM.
import assert from 'node:assert/strict';

const anything = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'width' ? 10 : anything()),
  apply: () => anything(), construct: () => anything(), set: () => true,
});
globalThis.window ??= { devicePixelRatio: 1, addEventListener() {} };
globalThis.document ??= anything();
globalThis.requestAnimationFrame ??= () => 0;
globalThis.ResizeObserver ??= class { observe() {} };
globalThis.OffscreenCanvas ??= class { constructor() { this.width = 1; this.height = 1; } getContext() { return anything(); } };

const { Renderer, labelBaseline } = await import('../js/renderer.js');
const { World } = await import('../js/world.js');
const { OP } = await import('../js/protocol.js');

const world = new World();
const n = world.mapSize;
world.apply({ op: OP.MAP, x: 100, y: 100, tiles: Array.from({ length: n * n }, () => 0) });
const r0 = Math.floor(n / 2);
for (const [id, name, type, dx] of [[1, 'mishaven', 4, 0], [2, 'Captain Hale', 3, 6], [3, 'flan', 0, 3], [4, 'wolf', 4, 9]]) {
  world.apply({ op: OP.ENTITY, id, name, type, x: 100 - r0 + dx, y: 100, image: 0, step: 0 });
}

const texts = [];
const base = anything();
const ctx = new Proxy(base, { get: (t, k) => (k === 'fillText' ? (s, x, y) => texts.push({ s, x, y }) : k === 'measureText' ? (s) => ({ width: s.length * 6 }) : base[k]), set: () => true });
const box = { getBoundingClientRect: () => ({ width: 640, height: 640 }), clientWidth: 640, clientHeight: 640 };
const canvas = { getContext: () => ctx, width: 0, height: 0, style: {}, parentElement: box, addEventListener() {} };
const r = new Renderer(canvas, world, box);
r.resize?.();
const boxes = {};
const sheet = (label) => ({ count: 36, size: 144, cols: 36, img: {}, draw: (g, f, x, y, side) => { (boxes[label] ??= []).push({ x, y, side }); } });
r.setSheets({ map: sheet('map'), players: sheet('players'), sprites: sheet('sprites') });
r.rendered = new Map([0, 1, 2, 6, 8, 9, 10, 11, 20].map((l) => [l, sheet(`look${l}`)]));
r.renderedLayers = new Map();
r.creatures = new Map([['mishaven', sheet('mob-mishaven')], ['wolf', sheet('mob-wolf')]]);
r.talkers = new Set(['captain hale']);
r.tinted = (s) => s;
r.gear = []; // the Painted style
r.frameBox = () => ({ top: 0.3, left: 0.1, right: 0.9, bottom: 1 }); // the picture starts 30% down its frame
const npcAt = [];
const drawNpc = r.drawNpc.bind(r);
r.drawNpc = (e, outfit, px, py, ...rest) => { npcAt.push({ name: e.name, py }); return drawNpc(e, outfit, px, py, ...rest); };

r.draw();
const c = r.cell, nudge = Math.max(1, Math.round(c / 36));
const label = (name) => texts.filter((t) => t.s === name).at(-1);

const mis = boxes['mob-mishaven']?.at(-1);
assert.ok(mis, 'mishaven drawn');
assert.ok(mis.side > c, 'mishaven drawn bigger than a square');
const picTop = mis.y + mis.side * 0.3;
assert.ok(label('mishaven'), 'mishaven has a name');
assert.ok(label('mishaven').y < picTop, `mishaven's name (${label('mishaven').y}) is above its picture (${picTop})`);
assert.ok(label('mishaven').y > picTop - c * 0.4, 'and just above it, not far up');

const hale = npcAt.find((p) => p.name === 'Captain Hale');
assert.ok(hale, 'Captain Hale drawn as a person');
assert.equal(label('Captain Hale').y, hale.py + c - nudge, "a person's name: under the feet, as before");
const wolf = boxes['mob-wolf']?.at(-1);
assert.equal(label('wolf').y, wolf.y + c - nudge, "a wolf's name: under the feet");
assert.equal(labelBaseline(10, 32, 1), 41);
assert.equal(labelBaseline(10, 32, 1, 5), 3);
console.log('name label test passed');
