// Painted characters, drawn fresh: a figure built from parts (legs, body,
// arms, head, hair or helmet), in the same painted style as the trees and
// doors, standing and walking in four directions. Each image in the
// server's players.gif gets a "look" (colours and features) below.
//
// players.gif holds 8 frames per image: standing then walking, facing
// north, south, west, east (frames 0/2/4/6 stand, 1/3/5/7 walk).

const OUT = 144;

// The looks, by players.gif image. Races (defRaces): human 0, elf 1,
// darkelf 2, lizardman 6; 3-5 and 7 are other characters on this server.
export const LOOKS = [
  { skin: '#c89468', hair: '#4a2e18', top: '#7a5230', trim: '#4a3018', legs: '#3e3a2c', boots: '#2a1c10', style: 'plain' },
  { skin: '#f0d0b0', hair: '#e8d078', top: '#e6dcc0', trim: '#b8a878', legs: '#9a2a22', boots: '#4a2a18', style: 'plain', ears: true },
  { skin: '#8a8c9a', hair: '#e8e8f0', top: '#3a3a44', trim: '#6a6a78', legs: '#1c1c22', boots: '#101014', style: 'plain', ears: true },
  { skin: '#c89468', top: '#d8a030', trim: '#f4d870', legs: '#b86a20', boots: '#6a3a14', style: 'armour', helm: '#c8902a' },
  { skin: '#c89468', top: '#c02a22', trim: '#f0c050', legs: '#8a1a16', boots: '#3a1410', style: 'armour', helm: '#a82018' },
  { skin: '#c89468', top: '#2a4ab0', trim: '#d8303a', legs: '#1a2a78', boots: '#10183a', style: 'armour', helm: '#2440a0', emblem: '#e0343c' },
  { skin: '#5aa83a', belly: '#e8d050', top: '#5aa83a', trim: '#3a7a24', legs: '#4a9a30', boots: '#3a7a24', style: 'lizard' },
  { skin: '#c8a888', top: '#8a8278', trim: '#5a544c', legs: '#4a4640', boots: '#2a2622', style: 'plain', helm: '#b0aca0', horns: true, beard: '#8a6a44' },
];

const DIRS = ['n', 's', 'w', 'e'];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// A shape filled with light from the upper left and a soft darker edge.
function part(ctx, path, colour, { x0 = 0, x1 = OUT, edge = true } = {}) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(colour, 1.18));
  g.addColorStop(0.55, shade(colour, 1));
  g.addColorStop(1, shade(colour, 0.7));
  ctx.fillStyle = g;
  path();
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = shade(colour, 0.45);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  return () => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
}

function ellipse(ctx, x, y, rx, ry) {
  return () => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  };
}

// One frame. dir: 'n' | 's' | 'w' | 'e'; walking: the stride frame.
export function paintPerson(ctx, look, dir, walking) {
  const cx = OUT / 2, feet = 134;
  const side = dir === 'w' || dir === 'e';
  const flip = dir === 'w';
  ctx.save();
  if (flip) { ctx.translate(OUT, 0); ctx.scale(-1, 1); }
  // Shadow.
  const sg = ctx.createRadialGradient(cx, feet, 2, cx, feet, 30);
  sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(cx, feet, 30, 9, 0, 0, Math.PI * 2); ctx.fill();

  const stride = walking ? 1 : 0;
  const bob = walking ? -2 : 0;
  const hipY = 92 + bob, shoulderY = 56 + bob, headY = 38 + bob;

  // Lizard tail, behind everything but the shadow.
  if (look.style === 'lizard' && dir !== 's') {
    const tx = side ? cx - 18 : cx;
    part(ctx, () => { ctx.beginPath(); ctx.moveTo(tx - 6, hipY - 4); ctx.quadraticCurveTo(tx - (side ? 26 : 4), hipY + 22, tx - (side ? 34 : 2), feet - 2); ctx.lineTo(tx + 4, hipY + 6); ctx.closePath(); }, look.skin);
  }

  // Legs and boots.
  const legW = 13;
  if (side) {
    const back = stride ? 10 : 2, front = stride ? -10 : -2;
    for (const [off, dark] of [[back, 0.8], [front, 1]]) {
      const lx = cx - legW / 2 + off;
      part(ctx, roundRect(ctx, lx, hipY, legW, feet - hipY - 8, 5), shade(look.legs, 1) === '' ? look.legs : look.legs, { x0: lx, x1: lx + legW });
      if (dark < 1) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(ctx, lx, hipY, legW, feet - hipY - 8, 5)(); ctx.fill(); }
      part(ctx, roundRect(ctx, lx - 2 + (off > 0 ? 0 : 3), feet - 14, legW + 6, 12, 4), look.boots, { x0: lx, x1: lx + legW + 6 });
    }
  } else {
    const lift = stride ? 5 : 0;
    for (const [lx, up] of [[cx - legW - 2, lift], [cx + 2, 0]]) {
      part(ctx, roundRect(ctx, lx, hipY, legW, feet - hipY - 8 - up, 5), look.legs, { x0: lx, x1: lx + legW });
      part(ctx, roundRect(ctx, lx - 1, feet - 14 - up, legW + 2, 12, 4), look.boots, { x0: lx, x1: lx + legW + 2 });
    }
  }

  // Back arm (side view), swinging opposite the front leg.
  const armW = 10;
  if (side) {
    const sw = stride ? -9 : 0;
    part(ctx, roundRect(ctx, cx - armW / 2 + sw + 4, shoulderY + 4, armW, 34, 5), look.top, { x0: cx - 10, x1: cx + 10 });
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, cx - armW / 2 + sw + 4, shoulderY + 4, armW, 34, 5)(); ctx.fill();
  }

  // Body.
  const bodyW = side ? 26 : 36;
  const bx = cx - bodyW / 2;
  part(ctx, roundRect(ctx, bx, shoulderY, bodyW, hipY - shoulderY + 6, look.style === 'armour' ? 8 : 10), look.top, { x0: bx, x1: bx + bodyW });
  if (look.style === 'lizard' && dir !== 'n') {
    part(ctx, roundRect(ctx, bx + (side ? 10 : 8), shoulderY + 8, bodyW - (side ? 12 : 16), hipY - shoulderY - 6, 8), look.belly, { x0: bx, x1: bx + bodyW, edge: false });
  }
  if (look.style === 'armour') {
    // Plate: a breastplate highlight, a belt and pauldrons.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, bx + 5, shoulderY + 6, bodyW * 0.4, 18, 6)(); ctx.fill();
    if (look.emblem && dir === 's') {
      ctx.fillStyle = look.emblem;
      ctx.beginPath(); ctx.moveTo(cx, shoulderY + 12); ctx.lineTo(cx + 8, shoulderY + 20); ctx.lineTo(cx, shoulderY + 30); ctx.lineTo(cx - 8, shoulderY + 20); ctx.closePath(); ctx.fill();
    }
  }
  part(ctx, roundRect(ctx, bx - 1, hipY - 4, bodyW + 2, 7, 3), look.trim, { x0: bx, x1: bx + bodyW });
  if (look.style === 'armour') {
    for (const px of side ? [cx] : [bx - 4, bx + bodyW + 4]) part(ctx, ellipse(ctx, px, shoulderY + 4, side ? 12 : 9, 7), look.trim, { x0: px - 10, x1: px + 10 });
  }

  // Front arms.
  if (side) {
    const sw = stride ? 9 : 0;
    part(ctx, roundRect(ctx, cx - armW / 2 + sw - 3, shoulderY + 4, armW, 34, 5), look.top, { x0: cx - 10, x1: cx + 10 });
    part(ctx, ellipse(ctx, cx + sw - 3 + 1, shoulderY + 40, 5.5, 5.5), look.skin, { x0: cx - 6, x1: cx + 6 });
  } else {
    const sw = stride ? 5 : 0;
    for (const [ax, dy] of [[bx - armW + 1, sw], [bx + bodyW - 1, -sw]]) {
      part(ctx, roundRect(ctx, ax, shoulderY + 3 + dy * 0.3, armW, 34, 5), look.top, { x0: ax, x1: ax + armW });
      if (dir === 's') part(ctx, ellipse(ctx, ax + armW / 2, shoulderY + 40 + dy * 0.3, 5.5, 5.5), look.skin, { x0: ax, x1: ax + armW });
    }
  }

  // Head.
  const headR = 13;
  if (look.style === 'lizard') {
    // A lizard head with a snout pointing the way it faces.
    const snout = side ? [cx + 14, headY + 4] : dir === 's' ? [cx, headY + 12] : [cx, headY - 2];
    part(ctx, ellipse(ctx, cx, headY, headR, headR - 1), look.skin, { x0: cx - headR, x1: cx + headR });
    part(ctx, ellipse(ctx, snout[0], snout[1], side ? 11 : 9, side ? 7 : 8), look.skin, { x0: snout[0] - 10, x1: snout[0] + 10 });
    if (dir !== 'n') {
      ctx.fillStyle = '#f0e040';
      for (const ex of side ? [cx + 5] : [cx - 6, cx + 6]) { ctx.beginPath(); ctx.arc(ex, headY - 3, 2.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#101010';
      for (const ex of side ? [cx + 5] : [cx - 6, cx + 6]) { ctx.beginPath(); ctx.arc(ex, headY - 3, 1.1, 0, Math.PI * 2); ctx.fill(); }
    }
  } else {
    // Neck, head, and features for faces seen from the front or side.
    part(ctx, roundRect(ctx, cx - 5, headY + 8, 10, 10, 3), look.skin, { x0: cx - 5, x1: cx + 5, edge: false });
    if (look.ears) {
      for (const ex of side ? [cx - 6] : [cx - headR, cx + headR]) {
        const tip = ex < cx ? -9 : 9;
        part(ctx, () => { ctx.beginPath(); ctx.moveTo(ex, headY - 2); ctx.lineTo(ex + tip, headY - 10); ctx.lineTo(ex + tip * 0.2, headY + 5); ctx.closePath(); }, look.skin);
      }
    }
    part(ctx, ellipse(ctx, cx + (side ? 2 : 0), headY, headR, headR + 1), look.skin, { x0: cx - headR, x1: cx + headR });
    if (look.beard && dir !== 'n') part(ctx, ellipse(ctx, cx + (side ? 5 : 0), headY + 10, side ? 7 : 10, 7), look.beard, { x0: cx - 10, x1: cx + 10 });
    if (dir === 's' || side) {
      ctx.fillStyle = '#1a1210';
      for (const ex of side ? [cx + 8] : [cx - 5, cx + 5]) { ctx.beginPath(); ctx.ellipse(ex, headY - 1, 1.8, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    if (look.helm) {
      part(ctx, () => { ctx.beginPath(); ctx.arc(cx + (side ? 2 : 0), headY - 1, headR + 2, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); }, look.helm, { x0: cx - headR, x1: cx + headR });
      part(ctx, roundRect(ctx, cx - headR - 2 + (side ? 2 : 0), headY - 3, (headR + 2) * 2, 5, 2), shade(look.helm, 0.85) && look.helm, { x0: cx - headR, x1: cx + headR });
      if (look.horns) {
        for (const hx of side ? [cx - 6] : [cx - headR - 1, cx + headR + 1]) {
          const d = hx < cx ? -1 : 1;
          part(ctx, () => { ctx.beginPath(); ctx.moveTo(hx, headY - 6); ctx.quadraticCurveTo(hx + d * 12, headY - 10, hx + d * 10, headY - 26); ctx.quadraticCurveTo(hx + d * 5, headY - 12, hx - d * 2, headY - 2); ctx.closePath(); }, '#ece4cc');
        }
      }
    } else if (look.hair) {
      // Hair: covers the top of the head, and all of it from behind.
      const back = dir === 'n';
      part(ctx, () => {
        ctx.beginPath();
        ctx.arc(cx + (side ? 0 : 0), headY - 2, headR + 1.5, Math.PI * (back ? 0 : 1.0), Math.PI * (back ? 2 : 2));
        if (back) ctx.ellipse(cx, headY + 2, headR + 1, headR + 3, 0, 0, Math.PI);
        ctx.closePath();
      }, look.hair, { x0: cx - headR, x1: cx + headR });
    }
  }
  ctx.restore();
}

// A players.gif-shaped sheet: 8 frames per look, OUT px each.
export function paintPeopleSheet(count = LOOKS.length) {
  const sheet = document.createElement('canvas');
  sheet.width = count * 8 * OUT;
  sheet.height = OUT;
  const ctx = sheet.getContext('2d');
  for (let i = 0; i < count; i++) {
    const look = LOOKS[i] ?? LOOKS[0];
    for (let f = 0; f < 8; f++) {
      ctx.save();
      ctx.translate((i * 8 + f) * OUT, 0);
      ctx.beginPath(); ctx.rect(0, 0, OUT, OUT); ctx.clip();
      paintPerson(ctx, look, DIRS[f >> 1], f % 2 === 1);
      ctx.restore();
    }
  }
  return sheet;
}
