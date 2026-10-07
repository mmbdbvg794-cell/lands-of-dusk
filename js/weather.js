// Weather drawn in the lighting layer (js/lighting.js, PixiJS): rain with a
// slant of wind, drifting snow, slow fog, fireflies at night and embers
// over fires, and lightning that lights the whole scene for a moment.
//
// What the weather is comes from js/atmosphere.js, as before: the shared
// clock (everyone sees the same sky), or whatever setWeather() last said
// (the lighting panel, and later a real-weather feed). This file only
// draws it. Without Pixi (no WebGL), atmosphere.js's own canvas rain and
// snow are the fallback; while this runs, they're off.
//
//   setWeather({ type, intensity, wind })
//     type       'clear', 'rain', 'storm', 'snow' or 'fog' ('clock' goes
//                back to the shared clock)
//     intensity  0 to 1;  wind  -1 (blowing left) to 1 (right)
//
// Everything fades in and out over FADE seconds rather than switching.
// Rain and snow don't fall on squares indoors: small areas closed in by
// walls and doors (indoorSquares), corrected by hand where that's wrong
// (js/indoor.json, and gods' own marks while they test: see lighting.js).

import { isUnderground, isOutdoorTile } from './atmosphere.js';

const FADE = 3; // seconds to fade an effect in or out
// The most of each there can be, at intensity 1 (halved on a low-end device).
export const MAX = { rain: 600, snow: 400, fog: 8, fireflies: 40, embers: 80 };
// Small screen or few cores: half the particles. localStorage dusk.lowend
// '1' or '0' says so instead (for testing).
const lowEndSaid = (() => { try { return localStorage.getItem('dusk.lowend'); } catch { return null; } })();
export const LOW_END = lowEndSaid === '1' || (lowEndSaid !== '0' && typeof navigator !== 'undefined' && typeof screen !== 'undefined' &&
  ((navigator.hardwareConcurrency || 8) <= 4 || Math.min(screen.width, screen.height) <= 420));
// How much darker the sky is: clouds a little, a storm more (0 to 1, times intensity).
const DIM = { clear: 0, rain: 0.22, snow: 0.12, fog: 0.18, storm: 0.45 };

// ---- setWeather: the one way in ---------------------------------------------

let atmosphere = null;
let changed = () => {};
// main.js hands over the Atmosphere (where the weather is decided) and what
// to do when it changes (redraw).
export function bindWeather(atm, onChange) {
  atmosphere = atm;
  changed = onChange ?? (() => {});
}

export function setWeather({ type = 'clear', intensity = 0.6, wind = 0 } = {}) {
  if (!atmosphere) return;
  if (type === 'clock' || type == null) atmosphere.override = null;
  else {
    if (!['clear', 'rain', 'storm', 'snow', 'fog'].includes(type)) throw new Error(`setWeather: no weather called "${type}"`);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
    atmosphere.override = { type, intensity: clamp(intensity, 0, 1), wind: clamp(wind, -1, 1) };
  }
  changed();
}

// ---- indoors -----------------------------------------------------------------

// Walls (and doors, which close a room off too). Natural rock and trees
// aren't: a clearing or a valley isn't a room.
const WALLS = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 58, 59, 60, 61, 62, 97, 98, 99, 100, 101,
  152, 153, 154, 155, 156, 157, 160, 161, 162, 163, 164, 165, 166, 167]);
const DOORS = new Set([23, 158, 159]);
const MAX_ROOM = 150; // squares: a hall at most
// Open ground: grass, paths, trees, water, snow (atmosphere.js), and sand,
// slopes and packed earth. A room has none of it.
const OUTSIDE = (t) => isOutdoorTile(t) || t === 37 || t === 38 || t === 39 || t === 40;

// The squares indoors round (cx, cy): every area that walls and doors
// close off with no open ground in it (a room has a floor, not grass or a
// street), and no bigger than MAX_ROOM. Squares never seen (tileAt gives
// null) and beyond the box (radius squares each way) are left out rather
// than counted, so a room only partly in view still counts. Wall squares
// between indoor squares are indoors too.
// overrides: Map "x,y" -> true (indoors) or false (outdoors).
export function indoorSquares(tileAt, cx, cy, radius, overrides = new Map()) {
  const inside = new Set();
  const seen = new Set();
  const key = (x, y) => `${x},${y}`;
  const barrier = (t) => WALLS.has(t) || DOORS.has(t);
  for (let x = cx - radius; x <= cx + radius; x++) for (let y = cy - radius; y <= cy + radius; y++) {
    const k = key(x, y);
    const t = tileAt(x, y);
    if (seen.has(k) || t == null || barrier(t)) continue;
    const area = [];
    let open = false;
    const todo = [[x, y]];
    seen.add(k);
    while (todo.length) {
      const [ax, ay] = todo.pop();
      area.push([ax, ay]);
      if (area.length > MAX_ROOM || OUTSIDE(tileAt(ax, ay))) open = true;
      for (const [nx, ny] of [[ax + 1, ay], [ax - 1, ay], [ax, ay + 1], [ax, ay - 1]]) {
        const nk = key(nx, ny);
        if (seen.has(nk)) continue;
        if (Math.abs(nx - cx) > radius || Math.abs(ny - cy) > radius) continue;
        const nt = tileAt(nx, ny);
        if (nt == null || barrier(nt)) continue;
        seen.add(nk);
        todo.push([nx, ny]);
      }
    }
    if (!open) for (const [ax, ay] of area) inside.add(key(ax, ay));
  }
  // Walls with indoors on two sides (between rooms) are indoors too.
  for (let x = cx - radius; x <= cx + radius; x++) for (let y = cy - radius; y <= cy + radius; y++) {
    if (!WALLS.has(tileAt(x, y))) continue;
    let n = 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (inside.has(key(nx, ny))) n++;
    if (n >= 2) inside.add(key(x, y));
  }
  for (const [k, v] of overrides) {
    if (v) inside.add(k); else inside.delete(k);
  }
  return inside;
}

// ---- where fireflies go ----------------------------------------------------------

// Green country: grass, meadow or woods, with no wall or paving within
// three squares (so not in towns), except in Aelindor, where the elves
// live among them.
const GREEN = new Set([1, 36, 25, 26, 64, 103]);
const TOWNISH = new Set([...WALLS, 20, 28, 29, 30, 31, 32, 33, 34, 41, 42, 43, 63, 105, 127, 149]);
const AELINDOR = { x0: 425, y0: 1175, x1: 510, y1: 1280 };
export function greenCountry(tileAt, x, y) {
  if (!GREEN.has(tileAt(x, y))) return false;
  if (x >= AELINDOR.x0 && x <= AELINDOR.x1 && y >= AELINDOR.y0 && y <= AELINDOR.y1) return true;
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (TOWNISH.has(tileAt(x + dx, y + dy))) return false;
  return true;
}
// The Underdark's open floor (its dark stone and rough ground), for wisps.
export function caveFloor(tileAt, x, y) {
  const t = tileAt(x, y);
  return t === 20 || t === 40 || t === 37;
}

// ---- drawing -------------------------------------------------------------------

function canvasTexture(PIXI, w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  return PIXI.Texture.from(c);
}

// The textures: a rain streak, a snowflake, a soft glow, a fog bank.
function textures(PIXI) {
  return {
    rain: canvasTexture(PIXI, 4, 48, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(200,215,255,0)'); gr.addColorStop(1, 'rgba(210,225,255,0.9)');
      g.fillStyle = gr; g.fillRect(1, 0, 2, h);
    }),
    flake: canvasTexture(PIXI, 16, 16, (g) => {
      const gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 16, 16);
    }),
    glow: canvasTexture(PIXI, 32, 32, (g) => {
      const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    }),
    fog: canvasTexture(PIXI, 256, 128, (g, w, h) => {
      // Overlapping soft puffs: a bank of mist with no hard edge.
      let s = 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 40; i++) {
        const x = w * (0.15 + rnd() * 0.7), y = h * (0.3 + rnd() * 0.4), r = 18 + rnd() * 34;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(225,230,240,0.22)'); gr.addColorStop(1, 'rgba(225,230,240,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }),
  };
}

// A pool of n particles in a ParticleContainer, all hidden to start with.
function particlePool(PIXI, texture, n, blendMode) {
  const box = new PIXI.ParticleContainer({ texture, dynamicProperties: { position: true, rotation: true, vertex: true, color: true } });
  if (blendMode) box.blendMode = blendMode;
  const all = [];
  for (let i = 0; i < n; i++) {
    const p = new PIXI.Particle({ texture, anchorX: 0.5, anchorY: 1, alpha: 0 });
    p.live = false;
    box.addParticle(p);
    all.push(p);
  }
  return { box, all };
}

// The weather layer for lighting.js. below: under the night (rain, snow,
// fog); above: over it (fireflies, embers, the lightning flash).
export function createWeather(PIXI, { lowEnd = LOW_END } = {}) {
  const k = lowEnd ? 0.5 : 1;
  const cap = Object.fromEntries(Object.entries(MAX).map(([n, v]) => [n, Math.max(1, Math.round(v * k))]));
  const tex = textures(PIXI);
  const below = new PIXI.Container();
  const above = new PIXI.Container();
  const rain = particlePool(PIXI, tex.rain, cap.rain);
  const snow = particlePool(PIXI, tex.flake, cap.snow);
  const flies = particlePool(PIXI, tex.glow, cap.fireflies, 'add');
  const embers = particlePool(PIXI, tex.glow, cap.embers, 'add');
  const fogLayer = new PIXI.Container();
  const fogs = [];
  for (let i = 0; i < cap.fog; i++) {
    const s = new PIXI.Sprite(tex.fog);
    s.anchor.set(0.5);
    s.alpha = 0;
    s.seed = i * 1.7;
    fogLayer.addChild(s);
    fogs.push(s);
  }
  const flash = new PIXI.Graphics();
  const overlay = new PIXI.Graphics(); // the indoor squares, while the panel shows them
  below.addChild(rain.box, snow.box, fogLayer);
  above.addChild(flies.box, embers.box, flash, overlay);

  // Each effect's strength now (fading) and where it's heading.
  const level = { rain: 0, snow: 0, fog: 0, fireflies: 0, embers: 0 };
  const on = { rain: true, snow: true, fog: true, fireflies: true, embers: true, lightning: true };
  let bolt = 0, nextBolt = 0, dim = 0;
  let indoor = new Set(), indoorAt = '';
  let overrides = new Map();
  let shown = 0; // particles drawn last frame, for the panel

  // Fill a pool up to `want` live particles, hiding the rest; spawn() sets
  // a new one up.
  function keep(pool, want, spawn) {
    let live = 0;
    for (const p of pool.all) {
      if (live < want) {
        if (!p.live) { p.live = true; spawn(p, true); }
        live++;
      } else if (p.live) { p.live = false; p.alpha = 0; }
    }
  }

  const weather = {
    below, above, cap, on,
    showIndoor: false, // tint the squares counted as indoors (the panel)
    get level() { return level; },
    get shown() { return shown; },
    get indoor() { return indoor; },
    setOverrides(map) { overrides = map; indoorAt = ''; },
    // Anything moving: 'fast' (rain, snow, lightning: the layer runs at full
    // rate), 'slow' (fog, fireflies, embers: the idle rate is smooth enough)
    // or null.
    get active() {
      if (level.rain > 0.001 || level.snow > 0.001 || bolt > 0) return 'fast';
      return level.fog > 0.001 || level.fireflies > 0.001 || level.embers > 0.001 ? 'slow' : null;
    },
    // How much darker the scene is for the weather, and how much a
    // lightning flash lifts the night (0 to 1).
    get dim() { return dim; },
    get flash() { return bolt; },

    // One frame. f: { dt (s), now (ms), world, renderer, st (the
    // atmosphere's state), cam, r, c, w, h, night (0-1), fires: [[px, py]] }.
    update(f) {
      const { dt, st, cam, r, c, w, h, world, renderer } = f;
      const under = isUnderground(Math.round(cam.x), Math.round(cam.y));
      const type = st?.weather ?? 'clear';
      const intensity = st?.intensity ?? 0;
      const wind = st?.wind ?? 0;
      const wet = !under && (type === 'rain' || type === 'storm' || type === 'snow');
      dim = under ? 0 : (DIM[type] ?? 0) * intensity;
      const target = {
        rain: on.rain && wet && !st.snowy ? intensity : 0,
        snow: on.snow && wet && st.snowy ? intensity : 0,
        fog: on.fog && !under && type === 'fog' ? intensity : 0,
        // Fireflies on dry nights in the country; wisps in the Underdark always.
        // (Underground only a quarter as many: a few wisps, not a swarm.)
        fireflies: on.fireflies && (under || (f.night > 0.5 && !wet)) ? (under ? 0.25 : 1) : 0,
        // Embers only show against the dark: dusk, night, a dark sky.
        embers: on.embers && f.fires.length && (f.night > 0.3 || dim > 0.15) ? 1 : 0,
      };
      for (const n of Object.keys(level)) {
        const step = dt / FADE;
        level[n] = level[n] < target[n] ? Math.min(target[n], level[n] + step) : Math.max(target[n], level[n] - step);
      }

      // Indoors, worked out again when the view moves a square.
      const cx = Math.round(cam.x), cy = Math.round(cam.y);
      if (`${cx},${cy}` !== indoorAt && c > 0) {
        indoorAt = `${cx},${cy}`;
        const tileAt = (x, y) => world.tileAt(x, y, f.now) ?? renderer.farTile?.(x, y) ?? null;
        indoor = indoorSquares(tileAt, cx, cy, r + 12, overrides);
      }
      // The square a point on screen is over.
      const sheltered = (px, py) => indoor.has(`${Math.floor(px / c + cam.x - r)},${Math.floor(py / c + cam.y - r)}`);
      shown = 0;

      // Rain: thin streaks falling fast, slanted by the wind.
      const fall = h * 1.5, slant = 0.25 + wind * 0.6;
      keep(rain, Math.round(cap.rain * level.rain), (p, first) => {
        p.x = Math.random() * w * 1.4 - w * 0.2;
        p.y = first ? Math.random() * h : -Math.random() * h * 0.3;
        p.v = 0.8 + Math.random() * 0.5;
        p.scaleY = (c / 48) * (0.6 + Math.random() * 0.6);
        p.scaleX = Math.max(0.5, c / 64);
        p.rotation = -Math.atan(slant);
      });
      for (const p of rain.all) {
        if (!p.live) continue;
        p.y += p.v * fall * dt;
        p.x += p.v * fall * dt * slant;
        if (p.y > h + 40 || p.x > w + 40 || p.x < -40) { p.x = Math.random() * w * 1.4 - w * 0.2 - slant * h * 0.3; p.y = -Math.random() * h * 0.2; }
        p.alpha = sheltered(p.x, p.y) ? 0 : 0.55;
        if (p.alpha) shown++;
      }

      // Snow: soft flakes, slow, swaying, carried by the wind.
      keep(snow, Math.round(cap.snow * level.snow), (p, first) => {
        p.x = Math.random() * w * 1.2 - w * 0.1;
        p.y = first ? Math.random() * h : -10;
        p.v = 0.08 + Math.random() * 0.08;
        p.phase = Math.random() * 10;
        const s = (c / 16) * (0.12 + Math.random() * 0.16);
        p.scaleX = p.scaleY = s;
        p.anchorY = 0.5;
      });
      const secs = f.now / 1000;
      for (const p of snow.all) {
        if (!p.live) continue;
        p.y += p.v * h * dt;
        p.x += (Math.sin(secs * 1.1 + p.phase) * 0.35 + wind * 0.8) * c * dt;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w * 1.2 - w * 0.1; }
        if (p.x > w + 20) p.x -= w + 40; else if (p.x < -20) p.x += w + 40;
        p.alpha = sheltered(p.x, p.y) ? 0 : 0.9;
        if (p.alpha) shown++;
      }

      // Fog: a few big banks drifting slowly with the wind.
      fogs.forEach((s, i) => {
        const a = level.fog * 0.75;
        s.alpha = a;
        if (!a) return;
        s.width = w * 0.9; s.height = h * 0.5;
        const drift = ((secs * (8 + i * 2) * (wind || 0.3) * c / 32 + i * w * 0.37) % (w * 1.8)) - w * 0.4;
        s.position.set(drift, h * ((i * 0.37) % 1) + Math.sin(secs * 0.1 + s.seed) * c * 0.5);
        shown++;
      });

      // Fireflies and embers live in the world (squares), not on the
      // screen, so they stay put as you walk past.
      const toScreen = (wx, wy) => [(wx - cam.x + r) * c + c / 2, (wy - cam.y + r) * c + c / 2];
      const tileAt = (x, y) => world.tileAt(x, y, f.now);
      const inView = (wx, wy) => Math.abs(wx - cam.x) <= r + 1 && Math.abs(wy - cam.y) <= r + 1;

      // Fireflies: blinking lights at night over green country; in the
      // Underdark, blue wisps over the cavern floors.
      keep(flies, Math.round(cap.fireflies * level.fireflies), (p) => { p.wx = null; p.anchorY = 0.5; });
      for (const p of flies.all) {
        if (!p.live) continue;
        if (p.wx == null || !inView(p.wx, p.wy)) {
          // A new one somewhere in view that suits it (a few tries).
          p.alpha = 0;
          p.wx = null;
          for (let tries = 0; tries < 6 && p.wx == null; tries++) {
            const x = Math.round(cam.x) + Math.floor(Math.random() * (2 * r + 1)) - r;
            const y = Math.round(cam.y) + Math.floor(Math.random() * (2 * r + 1)) - r;
            if (under ? caveFloor(tileAt, x, y) : greenCountry(tileAt, x, y)) { p.wx = x + Math.random() - 0.5; p.wy = y + Math.random() - 0.5; }
          }
          if (p.wx == null) continue;
          p.phase = Math.random() * 10;
          p.wisp = under;
          p.tint = under ? 0x7ac8ff : 0xd8ff70;
          p.scaleX = p.scaleY = (c / 32) * (under ? 0.4 : 0.22);
        }
        const speed = p.wisp ? 0.25 : 0.4;
        p.wx += Math.sin(secs * 0.7 + p.phase) * speed * dt;
        p.wy += Math.cos(secs * 0.53 + p.phase * 1.3) * speed * 0.75 * dt;
        [p.x, p.y] = toScreen(p.wx, p.wy);
        // Fireflies blink; wisps swell slowly and fade right away for a
        // while (dark about half the time).
        const pulse = p.wisp ? Math.max(0, Math.sin(secs * 0.35 + p.phase)) ** 1.5 : Math.max(0, Math.sin(secs * 1.7 + p.phase * 2)) ** 2;
        // (The level also sets how many; wisps are as bright at a quarter.)
        p.alpha = !p.wisp && sheltered(p.x, p.y) ? 0 : (p.wisp ? Math.min(1, level.fireflies * 4) * 0.8 : level.fireflies) * pulse;
        if (p.alpha) shown++;
      }

      // Embers: sparks rising off fires and lava, drifting with the wind.
      // f.fires are squares (world).
      keep(embers, Math.round(cap.embers * level.embers), (p) => { p.life = 0; p.anchorY = 0.5; p.tint = 0xffa040; });
      for (const p of embers.all) {
        if (!p.live) continue;
        p.life -= dt;
        if (p.life <= 0) {
          const src = f.fires[Math.floor(Math.random() * f.fires.length)];
          if (!src) { p.alpha = 0; continue; }
          p.wx = src[0] + (Math.random() - 0.5) * 0.4;
          p.wy = src[1] - 0.2;
          p.vx = (Math.random() - 0.5) * 0.3 + wind * 0.6;
          p.vy = -(0.5 + Math.random() * 0.8);
          p.life = p.max = 0.6 + Math.random() * 1.0;
          p.scaleX = p.scaleY = (c / 32) * (0.08 + Math.random() * 0.1);
          p.tint = Math.random() < 0.5 ? 0xffa040 : 0xff6a20;
        }
        p.wx += p.vx * dt; p.wy += p.vy * dt;
        [p.x, p.y] = toScreen(p.wx, p.wy);
        p.alpha = level.embers * Math.min(1, p.life / p.max * 1.5);
        if (p.alpha) shown++;
      }

      // Lightning, in storms outdoors: a flash, now and then.
      if (on.lightning && type === 'storm' && !under && st.storm) {
        if (!nextBolt) nextBolt = f.now + 3000 + Math.random() * 9000;
        if (f.now > nextBolt) {
          bolt = 1;
          nextBolt = f.now + (8000 - intensity * 4000) + Math.random() * 14000;
          renderer.atmosphere?.onThunder?.();
        }
      } else nextBolt = 0;
      flash.clear();
      if (bolt > 0) {
        // A double flicker: bright, a dip, bright again, then fading.
        const k2 = bolt > 0.75 ? 1 : bolt > 0.6 ? 0.35 : bolt;
        flash.rect(0, 0, w, h).fill({ color: 0xeef2ff, alpha: 0.42 * k2 });
        bolt = Math.max(0, bolt - dt * 1.8);
      }

      // Indoors, for checking: blue where it's worked out, outlined where
      // it's marked by hand (green outdoors, blue indoors).
      overlay.clear();
      if (weather.showIndoor) {
        for (let x = cx - r - 1; x <= cx + r + 1; x++) for (let y = cy - r - 1; y <= cy + r + 1; y++) {
          const px = (x - cam.x + r) * c, py = (y - cam.y + r) * c;
          const k3 = `${x},${y}`;
          if (indoor.has(k3)) overlay.rect(px, py, c, c).fill({ color: 0x3060ff, alpha: 0.28 });
          if (overrides.has(k3)) overlay.rect(px + 2, py + 2, c - 4, c - 4).stroke({ color: overrides.get(k3) ? 0x6090ff : 0x40e070, width: 3 });
        }
      }
    },
  };
  return weather;
}
