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
// A locked chest says "Storage lock: <key item>" before its listing, or
// "The <name> is locked. It takes a <key> to open." to someone without the
// key; a deposit box listing starts "Deposit box size: <n> (next: <m> for
// <price> gp)".

import { bareName, propLook } from './world.js';

// Each names the storage by its entity ID ("#<id>"), so it's the one that
// was clicked even with two in reach.
export const lookCommand = (sid) => `storage #${sid}`;
export const putCommand = (itemId, sid) => `storage #${sid} put ${itemId}`;
export const takeCommand = (name, sid) => `storage #${sid} take ${name}`;

// Deposit boxes (one per player, at any bank teller): the same listing,
// named "deposit box", and these commands.
export const BOX = 'box';
export const BOX_BUY = 'box buy';
export const BOX_UPGRADE = 'box upgrade';
// Gods: lock a chest so only someone carrying the key item can open it.
export const lockCommand = (sid, key) => `storage #${sid} lock ${key}`;
export const unlockCommand = (sid) => `storage #${sid} unlock`;
export const isChest = (e) => isStorage(e) && storageKind(bareName(e.name ?? '')) === 'chest';
export const boxPut = (itemId) => `box put ${itemId}`;
export const boxTake = (name) => `box take ${name}`;
// A bank teller: "teller" in its name, or in what a named prop looks like
// (looks: the server's "prop looks", lower-case name -> lower-case look).
export const TELLER_REACH = 5;
export function isTeller(e, looks) {
  if (!(e?.type === 3 || e?.type === 2)) return false;
  const name = bareName(e.name ?? '').toLowerCase();
  return /teller/.test(name) || /teller/.test(propLook(looks, e) ?? '');
}
// A deposit box line: its listing, or the offer to buy one.
export const isBoxLine = (t) => /^The deposit box (holds|is empty)|^Deposit box size: |^You don't have a deposit box yet\./.test(t.trim());

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
const NO_BOX = /^You don't have a deposit box yet\. One costs (\d+) gp\.$/;
const LOCK = /^Storage lock: (.+)$/;
const LOCKED = /^The (.+) is locked\. It takes an? (.+) to open\.$/;
const BOX_SIZE = /^Deposit box size: (\d+)(?: \(next: (\d+) for (\d+) gp\))?$/;

// Reads the listing as its lines arrive. feed(line) returns null for a
// line that isn't part of one, else { listing, hide }: listing is
// { name, items } once complete (null while items are still coming, or
// { none: true } away from storage), and hide says the line is part of
// the listing (the Storage tab shows it, so chat needn't).
export class StorageReader {
  constructor() {
    this.pending = null; // { name, items, left }
    this.extra = {}; // what comes before a listing: { lock } or { size, next, price }
  }

  // The listing with what came before it.
  done(listing) {
    const out = { ...listing, ...this.extra };
    this.extra = {};
    return out;
  }

  feed(text) {
    const t = text.trim();
    if (this.pending) {
      if (t.startsWith('- ')) {
        const p = this.pending;
        p.items.push(t.slice(2));
        if (--p.left > 0) return { listing: null, hide: true };
        this.pending = null;
        return { listing: this.done({ name: p.name, items: p.items }), hide: true };
      }
      this.pending = null; // cut short: forget it
    }
    let m = t.match(LOCK);
    if (m) { this.extra = { lock: m[1] }; return { listing: null, hide: true }; }
    m = t.match(BOX_SIZE);
    if (m) {
      this.extra = { size: Number(m[1]), next: m[2] ? Number(m[2]) : null, price: m[3] ? Number(m[3]) : null };
      return { listing: null, hide: true };
    }
    m = t.match(LOCKED);
    if (m) return { listing: { name: m[1], items: [], locked: m[2] }, hide: false };
    m = t.match(EMPTY);
    if (m) return { listing: this.done({ name: m[1], items: [] }), hide: true };
    m = t.match(HOLDS);
    if (m) {
      const left = Number(m[2]);
      if (left === 0) return { listing: this.done({ name: m[1], items: [] }), hide: true };
      this.pending = { name: m[1], items: [], left };
      return { listing: null, hide: true };
    }
    if (NONE.test(t)) return { listing: { none: true }, hide: false };
    m = t.match(NO_BOX);
    if (m) return { listing: { name: 'deposit box', items: [], noBox: Number(m[1]) }, hide: false };
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
