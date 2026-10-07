// Night, weather and quiet music, drawn over the map. Everyone sees the
// same sky: the time of day and the weather come from the clock, not the
// server, so all players agree without anything being sent.
//
//   A day is DAY_MS long (two hours): day, then dusk, night and dawn.
//   The weather changes every WEATHER_MS (15 minutes), and differs by
//   region: each continent and the open sea (js/regions.json, made by
//   tools/world/regions.mjs) has its own odds of clear, rain, storm and
//   fog (CLIMATES), and its own roll each slot, so it can rain in the
//   Old World while Eastreach is dry. How hard it rains and which way the
//   wind blows vary from slot to slot too. Rain is snow where the ground
//   is snowy.
//   Rain and snow only fall outdoors (most of the view open ground).
//   setWeather() (js/weather.js) can set the weather instead (override).
//   With lighting on, js/weather.js draws the weather in Pixi and this
//   file's own rain, snow and lightning are off (drawWeather): they're the
//   fallback without WebGL.
//
// The pure parts (daylight, weatherAt, outdoorShare) are tested in node.

export const DAY_MS = 2 * 60 * 60 * 1000;
export const WEATHER_MS = 15 * 60 * 1000;
// Open ground and trees (tools/paintart/painter.js's GROUND and TREES).
const OUTDOOR = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 64, 102, 103, 124,
  ...Array.from({ length: 25 }, (_, i) => 65 + i), ...Array.from({ length: 13 }, (_, i) => 109 + i)]);
export const isOutdoorTile = (t) => OUTDOOR.has(t);

// 1 by day, 0 at the depth of night, in between at dusk and dawn.
export function daylight(now = Date.now()) {
  const p = (((now % DAY_MS) + DAY_MS) % DAY_MS) / DAY_MS;
  if (p < 0.55) return 1;
  if (p < 0.65) return 1 - (p - 0.55) / 0.1; // dusk
  if (p < 0.9) return 0; // night
  return (p - 0.9) / 0.1; // dawn
}

// What time of day it is, in words.
export function timeOfDay(now = Date.now()) {
  const p = (((now % DAY_MS) + DAY_MS) % DAY_MS) / DAY_MS;
  return p < 0.55 ? 'day' : p < 0.65 ? 'dusk' : p < 0.9 ? 'night' : 'dawn';
}

// A number from 0 to 1 that's the same for everyone in the same slot.
function slotRandom(slot) {
  let h = (slot * 2654435761) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Each region's odds of each weather in a slot (they add up to 1), and
// its name in words. Regions come from js/regions.json; 'old' is used
// where there's no region map.
export const CLIMATES = {
  old: { name: 'the Old World', clear: 0.55, rain: 0.25, storm: 0.08, fog: 0.12 },
  north: { name: 'the North', clear: 0.45, rain: 0.3, storm: 0.08, fog: 0.17 }, // Kingshaven's: cold and wet
  south: { name: 'the South', clear: 0.6, rain: 0.22, storm: 0.08, fog: 0.1 }, // Aelindor's
  east: { name: 'the East', clear: 0.8, rain: 0.1, storm: 0.07, fog: 0.03 }, // Eastreach's: desert
  mid: { name: 'the Midlands', clear: 0.58, rain: 0.25, storm: 0.09, fog: 0.08 },
  sea: { name: 'the open sea', clear: 0.45, rain: 0.25, storm: 0.2, fog: 0.1 },
};
const REGION_IDS = Object.keys(CLIMATES);

// { weather, intensity, wind } in a region at a time: weather is 'clear',
// 'rain', 'storm' or 'fog'; intensity 0 to 1; wind -1 (blowing left) to 1.
export function weatherDetail(now = Date.now(), region = 'old') {
  const climate = CLIMATES[region] ?? CLIMATES.old;
  const slot = Math.floor(now / WEATHER_MS);
  const roll = (k) => slotRandom((slot * 8 + Math.max(0, REGION_IDS.indexOf(region))) * 4 + k);
  let r = roll(0), weather = 'clear';
  for (const w of ['clear', 'rain', 'storm', 'fog']) {
    if (r < climate[w]) { weather = w; break; }
    r -= climate[w];
  }
  const strength = roll(1), side = roll(2) < 0.5 ? -1 : 1, gust = roll(3);
  const intensity = { clear: 0, rain: 0.3 + 0.5 * strength, storm: 0.75 + 0.25 * strength, fog: 0.4 + 0.5 * strength }[weather];
  const wind = side * ({ clear: 0.1, rain: 0.05, storm: 0.3, fog: 0 }[weather] + gust * ({ fog: 0.1, storm: 0.4 }[weather] ?? 0.3));
  return { weather, intensity, wind };
}

// 'clear', 'rain', 'storm' or 'fog'.
export const weatherAt = (now = Date.now(), region = 'old') => weatherDetail(now, region).weather;

// The region map (js/regions.json): regionAt(x, y) gives a CLIMATES key.
export function regionMap({ cell, w, h, names, runs }) {
  const grid = new Uint8Array(w * h);
  for (let i = 0, k = 0; i < runs.length; i += 2) { grid.fill(runs[i], k, k + runs[i + 1]); k += runs[i + 1]; }
  return (x, y) => {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    return cx < 0 || cy < 0 || cx >= w || cy >= h ? 'sea' : names[grid[cy * w + cx]];
  };
}

// The share of tiles (IDs) that are open ground, and that are snow.
export function outdoorShare(tiles, snowTiles = new Set()) {
  let out = 0, snow = 0, n = 0;
  for (const t of tiles) {
    if (t === null || t === undefined) continue;
    n++;
    if (OUTDOOR.has(t) || snowTiles.has(t)) out++;
    if (snowTiles.has(t)) snow++;
  }
  return n ? { outdoor: out / n, snow: snow / n } : { outdoor: 0, snow: 0 };
}

// Which tiles in a tile sheet are snow (white, unsaturated), measured
// from the picture once it's loaded.
export function findSnowTiles(sheet) {
  const snow = new Set();
  const img = sheet?.img;
  if (!img?.naturalWidth) return snow;
  const size = sheet.size;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  // A picture from another server can't be read (the browser forbids it):
  // no snow then, rather than an error.
  try {
    g.getImageData(0, 0, 1, 1);
  } catch {
    return null;
  }
  for (let i = 0; i < sheet.count; i++) {
    const x = (i % sheet.cols) * size, y = Math.floor(i / sheet.cols) * size;
    const d = g.getImageData(x, y, size, size).data;
    let r = 0, gr = 0, b = 0;
    for (let k = 0; k < d.length; k += 4) { r += d[k]; gr += d[k + 1]; b += d[k + 2]; }
    const n = d.length / 4;
    r /= n; gr /= n; b /= n;
    if ((r + gr + b) / 3 > 215 && Math.max(r, gr, b) - Math.min(r, gr, b) < 30) snow.add(i);
  }
  return snow;
}

// Underground places (the Underdark city of Velkarath, built by
// tools/world/cities/velkarath.mjs): no weather, and always dim, a
// lantern's light around you, day or night.
// Also the old world's dug-out places: the crypt of King Zilen's guard
// (tools/world/cities/zilen.mjs) and the Izaru mine (izaru.mjs).
export const UNDERGROUND = [
  { x0: 1260, y0: 850, x1: 1429, y1: 989 },
  { x0: 12, y0: 236, x1: 55, y1: 279 },
  { x0: 340, y0: 280, x1: 403, y1: 333 },
];
export const isUnderground = (x, y) => UNDERGROUND.some((u) => x >= u.x0 && x <= u.x1 && y >= u.y0 && y <= u.y1);
const UNDERGROUND_LIGHT = 0; // as dark as the depth of night

// Draws night and weather over the map.
export class Atmosphere {
  constructor() {
    this.night = true; // darkness at night (else always day)
    this.weather = true; // rain, storms and snow (else always clear)
    this.override = null; // { type, intensity, wind } from setWeather, else the clock's
    this.regionAt = null; // (x, y) -> region (regionMap), once js/regions.json is in
    this.drawWeather = true; // draw rain, snow and lightning here (off while js/weather.js does)
    this.drops = [];
    this.flash = 0;
    this.nextFlash = 0;
    this.last = 0;
  }

  // { weather, intensity, wind, light, falling, storm, snowy } for the
  // view: weather is 'clear', 'rain', 'storm', 'snow' or 'fog'; falling is
  // 'rain', 'snow' or null (dry, or most of the view indoors); snowy: snow
  // rather than rain (it says so, or the ground is snowy); region: the
  // CLIMATES key the weather is from.
  // where: [x, y] of the view's centre, for its region and places underground.
  state(now, share, where) {
    if (where && isUnderground(where[0], where[1])) {
      return { weather: 'clear', intensity: 0, wind: 0, light: this.night ? UNDERGROUND_LIGHT : 1, falling: null, storm: false, snowy: false, underground: true };
    }
    const region = (where && this.regionAt?.(where[0], where[1])) || 'old';
    const o = this.weather ? this.override : null;
    const clock = weatherDetail(now, region);
    const weather = !this.weather ? 'clear' : o ? o.type : clock.weather;
    const intensity = o ? o.intensity : clock.intensity;
    const wind = o ? o.wind : clock.wind;
    const outdoors = share.outdoor >= 0.4;
    const wet = (weather === 'rain' || weather === 'storm' || weather === 'snow') && intensity > 0;
    const snowy = weather === 'snow' || share.snow >= 0.3;
    const falling = !wet || !outdoors ? null : snowy ? 'snow' : 'rain';
    return { weather, intensity, wind, light: this.night ? daylight(now) : 1, falling, storm: weather === 'storm' && outdoors, snowy, region };
  }

  // ctx: the map canvas; w, h its size; centre: the player in pixels;
  // cell: a tile in pixels. Returns true while it needs to keep drawing.
  draw(ctx, w, h, centre, cell, st, nowPerf) {
    const dt = Math.min(0.1, this.last ? (nowPerf - this.last) / 1000 : 0);
    this.last = nowPerf;
    let moving = false;
    // Weather first, so night darkens it too.
    if (st.falling && this.drawWeather) {
      moving = true;
      const want = Math.round((st.falling === 'snow' ? 250 : 260) * Math.min(1, st.intensity ?? 0.55) * (w * h) / (640 * 640));
      while (this.drops.length < want) this.drops.push(this.newDrop(w, h, true, st.falling));
      if (this.drops.length > want) this.drops.length = want;
      ctx.save();
      if (st.falling === 'rain') {
        ctx.strokeStyle = 'rgba(190, 210, 255, 0.45)';
        ctx.lineWidth = Math.max(1, cell / 40);
        ctx.beginPath();
        for (const d of this.drops) {
          d.y += d.v * dt * h;
          d.x += d.v * dt * h * (0.1 + (st.wind ?? 0.15) * 0.5);
          if (d.y > h || d.x > w) Object.assign(d, this.newDrop(w, h, false, 'rain'));
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * 0.18, d.y - d.len);
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (const d of this.drops) {
          d.y += d.v * dt * h * 0.12;
          d.x += Math.sin((nowPerf / 1000 + d.phase) * 1.3) * dt * cell * 0.4;
          if (d.y > h) Object.assign(d, this.newDrop(w, h, false, 'snow'));
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      // A grey sky over rain and storms.
      ctx.fillStyle = st.storm ? 'rgba(20, 24, 40, 0.25)' : 'rgba(40, 46, 60, 0.12)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else {
      this.drops.length = 0;
    }
    // Lightning.
    if (st.storm && this.drawWeather) {
      if (!this.nextFlash) this.nextFlash = nowPerf + 4000 + Math.random() * 12000;
      if (nowPerf > this.nextFlash) {
        this.flash = 1;
        this.nextFlash = nowPerf + 6000 + Math.random() * 16000;
        this.onThunder?.();
      }
    }
    if (this.flash > 0) {
      moving = true;
      ctx.fillStyle = `rgba(235, 240, 255, ${0.55 * this.flash})`;
      ctx.fillRect(0, 0, w, h);
      this.flash = Math.max(0, this.flash - dt * 3);
    }
    // Night: dark blue, with a lantern's light around you.
    const dark = (1 - st.light) * 0.62;
    if (dark > 0.01) {
      const g = ctx.createRadialGradient(centre[0], centre[1], cell * 1.2, centre[0], centre[1], cell * 3.6);
      g.addColorStop(0, 'rgba(8, 12, 34, 0)');
      g.addColorStop(1, `rgba(8, 12, 34, ${dark})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    return moving;
  }

  newDrop(w, h, anywhere, kind) {
    return {
      x: Math.random() * w * 1.1 - w * 0.1,
      y: anywhere ? Math.random() * h : -Math.random() * h * 0.2,
      v: kind === 'snow' ? 0.6 + Math.random() * 0.6 : 1.4 + Math.random() * 0.8,
      len: 6 + Math.random() * 10,
      r: 1 + Math.random() * 1.8,
      phase: Math.random() * 10,
    };
  }
}

// Rain on the ground, thunder, and (if wanted) a slow, quiet music: soft
// chords that drift, brighter by day and lower at night. All made with Web
// Audio on the game's Sound. Rain and thunder follow its volume and mute;
// the music has its own volume (setMusicVolume) and plays for moods that
// have no tracks yet (js/music.js).
export class AmbientSound {
  constructor(sound) {
    this.sound = sound;
    this.rain = null; // { src, gain }
    this.music = false;
    this.musicTimer = 0;
    this.melodyTimer = 0;
    this.musicBus = null;
    this.musicVolume = 0.6;
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicBus) this.musicBus.out.gain.value = this.musicVolume;
  }

  setRain(level) {
    const s = this.sound;
    if (!s.ctx || !s.enabled) level = 0;
    if (level > 0 && !this.rain) {
      const ctx = s.ctx;
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(f).connect(gain).connect(s.ambience ?? s.master);
      src.start();
      this.rain = { src, gain };
    }
    if (this.rain) {
      const t = this.sound.ctx.currentTime;
      this.rain.gain.gain.cancelScheduledValues(t);
      this.rain.gain.gain.setTargetAtTime(level * 0.12, t, 1.5);
      if (level === 0) {
        const r = this.rain;
        this.rain = null;
        setTimeout(() => { try { r.src.stop(); } catch {} }, 6000);
      }
    }
  }

  thunder() {
    const s = this.sound;
    if (!s.ctx || !s.enabled) return;
    const t = s.ctx.currentTime + 0.4 + Math.random() * 1.2;
    s.noise(t, { dur: 2.2, gain: 0.35, filter: 'lowpass', freq: 160, to: 60, out: s.ambience });
  }

  // Quiet music: a soft pad that drifts through four chords, a slow
  // melody wandering a pentatonic scale over it (with rests), and a low
  // root, all through a gentle echo. Brighter by day, minor at night.
  // Pitched where laptop and phone speakers can play it.
  setMusic(on, mood = () => 1) {
    this.music = on;
    clearTimeout(this.musicTimer);
    clearTimeout(this.melodyTimer);
    if (!on) return;
    // Day: C major (C, G, Am, F); night: A minor (Am, F, C, Em). MIDI notes.
    const DAY = { chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], scale: [60, 62, 64, 67, 69, 72, 74, 76] };
    const NIGHT = { chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 55, 59]], scale: [57, 60, 62, 64, 67, 69, 72] };
    const hz = (n) => 440 * 2 ** ((n - 69) / 12);
    let bar = 0;
    let at = 3; // where the melody is in its scale
    const key = () => (mood() > 0.5 ? DAY : NIGHT);
    const pad = () => {
      const s = this.sound;
      if (this.music && this.bus()) {
        const t = s.ctx.currentTime + 0.05;
        const chord = key().chords[bar++ % 4];
        for (const n of chord) for (const d of [-6, 6]) this.voice(t, hz(n), { type: 'triangle', dur: 9, gain: 0.03, attack: 2.5, detune: d, cutoff: 900 });
        this.voice(t, hz(chord[0] - 12), { type: 'sine', dur: 8, gain: 0.06, attack: 1.5, cutoff: 400 });
      }
      if (this.music) this.musicTimer = setTimeout(pad, 8000);
    };
    const melody = () => {
      const s = this.sound;
      if (this.music && this.bus() && Math.random() < 0.7) {
        const sc = key().scale;
        at = Math.max(0, Math.min(sc.length - 1, at + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        this.voice(s.ctx.currentTime + 0.02, hz(sc[at] + 12), { type: 'sine', dur: 2.6, gain: 0.06, attack: 0.04, cutoff: 3000 });
      }
      if (this.music) this.melodyTimer = setTimeout(melody, [1200, 1600, 2400][Math.floor(Math.random() * 3)]);
    };
    pad();
    this.melodyTimer = setTimeout(melody, 2500);
  }

  // The music's own path to the speakers: a little echo, then the music
  // volume (not the sound effects'). Null until sound is allowed.
  bus() {
    const s = this.sound;
    if (!s.ctx) return null;
    if (s.ctx.state === 'suspended') s.ctx.resume?.()?.catch?.(() => {});
    if (this.musicBus?.ctx === s.ctx) return this.musicBus.in;
    const ctx = s.ctx;
    const out = ctx.createGain();
    out.gain.value = this.musicVolume;
    out.connect(ctx.destination);
    const input = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 1800;
    input.connect(out);
    input.connect(delay).connect(soften).connect(fb).connect(delay);
    soften.connect(out);
    this.musicBus = { ctx, in: input, out };
    return input;
  }

  // One note: an oscillator through a lowpass, swelling in and dying away.
  voice(t, freq, { type = 'sine', dur = 2, gain = 0.05, attack = 0.05, detune = 0, cutoff = 2000 }) {
    const ctx = this.sound.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.musicBus.in);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}
