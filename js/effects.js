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

// ---- the Painted style: the same spells, smooth ----
//
// Soft glowing particles with trails, light that adds up where it
// overlaps (the "lighter" blend), and a proper shape for each kind: a
// spiral of motes for heal, a beam and halo for holy, a fireball and smoke
// for fire, rocks and dust for earth, a vortex for dark, a shockwave for
// arcane. Glows are drawn once per colour and size, then stamped.

const glows = new Map();
function glow(color, size) {
  const key = `${color}|${size}`;
  let g = glows.get(key);
  if (!g) {
    g = document.createElement('canvas');
    g.width = g.height = size * 2;
    const x = g.getContext('2d');
    const grad = x.createRadialGradient(size, size, 0, size, size, size);
    grad.addColorStop(0, color);
    grad.addColorStop(0.25, color + 'cc');
    grad.addColorStop(0.6, color + '33');
    grad.addColorStop(1, color + '00');
    x.fillStyle = grad;
    x.fillRect(0, 0, size * 2, size * 2);
    glows.set(key, g);
  }
  return g;
}

export function drawPaintedEffect(ctx, fx, x, y, c, now) {
  const dur = EFFECT_MS[fx.kind] ?? 1000;
  const t = (now - fx.start) / dur;
  if (t < 0 || t >= 1) return;
  const colors = PALETTE[fx.kind] ?? PALETTE.arcane;
  const cx = x + c / 2, cy = y + c / 2;
  const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  const rand = seeded(fx.seed);
  const S = Math.max(8, Math.round(c / 4)); // a glow's radius
  const stamp = (dx, dy, color, r, alpha) => {
    if (alpha <= 0) return;
    ctx.globalAlpha = Math.min(1, alpha) * fade;
    const img = glow(color, S);
    ctx.drawImage(img, cx + dx - r, cy + dy - r, r * 2, r * 2);
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  switch (fx.kind) {
    case 'heal': {
      // A soft green bloom, two spiralling streams of motes with tails,
      // and sparkles left behind as they rise.
      stamp(0, c * 0.1, colors[2], c * (0.5 + 0.15 * Math.sin(t * Math.PI)), 0.35);
      for (let i = 0; i < 18; i++) {
        const k = i / 18;
        for (let tail = 0; tail < 4; tail++) {
          const life = t * 1.5 - k * 0.5 - tail * 0.03;
          if (life < 0 || life > 1) continue;
          const a = (i % 2 ? Math.PI : 0) + life * Math.PI * 3;
          const r = c * (0.46 - 0.22 * life);
          stamp(Math.cos(a) * r, c * (0.42 - 0.9 * life) + Math.sin(a) * r * 0.25, colors[i % 3], c * (0.1 - tail * 0.018), (1 - life * 0.5) * (1 - tail * 0.25));
        }
        if (rand() < 0.4) {
          const life = t * 1.5 - k * 0.5 - 0.2;
          if (life > 0 && life < 1) stamp((rand() - 0.5) * c * 0.7, c * (0.4 - 0.8 * life), colors[3], c * 0.05, 0.9 - life);
        }
      }
      break;
    }
    case 'holy': {
      // A beam of light from above, motes drifting down it, and a halo.
      ctx.globalAlpha = 0.45 * fade * Math.sin(Math.min(1, t * 2) * Math.PI / 2);
      const beam = ctx.createLinearGradient(cx - c * 0.35, 0, cx + c * 0.35, 0);
      beam.addColorStop(0, colors[0] + '00');
      beam.addColorStop(0.5, colors[1]);
      beam.addColorStop(1, colors[0] + '00');
      ctx.fillStyle = beam;
      ctx.fillRect(cx - c * 0.35, cy - c * 1.6, c * 0.7, c * 2.05);
      for (let i = 0; i < 16; i++) {
        const sx = (rand() - 0.5) * c * 0.6;
        const delay = rand() * 0.5;
        const life = (t - delay) / 0.5;
        if (life < 0 || life > 1) continue;
        const tw = (Math.sin((t * 18 + i) * 1.9) + 1) / 2;
        stamp(sx, -c * 0.9 + life * c * 1.2, colors[i % 4], c * (0.05 + 0.04 * tw), 0.5 + 0.5 * tw);
      }
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = Math.max(1.5, c / 22);
      ctx.shadowColor = colors[0];
      ctx.shadowBlur = c / 6;
      ctx.beginPath();
      ctx.ellipse(cx, cy - c * 0.55, c * 0.26, c * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case 'fire': {
      // A fireball blooming out, embers flying, and smoke rising after.
      stamp(0, 0, colors[1], c * (0.25 + 0.55 * Math.sqrt(t)), (1 - t) * 0.9);
      stamp(0, 0, colors[2], c * (0.15 + 0.3 * Math.sqrt(t)), (1 - t * 1.4));
      for (let i = 0; i < 22; i++) {
        const a = rand() * Math.PI * 2;
        const speed = 0.3 + rand() * 0.6;
        for (let tail = 0; tail < 3; tail++) {
          const tt = Math.max(0, t - tail * 0.04);
          const d = c * speed * Math.sqrt(tt);
          const color = tt < 0.3 ? colors[2] : tt < 0.6 ? colors[1] : colors[0];
          stamp(Math.cos(a) * d, Math.sin(a) * d * 0.7 - c * 0.5 * tt * tt, color, c * (0.08 - tail * 0.02), (1 - tt) * (1 - tail * 0.3));
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 6; i++) {
        const life = (t - 0.35 - i * 0.05) / 0.65;
        if (life <= 0) continue;
        ctx.globalAlpha = 0.25 * (1 - life) * fade;
        ctx.fillStyle = '#5a5450';
        ctx.beginPath();
        ctx.arc(cx + (rand() - 0.5) * c * 0.5, cy - c * 0.2 - life * c * 0.7, c * (0.1 + 0.2 * life), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'earth': {
      // Dust spreading at the feet, and rocks thrown up and falling back.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 * (1 - t) * fade;
      ctx.fillStyle = colors[2];
      ctx.beginPath();
      ctx.ellipse(cx, cy + c * 0.42, c * (0.2 + 0.5 * t), c * (0.06 + 0.12 * t), 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 12; i++) {
        const vx = (rand() - 0.5) * c * 1.2;
        const vy = c * (0.9 + rand() * 0.6);
        const g = c * 2.2;
        const dx = vx * t, dy = c * 0.45 - (vy * t - 0.5 * g * t * t);
        const r = c * (0.065 + rand() * 0.07);
        const spin = t * 8 + i;
        ctx.globalAlpha = fade;
        ctx.fillStyle = colors[i % 2 ? 1 : 0];
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = spin + (k / 5) * Math.PI * 2;
          const rr = r * (0.75 + 0.25 * ((k * 7 + i) % 3) / 2);
          ctx[k ? 'lineTo' : 'moveTo'](cx + dx + Math.cos(a) * rr, cy + dy + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(cx + dx - r * 0.3, cy + dy - r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'dark': {
      // A dark vortex at the target, wisps spiralling into it with
      // trails, and a last flash.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.55 * fade * Math.sin(t * Math.PI);
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, c * 0.55);
      vg.addColorStop(0, '#000000');
      vg.addColorStop(0.5, colors[3] + 'cc');
      vg.addColorStop(1, colors[3] + '00');
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, c * 0.55, c * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const a0 = rand() * Math.PI * 2;
        for (let tail = 0; tail < 4; tail++) {
          const tt = Math.max(0, t - tail * 0.035);
          const a = a0 - tt * Math.PI * 2.5;
          const r = c * (0.75 * (1 - tt) + 0.04);
          stamp(Math.cos(a) * r, Math.sin(a) * r * 0.8, colors[i % 3], c * (0.08 - tail * 0.015), (0.5 + 0.5 * tt) * (1 - tail * 0.25));
        }
      }
      if (t > 0.8) stamp(0, 0, colors[2], c * 0.5, (1 - t) * 4);
      break;
    }
    default: {
      // Arcane: a shockwave ring, a bright core, and glints.
      stamp(0, 0, colors[0], c * (0.3 + 0.2 * t), (1 - t) * 0.8);
      ctx.globalAlpha = (1 - t) * fade;
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = Math.max(1.5, c / 14 * (1 - t));
      ctx.shadowColor = colors[0];
      ctx.shadowBlur = c / 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, c * (0.15 + 0.6 * t), c * (0.12 + 0.48 * t), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let i = 0; i < 10; i++) {
        const a = rand() * Math.PI * 2, d = c * (0.2 + rand() * 0.5);
        const tw = (Math.sin((t * 14 + i) * 2.1) + 1) / 2;
        stamp(Math.cos(a) * d, Math.sin(a) * d * 0.8, colors[3], c * 0.05 * (0.5 + tw), tw);
      }
    }
  }
  ctx.restore();
}
