// Client-side world state: the visible tile grid plus the entities on it.
//
// Mirrors the bookkeeping Dusk.java does for opcodes 2, 4, 16, 19 and
// 24-31, minus the drawing. Positions are absolute world coordinates;
// the renderer converts them to view cells.
//
// On top of that it keeps what the renderer needs to animate: each
// entity's last step (drawn as a slide), the camera's last step, entities
// that just left the view (drawn until they've slid off), and floating
// damage numbers picked out of combat text.

import { OP } from './protocol.js';
import { EFFECT_MS } from './effects.js';

// The server moves each creature at most one square per 250 ms tick
// (DuskEngine.run()); a slide lasts a little longer so a step that arrives
// a few ms late joins the last one into a smooth walk.
export const STEP_MS = 270;
// How long a damage number floats.
export const HIT_MS = 1000;

// Movement opcodes -> [dx, dy], matching the direction GraphicsThread applies.
const MOVES = {
  [OP.MOVE_NORTH]: [0, -1],
  [OP.MOVE_SOUTH]: [0, 1],
  [OP.MOVE_WEST]: [-1, 0],
  [OP.MOVE_EAST]: [1, 0],
};

// The player sheet has 8 frames per character: standing and walking for
// north, south, west, east. GraphicsThread shows the walking frame for the
// first half of a step and the standing one after.
const FACING = {
  [OP.MOVE_NORTH]: 0,
  [OP.MOVE_SOUTH]: 2,
  [OP.MOVE_WEST]: 4,
  [OP.MOVE_EAST]: 6,
};

// Battle.attack() writes "<attacker> did <n> to <target>" or
// "<target> dodged <attacker>'s attack"; a round joins one attacker's
// attacks with commas, prefixed with a tab and ended with ".".
const HIT_RE = /^(.+?) did (\d+) to (.+)$/;
const DODGE_RE = /^(.+?) dodged (.+)'s attack$/;

// Entity names can carry flag prefixes ("<sleeping>wolf"); combat text uses
// the bare name.
export function bareName(name) {
  return name.replace(/^(<[^>]*>)+/, '');
}

export class World {
  constructor(mapSize = 11) {
    this.setMapSize(mapSize);
    this.locX = 0;
    this.locY = 0;
    this.hasMap = false;
    // Insertion order is draw order, like Dusk.java's vctEntities.
    this.entities = new Map();
    this.rement = [];
    this.stepMs = STEP_MS;
    this.cam = null; // { fx, fy, start }: the camera's last step
    this.prevMap = null; // { x, y, tiles, until }: the view before that step
    this.leaving = new Map(); // id -> { e, until }: sliding out of view
    this.hits = []; // { id, text, kind: 'hit' | 'dodge', start }
    this.effects = []; // { on: entity ID or 'self', kind, start, seed }: spell effects
  }

  // Returns and clears the IDs waiting to be reported with "rement".
  takeRement() {
    const ids = this.rement;
    this.rement = [];
    return ids;
  }

  get viewRange() {
    return (this.mapSize - 1) >> 1;
  }

  setMapSize(size) {
    this.mapSize = size;
    this.tiles = Array.from({ length: size }, () => new Array(size).fill(0));
    this.prevMap = null;
  }

  // World coordinates -> view cell (0..mapSize-1), top-left origin.
  toView(x, y) {
    return [x - this.locX + this.viewRange, y - this.locY + this.viewRange];
  }

  inView(x, y) {
    return Math.abs(x - this.locX) <= this.viewRange && Math.abs(y - this.locY) <= this.viewRange;
  }

  // Applies one parsed message. Returns true if the view needs redrawing.
  // IDs of entities dropped for being out of view are queued in `rement`;
  // the caller must report each with the "rement <id>" command, as Dusk.java
  // does, so the server stops treating them as sent.
  apply(msg, now = performance.now()) {
    switch (msg.op) {
      case OP.MAP_SIZE:
        this.setMapSize(msg.size);
        return true;

      case OP.MAP: {
        // A one-square step slides the view; anything further (a teleport,
        // or the first map) jumps.
        const step = this.hasMap && Math.abs(msg.x - this.locX) + Math.abs(msg.y - this.locY) === 1 && this.stepMs > 0;
        if (step) {
          const from = this.camera(now);
          this.cam = { fx: from.x, fy: from.y, start: now };
          this.prevMap = { x: this.locX, y: this.locY, tiles: this.tiles, until: now + this.stepMs };
        } else {
          this.cam = null;
          this.prevMap = null;
          this.leaving.clear();
        }
        this.locX = msg.x;
        this.locY = msg.y;
        this.tiles = msg.tiles;
        this.hasMap = true;
        // Out of view now: the server sends 16 for these itself.
        for (const [id, e] of this.entities) {
          if (this.inView(e.x, e.y)) continue;
          this.entities.delete(id);
          if (step) this.leave(e, now);
        }
        return true;
      }

      case OP.ENTITY: {
        // Java rejects anything outside the view and sends "rement", so it
        // never reaches the entity list.
        if (!this.inView(msg.x, msg.y)) {
          this.entities.delete(msg.id);
          this.rement.push(msg.id);
          return true;
        }
        // Java appends without checking for an existing ID; replacing
        // keeps a resend from leaving a stale copy behind. The server also
        // re-sends an entity to change its name flags, so a slide in
        // progress carries over.
        const old = this.entities.get(msg.id) ?? this.leaving.get(msg.id)?.e;
        this.entities.delete(msg.id);
        this.leaving.delete(msg.id);
        this.entities.set(msg.id, {
          id: msg.id,
          name: msg.name,
          type: msg.type,
          x: msg.x,
          y: msg.y,
          image: msg.image,
          step: msg.step,
          hideName: msg.hideName,
          hp: msg.hp ?? 0,
          maxhp: msg.maxhp ?? 0,
          flag: old?.flag ?? 0,
          anim: old && old.x === msg.x && old.y === msg.y ? old.anim : null,
        });
        return true;
      }

      case OP.REMOVE_ENTITY:
        return this.entities.delete(msg.id);

      case OP.MOVE_NORTH:
      case OP.MOVE_SOUTH:
      case OP.MOVE_WEST:
      case OP.MOVE_EAST: {
        const e = this.entities.get(msg.id);
        if (!e) return false;
        const [dx, dy] = MOVES[msg.op];
        // Slide on from wherever it's drawn now, so a step that arrives
        // mid-slide doesn't jump.
        const from = this.visualPos(e, now);
        e.x += dx;
        e.y += dy;
        e.anim = this.stepMs > 0 ? { fx: from.x, fy: from.y, start: now } : null;
        if (e.step !== -1) e.step = FACING[msg.op];
        if (!this.inView(e.x, e.y)) {
          this.entities.delete(msg.id);
          this.leave(e, now);
          this.rement.push(msg.id);
        }
        return true;
      }

      case OP.ENTITY_IMAGE: {
        const e = this.entities.get(msg.id);
        if (!e) return false;
        e.image = msg.image;
        return true;
      }

      case OP.SET_FLAG: {
        const e = this.entities.get(msg.id);
        if (!e) return false;
        e.flag = msg.flag;
        return true;
      }

      case OP.CLEAR_FLAGS:
        for (const e of this.entities.values()) e.flag = 0;
        return true;

      case OP.TEXT:
      case OP.COLOR_TEXT:
        return this.addHits(msg.text, now);
    }
    return false;
  }

  // Keeps drawing an entity that left the view until its slide is over.
  leave(e, now) {
    if (this.stepMs > 0) this.leaving.set(e.id, { e, until: now + this.stepMs });
  }

  // Picks damage numbers out of one line of combat text.
  addHits(text, now) {
    if (!text.startsWith('\t')) return false;
    const body = text.trim().replace(/\.$/, '');
    let added = false;
    for (const part of body.split(',')) {
      let m = HIT_RE.exec(part);
      if (m) {
        const target = this.findByName(m[3], m[1]);
        if (target) {
          this.hits.push({ id: target.id, text: m[2], kind: 'hit', start: now });
          added = true;
        }
        continue;
      }
      m = DODGE_RE.exec(part);
      if (m) {
        const target = this.findByName(m[1], m[2]);
        if (target) {
          this.hits.push({ id: target.id, text: 'dodge', kind: 'dodge', start: now });
          added = true;
        }
      }
    }
    return added;
  }

  // The entity called `name`. With several, prefer one that's in a fight
  // (it has a selection flag) and nearest the creature named `other`.
  findByName(name, other) {
    const key = name.toLowerCase();
    const all = [...this.entities.values()];
    const matches = all.filter((e) => bareName(e.name).toLowerCase() === key);
    if (matches.length <= 1) return matches[0] ?? null;
    const okey = other.toLowerCase();
    const foe = all.find((e) => bareName(e.name).toLowerCase() === okey);
    const dist = (e) => (foe ? Math.abs(e.x - foe.x) + Math.abs(e.y - foe.y) : 0);
    return matches.sort((a, b) => (b.flag !== 0) - (a.flag !== 0) || dist(a) - dist(b))[0];
  }

  // ---- animation --------------------------------------------------------

  progress(start, now) {
    return this.stepMs > 0 ? Math.min(1, Math.max(0, (now - start) / this.stepMs)) : 1;
  }

  // Where an entity is drawn right now, in world coordinates.
  visualPos(e, now) {
    if (!e.anim) return { x: e.x, y: e.y };
    const t = this.progress(e.anim.start, now);
    return { x: e.anim.fx + (e.x - e.anim.fx) * t, y: e.anim.fy + (e.y - e.anim.fy) * t };
  }

  // The players.gif step frame to draw, or -1 for sprites.
  frameStep(e, now) {
    if (e.step === -1) return -1;
    const walking = e.anim && this.progress(e.anim.start, now) < 0.5;
    return walking ? e.step + 1 : e.step;
  }

  // The world coordinates at the centre of the view right now.
  camera(now) {
    if (!this.cam) return { x: this.locX, y: this.locY };
    const t = this.progress(this.cam.start, now);
    return { x: this.cam.fx + (this.locX - this.cam.fx) * t, y: this.cam.fy + (this.locY - this.cam.fy) * t };
  }

  // Tile ID at world (x, y): from the current view, or from the view before
  // the last step while the camera is still sliding. Null if unknown.
  tileAt(x, y, now) {
    if (this.inView(x, y)) return this.tiles[x - this.locX + this.viewRange]?.[y - this.locY + this.viewRange] ?? null;
    const p = this.prevMap;
    if (p && now < p.until && Math.abs(x - p.x) <= this.viewRange && Math.abs(y - p.y) <= this.viewRange) {
      return p.tiles[x - p.x + this.viewRange]?.[y - p.y + this.viewRange] ?? null;
    }
    return null;
  }

  // Everything to draw right now: entities in list order, then those
  // sliding out of view. Drops finished slides, leavers and hits.
  drawList(now) {
    for (const [id, l] of this.leaving) if (now >= l.until) this.leaving.delete(id);
    if (this.prevMap && now >= this.prevMap.until) this.prevMap = null;
    this.hits = this.hits.filter((h) => now - h.start < HIT_MS);
    return [...this.entities.values(), ...[...this.leaving.values()].map((l) => l.e)];
  }

  // Whether anything is still moving, so the renderer keeps animating.
  animating(now) {
    const busy = (start) => now - start < this.stepMs;
    if (this.cam && busy(this.cam.start)) return true;
    if (this.leaving.size || this.hits.length) return true;
    this.effects = this.effects.filter((fx) => now - fx.start < (EFFECT_MS[fx.kind] ?? 1000));
    if (this.effects.length) return true;
    for (const e of this.entities.values()) if (e.anim && busy(e.anim.start)) return true;
    return false;
  }

  // Starts a spell effect on an entity, or on the player with 'self'.
  addEffect(on, kind, now = performance.now()) {
    this.effects.push({ on, kind, start: now, seed: (Math.random() * 2 ** 32) >>> 0 });
  }

  // The player's own entity: a player standing on the view's centre.
  self() {
    for (const e of this.entities.values()) if (e.type === 0 && e.x === this.locX && e.y === this.locY) return e;
    return null;
  }

  // Display names as Dusk.java's getDisplayName() shows them: the first
  // entity with a given name (scanning columns left to right, each top to
  // bottom) is plain "rat", later ones are "1.rat", "2.rat", ...
  displayNames() {
    const order = [...this.entities.values()].sort((a, b) => a.x - b.x || a.y - b.y);
    const seen = new Map();
    const names = new Map();
    for (const e of order) {
      const key = e.name.toLowerCase();
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      names.set(e.id, n === 0 ? e.name : `${n}.${e.name}`);
    }
    return names;
  }
}
