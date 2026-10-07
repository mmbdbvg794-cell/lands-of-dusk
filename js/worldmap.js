// The world map: everything you've explored (js/explored.js), big, in a
// window of its own, with the rest of the world under fog. It fills in as
// you walk, like the minimap, and draws with the minimap's baked chunks.
// Drag to move, the wheel or +/- to zoom, and "Here" to find yourself.
// Banks, shops and people with something to say are pinned where you've
// explored (markers, from the server), and so are your own notes: "+ Note"
// then a click to add one, a click on one to read or remove it.
// Gods see the whole world, no fog (setFull): a one-pixel-a-square
// overview when zoomed out, and the real tiles for what's in view when
// zoomed in.
// Gods also get a "Go to..." list of the towns and starting places (PLACES)
// that teleports them there, and can double-click the map to go anywhere.
// Underground places (js/atmosphere.js UNDERGROUND) are a world apart:
// down there the map shows only them; up here they're hidden.

import { CHUNK } from './explored.js';
import { UNDERGROUND } from './atmosphere.js';

const inBox = (u, x, y) => x >= u.x0 && x <= u.x1 && y >= u.y0 && y <= u.y1;

const ZOOMS = [1, 2, 3, 4, 6, 8]; // CSS pixels per tile
const PINS = { bank: ['#e8c45a', '$'], shop: ['#6fd08a', '⚖'], quest: ['#ffd84a', '!'] };
// Gods' quick jumps: [group, [[name, x, y], ...]] (walkable squares at
// each place's heart: plazas, piers, where the tutorials start).
export const PLACES = [
  ['The new lands', [
    ['Kingshaven', 1440, 352], ['Aelindor', 473, 1241], ['Aelindor Landing', 444, 1186],
    ['Velkarath (underground)', 1345, 912], ['Ssarakh', 1695, 943], ['Eastreach', 1680, 1306],
  ]],
  ['The old world', [
    ['City of Light', 104, 155], ['Westsea Harbour', 95, 355], ['Riverside', 186, 95], ['Midnight', 444, 84],
    ['Southfield', 540, 16], ['North-west village', 17, 29], ['West isle (MTH hall)', 195, 900], ['Frost hall', 262, 262],
  ]],
  ['Where races start', [
    ['Human tutorial', 125, 365], ['Grove of Waking (elves)', 415, 1307], ['Hatching Pools (lizardmen)', 1853, 1007],
  ]],
];

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
    this.full = null; // gods: the whole map (an Explored), else null
    this.overview = null; // { canvas, x0, y0 }
    this.fullBaked = new Map(); // "cx,cy" -> canvas, the most recent kept
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
    // Gods: the quick jumps, and a double-click to go anywhere.
    this.onGoto = null; // (x, y): teleport there
    this.gotoSel = el.querySelector('[data-map="goto"]');
    if (this.gotoSel) {
      const first = document.createElement('option');
      first.value = ''; first.textContent = 'Go to…';
      this.gotoSel.append(first, ...PLACES.map(([group, list]) => {
        const g = document.createElement('optgroup');
        g.label = group;
        g.append(...list.map(([name, x, y]) => Object.assign(document.createElement('option'), { value: `${x},${y}`, textContent: name })));
        return g;
      }));
      this.gotoSel.addEventListener('change', () => {
        const [x, y] = this.gotoSel.value.split(',').map(Number);
        this.gotoSel.value = '';
        if (Number.isFinite(x)) this.goto(x, y);
      });
    }
    this.canvas.addEventListener('dblclick', (e) => {
      if (!this.god || this.noteMode) return;
      this.goto(...this.tileAt(e.clientX, e.clientY));
    });
    new ResizeObserver(() => this.invalidate()).observe(this.canvas);
  }

  // Gods only: the "Go to..." list shows, and double-clicks teleport.
  set god(on) {
    this._god = !!on;
    if (this.gotoSel) this.gotoSel.hidden = !on;
  }
  get god() { return this._god ?? false; }

  goto(x, y) {
    if (!this.god || !this.onGoto) return;
    this.onGoto(x, y);
    this.cx = x; this.cy = y;
    this.invalidate();
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
  // The map drawn: the whole world for gods, else what you've explored.
  get source() {
    return this.full ?? this.minimap.explored;
  }

  // Gods: the whole map, and each tile's colour (Uint8Array, rgb per tile
  // ID) for the zoomed-out overview.
  setFull(explored, colours) {
    this.full = explored;
    this.colours = colours;
    this.fullBaked.clear();
    const keys = [...explored.chunks.keys()].map((k) => k.split(',').map(Number));
    if (!keys.length) return;
    const x0 = Math.min(...keys.map(([x]) => x)), y0 = Math.min(...keys.map(([, y]) => y));
    const x1 = Math.max(...keys.map(([x]) => x)), y1 = Math.max(...keys.map(([, y]) => y));
    const canvas = document.createElement('canvas');
    canvas.width = (x1 - x0 + 1) * CHUNK;
    canvas.height = (y1 - y0 + 1) * CHUNK;
    const g = canvas.getContext('2d');
    const img = g.createImageData(canvas.width, canvas.height);
    for (const [k, tiles] of explored.chunks) {
      const [cx, cy] = k.split(',').map(Number);
      for (let ty = 0; ty < CHUNK; ty++) {
        for (let tx = 0; tx < CHUNK; tx++) {
          const t = tiles[ty * CHUNK + tx];
          if (t === 0xffff) continue;
          const i = (((cy - y0) * CHUNK + ty) * canvas.width + (cx - x0) * CHUNK + tx) * 4;
          const c = colours && t * 3 + 2 < colours.length ? t * 3 : 0;
          img.data[i] = colours ? colours[c] : 90;
          img.data[i + 1] = colours ? colours[c + 1] : 90;
          img.data[i + 2] = colours ? colours[c + 2] : 90;
          img.data[i + 3] = 255;
        }
      }
    }
    g.putImageData(img, 0, 0);
    this.overview = { canvas, x0: x0 * CHUNK, y0: y0 * CHUNK };
    this.invalidate();
  }

  // A chunk of the whole map at full detail (kept for the last 200 drawn).
  fullChunk(cx, cy) {
    const k = `${cx},${cy}`;
    let b = this.fullBaked.get(k);
    if (b) {
      this.fullBaked.delete(k);
      this.fullBaked.set(k, b);
      return b;
    }
    const tiles = this.full.chunkAt(cx, cy);
    if (!tiles || !this.minimap.map) return null;
    b = document.createElement('canvas');
    b.width = b.height = CHUNK * 4;
    const g = b.getContext('2d');
    for (let ty = 0; ty < CHUNK; ty++) for (let tx = 0; tx < CHUNK; tx++) {
      const t = tiles[ty * CHUNK + tx];
      if (t !== 0xffff) this.minimap.bakeTile(g, tx, ty, t);
    }
    this.fullBaked.set(k, b);
    if (this.fullBaked.size > 200) this.fullBaked.delete(this.fullBaked.keys().next().value);
    return b;
  }

  fitZoom() {
    if (this.full) { this.zoom = 2; return; }
    const keys = [...this.minimap.explored.chunks.keys()].map((k) => k.split(',').map(Number))
      .filter(([x, y]) => this.shown(x * CHUNK + CHUNK / 2, y * CHUNK + CHUNK / 2));
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
    const note = this.notes.find((n) => this.shown(n.x, n.y) && near(n.x, n.y));
    if (note) return { note };
    const marker = this.visibleMarkers().find((m) => near(m.x, m.y));
    return marker ? { marker } : null;
  }

  // The underground place you're in, or null on the surface.
  get layer() {
    const p = this.player;
    return (p && UNDERGROUND.find((u) => inBox(u, p.x, p.y))) ?? null;
  }

  // Whether a square belongs on the map as it's drawn now (underground
  // squares only underground, and only that place's).
  shown(x, y) {
    const u = this.layer;
    return u ? inBox(u, x, y) : !UNDERGROUND.some((b) => inBox(b, x, y));
  }

  visibleMarkers() {
    return this.markers.filter((m) => this.shown(m.x, m.y) && this.source.tileAt(m.x, m.y) !== null);
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
    // Underground, nothing outside the place you're in.
    const under = this.layer;
    const boxRect = (u) => [ox + u.x0 * s, oy + u.y0 * s, (u.x1 - u.x0 + 1) * s, (u.y1 - u.y0 + 1) * s];
    ctx.save();
    if (under) { ctx.beginPath(); ctx.rect(...boxRect(under)); ctx.clip(); }
    if (this.full) {
      // Gods: the whole world. Zoomed out, the overview; zoomed in, the
      // real tiles for the chunks in view.
      const side = CHUNK * s;
      if (this.zoom < 4 && this.overview) {
        ctx.imageSmoothingEnabled = false;
        const o = this.overview;
        ctx.drawImage(o.canvas, Math.round(ox + o.x0 * s), Math.round(oy + o.y0 * s), Math.round(o.canvas.width * s), Math.round(o.canvas.height * s));
      } else {
        const c0 = Math.floor(-ox / side), c1 = Math.floor((w - ox) / side);
        const r0 = Math.floor(-oy / side), r1 = Math.floor((h - oy) / side);
        for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
          const b = this.fullChunk(cx, cy);
          if (b) ctx.drawImage(b, Math.round(ox + cx * side), Math.round(oy + cy * side), Math.ceil(side), Math.ceil(side));
        }
      }
    }
    if (!this.full) {
    // A soft glow around explored land, so it reads as a lit region in
    // the fog rather than squares on black.
    ctx.shadowColor = 'rgba(210, 190, 140, 0.35)';
    ctx.shadowBlur = 6 * dpr;
    const side = CHUNK * s;
    for (const k of explored.chunks.keys()) {
      const [cx, cy] = k.split(',').map(Number);
      // On the surface, chunks wholly underground aren't drawn at all (not
      // even their glow).
      if (!under && UNDERGROUND.some((u) => cx * CHUNK >= u.x0 && cx * CHUNK + CHUNK - 1 <= u.x1 && cy * CHUNK >= u.y0 && cy * CHUNK + CHUNK - 1 <= u.y1)) continue;
      const x = Math.round(ox + cx * side), y = Math.round(oy + cy * side);
      if (x > w || y > h || x + side < 0 || y + side < 0) continue;
      const b = this.minimap.bakedChunk(cx, cy);
      if (b) ctx.drawImage(b, x, y, Math.ceil(side), Math.ceil(side));
    }
    ctx.shadowBlur = 0;
    for (const c of explored.chunks.values()) for (const t of c) if (t !== 0xffff) tiles++;
    }
    ctx.restore();
    // On the surface, underground places are covered: by the sea around
    // them for gods (who'd otherwise see them in it), else by fog.
    if (!under) {
      const sea = this.colours && this.colours.length >= 3 ? `rgb(${this.colours[0]}, ${this.colours[1]}, ${this.colours[2]})` : '#1f3f8f';
      ctx.fillStyle = this.full ? sea : '#0b0c10';
      // Rounded out a pixel, so no edge of what's under it peeks through.
      for (const u of UNDERGROUND) {
        const [x, y, bw, bh] = boxRect(u);
        ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, Math.ceil(bw) + 3, Math.ceil(bh) + 3);
      }
    }
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
    for (const n of this.notes) if (this.shown(n.x, n.y)) pin(n.x, n.y, '#7ab8ff', '✎');
    if (this.message) {
      this.el.querySelector('[data-map="info"]').textContent = this.message;
      return;
    }
    if (this.full) {
      this.el.querySelector('[data-map="info"]').textContent = `${under ? 'Underground (god view)' : 'The whole world (god view)'}${this.player ? ` · you're at ${this.player.x}, ${this.player.y}` : ''}`;
      return;
    }
    this.el.querySelector('[data-map="info"]').textContent = tiles
      ? `${under ? 'Underground · ' : ''}${tiles.toLocaleString()} squares explored${this.player ? ` · you're at ${this.player.x}, ${this.player.y}` : ''}`
      : 'Nothing explored yet: walk around and the map fills in.';
  }
}

// Each tile's average colour, rgb per tile ID, from a tile sheet the page
// may read (the painted one: the game's own is on another server).
export function tileColours(sheet) {
  const img = sheet?.img;
  if (!img?.naturalWidth) return null;
  const size = sheet.size;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  let data;
  try {
    data = g.getImageData(0, 0, c.width, c.height).data;
  } catch {
    return null;
  }
  const out = new Uint8Array(sheet.count * 3);
  for (let i = 0; i < sheet.count; i++) {
    const x0 = (i % sheet.cols) * size, y0 = Math.floor(i / sheet.cols) * size;
    let r = 0, gr = 0, b = 0, n = 0;
    for (let y = y0; y < y0 + size; y += 4) for (let x = x0; x < x0 + size; x += 4) {
      const k = (y * c.width + x) * 4;
      r += data[k]; gr += data[k + 1]; b += data[k + 2]; n++;
    }
    out[i * 3] = r / n; out[i * 3 + 1] = gr / n; out[i * 3 + 2] = b / n;
  }
  return out;
}
