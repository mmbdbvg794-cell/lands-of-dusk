// Lighting (PixiJS, WebGL): a see-through canvas laid exactly over the
// map, drawing what the GPU does well. The game (connection, world, map
// drawing) is untouched; this only reads the world and the renderer.
//
//   Lighting   night is a dark layer with soft holes cut out of it (a
//              render texture: dark fill, then light sprites drawn with
//              the "erase" blend), plus coloured glow added on top.
//              Light sources: the player's lantern, wall torches (tile
//              24, and 160-167 on other walls), braziers, lamp posts,
//              campfires, lava (35, 108, 130), crystal (96, 128), candlestick
//              stands, and spells while they play. While it's on, the
//              normal client's night (js/atmosphere.js) is off.
//   Spell glow a bloom filter (pixi-filters' AdvancedBloomFilter) over
//              bright sparks at each spell, on top of the normal effect.
//
// Pixi comes from jsDelivr (the import map in index.html) and is only
// fetched when lighting starts; if it can't load, the game keeps its
// normal night. Settings has the switch (dusk.lighting, on unless turned
// off). A test panel (frame rates, a time-of-day slider, each part on or
// off) shows with #lights at the end of the address.

import { daylight, timeOfDay, isUnderground, DAY_MS } from './atmosphere.js';
import { bareName } from './world.js';

let PIXI = null, AdvancedBloomFilter = null;

const MAX_LIGHTS = 64; // light sprites kept; more in view are skipped
// The night and its glow are soft, so they're drawn at a quarter of the
// map's size and stretched (a phone's map is ~1000 px square: 1/16 the work).
const LIGHT_SCALE = 0.25;
const IDLE_FPS = 30; // the layer's rate with no spell playing (lights flicker slowly)
const NIGHT = 0x080c22; // the night's colour (the normal client's)
const MAX_DARK = 0.82; // how dark the depth of night is (normal: 0.62, but lights make up for it)

// Light sources: radius in cells, colour, how strong the glow, flicker.
const TILE_LIGHTS = {
  24: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 }, // wall torch, and on the other walls:
  160: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  161: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  162: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  163: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  164: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  165: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  166: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  167: { r: 3.2, color: 0xffa040, glow: 0.3, flicker: 1 },
  35: { r: 2.2, color: 0xff5020, glow: 0.12, flicker: 0.4 }, // lava
  108: { r: 2.2, color: 0xff5020, glow: 0.12, flicker: 0.4 },
  130: { r: 2.2, color: 0xff5020, glow: 0.12, flicker: 0.4 },
  96: { r: 1.5, color: 0x60c8ff, glow: 0.2, flicker: 0 }, // crystal
  128: { r: 1.5, color: 0x60c8ff, glow: 0.2, flicker: 0 },
};
const NAME_LIGHTS = {
  'candlestick stand': { r: 2.6, color: 0xffc060, glow: 0.3, flicker: 1 },
  brazier: { r: 3.6, color: 0xff9030, glow: 0.35, flicker: 1 },
  'lamp post': { r: 3.4, color: 0xffd080, glow: 0.3, flicker: 0.15 },
  campfire: { r: 3.8, color: 0xff8a30, glow: 0.35, flicker: 1.2 },
  'lava guard': { r: 1.8, color: 0xff6020, glow: 0.2, flicker: 0.5 },
};
const LANTERN = { r: 3.6, color: 0xffd8a0, glow: 0.08, flicker: 0.15 };
const SPELL_COLORS = { heal: 0x3dff7a, holy: 0xffe27a, fire: 0xff7a2e, earth: 0xd0a064, dark: 0xb05cff, arcane: 0x6ab8ff };
const SPELL_MS = { heal: 1300, holy: 1200, fire: 900, earth: 900, dark: 1200, arcane: 1000 };

const state = { lights: true, glow: true, layer: true, time: null }; // time: null = the real clock, else 0..1 of a day

// A soft round light: white in the middle, nothing at the edge.
function softCircle(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d').createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  const ctx = c.getContext('2d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return PIXI.Texture.from(c);
}

// A pool of sprites: take() hands out the next one, end() hides the rest.
function pool(parent, texture, blendMode) {
  const all = [];
  let used = 0;
  return {
    take() {
      if (used === all.length) {
        const s = new PIXI.Sprite(texture);
        s.anchor.set(0.5);
        s.blendMode = blendMode;
        parent.addChild(s);
        all.push(s);
      }
      const s = all[used++];
      s.visible = true;
      return s;
    },
    end() {
      for (let i = used; i < all.length; i++) all[i].visible = false;
      const n = used;
      used = 0;
      return n;
    },
  };
}

// Starts the layer. map: the map canvas; dusk(): { world, renderer }, read
// every frame (logging in makes a new world); nightOn(): whether the
// player wants night at all. Returns { setOn(on) }, or null if Pixi can't
// be loaded.
export async function startLighting({ map, dusk, nightOn, panel: withPanel = false }) {
  try {
    PIXI = await import('pixi.js');
    ({ AdvancedBloomFilter } = await import('pixi-filters'));
  } catch (e) {
    console.warn('Lighting: Pixi could not be loaded, keeping the normal night.', e);
    return null;
  }
  const app = new PIXI.Application();
  try {
    await app.init({ backgroundAlpha: 0, antialias: false, resolution: 1, autoDensity: false, width: 16, height: 16, preference: 'webgl' });
  } catch (e) {
    console.warn('Lighting: no WebGL here, keeping the normal night.', e);
    return null;
  }
  const view = app.canvas;
  Object.assign(view.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
  map.parentElement.insertBefore(view, map.nextSibling);

  const circle = softCircle();
  // The night: drawn into `dark` each frame, shown by `darkSprite`.
  let dark = PIXI.RenderTexture.create({ width: 16, height: 16 });
  const lightTexture = (w, h) => PIXI.RenderTexture.create({ width: Math.ceil(w * LIGHT_SCALE), height: Math.ceil(h * LIGHT_SCALE) });
  const darkScene = new PIXI.Container();
  const nightFill = new PIXI.Graphics();
  darkScene.addChild(nightFill);
  const holes = pool(darkScene, circle, 'erase');
  darkScene.scale.set(LIGHT_SCALE);
  const darkSprite = new PIXI.Sprite(dark);
  darkSprite.scale.set(1 / LIGHT_SCALE);
  app.stage.addChild(darkSprite);
  // Coloured light on top: drawn into `glow` with the "max" blend, so
  // where lights overlap the brighter one shows rather than their sum (this
  // layer can only paint over the map, not brighten it: summed, a row of
  // torches turns to a solid blob).
  let glow = PIXI.RenderTexture.create({ width: 16, height: 16 });
  const glowScene = new PIXI.Container();
  const glows = pool(glowScene, circle, 'max');
  glowScene.scale.set(LIGHT_SCALE);
  const glowSprite = new PIXI.Sprite(glow);
  glowSprite.scale.set(1 / LIGHT_SCALE);
  app.stage.addChild(glowSprite);
  // Spells: bright sparks, bloomed.
  const spellLayer = new PIXI.Container();
  const bloom = new AdvancedBloomFilter({ threshold: 0.15, bloomScale: 1.6, brightness: 1.1, blur: 6, quality: 3 });
  bloom.resolution = 0.5; // a blur: half size is plenty
  spellLayer.filters = [bloom];
  app.stage.addChild(spellLayer);
  const sparks = pool(spellLayer, circle, 'add');

  const panel = withPanel ? makePanel() : { update() {} };

  app.ticker.add(() => {
    // Read each frame: logging in makes a new world.
    const { world, renderer } = dusk();
    const w = map.width, h = map.height;
    if (view.width !== w || view.height !== h) {
      app.renderer.resize(w, h);
      dark.destroy(true);
      dark = lightTexture(w, h);
      darkSprite.texture = dark;
      glow.destroy(true);
      glow = lightTexture(w, h);
      glowSprite.texture = glow;
    }
    view.style.width = map.style.width;
    view.style.height = map.style.height;
    view.style.left = `${map.offsetLeft}px`;
    view.style.top = `${map.offsetTop}px`;
    view.style.display = state.layer ? '' : 'none';

    // The normal client's night is off while this layer does it.
    const wantNight = nightOn();
    if (renderer.atmosphere) renderer.atmosphere.night = wantNight && !(state.layer && state.lights);
    if (!state.layer) { app.ticker.maxFPS = 4; panel.update({ fps: app.ticker.FPS, lights: 0, sparks: 0, darkness: 0, when: '(layer off)' }); return; }

    const nowPerf = performance.now();
    const c = renderer.cell;
    const ready = world.hasMap && c > 0;
    const cam = ready ? world.camera(nowPerf) : { x: 0, y: 0 };
    const r = world.viewRange;
    const centre = (x, y) => [(x - cam.x + r) * c + c / 2, (y - cam.y + r) * c + c / 2];
    const t = state.time === null ? Date.now() : state.time * DAY_MS;
    const under = ready && isUnderground(Math.round(cam.x), Math.round(cam.y));
    const light = under ? 0 : daylight(t);
    const darkness = state.lights && wantNight && ready ? (1 - light) * MAX_DARK : 0;
    const secs = nowPerf / 1000;

    // ---- lights ----
    const found = [];
    if (darkness > 0.01) {
      const add = (x, y, L, seed, strength = 1) => {
        if (found.length < MAX_LIGHTS) found.push({ x, y, L, seed, strength });
      };
      const me = world.self();
      if (me) { const p = world.visualPos(me, nowPerf); add(p.x, p.y, LANTERN, 0); }
      const x0 = Math.floor(cam.x) - r - 2, y0 = Math.floor(cam.y) - r - 2;
      for (let x = x0; x <= x0 + 2 * r + 4; x++) for (let y = y0; y <= y0 + 2 * r + 4; y++) {
        const L = TILE_LIGHTS[world.tileAt(x, y, nowPerf)];
        if (L) add(x, y, L, x * 31 + y * 17);
      }
      for (const e of world.drawList(nowPerf)) {
        const L = NAME_LIGHTS[bareName(e.name).toLowerCase()];
        if (L) { const p = world.visualPos(e, nowPerf); add(p.x, p.y, L, e.id); }
      }
      for (const fx of world.effects) {
        const at = effectAt(world, fx, nowPerf);
        const k = (nowPerf - fx.start) / (SPELL_MS[fx.kind] ?? 1000);
        if (at && k >= 0 && k < 1) add(at.x, at.y, { r: 3, color: SPELL_COLORS[fx.kind] ?? 0xffffff, glow: 0.3, flicker: 0 }, fx.seed, Math.sin(k * Math.PI));
      }
    }
    nightFill.clear();
    if (darkness > 0.01) nightFill.rect(0, 0, w, h).fill({ color: NIGHT, alpha: darkness });
    for (const f of found) {
      const [px, py] = centre(f.x, f.y);
      const fl = f.L.flicker ? 1 + f.L.flicker * 0.06 * (Math.sin(secs * 3.2 + f.seed) + Math.sin(secs * 7.3 + f.seed * 3) * 0.5) : 1;
      const size = f.L.r * 2 * c * fl * (0.6 + 0.4 * f.strength);
      const hole = holes.take();
      hole.position.set(px, py);
      hole.width = hole.height = size;
      hole.alpha = Math.min(1, f.strength);
      const g = glows.take();
      g.position.set(px, py);
      g.width = g.height = size * 0.7;
      g.tint = f.L.color;
      g.alpha = f.L.glow * f.strength * (darkness / MAX_DARK) * fl;
    }
    holes.end();
    glows.end();
    if (darkness > 0.01) {
      app.renderer.render({ container: darkScene, target: dark, clear: true });
      app.renderer.render({ container: glowScene, target: glow, clear: true });
    }
    darkSprite.visible = glowSprite.visible = darkness > 0.01;

    // ---- spell sparks ----
    let nSparks = 0;
    if (state.glow && ready) {
      for (const fx of world.effects) {
        const k = (nowPerf - fx.start) / (SPELL_MS[fx.kind] ?? 1000);
        const at = effectAt(world, fx, nowPerf);
        if (!at || k < 0 || k >= 1) continue;
        const [px, py] = centre(at.x, at.y);
        const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        const color = SPELL_COLORS[fx.kind] ?? 0xffffff;
        const halo = sparks.take();
        halo.position.set(px, py);
        halo.width = halo.height = c * (1.2 + 0.4 * Math.sin(k * Math.PI));
        halo.tint = color;
        halo.alpha = 0.22 * fade;
        // Twelve sparks circling up and out.
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + k * Math.PI * 2.5 + (fx.seed % 100);
          const rad = c * (0.32 + 0.3 * k);
          const s = sparks.take();
          s.position.set(px + Math.cos(a) * rad, py + Math.sin(a) * rad * 0.6 - c * 0.35 * k);
          s.width = s.height = c * 0.1;
          s.tint = 0xffffff;
          s.alpha = fade;
          const s2 = sparks.take(); // the coloured haze round it
          s2.position.copyFrom(s.position);
          s2.width = s2.height = c * 0.22;
          s2.tint = color;
          s2.alpha = 0.5 * fade;
        }
      }
    }
    nSparks = sparks.end();
    spellLayer.visible = nSparks > 0;
    app.ticker.maxFPS = nSparks ? 0 : IDLE_FPS;

    panel.update({ fps: app.ticker.FPS, lights: found.length, sparks: nSparks, darkness, when: state.time === null ? timeOfDay() : timeOfDay(t) });
  });

  return {
    // Off: the layer hides and idles, and the normal night comes back.
    setOn(on) {
      state.layer = on;
      if (!on) { view.style.display = 'none'; const { renderer } = dusk(); if (renderer.atmosphere) renderer.atmosphere.night = nightOn(); renderer.invalidate(); }
    },
  };
}

// Where an effect is, in world squares (moving with whoever it's on).
function effectAt(world, fx, now) {
  if (typeof fx.on === 'object') return fx.on;
  const e = fx.on === 'self' ? world.self() : world.entities.get(fx.on);
  return e ? world.visualPos(e, now) : null;
}

function makePanel() {
  const box = document.createElement('div');
  box.id = 'light-panel';
  box.innerHTML = `
    <b>Lighting</b> <span class="v">v${PIXI.VERSION}</span>
    <div class="fps">-- fps</div>
    <label><input type="checkbox" data-k="lights" checked> Lights at night</label>
    <label><input type="checkbox" data-k="glow" checked> Spell glow</label>
    <label>Time <input type="range" min="0" max="100" value="0" class="time" disabled></label>
    <label><input type="checkbox" class="clock" checked> Real clock</label>
    <div class="info"></div>
    <button type="button" class="hide">Hide</button>`;
  document.body.appendChild(box);
  const style = document.createElement('style');
  style.textContent = `#light-panel { position: fixed; top: 8px; right: 8px; z-index: 9999; background: rgba(10,12,20,.85); color: #dde;
      font: 12px/1.5 system-ui, sans-serif; padding: 8px 10px; border-radius: 6px; width: 190px; }
    #light-panel label { display: block; } #light-panel .v { opacity: .6 } #light-panel .fps { font-size: 14px; font-weight: 600 }
    #light-panel .time { width: 90px; vertical-align: middle } #light-panel .info { opacity: .75; margin: 4px 0 }
    #light-panel.min > :not(.fps):not(.hide) { display: none }`;
  document.head.appendChild(style);
  for (const cb of box.querySelectorAll('input[data-k]')) cb.addEventListener('change', () => { state[cb.dataset.k] = cb.checked; });
  const time = box.querySelector('.time'), clock = box.querySelector('.clock');
  // The slider runs through a day: 0 noon-ish day, dusk at .55-.65, night to .9, dawn.
  const setTime = () => { state.time = clock.checked ? null : time.value / 100; time.disabled = clock.checked; };
  time.addEventListener('input', setTime);
  clock.addEventListener('change', () => { if (!clock.checked) time.value = 75; setTime(); });
  // T steps the time of day on (jumps to night first).
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'T' || e.target.closest?.('input, textarea')) return;
    clock.checked = false;
    time.value = (Number(time.value) + 10) % 100;
    setTime();
  });
  const hide = box.querySelector('.hide');
  hide.addEventListener('click', () => { box.classList.toggle('min'); hide.textContent = box.classList.contains('min') ? 'Panel' : 'Hide'; });
  const fps = box.querySelector('.fps'), info = box.querySelector('.info');
  // The page's own frame rate (animation frames the browser manages): how
  // smooth everything is, the normal map included; Pixi's is its layer's.
  let frames = 0, pageFps = 0, since = performance.now();
  const count = (now) => {
    frames++;
    if (now - since >= 1000) { pageFps = (frames * 1000) / (now - since); frames = 0; since = now; }
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
  let last = 0;
  return {
    update(s) {
      const now = performance.now();
      if (now - last < 250) return;
      last = now;
      fps.textContent = `page ${Math.round(pageFps)} · pixi ${Math.round(s.fps)} fps`;
      info.textContent = `${s.when}, dark ${s.darkness.toFixed(2)} · lights ${s.lights} · sparks ${s.sparks}`;
    },
  };
}

