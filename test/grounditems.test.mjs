// Items on the ground (Painted style, js/grounditems.js and js/renderer.js drawGroundItem): the
// tilt and nudge are fixed per id; names are hidden unless hovered, next to you, Alt held or
// the setting on; a square of 7 items draws at most 4.
import assert from 'node:assert/strict';
const G = await import('../js/grounditems.js');

// tilt and offset: the same every time for an id, within bounds, and varied across ids
const tilts = new Set();
for (let id = 1; id <= 200; id++) {
  const t = G.itemTilt(id);
  assert.equal(t, G.itemTilt(id), 'same tilt');
  assert.ok(Math.abs(t) <= (20 * Math.PI) / 180 + 1e-9, `tilt in range (${t})`);
  tilts.add(t.toFixed(3));
  const [ox, oy] = G.itemOffset(id, 3);
  assert.deepEqual([ox, oy], G.itemOffset(id, 3), 'same offset');
  assert.ok(Math.abs(ox) <= 0.15 && oy > 0 && oy <= 0.18, `offset in range (${ox}, ${oy})`);
}
assert.ok(tilts.size > 150, 'tilts differ between ids');
assert.deepEqual(G.itemOffset(5, 1), [0, 0.1], 'alone: just below the middle');
// sized by the picture inside the frame: a sword's longer side 2/3 of a square, an apple less
assert.ok(Math.abs(G.itemFrameScale({ left: 0.2, right: 0.82, top: 0.2, bottom: 0.75 }) * 0.62 - 0.66) < 1e-9);
assert.equal(G.itemFrameScale({ left: 0.3, right: 0.63, top: 0.3, bottom: 0.68 }), G.ITEM_MAX_GROW);

// names: hidden by default
assert.equal(G.showItemNames({}), false);
assert.ok(G.showItemNames({ hover: true }) && G.showItemNames({ near: true }) && G.showItemNames({ held: true }) && G.showItemNames({ setting: true }));
assert.ok(G.isNear({ x: 10, y: 10 }, 11, 9) && G.isNear({ x: 10, y: 10 }, 10, 10));
assert.ok(!G.isNear({ x: 10, y: 10 }, 12, 10) && !G.isNear(null, 1, 1));
assert.equal(G.pileLabel(['dagger']), 'dagger');
assert.equal(G.pileLabel(['dagger', 'apple']), 'dagger, apple');
assert.equal(G.pileLabel(['dagger', 'apple', 'gold', 'ale']), 'dagger, apple +2');

// piles: grouped by square in id order, lists reused frame to frame
const piles = G.groupPiles([{ id: 9, x: 1, y: 1 }, { id: 3, x: 1, y: 1 }, { id: 4, x: 2, y: 1 }]);
assert.deepEqual(piles.get(G.pileKey(1, 1)).map((e) => e.id), [3, 9]);
const list = piles.get(G.pileKey(1, 1));
G.groupPiles([{ id: 3, x: 1, y: 1 }], piles);
assert.equal(piles.get(G.pileKey(1, 1)), list, 'the same list, emptied and refilled');

// ---- the renderer: one frame with a stand-in canvas ----
const anything = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'width' ? 10 : anything()),
  apply: () => anything(), construct: () => anything(), set: () => true,
});
globalThis.window ??= { devicePixelRatio: 1, addEventListener() {} };
globalThis.document ??= anything();
globalThis.requestAnimationFrame ??= () => 0;
globalThis.ResizeObserver ??= class { observe() {} };
const { Renderer } = await import('../js/renderer.js');
const { World } = await import('../js/world.js');
const { OP } = await import('../js/protocol.js');
const world = new World();
const n = world.mapSize;
world.apply({ op: OP.MAP, x: 100, y: 100, tiles: Array.from({ length: n * n }, () => 0) });
const texts = [];
const ctx = new Proxy({}, {
  get: (t, k) => (k === 'fillText' ? (s) => texts.push(s) : k === 'measureText' ? (s) => ({ width: s.length * 6 }) : k in t ? t[k] : anything()),
  set: (t, k, v) => { t[k] = v; return true; },
});
const box = { getBoundingClientRect: () => ({ width: 704, height: 704 }) };
const canvas = { getContext: () => ctx, width: 0, height: 0, style: {}, addEventListener() {} };
const r = new Renderer(canvas, world, box);
const sheet = () => ({ count: 9, size: 32, cols: 9, img: {}, draw() {} });
r.setSheets({ map: sheet(), players: sheet(), sprites: sheet() });
r.gear = {}; // the Painted style
const itemDraws = [];
r.items = { index: new Map([['dagger', 0], ['apple', 1], ['gold', 2]]), sheet: { ...sheet(), draw: (g, f) => itemDraws.push(f) } };
r.showNames = true;
const r0 = Math.floor(n / 2);
// you, at the middle; 7 items on a square three away; one dagger next to you
world.apply({ op: OP.ENTITY, id: 1, name: 'flan', type: 0, x: 100, y: 100, image: 0, step: 0 });
world.self = () => world.entities.get(1);
const names7 = ['dagger', 'apple', 'gold', 'dagger', 'apple', 'gold', 'dagger'];
names7.forEach((name, i) => world.apply({ op: OP.ENTITY, id: 10 + i, name, type: 1, x: 103, y: 100, image: 0, step: -1 }));
const frame = () => { texts.length = 0; itemDraws.length = 0; r.draw(); };
frame();
assert.equal(itemDraws.length, 4, `a 7-item square draws at most 4 (${itemDraws.length})`);
assert.ok(!texts.some((t) => /dagger|apple|gold/.test(t)), `no item names by default (${texts})`);
// hovered: "a, b +5"
r.pointerSquare = { x: 103, y: 100 };
frame();
assert.ok(texts.includes('dagger, apple +5'), `hovered: the pile's names (${texts})`);
r.pointerSquare = null;
// next to you
world.apply({ op: OP.ENTITY, id: 30, name: 'gold', type: 1, x: 101, y: 101, image: 0, step: -1 });
frame();
assert.ok(texts.includes('gold'), `next to you: its name (${texts})`);
assert.ok(!texts.some((t) => t.startsWith('dagger, apple')), 'the far pile still hidden');
// Alt held: every pile
r.itemNamesHeld = true;
frame();
assert.ok(texts.includes('gold') && texts.includes('dagger, apple +5'), `Alt: all (${texts})`);
console.log('ground items test passed');
