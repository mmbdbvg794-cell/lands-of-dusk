import assert from 'node:assert/strict';
import { KeyWalker } from '../js/keywalk.js';

// Fake timers on a fake clock.
function harness(stepResult = () => true) {
  let now = 0;
  let timers = [];
  let nextId = 1;
  const steps = [];
  const kw = new KeyWalker((dir) => { steps.push([now, dir]); return stepResult(dir); }, {
    repeatMs: 260,
    setTimer: (fn, ms) => { const id = nextId++; timers.push({ id, at: now + ms, fn }); return id; },
    clearTimer: (id) => { timers = timers.filter((t) => t.id !== id); },
  });
  const advance = (ms) => {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > end) break;
      timers.shift();
      now = t.at;
      t.fn();
    }
    now = end;
  };
  return { kw, steps, advance, pending: () => timers.length };
}

// A first press steps at once, then every 260 ms while held.
{
  const { kw, steps, advance } = harness();
  kw.press('e');
  advance(800);
  assert.deepEqual(steps, [[0, 'e'], [260, 'e'], [520, 'e'], [780, 'e']]);
}

// The keyboard's own repeats change nothing.
{
  const { kw, steps, advance } = harness();
  kw.press('e');
  advance(30); kw.press('e', true); advance(30); kw.press('e', true);
  advance(200);
  assert.deepEqual(steps, [[0, 'e'], [260, 'e']]);
}

// Turning while walking: no extra step, no pause; the next beat goes the new way.
{
  const { kw, steps, advance } = harness();
  kw.press('e');
  advance(400);        // steps at 0, 260
  kw.press('n');       // second key down at 400 (east still held)
  advance(400);        // 520 n, 780 n
  assert.deepEqual(steps, [[0, 'e'], [260, 'e'], [520, 'n'], [780, 'n']]);
  kw.release('n');     // back to east, still on the beat
  advance(300);
  assert.deepEqual(steps.at(-1), [1040, 'e']);
}

// Letting go stops; pressing again from standing steps at once.
{
  const { kw, steps, advance, pending } = harness();
  kw.press('w');
  advance(100);
  kw.release('w');
  assert.equal(pending(), 0);
  advance(1000);
  assert.equal(steps.length, 1);
  kw.press('s');
  assert.deepEqual(steps.at(-1), [1100, 's']);
}

// step() returning false (can't act, a dialog waiting) stops the walk.
{
  let ok = true;
  const { kw, steps, advance, pending } = harness(() => ok);
  kw.press('e');
  ok = false;
  advance(300);
  assert.equal(steps.length, 2);
  assert.equal(pending(), 0);
}


// The default timers work when called as methods, as a browser's setTimeout
// doesn't ("Illegal invocation"): stand one in that checks `this`.
{
  const real = globalThis.setTimeout;
  globalThis.setTimeout = function (fn, ms) {
    if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation');
    return real(fn, ms);
  };
  const steps = [];
  const kw = new KeyWalker((dir) => { steps.push(dir); return true; }, { repeatMs: 1 });
  try { kw.press('e'); } finally { globalThis.setTimeout = real; }
  assert.deepEqual(steps, ['e']);
  assert.notEqual(kw.timer, null);
  kw.stop();
}

console.log('keywalk tests passed');
