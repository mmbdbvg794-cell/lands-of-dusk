// How creature and weapon effects animate (Painted style): Full, Low or Off, saved per
// browser (localStorage dusk.effects). Full on desktops, Low on phones and tablets (a touch
// screen and a small one) and when the system asks for reduced motion (no bobbing then).
//
// Effects step at their own capped rate (Full 20 a second, Low 10) on a clock of their own:
// js/renderer.js redraws the map for them only when that clock ticks, never every display
// frame, and the clock stops while the tab is hidden or the window isn't focused.
//   Full  20 fps, every particle, the glow pools and ground patches
//   Low   10 fps, half the particles, no glow pools or ground patches
//   Off   nothing: figures drawn plainly, no effect lights or particles
export const FX_LEVELS = ['full', 'low', 'off'];
export const FX_SETTINGS = {
  full: { on: true, fps: 20, share: 1, ground: true, bob: true },
  low: { on: true, fps: 10, share: 0.5, ground: false, bob: true },
  off: { on: false, fps: 0, share: 0, ground: false, bob: false },
};
const KEY = 'dusk.effects';

// The level a browser starts on: Low on a touch screen that's also small (a phone or tablet)
// or with reduced motion asked for; Full otherwise.
export function defaultFxLevel({ touch = false, small = false, reduced = false } = {}) {
  return reduced || (touch && small) ? 'low' : 'full';
}

// The settings for a level, reduced motion applied (treated as Low at most, never bobbing).
export function fxSettings(level, reduced = false) {
  const s = FX_SETTINGS[level] ?? FX_SETTINGS.full;
  if (!reduced) return s;
  const low = level === 'full' ? FX_SETTINGS.low : s;
  return { ...low, bob: false };
}

// An effect clock running at fps: now rounded down to its last tick, and the ms to the next.
export function fxTick(now, fps) {
  if (!(fps > 0)) return now;
  const ms = 1000 / fps;
  return Math.floor(now / ms) * ms;
}
export function fxNextIn(now, fps) {
  const ms = 1000 / fps;
  return ms - (now % ms);
}

const env = () => {
  const w = typeof window !== 'undefined' ? window : null;
  const mm = (q) => { try { return !!w?.matchMedia?.(q).matches; } catch { return false; } };
  const touch = mm('(pointer: coarse)') || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !mm('(pointer: fine)'));
  let small = false;
  try { small = typeof screen !== 'undefined' && Math.min(screen.width, screen.height) <= 900; } catch {}
  return { touch, small, reduced: mm('(prefers-reduced-motion: reduce)') };
};
const load = () => { try { const v = localStorage.getItem(KEY); return FX_LEVELS.includes(v) ? v : null; } catch { return null; } };

// The one shared state: js/renderer.js, js/lighting.js and the settings menu read it.
export const fxq = {
  level: 'full', // chosen (or the default)
  chosen: false, // whether it was chosen here rather than defaulted
  reduced: false,
  hidden: false, // tab hidden or window not focused: effects stand still
  frozen: 0, // the effect clock while they do
  listeners: new Set(),
  get settings() { return fxSettings(this.level, this.reduced); },
  get paused() { return this.hidden; },
  // The effect clock: now on its last tick, or where it stopped while paused.
  time(now) { return this.hidden ? this.frozen : fxTick(now, this.settings.fps); },
  set(level) {
    if (!FX_LEVELS.includes(level)) return;
    this.level = level;
    this.chosen = true;
    try { localStorage.setItem(KEY, level); } catch {}
    this.changed();
  },
  changed() { for (const f of this.listeners) { try { f(); } catch {} } },
  onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); },
  // (for tests and the start-up below)
  init({ saved = load(), ...e } = env()) {
    this.reduced = !!e.reduced;
    this.chosen = !!saved;
    this.level = saved ?? defaultFxLevel(e);
  },
};
fxq.init();

if (typeof document !== 'undefined' && typeof window !== 'undefined' && document.addEventListener) {
  const update = () => {
    const was = fxq.hidden;
    fxq.hidden = !!document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus());
    if (fxq.hidden && !was) fxq.frozen = fxTick(performance.now(), fxq.settings.fps);
    if (was !== fxq.hidden) fxq.changed();
  };
  update();
  document.addEventListener('visibilitychange', update);
  window.addEventListener('blur', update);
  window.addEventListener('focus', update);
  try {
    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', (ev) => { fxq.reduced = ev.matches; fxq.changed(); });
  } catch {}
}
