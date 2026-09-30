// The world map: everything you've explored (js/explored.js), big, in a
// window of its own, with the rest of the world under fog. It fills in as
// you walk, like the minimap, and draws with the minimap's baked chunks.
// Drag to move, the wheel or +/- to zoom, and "Here" to find yourself.

import { CHUNK } from './explored.js';

const ZOOMS = [1, 2, 3, 4, 6, 8]; // CSS pixels per tile

export class WorldMap {
  // el: the dialog; minimap: the Minimap (its explored tiles and chunks).
  constructor(el, minimap) {
    this.el = el;
    this.minimap = minimap;
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.zoom = 3;
    this.cx = 0; // world tile at the centre of the view
    this.cy = 0;
    this.player = null; // { x, y }
    this.pending = false;
    this.bindPointer();
    el.querySelector('[data-map="in"]').addEventListener('click', () => this.zoomBy(1));
    el.querySelector('[data-map="out"]').addEventListener('click', () => this.zoomBy(-1));
    el.querySelector('[data-map="here"]').addEventListener('click', () => this.centreOnPlayer());
    el.querySelector('[data-map="close"]').addEventListener('click', () => this.close());
    new ResizeObserver(() => this.invalidate()).observe(this.canvas);
  }

  get open() {
    return !this.el.hidden;
  }

  toggle() {
    if (this.open) this.close();
    else this.show();
  }

  show() {
    this.el.hidden = false;
    this.fitZoom();
    this.centreOnPlayer();
    this.el.querySelector('[data-map="close"]').focus({ preventScroll: true });
  }

  close() {
    this.el.hidden = true;
  }

  setPlayer(x, y) {
    this.player = { x, y };
    if (this.open) this.invalidate();
  }

  centreOnPlayer() {
    if (this.player) {
      this.cx = this.player.x + 0.5;
      this.cy = this.player.y + 0.5;
    }
    this.invalidate();
  }

  // The zoom at which what you've explored fills most of the window.
  fitZoom() {
    const keys = [...this.minimap.explored.chunks.keys()].map((k) => k.split(',').map(Number));
    if (!keys.length) return;
    const xs = keys.map(([x]) => x), ys = keys.map(([, y]) => y);
    const tilesW = (Math.max(...xs) - Math.min(...xs) + 1) * CHUNK;
    const tilesH = (Math.max(...ys) - Math.min(...ys) + 1) * CHUNK;
    const fit = Math.min(this.canvas.clientWidth / tilesW, this.canvas.clientHeight / tilesH) * 0.8;
    this.zoom = [...ZOOMS].reverse().find((z) => z <= fit) ?? ZOOMS[0];
  }

  zoomBy(step) {
    const i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(this.zoom) + step));
    this.zoom = ZOOMS[i];
    this.invalidate();
  }

  bindPointer() {
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: this.cx, cy: this.cy };
      this.canvas.setPointerCapture?.(e.pointerId);
      this.canvas.classList.add('dragging');
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (drag?.id !== e.pointerId) return;
      this.cx = drag.cx - (e.clientX - drag.x) / this.zoom;
      this.cy = drag.cy - (e.clientY - drag.y) / this.zoom;
      this.invalidate();
    });
    const end = (e) => {
      if (drag?.id === e.pointerId) drag = null;
      this.canvas.classList.remove('dragging');
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
  }

  invalidate() {
    if (this.pending || !this.open) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.draw();
    });
  }

  draw() {
    const { canvas, ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    // The fog: the unexplored world.
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, w, h);
    const s = this.zoom * dpr;
    const ox = w / 2 - this.cx * s;
    const oy = h / 2 - this.cy * s;
    const explored = this.minimap.explored;
    let tiles = 0;
    ctx.imageSmoothingEnabled = s < 4;
    // A soft glow around explored land, so it reads as a lit region in
    // the fog rather than squares on black.
    ctx.shadowColor = 'rgba(210, 190, 140, 0.35)';
    ctx.shadowBlur = 6 * dpr;
    const side = CHUNK * s;
    for (const k of explored.chunks.keys()) {
      const [cx, cy] = k.split(',').map(Number);
      const x = Math.round(ox + cx * side), y = Math.round(oy + cy * side);
      if (x > w || y > h || x + side < 0 || y + side < 0) continue;
      const b = this.minimap.bakedChunk(cx, cy);
      if (b) ctx.drawImage(b, x, y, Math.ceil(side), Math.ceil(side));
    }
    ctx.shadowBlur = 0;
    for (const c of explored.chunks.values()) for (const t of c) if (t !== 0xffff) tiles++;
    // You.
    if (this.player) {
      const px = ox + (this.player.x + 0.5) * s, py = oy + (this.player.y + 0.5) * s;
      const r = Math.max(4 * dpr, s * 0.8);
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(px, py, r + 2 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
    this.el.querySelector('[data-map="info"]').textContent = tiles
      ? `${tiles.toLocaleString()} squares explored${this.player ? ` · you're at ${this.player.x}, ${this.player.y}` : ''}`
      : 'Nothing explored yet: walk around and the map fills in.';
  }
}
