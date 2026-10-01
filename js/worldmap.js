// The world map: everything you've explored (js/explored.js), big, in a
// window of its own, with the rest of the world under fog. It fills in as
// you walk, like the minimap, and draws with the minimap's baked chunks.
// Drag to move, the wheel or +/- to zoom, and "Here" to find yourself.
// Banks, shops and people with something to say are pinned where you've
// explored (markers, from the server), and so are your own notes: "+ Note"
// then a click to add one, a click on one to read or remove it.

import { CHUNK } from './explored.js';

const ZOOMS = [1, 2, 3, 4, 6, 8]; // CSS pixels per tile
const PINS = { bank: ['#e8c45a', '$'], shop: ['#6fd08a', '⚖'], quest: ['#ffd84a', '!'] };
const KIND_WORDS = { bank: 'bank', shop: 'shop', quest: 'has something to say' };

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
    this.markers = []; // [{ kind, name, x, y }]
    this.notes = []; // [{ x, y, text }]
    this.noteMode = false;
    this.onAddNote = null; // (x, y, text)
    this.onRemoveNote = null; // (x, y)
    this.onShow = null;
    this.bindPointer();
    el.querySelector('[data-map="in"]').addEventListener('click', () => this.zoomBy(1));
    el.querySelector('[data-map="out"]').addEventListener('click', () => this.zoomBy(-1));
    el.querySelector('[data-map="here"]').addEventListener('click', () => this.centreOnPlayer());
    el.querySelector('[data-map="close"]').addEventListener('click', () => this.close());
    this.noteBtn = el.querySelector('[data-map="note"]');
    this.noteBtn?.addEventListener('click', () => {
      this.noteMode = !this.noteMode;
      this.noteBtn.setAttribute('aria-pressed', String(this.noteMode));
      this.canvas.classList.toggle('placing', this.noteMode);
      this.say(this.noteMode ? 'Click the map where the note goes.' : null);
    });
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
    this.onShow?.();
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

  // A message in the bar instead of the explored count, until the next draw.
  say(text) {
    this.message = text;
    this.invalidate();
  }

  // The world square under a point on the canvas.
  tileAt(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return [Math.floor(this.cx + (clientX - r.left - r.width / 2) / this.zoom), Math.floor(this.cy + (clientY - r.top - r.height / 2) / this.zoom)];
  }

  // A note or marker near a point (within a few pixels), notes first.
  hit(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const near = (x, y) => {
      const sx = r.left + r.width / 2 + (x + 0.5 - this.cx) * this.zoom, sy = r.top + r.height / 2 + (y + 0.5 - this.cy) * this.zoom;
      return Math.hypot(sx - clientX, sy - clientY) <= 10;
    };
    const note = this.notes.find((n) => near(n.x, n.y));
    if (note) return { note };
    const marker = this.visibleMarkers().find((m) => near(m.x, m.y));
    return marker ? { marker } : null;
  }

  visibleMarkers() {
    return this.markers.filter((m) => this.minimap.explored.tileAt(m.x, m.y) !== null);
  }

  click(e) {
    const [x, y] = this.tileAt(e.clientX, e.clientY);
    if (this.noteMode) {
      this.noteMode = false;
      this.noteBtn?.setAttribute('aria-pressed', 'false');
      this.canvas.classList.remove('placing');
      const text = window.prompt(`A note at ${x}, ${y}:`);
      this.say(null);
      if (text?.trim()) this.onAddNote?.(x, y, text.trim());
      return;
    }
    const h = this.hit(e.clientX, e.clientY);
    if (h?.note) {
      if (window.confirm(`Your note at ${h.note.x}, ${h.note.y}:\n\n"${h.note.text}"\n\nRemove it?`)) this.onRemoveNote?.(h.note.x, h.note.y);
    } else if (h?.marker) {
      this.say(`${h.marker.name} (${KIND_WORDS[h.marker.kind] ?? h.marker.kind}) at ${h.marker.x}, ${h.marker.y}`);
    }
  }

  bindPointer() {
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: this.cx, cy: this.cy, moved: false };
      this.canvas.setPointerCapture?.(e.pointerId);
      this.canvas.classList.add('dragging');
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (drag?.id !== e.pointerId) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) { drag.moved = true; this.message = null; }
      this.cx = drag.cx - (e.clientX - drag.x) / this.zoom;
      this.cy = drag.cy - (e.clientY - drag.y) / this.zoom;
      this.invalidate();
    });
    const end = (e) => {
      if (drag?.id === e.pointerId) {
        if (!drag.moved && e.type === 'pointerup') this.click(e);
        drag = null;
      }
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
    // Pins: banks, shops and people to talk to where you've been, and your notes.
    const pin = (x, y, colour, glyph) => {
      const px = ox + (x + 0.5) * s, py = oy + (y + 0.5) * s;
      if (px < -20 || py < -20 || px > w + 20 || py > h + 20) return;
      const r = 7 * dpr;
      ctx.fillStyle = '#000a';
      ctx.beginPath(); ctx.arc(px, py, r + 1.5 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colour;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = `bold ${10 * dpr}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, px, py + 0.5 * dpr);
    };
    for (const m of this.visibleMarkers()) {
      const [colour, glyph] = PINS[m.kind] ?? ['#ccc', '?'];
      pin(m.x, m.y, colour, glyph);
    }
    for (const n of this.notes) pin(n.x, n.y, '#7ab8ff', '✎');
    if (this.message) {
      this.el.querySelector('[data-map="info"]').textContent = this.message;
      return;
    }
    this.el.querySelector('[data-map="info"]').textContent = tiles
      ? `${tiles.toLocaleString()} squares explored${this.player ? ` · you're at ${this.player.x}, ${this.player.y}` : ''}`
      : 'Nothing explored yet: walk around and the map fills in.';
  }
}
