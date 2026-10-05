// Ground that blends (the Painted style): where two kinds of plain ground
// meet (grass and sand, meadow and dirt...), the edge between them wanders
// instead of running straight along the squares. Each square draws its
// neighbour's ground over its own side of the edge, up to a wobbly line
// that both squares work out the same way from the edge's place in the
// world, so it's continuous and stays put as the view moves. Walls,
// trees, paths, water and shores are left square.

// Plain ground tiles -> the kind they blend as (like kinds don't blend).
const KINDS = {
  36: 'grass', 37: 'lush', 1: 'meadow',
  38: 'sand', 27: 'sand', 39: 'grit',
  40: 'dirt', 109: 'snow', 122: 'snow',
  104: 'rock', 95: 'rock',
};
export const groundKind = (tile) => KINDS[tile] ?? null;

const SAMPLES = 36;
const REACH = 0.42; // how far into a square the line may wander (of a square)

function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth noise along a line of the grid (a row or column of edges), in
// [-1, 1]: continuous across square corners, so a straight boundary flows
// on from square to square.
function lineNoise(u, line, vertical) {
  const f = u * 1.7;
  const i = Math.floor(f), t = f - i, s = t * t * (3 - 2 * t);
  const v = (k) => hash(k, line, vertical ? 3 : 4) * 2 - 1;
  return v(i) + (v(i + 1) - v(i)) * s;
}

// How a boundary ends at a corner of the grid, seen from one edge: it runs
// straight on ('on'), turns round a square's corner ('round', into the
// square on side `toward`: -1 the smaller coordinate, 1 the larger), or
// just stops ('stop'). r: the rounding's radius, the same for every edge
// at that corner.
//   kl, kg: the ground kinds either side of the edge (smaller, larger
//   coordinate); bl, bg: the kinds of the squares beyond the corner, past
//   kl's and kg's squares.
export function edgeEnd(kl, kg, bl, bg, cx, cy) {
  if (bl && bg && bl !== bg) return { type: 'on' };
  const r = 0.3 + hash(cx, cy, 9) * 0.16;
  // A checkerboard corner (two squares of each kind, meeting diagonally):
  // one kind runs on through it, picked by the corner's place so every
  // edge there agrees, and the other kind's squares are rounded off.
  if (bl === kg && bg === kl) {
    const [first, second] = [kl, kg].sort();
    const through = hash(cx, cy, 11) < 0.5 ? first : second;
    return { type: 'round', toward: through === kg ? -1 : 1, r };
  }
  if (bl === kg) return { type: 'round', toward: -1, r };
  if (bg === kl) return { type: 'round', toward: 1, r };
  return { type: 'stop' };
}

const ON = { type: 'on' }, STOP = { type: 'stop' };

// The line along one edge, as SAMPLES + 1 signed depths (in squares) from
// one end to the other: positive bulges into the square with the larger
// coordinate, negative into the other. `vertical`: the edge between (x-1, y)
// and (x, y); otherwise between (x, y-1) and (x, y). end0, end1: how the
// boundary ends at either end (edgeEnd); where it turns, the line follows
// the round corner's arc there, and the wave fades out towards it.
export function edgeLine(x, y, vertical, end0 = STOP, end1 = STOP) {
  const out = [];
  for (let k = 0; k <= SAMPLES; k++) {
    const t = k / SAMPLES;
    const u = vertical ? y + t : x + t;
    let env = 1, round = 0;
    for (const [end, s] of [[end0, t], [end1, 1 - t]]) {
      if (end.type === 'on') continue;
      env = Math.min(env, s === 0 ? 0 : Math.sin(Math.min(1, s / 0.5) * Math.PI / 2));
      if (end.type === 'round' && s < end.r) round += end.toward * (end.r - Math.sqrt(end.r * end.r - (end.r - s) ** 2));
    }
    const wave = Math.max(-1, Math.min(1, lineNoise(u, vertical ? x : y, vertical) * 1.25)) * REACH * env;
    out.push(Math.max(-0.5, Math.min(0.5, wave + round)));
  }
  return out;
}

// The polygon a square fills with its neighbour's ground, from the line
// along the edge between them (edgeLine's depths), in squares relative to
// the square's top left; null if the line stays on the neighbour's side.
// (dx, dy): where the neighbour is.
export function intrusionOf(line, dx, dy) {
  const vertical = dx !== 0;
  const mineIsLarger = dx < 0 || dy < 0;
  const depth = line.map((d) => Math.max(0, mineIsLarger ? d : -d));
  if (!depth.some((d) => d > 0.01)) return null;
  const at = (t, d) => {
    if (vertical) return dx < 0 ? [d, t] : [1 - d, t];
    return dy < 0 ? [t, d] : [t, 1 - d];
  };
  const pts = [];
  for (let k = 0; k <= SAMPLES; k++) pts.push(at(k / SAMPLES, 0));
  for (let k = SAMPLES; k >= 0; k--) pts.push(at(k / SAMPLES, depth[k]));
  return pts;
}

// The same, for square (x, y) and its neighbour at (dx, dy), with the
// ends given (default: the boundary stops at both).
export function intrusion(x, y, dx, dy, end0 = STOP, end1 = STOP) {
  const ex = dx > 0 ? x + 1 : x, ey = dy > 0 ? y + 1 : y;
  return intrusionOf(edgeLine(ex, ey, dx !== 0, end0, end1), dx, dy);
}

// Both ends of the edge between square (x, y) and its neighbour at (dx, dy).
function endsOf(tileAt, x, y, dx, dy) {
  // The squares either side, smaller coordinate first.
  const [lx, ly, gx, gy] = dx < 0 || dy < 0 ? [x + dx, y + dy, x, y] : [x, y, x + dx, y + dy];
  const kl = groundKind(tileAt(lx, ly)), kg = groundKind(tileAt(gx, gy));
  const along = dx !== 0 ? [0, 1] : [1, 0]; // the direction the edge runs
  const ends = [];
  for (const side of [-1, 1]) {
    const ax = along[0] * side, ay = along[1] * side;
    const bl = groundKind(tileAt(lx + ax, ly + ay)), bg = groundKind(tileAt(gx + ax, gy + ay));
    // The corner itself, in grid points.
    const cx = dx !== 0 ? gx : (side < 0 ? gx : gx + 1), cy = dx !== 0 ? (side < 0 ? gy : gy + 1) : gy;
    ends.push(edgeEnd(kl, kg, bl, bg, cx, cy));
  }
  return ends;
}

const SIDES = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Traces a polygon (in squares, from the square at px, py), with points on
// the square's own edges pushed out a pixel: a clip ending exactly on the
// edge leaves half-covered pixels there, a faint seam of the ground below.
function trace(ctx, pts, px, py, c) {
  const out = (u) => (u <= 0 ? -1 : u >= 1 ? 1 : 0);
  ctx.beginPath();
  pts.forEach(([u, v], i) => {
    const X = px + u * c + out(u), Y = py + v * c + out(v);
    if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
  });
  ctx.closePath();
}


// Draws the blends over squares already drawn: for each square in the
// view (x0..x0+n, y0..y0+n) its differing neighbours' ground, over its side
// of the wandering line, and a faint shadow along the line.
// tileAt(x, y) -> tile or null; toPx(x, y) -> [px, py];
// draw(tile, px, py, size).
export function drawBlends(ctx, { x0, y0, n, c, tileAt, toPx, draw }) {
  const shadow = Math.max(1, c / 48);
  for (let x = x0; x <= x0 + n; x++) {
    for (let y = y0; y <= y0 + n; y++) {
      const tile = tileAt(x, y);
      const kind = groundKind(tile);
      if (!kind) continue;
      const [px, py] = toPx(x, y);
      for (const [dx, dy] of SIDES) {
        const other = tileAt(x + dx, y + dy);
        const ok = groundKind(other);
        if (!ok || ok === kind) continue;
        const [end0, end1] = endsOf(tileAt, x, y, dx, dy);
        const poly = intrusion(x, y, dx, dy, end0, end1);
        if (!poly) continue;
        ctx.save();
        trace(ctx, poly, px, py, c);
        ctx.clip();
        // The neighbour's ground, drawn where this square is (a pixel
        // over, for the pushed-out edge): the paintings repeat square to
        // square, so it carries on unbroken.
        draw(other, px - 1, py - 1, c + 2);
        ctx.restore();
        // A soft shadow along the line, as the edge of a worn patch: only
        // where it's on this side (the other square draws the rest).
        ctx.beginPath();
        const back = poly.slice(SAMPLES + 1);
        const off = (i) => { const [u, v] = back[i]; const e = poly[SAMPLES - i]; return Math.abs(u - e[0]) + Math.abs(v - e[1]) > 0.01; };
        for (let i = 1; i < back.length; i++) {
          if (!off(i) && !off(i - 1)) continue;
          ctx.moveTo(px + back[i - 1][0] * c, py + back[i - 1][1] * c);
          ctx.lineTo(px + back[i][0] * c, py + back[i][1] * c);
        }
        ctx.strokeStyle = 'rgba(40, 30, 10, 0.22)';
        ctx.lineWidth = shadow;
        ctx.stroke();
      }
    }
  }
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
