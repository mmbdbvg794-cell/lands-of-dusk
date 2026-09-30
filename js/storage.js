// Shared storage: barrels and chests on the map that anyone can put things
// in and take them out of (the server's Storage class). No DOM; tested in
// node.
//
// A storage is a prop (entity type 3) named "barrel" or "chest", or
// "<label> barrel"/"<label> chest". The server answers "storage" (and every
// put and take) with its contents as text lines:
//   The <name> is empty.
//   The <name> holds <n> item(s):   then n lines "- <item name>"
//   There's no storage here.

import { bareName } from './world.js';

export const LOOK = 'storage';
export const putCommand = (id) => `storage put ${id}`;
export const takeCommand = (name) => `storage take ${name}`;

export const isStorage = (e) => e?.type === 3 && /(^|\s)(barrel|chest)$/i.test(bareName(e.name ?? ''));
export const storageKind = (name) => (/chest$/i.test(name) ? 'chest' : 'barrel');

// The storage you can reach from (x, y): the one on your square, else one
// next to you (the server picks the same way).
export function nearStorage(entities, x, y) {
  let next = null;
  for (const e of entities) {
    if (!isStorage(e)) continue;
    const dx = Math.abs(e.x - x), dy = Math.abs(e.y - y);
    if (dx === 0 && dy === 0) return e;
    if (dx <= 1 && dy <= 1 && !next) next = e;
  }
  return next;
}

const EMPTY = /^The (.+) is empty\.$/;
const HOLDS = /^The (.+) holds (\d+) items?:$/;
const NONE = /^There's no storage here\.$/;

// Reads the listing as its lines arrive. feed(line) returns null for a
// line that isn't part of one, else { listing, hide }: listing is
// { name, items } once complete (null while items are still coming, or
// { none: true } away from storage), and hide says the line is part of
// the listing (the Storage tab shows it, so chat needn't).
export class StorageReader {
  constructor() {
    this.pending = null; // { name, items, left }
  }

  feed(text) {
    const t = text.trim();
    if (this.pending) {
      if (t.startsWith('- ')) {
        const p = this.pending;
        p.items.push(t.slice(2));
        if (--p.left > 0) return { listing: null, hide: true };
        this.pending = null;
        return { listing: { name: p.name, items: p.items }, hide: true };
      }
      this.pending = null; // cut short: forget it
    }
    let m = t.match(EMPTY);
    if (m) return { listing: { name: m[1], items: [] }, hide: true };
    m = t.match(HOLDS);
    if (m) {
      const left = Number(m[2]);
      if (left === 0) return { listing: { name: m[1], items: [] }, hide: true };
      this.pending = { name: m[1], items: [], left };
      return { listing: null, hide: true };
    }
    if (NONE.test(t)) return { listing: { none: true }, hide: false };
    return null;
  }
}

// The contents grouped by name, in the order they first appear:
// [{ name, count }].
export function groupContents(items) {
  const groups = new Map();
  for (const name of items) groups.set(name, (groups.get(name) ?? 0) + 1);
  return [...groups].map(([name, count]) => ({ name, count }));
}
