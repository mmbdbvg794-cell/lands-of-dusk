// Item icons (js/itemicons.js): a name in icons.json resolves to art/icons/<file>, its
// underscored twin too; a name not in it keeps the old painted picture. On the ground (Painted)
// an item with an icon is drawn from it; the Pixel style's ground sprites don't change.
import assert from 'node:assert/strict';
const I = await import('../js/itemicons.js');

const icons = I.iconMap({ 'healing potion': 'healing_potion.png', 'silver belt': 'silver_belt.png', 'Iron Sword': 'iron_sword.png' });
const art = { index: new Map([['healing potion', 3], ['apple', 7], ['silver_belt', 9]]) };
assert.deepEqual(I.itemPicture('healing potion', icons, art), { icon: 'art/icons/healing_potion.png' }, 'in icons.json: the icon, not the old frame');
assert.deepEqual(I.itemPicture('Healing Potion', icons, art), { icon: 'art/icons/healing_potion.png' }, 'any case');
assert.deepEqual(I.itemPicture('silver_belt', icons, art), { icon: 'art/icons/silver_belt.png' }, 'underscore twin');
assert.deepEqual(I.itemPicture('iron sword', icons, art), { icon: 'art/icons/iron_sword.png' }, 'a capitalised key');
const spaced = I.iconMap({ iron_bar: 'iron_bar.png' });
assert.equal(I.iconFile(spaced, 'iron bar'), 'iron_bar.png', 'the spaced name finds an underscored key');
assert.deepEqual(I.itemPicture('apple', icons, art), { frame: 7 }, 'not in icons.json: the old picture');
assert.equal(I.itemPicture('nothing at all', icons, art), null);
assert.deepEqual(I.itemPicture('apple', null, art), { frame: 7 }, 'no icons.json: as before');

// loading: undefined while it loads, then the sheet; one fetch per file; a failure gives null
const loads = [];
let loaded = 0;
const ii = new I.ItemIcons(icons, { load: async (url, size) => { loads.push([url, size]); return url.includes('silver') ? null : { url }; }, onLoad: () => loaded++ });
assert.equal(ii.sheet('apple'), undefined, 'no icon');
assert.equal(ii.file('apple'), null);
assert.equal(ii.sheet('healing potion'), undefined, 'loading');
assert.equal(ii.sheet('healing potion'), undefined);
ii.sheet('silver_belt');
await new Promise((r) => setTimeout(r, 0));
assert.deepEqual(loads, [['art/icons/healing_potion.png', 128], ['art/icons/silver_belt.png', 128]], 'each once');
assert.equal(loaded, 2);
assert.deepEqual(ii.sheet('healing potion'), { url: 'art/icons/healing_potion.png' });
assert.equal(ii.sheet('silver belt'), null, 'failed: null (the old picture is used)');

// ---- the renderer, with a stand-in canvas ----
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
const ctx = new Proxy({}, {
  get: (t, k) => (k === 'measureText' ? (s) => ({ width: s.length * 6 }) : k in t ? t[k] : anything()),
  set: (t, k, v) => { t[k] = v; return true; },
});
const canvas = { getContext: () => ctx, width: 0, height: 0, style: {}, addEventListener() {} };
const r = new Renderer(canvas, world, { getBoundingClientRect: () => ({ width: 704, height: 704 }) });
const draws = [];
const sheet = (name, count = 9, size = 32) => ({ count, size, cols: count, img: {}, draw: (g, f) => { draws.push(`${name}:${f}`); } });
r.setSheets({ map: sheet('map'), players: sheet('players'), sprites: sheet('sprites', 99) });
world.apply({ op: OP.ENTITY, id: 1, name: 'flan', type: 0, x: 100, y: 100, image: 0, step: 0 });
world.self = () => world.entities.get(1);
world.apply({ op: OP.ENTITY, id: 10, name: 'healing potion', type: 1, x: 102, y: 100, image: 41, step: -1 });
world.apply({ op: OP.ENTITY, id: 11, name: 'apple', type: 1, x: 102, y: 102, image: 42, step: -1 });
const itemDraws = () => draws.filter((d) => /^(items|icon|sprites):/.test(d));
const frame = () => { draws.length = 0; r.draw(); return itemDraws(); };

// Pixel style: the server's sprites by image number, icons or not
r.itemIcons = new I.ItemIcons(icons, { load: async () => sheet('icon', 1, 128) });
const pixel = frame();
assert.ok(pixel.includes('sprites:41') && pixel.includes('sprites:42'), `Pixel: the old sprites (${pixel})`);
assert.ok(!pixel.some((d) => d.startsWith('icon')), 'Pixel: no icons');
assert.equal(r.itemIcons.sheets.size, 0, 'Pixel: no icon even fetched');

// Painted: the potion from its icon once it's in, the apple from the old sheet
r.gear = {};
r.items = { index: art.index, sheet: sheet('items') };
const first = frame();
assert.ok(first.includes('items:7'), `apple: the old picture (${first})`);
assert.ok(!first.includes('items:3'), 'the potion never from the old picture, even while its icon loads');
await new Promise((res) => setTimeout(res, 0));
const painted = frame();
assert.ok(painted.includes('icon:0') && painted.includes('items:7') && !painted.includes('items:3'), `Painted: icon and old picture (${painted})`);
console.log('item icons test passed');
