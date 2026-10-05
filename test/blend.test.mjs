// Run with: node test/blend.test.mjs
import assert from 'node:assert/strict';
import { groundKind, groundFlip } from '../js/blend.js';
import { pull } from '../js/terrain.js';

assert.equal(groundKind(36), 'grass');
assert.equal(groundKind(38), groundKind(27), 'two sands are one kind');
assert.equal(groundKind(64), null, 'trees are drawn on their ground, not blended as trees');
assert.equal(groundKind(0), null, 'water stays square');

// Mirroring: only plain ground, and the same every time.
assert.equal(groundFlip(3, 4, 0), 0);
assert.equal(groundFlip(3, 4, 36), groundFlip(3, 4, 36));

// A square pulls fully near its middle, not at all a square away, and
// falls off smoothly and evenly between.
assert.equal(pull(0, 0), 1);
assert.equal(pull(0.3, 0.2), 1);
assert.equal(pull(1.1, 0), 0);
assert.equal(pull(0, -1.1), 0);
let last = 1;
for (let d = 0; d <= 1.1; d += 0.05) { const p = pull(d, 0); assert.ok(p <= last + 1e-12, `falls off at ${d}`); last = p; }
assert.ok(Math.abs(pull(0.7, 0) - pull(0, 0.7)) < 1e-12 && Math.abs(pull(-0.7, 0) - pull(0.7, 0)) < 1e-12, 'the same every way');
// Halfway between two squares' middles, each pulls the same.
assert.ok(Math.abs(pull(0.5, 0.1) - pull(-0.5, 0.1)) < 1e-12);
console.log('ok - blend');
