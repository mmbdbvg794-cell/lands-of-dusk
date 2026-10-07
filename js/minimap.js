// Draws the explored map (js/explored.js) as a small overview centred on
// the player, with unexplored ground left dark.
//
// Each tile is map.gif's own frame shrunk to a few pixels, which averages
// its colours without reading pixels back (the resource server may not
// allow that across origins). Tiles are baked into one small canvas per
// chunk as they're seen, so a redraw is a handful of drawImage calls.

import { CHUNK } from './explored.js';

const BAKE_PX = 4; // pixels per tile in the chunk canvases
export const ZOOMS = [4, 2, 1]; // CSS pixels per tile; clicking cycles through them

export class Minimap {
  constructor(canvas, explored) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.explored = explored;
    this.map = null; // the map.gif SpriteSheet
    this.baked = new Map(); // "cx,cy" -> canvas
    this.zoom = ZOOMS[0];
    this.x = 0;
    this.y = 0;
    this.pending = false;
    new ResizeObserver(() => this.invalidate()).observe(canvas);
  }

  setExplored(explored) {
    this.explored = explored;
    this.baked.clear();
    this.invalidate();
  }

  setSheet(map) {
    this.map = map;
    this.baked.clear();
    this.invalidate();
  }

  setCentre(x, y) {
    this.x = x;
    this.y = y;
    this.invalidate();
  }

  // Repaints just the tiles Explored.record() reported, in chunks that are
  // already baked; the rest are baked whole when first drawn.
  paint(changed) {
    for (const [x, y, t] of changed) {
      const b = this.baked.get(`${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`);
      if (b) this.bakeTile(b.getContext('2d'), mod(x, CHUNK), mod(y, CHUNK), t);
    }
    if (changed.length) this.invalidate();
  }

  invalidate() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.draw();
    });
  }

  cycleZoom() {
    this.zoom = ZOOMS[(ZOOMS.indexOf(this.zoom) + 1) % ZOOMS.length];
    this.invalidate();
    return this.zoom;
  }

  draw() {
    const { canvas, ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w === 0 || h === 0) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.fillStyle = '#07080a';
    ctx.fillRect(0, 0, w, h);
    if (!this.map) return;

    // Tile (tx, ty) sits at ((tx - x) * s + w/2, ...), with the player's
    // own square centred.
    const s = this.zoom * dpr;
    const ox = w / 2 - (this.x + 0.5) * s;
    const oy = h / 2 - (this.y + 0.5) * s;
    const cx0 = Math.floor(-ox / s / CHUNK);
    const cy0 = Math.floor(-oy / s / CHUNK);
    const cx1 = Math.floor((w - ox) / s / CHUNK);
    const cy1 = Math.floor((h - oy) / s / CHUNK);
    ctx.imageSmoothingEnabled = s < BAKE_PX;
    const side = CHUNK * s;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const b = this.bakedChunk(cx, cy);
        if (b) ctx.drawImage(b, Math.round(ox + cx * side), Math.round(oy + cy * side), Math.ceil(side), Math.ceil(side));
      }
    }

    // The player: a bright square with a dark ring so it shows on any ground.
    const px = Math.round(w / 2);
    const py = Math.round(h / 2);
    const r = Math.max(2 * dpr, s / 2 + dpr);
    ctx.fillStyle = '#000';
    ctx.fillRect(px - r - dpr, py - r - dpr, 2 * (r + dpr), 2 * (r + dpr));
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(px - r, py - r, 2 * r, 2 * r);
  }

  bakedChunk(cx, cy) {
    const k = `${cx},${cy}`;
    let b = this.baked.get(k);
    if (b) return b;
    const tiles = this.explored.chunkAt(cx, cy);
    // (No map sheet yet, just after logging in: nothing to draw with.)
    if (!tiles || !this.map) return null;
    b = document.createElement('canvas');
    b.width = b.height = CHUNK * BAKE_PX;
    const bctx = b.getContext('2d');
    for (let ty = 0; ty < CHUNK; ty++) {
      for (let tx = 0; tx < CHUNK; tx++) {
        const t = tiles[ty * CHUNK + tx];
        if (t !== 0xffff) this.bakeTile(bctx, tx, ty, t);
      }
    }
    this.baked.set(k, b);
    return b;
  }

  bakeTile(bctx, tx, ty, t) {
    bctx.imageSmoothingQuality = 'high';
    // Java draws tile 0 for an ID past the end of map.gif; so do we.
    if (!this.map.draw(bctx, t, tx * BAKE_PX, ty * BAKE_PX, BAKE_PX)) this.map.draw(bctx, 0, tx * BAKE_PX, ty * BAKE_PX, BAKE_PX);
  }
}

function mod(n, m) {
  return ((n % m) + m) % m;
}
