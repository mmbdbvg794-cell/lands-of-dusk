// The Painted style for characters and creatures (players.gif and
// sprites.gif): each frame keeps its exact shape and pose, so walking
// animations still line up, but is repainted like an oil painting.
//
//   1. Scale4x (Scale2x twice): 4x larger with rounded, not stepped, edges.
//   2. A Kuwahara filter: every pixel takes the average colour of the
//      calmest of the four squares around it, which turns dithered pixel
//      noise into flat brush-stroke areas while keeping edges crisp.
//   3. Soft anti-aliased edges, light from above, and a dark outline so the
//      figure sits clearly on the painted ground.

function scale2x(src, w, h) {
  // src: Uint32Array of packed RGBA, row-major. Returns 2w x 2h.
  const out = new Uint32Array(4 * w * h), ow = 2 * w;
  for (let y = 0; y < h; y++) {
    const up = (y > 0 ? y - 1 : y) * w, row = y * w, down = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const l = x > 0 ? x - 1 : x, r = x < w - 1 ? x + 1 : x;
      const p = src[row + x], a = src[up + x], b = src[row + r], c = src[row + l], d = src[down + x];
      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (a !== d && c !== b) {
        if (c === a) e0 = a;
        if (a === b) e1 = b;
        if (d === c) e2 = c;
        if (b === d) e3 = d;
      }
      const o = 2 * y * ow + 2 * x;
      out[o] = e0; out[o + 1] = e1; out[o + ow] = e2; out[o + ow + 1] = e3;
    }
  }
  return out;
}

// Kuwahara over opaque pixels only (transparent ones don't bleed in).
function kuwahara(rgba, w, h, r) {
  const out = new Uint8ClampedArray(rgba);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (rgba[i + 3] < 128) continue;
      let best = Infinity, br = 0, bg = 0, bb = 0;
      for (const [sx, sy] of [[-r, -r], [0, -r], [-r, 0], [0, 0]]) {
        let n = 0, mr = 0, mg = 0, mb = 0, m2 = 0;
        for (let dy = 0; dy <= r; dy++) {
          const yy = y + sy + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = 0; dx <= r; dx++) {
            const xx = x + sx + dx;
            if (xx < 0 || xx >= w) continue;
            const j = (yy * w + xx) * 4;
            if (rgba[j + 3] < 128) continue;
            const R = rgba[j], G = rgba[j + 1], B = rgba[j + 2];
            mr += R; mg += G; mb += B; m2 += R * R + G * G + B * B; n++;
          }
        }
        if (n < 3) continue;
        const v = m2 / n - ((mr / n) ** 2 + (mg / n) ** 2 + (mb / n) ** 2);
        if (v < best) { best = v; br = mr / n; bg = mg / n; bb = mb / n; }
      }
      if (best < Infinity) { out[i] = br; out[i + 1] = bg; out[i + 2] = bb; }
    }
  }
  return out;
}

export function paintFigureFrame(frameCanvas, { radius = 4, outline = 2 } = {}) {
  const s = frameCanvas.width;
  const src = frameCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, s, s);
  const packed = new Uint32Array(src.data.buffer.slice(0));
  // Treat nearly transparent as fully transparent, so Scale2x compares cleanly.
  for (let i = 0; i < packed.length; i++) if (src.data[i * 4 + 3] < 128) packed[i] = 0;
  const big = scale2x(scale2x(packed, s, s), 2 * s, 2 * s);
  const W = 4 * s;
  let rgba = new Uint8ClampedArray(big.buffer);
  rgba = kuwahara(rgba, W, W, radius);

  // Alpha, softened a touch for anti-aliased edges.
  const alpha = new Float32Array(W * W);
  for (let i = 0; i < W * W; i++) alpha[i] = rgba[i * 4 + 3] > 127 ? 1 : 0;
  const soft = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    let a = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < W) { a += alpha[yy * W + xx]; n++; }
    }
    soft[y * W + x] = a / n;
  }
  // Outline: where the figure, grown by `outline` pixels, isn't.
  const ring = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (alpha[y * W + x]) continue;
    let near = 0;
    for (let dy = -outline; dy <= outline && !near; dy++) for (let dx = -outline; dx <= outline; dx++) {
      const xx = x + dx, yy = y + dy;
      if (dx * dx + dy * dy <= outline * outline && xx >= 0 && yy >= 0 && xx < W && yy < W && alpha[yy * W + xx]) { near = 1; break; }
    }
    ring[y * W + x] = near;
  }

  const out = new ImageData(W, W);
  // Figure bounds, for light from above.
  let top = W, bottom = 0;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x]) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const span = Math.max(1, bottom - top);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 4;
    if (alpha[i] || soft[i] > 0) {
      const t = (y - top) / span;
      const light = 1.12 - t * 0.24;
      // Light catching the upper-left edges.
      const rim = !alpha[Math.max(0, i - W - 1)] && alpha[i] ? 1.18 : 1;
      out.data[o] = rgba[o] * light * rim; out.data[o + 1] = rgba[o + 1] * light * rim; out.data[o + 2] = rgba[o + 2] * light * rim;
      out.data[o + 3] = Math.round(255 * Math.max(alpha[i], soft[i]));
    } else if (ring[i]) {
      out.data[o] = 20; out.data[o + 1] = 14; out.data[o + 2] = 10; out.data[o + 3] = 170;
    }
  }
  const c = document.createElement('canvas');
  c.width = c.height = W;
  c.getContext('2d').putImageData(out, 0, 0);
  return c;
}

// A whole sheet (a strip of square frames) repainted, same frame order.
export function paintFigureSheet(img, options) {
  const s = img.naturalHeight, n = Math.floor(img.naturalWidth / s);
  const sheet = document.createElement('canvas');
  sheet.width = n * s * 4; sheet.height = s * 4;
  const ctx = sheet.getContext('2d');
  const f = document.createElement('canvas');
  f.width = f.height = s;
  const fctx = f.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < n; i++) {
    fctx.clearRect(0, 0, s, s);
    fctx.drawImage(img, i * s, 0, s, s, 0, 0, s, s);
    ctx.drawImage(paintFigureFrame(f, options), i * s * 4, 0);
  }
  return sheet;
}
