// Plain ground in the Painted style: which tiles are plain ground and of
// what kind (js/terrain.js blends the kinds where they meet), mirroring
// square to square, and the patches of light and shade and the flowers
// drawn over it. Walls, trees, paths, water and shores are left square.

// Plain ground tiles -> the kind they blend as (like kinds don't blend).
const KINDS = {
  36: 'grass', 37: 'lush', 1: 'meadow',
  38: 'sand', 27: 'sand', 39: 'grit',
  40: 'dirt', 109: 'snow', 122: 'snow',
  104: 'rock', 95: 'rock',
  168: 'mud', 169: 'marsh', 172: 'marsh', // the swamp (tools/server/swamptiles.py)
};
export const groundKind = (tile) => KINDS[tile] ?? null;

function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Life in the ground (the Painted style), drawn over the blends: broad
// soft patches of light and shade, anchored to the world, so the same
// painting repeated square to square doesn't show as a grid; and tiny
// flowers scattered through grass and meadow.
const PATCH = 3; // squares between patch centres
const FLOWERS = ['#f4f1e4', '#f6e27a', '#e9a6c4', '#c9b8f0', '#f7f7f7'];
const FLOWERY = new Set(['grass', 'meadow', 'lush']);

export function drawGroundDetail(ctx, { x0, y0, n, c, tileAt, toPx }) {
  // Patches: a soft light or dark blob round each point of a coarse grid.
  const gx0 = Math.floor((x0 - 3) / PATCH), gy0 = Math.floor((y0 - 3) / PATCH);
  const gx1 = Math.ceil((x0 + n + 3) / PATCH), gy1 = Math.ceil((y0 + n + 3) / PATCH);
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gy = gy0; gy <= gy1; gy++) {
      const wx = gx * PATCH + hash(gx, gy, 51) * PATCH, wy = gy * PATCH + hash(gx, gy, 52) * PATCH;
      const [px, py] = toPx(wx, wy);
      const r = c * (1.6 + hash(gx, gy, 53) * 2.2);
      const dark = hash(gx, gy, 54) < 0.55;
      const a = 0.07 + hash(gx, gy, 55) * 0.1;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, dark ? `rgba(10, 24, 0, ${a})` : `rgba(255, 246, 200, ${a * 0.8})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
  // Flowers: a few on most squares of grass and meadow.
  const dot = Math.max(1, c / 36);
  for (let x = x0; x <= x0 + n; x++) {
    for (let y = y0; y <= y0 + n; y++) {
      if (!FLOWERY.has(groundKind(tileAt(x, y)))) continue;
      const count = Math.floor(hash(x, y, 60) * 5);
      if (!count) continue;
      const [px, py] = toPx(x, y);
      for (let i = 0; i < count; i++) {
        const u = hash(x * 7 + i, y, 61), v = hash(x, y * 7 + i, 62);
        ctx.fillStyle = FLOWERS[Math.floor(hash(x + i, y - i, 63) * FLOWERS.length)];
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(px + u * c, py + v * c, dot * (0.8 + hash(i, x, y) * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

// Whether to mirror a square of plain ground (bit 1: left-right, bit 2:
// up-down), so one painting repeated doesn't line up into a grid; the
// paintings repeat seamlessly, so mirrored squares still meet.
export const groundFlip = (x, y, tile) => (groundKind(tile) ? Math.floor(hash(x, y, 70) * 4) : 0);
