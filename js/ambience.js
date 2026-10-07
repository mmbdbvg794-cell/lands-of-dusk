// Area sounds: what the land around you sounds like, made on the fly with
// Web Audio (no files), under the music. A few beds that fade in and out
// (wind, waves, a cave's hum) and sounds now and then (birds by day,
// crickets and owls by night, gulls by the sea, drips underground, frogs
// by water at night), picked from the squares in view and the time of day.
// They go through the game's Sound, so its volume and mute apply.

// The kinds of square that matter (tile numbers, js/atmosphere.js and
// tools/world/tiles.json); snow comes from the renderer's snowy tiles.
const TREES = new Set([25, 26, 64, 103]);
const GRASS = new Set([0, 1, 36, 37]);
const SAND = new Set([38]);
const isWater = (t) => t === 2 || (t >= 65 && t <= 77);

// Counts of each kind among the squares in view -> how much of each sound
// (0-1). light: 1 by day, 0 at night; snow: Set of snowy tiles.
export function areaCounts(tiles, snow = new Set()) {
  const c = { total: 0, trees: 0, grass: 0, water: 0, sand: 0, snow: 0 };
  for (const t of tiles) {
    if (t == null) continue;
    c.total++;
    if (TREES.has(t)) c.trees++;
    else if (GRASS.has(t)) c.grass++;
    else if (isWater(t)) c.water++;
    else if (SAND.has(t)) c.sand++;
    if (snow.has(t)) c.snow++;
  }
  return c;
}

// town: in a town (js/music.js townAt), where sandy streets aren't desert.
export function areaMix(c, { light = 1, underground = false, town = false } = {}) {
  const share = (n) => (c.total ? n / c.total : 0);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  if (underground) return { wind: 0, waves: 0, cave: 1, birds: 0, crickets: 0, owls: 0, gulls: 0, drips: 1, frogs: 0 };
  const green = clamp((share(c.trees) + share(c.grass) * 0.6) * 1.6);
  const water = clamp(share(c.water) * 2.2);
  const snow = clamp(share(c.snow) * 2);
  const sand = clamp(share(c.sand) * (town ? 0.3 : 2));
  const night = 1 - light;
  return {
    wind: clamp((town ? 0.05 : 0.15) + snow * 0.8 + sand * 0.6 + water * 0.2),
    waves: water,
    cave: 0,
    birds: green * light * (1 - snow) * (town ? 0.5 : 1),
    crickets: green * night * (1 - snow),
    owls: clamp(share(c.trees) * 2.5) * night * (1 - snow),
    gulls: water * light * (water > 0.35 ? 1 : 0.4),
    drips: 0,
    frogs: water * night * green,
  };
}

// The beds' loudness at full mix, and how often each sound comes (per
// minute, at full mix).
const BED_GAIN = { wind: 0.05, waves: 0.07, cave: 0.05 };
const RATE = { birds: 14, crickets: 10, owls: 1.2, gulls: 4, drips: 12, frogs: 6 };

export class AreaAmbience {
  constructor(sound) {
    this.sound = sound;
    this.on = true;
    this.beds = null; // { wind, waves, cave: { gain, ... } }
    this.mix = null;
    this.timer = 0;
    this.lastTick = 0;
  }

  setOn(on) {
    this.on = on;
    if (!on) this.apply({ wind: 0, waves: 0, cave: 0 });
  }

  // Called every couple of seconds with the mix for where you are.
  update(mix) {
    this.mix = mix;
    const s = this.sound;
    if (!this.on || !s.ctx || !s.enabled || document.hidden) { this.apply({ wind: 0, waves: 0, cave: 0 }); return; }
    if (s.ctx.state === 'suspended') s.ctx.resume?.()?.catch?.(() => {});
    this.ensureBeds();
    this.apply(mix);
    // The sounds now and then, for the time since the last update.
    const now = performance.now();
    const secs = this.lastTick ? Math.min(5, (now - this.lastTick) / 1000) : 2;
    this.lastTick = now;
    for (const [k, perMin] of Object.entries(RATE)) {
      const chance = (mix[k] ?? 0) * perMin * secs / 60;
      let n = Math.floor(chance) + (Math.random() < chance % 1 ? 1 : 0);
      while (n-- > 0) this.play(k, Math.random() * secs);
    }
  }

  apply(mix) {
    if (!this.beds) return;
    const t = this.sound.ctx.currentTime;
    for (const k of Object.keys(BED_GAIN)) {
      const g = this.beds[k].gain.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime((mix[k] ?? 0) * BED_GAIN[k], t, 1.5);
    }
  }

  // Noise beds: wind (a band that drifts), waves (low noise that swells),
  // a cave's hum (very low).
  ensureBeds() {
    const s = this.sound;
    if (this.beds?.ctx === s.ctx) return;
    const ctx = s.ctx;
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { b = b * 0.98 + (Math.random() * 2 - 1) * 0.2; d[i] = b; } // soft (brownish) noise
    const bed = (type, freq, q, lfoHz, lfoDepth, lfoTarget) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = Math.random();
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const swell = ctx.createGain();
      swell.gain.value = 1;
      src.connect(f).connect(swell).connect(gain).connect(s.master);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoHz;
      const depth = ctx.createGain();
      depth.gain.value = lfoDepth;
      lfo.connect(depth).connect(lfoTarget === 'freq' ? f.frequency : swell.gain);
      src.start(0, Math.random() * 3);
      lfo.start();
      return { gain };
    };
    this.beds = {
      ctx,
      wind: bed('bandpass', 500, 0.7, 0.07, 260, 'freq'),
      waves: bed('lowpass', 420, 0.5, 0.12, 0.6, 'gain'),
      cave: bed('lowpass', 140, 0.8, 0.05, 0.3, 'gain'),
    };
  }

  // One sound, `delay` seconds from now.
  play(kind, delay = 0) {
    const s = this.sound;
    const t = s.ctx.currentTime + delay + 0.02;
    const r = Math.random;
    try {
      if (kind === 'birds') {
        // A short phrase of chirps, each a quick upward or downward sweep.
        const base = 2200 + r() * 1800;
        const n = 2 + Math.floor(r() * 4);
        for (let i = 0; i < n; i++) {
          const f = base * (0.85 + r() * 0.35);
          s.tone(t + i * (0.09 + r() * 0.08), { freq: f, slide: f * (r() < 0.5 ? 1.35 : 0.72), dur: 0.07 + r() * 0.06, gain: 0.025 });
        }
      } else if (kind === 'crickets') {
        const f = 4200 + r() * 600;
        for (let i = 0; i < 6; i++) s.tone(t + i * 0.055, { freq: f, dur: 0.03, gain: 0.012, type: 'square' });
      } else if (kind === 'owls') {
        s.tone(t, { freq: 390, slide: 360, dur: 0.35, gain: 0.03, attack: 0.06 });
        s.tone(t + 0.55, { freq: 380, slide: 330, dur: 0.6, gain: 0.03, attack: 0.08 });
      } else if (kind === 'gulls') {
        const f = 1300 + r() * 400;
        for (let i = 0; i < 2 + Math.floor(r() * 2); i++) s.tone(t + i * 0.32, { freq: f, slide: f * 0.62, dur: 0.26, gain: 0.02, type: 'sawtooth', attack: 0.02 });
      } else if (kind === 'drips') {
        const f = 900 + r() * 900;
        s.tone(t, { freq: f, slide: f * 0.45, dur: 0.12, gain: 0.03 });
        s.tone(t + 0.21, { freq: f * 0.9, slide: f * 0.4, dur: 0.1, gain: 0.01 }); // its echo
      } else if (kind === 'frogs') {
        const f = 180 + r() * 60;
        for (let i = 0; i < 2; i++) s.tone(t + i * 0.18, { freq: f, slide: f * 1.3, dur: 0.12, gain: 0.03, type: 'triangle' });
      }
    } catch {}
  }
}
