// Draws one frame of the map with a mob, a merchant, people props and a player in view, in the
// Painted style with rendered figures, so a mistake in the drawing loop (one that would stop every
// figure being drawn in the browser) fails here. Canvas and DOM are stand-ins that accept anything.
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

const { Renderer } = await import('../js/renderer.js');
const { World } = await import('../js/world.js');
const { OP } = await import('../js/protocol.js');

const world = new World();
const n = world.mapSize;
world.apply({ op: OP.MAP, x: 100, y: 100, tiles: Array.from({ length: n * n }, () => 0) });
const r0 = Math.floor(n / 2);
const ents = [
  [1, 'Bug', 4], [2, 'Lizard Axeman', 4], [3, 'duergar soldier', 4], [4, 'wolf', 4],
  [5, 'Merchant', 2], [6, 'Captain Hale', 3], [7, 'Child', 3], [8, 'flan', 0],
];
ents.forEach(([id, name, type], i) => world.apply({ op: OP.ENTITY, id, name, type, x: 100 - r0 + i, y: 100, image: 0, step: 0 }));

const ctx = anything();
const box = { getBoundingClientRect: () => ({ width: 640, height: 640 }), clientWidth: 640, clientHeight: 640 };
const canvas = { getContext: () => ctx, width: 0, height: 0, style: {}, parentElement: box, addEventListener() {} };
const r = new Renderer(canvas, world, box);
r.resize?.();
const drawn = [];
const sheet = (label) => ({ count: 36, size: 144, cols: 36, img: {}, draw: () => drawn.push(label) });
r.setSheets({ map: sheet('map'), players: sheet('players'), sprites: sheet('sprites') });
r.rendered = new Map([0, 1, 2, 6, 8, 9, 10, 11, 20].map((l) => [l, sheet(`look${l}`)]));
r.renderedLayers = new Map([['0-npc-shirt', sheet('layer')]]);
r.creatures = new Map([['bug', sheet('mob-bug')], ['wolf', sheet('mob-wolf')]]);
r.talkers = new Set(['captain hale', 'child']);
r.tinted = (s) => s;

assert.doesNotThrow(() => r.draw(), 'a frame draws without throwing');
for (const want of ['mob-bug', 'mob-wolf', 'look6', 'look0']) assert.ok(drawn.includes(want), `drew ${want}`);
console.log('render draw test passed');
