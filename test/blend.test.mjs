// Run with: node test/blend.test.mjs
import assert from 'node:assert/strict';
import { groundKind, edgeLine, edgeEnd, intrusion, drawBlends } from '../js/blend.js';

assert.equal(groundKind(36), 'grass');
assert.equal(groundKind(38), groundKind(27), 'two sands are one kind');
assert.equal(groundKind(64), null, 'trees stay square');
assert.equal(groundKind(0), null, 'water stays square');

// The same line from either side; zero at the ends; never past REACH.
for (let i = 0; i < 200; i++) {
  const x = 100 + i * 7, y = 300 + i * 3;
  const line = edgeLine(x, y, i % 2 === 0);
  assert.equal(line.length, 37);
  assert.ok(Math.abs(line[0]) < 1e-9 && Math.abs(line[36]) < 1e-9);
  assert.ok(line.every((d) => Math.abs(d) <= 0.42 + 1e-9));
  assert.deepEqual(edgeLine(x, y, i % 2 === 0), line, 'the same every time');
}
// Two squares side by side: each takes the part of the line on its side,
// so between them every point of the edge is covered exactly once.
let both = 0, either = 0;
for (let i = 0; i < 300; i++) {
  const x = 50 + i, y = 80 + (i % 17);
  const left = intrusion(x, y, 1, 0), right = intrusion(x + 1, y, -1, 0);
  if (left && right) both++;
  if (left || right) either++;
  const line = edgeLine(x + 1, y, true);
  if (right) right.slice(37).forEach(([u], k) => assert.ok(Math.abs(u - Math.max(0, line[36 - k])) < 1e-9));
  if (left) left.slice(37).forEach(([u], k) => assert.ok(Math.abs(1 - u - Math.max(0, -line[36 - k])) < 1e-9));
}
assert.equal(either, 300, 'every edge wanders somewhere');
assert.ok(both > 50, 'and often both ways');
// Along a straight boundary the line flows on across the corner.
for (let x = 10; x < 60; x++) {
  const on = { type: 'on' };
  const a = edgeLine(x, 7, false, on, on), b = edgeLine(x + 1, 7, false, on, on);
  assert.ok(Math.abs(a[36] - b[0]) < 1e-9, `continuous at ${x + 1}`);
}
// A boundary turning a corner: both edges there follow one circle, so the
// corner comes out round. Grass at (0,0); sand right of it and below it
// (and diagonally): grass's bottom-right corner is rounded off.
{
  const end = edgeEnd('grass', 'sand', 'sand', 'sand', 1, 1);
  assert.equal(end.type, 'round');
  assert.equal(end.toward, -1, 'into the grass square');
  assert.deepEqual(edgeEnd('sand', 'grass', 'grass', 'grass', 1, 1).toward, -1);
  assert.equal(edgeEnd('grass', 'sand', 'grass', 'sand', 1, 1).type, 'on', 'runs straight on');
  assert.equal(edgeEnd('grass', 'sand', null, null, 1, 1).type, 'stop');
  // The right edge of the grass square (vertical, at x=1), ending at its
  // bottom (end1), and its bottom edge (horizontal, at y=1), ending at its
  // right (end1): at the corner each is pulled the full radius into the grass.
  const right = edgeLine(1, 0, true, { type: 'stop' }, end);
  const bottom = edgeLine(0, 1, false, { type: 'stop' }, end);
  assert.ok(Math.abs(right[36] + end.r) < 1e-9 && Math.abs(bottom[36] + end.r) < 1e-9);
}
// A checkerboard corner: every edge there agrees which kind runs through.
for (let i = 0; i < 40; i++) {
  // Grass top-left and bottom-right, sand the other two, corner (i, 3).
  const v = edgeEnd('grass', 'sand', 'sand', 'grass', i, 3); // the vertical edge above the corner, seen from its end
  const h = edgeEnd('grass', 'sand', 'sand', 'grass', i, 3); // the horizontal edge left of it
  assert.deepEqual(v, h);
  // Whichever kind runs through, the rounding goes into the other kind's square.
  const through = v.toward === -1 ? 'sand' : 'grass';
  assert.ok(through === 'sand' || through === 'grass');
}
// Up and down too.
assert.ok(intrusion(5, 5, 0, 1) || intrusion(5, 6, 0, -1));

// Drawing: blends only between differing plain ground.
const calls = [];
const ctx = new Proxy({}, { get: (_, k) => (k === 'save' || k === 'restore' || k === 'clip' ? () => calls.push(k) : () => {}), set: () => true });
const tiles = { '0,0': 36, '1,0': 38, '0,1': 36, '1,1': 64 };
drawBlends(ctx, { x0: 0, y0: 0, n: 1, c: 64, tileAt: (x, y) => tiles[`${x},${y}`] ?? null, toPx: (x, y) => [x * 64, y * 64], draw: (t) => calls.push(`draw ${t}`) });
const draws = calls.filter((c) => c.startsWith('draw'));
assert.ok(draws.length >= 1 && draws.length <= 2, draws.join());
assert.ok(draws.every((d) => d === 'draw 38' || d === 'draw 36'), 'only grass and sand trade ground; the tree stays');
console.log('ok - blend');
