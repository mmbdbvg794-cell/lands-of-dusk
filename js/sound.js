// Game sounds, made on the fly with Web Audio, so there are no files to
// load: hits and dodges in combat, one sound per kind of spell (matching
// js/effects.js), and the server's own battle sounds (opcode 15).
//
// Browsers only allow audio after the player has pressed something, so
// the AudioContext is created on the first press or key.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.6;
    this.ambienceVolume = 0.5; // rain, thunder and area sounds (js/ambience.js)
    this.ambience = null; // their own path to the speakers
    this.lastHit = 0;
    const unlock = () => {
      this.unlock();
      removeEventListener('pointerdown', unlock, true);
      removeEventListener('keydown', unlock, true);
    };
    addEventListener('pointerdown', unlock, true);
    addEventListener('keydown', unlock, true);
  }

  unlock() {
    if (this.ctx) return;
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.ambience = this.ctx.createGain();
      this.ambience.gain.value = this.ambienceVolume;
      this.ambience.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  // The ambience's own volume, apart from the sound effects'.
  setAmbienceVolume(v) {
    this.ambienceVolume = Math.max(0, Math.min(1, v));
    if (this.ambience) this.ambience.gain.value = this.ambienceVolume;
  }

  // Plays a named sound: 'hit', 'miss', 'dodge', or a spell kind ('heal',
  // 'holy', 'fire', 'earth', 'dark', 'arcane').
  play(name) {
    if (!this.enabled || !this.ctx || this.volume === 0) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime + 0.01;
    const fn = SOUNDS[name];
    if (!fn) return;
    if (name === 'hit' || name === 'miss') this.lastHit = performance.now();
    try {
      fn(this, t);
    } catch {}
  }

  // Opcode 15. The server only has battle sounds on this, and the hit or
  // dodge in the same round's text usually plays already, so this is
  // skipped if one just did.
  server(index) {
    if (performance.now() - this.lastHit < 200) return;
    this.play(index === 0 ? 'hit' : 'arcane');
  }

  // ---- building blocks ----

  // out: where it goes (the sound effects' master unless said).
  tone(t, { freq, type = 'sine', dur = 0.3, gain = 0.3, attack = 0.005, slide = null, detune = 0, out = null }) {
    const { ctx } = this;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(t, { dur = 0.2, gain = 0.3, filter = 'bandpass', freq = 1200, to = null, q = 1, out = null }) {
    const { ctx } = this;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out ?? this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}

const SOUNDS = {
  // A thump with a bit of crunch.
  hit: (s, t) => {
    s.tone(t, { freq: 160, slide: 60, type: 'triangle', dur: 0.14, gain: 0.5 });
    s.noise(t, { dur: 0.08, gain: 0.35, freq: 2200, q: 0.8 });
  },
  // A hit for 0: a dull tap.
  miss: (s, t) => s.tone(t, { freq: 220, slide: 160, type: 'triangle', dur: 0.08, gain: 0.25 }),
  // Death: a low bell falling away.
  death: (s, t) => {
    s.tone(t, { freq: 196, slide: 98, type: 'triangle', dur: 1.6, gain: 0.35, attack: 0.02 });
    s.tone(t, { freq: 196 * 2.76, slide: 98 * 2.76, dur: 1.0, gain: 0.08 });
    s.noise(t, { dur: 1.2, gain: 0.08, filter: 'lowpass', freq: 500, to: 120 });
  },
  // A soft footstep, alternating feet.
  step: (s, t) => {
    s.foot = !s.foot;
    s.noise(t, { dur: 0.06, gain: 0.12, filter: 'lowpass', freq: s.foot ? 700 : 560, q: 0.7 });
    s.tone(t, { freq: s.foot ? 95 : 82, slide: 55, type: 'sine', dur: 0.07, gain: 0.12 });
  },
  // A quick whoosh.
  dodge: (s, t) => s.noise(t, { dur: 0.22, gain: 0.25, freq: 600, to: 3000, q: 1.5 }),
  // Rising chimes.
  heal: (s, t) => {
    [523, 659, 784, 1047].forEach((f, i) => s.tone(t + i * 0.09, { freq: f, dur: 0.5, gain: 0.18 }));
    s.tone(t + 0.36, { freq: 1568, dur: 0.6, gain: 0.06 });
  },
  // A bell: a fundamental with an inharmonic partial.
  holy: (s, t) => {
    s.tone(t, { freq: 880, dur: 1.0, gain: 0.2 });
    s.tone(t, { freq: 880 * 2.76, dur: 0.6, gain: 0.07 });
    s.tone(t + 0.12, { freq: 1320, dur: 0.8, gain: 0.1 });
  },
  // A rushing roar with crackles.
  fire: (s, t) => {
    s.noise(t, { dur: 0.6, gain: 0.35, filter: 'lowpass', freq: 400, to: 2500, q: 0.7 });
    for (let i = 0; i < 6; i++) s.noise(t + 0.05 + Math.random() * 0.45, { dur: 0.03, gain: 0.25, freq: 3000 + Math.random() * 2000, q: 2 });
  },
  // A low rumble.
  earth: (s, t) => {
    s.tone(t, { freq: 70, slide: 40, type: 'sawtooth', dur: 0.5, gain: 0.25 });
    s.noise(t, { dur: 0.5, gain: 0.3, filter: 'lowpass', freq: 300, q: 0.5 });
  },
  // A falling, slightly detuned drone.
  dark: (s, t) => {
    s.tone(t, { freq: 330, slide: 110, type: 'sawtooth', dur: 0.7, gain: 0.08 });
    s.tone(t, { freq: 330, slide: 110, type: 'sawtooth', dur: 0.7, gain: 0.08, detune: 25 });
    s.noise(t, { dur: 0.7, gain: 0.08, filter: 'lowpass', freq: 800, to: 200 });
  },
  // A shimmer.
  arcane: (s, t) => {
    s.tone(t, { freq: 660, slide: 990, dur: 0.4, gain: 0.15 });
    s.tone(t + 0.05, { freq: 1320, slide: 1980, dur: 0.35, gain: 0.07 });
  },
};
