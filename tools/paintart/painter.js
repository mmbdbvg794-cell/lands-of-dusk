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
    // Depth from broad noise; glints along the ridges of finer noise, so
    // the light catches in short wavy lines rather than stripes.
    const n = fbm(u, v, 3, 3);
    const ridge = 1 - Math.abs(2 * fbm(u, v, 5, 4, 3) - 1);
    let c = mix([20, 58, 142], [44, 104, 188], n);
    if (ridge > 0.9) c = mix(c, [168, 212, 244], Math.min(1, (ridge - 0.9) * 7) * 0.8);
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

function blob(ctx, x, y, r, light, dark) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function paintTree(ctx, kind, seed) {
  const R = (n) => hash(n, seed, 91);
  ctx.save();
  // Shadow on the ground.
  ctx.fillStyle = 'rgba(20, 30, 10, 0.35)';
  ctx.beginPath();
  ctx.ellipse(66, 112, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineJoin = 'round';
  if (kind === 'palm') {
    // A curved, ringed trunk.
    const trunk = [[60, 114], [56, 90], [60, 62], [68, 40]];
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(...trunk[0]); ctx.bezierCurveTo(...trunk[1], ...trunk[2], ...trunk[3]); ctx.stroke();
    ctx.strokeStyle = '#9a6c3c'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(...trunk[0]); ctx.bezierCurveTo(...trunk[1], ...trunk[2], ...trunk[3]); ctx.stroke();
    ctx.strokeStyle = 'rgba(60, 36, 16, 0.7)'; ctx.lineWidth = 2;
    for (let t = 0.08; t < 0.95; t += 0.11) {
      const bx = (1 - t) ** 3 * 60 + 3 * (1 - t) ** 2 * t * 56 + 3 * (1 - t) * t * t * 60 + t ** 3 * 68;
      const by = (1 - t) ** 3 * 114 + 3 * (1 - t) ** 2 * t * 90 + 3 * (1 - t) * t * t * 62 + t ** 3 * 40;
      ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx + 4, by - 1); ctx.stroke();
    }
    // Fronds: broad, drooping leaves with a midrib, outlined.
    const top = [68, 40];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + R(i) * 0.4;
      const len = 48 + R(i + 9) * 12;
      const ex = top[0] + Math.cos(a) * len, ey = top[1] + Math.sin(a) * len * 0.5 + 20;
      const cx = top[0] + Math.cos(a) * len * 0.55, cy = top[1] + Math.sin(a) * len * 0.3 - 14;
      const nx = -Math.sin(a) * 14, ny = Math.cos(a) * 8;
      const leaf = () => {
        ctx.beginPath();
        ctx.moveTo(...top);
        ctx.quadraticCurveTo(cx + nx, cy + ny, ex, ey);
        ctx.quadraticCurveTo(cx - nx, cy - ny, ...top);
      };
      ctx.fillStyle = '#16300c'; ctx.lineWidth = 5; ctx.strokeStyle = '#16300c'; leaf(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = i % 2 ? '#5aa83a' : '#46902c'; leaf(); ctx.fill();
      ctx.strokeStyle = 'rgba(210, 240, 150, 0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(...top); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    }
    for (const [dx, dy] of [[-5, 4], [4, 5], [0, 9]]) blob(ctx, top[0] + dx, top[1] + dy, 5, '#b08a50', '#4a2c10');
    ctx.restore();
    return;
  }
  // Trunk, outlined.
  ctx.fillStyle = '#2a1a0c';
  ctx.beginPath(); ctx.moveTo(52, 114); ctx.lineTo(58, 70); ctx.lineTo(74, 70); ctx.lineTo(80, 114); ctx.closePath(); ctx.fill();
  const tg = ctx.createLinearGradient(56, 0, 76, 0);
  tg.addColorStop(0, '#9a6a3a'); tg.addColorStop(1, '#5a3a1c');
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.moveTo(56, 112); ctx.lineTo(61, 72); ctx.lineTo(71, 72); ctx.lineTo(76, 112); ctx.closePath(); ctx.fill();
  // Canopy: an outline pass, then clumps light at the top-left.
  const colours = {
    oak: ['#8ed05a', '#2e6a1e'], autumn: ['#f0b050', '#8a3a12'], 'autumn-gold': ['#f6d060', '#9a6a14'],
  }[kind];
  const clumps = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + R(i) * 0.6;
    const d = i === 0 ? 0 : 20 + R(i + 20) * 8;
    clumps.push([66 + Math.cos(a) * d, 50 + Math.sin(a) * d * 0.75, 20 + R(i + 40) * 8]);
  }
  ctx.fillStyle = '#16240c';
  for (const [x, y, r] of clumps) { ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill(); }
  for (const [x, y, r] of clumps.sort((p, q) => q[1] - p[1])) blob(ctx, x, y, r, colours[0], colours[1]);
  // A few light leaf dabs.
  ctx.fillStyle = 'rgba(255, 255, 220, 0.25)';
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.ellipse(44 + R(i + 60) * 40, 30 + R(i + 80) * 34, 3, 2, R(i) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
