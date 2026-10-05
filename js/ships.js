// Ferries at sea (server/Ferry.java): the server says where each ship is,
// every step, to everyone near it ("Ship: <id> <x> <y> <heading> <name>",
// "Ship: <id> gone"); they're drawn here, gliding from square to square
// and turning smoothly, under whoever is standing on deck.

const STEP_MS = 250; // the server's pace: a square every quarter second
const LOST_MS = 3000; // no word for this long: out of sight

// { id, x, y, heading, name } or { id, gone: true } for a ship line.
export function parseShip(line) {
  const m = /^Ship: (\d+) (?:(gone)|(-?\d+) (-?\d+) (-?\d+) (.*))$/.exec(line);
  if (!m) return null;
  if (m[2]) return { id: Number(m[1]), gone: true };
  return { id: Number(m[1]), x: Number(m[3]), y: Number(m[4]), heading: Number(m[5]), name: m[6] };
}

export class Ships {
  constructor() {
    this.ships = new Map();
  }

  update(s, now = performance.now()) {
    if (s.gone) { this.ships.delete(s.id); return; }
    const old = this.ships.get(s.id);
    if (!old) {
      this.ships.set(s.id, { ...s, fromX: s.x, fromY: s.y, fromH: s.heading, at: now, wake: [] });
      return;
    }
    const v = this.visual(old, now);
    const moved = s.x !== old.x || s.y !== old.y;
    Object.assign(old, { fromX: v.x, fromY: v.y, fromH: v.heading, x: s.x, y: s.y, heading: s.heading, name: s.name, at: now, moving: moved });
    if (moved) {
      old.wake.push({ x: v.x, y: v.y, t: now });
      if (old.wake.length > 24) old.wake.shift();
    }
  }

  // Where a ship is drawn now: between its last two squares.
  visual(s, now) {
    const k = Math.min(1, (now - s.at) / STEP_MS);
    let d = s.heading - s.fromH;
    d = ((d + 540) % 360) - 180; // the short way round
    return { x: s.fromX + (s.x - s.fromX) * k, y: s.fromY + (s.y - s.fromY) * k, heading: s.fromH + d * Math.min(1, k * 0.5 + 0.1) };
  }

  // Ships to draw: [{ x, y, heading, name, wake, moving }].
  list(now = performance.now()) {
    const out = [];
    for (const [id, s] of this.ships) {
      if (now - s.at > LOST_MS) { this.ships.delete(id); continue; }
      const v = this.visual(s, now);
      // The heading keeps easing towards the latest between steps.
      s.fromH = v.heading;
      out.push({ ...v, name: s.name, wake: s.wake, moving: s.moving && now - s.at < STEP_MS * 2 });
    }
    return out;
  }

  clear() {
    this.ships.clear();
  }
}

// A galleon seen from above: `cx, cy` its centre in pixels, `c` a
// square's size, heading in degrees (0 east, 90 south). About seven
// squares long and two and a half wide.
export function drawShip(ctx, cx, cy, c, heading, now, ship) {
  // The wake first, under everything: foam where the ship has been.
  if (ship?.wake?.length) {
    for (const w of ship.wake) {
      const age = (now - w.t) / 6000;
      if (age > 1) continue;
      // Two lines of foam spreading out behind, fading.
      const a = ((ship.heading + 90) * Math.PI) / 180, spread = c * (0.6 + age * 1.6);
      ctx.fillStyle = `rgba(235, 245, 255, ${0.22 * (1 - age)})`;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(ship.toPx(w.x) + Math.cos(a) * spread * side, ship.toPy(w.y) + Math.sin(a) * spread * side, c * (0.18 + age * 0.3), c * (0.12 + age * 0.2), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((heading * Math.PI) / 180);
  const L = c * 3.6, B = c * 1.3; // half-length, half-beam
  // Its shadow on the water.
  ctx.fillStyle = 'rgba(0, 10, 30, 0.35)';
  hull(ctx, L, B, c * 0.25, c * 0.35);
  ctx.fill();
  // Bow wave while under way.
  if (ship?.moving) {
    ctx.strokeStyle = 'rgba(240, 250, 255, 0.7)';
    ctx.lineWidth = Math.max(1.5, c / 14);
    const s = Math.sin(now / 160) * c * 0.05;
    ctx.beginPath(); ctx.moveTo(L + c * 0.15, 0); ctx.quadraticCurveTo(L * 0.7, B + c * 0.35 + s, L * 0.25, B + c * 0.55 + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L + c * 0.15, 0); ctx.quadraticCurveTo(L * 0.7, -B - c * 0.35 - s, L * 0.25, -B - c * 0.55 - s); ctx.stroke();
  }
  // The hull: dark planking with a lighter rail.
  const g = ctx.createLinearGradient(0, -B, 0, B);
  g.addColorStop(0, '#5a3418'); g.addColorStop(0.5, '#7a4a24'); g.addColorStop(1, '#4a2a12');
  ctx.fillStyle = g;
  hull(ctx, L, B);
  ctx.fill();
  ctx.strokeStyle = '#2a160a'; ctx.lineWidth = Math.max(1.5, c / 16); ctx.stroke();
  // The deck, inset, with planks running fore and aft.
  ctx.save();
  hull(ctx, L * 0.9, B * 0.78, -L * 0.03);
  ctx.clip();
  ctx.fillStyle = '#b08350';
  ctx.fillRect(-L, -B, 2 * L, 2 * B);
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.45)'; ctx.lineWidth = 1;
  for (let y = -B; y < B; y += c * 0.22) { ctx.beginPath(); ctx.moveTo(-L, y); ctx.lineTo(L, y); ctx.stroke(); }
  for (let x = -L; x < L; x += c * 0.9) for (let y = -B, k = 0; y < B; y += c * 0.22, k++) {
    const off = (k % 2) * c * 0.45;
    ctx.beginPath(); ctx.moveTo(x + off, y); ctx.lineTo(x + off, y + c * 0.22); ctx.stroke();
  }
  ctx.restore();
  // The raised stern deck, a hatch and the wheel.
  ctx.fillStyle = '#8a5a2e';
  ctx.beginPath(); ctx.roundRect(-L * 0.98, -B * 0.72, L * 0.42, B * 1.44, c * 0.12); ctx.fill();
  ctx.strokeStyle = '#3a200c'; ctx.stroke();
  ctx.fillStyle = '#5a3a1c';
  ctx.fillRect(L * 0.08, -B * 0.28, c * 0.6, B * 0.56);
  ctx.strokeStyle = '#2a160a'; ctx.lineWidth = Math.max(1, c / 28);
  ctx.beginPath(); ctx.arc(-L * 0.78, 0, c * 0.2, 0, Math.PI * 2); ctx.stroke();
  for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(-L * 0.78, 0); ctx.lineTo(-L * 0.78 + Math.cos(a * Math.PI / 4) * c * 0.28, Math.sin(a * Math.PI / 4) * c * 0.28); ctx.stroke(); }
  // Masts and sails: seen from above, a sail is a curved sheet across
  // the ship, bellied by the wind.
  // Full of wind under way; furled to the yards in port.
  const belly = ship?.moving ? c * 0.55 : c * 0.08;
  for (const [mx, w] of [[L * 0.42, B * 1.55], [-L * 0.12, B * 1.75]]) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    sail(ctx, mx - c * 0.1, w, belly, c, c * 0.12);
    ctx.fill();
    const sg = ctx.createLinearGradient(mx - belly, 0, mx + belly, 0);
    sg.addColorStop(0, '#d8ccb0'); sg.addColorStop(1, '#f4ecd8');
    ctx.fillStyle = sg;
    sail(ctx, mx, w, belly, c, 0);
    ctx.fill();
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = Math.max(1, c / 30); ctx.stroke();
    // The yard and the mast top.
    ctx.strokeStyle = '#3a220e'; ctx.lineWidth = Math.max(2, c / 12);
    ctx.beginPath(); ctx.moveTo(mx, -w); ctx.lineTo(mx, w); ctx.stroke();
    ctx.fillStyle = '#2a160a';
    ctx.beginPath(); ctx.arc(mx, 0, c * 0.12, 0, Math.PI * 2); ctx.fill();
  }
  // A pennant at the stern, streaming back.
  const flap = Math.sin(now / 200) * c * 0.08;
  ctx.fillStyle = '#b8282a';
  ctx.beginPath(); ctx.moveTo(-L * 0.92, -c * 0.06); ctx.lineTo(-L * 0.92 - c * 0.7, flap - c * 0.12); ctx.lineTo(-L * 0.92 - c * 0.7, flap + c * 0.12); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// The hull's outline: a pointed bow at +x, a squared stern at -x.
function hull(ctx, L, B, ox = 0, oy = 0) {
  ctx.beginPath();
  ctx.moveTo(L + ox, oy);
  ctx.bezierCurveTo(L * 0.55 + ox, -B * 1.05 + oy, L * 0.1 + ox, -B + oy, -L * 0.6 + ox, -B * 0.97 + oy);
  ctx.quadraticCurveTo(-L + ox, -B * 0.9 + oy, -L + ox, -B * 0.5 + oy);
  ctx.lineTo(-L + ox, B * 0.5 + oy);
  ctx.quadraticCurveTo(-L + ox, B * 0.9 + oy, -L * 0.6 + ox, B * 0.97 + oy);
  ctx.bezierCurveTo(L * 0.1 + ox, B + oy, L * 0.55 + ox, B * 1.05 + oy, L + ox, oy);
  ctx.closePath();
}

function sail(ctx, mx, w, belly, c, off) {
  const t = c * 0.2; // the sail's own depth at the yard
  ctx.beginPath();
  ctx.moveTo(mx + off, -w + off);
  ctx.bezierCurveTo(mx + belly + off, -w * 0.55 + off, mx + belly + off, w * 0.55 + off, mx + off, w + off);
  ctx.lineTo(mx - t + off, w * 0.9 + off);
  ctx.bezierCurveTo(mx + belly * 0.5 - t + off, w * 0.45 + off, mx + belly * 0.5 - t + off, -w * 0.45 + off, mx - t + off, -w * 0.9 + off);
  ctx.closePath();
}
