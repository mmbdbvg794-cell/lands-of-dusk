// Every map tile the player has seen, for the minimap. Opcode 2 only ever
// shows the squares around the player, so this remembers each tile ID as
// it comes into view, in 32x32 chunks keyed by world position.
//
// No DOM here, so it can be tested in node; js/minimap.js draws it.

export const CHUNK = 32;
export const UNKNOWN = 0xffff; // map.gif has a few hundred tiles, well short of this

const key = (cx, cy) => `${cx},${cy}`;

export class Explored {
  constructor() {
    this.chunks = new Map(); // "cx,cy" -> Uint16Array(CHUNK*CHUNK), UNKNOWN where unseen
    this.dirty = false; // changed since last saved; the saver clears it
  }

  chunkAt(cx, cy, create = false) {
    const k = key(cx, cy);
    let c = this.chunks.get(k);
    if (!c && create) {
      c = new Uint16Array(CHUNK * CHUNK).fill(UNKNOWN);
      this.chunks.set(k, c);
    }
    return c ?? null;
  }

  tileAt(x, y) {
    const c = this.chunkAt(Math.floor(x / CHUNK), Math.floor(y / CHUNK));
    if (!c) return null;
    const t = c[mod(y, CHUNK) * CHUNK + mod(x, CHUNK)];
    return t === UNKNOWN ? null : t;
  }

  // Records one opcode 2 view: `tiles[vx][vy]` around (x, y), as
  // World keeps it. Returns the squares that are new or changed, as
  // [x, y, tile], so the minimap can repaint just those.
  record(x, y, tiles) {
    const r = (tiles.length - 1) >> 1;
    const changed = [];
    for (let vx = 0; vx < tiles.length; vx++) {
      const col = tiles[vx];
      for (let vy = 0; vy < col.length; vy++) {
        const t = col[vy];
        if (!(t >= 0 && t < UNKNOWN)) continue;
        const wx = x - r + vx;
        const wy = y - r + vy;
        const c = this.chunkAt(Math.floor(wx / CHUNK), Math.floor(wy / CHUNK), true);
        const i = mod(wy, CHUNK) * CHUNK + mod(wx, CHUNK);
        if (c[i] === t) continue;
        c[i] = t;
        changed.push([wx, wy, t]);
      }
    }
    if (changed.length) this.dirty = true;
    return changed;
  }

  // Folds in a saved copy. What's already been seen this session wins,
  // since it's newer.
  merge(other) {
    for (const [k, src] of other.chunks) {
      const dst = this.chunks.get(k);
      if (!dst) {
        this.chunks.set(k, src.slice());
        continue;
      }
      for (let i = 0; i < src.length; i++) if (dst[i] === UNKNOWN) dst[i] = src[i];
    }
    this.dirty = true;
  }

  // Compact form for localStorage: { v, chunks: { "cx,cy": base64 } }, the
  // chunk bytes little-endian whatever the platform.
  serialize() {
    const chunks = {};
    for (const [k, c] of this.chunks) chunks[k] = toBase64(c);
    return JSON.stringify({ v: 1, chunk: CHUNK, chunks });
  }

  static deserialize(text) {
    const e = new Explored();
    try {
      const data = JSON.parse(text);
      if (data?.v !== 1 || data.chunk !== CHUNK) return e;
      for (const [k, b64] of Object.entries(data.chunks ?? {})) {
        if (!/^-?\d+,-?\d+$/.test(k)) continue;
        const c = fromBase64(b64);
        if (c) e.chunks.set(k, c);
      }
    } catch {
      // A damaged save just starts the map afresh.
    }
    return e;
  }
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function toBase64(chunk) {
  const bytes = new Uint8Array(chunk.length * 2);
  const dv = new DataView(bytes.buffer);
  chunk.forEach((t, i) => dv.setUint16(i * 2, t, true));
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64) {
  let s;
  try {
    s = atob(b64);
  } catch {
    return null;
  }
  if (s.length !== CHUNK * CHUNK * 2) return null;
  const c = new Uint16Array(CHUNK * CHUNK);
  for (let i = 0; i < c.length; i++) c[i] = s.charCodeAt(i * 2) | (s.charCodeAt(i * 2 + 1) << 8);
  return c;
}
