// Draws the World onto a <canvas>, following Dusk.java's update() and
// drawEntity(): tiles first, then entities in list order, each with its
// selection box, sprite and name.

import { HIT_MS, bareName } from './world.js';
import { drawShip } from './ships.js';
import { drawGroundDetail, groundFlip } from './blend.js';
import { Terrain } from './terrain.js';
import { TREE_TILES, treeDraws } from './trees.js';

const TREE_FADE_MS = 350; // a tree new to the edge of the view fades in this long
import { drawEffect, drawPaintedEffect } from './effects.js';
import { LOOKS, OUT, paintFigureStrip } from './figure.js';
import { outdoorShare } from './atmosphere.js';
import { gearKey } from './gear.js';
import { isStorage, storageKind } from './storage.js';

const FLAG_COLORS = { 1: '#00ff00', 2: '#ff0000' }; // Color.green / Color.red

export class Renderer {
  // `box` is the element whose size the map fills (the canvas's own
  // parent may shrink to fit the canvas, so it can't be that).
  constructor(canvas, world, box = canvas.parentElement) {
    this.box = box;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.sheets = null;
    this.terrain = new Terrain(); // blended ground, kept (the Painted style)
    this.treeSeen = new Map(); // "x,y" -> when each big tree was first drawn (fading in)
    this.showNames = true;
    // Labels on things (items, props, signs, doors) as well as on people,
    // creatures and merchants: off by default, or a room of couches reads
    // "couch couch couch".
    this.showObjectNames = false;
    // NPCs: merchants, and props that are people (propPeople, from the
    // Painted art), talk (talkers) or are tellers; their names have their
    // own setting.
    this.showNpcNames = true;
    this.talkers = new Set();
    this.propPeople = new Set();
    // Props with names of their own -> the prop they look like (lower case),
    // from the server's "prop looks".
    this.propLooks = new Map();
    // Painted style only: creature art by name ({ sheet, index: Map }),
    // for creatures that share a picture with others (see bestiary.js).
    this.named = null;
    // Painted style only: items on the ground by name, the same shape
    // (see tools/paintart/items.js).
    this.items = null;
    // Painted style only: what the player is wearing (gear.js), drawn on
    // their own character; null draws them from the players sheet.
    this.gear = null;
    // Other players' gear (Painted style), by entity ID, from "worn".
    this.others = new Map();
    this.outfits = new Map(); // "image gear" -> strip, the figures painted so far
    this.cell = 0;
    this.pending = false;
    new ResizeObserver(() => this.resize()).observe(box);
    this.resize();
  }

  setSheets(sheets) {
    this.sheets = sheets;
    this.invalidate();
  }

  // Sizes the backing store to a whole number of device pixels per cell,
  // so tile edges never land between pixels.
  resize() {
    const box = this.box.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const n = this.world.mapSize;
    const side = Math.max(0, Math.min(box.width, box.height));
    this.cell = Math.max(1, Math.floor((side * dpr) / n));
    const px = this.cell * n;
    this.canvas.width = px;
    this.canvas.height = px;
    this.canvas.style.width = `${px / dpr}px`;
    this.canvas.style.height = `${px / dpr}px`;
    this.invalidate();
  }

  // Batches redraws to one per animation frame.
  invalidate() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.draw();
    });
  }

  draw() {
    const { ctx, world } = this;
    const n = world.mapSize;
    if (this.canvas.width !== this.cell * n) return this.resize();
    const c = this.cell;
    const now = performance.now();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.sheets || !world.hasMap) return;

    // World (x, y) -> canvas pixels, following the sliding camera. Rounding
    // every cell with the same fraction keeps tiles seamless.
    const cam = world.camera(now);
    const r = world.viewRange;
    const toPx = (x, y) => [Math.round((x - cam.x + r) * c), Math.round((y - cam.y + r) * c)];

    const { map, players, sprites } = this.sheets;
    let trees = [];
    let treesFading = false;
    // Outside the view, what was seen there before (the explored map), so
    // trees and blends just beyond the edge are there before they're in view.
    const seen = (x, y) => world.tileAt(x, y, now) ?? this.farTile?.(x, y) ?? null;
    const ground = this.bigTrees ? (x, y) => { const t = seen(x, y); return TREE_TILES[t]?.ground ?? t; } : (x, y) => world.tileAt(x, y, now);
    if (map) {
      // One extra row/column so the edge coming into view is covered mid-slide.
      const x0 = Math.floor(cam.x) - r;
      const y0 = Math.floor(cam.y) - r;
      for (let x = x0; x <= x0 + n; x++) {
        for (let y = y0; y <= y0 + n; y++) {
          let tile = world.tileAt(x, y, now);
          if (tile === null) continue;
          // Big trees (the Painted style) stand on their ground.
          if (this.bigTrees && TREE_TILES[tile]) tile = TREE_TILES[tile].ground;
          const [px, py] = toPx(x, y);
          // Painted ground where kinds meet: worked out pixel by pixel and
          // kept (js/terrain.js).
          if (this.blendGround) {
            const img = this.terrain.cell(x, y, ground, map);
            if (img) { ctx.imageSmoothingEnabled = true; ctx.drawImage(img, px, py, c, c); continue; }
          }
          // Painted ground: mirrored square to square (js/blend.js).
          const flip = this.blendGround ? groundFlip(x, y, tile) : 0;
          if (flip) {
            ctx.save();
            ctx.translate(px + (flip & 1 ? c : 0), py + (flip & 2 ? c : 0));
            ctx.scale(flip & 1 ? -1 : 1, flip & 2 ? -1 : 1);
            map.draw(ctx, tile, 0, 0, c);
            ctx.restore();
            continue;
          }
          // Java falls back to tile 0 when a tile ID can't be drawn.
          if (!map.draw(ctx, tile, px, py, c)) map.draw(ctx, 0, px, py, c);
        }
      }
      // The Painted style: ground of different kinds meets along wandering
      // lines instead of the squares' edges (js/blend.js).
      if (this.blendGround) drawGroundDetail(ctx, { x0, y0, n, c, tileAt: ground, toPx });
      // Big trees (js/trees.js): drawn below with everyone, back to front.
      if (this.bigTrees) {
        trees = treeDraws({ tileAt: seen, x0, y0, n, c, toPx });
        // A tree first known now (a new row coming into view) fades in
        // over a step's slide rather than popping up; not on the first
        // view, nor one that's been away.
        const was = this.treeSeen;
        // A fresh view (logging in, a teleport): none of the trees from
        // the last frame are still about, so they're all just there.
        const first = !trees.some((t) => was.has(`${t.x},${t.y}`));
        this.treeSeen = new Map();
        for (const t of trees) {
          const k = `${t.x},${t.y}`;
          const at = was.get(k) ?? (first ? now - TREE_FADE_MS : now);
          this.treeSeen.set(k, at);
          t.fade = Math.min(1, (now - at) / TREE_FADE_MS);
          if (t.fade < 1) treesFading = true;
        }
      }
    }

    // Ships at sea (js/ships.js), on the water and under whoever's aboard.
    const ships = this.ships?.list(now) ?? [];
    for (const s of ships) {
      const [px, py] = toPx(s.x, s.y);
      drawShip(ctx, px + c / 2, py + c / 2, c, s.heading, now, { ...s, toPx: (x) => toPx(x, 0)[0] + c / 2, toPy: (y) => toPx(0, y)[1] + c / 2 });
    }

    const list = world.drawList(now);
    const names = this.showNames || this.showNpcNames || this.showObjectNames ? world.displayNames() : null;
    const fontPx = Math.max(9, Math.round(c * 0.3));
    ctx.font = `${fontPx}px system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    const where = new Map();
    const self = this.gear ? world.self() : null;
    const dressing = !!this.gear; // the Painted style
    // Everyone and the big trees, back to front by where their feet are:
    // someone behind a tree is under its crown. A crown over the player's
    // own figure is see-through, so they're never lost.
    const me = world.self();
    const draws = list.map((e, i) => {
      const pos = world.visualPos(e, now);
      return { e, pos, key: pos.y + 0.95, i };
    });
    let mine = null;
    if (me && trees.length) {
      const pos = world.visualPos(me, now);
      const [mx, my] = toPx(pos.x, pos.y);
      mine = { key: pos.y + 0.95, left: mx + c * 0.2, right: mx + c * 0.8, top: my, bottom: my + c };
    }
    for (const t of trees) {
      const over = mine && t.key > mine.key && t.crown.left < mine.right && t.crown.right > mine.left && t.crown.top < mine.bottom && t.crown.bottom > mine.top;
      draws.push({ tree: t, alpha: (over ? 0.45 : 1) * (t.fade ?? 1), key: t.key, i: -1 });
    }
    draws.sort((a, b) => a.key - b.key || a.i - b.i);
    const labels = [];
    for (const d of draws) {
      if (d.tree) { d.tree.draw(ctx, d.alpha); continue; }
      const { e, pos } = d;
      const [px, py] = toPx(pos.x, pos.y);
      where.set(e.id, [px, py]);

      const flag = FLAG_COLORS[e.flag];
      if (flag) {
        ctx.strokeStyle = flag;
        ctx.lineWidth = Math.max(1, Math.round(c / 24));
        roundRect(ctx, px, py, c, c, c / 6);
      }

      const step = world.frameStep(e, now);
      // Storage barrels and chests are drawn by their kind.
      const storage = step === -1 && isStorage(e);
      // Props (type 3: furniture, people) by name too, as "prop <name>".
      const art = step !== -1 ? null : e.type === 4 ? this.named : e.type === 1 || e.type === 3 ? this.items : null;
      // A prop with a name of its own is drawn as the prop it copies.
      const propName = e.type === 3 ? bareName(e.name).toLowerCase() : '';
      const key = storage ? `storage ${storageKind(bareName(e.name))}` : e.type === 3 ? `prop ${this.propLooks.get(propName) ?? propName}` : bareName(e.name).toLowerCase();
      // Creatures painted by name step with a walking frame of their own
      // ("<name> walk", tools/paintart/bestiary.js), as players do.
      const byName = (art && art === this.named && world.walking(e, now) ? art.index.get(`${key} walk`) : undefined) ?? art?.index.get(key);
      if (byName !== undefined) art.sheet.draw(ctx, byName, px, py, c);
      else if (step === -1) sprites?.draw(ctx, e.image, px, py, c);
      else if (e === self) this.drawDressed(e.image, step, px, py, c, this.gear);
      else if (dressing && e.type === 0 && this.others.has(e.id)) this.drawDressed(e.image, step, px, py, c, this.others.get(e.id));
      else players?.draw(ctx, e.image * 8 + step, px, py, c);

      const kind = this.nameKind(e);
      if (names && !e.hideName && (kind === 'object' ? this.showObjectNames : kind === 'npc' ? this.showNpcNames : this.showNames)) {
        // Java: black copy one pixel left, then white, baseline on the
        // tile's bottom edge.
        labels.push([names.get(e.id) ?? e.name, px, py]);
      }
    }
    // Names last, over everything (trees included).
    const nudge = Math.max(1, Math.round(c / 36));
    for (const [label, px, py] of labels) {
      ctx.fillStyle = '#000';
      ctx.fillText(label, px - nudge, py + c - nudge);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, px, py + c - nudge);
    }

    this.drawEffects(where, now, c, toPx(cam.x, cam.y), toPx);
    this.drawHits(where, now, c);
    // Night and weather over it all (js/atmosphere.js).
    let weatherMoving = false;
    this.weatherState = null;
    if (this.atmosphere) {
      const tiles = [];
      for (let x = Math.floor(cam.x) - r; x <= Math.floor(cam.x) + r; x++) for (let y = Math.floor(cam.y) - r; y <= Math.floor(cam.y) + r; y++) tiles.push(world.tileAt(x, y, now));
      const st = this.atmosphere.state(Date.now(), outdoorShare(tiles, this.snowTiles), [Math.round(cam.x), Math.round(cam.y)]);
      const [sx, sy] = toPx(cam.x, cam.y);
      weatherMoving = this.atmosphere.draw(ctx, this.canvas.width, this.canvas.height, [sx + c / 2, sy + c / 2], c, st, now);
      this.weatherState = st; // for js/weather.js (the lighting layer)
      this.onWeather?.(st);
    }
    if (world.animating(now) || weatherMoving || ships.length || treesFading) this.invalidate();
  }

  // The player's own figure wearing their gear, painted once per change of
  // gear (8 frames) and kept.
  drawDressed(image, step, px, py, c, gear) {
    const key = `${image} ${gearKey(gear)}`;
    let strip = this.outfits.get(key);
    if (!strip) {
      strip = paintFigureStrip(LOOKS[image] ?? LOOKS[0], gear);
      this.outfits.set(key, strip);
      // Keep a few dozen; the oldest go first.
      if (this.outfits.size > 40) this.outfits.delete(this.outfits.keys().next().value);
    }
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(strip, step * OUT, 0, OUT, OUT, px, py, c, c);
  }

  setOtherGear(id, gear) {
    this.others.set(id, gear);
    this.invalidate();
  }

  setGear(gear) {
    this.gear = gear;
    this.invalidate();
  }

  // Whose name this is, for the name settings: 'people' (players and
  // creatures), 'npc' or 'object'.
  nameKind(e) {
    if (e.type === 0 || e.type === 4) return 'people';
    if (e.type === 2) return 'npc';
    if (e.type !== 3) return 'object';
    const name = bareName(e.name).toLowerCase();
    const look = this.propLooks.get(name) ?? name;
    if (this.talkers.has(name) || this.talkers.has(look) || this.propPeople.has(look) || /teller/.test(look)) return 'npc';
    return 'object';
  }

  // Spell effects over whoever they're on; 'self' is the player, or the
  // view's centre if their own entity hasn't arrived.
  drawEffects(where, now, c, centre, toPx) {
    const self = this.world.self();
    for (const fx of this.world.effects) {
      const at = typeof fx.on === 'object' ? toPx(fx.on.x, fx.on.y)
        : fx.on === 'self' ? (self && where.get(self.id)) ?? centre : where.get(fx.on);
      if (!at) continue;
      // Smooth in the Painted style (unless motion is reduced).
      if (this.paintedEffects && this.world.stepMs !== 0) drawPaintedEffect(this.ctx, fx, at[0], at[1], c, now);
      else drawEffect(this.ctx, fx, at[0], at[1], c, now, this.world.stepMs === 0);
    }
  }

  // Damage numbers rise from the creature hit and fade out. Several on one
  // creature at once (double attacks) stack upwards.
  drawHits(where, now, c) {
    const { ctx } = this;
    const size = Math.max(12, Math.round(c * 0.42));
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size / 5);
    const stack = new Map();
    for (const h of this.world.hits) {
      const at = where.get(h.id);
      if (!at) continue;
      const k = stack.get(h.id) ?? 0;
      stack.set(h.id, k + 1);
      const t = Math.min(1, (now - h.start) / HIT_MS);
      const x = at[0] + c / 2;
      const y = at[1] + c * (0.35 - 0.5 * t) - k * size * 0.9;
      ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      ctx.strokeStyle = '#000';
      ctx.strokeText(h.text, x, y);
      ctx.fillStyle = h.kind === 'hit' ? (h.text === '0' ? '#ffd24d' : '#ff4040') : '#d0d4dc';
      ctx.fillText(h.text, x, y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // View cell under a pointer event, or null outside the map.
  cellAt(event) {
    const r = this.canvas.getBoundingClientRect();
    const n = this.world.mapSize;
    const x = Math.floor(((event.clientX - r.left) / r.width) * n);
    const y = Math.floor(((event.clientY - r.top) / r.height) * n);
    return x >= 0 && y >= 0 && x < n && y < n ? [x, y] : null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const i = ctx.lineWidth / 2;
  ctx.beginPath();
  ctx.roundRect(x + i, y + i, w - 2 * i, h - 2 * i, r);
  ctx.stroke();
}
