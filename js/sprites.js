// The three sprite sheets GraphicsThread.java loads from the resource
// address (opcode 1). Each is one horizontal strip of square frames whose
// side is the image's height; the sheets don't share a frame size (on the
// current server map tiles are 32px, players 36px and sprites 64px), and
// Java scales each to the same cell size, so the renderer does too.
//
//   map.gif      tile N           -> frame N
//   players.gif  player image N   -> frames N*8 .. N*8+7 (standing/walking
//                                    for north, south, west, east)
//   sprites.gif  sprite image N   -> frame N

const SHEETS = ['map', 'players', 'sprites'];
const LOAD_TIMEOUT_MS = 15000;
const SHRUNK_KEEP = 400; // frames kept ready-shrunk, per sheet

export class SpriteSheet {
  // `size`: the frame side, for a grid of frames read left to right, top
  // to bottom (the Painted items sheet); by default one strip.
  constructor(img, size = img.naturalHeight) {
    this.img = img;
    this.size = size;
    this.cols = Math.floor(img.naturalWidth / size);
    this.count = this.cols * Math.floor(img.naturalHeight / size);
  }

  // Draws frame `n` into the square at (dx, dy) with side `cell`. Frames
  // past the end of the strip draw nothing, as in Java.
  draw(ctx, n, dx, dy, cell) {
    if (n < 0 || n >= this.count) return false;
    const sx = (n % this.cols) * this.size, sy = Math.floor(n / this.cols) * this.size;
    // Shrinking: from a copy of the frame made once at this size. Shrinking
    // smoothly straight from the sheet costs the browser a pass over the
    // whole sheet (thousands of pixels across) nearly every time: a few
    // creatures made a phone's map draw take a tenth of a second.
    if (cell < this.size && typeof document !== 'undefined') {
      const side = Math.round(cell);
      if (side !== this.shrunkSide) { this.shrunk = new Map(); this.shrunkSide = side; }
      let small = this.shrunk.get(n);
      if (!small) {
        small = document.createElement('canvas');
        small.width = small.height = side;
        const c = small.getContext('2d');
        c.imageSmoothingEnabled = true;
        c.imageSmoothingQuality = 'high';
        c.drawImage(this.img, sx, sy, this.size, this.size, 0, 0, side, side);
        // Keep a few hundred; the oldest go first.
        if (this.shrunk.size >= SHRUNK_KEEP) this.shrunk.delete(this.shrunk.keys().next().value);
        this.shrunk.set(n, small);
      }
      ctx.drawImage(small, dx, dy, cell, cell);
      return true;
    }
    // Nearest-neighbour when enlarging keeps pixel art crisp.
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.img, sx, sy, this.size, this.size, dx, dy, cell, cell);
    return true;
  }
}

// Resolves to { map, players, sprites } (each a SpriteSheet, or null if
// that sheet failed) plus `errors`, a list of what went wrong. By default
// the server's <base>images/<name>.gif; the Smooth art style passes its
// own folder and "png" (see tools/smoothart.py).
export async function loadSheets(baseUrl, { path = 'images/', ext = 'gif' } = {}) {
  const results = await Promise.all(SHEETS.map((name) => loadImage(`${baseUrl}${path}${name}.${ext}`)));
  const sheets = { errors: [] };
  SHEETS.forEach((name, i) => {
    const r = results[i];
    if (r.img) sheets[name] = new SpriteSheet(r.img);
    else {
      sheets[name] = null;
      sheets.errors.push(`${name}.${ext}: ${r.error}`);
    }
  });
  return sheets;
}

// One sheet on its own (the Painted style's map), or null if it failed.
export async function loadSheet(url, size) {
  const r = await loadImage(url);
  return r.img ? new SpriteSheet(r.img, size) : null;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => done({ error: `timed out loading ${url}` }), LOAD_TIMEOUT_MS);
    function done(result) {
      clearTimeout(timer);
      img.onload = img.onerror = null;
      resolve(result);
    }
    img.onload = () =>
      img.naturalHeight > 0 ? done({ img }) : done({ error: `${url} is empty` });
    img.onerror = () => done({ error: `could not load ${url}` });
    img.src = url;
  });
}
