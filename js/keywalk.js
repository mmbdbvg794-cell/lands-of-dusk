// Walking with held keys at the game's own pace. The keyboard's auto-repeat
// waits about half a second after every new key before repeating, so each
// change of direction stalled and the figure dropped to its standing frame.
// Instead: the first press steps at once, then a timer keeps stepping every
// `repeatMs` while any movement key is held. Pressing another direction while
// walking just turns: the next step goes the new way, on the same beat.
// No DOM; tested in node (test/keywalk.test.mjs).

export const KEY_REPEAT_MS = 260; // as the on-screen arrows (DPAD_REPEAT_MS)

export class KeyWalker {
  // step(dir): take one step ('n', 's', 'w', 'e'); returns false to stop.
  // The timers are wrapped: a browser's setTimeout called as this.setTimer()
  // throws "Illegal invocation" (it must be called on window), so only the
  // first step was ever taken.
  constructor(step, { repeatMs = KEY_REPEAT_MS, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) } = {}) {
    this.step = step;
    this.repeatMs = repeatMs;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.held = []; // directions held, the most recent last
    this.timer = null;
  }

  // A movement key went down. `repeat`: the keyboard's own repeat (ignored).
  press(dir, repeat = false) {
    if (repeat) return;
    this.held = this.held.filter((d) => d !== dir);
    this.held.push(dir);
    if (this.timer === null) this.tick(); // standing still: step now
    // Already walking: the next tick takes the new direction.
  }

  // A movement key came up: walk on in another held direction, or stop.
  release(dir) {
    this.held = this.held.filter((d) => d !== dir);
    if (!this.held.length) this.stop();
  }

  // Everything up (the window lost focus, a dialog opened...).
  stop() {
    this.held = [];
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }

  tick() {
    this.timer = null;
    const dir = this.held[this.held.length - 1];
    if (!dir) return;
    if (this.step(dir) === false) { this.stop(); return; }
    this.timer = this.setTimer(() => this.tick(), this.repeatMs);
  }
}
