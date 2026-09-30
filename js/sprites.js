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

export class SpriteSheet {
  constructor(img) {
    this.img = img;
    this.size = img.naturalHeight;
    this.count = Math.floor(img.naturalWidth / this.size);
  }

  // Draws frame `n` into the square at (dx, dy) with side `cell`. Frames
  // past the end of the strip draw nothing, as in Java.
  draw(ctx, n, dx, dy, cell) {
    if (n < 0 || n >= this.count) return false;
    // Nearest-neighbour when enlarging keeps pixel art crisp; smoothing
    // when shrinking avoids dropped pixels on the 64px sprites.
    ctx.imageSmoothingEnabled = cell < this.size;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.img, n * this.size, 0, this.size, this.size, dx, dy, cell, cell);
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
