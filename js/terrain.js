// Ground that blends (the Painted style), worked out pixel by pixel: every
// square of plain ground pulls its surroundings towards its own kind, most
// at its middle and fading out past its edges; each pixel, nudged about by
// smooth noise, takes the kind that pulls hardest. Where two pull about
// equally they're mixed, under a soft darker rim. So patches come out as
// smooth blobs whatever the squares do (corners, stripes, checkerboards).
//
// A square only depends on the 3 x 3 squares round it, and the rule is the
// same everywhere, so squares are worked out one at a time, once, and kept
// (keyed by their place and those nine tiles); they meet seamlessly. A
// square with only its own kind round it is just its tile.

import { groundKind, groundFlip } from './blend.js';

export const PX = 64; // pixels per square in the kept images
const KEEP = 1500; // squares kept
const INNER = 0.42, OUTER = 1.02; // full pull within, none beyond (squares, from the middle)
const WARP = 0.22; // how far the noise moves a pixel (squares)
const MIX = 0.09; // pull difference over which two kinds are mixed
const RIM = 0.2; // how dark the rim between them gets

function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
// Two octaves: broad wandering plus a little ruffle.
const warp = (x, y, seed) => (noise(x * 1.3, y * 1.3, seed) - 0.5) * 2 * WARP + (noise(x * 3.7, y * 3.7, seed + 9) - 0.5) * WARP * 0.6;

// How hard a square whose middle is (dx, dy) away pulls: 1 near, 0 far, on
// a rounded square (so a straight run of squares makes a straight-ish band).
export function pull(dx, dy) {
  const ax = dx * dx, ay = dy * dy;
  const d = Math.sqrt(Math.sqrt(ax * ax + ay * ay));
  if (d <= INNER) return 1;
  if (d >= OUTER) return 0;
  const t = (OUTER - d) / (OUTER - INNER);
  return t * t * (3 - 2 * t);
}

export class Terrain {
  constructor() {
    this.cells = new Map(); // key -> canvas or null
    this.textures = new Map(); // tile -> Uint8ClampedArray (PX x PX RGBA)
    this.sheet = null;
  }

  // The painted ground of a tile, PX square.
  texture(tile) {
    let t = this.textures.get(tile);
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = PX;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    this.sheet.draw(ctx, tile, 0, 0, PX);
    t = ctx.getImageData(0, 0, PX, PX).data;
    this.textures.set(tile, t);
    return t;
  }

  // The blended image of square (x, y), or null if it's plain (its own
  // tile, as usual). tileAt(x, y) -> the ground tile there (trees mapped
  // to their ground) or null. sheet: the painted map sheet.
  cell(x, y, tileAt, sheet) {
    if (sheet !== this.sheet) { this.sheet = sheet; this.cells.clear(); this.textures.clear(); }
    const tiles = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push(tileAt(x + dx, y + dy));
    const own = groundKind(tiles[4]);
    if (!own) return null;
    if (!tiles.some((t) => { const k = groundKind(t); return k && k !== own; })) return null;
    const key = `${x},${y}:${tiles.join(',')}`;
    if (this.cells.has(key)) {
      const img = this.cells.get(key);
      this.cells.delete(key); // most recent last
      this.cells.set(key, img);
      return img;
    }
    const img = this.paint(x, y, tiles);
    this.cells.set(key, img);
    if (this.cells.size > KEEP) this.cells.delete(this.cells.keys().next().value);
    return img;
  }

  paint(x, y, tiles) {
    // The squares round it that pull: their middles and kinds, and one
    // tile to paint each kind with (the nearest of it).
    const pullers = [];
    const kindTile = new Map();
    const order = [4, 1, 3, 5, 7, 0, 2, 6, 8]; // middle, then sides, then corners
    for (const i of order) {
      const k = groundKind(tiles[i]);
      if (!k) continue;
      pullers.push({ cx: x + (i % 3) - 1 + 0.5, cy: y + Math.floor(i / 3) - 1 + 0.5, k });
      if (!kindTile.has(k)) kindTile.set(k, tiles[i]);
    }
    const kinds = [...kindTile.keys()];
    for (const p of pullers) p.ki = kinds.indexOf(p.k);
    const tex = new Map(kinds.map((k) => [k, this.texture(kindTile.get(k))]));
    const flip = groundFlip(x, y, tiles[4]);
    const out = new ImageData(PX, PX);
    const o = out.data;
    const f = new Float32Array(kinds.length);
    // The warp is smooth: work it out every STEP pixels and fill in between.
    const STEP = 4, G = PX / STEP + 1;
    const gx = new Float32Array(G * G), gy = new Float32Array(G * G);
    for (let b = 0; b < G; b++) for (let a = 0; a < G; a++) {
      const wx = x + (a * STEP) / PX, wy = y + (b * STEP) / PX;
      gx[b * G + a] = warp(wx, wy, 1);
      gy[b * G + a] = warp(wx, wy, 2);
    }
    const lerp = (g, i, j) => {
      const a = i / STEP, b = j / STEP, a0 = Math.min(G - 2, Math.floor(a)), b0 = Math.min(G - 2, Math.floor(b));
      const fa = a - a0, fb = b - b0, k = b0 * G + a0;
      return (g[k] * (1 - fa) + g[k + 1] * fa) * (1 - fb) + (g[k + G] * (1 - fa) + g[k + G + 1] * fa) * fb;
    };
    for (let j = 0; j < PX; j++) {
      for (let i = 0; i < PX; i++) {
        const wx = x + (i + 0.5) / PX, wy = y + (j + 0.5) / PX;
        const px = wx + lerp(gx, i + 0.5, j + 0.5), py = wy + lerp(gy, i + 0.5, j + 0.5);
        f.fill(0);
        for (const p of pullers) {
          const dx = px - p.cx, dy = py - p.cy;
          if (dx >= OUTER || dx <= -OUTER || dy >= OUTER || dy <= -OUTER) continue;
          f[p.ki] += pull(dx, dy);
        }
        let a = 0, b = -1;
        for (let k = 1; k < kinds.length; k++) {
          if (f[k] > f[a]) { b = a; a = k; } else if (b < 0 || f[k] > f[b]) b = k;
        }
        // The texture where this pixel is (mirrored as the square is).
        const u = flip & 1 ? PX - 1 - i : i, v = flip & 2 ? PX - 1 - j : j;
        const at = (v * PX + u) * 4, dst = (j * PX + i) * 4;
        const ta = tex.get(kinds[a]);
        let r = ta[at], g = ta[at + 1], bl = ta[at + 2];
        if (b >= 0) {
          const gap = f[a] - f[b];
          if (gap < MIX) {
            const tb = tex.get(kinds[b]);
            const t = gap / MIX; // 0: even, 1: clearly a
            const w = 0.5 + 0.5 * t;
            r = r * w + tb[at] * (1 - w); g = g * w + tb[at + 1] * (1 - w); bl = bl * w + tb[at + 2] * (1 - w);
            const dark = 1 - RIM * (1 - t) ** 3;
            r *= dark; g *= dark; bl *= dark;
          }
        }
        o[dst] = r; o[dst + 1] = g; o[dst + 2] = bl; o[dst + 3] = 255;
      }
    }
    const c = document.createElement('canvas');
    c.width = c.height = PX;
    c.getContext('2d').putImageData(out, 0, 0);
    return c;
  }
}
