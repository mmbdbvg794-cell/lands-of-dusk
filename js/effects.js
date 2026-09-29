// Spell effects drawn over the map: little pixel-art particle animations
// around a creature or the player, e.g. mend's green spiral. The renderer
// calls drawEffect() for each live effect, after the sprites.
//
// Particles snap to a grid of chunky "pixels" (about a twelfth of a cell)
// so they sit with the game's pixel art, and each effect has its own
// random seed so its particles don't jump about between frames.

export const EFFECT_MS = { heal: 1300, holy: 1200, fire: 900, earth: 900, dark: 1200, arcane: 1000 };

const PALETTE = {
  heal: ['#3dff7a', '#8dffb0', '#1fcf55', '#e8fff0'],
  holy: ['#ffe27a', '#fff3b8', '#ffc93d', '#ffffff'],
  fire: ['#ff5a1f', '#ff9a2e', '#ffd34d', '#b8200f'],
  earth: ['#a8743f', '#7a5230', '#d0a064', '#5c3d22'],
  dark: ['#b05cff', '#7a2fd6', '#e0b0ff', '#3a1466'],
  arcane: ['#6ab8ff', '#b0dcff', '#3d7fff', '#ffffff'],
};

// Draws effect `fx` ({ kind, start, seed }) on the cell whose top-left is
// (x, y), side `c`, at time `now`. `still` draws a fading glow instead of
// moving particles, for "reduce motion".
export function drawEffect(ctx, fx, x, y, c, now, still = false) {
  const dur = EFFECT_MS[fx.kind] ?? 1000;
  const t = (now - fx.start) / dur;
  if (t < 0 || t >= 1) return;
  const colors = PALETTE[fx.kind] ?? PALETTE.arcane;
  const cx = x + c / 2;
  const cy = y + c / 2;
  const fade = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;

  if (still) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, c * 0.7);
    g.addColorStop(0, colors[0] + 'aa');
    g.addColorStop(1, colors[0] + '00');
    ctx.globalAlpha = fade * 0.8;
    ctx.fillStyle = g;
    ctx.fillRect(x - c * 0.2, y - c * 0.2, c * 1.4, c * 1.4);
    ctx.globalAlpha = 1;
    return;
  }

  const px = Math.max(2, Math.round(c / 12));
  const rand = seeded(fx.seed);
  const dot = (dx, dy, color, alpha = 1) => {
    ctx.globalAlpha = alpha * fade;
    ctx.fillStyle = color;
    // Snap to the chunky-pixel grid around the cell.
    ctx.fillRect(Math.round((cx + dx) / px) * px, Math.round((cy + dy) / px) * px, px, px);
  };

  switch (fx.kind) {
    case 'heal': {
      // Two strands spiralling up around the sprite, narrowing as they
      // rise, with sparkles left behind.
      const n = 22;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        const life = t * 1.6 - k * 0.6; // each particle starts a little later
        if (life < 0 || life > 1) continue;
        const strand = i % 2 ? Math.PI : 0;
        const a = strand + life * Math.PI * 3;
        const r = c * (0.48 - 0.22 * life);
        dot(Math.cos(a) * r, c * (0.45 - 0.95 * life) + Math.sin(a) * r * 0.25, colors[i % 3], 1 - life * 0.4);
        if (rand() < 0.35) dot(Math.cos(a) * r * 0.8, c * (0.5 - 0.95 * life), colors[3], 0.6);
      }
      break;
    }
    case 'holy': {
      // Sparkles drifting down in a column, with a halo ring over the head.
      for (let i = 0; i < 18; i++) {
        const sx = (rand() - 0.5) * c * 0.9;
        const delay = rand() * 0.5;
        const life = (t - delay) / 0.5;
        if (life < 0 || life > 1) continue;
        const twinkle = (Math.sin((t * 20 + i) * 1.7) + 1) / 2;
        dot(sx, -c * 0.7 + life * c * 1.1, colors[i % 4], 0.4 + 0.6 * twinkle);
      }
      const ring = 10;
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2 + t * 2;
        dot(Math.cos(a) * c * 0.3, -c * 0.55 + Math.sin(a) * c * 0.08, colors[0], 0.9);
      }
      break;
    }
    case 'fire': {
      // A burst outward that rises and cools from yellow to red.
      for (let i = 0; i < 26; i++) {
        const a = rand() * Math.PI * 2;
        const speed = 0.3 + rand() * 0.5;
        const d = c * speed * Math.sqrt(t);
        const rise = c * 0.5 * t * t;
        const color = t < 0.3 ? colors[2] : t < 0.6 ? colors[1] : i % 2 ? colors[0] : colors[3];
        dot(Math.cos(a) * d, Math.sin(a) * d * 0.7 - rise, color, 1 - t * 0.5);
      }
      break;
    }
    case 'earth': {
      // Chunks thrown up from the ground and falling back.
      for (let i = 0; i < 16; i++) {
        const vx = (rand() - 0.5) * c * 1.2;
        const vy = c * (0.9 + rand() * 0.6);
        const g = c * 2.2;
        dot(vx * t, c * 0.45 - (vy * t - 0.5 * g * t * t), colors[i % 4]);
      }
      break;
    }
    case 'dark': {
      // Wisps spiralling inward and vanishing into the target.
      for (let i = 0; i < 24; i++) {
        const a0 = rand() * Math.PI * 2;
        const a = a0 - t * Math.PI * 2.5;
        const r = c * (0.75 * (1 - t) + 0.05);
        dot(Math.cos(a) * r, Math.sin(a) * r * 0.8, colors[i % 4], 0.5 + 0.5 * t);
      }
      break;
    }
    default: {
      // Arcane: an expanding ring of blue with a few sparkles.
      const n = 20;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = c * (0.15 + 0.55 * t);
        dot(Math.cos(a) * r, Math.sin(a) * r * 0.8, colors[i % 3], 1 - t);
      }
      for (let i = 0; i < 8; i++) dot((rand() - 0.5) * c, (rand() - 0.5) * c, colors[3], rand());
    }
  }
  ctx.globalAlpha = 1;
}

// Small deterministic generator (mulberry32), restarted every frame from
// the effect's seed so each particle keeps its own path.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
