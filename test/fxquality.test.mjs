// Effects quality (js/fxquality.js): Full on desktops, Low on small touch screens and with
// reduced motion (no bobbing); the effect clock steps at 20 or 10 a second; the choice is saved
// and survives storage that throws; effects stop while the tab is hidden. The renderer redraws
// the map for effects only on that clock, and not at all for ones that stand still on it.
import assert from 'node:assert/strict';

let stored = {};
globalThis.localStorage = { getItem: (k) => stored[k] ?? null, setItem: (k, v) => { stored[k] = v; } };
const { fxq, defaultFxLevel, fxSettings, fxTick, fxNextIn, FX_SETTINGS } = await import('../js/fxquality.js');
const { FX } = await import('../js/creatures.js');

assert.equal(defaultFxLevel({}), 'full', 'a desktop');
assert.equal(defaultFxLevel({ touch: true, small: false }), 'full', 'a big touch screen');
assert.equal(defaultFxLevel({ touch: true, small: true }), 'low', 'a phone or tablet');
assert.equal(defaultFxLevel({ reduced: true }), 'low', 'reduced motion');
assert.deepEqual([FX_SETTINGS.full.fps, FX_SETTINGS.low.fps, FX_SETTINGS.off.fps], [20, 10, 0]);
assert.equal(FX_SETTINGS.low.share, 0.5);
assert.equal(FX_SETTINGS.low.ground, false);
assert.equal(FX_SETTINGS.off.on, false);
const r = fxSettings('full', true);
assert.equal(r.fps, 10, 'reduced motion is Low');
assert.equal(r.bob, false, '...without bobbing');
assert.equal(fxSettings('off', true).on, false, 'Off stays off');

// the clock
assert.equal(fxTick(1234, 20), 1200);
assert.equal(fxTick(1299, 10), 1200);
assert.equal(fxNextIn(1230, 20), 20);

// saved, read back, a saved choice beats the default; storage that throws is fine
fxq.init({ saved: null, touch: true, small: true });
assert.equal(fxq.level, 'low');
fxq.set('off');
assert.equal(stored['dusk.effects'], 'off');
fxq.init({ saved: stored['dusk.effects'], touch: false });
assert.equal(fxq.level, 'off');
globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
assert.doesNotThrow(() => fxq.set('full'));
assert.equal(fxq.level, 'full');
fxq.set('nonsense');
assert.equal(fxq.level, 'full');

// paused: the clock stands still
fxq.hidden = true; fxq.frozen = 500;
assert.equal(fxq.time(99999), 500);
assert.ok(fxq.paused);
fxq.hidden = false;
assert.equal(fxq.time(1234), 1200);

// which creature effects keep the map redrawing (on the clock): the black dog's (shadow) and
// blight's tint and ground patch stand still, so they don't
const { fxMovesOnCanvas } = await import('../js/renderer.js');
{
  const full = FX_SETTINGS.full;
  for (const f of ['burning', 'frost', 'ghostly', 'wet']) assert.ok(fxMovesOnCanvas(FX[f], full), f);
  for (const f of ['shadow', 'blight', 'sparkle']) assert.ok(!fxMovesOnCanvas(FX[f], full), f);
  // Low (no glow pools) with reduced motion (no bob): a ghost still pulses its aura
  assert.ok(fxMovesOnCanvas(FX.ghostly, fxSettings('low', true)));
}
console.log('fx quality test passed');
