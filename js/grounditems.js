// Items lying on the ground (Painted style; js/renderer.js drawGroundItem). Each is drawn at
// about two thirds of a square, a little below the square's middle, tilted and (in a heap)
// nudged by an amount fixed by its id, so a pile looks scattered and stays the same from frame
// to frame. At most MAX_PILE of a square's items are drawn. Their names are hidden unless the
// pointer is over the square, you stand on or next to it, Alt is held, or the setting is on.
// No DOM; tested in node.

export const MAX_PILE = 4;
export const ITEM_SIZE = 0.66; // the picture's longer side, in squares
export const ITEM_MAX_GROW = 1.4; // a small picture (an apple) is enlarged at most this much
export const ITEM_LABEL_SCALE = 0.7; // of the creature label's size

// A well-mixed 32-bit number from an id (and a salt), as 0..1.
export function itemHash(id, salt = 0) {
  let h = Math.imul((id | 0) ^ Math.imul(salt + 1, 0x9e3779b9), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Tilt in radians, -20..+20 degrees.
export function itemTilt(id) {
  return ((itemHash(id, 1) * 40 - 20) * Math.PI) / 180;
}

// Where an item sits in its square, as parts of a square from the square's middle: lying a
// little below it, and in a heap of several nudged apart (none when it's alone).
export function itemOffset(id, n = 1) {
  const y = 0.1;
  if (n <= 1) return [0, y];
  return [(itemHash(id, 2) - 0.5) * 0.3, y + (itemHash(id, 3) - 0.5) * 0.16];
}

// How big to draw an item's frame (as parts of a square) so the picture in it (its opaque box,
// parts of the frame) has its longer side ITEM_SIZE, never enlarged more than ITEM_MAX_GROW.
export function itemFrameScale(box) {
  const side = Math.max(box.right - box.left, box.bottom - box.top, 0.05);
  return Math.min(ITEM_SIZE / side, ITEM_MAX_GROW);
}

// A pile's label: "name", "a, b", or "a, b +3".
export function pileLabel(names) {
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

// Whether a square's item names show.
export function showItemNames({ setting = false, held = false, hover = false, near = false } = {}) {
  return setting || held || hover || near;
}

// Whether you stand on or next to a square (diagonals count).
export function isNear(me, x, y) {
  return !!me && Math.abs(me.x - x) <= 1 && Math.abs(me.y - y) <= 1;
}

// The items of each square, in id order: key -> list. Reuses the map and its lists frame to
// frame (lists are emptied, not made anew).
export function groupPiles(items, piles = new Map()) {
  for (const list of piles.values()) list.length = 0;
  if (piles.size > 256) piles.clear();
  for (const e of items) {
    const k = e.x * 100003 + e.y;
    let list = piles.get(k);
    if (!list) piles.set(k, (list = []));
    list.push(e);
  }
  for (const list of piles.values()) if (list.length > 1) list.sort((a, b) => a.id - b.id);
  return piles;
}
export const pileKey = (x, y) => x * 100003 + y;
