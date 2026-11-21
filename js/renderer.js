// Draws the World onto a <canvas>, following Dusk.java's update() and
// drawEntity(): tiles first, then entities in list order, each with its
// selection box, sprite and name.

import { HIT_MS, bareName, propLook } from './world.js';
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
import { usedUpLook } from './crafting.js';
import { npcOutfit, npcLayersFor, npcFacing, trimColour } from './npcoutfits.js';
import { creatureSheetFor, creatureFallback, hovers, hoverMs, sideDir, drawScale, scaledBox, creatureFxList, FX, WEAPON_FX, flicker, nameAbove, opaqueBox, WHOLE_FRAME, stripColour } from './creatures.js';
import { layoutLabels, layoutUnder } from './labels.js';
import { MAX_PILE, ITEM_LABEL_SCALE, itemTilt, itemOffset, itemFrameScale, pileLabel, showItemNames, isNear, groupPiles, pileKey } from './grounditems.js';
import { fxq, fxNextIn } from './fxquality.js';
import { loadSheet } from './sprites.js';

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
    this.rendered = null; // look -> SpriteSheet of 3D-rendered figures (Painted style, js/main.js)
    this.npcFacings = new Map(); // NPC id -> last facing (0 n, 1 s, 2 w, 3 e)
    this.creatureSides = new Map(); // creature id -> last side shown (2 w, 3 e), for side-on creatures
    this.labelWidths = new Map(); // label text -> width at the current font
    this.labelFont = '';
    this.creatures = null; // creature -> SpriteSheet of art/rendered/mob-<creature>.png, loaded lazily (Painted style, js/main.js)
    this.renderedLayers = null; // "look-slot[-kind]" -> SpriteSheet of a gear layer, rendered white
    this.tints = new Map(); // gear layer SpriteSheet -> Map(colour -> tinted SpriteSheet)
    this.cell = 0;
    this.pending = false;
    this.fxTimer = null; // the next effect tick's redraw (js/fxquality.js)
    this.redraws = 0; // maps drawn, for measuring
    fxq.onChange(() => this.invalidate()); // a level chosen, the tab back in view
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
    this.redraws++;
    this.hovering = false; // set by drawCreature when a flier is in view
    this.fxAnimating = false; // set by drawWithFx: an effect is in view
    this.fxNow = fxq.time(now); // effects move on their own capped clock
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
    // Items on the ground (Painted style): grouped by square, drawn small and scattered, at most
    // MAX_PILE a square, under anyone standing on the same row; their names only when wanted.
    const groundItems = dressing && this.items ? (this.groundList ??= []) : null;
    const itemLabels = [];
    if (groundItems) {
      groundItems.length = 0;
      for (const e of list) if (e.type === 1) groundItems.push(e);
      this.piles = groupPiles(groundItems, this.piles);
      const ptr = this.pointerSquare;
      const smallPx = Math.max(8, Math.round(fontPx * ITEM_LABEL_SCALE));
      for (const pile of this.piles.values()) {
        if (!pile.length) continue;
        const { x, y } = pile[0];
        const hover = !!ptr && ptr.x === x && ptr.y === y;
        if (!showItemNames({ setting: this.showItemNames, held: this.itemNamesHeld, hover, near: isNear(me, x, y) })) continue;
        const [px, py] = toPx(x, y);
        if (px + c < 0 || py + c < 0 || px > this.canvas.width || py > this.canvas.height) continue;
        const text = pileLabel(pile.map((e) => names?.get(e.id) ?? bareName(e.name)));
        itemLabels.push({ text, cx: px + c / 2, y: py + c - Math.max(1, Math.round(smallPx / 12)) });
      }
    }
    const draws = list.map((e, i) => {
      const pos = world.visualPos(e, now);
      return { e, pos, key: pos.y + (groundItems && e.type === 1 ? 0.9 : 0.95), i };
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
      let [px, py] = toPx(pos.x, pos.y);
      where.set(e.id, [px, py]);
      if (groundItems && e.type === 1) { this.drawGroundItem(e, px, py, c); continue; }
      // In a fight: a lunge toward the target and back (world.swingOf),
      // as far as the way they strike (swingStyle) goes.
      const sw = world.swingOf(e.id, now);
      if (sw) {
        sw.style = this.swingStyle?.(e) ?? 'slash';
        const lunge = Math.sin(sw.t * Math.PI) * LUNGE[sw.style] * c;
        px += sw.dx * lunge;
        py += sw.dy * lunge;
      }

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
      // A mined-out vein or picked patch keeps its name but not its picture
      // (js/crafting.js).
      const usedUp = e.type === 3 ? usedUpLook(propName, e.image) : null;
      const key = storage ? `storage ${storageKind(bareName(e.name))}` : usedUp ? `prop ${usedUp}` : e.type === 3 ? `prop ${propLook(this.propLooks, e) ?? propName}` : bareName(e.name).toLowerCase();
      // Creatures painted by name step with a walking frame of their own
      // ("<name> walk", tools/paintart/bestiary.js), as players do.
      const byName = (art && art === this.named && world.walking(e, now) ? art.index.get(`${key} walk`) : undefined) ?? art?.index.get(key);
      // People NPCs as 3D-rendered figures in their clothes (js/npcoutfits.js), Painted style only
      // (this.rendered/renderedLayers are null in Pixel).
      // Mobs that are animals the 3D renders cover (js/creatures.js), Painted style only
      // (this.creatures is null in Pixel); until a strip loads, or if it fails, the old picture.
      const creature = this.creatures && e.type === 4 ? this.creatureSheet(creatureSheetFor(bareName(e.name))) : null;
      // Merchants and people props also get their race's body for where they stand, and a
      // wardrobe from the job in their name; mobs only the named wardrobes.
      const npcWhere = e.type === 4 ? null : { x: e.x, y: e.y, look: propLook(this.propLooks, e), merchant: e.type === 2 };
      const outfit = !creature && this.rendered && this.renderedLayers && this.isPersonNpc(e) ? npcOutfit(bareName(e.name), npcWhere) : null;
      // a big creature's name goes over its head: the top of what was drawn (px)
      let nameTop = null;
      if (creature) {
        const top = this.drawCreature(e, creature, creatureSheetFor(bareName(e.name)), px, py, c, now);
        if (nameAbove(creatureSheetFor(bareName(e.name)), bareName(e.name))) nameTop = top;
      }
      else if (outfit && this.rendered.has(outfit.look)) this.drawNpc(e, outfit, px, py, c, now);
      else if (byName !== undefined) art.sheet.draw(ctx, byName, px, py, c);
      else if (step === -1) sprites?.draw(ctx, e.image, px, py, c);
      // 3D-rendered figures (art/rendered/lookN.png, Painted style only) in
      // place of the painted ones, for the looks that have one, with their
      // gear layers (art/rendered/layers.json).
      else if (e.type === 0 && this.rendered?.has(e.image)) this.drawRendered(e, step, px, py, c, now);
      else if (e === self) this.drawDressed(e.image, step, px, py, c, this.gear);
      else if (dressing && e.type === 0 && this.others.has(e.id)) this.drawDressed(e.image, step, px, py, c, this.others.get(e.id));
      else players?.draw(ctx, e.image * 8 + step, px, py, c);
      if (sw) (SWINGS[sw.style] ?? drawSwing)(ctx, px + c / 2, py + c / 2, c, sw);

      const kind = this.nameKind(e);
      if (names && !e.hideName && (kind === 'object' ? this.showObjectNames : kind === 'npc' ? this.showNpcNames : this.showNames)) {
        // Java: black copy one pixel left, then white, baseline on the
        // tile's bottom edge.
        labels.push([names.get(e.id) ?? e.name, px, py, e === me, nameTop]);
      }
    }
    // Names last, over everything (trees included).
    const nudge = Math.max(1, Math.round(c / 36));
    // Painted style: labels that would overprint each other are stacked apart, and
    // same-named neighbours share one ("black dog x3") (js/labels.js). Pixel as Java.
    const placed = dressing && (labels.length > 1 || itemLabels.length) ? this.layoutNameLabels(labels, c, nudge, fontPx) : null;
    // item names first and smaller, only where they don't cover a name
    if (placed && itemLabels.length) this.drawItemLabels(itemLabels, placed, fontPx, nudge);
    if (placed) {
      for (const { text, x, y } of placed) {
        ctx.fillStyle = '#000';
        ctx.fillText(text, x - nudge, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x, y);
      }
    } else {
      for (const [label, px, py, , top] of labels) {
        const y = labelBaseline(py, c, nudge, top);
        ctx.fillStyle = '#000';
        ctx.fillText(label, px - nudge, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, px, y);
      }
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
    if (world.animating(now) || weatherMoving || ships.length || treesFading || this.hovering) this.invalidate();
    else if (this.fxAnimating) this.fxRedrawLater(now);
  }

  // Effects alone in motion: the map is drawn again on the effect clock's next tick (20 or 10
  // a second, js/fxquality.js), not every display frame; never while the tab is hidden or the
  // window not focused (they stand still till it's back).
  fxRedrawLater(now) {
    const { fps } = fxq.settings;
    if (this.fxTimer || fxq.paused || !(fps > 0)) return;
    this.fxTimer = setTimeout(() => { this.fxTimer = null; this.invalidate(); }, Math.max(1, fxNextIn(now, fps) + 1));
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

  // Whether an entity is an NPC that could be a person: a mob (4), a merchant (2),
  // or a prop (3) the client already counts as a person (people.json or one who
  // talks), never a notice, stone or statue.
  isPersonNpc(e) {
    if (e.type === 4 || e.type === 2) return true;
    if (e.type !== 3) return false;
    const name = bareName(e.name).toLowerCase();
    if (/bounty|stone|statue|board/.test(name)) return false;
    return this.propPeople.has(name) || this.talkers.has(name);
  }

  // A people NPC: a rendered body plus its outfit's clothing layers, tinted, facing the
  // way it last stepped and walking in time with its slide.
  drawNpc(e, outfit, px, py, c, now) {
    const dir = npcFacing(e, this.npcFacings.get(e.id) ?? 1);
    this.npcFacings.set(e.id, dir);
    const step = dir * 2 + (this.world.walking(e, now) ? 1 : 0);
    const sheet = this.rendered.get(outfit.look);
    const n = renderedFrame(sheet.count, step, e, e.anim ? this.world.progress(e.anim.start, now, e.anim.ms) : 1);
    const [x, y, side] = scaledBox(px, py, c, outfit.scale ?? 1); // children smaller, feet in place
    sheet.draw(this.ctx, n, x, y, side);
    for (const [name, colour] of npcLayersFor(outfit, dir)) {
      const layer = this.renderedLayers.get(`${outfit.look}-${name}`);
      if (layer) this.tinted(layer, colour).draw(this.ctx, n, x, y, side);
    }
  }

  // A dropped item (Painted style): its picture at about two thirds of a square, a little below
  // the middle, tilted and (in a heap) nudged by its id, on a soft shadow; the 5th and later
  // items of a square aren't drawn. Off-screen ones are skipped.
  drawGroundItem(e, px, py, c) {
    if (px + c < 0 || py + c < 0 || px > this.canvas.width || py > this.canvas.height) return;
    const pile = this.piles?.get(pileKey(e.x, e.y));
    const rank = pile ? pile.indexOf(e) : 0;
    if (rank >= MAX_PILE) return;
    const n = pile ? Math.min(pile.length, MAX_PILE) : 1;
    const { ctx } = this;
    const art = this.items;
    const frame = art.index.get(bareName(e.name).toLowerCase());
    const box = frame !== undefined ? this.frameBox(art.sheet, frame) : WHOLE_FRAME;
    const k = frame !== undefined ? itemFrameScale(box) : 0.66; // the frame's size, in squares
    const [ox, oy] = itemOffset(e.id, n);
    const cx = px + c * (0.5 + ox), cy = py + c * (0.5 + oy);
    const bw = (box.right - box.left) * k * c, bh = (box.bottom - box.top) * k * c;
    // the shadow, under where it lies
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, cy + bh * 0.32, Math.max(bw, bh) * 0.42, Math.max(bw, bh) * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(cx, cy);
    ctx.rotate(itemTilt(e.id));
    const side = k * c;
    if (frame !== undefined) {
      // the picture's middle on the spot
      ctx.imageSmoothingEnabled = true;
      art.sheet.draw(ctx, frame, -side * (box.left + box.right) / 2, -side * (box.top + box.bottom) / 2, side);
    } else this.sheets?.sprites?.draw(ctx, e.image, -side / 2, -side / 2, side);
    ctx.restore();
  }

  // Item names under the people's (js/labels.js layoutUnder): smaller, centred under their
  // square, dropped where they'd cover a name.
  drawItemLabels(itemLabels, placed, fontPx, nudge) {
    const { ctx } = this;
    const font = ctx.font;
    const lineH = Math.round(fontPx * 1.15);
    const smallPx = Math.max(8, Math.round(fontPx * ITEM_LABEL_SCALE));
    ctx.font = `${smallPx}px system-ui, sans-serif`;
    const widths = (this.itemLabelWidths ??= new Map());
    if (widths.size > 300) widths.clear();
    const measure = (t) => {
      const key = `${smallPx} ${t}`;
      let w = widths.get(key);
      if (w === undefined) { w = ctx.measureText(t).width; widths.set(key, w); }
      return w;
    };
    for (const l of itemLabels) l.x = l.cx - measure(l.text) / 2;
    const fixed = placed.map((p) => (p.w === undefined ? { ...p, w: this.labelWidths.get(p.text) ?? ctx.measureText(p.text).width } : p));
    const small = Math.max(1, Math.round(nudge * 0.7));
    for (const { text, x, y } of layoutUnder(fixed, itemLabels, measure, lineH, Math.round(smallPx * 1.15))) {
      ctx.fillStyle = '#000';
      ctx.fillText(text, x - small, y);
      ctx.fillStyle = '#e8e0c8';
      ctx.fillText(text, x, y);
    }
    ctx.font = font;
  }

  // The on-screen labels laid out apart (js/labels.js); widths measured once per text and font.
  layoutNameLabels(labels, c, nudge, fontPx) {
    const font = this.ctx.font;
    if (font !== this.labelFont) { this.labelWidths.clear(); this.labelFont = font; }
    const measure = (t) => {
      let w = this.labelWidths.get(t);
      if (w === undefined) { w = this.ctx.measureText(t).width; this.labelWidths.set(t, w); }
      return w;
    };
    const W = this.canvas.width, H = this.canvas.height;
    const input = [];
    for (const [text, px, py, self, top] of labels) {
      if (px + c < 0 || py + c < 0 || px > W || py > H + c) continue; // off screen
      input.push({ text, x: px, y: labelBaseline(py, c, nudge, top), cx: px + measure(text) / 2, self });
    }
    return layoutLabels(input, measure, Math.round(fontPx * 1.15));
  }

  // A creature's strip, loading it the first time it's asked for (null until it has, and
  // for good if it fails, so the old picture stays).
  creatureSheet(name) {
    if (!name || !this.creatures) return null;
    if (!this.creatures.has(name)) {
      const creatures = this.creatures;
      creatures.set(name, null);
      loadSheet(`art/rendered/mob-${name}.png`).then((sheet) => {
        if (sheet) { creatures.set(name, sheet); this.invalidate(); }
      }).catch(() => {});
    }
    // a variant not loaded (yet, or ever): its plain creature (a coloured slime -> green)
    return this.creatures.get(name) ?? this.creatureSheet(creatureFallback(name));
  }

  // A rendered creature: facing the way it last stepped, walking in time with its slide.
  // Returns the canvas y of the top of its picture (for a name over its head).
  drawCreature(e, sheet, creature, px, py, c, now) {
    const facing = npcFacing(e, this.npcFacings.get(e.id) ?? 1);
    this.npcFacings.set(e.id, facing);
    // side-on creatures (snakes) show their last side instead of N/S
    const dir = sideDir(creature, facing, this.creatureSides.get(e.id));
    if (dir === 2 || dir === 3) this.creatureSides.set(e.id, dir);
    const walking = this.world.walking(e, now);
    const step = dir * 2 + (walking ? 1 : 0);
    const n = !walking && hovers(creature) ? hoverFrame(sheet.count, dir, now, hoverMs(creature)) : renderedFrame(sheet.count, step, e, e.anim ? this.world.progress(e.anim.start, now, e.anim.ms) : 1);
    if (!walking && hovers(creature)) this.hovering = true;
    const [x, y, side] = scaledBox(px, py, c, drawScale(creature, bareName(e.name)));
    const q = fxq.settings;
    const fxs = q.on ? creatureFxList(bareName(e.name), creature).map((f) => FX[f]).filter(Boolean) : [];
    const fxNow = this.fxNow ?? now;
    const bob = q.bob ? fxs.reduce((m, f) => Math.max(m, f.bob ?? 0), 0) * side * Math.sin(fxNow / 700 + e.id) : 0;
    const box = this.frameBox(sheet, n);
    if (fxs.length) {
      // where the picture is, for js/lighting.js's particles (by creature, this frame)
      const boxes = (this.fxBoxes ??= new Map());
      if (boxes.size > 400 && !boxes.has(e.id)) boxes.clear();
      boxes.set(e.id, box);
      this.drawWithFx(fxs, e, sheet, n, x, y + bob, side, fxNow, box);
    } else sheet.draw(this.ctx, n, x, y, side);
    return y + bob + side * box.top;
  }

  // The part of a frame its picture fills (js/creatures.js opaqueBox), worked out once per
  // sheet and frame from its pixels; the whole frame when they can't be read.
  frameBox(sheet, n) {
    const boxes = (this.frameBoxes ??= new WeakMap());
    let m = boxes.get(sheet);
    if (!m) boxes.set(sheet, (m = new Map()));
    if (m.has(n)) return m.get(n);
    let box = WHOLE_FRAME;
    try {
      const px = this.framePixels(sheet, n);
      if (px) box = opaqueBox(px.data, px.side, px.side);
    } catch {}
    m.set(n, box);
    return box;
  }

  // A frame's pixels at its own size, or null (no DOM, an unreadable image).
  framePixels(sheet, n) {
    if (typeof document === 'undefined' || !sheet.img || !sheet.size) return null;
    const side = sheet.size;
    const cv = (this.pixelCanvas ??= document.createElement('canvas'));
    if (cv.width !== side || cv.height !== side) { cv.width = side; cv.height = side; }
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, side, side);
    const sx = (n % sheet.cols) * side, sy = Math.floor(n / sheet.cols) * side;
    g.drawImage(sheet.img, sx, sy, side, side, 0, 0, side, side);
    const data = g.getImageData(0, 0, side, side).data;
    return data && data.length === side * side * 4 ? { data, side } : null;
  }

  // A creature's own colour as a glow ([r, g, b]), from its first frame, once per sheet; null
  // until it can be read (the effect's own colour is used meanwhile).
  sheetColour(sheet) {
    const cols = (this.sheetColours ??= new WeakMap());
    if (cols.has(sheet)) return cols.get(sheet);
    let col = null;
    try {
      const px = this.framePixels(sheet, 2); // facing south, standing
      if (px) col = stripColour(px.data);
    } catch {}
    cols.set(sheet, col);
    return col;
  }

  // A creature with effects (js/creatures.js FX; a list, the first one's tint on top): marks on
  // the ground at its feet, a light pool under it (flickering or pulsing), then its frame washed
  // toward the effects' colours, with a glint sweeping over it, maybe see-through. Its light on
  // the ground at night and its particles are js/lighting.js's and js/weather.js's. One scratch
  // canvas, reused; each glow made once per colour.
  drawWithFx(fxs, e, sheet, n, x, y, side, now, box = WHOLE_FRAME) {
    const { ctx } = this;
    const secs = now / 1000; // (the effect clock's now)
    const q = fxq.settings;
    const { ground } = q; // Low: no glow pools or ground patches
    // redrawn on the effect clock only while something on the canvas moves (a black dog's tint
    // and dark patch stand still; its smoke is the lighting layer's)
    if (fxs.some((f) => fxMovesOnCanvas(f, q))) this.fxAnimating = true;
    if (typeof document === 'undefined') { sheet.draw(ctx, n, x, y, side); return; }
    const lit = fxs.find((f) => f.light?.flicker);
    const fl = lit ? flicker(secs, e.id, lit.light.flicker * 2.5) : 1;
    // on the ground at the feet (normal paint): a dark vignette, a stain
    for (const f of fxs) {
      if (!f.ground || !ground) continue;
      const [r, g, b, a] = f.ground;
      const cx = x + side * (box.left + box.right) / 2, cy = y + side * (box.bottom - 0.04);
      const rx = side * Math.max(0.18, (box.right - box.left) * 0.6), ry = rx * 0.38;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.save();
      ctx.fillStyle = grad;
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.translate(-cx, -cy);
      ctx.beginPath();
      ctx.arc(cx, cy, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // the light pools: centred on the picture, about its size
    const bw = box.right - box.left, bh = box.bottom - box.top;
    const gx = x + side * (box.left + bw / 2), gy = y + side * (box.top + bh / 2);
    const reach = side * Math.max(0.3, Math.max(bw, bh));
    for (const f of fxs) {
      if (!f.glow || !ground) continue;
      const colour = f.glow === 'strip' ? this.sheetColour(sheet) ?? hexRgb(f.light?.color ?? 0xc0d0ff) : f.glow;
      const pulse = f.pulse ? 0.75 + 0.25 * Math.sin((secs / f.pulse) * Math.PI * 2 + e.id) : 1;
      const k = f === lit ? fl : pulse;
      const r = reach * k;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, f.glowAlpha * k);
      ctx.drawImage(this.fxGlow(colour), gx - r, gy - r * 0.8, r * 2, r * 1.6);
      ctx.restore();
    }
    // the figure: tinted, glinting, see-through
    const size = Math.max(1, Math.ceil(side));
    const cv = (this.fxCanvas ??= document.createElement('canvas'));
    if (cv.width !== size || cv.height !== size) { cv.width = size; cv.height = size; }
    const g = cv.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, size, size);
    sheet.draw(g, n, 0, 0, size);
    g.globalCompositeOperation = 'source-atop';
    for (const f of [...fxs].reverse()) {
      if (f.tint) {
        g.globalAlpha = f.tintAmount * (f === lit && f.flash ? 0.9 + (fl - 1) : 1);
        g.fillStyle = f.tint;
        g.fillRect(0, 0, size, size);
      }
      if (f.flash && f === lit) {
        g.globalAlpha = Math.max(0, 0.18 * (fl - 0.85));
        g.fillStyle = f.flash;
        g.fillRect(0, 0, size, size);
      }
      if (f.shine) {
        // a pale band sweeping down across the figure every few seconds
        const t = ((secs * 0.35 + e.id * 0.13) % 1) * 2.4 - 0.7;
        const band = g.createLinearGradient(0, size * (t - 0.25), size * 0.3, size * (t + 0.25));
        band.addColorStop(0, 'rgba(255,255,255,0)');
        band.addColorStop(0.5, 'rgba(235,248,255,1)');
        band.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = f.shine;
        g.fillStyle = band;
        g.fillRect(0, 0, size, size);
      }
    }
    // an aura: the glow's colour washed over the figure itself, pulsing with it (a wide ghost
    // hides most of the pool under it)
    for (const f of fxs) {
      if (!f.aura) continue;
      const colour = f.glow === 'strip' ? this.sheetColour(sheet) ?? hexRgb(f.light?.color ?? 0xc0d0ff) : f.glow;
      const pulse = f.pulse ? 0.75 + 0.25 * Math.sin((secs / f.pulse) * Math.PI * 2 + e.id) : 1;
      g.globalAlpha = f.aura * pulse;
      g.fillStyle = `rgb(${colour[0]},${colour[1]},${colour[2]})`;
      g.globalCompositeOperation = 'source-atop';
      g.fillRect(0, 0, size, size);
    }
    const alpha = fxs.reduce((m, f) => Math.min(m, f.alpha ?? 1), 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(cv, 0, 0, size, size, x, y, side, side);
    ctx.restore();
  }

  // A soft round light in a colour ([r, g, b]), made once per colour.
  fxGlow([r, gr, b]) {
    const glows = (this.fxGlows ??= new Map());
    const key = `${r},${gr},${b}`;
    if (glows.has(key)) return glows.get(key);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${r},${gr},${b},0.9)`);
    grad.addColorStop(0.4, `rgba(${r},${gr},${b},0.45)`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glows.set(key, cv);
    return cv;
  }

  drawRendered(e, step, px, py, c, now) {
    const sheet = this.rendered.get(e.image);
    const n = renderedFrame(sheet.count, step, e, e.anim ? this.world.progress(e.anim.start, now, e.anim.ms) : 1);
    sheet.draw(this.ctx, n, px, py, c);
    // Worn gear (Painted style): white layers rendered on the same body, tinted
    // with each item's colour and stacked in front-to-back order for the facing.
    if (!this.renderedLayers) return;
    const gear = e === this.world.self() ? this.gear : this.others.get(e.id);
    for (const { sheet: layer, colour } of renderedGearLayers(this.renderedLayers, e.image, gear, step >> 1)) {
      this.tinted(layer, colour).draw(this.ctx, n, px, py, c);
    }
    const wfx = fxq.settings.on && gear?.weapon?.fx ? WEAPON_FX[gear.weapon.fx] : null;
    const wlayer = wfx ? weaponLayer(this.renderedLayers, e.image, gear) : null;
    if (wlayer) this.drawWeaponFx(wfx, e, sheet, wlayer, n, px, py, c, step >> 1);
  }

  // A wielded weapon's effect (js/creatures.js WEAPON_FX), on the weapon layer's own pixels in
  // this frame (their box, worked out once per layer and frame), so it follows the swing and the
  // walk: a glow pool round it and a glint travelling along it. Its light and particles are
  // js/lighting.js's, from the box kept here for this redraw.
  drawWeaponFx(f, e, body, layer, n, px, py, c, dir) {
    const box = this.frameBox(layer, n);
    if (box === WHOLE_FRAME) return; // no weapon pixels this frame (or unreadable)
    (this.weaponBoxes ??= new Map()).set(e.id, { box, fx: f, at: this.redraws });
    if (this.weaponBoxes.size > 200) for (const [id, w] of this.weaponBoxes) if (w.at !== this.redraws) this.weaponBoxes.delete(id);
    if (typeof document === 'undefined') return;
    const { ctx } = this;
    const q = fxq.settings;
    if (fxMovesOnCanvas(f, q)) this.fxAnimating = true;
    const secs = (this.fxNow ?? performance.now()) / 1000;
    const bw = box.right - box.left, bh = box.bottom - box.top;
    const gx = px + c * (box.left + bw / 2), gy = py + c * (box.top + bh / 2);
    if (f.glow && q.ground) {
      const fl = f.light?.flicker ? flicker(secs, e.id, f.light.flicker * 2.5) : 1;
      const k = f.pulse ? 0.7 + 0.3 * Math.sin((secs / f.pulse) * Math.PI * 2 + e.id) : fl;
      const rx = c * Math.max(0.12, bw * 0.75) * (f.reach ?? 1) * k, ry = c * Math.max(0.12, bh * 0.75) * (f.reach ?? 1) * k;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, f.glowAlpha * k);
      ctx.drawImage(this.fxGlow(f.glow), gx - rx, gy - ry, rx * 2, ry * 2);
      ctx.restore();
    }
    if (f.glint) {
      // a bright band down the weapon's own pixels, now and then; where the weapon is behind
      // the body (facing away, or west) the body hides it
      const t = ((secs + e.id * 0.37) % f.glintEvery) / f.glintEvery * 1.8 - 0.4;
      if (t > 1.2) return;
      const size = Math.max(1, Math.ceil(c));
      const cv = (this.fxCanvas ??= document.createElement('canvas'));
      if (cv.width !== size || cv.height !== size) { cv.width = size; cv.height = size; }
      const g = cv.getContext('2d');
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.clearRect(0, 0, size, size);
      layer.draw(g, n, 0, 0, size);
      g.globalCompositeOperation = 'source-in';
      // along the weapon's long side: down a blade held up, across one held out
      const along = bw > bh;
      const [a0, len] = along ? [size * box.left, size * bw] : [size * box.top, size * bh];
      const p0 = a0 + len * (t - 0.2), p1 = a0 + len * (t + 0.2);
      const band = along ? g.createLinearGradient(p0, 0, p1, size * 0.15) : g.createLinearGradient(0, p0, size * 0.15, p1);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(240,248,255,1)');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = band;
      g.fillRect(0, 0, size, size);
      if (dir === 0 || dir === 2) {
        g.globalCompositeOperation = 'destination-out';
        body.draw(g, n, 0, 0, size);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = f.glint;
      ctx.drawImage(cv, 0, 0, size, size, px, py, c, c);
      ctx.restore();
    }
  }

  // A white gear layer multiplied by a colour (alpha kept), made once per colour.
  tinted(sheet, colour) {
    if (!colour || typeof document === 'undefined') return sheet;
    let byColour = this.tints.get(sheet);
    if (!byColour) { byColour = new Map(); this.tints.set(sheet, byColour); }
    let out = byColour.get(colour);
    if (!out) {
      const cv = document.createElement('canvas');
      cv.width = sheet.img.naturalWidth ?? sheet.img.width;
      cv.height = sheet.img.naturalHeight ?? sheet.img.height;
      const g = cv.getContext('2d');
      g.drawImage(sheet.img, 0, 0);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = colour;
      g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(sheet.img, 0, 0);
      cv.naturalWidth = cv.width; // SpriteSheet reads an image's natural size
      cv.naturalHeight = cv.height;
      out = new sheet.constructor(cv, sheet.size);
      byColour.set(colour, out);
    }
    return out;
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
    const look = propLook(this.propLooks, e) ?? name;
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

// A weapon's swing: a bright arc sweeping across the side facing the
// target as t goes 0 to 1, fading at the end. cx, cy: the attacker's centre.
function drawSwing(ctx, cx, cy, c, { t, dx, dy }) {
  const face = Math.atan2(dy, dx);
  const from = face - 1.2, to = face + 1.2;
  const head = from + (to - from) * Math.min(1, t * 1.4);
  const tail = Math.max(from, head - 1.1);
  const r = c * 0.7;
  const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.5 * alpha;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(4, c * 0.2);
  ctx.beginPath(); ctx.arc(cx, cy, r, tail, head); ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#fffbe8';
  ctx.lineWidth = Math.max(2, c * 0.07);
  ctx.beginPath(); ctx.arc(cx, cy, r, tail, head); ctx.stroke();
  // The blade at the leading edge.
  ctx.strokeStyle = '#d8dce4';
  ctx.lineWidth = Math.max(2, c * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(head) * r * 0.55, cy + Math.sin(head) * r * 0.55);
  ctx.lineTo(cx + Math.cos(head) * r * 1.08, cy + Math.sin(head) * r * 1.08);
  ctx.stroke();
  ctx.restore();
}

// How far each way of striking lunges (of a square).
const LUNGE = { slash: 0.2, stab: 0.3, chop: 0.16, claw: 0.22 };

// A weapon kind (js/gear.js weaponKind) -> how it strikes.
export function swingStyleFor(kind) {
  if (kind === 'dagger' || kind === 'spear') return 'stab';
  if (kind === 'axe' || kind === 'hammer' || kind === 'pick' || kind === 'shovel') return 'chop';
  if (kind === 'claw') return 'claw';
  return 'slash';
}

const fade = (t) => (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);

// A dagger's stab: the blade thrusts straight out at the target and back,
// a glint at its tip as it reaches.
function drawStab(ctx, cx, cy, c, { t, dx, dy }) {
  const reach = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const from = c * 0.2, to = c * (0.3 + 0.55 * reach);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade(t);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(4, c * 0.14);
  ctx.beginPath(); ctx.moveTo(cx + dx * from, cy + dy * from); ctx.lineTo(cx + dx * to, cy + dy * to); ctx.stroke();
  ctx.strokeStyle = '#e4e8ee';
  ctx.lineWidth = Math.max(2, c * 0.05);
  ctx.beginPath(); ctx.moveTo(cx + dx * from, cy + dy * from); ctx.lineTo(cx + dx * to, cy + dy * to); ctx.stroke();
  if (reach > 0.8) {
    const gx = cx + dx * to, gy = cy + dy * to, r = c * 0.12 * reach;
    ctx.strokeStyle = '#fffbe8';
    ctx.lineWidth = Math.max(1.5, c * 0.03);
    ctx.beginPath(); ctx.moveTo(gx - r, gy); ctx.lineTo(gx + r, gy); ctx.moveTo(gx, gy - r); ctx.lineTo(gx, gy + r); ctx.stroke();
  }
  ctx.restore();
}

// An axe's chop: a heavy arc brought down onto the target, then a burst
// where it lands.
function drawChop(ctx, cx, cy, c, { t, dx, dy }) {
  const face = Math.atan2(dy, dx);
  const from = face - 1.7, to = face + 0.15;
  const k = Math.min(1, t * 1.8);
  const head = from + (to - from) * k * k; // speeding up as it falls
  const r = c * 0.68;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade(t);
  ctx.strokeStyle = 'rgba(255,240,220,0.55)';
  ctx.lineWidth = Math.max(6, c * 0.26);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.max(from, head - 0.9), head); ctx.stroke();
  ctx.strokeStyle = '#f2e4cc';
  ctx.lineWidth = Math.max(2.5, c * 0.09);
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.max(from, head - 0.9), head); ctx.stroke();
  // The axe head at the leading edge: a short wedge across the arc.
  const hx = cx + Math.cos(head) * r, hy = cy + Math.sin(head) * r;
  ctx.fillStyle = '#c8ccd4';
  ctx.beginPath();
  ctx.arc(hx, hy, Math.max(3, c * 0.1), head - Math.PI / 2, head + Math.PI / 2);
  ctx.fill();
  if (k >= 1) {
    const bx = cx + Math.cos(to) * r, by = cy + Math.sin(to) * r, s = c * (0.1 + 0.25 * (t - 0.55));
    ctx.strokeStyle = '#fff2c0';
    ctx.lineWidth = Math.max(1.5, c * 0.04);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + face;
      ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * s * 0.4, by + Math.sin(a) * s * 0.4); ctx.lineTo(bx + Math.cos(a) * s, by + Math.sin(a) * s); ctx.stroke();
    }
  }
  ctx.restore();
}

// A creature's claws: three short rakes across the side facing its target,
// one after another.
function drawClaw(ctx, cx, cy, c, { t, dx, dy }) {
  const face = Math.atan2(dy, dx);
  const px = -dy, py = dx; // across the way it faces
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade(t);
  for (let i = 0; i < 3; i++) {
    const k = Math.max(0, Math.min(1, (t - i * 0.08) * 2.2));
    if (k <= 0) continue;
    const off = (i - 1) * c * 0.16;
    const mx = cx + Math.cos(face) * c * 0.6 + px * off, my = cy + Math.sin(face) * c * 0.6 + py * off;
    const len = c * 0.32;
    const sx = mx - (dx + px) * 0.7 * len / 2, sy = my - (dy + py) * 0.7 * len / 2;
    const ex = sx + (dx + px) * 0.7 * len * k, ey = sy + (dy + py) * 0.7 * len * k;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(3, c * 0.1);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#ffe8e0';
    ctx.lineWidth = Math.max(1.5, c * 0.035);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.restore();
}

export const SWINGS = { slash: drawSwing, stab: drawStab, chop: drawChop, claw: drawClaw };

// The frame of a 3D-rendered figure strip to draw. Strips of 8 frames are the
// classic standing/walking pair per direction; longer ones hold, per direction
// (n, s, w, e), standing then a walk cycle over two tiles, played in time with
// the slide (`progress` 0..1, 1 = arrived). Alternate tiles take the other half
// of the stride, so the legs alternate.
// A flier standing still (js/creatures.js hovers) keeps beating its wings: its walk
// cycle for the facing, played on the clock (HOVER_MS a frame).
export const HOVER_MS = 90;
export function hoverFrame(count, dir, now, ms = HOVER_MS) {
  const per = Math.floor(count / 4);
  if (per <= 2) return dir * 2;
  return dir * per + 1 + (Math.floor(now / ms) % (per - 1));
}

export function renderedFrame(count, step, e, progress) {
  const per = Math.floor(count / 4);
  if (per <= 2) return step;
  const base = (step >> 1) * per;
  if (progress >= 1) return base;
  const n = per - 1;
  const phase = ((((e.x + e.y) % 2) + 2) % 2 + progress) / 2;
  return base + 1 + Math.min(n - 1, Math.floor(phase * n));
}

// Which rendered gear layers to draw over a figure, in order, for what it wears
// (gear.js) and the way it faces (0 n, 1 s, 2 w, 3 e). A layer is found as
// "<look>-<slot>-<kind>" (e.g. 0-torso-robe), else "<look>-<slot>" for any kind.
// The weapon is in the right hand: behind the body facing north or west.
// The weapon layer a figure's wielded weapon is drawn with (as renderedGearLayers picks it), or null.
export function weaponLayer(layers, look, gear) {
  if (!layers || !gear?.weapon) return null;
  return layers.get(`${look}-weapon-${gear.weapon.kind}`) ?? layers.get(`${look}-weapon`) ?? null;
}

export function renderedGearLayers(layers, look, gear, dir) {
  if (!gear || !layers) return [];
  // A piece's layer, then its trim layer ("<key>-trim": edges, hems, plate bands) if there is
  // one, tinted a second colour (js/npcoutfits.js trimColour).
  const pick = (slot, item, colour, metal) => {
    if (!item) return [];
    const exact = `${look}-${slot}-${item.kind}`;
    const key = layers.has(exact) ? exact : `${look}-${slot}`;
    const sheet = layers.get(key);
    if (!sheet) return [];
    const trim = layers.get(`${key}-trim`);
    return trim ? [{ sheet, colour }, { sheet: trim, colour: trimColour(colour, metal) }] : [{ sheet, colour }];
  };
  // Leggings (gear.js: { colour, plate }): "legs-plate" greaves or "legs-cloth" trousers, under the torso.
  const legs = pick('legs', gear.legs && { kind: gear.legs.plate ? 'plate' : 'cloth' }, gear.legs?.colour, !!gear.legs?.plate);
  const torso = pick('torso', gear.torso, gear.torso?.colour, /plate|chain/.test(gear.torso?.kind ?? ''));
  // Boots/shoes (gear.js feet: { kind, colour }) over the trousers (their tops would otherwise
  // poke out beside the leg) and under the torso; a hood under any helm. The layers are the
  // NPC ones (look<N>-npc-boots/-shoes/-hood), drawn on players the same way.
  const feet = pick('npc', gear.feet, gear.feet?.colour, false);
  const hood = pick('npc', gear.hood && { kind: 'hood' }, gear.hood?.colour, false);
  const helm = pick('helm', gear.helm, gear.helm?.colour, true);
  const weapon = pick('weapon', gear.weapon, gear.weapon?.colour, true);
  const order = dir === 0 || dir === 2 ? [weapon, legs, feet, torso, hood, helm] : [legs, feet, torso, hood, helm, weapon];
  return order.flat();
}

// Whether an effect changes the figure from one moment to the next on the map canvas: a bob, a
// pulse, a sweeping shine, a flickering glow pool or flash. Particles and night lights don't
// count (they're the lighting layer's, which runs anyway).
export function fxMovesOnCanvas(f, q = { bob: true, ground: true }) {
  return !!((f.bob && q.bob) || (f.pulse && (f.aura || q.ground)) || f.shine || f.glint || (f.light?.flicker && (f.flash || (f.glow && q.ground))));
}

// A name label's baseline: under the feet (the square's bottom edge), or for a big creature
// just above the top of its picture.
export function labelBaseline(py, c, nudge, top = null) {
  return top == null ? py + c - nudge : Math.round(top - nudge * 2);
}

// 0xrrggbb -> [r, g, b].
function hexRgb(n) {
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
