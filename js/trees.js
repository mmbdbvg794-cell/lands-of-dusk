// Big trees for the Painted style: a tree square is drawn as its ground,
// and over it, after all the ground, a tree about three squares across
// whose crown spreads over its neighbours, so a wood reads as one canopy
// instead of a grid of little trees. Painted here once, a few of each kind
// (oak, autumn, gold, palm), and placed from back to front with a little
// jitter from the square's place in the world. The Pixel style keeps the
// map's own tree squares.

// Tree tiles -> what grows there and the ground it stands on (a tile).
export const TREE_TILES = {
  64: { kind: 'oak', ground: 36 }, 103: { kind: 'oak', ground: 36 },
  25: { kind: 'autumn', ground: 1 }, 26: { kind: 'gold', ground: 1 },
  102: { kind: 'palm', ground: 36 }, 124: { kind: 'palm', ground: 38 },
};
const VARIANTS = { oak: 4, autumn: 3, gold: 3, palm: 3 };

// A sprite is S px square for three squares; the trunk's foot is at
// (S / 2, FOOT), which goes at the bottom middle of the tree's square.
export const S = 384;
const FOOT = 318;
export const SPAN = 3; // squares across

const PALETTES = {
  oak: { deep: [14, 32, 14], mid: [40, 78, 28], light: [100, 142, 54], glint: [166, 198, 102] },
  autumn: { deep: [70, 28, 12], mid: [148, 64, 22], light: [210, 118, 44], glint: [240, 182, 98] },
  gold: { deep: [80, 58, 14], mid: [164, 122, 30], light: [218, 176, 60], glint: [246, 222, 132] },
};

function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a})`;
const jitter = (c, amount, r) => c.map((v) => v + (r - 0.5) * amount);

function shadow(ctx, x, y, rx, ry, alpha) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
  g.addColorStop(0, `rgba(8, 16, 6, ${alpha})`);
  g.addColorStop(0.7, `rgba(8, 16, 6, ${alpha * 0.5})`);
  g.addColorStop(1, 'rgba(8, 16, 6, 0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A broadleaf tree: a few rounded lobes of leaf clusters over a trunk.
function paintBroadleaf(ctx, pal, seed) {
  const R = (n) => hash(n, seed, 7);
  const cx = S / 2;
  // Shadow, cast down and to the right.
  shadow(ctx, cx + 22, FOOT - 6, 132, 42, 0.42);
  // Trunk with a flared foot and roots, and two branches into the crown.
  const tg = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0);
  tg.addColorStop(0, '#5e3f24'); tg.addColorStop(0.45, '#8a6038'); tg.addColorStop(1, '#2e1d0e');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(cx - 30, FOOT + 4);
  ctx.quadraticCurveTo(cx - 14, FOOT - 6, cx - 12, FOOT - 70);
  ctx.lineTo(cx - 9, FOOT - 130);
  ctx.lineTo(cx + 9, FOOT - 130);
  ctx.lineTo(cx + 12, FOOT - 70);
  ctx.quadraticCurveTo(cx + 14, FOOT - 6, cx + 32, FOOT + 4);
  ctx.quadraticCurveTo(cx, FOOT - 4, cx - 30, FOOT + 4);
  ctx.fill();
  ctx.strokeStyle = tg;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx, FOOT - 110);
    ctx.quadraticCurveTo(cx + side * 30, FOOT - 140, cx + side * (52 + R(side + 3) * 20), FOOT - 170);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(30, 18, 8, 0.45)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const x = cx - 8 + i * 2.6 + R(i) * 2;
    ctx.beginPath(); ctx.moveTo(x, FOOT - 120); ctx.lineTo(x + (R(i + 9) - 0.5) * 5, FOOT - 8); ctx.stroke();
  }

  // The crown: lobes round a centre above the trunk.
  const ccx = cx + (R(1) - 0.5) * 16, ccy = 150 + (R(2) - 0.5) * 16;
  const lobes = [];
  const n = 5 + Math.floor(R(3) * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R(i + 10) * 0.8;
    const d = 46 + R(i + 20) * 26;
    lobes.push({ x: ccx + Math.cos(a) * d, y: ccy + Math.sin(a) * d * 0.82, r: 56 + R(i + 30) * 22 });
  }
  lobes.push({ x: ccx, y: ccy, r: 72 });
  // Leaf clusters inside the lobes; the back lobes first, so the front
  // ones sit over them.
  lobes.sort((p, q) => p.y - q.y);
  const clusters = [];
  lobes.forEach((lobe, li) => {
    const count = Math.round(lobe.r * 2.4);
    for (let i = 0; i < count; i++) {
      const a = R(li * 1000 + i + 200) * Math.PI * 2, d = Math.sqrt(R(li * 1000 + i + 300)) * lobe.r;
      clusters.push({ x: lobe.x + Math.cos(a) * d, y: lobe.y + Math.sin(a) * d * 0.9, r: 6 + R(li * 1000 + i + 400) * 7, k: R(li * 1000 + i + 500), lobe });
    }
  });
  // How lit a spot is: each lobe lit from its upper left, and the whole
  // crown too, so the lobes stand apart.
  const clampT = (v) => Math.max(0, Math.min(1, v));
  const lit = (x, y, lobe) => {
    const whole = clampT(0.55 - (x - ccx) / 170 - (y - ccy) / 130);
    if (!lobe) return whole;
    const own = clampT(0.62 - (x - lobe.x) / (lobe.r * 1.25) - (y - lobe.y) / (lobe.r * 1.05));
    return own * 0.65 + whole * 0.35;
  };
  // Each lobe: its dark edge and underside, then its leaves, lit from the
  // upper left; the next lobe's edge then shades the one behind it.
  for (const lobe of lobes) {
    const own = clusters.filter((c) => c.lobe === lobe);
    for (const c of own) {
      ctx.fillStyle = rgba(jitter(pal.deep, 16, c.k), 0.97);
      ctx.beginPath(); ctx.arc(c.x + 2, c.y + 4, c.r + 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const c of own.sort((p, q) => p.y - q.y)) {
      const t = lit(c.x, c.y, lobe);
      const col = mix(mix(pal.deep, pal.mid, 0.35 + t * 0.65), pal.light, t * t * 0.9);
      ctx.fillStyle = rgba(jitter(col, 26, c.k), 0.94);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.82, c.k * 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Leaf dabs and glints where the light falls.
  for (let i = 0; i < 700; i++) {
    const c = clusters[Math.floor(R(i + 600) * clusters.length)];
    const t = lit(c.x, c.y, c.lobe);
    if (R(i + 700) > t * t + 0.05) continue;
    const x = c.x + (R(i + 800) - 0.5) * c.r * 1.5, y = c.y + (R(i + 900) - 0.5) * c.r * 1.3;
    ctx.fillStyle = rgba(mix(pal.light, pal.glint, R(i + 1000)), 0.5 + t * 0.4);
    ctx.beginPath(); ctx.ellipse(x, y, 2.4 + R(i) * 2.4, 1.6 + R(i + 1) * 1.4, R(i + 2) * 3, 0, Math.PI * 2); ctx.fill();
  }
  // Dark gaps between leaves, for depth.
  for (let i = 0; i < 160; i++) {
    const c = clusters[Math.floor(R(i + 1100) * clusters.length)];
    if (lit(c.x, c.y, c.lobe) > 0.4) continue;
    ctx.fillStyle = rgba(pal.deep, 0.55);
    ctx.beginPath(); ctx.ellipse(c.x + (R(i + 1200) - 0.5) * c.r, c.y + (R(i + 1300) - 0.5) * c.r, 2 + R(i + 1400) * 2.5, 1.5 + R(i + 1500) * 2, R(i) * 3, 0, Math.PI * 2); ctx.fill();
  }
}

// A palm: a tall curved ringed trunk and long drooping fronds.
function paintPalm(ctx, seed) {
  const R = (n) => hash(n, seed, 11);
  const cx = S / 2;
  const lean = (R(1) - 0.5) * 60;
  shadow(ctx, cx + 30, FOOT - 4, 90, 26, 0.35);
  const trunk = (t) => [
    cx + lean * t * t + Math.sin(t * Math.PI) * 10 * (R(2) - 0.5),
    FOOT - t * 200,
  ];
  for (let t = 0; t <= 1; t += 0.01) {
    const [x, y] = trunk(t);
    const w = 11 - t * 4;
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, '#6a4a2a'); g.addColorStop(0.5, '#a07a4a'); g.addColorStop(1, '#46301a');
    ctx.fillStyle = g;
    ctx.fillRect(x - w, y - 2, w * 2, 4);
  }
  ctx.strokeStyle = 'rgba(50, 30, 12, 0.5)';
  ctx.lineWidth = 2;
  for (let t = 0.05; t < 0.95; t += 0.05) {
    const [x, y] = trunk(t);
    ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.lineTo(x + 10, y - 2); ctx.stroke();
  }
  const top = trunk(1);
  const fronds = 11;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + R(i + 3) * 0.3;
    const len = 110 + R(i + 9) * 30;
    const droop = 50 + R(i + 19) * 30;
    const pt = (t) => [top[0] + Math.cos(a) * len * t, top[1] + Math.sin(a) * len * t * 0.55 - Math.sin(t * Math.PI) * 26 + t * t * droop];
    const shade = 0.3 + 0.7 * Math.max(0, Math.min(1, 0.6 - Math.cos(a) * 0.3 - Math.sin(a) * 0.4));
    for (let t = 0.08; t < 1; t += 0.025) {
      const [x, y] = pt(t), [x2, y2] = pt(t + 0.02);
      const dx = x2 - x, dy = y2 - y, dl = Math.hypot(dx, dy) || 1;
      const nx = -dy / dl, ny = dx / dl;
      const leaf = 26 * Math.sin(t * Math.PI) * (0.8 + R(i * 50 + Math.round(t * 100)) * 0.4);
      for (const side of [-1, 1]) {
        ctx.strokeStyle = rgba(mix([24, 60, 20], [110, 166, 64], shade * (0.65 + R(i * 90 + Math.round(t * 300) + side) * 0.35)), 0.92);
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + nx * side * leaf * 0.6 + dx, y + ny * side * leaf * 0.6 + dy + 4, x + nx * side * leaf + dx * 2, y + ny * side * leaf + dy * 2 + 9);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = '#4a3a1c';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(top[0] + (R(i + 60) - 0.5) * 14, top[1] + 6 + R(i + 70) * 6, 5, 0, Math.PI * 2); ctx.fill(); }
}

function paintOne(kind, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  if (kind === 'palm') paintPalm(ctx, seed);
  else paintBroadleaf(ctx, PALETTES[kind], seed);
  return c;
}

// The sprites, painted on first use: kind -> [canvas].
let sprites = null;
export function treeSprites() {
  if (!sprites) {
    sprites = {};
    for (const [kind, n] of Object.entries(VARIANTS)) sprites[kind] = Array.from({ length: n }, (_, i) => paintOne(kind, 17 + i * 31));
  }
  return sprites;
}

// The trees to draw around the view: [{ x, y, tile }] for tree squares in
// x0-1..x0+n+1, y0-1..y0+n+2 (a crown reaches up and to the sides of its
// square), back to front.
export function treesAround(tileAt, x0, y0, n) {
  const out = [];
  for (let y = y0 - 1; y <= y0 + n + 2; y++) for (let x = x0 - 1; x <= x0 + n + 1; x++) {
    const t = tileAt(x, y);
    if (TREE_TILES[t]) out.push({ x, y, tile: t });
  }
  return out;
}

// Where a tree goes and how big: the sprite's top left and size in pixels,
// for a square at px, py of size c, with a little jitter from (x, y).
export function treePlace(x, y, px, py, c) {
  const scale = 0.88 + hash(x, y, 5) * 0.24;
  const size = SPAN * c * scale;
  const fx = px + c / 2 + (hash(x, y, 6) - 0.5) * c * 0.3, fy = py + c * 0.92 + (hash(x, y, 8) - 0.5) * c * 0.12;
  return { left: fx - size / 2, top: fy - (FOOT / S) * size, size, variant: hash(x, y, 9) };
}

// The trees around the view, each with where its foot is (key: world y,
// for drawing back to front with everyone else), its crown's box in
// pixels (to see whether it hides someone) and a draw(ctx, alpha).
export function treeDraws({ tileAt, x0, y0, n, c, toPx }) {
  const all = treeSprites();
  return treesAround(tileAt, x0, y0, n).map((tr) => {
    const [px, py] = toPx(tr.x, tr.y);
    const p = treePlace(tr.x, tr.y, px, py, c);
    const list = all[TREE_TILES[tr.tile].kind];
    const img = list[Math.floor(p.variant * list.length)];
    const foot = p.top + (FOOT / S) * p.size;
    return {
      key: tr.y + (foot - py) / c,
      crown: { left: p.left + p.size * 0.15, right: p.left + p.size * 0.85, top: p.top + p.size * 0.12, bottom: foot - c * 0.35 },
      draw(ctx, alpha = 1) {
        if (alpha < 1) { ctx.save(); ctx.globalAlpha = alpha; }
        ctx.drawImage(img, p.left, p.top, p.size, p.size);
        if (alpha < 1) ctx.restore();
      },
    };
  });
}
