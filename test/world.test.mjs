// Run with: node test/world.test.mjs
import assert from 'node:assert/strict';
import { OP } from '../js/protocol.js';
import { World } from '../js/world.js';

const grid = (n, f) => Array.from({ length: n }, (_, x) => Array.from({ length: n }, (_, y) => f(x, y)));
const ent = (id, name, x, y, extra = {}) => ({
  op: OP.ENTITY, id, name, type: 1, x, y, image: 3, step: -1, hideName: false, ...extra,
});

const w = new World();
w.apply({ op: OP.MAP_SIZE, size: 5 });
assert.equal(w.viewRange, 2);
w.apply({ op: OP.MAP, x: 100, y: 50, tiles: grid(5, (x, y) => x * 10 + y) });
assert.deepEqual(w.toView(100, 50), [2, 2], 'player is at the centre');
assert.deepEqual(w.toView(98, 48), [0, 0]);

// Spawning, in and out of view.
w.apply(ent(1, 'rat', 101, 50));
w.apply(ent(2, 'rat', 99, 51));
w.apply(ent(3, 'flan', 100, 50, { type: 0, step: 2, hp: 5, maxhp: 9 }));
w.apply(ent(4, 'rat', 103, 50));
assert.deepEqual([...w.entities.keys()], [1, 2, 3]);
assert.deepEqual(w.takeRement(), [4], 'out-of-view spawn is reported');
assert.deepEqual(w.takeRement(), [], 'and only once');

// Resending an ID replaces it rather than duplicating it.
w.apply(ent(1, 'rat', 102, 50));
assert.equal(w.entities.size, 3);
assert.equal(w.entities.get(1).x, 102);

// Name numbering: leftmost column first.
let names = w.displayNames();
assert.equal(names.get(2), 'rat');
assert.equal(names.get(1), '1.rat');
assert.equal(names.get(3), 'flan');

// Movement: players turn to face the way they moved; walking out of view
// drops the entity and reports it.
w.apply({ op: OP.MOVE_WEST, id: 3 });
assert.deepEqual([w.entities.get(3).x, w.entities.get(3).step], [99, 4]);
w.apply({ op: OP.MOVE_NORTH, id: 2 });
assert.equal(w.entities.get(2).step, -1, 'sprites have no step');
w.apply({ op: OP.MOVE_EAST, id: 1 });
assert.equal(w.entities.has(1), false);
assert.deepEqual(w.takeRement(), [1]);
assert.equal(w.apply({ op: OP.MOVE_EAST, id: 999 }), false, 'unknown IDs are ignored');

// Flags and images.
w.apply({ op: OP.SET_FLAG, id: 2, flag: 2 });
assert.equal(w.entities.get(2).flag, 2);
w.apply({ op: OP.CLEAR_FLAGS });
assert.equal(w.entities.get(2).flag, 0);
w.apply({ op: OP.ENTITY_IMAGE, id: 2, image: 9 });
assert.equal(w.entities.get(2).image, 9);

// Recentring prunes what's now out of view (the server sends 16 for these,
// so no rement).
w.apply({ op: OP.MAP, x: 104, y: 50, tiles: grid(5, () => 0) });
assert.deepEqual([...w.entities.keys()], [], 'both left behind');
assert.deepEqual(w.takeRement(), []);

w.apply(ent(5, 'door', 105, 51));
assert.equal(w.apply({ op: OP.REMOVE_ENTITY, id: 5 }), true);
assert.equal(w.entities.size, 0);

// ---- animation ------------------------------------------------------------

const a = new World();
a.apply({ op: OP.MAP_SIZE, size: 5 }, 0);
a.apply({ op: OP.MAP, x: 10, y: 10, tiles: grid(5, (x, y) => x * 10 + y) }, 0);
assert.equal(a.cam, null, 'first map jumps');
a.apply(ent(1, 'flan', 10, 10, { type: 0, step: 2 }), 0);
a.apply(ent(2, 'rat', 12, 10), 0);

// A step: walking frame for the first half, then standing; the camera
// slides along with it.
a.apply({ op: OP.MOVE_NORTH, id: 1 }, 1000);
a.apply({ op: OP.MAP, x: 10, y: 9, tiles: grid(5, () => 7) }, 1000);
const half = 1000 + a.stepMs / 2;
assert.deepEqual(a.visualPos(a.entities.get(1), half), { x: 10, y: 9.5 });
assert.deepEqual(a.camera(half), { x: 10, y: 9.5 });
assert.equal(a.frameStep(a.entities.get(1), 1000), 1, 'walking north');
assert.equal(a.frameStep(a.entities.get(1), 1000 + a.stepMs), 0, 'standing north');
assert.equal(a.frameStep(a.entities.get(2), 1000), -1);
assert.equal(a.animating(half), true);
assert.equal(a.animating(1000 + a.stepMs), false);

// Tiles: the row that just scrolled out comes from the old view mid-slide.
assert.equal(a.tileAt(10, 7, half), 7, 'new view');
assert.equal(a.tileAt(10, 12, half), 24, 'old view, still sliding off');
assert.equal(a.tileAt(10, 12, 1000 + a.stepMs), null, 'gone once the slide ends');

// A step that lands mid-slide carries on from where it's drawn.
a.apply({ op: OP.MOVE_WEST, id: 2 }, 2000);
a.apply({ op: OP.MOVE_WEST, id: 2 }, 2000 + a.stepMs / 2);
assert.deepEqual(a.entities.get(2).anim, { fx: 11.5, fy: 10, start: 2000 + a.stepMs / 2, ms: a.stepMs / 2 * 1.1 });
// Steps a ferry's pace apart (125 ms) settle into slides that long (a
// little over), so the ride glides; a walk's pace keeps a walk's slide.
{
  let t = 5000;
  for (let i = 0; i < 12; i++, t += 125) a.apply({ op: i % 2 ? OP.MOVE_EAST : OP.MOVE_WEST, id: 2 }, t);
  const ms = a.entities.get(2).anim.ms;
  assert.ok(ms > 125 && ms < 150, `ferry slide ${ms}`);
  t += 1000;
  a.apply({ op: OP.MOVE_EAST, id: 2 }, t);
  a.apply({ op: OP.MOVE_WEST, id: 2 }, t + 250);
  assert.equal(a.entities.get(2).anim.ms, a.stepMs, 'a walk slides as before');
}

// Walking out of view: reported, but drawn until it has slid off.
a.apply({ op: OP.MOVE_SOUTH, id: 2 }, 3000);
a.apply({ op: OP.MOVE_SOUTH, id: 2 }, 3000);
a.apply({ op: OP.MOVE_SOUTH, id: 2 }, 3000);
assert.equal(a.entities.has(2), false);
assert.deepEqual(a.takeRement(), [2]);
assert.deepEqual(a.drawList(3001).map((e) => e.id), [1, 2]);
assert.deepEqual(a.drawList(3000 + a.stepMs).map((e) => e.id), [1]);

// A teleport jumps.
a.apply({ op: OP.MAP, x: 50, y: 50, tiles: grid(5, () => 0) }, 4000);
assert.equal(a.cam, null);

// With reduced motion nothing slides.
const still = new World();
still.stepMs = 0;
still.apply({ op: OP.MAP, x: 5, y: 5, tiles: grid(11, () => 0) }, 0);
still.apply(ent(1, 'rat', 5, 5), 0);
still.apply({ op: OP.MOVE_EAST, id: 1 }, 0);
assert.deepEqual(still.visualPos(still.entities.get(1), 0), { x: 6, y: 5 });
assert.equal(still.animating(0), false);

// ---- damage numbers ----------------------------------------------------------

const b = new World();
b.apply({ op: OP.MAP, x: 0, y: 0, tiles: grid(11, () => 0) }, 0);
b.apply(ent(1, 'flan', 0, 0, { type: 0, step: 2 }), 0);
b.apply(ent(2, '<wounded>rat', 1, 0, { type: 4 }), 0);
b.apply(ent(3, 'rat', 4, 4, { type: 4 }), 0);
b.apply({ op: OP.SET_FLAG, id: 2, flag: 2 }, 0);
b.apply({ op: OP.TEXT, text: '\tflan did 5 to rat,flan did 0 to rat.' }, 10);
b.apply({ op: OP.COLOR_TEXT, r: 0, g: 0, b: 0, text: "\tflan dodged rat's attack." }, 10);
b.apply({ op: OP.TEXT, text: 'flan did 3 to rat.' }, 10); // no tab: someone chatting
b.apply({ op: OP.TEXT, text: '\tghost did 3 to nobody.' }, 10);
assert.deepEqual(
  b.hits.map(({ id, text, kind }) => [id, text, kind]),
  [[2, '5', 'hit'], [2, '0', 'hit'], [1, 'dodge', 'dodge']],
  'the rat in the fight is hit, not the other one',
);
b.drawList(10 + 999);
assert.equal(b.hits.length, 3);
b.drawList(10 + 1000);
assert.equal(b.hits.length, 0, 'numbers expire');

console.log('ok - world state');

// Effects on a square, and spotting a repeat of one already drawn.
{
  const w2 = new World();
  w2.apply({ op: OP.MAP_SIZE, size: 5 });
  w2.apply({ op: OP.MAP, x: 100, y: 50, tiles: grid(5, () => 0) });
  w2.apply(ent(7, 'flan', 100, 50, { type: 0, step: 2, hp: 5, maxhp: 9 }));
  w2.addEffect('self', 'heal', 1000);
  assert.ok(w2.recentEffect('heal', 100, 50, 2000, 1500), 'our own effect counts, where we stand');
  assert.ok(!w2.recentEffect('fire', 100, 50, 2000, 1500), 'a different kind does not');
  assert.ok(!w2.recentEffect('heal', 100, 50, 2000, 4000), 'nor an old one');
  w2.addEffect({ x: 101, y: 51 }, 'fire', 1000);
  assert.ok(w2.recentEffect('fire', 101, 51, 2000, 1200), 'effects on a square');
  assert.ok(!w2.recentEffect('fire', 100, 51, 2000, 1200));
  console.log('ok - effect repeats');
}
