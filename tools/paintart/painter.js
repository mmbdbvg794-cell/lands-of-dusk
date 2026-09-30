// The "Painted" art style: repaints the server's map tiles in a new,
// hand-styled look (soft shading, visible brush detail, outlined shapes),
// keeping what each tile *is*. Runs in a browser page (tools/paintart/
// index.html); see tools/paintart/README for how it's generated.
//
// Ground tiles are read as a map of materials: each pixel is matched to
// the nearest of a few reference colours (water, grass, sand...). The map
// is upscaled with smooth boundaries, and each material is filled with a
// texture drawn in world space with a period of one tile, so neighbouring
// tiles line up into one continuous surface. Shorelines get foam, other
// borders a soft shadow. Trees are painted from scratch on top of their
// ground. Tiles it doesn't know yet are copied from the original art.

export const OUT = 128; // output frame size

// Reference colours, measured from the plain tiles of this server's map.gif.
const MATERIALS = {
  water: { ref: [19, 52, 171], ground: true },
  pond: { ref: [3, 72, 91], ground: true },
  meadow: { ref: [100, 91, 22], ground: true },
  grass: { ref: [62, 110, 15], ground: true },
  sand: { ref: [182, 161, 112], ground: true },
  path: { ref: [118, 101, 48], ground: true },
  dirt: { ref: [112, 61, 6], ground: true },
  snow: { ref: [241, 242, 242], ground: true },
};
const NAMES = Object.keys(MATERIALS);
const WET = new Set(['water', 'pond']);

// Trees: tile -> [kind, ground]. Everything else that isn't plain ground
// keeps the original art for now.
const TREES = {
  25: ['autumn', 'meadow'], 26: ['autumn-gold', 'meadow'], 64: ['oak', 'grass'],
  103: ['oak', 'grass'], 102: ['palm', 'grass'], 124: ['palm', 'sand'],
};
// Ground tiles to repaint: the plain and transition tiles on this map.
const GROUND = new Set([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 27, 28, 29, 30, 31, 32, 33, 34, 36,
  ...range(65, 89), ...range(109, 121),
]);

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

// ---- noise that tiles with a period of one frame ----

function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Value noise on a grid of `cells` per frame, wrapping at the frame edge.
function noise(u, v, cells, seed) {
  const x = u * cells, y = v * cells;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const w = (n) => ((n % cells) + cells) % cells;
  const a = hash(w(x0), w(y0), seed), b = hash(w(x0 + 1), w(y0), seed);
  const c = hash(w(x0), w(y0 + 1), seed), d = hash(w(x0 + 1), w(y0 + 1), seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(u, v, seed, cells = 4, octaves = 4) {
  let s = 0, amp = 0.5, total = 0;
  for (let o = 0; o < octaves; o++) {
    s += amp * noise(u, v, cells << o, seed + o * 17);
    total += amp;
    amp *= 0.5;
  }
  return s / total;
}
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const clamp = (x) => Math.max(0, Math.min(255, x));

// ---- the textures, one per material, in world space (u, v in 0..1) ----

const PAINT = {
  grass(u, v) {
    const n = fbm(u, v, 1), m = fbm(u, v, 9, 8, 2);
    let c = mix([54, 104, 32], [96, 150, 48], n);
    c = mix(c, [40, 80, 28], Math.max(0, m - 0.6) * 1.5);
    return c;
  },
  meadow(u, v) {
    const n = fbm(u, v, 2), m = fbm(u, v, 11, 8, 2);
    let c = mix([104, 116, 38], [150, 156, 60], n);
    c = mix(c, [86, 92, 34], Math.max(0, m - 0.6) * 1.5);
    return c;
  },
  water(u, v) {
    // Every open-water square is this same tile, so anything distinctive
    // repeats across a lake in a grid: only gentle, fine shading here, and
    // a few faint sparkles. The shoreline foam gives the water its shape.
    const n = fbm(u, v, 3, 6, 3);
    let c = mix([28, 70, 156], [40, 92, 178], n);
    const sp = hash(Math.floor(u * 128), Math.floor(v * 128), 13);
    if (sp > 0.996) c = mix(c, [190, 220, 245], 0.45);
    return c;
  },
  pond(u, v) {
    const n = fbm(u, v, 4, 3);
    return mix([12, 70, 84], [32, 110, 118], n);
  },
  sand(u, v) {
    const n = fbm(u, v, 6), s = hash(Math.floor(u * 128), Math.floor(v * 128), 3);
    let c = mix([196, 172, 118], [226, 204, 150], n);
    if (s > 0.94) c = mix(c, [150, 124, 84], 0.5);
    return c;
  },
  path(u, v) {
    const n = fbm(u, v, 7), s = hash(Math.floor(u * 64), Math.floor(v * 64), 5);
    let c = mix([128, 102, 64], [168, 138, 90], n);
    if (s > 0.9) c = mix(c, [96, 80, 56], 0.6);
    return c;
  },
  dirt(u, v) {
    const n = fbm(u, v, 8);
    return mix([104, 64, 30], [146, 96, 50], n);
  },
  snow(u, v) {
    const n = fbm(u, v, 10, 3), s = hash(Math.floor(u * 128), Math.floor(v * 128), 7);
    let c = mix([206, 220, 236], [250, 252, 255], n);
    if (s > 0.985) c = [255, 255, 255];
    return c;
  },
};

// ---- reading a tile as materials ----

function classify(pixels) {
  // Nearest reference colour per pixel, then a 3x3 majority vote to clear
  // the speckle the originals' dithering leaves.
  const labels = new Array(32 * 32);
  for (let i = 0; i < 32 * 32; i++) {
    const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
    let best = 0, bestD = Infinity;
    NAMES.forEach((name, k) => {
      const [R, G, B] = MATERIALS[name].ref;
      const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2;
      if (d < bestD) { bestD = d; best = k; }
    });
    labels[i] = best;
  }
  const out = labels.slice();
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const votes = new Array(NAMES.length).fill(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = Math.min(31, Math.max(0, x + dx)), yy = Math.min(31, Math.max(0, y + dy));
        votes[labels[yy * 32 + xx]]++;
      }
      out[y * 32 + x] = votes.indexOf(Math.max(...votes));
    }
  }
  return out;
}

// Upscales the labels to OUT x OUT with smooth boundaries: each material's
// weight is sampled bilinearly, and the heaviest wins.
function upscaleLabels(labels) {
  const out = new Int8Array(OUT * OUT);
  const edge = new Float32Array(OUT * OUT); // how close to a border (0..1)
  const at = (x, y, k) => (labels[Math.min(31, Math.max(0, y)) * 32 + Math.min(31, Math.max(0, x))] === k ? 1 : 0);
  const present = [...new Set(labels)];
  for (let Y = 0; Y < OUT; Y++) {
    for (let X = 0; X < OUT; X++) {
      const fx = (X + 0.5) / (OUT / 32) - 0.5, fy = (Y + 0.5) / (OUT / 32) - 0.5;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      let best = present[0], bestW = -1, second = 0;
      for (const k of present) {
        const w = at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty)
          + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty;
        if (w > bestW) { second = bestW; bestW = w; best = k; } else if (w > second) second = w;
      }
      out[Y * OUT + X] = best;
      edge[Y * OUT + X] = present.length > 1 ? Math.max(0, 1 - (bestW - Math.max(0, second)) * 2.2) : 0;
    }
  }
  return { out, edge };
}

function paintGround(ctx, labels) {
  const { out, edge } = upscaleLabels(labels);
  const img = ctx.createImageData(OUT, OUT);
  for (let Y = 0; Y < OUT; Y++) {
    for (let X = 0; X < OUT; X++) {
      const i = Y * OUT + X;
      const name = NAMES[out[i]];
      let c = PAINT[name](X / OUT, Y / OUT);
      const e = edge[i];
      if (e > 0) {
        // Borders: foam where water meets land, a soft shadow elsewhere.
        if (WET.has(name)) c = mix(c, [220, 236, 244], Math.min(1, e * 1.1));
        else c = mix(c, [40, 34, 20], e * 0.35);
      }
      const o = i * 4;
      img.data[o] = clamp(c[0]); img.data[o + 1] = clamp(c[1]); img.data[o + 2] = clamp(c[2]); img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function fillMaterial(ctx, name) {
  const labels = new Array(32 * 32).fill(NAMES.indexOf(name));
  paintGround(ctx, labels);
}

// ---- trees ----

// Trees are built up like a painting: shadow, trunk, then the canopy in
// layers of small leaf clusters, dark underneath and dappled with light on
// the upper left, with no hard outline. Colours vary a little per cluster.

const PALETTES = {
  oak: { deep: [24, 52, 20], mid: [52, 96, 34], light: [118, 160, 62], glint: [178, 206, 110] },
  autumn: { deep: [74, 30, 12], mid: [150, 66, 22], light: [212, 120, 44], glint: [240, 180, 96] },
  'autumn-gold': { deep: [84, 60, 14], mid: [168, 124, 30], light: [220, 178, 60], glint: [246, 222, 130] },
};
const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(clamp(v))).join(',')},${a})`;

function jitter(c, amount, r) {
  return c.map((v) => v + (r - 0.5) * amount);
}

function paintTree(ctx, kind, seed) {
  const R = (n) => hash(n, seed, 91);
  ctx.save();
  // A soft shadow on the ground.
  const sg = ctx.createRadialGradient(66, 110, 4, 66, 110, 40);
  sg.addColorStop(0, 'rgba(10, 20, 6, 0.45)');
  sg.addColorStop(1, 'rgba(10, 20, 6, 0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(66, 110, 40, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'palm') {
    paintPalm(ctx, R);
    ctx.restore();
    return;
  }
  const pal = PALETTES[kind];

  // Trunk: tapering, with bark streaks and a hint of roots.
  const tg = ctx.createLinearGradient(58, 0, 74, 0);
  tg.addColorStop(0, '#6e4a2a');
  tg.addColorStop(0.45, '#8a6038');
  tg.addColorStop(1, '#3e2814');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(54, 112); ctx.quadraticCurveTo(60, 106, 61, 78); ctx.lineTo(71, 78);
  ctx.quadraticCurveTo(72, 106, 80, 112); ctx.quadraticCurveTo(67, 108, 54, 112);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 24, 10, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = 62 + i * 2 + R(i) * 1.5;
    ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x + (R(i + 5) - 0.5) * 3, 106); ctx.stroke();
  }

  // Canopy clusters, scattered inside an uneven outline.
  const clusters = [];
  for (let i = 0; i < 70; i++) {
    const a = R(i + 100) * Math.PI * 2;
    const rim = 30 + fbm(Math.cos(a) * 0.3 + 0.5, Math.sin(a) * 0.3 + 0.5, seed, 3, 2) * 14;
    const d = Math.sqrt(R(i + 200)) * rim;
    clusters.push({ x: 66 + Math.cos(a) * d, y: 50 + Math.sin(a) * d * 0.8, r: 5 + R(i + 300) * 5, k: R(i + 400) });
  }
  // How lit a spot is: from the upper left, and higher is lighter.
  const lit = (x, y) => Math.max(0, Math.min(1, 0.55 - (x - 66) / 90 - (y - 50) / 70));
  // Back layer: darker and a little larger, which reads as the canopy's edge.
  for (const c of clusters) {
    ctx.fillStyle = rgba(jitter(pal.deep, 24, c.k), 0.95);
    ctx.beginPath(); ctx.arc(c.x, c.y + 2, c.r + 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Body: shade to light by where the cluster sits.
  for (const c of [...clusters].sort((p, q) => p.y - q.y)) {
    const t = lit(c.x, c.y);
    const col = mix(mix(pal.deep, pal.mid, 0.6 + t * 0.4), pal.light, t * 0.8);
    ctx.fillStyle = rgba(jitter(col, 30, c.k), 0.9);
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.85, c.k * 3, 0, Math.PI * 2); ctx.fill();
  }
  // Dappled light: small leaf dabs where the light falls.
  for (let i = 0; i < 90; i++) {
    const c = clusters[Math.floor(R(i + 500) * clusters.length)];
    const t = lit(c.x, c.y);
    if (R(i + 600) > t + 0.15) continue;
    const x = c.x + (R(i + 700) - 0.5) * c.r * 1.4, y = c.y + (R(i + 800) - 0.5) * c.r * 1.2;
    ctx.fillStyle = rgba(mix(pal.light, pal.glint, R(i + 900)), 0.55 + t * 0.35);
    ctx.beginPath(); ctx.ellipse(x, y, 1.8 + R(i) * 1.6, 1.2 + R(i + 1) * 1, R(i + 2) * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// A palm: a curved, ringed trunk and feathery fronds made of many thin
// leaflets, with no hard outline.
function paintPalm(ctx, R) {
  const trunk = (t) => [
    (1 - t) ** 3 * 60 + 3 * (1 - t) ** 2 * t * 55 + 3 * (1 - t) * t * t * 60 + t ** 3 * 68,
    (1 - t) ** 3 * 114 + 3 * (1 - t) ** 2 * t * 90 + 3 * (1 - t) * t * t * 62 + t ** 3 * 40,
  ];
  for (let t = 0; t <= 1; t += 0.02) {
    const [x, y] = trunk(t);
    const w = 5.5 - t * 1.8;
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, '#6a4a2a'); g.addColorStop(0.5, '#9c7446'); g.addColorStop(1, '#4a3018');
    ctx.fillStyle = g;
    ctx.fillRect(x - w, y - 1.5, w * 2, 3);
  }
  ctx.strokeStyle = 'rgba(50, 30, 12, 0.55)';
  ctx.lineWidth = 1.2;
  for (let t = 0.06; t < 0.95; t += 0.08) {
    const [x, y] = trunk(t);
    ctx.beginPath(); ctx.moveTo(x - 5, y + 1); ctx.lineTo(x + 5, y - 1); ctx.stroke();
  }
  const top = trunk(1);
  const fronds = 10;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + R(i) * 0.35;
    const len = 44 + R(i + 9) * 12;
    const droop = 22 + R(i + 19) * 10;
    // The frond's rib as a curve; leaflets hang off both sides.
    const pt = (t) => [
      top[0] + Math.cos(a) * len * t,
      top[1] + Math.sin(a) * len * t * 0.5 - Math.sin(t * Math.PI) * 10 + t * t * droop,
    ];
    const shade = 0.35 + 0.65 * Math.max(0, Math.min(1, 0.6 - Math.cos(a) * 0.3 - Math.sin(a) * 0.4));
    for (let t = 0.12; t < 1; t += 0.045) {
      const [x, y] = pt(t), [x2, y2] = pt(t + 0.03);
      const dx = x2 - x, dy = y2 - y, dl = Math.hypot(dx, dy) || 1;
      const nx = -dy / dl, ny = dx / dl;
      const leaf = 11 * Math.sin(t * Math.PI) * (0.8 + R(i * 40 + t * 100) * 0.4);
      for (const side of [-1, 1]) {
        const col = mix([28, 66, 22], [104, 160, 60], shade * (0.7 + R(i * 80 + t * 200 + side) * 0.3));
        ctx.strokeStyle = rgba(col, 0.9);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + nx * side * leaf * 0.6 + dx, y + ny * side * leaf * 0.6 + dy + 2, x + nx * side * leaf + dx * 2, y + ny * side * leaf + dy * 2 + 4);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = rgba(mix([40, 70, 24], [120, 150, 70], shade), 0.9);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.05) { const [x, y] = pt(t); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  for (const [dx, dy] of [[-4, 4], [4, 5], [0, 8]]) {
    const g = ctx.createRadialGradient(top[0] + dx - 1.5, top[1] + dy - 1.5, 0.5, top[0] + dx, top[1] + dy, 4.5);
    g.addColorStop(0, '#a88450'); g.addColorStop(1, '#4a2e12');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(top[0] + dx, top[1] + dy, 4.5, 0, Math.PI * 2); ctx.fill();
  }
}

// ---- surfaces: stone, brick, wood, floors, lava, ice ----
//
// Each draws a whole OUT x OUT frame. Like the ground, the patterns repeat
// exactly once per frame, so neighbouring tiles line up.

// Cellular noise that wraps once per frame: the distance to the nearest
// and second-nearest of n x n jittered points, and which point is nearest.
function worley(u, v, n, seed) {
  const x = u * n, y = v * n, cx = Math.floor(x), cy = Math.floor(y);
  let d1 = 9, d2 = 9, id = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const gx = cx + dx, gy = cy + dy;
      const wx = ((gx % n) + n) % n, wy = ((gy % n) + n) % n;
      const px = gx + 0.15 + hash(wx, wy, seed) * 0.7, py = gy + 0.15 + hash(wx, wy, seed + 1) * 0.7;
      const d = Math.hypot(x - px, y - py);
      if (d < d1) { d2 = d1; d1 = d; id = wx * 97 + wy; } else if (d < d2) d2 = d;
    }
  }
  return { d1, d2, id };
}

function drawPixels(ctx, fn) {
  const img = ctx.createImageData(OUT, OUT);
  for (let Y = 0; Y < OUT; Y++) {
    for (let X = 0; X < OUT; X++) {
      const c = fn(X / OUT, Y / OUT, X, Y);
      const o = (Y * OUT + X) * 4;
      img.data[o] = clamp(c[0]); img.data[o + 1] = clamp(c[1]); img.data[o + 2] = clamp(c[2]); img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Rounded stones set in mortar: each cell shaded like a pebble, lit from
// the upper left, darker in the gaps.
function stones(cells, seed, palette, mortar, gap = 0.12) {
  return (u, v) => {
    const w = worley(u, v, cells, seed);
    const e = w.d2 - w.d1;
    const pick = hash(w.id, seed, 5);
    const base = mix(palette[0], palette[1], pick);
    // Light: sample slightly up-left; nearer that cell's centre is brighter.
    const wl = worley(u - 0.012, v - 0.012, cells, seed);
    const lit = wl.id === w.id ? Math.max(0, 0.35 - wl.d1) * 1.2 : 0;
    let c = mix(base, [255, 250, 235], lit * 0.5);
    c = mix(c, [0, 0, 0], Math.min(0.45, w.d1 * 0.5));
    c = mix(c, c.map((x) => x * (0.85 + fbm(u, v, seed + 3, 16, 2) * 0.3)), 1);
    if (e < gap) c = mix(mortar, c, e / gap);
    return c;
  };
}
const cobble = stones(5, 21, [[150, 128, 98], [196, 176, 140]], [70, 56, 40]);
const flagstone = stones(3, 23, [[108, 108, 106], [150, 150, 146]], [52, 52, 50], 0.08);
const paleFlagstone = stones(3, 27, [[170, 170, 166], [212, 212, 206]], [80, 80, 76], 0.08);
const crackedEarth = stones(4, 29, [[150, 78, 30], [184, 104, 44]], [70, 34, 12], 0.05);

function brick(u, v, dark) {
  const rows = 8, row = Math.floor(v * rows), bw = 1 / 4;
  const off = row % 2 ? bw / 2 : 0;
  const col = Math.floor((u + off) / bw);
  const fy = v * rows - row, fx = ((u + off) / bw) - col;
  const id = row * 13 + ((col % 4) + 4) % 4;
  let c = mix(dark ? [120, 40, 36] : [168, 70, 56], dark ? [150, 56, 48] : [196, 98, 80], hash(id, 3, 7));
  c = mix(c, c.map((x) => x * (0.8 + fbm(u, v, 31, 16, 2) * 0.4)), 1);
  if (fy < 0.18) c = mix(c, [255, 220, 200], 0.18);
  if (fy > 0.82) c = mix(c, [0, 0, 0], 0.25);
  if (fy < 0.08 || fx < 0.04) c = [196, 184, 168].map((x) => x * (0.75 + hash(id, 9, 2) * 0.1));
  return c;
}

function planks(u, v, { across = false, count = 4, colours, gapDark = [36, 20, 10], seed = 41 }) {
  const a = across ? v : u, b = across ? u : v;
  const i = Math.floor(a * count), f = a * count - i;
  const tone = hash(i, seed, 3);
  let c = mix(colours[0], colours[1], tone);
  // Grain: noise stretched along the board.
  const g = fbm(across ? b : i * 0.37 + a, across ? i * 0.37 + a : b, seed + i, across ? 3 : 2, 3);
  const grain = fbm(across ? u * 0.25 : u * 3, across ? v * 3 : v * 0.25, seed + 1, 8, 3);
  c = c.map((x) => x * (0.82 + g * 0.2 + (grain - 0.5) * 0.25));
  if (f < 0.06 || f > 0.94) c = mix(c, gapDark, 0.8);
  else if (f < 0.14) c = mix(c, [255, 230, 190], 0.12);
  return c;
}

function checker(u, v, dark, light, startDark) {
  const n = 3, x = Math.floor(u * n), y = Math.floor(v * n);
  const isDark = ((x + y) % 2 === 0) === startDark;
  const fx = u * n - x, fy = v * n - y;
  let c = isDark ? marble(u, v, dark, 51) : marble(u, v, light, 53);
  if (fx < 0.03 || fy < 0.03) c = mix(c, [40, 40, 40], 0.5);
  return c;
}

function marble(u, v, [a, b], seed = 47) {
  const n = fbm(u, v, seed, 3, 4);
  const vein = Math.abs(Math.sin((u * 2 + v * 3 + fbm(u, v, seed + 2, 3, 4) * 3) * Math.PI));
  let c = mix(a, b, n);
  if (vein < 0.06) c = mix(c, [255, 255, 255], 0.35 * (1 - vein / 0.06));
  return c;
}

function floorTiles(u, v) {
  const n = 3, fx = (u * n) % 1, fy = (v * n) % 1, id = Math.floor(u * n) * 7 + Math.floor(v * n);
  let c = marble(u, v, [[210, 190, 160], [236, 222, 196]], 61 + (id % 3));
  if (fx < 0.05 || fy < 0.05) c = [120, 104, 84];
  else if (fx > 0.93 || fy > 0.93) c = mix(c, [0, 0, 0], 0.18);
  else if (fx < 0.12 || fy < 0.12) c = mix(c, [255, 255, 255], 0.2);
  return c;
}

function lava(u, v, crusty) {
  // Molten rock: the flow is noise warped by more noise; crust floats where
  // it's coolest, glowing at its edges; the hottest streaks run yellow.
  const wu = u + (fbm(u, v, 75, 3, 3) - 0.5) * 0.25, wv = v + (fbm(u, v, 77, 3, 3) - 0.5) * 0.25;
  const heat = fbm(wu, wv, 73, 4, 5);
  const cool = crusty ? 0.5 : 0.4;
  if (heat < cool) {
    const crust = mix([34, 16, 12], [74, 34, 22], fbm(u, v, 79, 12, 2));
    return mix(crust, [210, 70, 20], Math.max(0, heat - (cool - 0.05)) * 12);
  }
  const t = (heat - cool) / (1 - cool);
  let c = mix([200, 50, 10], [255, 150, 30], Math.min(1, t * 1.6));
  if (t > 0.55) c = mix(c, [255, 236, 140], (t - 0.55) * 2);
  return c;
}

function ice(u, v) {
  const w = worley(u, v, 4, 81);
  let c = mix([120, 214, 240], [196, 244, 255], fbm(u, v, 83, 3, 4));
  const e = w.d2 - w.d1;
  if (e < 0.03) c = mix(c, [255, 255, 255], 0.8);
  else if (e < 0.07) c = mix(c, [70, 150, 190], 0.35);
  return c;
}

function crystal(u, v) {
  const cx = u - 0.5, cy = v - 0.5, r = Math.hypot(cx, cy), a = Math.atan2(cy, cx);
  const swirl = Math.sin(a * 3 + r * 18 + fbm(u, v, 91, 3, 3) * 4);
  let c = mix([10, 30, 120], [40, 110, 230], fbm(u, v, 93, 4, 4));
  if (swirl > 0.75) c = mix(c, [140, 220, 255], (swirl - 0.75) * 3);
  if (hash(Math.floor(u * 64), Math.floor(v * 64), 95) > 0.985) c = [230, 250, 255];
  return c;
}

function mosaic(u, v) {
  const w = worley(u, v, 7, 101);
  const tones = [[74, 116, 188], [210, 176, 70], [96, 170, 150], [220, 220, 210], [180, 120, 70]];
  let c = tones[Math.floor(hash(w.id, 3, 3) * tones.length)];
  c = mix(c, [255, 255, 255], Math.max(0, 0.3 - w.d1) * 0.8);
  if (w.d2 - w.d1 < 0.12) c = [90, 84, 78];
  return c;
}

function ornateStone(u, v) {
  const cx = u - 0.5, cy = v - 0.5, r = Math.hypot(cx, cy), a = Math.atan2(cy, cx);
  let c = marble(u, v, [[196, 196, 192], [236, 236, 232]], 111);
  const petal = Math.cos(a * 8) * 0.06 + 0.26;
  if (Math.abs(r - petal) < 0.018 || Math.abs(r - 0.1) < 0.014) c = mix(c, [110, 108, 104], 0.7);
  const edge = Math.min(u, v, 1 - u, 1 - v);
  if (edge < 0.04) c = mix(c, [120, 118, 112], 0.6);
  return c;
}

// Loose rocks: the ground repainted, then each rock in the original drawn
// as a shaded stone of about the same size and shape.
function isRock(r, g, b) {
  const lum = (r + g + b) / 3;
  return Math.max(r, g, b) - Math.min(r, g, b) < 40 && lum > 70 && lum < 232;
}

function paintRocks(ctx, px, groundFill) {
  const rock = new Uint8Array(32 * 32);
  for (let i = 0; i < 32 * 32; i++) rock[i] = isRock(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) ? 1 : 0;
  // Ground first: either a given texture, or the tile's own materials with
  // the rocks' squares given to the commonest material around them.
  if (groundFill) drawPixels(ctx, groundFill);
  else {
    const labels = classify(px);
    const counts = new Map();
    labels.forEach((l, i) => { if (!rock[i]) counts.set(l, (counts.get(l) ?? 0) + 1); });
    const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? labels[0];
    paintGround(ctx, labels.map((l, i) => (rock[i] ? common : l)));
  }
  // Each separate rock: its size, centre and lean from its pixels.
  const seen = new Uint8Array(32 * 32);
  const rocks = [];
  for (let s = 0; s < 32 * 32; s++) {
    if (!rock[s] || seen[s]) continue;
    const stack = [s], cells = [];
    seen[s] = 1;
    while (stack.length) {
      const k = stack.pop(); cells.push(k);
      const x = k % 32, y = (k / 32) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * 32 + nx;
        if (nx >= 0 && ny >= 0 && nx < 32 && ny < 32 && rock[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    if (cells.length < 4) continue;
    let mx = 0, my = 0;
    for (const k of cells) { mx += k % 32; my += (k / 32) | 0; }
    mx /= cells.length; my /= cells.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const k of cells) { const dx = (k % 32) - mx, dy = ((k / 32) | 0) - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    sxx /= cells.length; syy /= cells.length; sxy /= cells.length;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = Math.max(0.3, tr / 2 - disc);
    rocks.push({ x: (mx + 0.5) * 4, y: (my + 0.5) * 4, rx: Math.sqrt(l1) * 2 * 4 + 1, ry: Math.sqrt(l2) * 2 * 4 + 1, a: 0.5 * Math.atan2(2 * sxy, sxx - syy) });
  }
  for (const r of rocks.sort((p, q) => p.y - q.y)) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.a);
    ctx.fillStyle = 'rgba(20, 20, 16, 0.35)';
    ctx.beginPath(); ctx.ellipse(2.5, 3.5, r.rx, r.ry, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(-r.rx * 0.35, -r.ry * 0.45, 1, 0, 0, Math.max(r.rx, r.ry) * 1.1);
    g.addColorStop(0, '#dcdad2'); g.addColorStop(0.55, '#a4a29a'); g.addColorStop(1, '#5e5c56');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, r.rx, r.ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40, 40, 36, 0.5)'; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
}

// Which surface each remaining tile gets. Tiles not listed here, in TREES
// or in GROUND keep the original art for now.
const SURFACES = {
  38: (ctx) => fillMaterial(ctx, 'sand'),
  40: (ctx) => drawPixels(ctx, crackedEarth),
  49: (ctx) => drawPixels(ctx, cobble),
  58: (ctx) => drawPixels(ctx, flagstone),
  97: (ctx) => drawPixels(ctx, flagstone),
  59: (ctx) => drawPixels(ctx, paleFlagstone),
  98: (ctx) => drawPixels(ctx, paleFlagstone),
  60: (ctx) => drawPixels(ctx, (u, v) => brick(u, v, false)),
  61: (ctx) => drawPixels(ctx, (u, v) => brick(u, v, false)),
  100: (ctx) => drawPixels(ctx, (u, v) => brick(u, v, false)),
  99: (ctx) => drawPixels(ctx, (u, v) => brick(u, v, true)),
  62: (ctx) => drawPixels(ctx, (u, v) => planks(u, v, { colours: [[92, 42, 22], [124, 60, 32]] })),
  101: (ctx) => drawPixels(ctx, (u, v) => planks(u, v, { colours: [[80, 38, 20], [110, 52, 28]], seed: 43 })),
  63: (ctx) => drawPixels(ctx, (u, v) => planks(u, v, { count: 3, colours: [[140, 88, 60], [168, 110, 76]], seed: 45 })),
  149: (ctx) => drawPixels(ctx, (u, v) => framed(u, v, planks(u, v, { across: true, colours: [[124, 84, 50], [150, 104, 64]], seed: 47 }))),
  150: (ctx) => drawPixels(ctx, (u, v) => hatch(u, v, framed(u, v, planks(u, v, { across: true, colours: [[124, 84, 50], [150, 104, 64]], seed: 47 })))),
  41: (ctx) => drawPixels(ctx, floorTiles),
  42: (ctx) => drawPixels(ctx, (u, v) => marble(u, v, [[70, 70, 72], [120, 118, 118]])),
  43: (ctx) => drawPixels(ctx, (u, v) => marble(u, v, [[28, 92, 96], [70, 146, 146]], 49)),
  45: (ctx) => drawPixels(ctx, (u, v) => checker(u, v, [[50, 50, 52], [96, 94, 94]], [[220, 220, 216], [248, 248, 244]], true)),
  46: (ctx) => drawPixels(ctx, (u, v) => checker(u, v, [[50, 50, 52], [96, 94, 94]], [[220, 220, 216], [248, 248, 244]], false)),
  47: (ctx) => drawPixels(ctx, (u, v) => checker(u, v, [[28, 92, 96], [70, 146, 146]], [[220, 220, 216], [248, 248, 244]], true)),
  48: (ctx) => drawPixels(ctx, (u, v) => checker(u, v, [[28, 92, 96], [70, 146, 146]], [[220, 220, 216], [248, 248, 244]], false)),
  105: (ctx) => drawPixels(ctx, mosaic),
  127: (ctx) => drawPixels(ctx, ornateStone),
  35: (ctx) => drawPixels(ctx, (u, v) => lava(u, v, false)),
  130: (ctx) => drawPixels(ctx, (u, v) => lava(u, v, false)),
  108: (ctx) => drawPixels(ctx, (u, v) => lava(u, v, true)),
  44: (ctx) => drawPixels(ctx, ice),
  129: (ctx) => drawPixels(ctx, ice),
  96: (ctx) => drawPixels(ctx, crystal),
  128: (ctx) => drawPixels(ctx, crystal),
  37: (ctx, px) => paintRocks(ctx, px),
  39: (ctx, px) => paintRocks(ctx, px),
  90: (ctx, px) => paintRocks(ctx, px),
  91: (ctx, px) => paintRocks(ctx, px),
  92: (ctx, px) => paintRocks(ctx, px),
  93: (ctx, px) => paintRocks(ctx, px),
  94: (ctx, px) => paintRocks(ctx, px),
  122: (ctx, px) => paintRocks(ctx, px),
  95: (ctx, px) => paintRocks(ctx, px, cobble),
  104: (ctx, px) => paintRocks(ctx, px, cobble),
};
// Cobbles meeting grass or sand along a diagonal (50-57): the textured
// half is cobble, told apart from the smooth half by how busy it is.
for (const i of range(50, 57)) SURFACES[i] = (ctx, px) => paintCobbleEdge(ctx, px);

function framed(u, v, c) {
  const e = Math.min(u, v, 1 - u, 1 - v);
  if (e < 0.05) return mix(c, [48, 30, 16], 0.85);
  if (e < 0.07) return mix(c, [255, 230, 190], 0.15);
  return c;
}

function hatch(u, v, c) {
  if (u > 0.34 && u < 0.62 && v > 0.74 && v < 0.93) {
    const e = Math.min(u - 0.34, 0.62 - u, v - 0.74, 0.93 - v);
    return e < 0.02 ? [40, 24, 12] : mix(c, [60, 36, 18], 0.35);
  }
  return c;
}

function paintCobbleEdge(ctx, px) {
  // Local busyness: how much each pixel differs from its neighbours.
  const lum = (i) => px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2];
  const busy = new Float32Array(32 * 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    let d = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [0, 2]]) {
      const xx = Math.min(31, Math.max(0, x + dx)), yy = Math.min(31, Math.max(0, y + dy));
      d += Math.abs(lum(y * 32 + x) - lum(yy * 32 + xx));
    }
    busy[y * 32 + x] = d;
  }
  // Smooth it, and call the busier side cobble.
  const labels = classify(px);
  const isCobble = new Uint8Array(32 * 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    let s = 0, n = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < 32 && yy < 32) { s += busy[yy * 32 + xx]; n++; }
    }
    isCobble[y * 32 + x] = s / n > 150 ? 1 : 0;
  }
  const counts = new Map();
  labels.forEach((l, i) => { if (!isCobble[i]) counts.set(l, (counts.get(l) ?? 0) + 1); });
  const other = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? NAMES.indexOf('grass');
  paintGround(ctx, labels.map(() => other));
  const ground = ctx.getImageData(0, 0, OUT, OUT);
  const img = ctx.createImageData(OUT, OUT);
  for (let Y = 0; Y < OUT; Y++) for (let X = 0; X < OUT; X++) {
    const x = Math.min(31, X >> 2), y = Math.min(31, Y >> 2), o = (Y * OUT + X) * 4;
    // A soft edge: average the cobble flag over a small neighbourhood.
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = Math.min(31, Math.max(0, x + dx)), yy = Math.min(31, Math.max(0, y + dy));
      s += isCobble[yy * 32 + xx]; n++;
    }
    const t = s / n;
    const c = t > 0.5 ? cobble(X / OUT, Y / OUT) : [ground.data[o], ground.data[o + 1], ground.data[o + 2]];
    const shade = Math.abs(t - 0.5) < 0.2 ? 0.7 : 1;
    img.data[o] = clamp(c[0] * shade); img.data[o + 1] = clamp(c[1] * shade); img.data[o + 2] = clamp(c[2] * shade); img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// ---- the sheet ----

// `source` is the original map.gif as an Image. Returns a canvas holding
// the new sheet: the same frames in the same order, OUT px each.
export function paintSheet(source) {
  const size = source.naturalHeight;
  const count = Math.floor(source.naturalWidth / size);
  const sheet = document.createElement('canvas');
  sheet.width = count * OUT;
  sheet.height = OUT;
  const sctx = sheet.getContext('2d');
  const read = document.createElement('canvas');
  read.width = read.height = size;
  const rctx = read.getContext('2d', { willReadFrequently: true });
  const frame = document.createElement('canvas');
  frame.width = frame.height = OUT;
  const fctx = frame.getContext('2d');
  for (let i = 0; i < count; i++) {
    fctx.clearRect(0, 0, OUT, OUT);
    rctx.clearRect(0, 0, size, size);
    rctx.drawImage(source, i * size, 0, size, size, 0, 0, size, size);
    if (TREES[i]) {
      fillMaterial(fctx, TREES[i][1]);
      paintTree(fctx, TREES[i][0], i);
    } else if (SURFACES[i] && size === 32) {
      SURFACES[i](fctx, rctx.getImageData(0, 0, 32, 32).data);
    } else if (GROUND.has(i) && size === 32) {
      paintGround(fctx, classify(rctx.getImageData(0, 0, 32, 32).data));
    } else {
      // Not repainted yet: the original, enlarged without blurring.
      fctx.imageSmoothingEnabled = false;
      fctx.drawImage(read, 0, 0, size, size, 0, 0, OUT, OUT);
    }
    sctx.drawImage(frame, i * OUT, 0);
  }
  return sheet;
}
