import assert from 'node:assert/strict';
import { layoutLabels, MAX_LINES } from '../js/labels.js';

const measure = (t) => t.length * 7;
const H = 12;
const box = (l) => ({ l: l.x, r: l.x + measure(l.text), t: l.y - H * 0.8, b: l.y + H * 0.25 });
const overlap = (a, b) => { const p = box(a), q = box(b); return p.l < q.r && p.r > q.l && p.t < q.b && p.b > q.t; };
const label = (text, x, y, self = false) => ({ text, x, y, cx: x + measure(text) / 2, self });

// Two different names in the same spot end up apart, within MAX_LINES lines.
const two = layoutLabels([label('frost wolf', 100, 100), label('dinosaur', 110, 100)], measure, H);
assert.equal(two.length, 2);
assert.ok(!overlap(two[0], two[1]), 'no longer overlapping');
for (const l of two) assert.ok(Math.abs(l.y - 100) <= MAX_LINES * H, 'stays near its figure');

// Three black dogs side by side: one label, "black dog x3", centred over them.
const dogs = [label('black dog', 100, 200), label('black dog', 130, 200), label('black dog', 160, 200)];
const one = layoutLabels(dogs, measure, H);
assert.equal(one.length, 1);
assert.equal(one[0].text, 'black dog x3');
const mid = dogs.reduce((s, d) => s + d.cx, 0) / 3;
assert.ok(Math.abs(one[0].x + measure(one[0].text) / 2 - mid) < 1, 'centred over the group');

// Same name far apart: kept separate.
assert.equal(layoutLabels([label('wolf', 0, 0), label('wolf', 500, 0)], measure, H).length, 2);

// The player's own name keeps its spot and is drawn last (on top), and is never merged.
const mine = layoutLabels([label('wolf', 100, 300), label('flan', 100, 300, true), label('flan', 105, 300)], measure, H);
assert.equal(mine.at(-1).text, 'flan');
assert.equal(mine.at(-1).y, 300, 'self not moved');
assert.equal(mine.length, 3, 'self not merged with a same-named neighbour');
assert.deepEqual(layoutLabels([], measure, H), []);
console.log('label tests passed');
