// The explored map kept on the server as well as in the browser
// (server/MapStore.java), so it follows a character to another device.
// No DOM; tested in node.
//
// At login the client asks for everything ("mapload") and the server sends
// one line per 32x32 chunk, "Map: <cx,cy> <data>", then "Map: done <n>";
// those are folded into what this browser already knows (anything seen
// here wins). From then on each chunk that changes is sent back,
// "mapsave <cx,cy> <data>", a few at a time. The data is the chunk's tile
// IDs (little-endian 16-bit), deflated where the browser can ("z:"),
// else as they are ("b:"), in URL-safe base64; the server never reads it.

import { CHUNK, UNKNOWN } from './explored.js';

export const MAP_LOAD = 'mapload';
export const mapSave = (key, data) => `mapsave ${key} ${data}`;
const LINE = /^Map: (-?\d+,-?\d+) ([A-Za-z0-9:_=+/-]+)$/;
const DONE = /^Map: done (\d+)$/;

// { key, data } for a chunk line, { done: n } for the end, else null.
export function parseMapLine(text) {
  const t = text.trim();
  let m = LINE.exec(t);
  if (m) return { key: m[1], data: m[2] };
  m = DONE.exec(t);
  if (m) return { done: Number(m[1]) };
  return null;
}

const toB64 = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (text) => {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeChunk(tiles) {
  const bytes = new Uint8Array(tiles.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < tiles.length; i++) view.setUint16(i * 2, tiles[i], true);
  if (typeof CompressionStream === 'function') {
    try {
      return `z:${toB64(await pipe(bytes, new CompressionStream('deflate-raw')))}`;
    } catch {
      // Fall through to plain.
    }
  }
  return `b:${toB64(bytes)}`;
}

// The chunk's tiles, or null if the data is damaged or can't be read here.
export async function decodeChunk(data) {
  try {
    let bytes;
    if (data.startsWith('z:')) {
      if (typeof DecompressionStream !== 'function') return null;
      bytes = await pipe(fromB64(data.slice(2)), new DecompressionStream('deflate-raw'));
    } else if (data.startsWith('b:')) {
      bytes = fromB64(data.slice(2));
    } else {
      return null;
    }
    if (bytes.length !== CHUNK * CHUNK * 2) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tiles = new Uint16Array(CHUNK * CHUNK);
    for (let i = 0; i < tiles.length; i++) tiles[i] = view.getUint16(i * 2, true);
    return tiles;
  } catch {
    return null;
  }
}

export class MapSync {
  // send(cmd) sends a command; explored() is the Explored being kept;
  // onMerged() is called after the server's chunks are folded in.
  constructor({ send, explored, onMerged, perTick = 12 }) {
    this.send = send;
    this.explored = explored;
    this.onMerged = onMerged;
    this.perTick = perTick;
    this.reset();
  }

  // A new login: nothing is known about the server's copy yet.
  reset() {
    this.loaded = false;
    this.asked = 0;
    this.synced = new Map(); // "cx,cy" -> the data the server has
    this.pending = []; // decodes in flight
    this.busy = false;
  }

  // Asks for the server's copy (again, if the first went unanswered).
  load() {
    if (this.loaded) return;
    this.asked++;
    this.send(MAP_LOAD);
  }

  // Reads a server line; true if it was one of ours (keep it out of chat).
  feed(text) {
    const m = parseMapLine(text);
    if (!m) return false;
    if (m.done !== undefined) {
      Promise.all(this.pending).then(() => {
        this.pending = [];
        this.loaded = true;
        // Everything this browser knows is checked against the server's.
        for (const k of this.explored().chunks.keys()) this.explored().touched.add(k);
        this.onMerged?.();
      });
      return true;
    }
    this.synced.set(m.key, m.data);
    this.pending.push(decodeChunk(m.data).then((tiles) => {
      if (tiles) this.mergeChunk(m.key, tiles);
    }));
    return true;
  }

  mergeChunk(key, tiles) {
    const ex = this.explored();
    const [cx, cy] = key.split(',').map(Number);
    const dst = ex.chunkAt(cx, cy, true);
    let changed = false;
    for (let i = 0; i < tiles.length; i++) {
      if (dst[i] === UNKNOWN && tiles[i] !== UNKNOWN) {
        dst[i] = tiles[i];
        changed = true;
      }
    }
    if (changed) ex.dirty = true;
  }

  // Sends up to perTick changed chunks; call every so often.
  async tick() {
    if (!this.loaded || this.busy) return 0;
    const ex = this.explored();
    if (!ex.touched.size) return 0;
    this.busy = true;
    let sent = 0;
    try {
      for (const key of [...ex.touched]) {
        if (sent >= this.perTick) break;
        ex.touched.delete(key);
        const c = ex.chunks.get(key);
        if (!c) continue;
        const data = await encodeChunk(c);
        if (this.synced.get(key) === data) continue;
        this.send(mapSave(key, data));
        this.synced.set(key, data);
        sent++;
      }
    } finally {
      this.busy = false;
    }
    return sent;
  }
}
