// Painted characters, drawn fresh: a figure built from parts (legs, body,
// arms, head, hair or helmet), in the same painted style as the trees and
// doors, standing and walking in four directions. Each image in the
// server's players.gif gets a "look" (colours and features) below.
//
// Worn gear (see gear.js) is drawn over the look: a weapon in the right
// hand, a shield on the left arm, a helmet instead of the hair, and armour,
// sleeves, gloves, leggings, belt, amulet and goggles in their colours.
// The build (tools/paintart) draws everyone's plain look into players.png;
// the client draws your own character again with what you're wearing.
//
// players.gif holds 8 frames per image: standing then walking, facing
// north, south, west, east (frames 0/2/4/6 stand, 1/3/5/7 walk).

export const OUT = 144;

// The looks, by players.gif image. Races (defRaces): human 0, elf 1,
// darkelf 2, lizardman 6; 3-5 and 7 are other characters on this server.
// 8-11 are the races' female looks (server/Sex.java): slimmer, a skirt,
// hair to the shoulders; the lizardfolk a chest wrap.
export const LOOKS = [
  { skin: '#c89468', hair: '#4a2e18', top: '#7a5230', trim: '#4a3018', legs: '#3e3a2c', boots: '#2a1c10', style: 'plain' },
  { skin: '#f0d0b0', hair: '#e8d078', hairStyle: 'long', top: '#e6dcc0', trim: '#b8a878', legs: '#9a2a22', boots: '#4a2a18', style: 'plain', ears: true },
  { skin: '#8a8c9a', hair: '#e8e8f0', hairStyle: 'ponytail', top: '#3a3a44', trim: '#6a6a78', legs: '#1c1c22', boots: '#101014', style: 'plain', ears: true },
  { skin: '#c89468', top: '#d8a030', trim: '#f4d870', legs: '#b86a20', boots: '#6a3a14', style: 'armour', helm: '#c8902a' },
  { skin: '#c89468', top: '#c02a22', trim: '#f0c050', legs: '#8a1a16', boots: '#3a1410', style: 'armour', helm: '#a82018' },
  { skin: '#c89468', top: '#2a4ab0', trim: '#d8303a', legs: '#1a2a78', boots: '#10183a', style: 'armour', helm: '#2440a0', emblem: '#e0343c' },
  { skin: '#5e7d3c', belly: '#c4b283', top: '#5e7d3c', trim: '#5a3e22', legs: '#587639', boots: '#4c6832', style: 'lizard' },
  { skin: '#c8a888', top: '#8a8278', trim: '#5a544c', legs: '#4a4640', boots: '#2a2622', style: 'plain', helm: '#b0aca0', horns: true, beard: '#8a6a44' },
  { skin: '#c89468', hair: '#5a3418', hairStyle: 'long', top: '#7a5230', trim: '#4a3018', legs: '#3e3a2c', skirt: '#5a4632', boots: '#2a1c10', style: 'plain', slim: true },
  { skin: '#f0d0b0', hair: '#e8d078', hairStyle: 'long', top: '#e6dcc0', trim: '#b8a878', legs: '#9a2a22', skirt: '#9a2a22', boots: '#4a2a18', style: 'plain', ears: true, slim: true },
  { skin: '#8a8c9a', hair: '#e8e8f0', hairStyle: 'long', top: '#3a3a44', trim: '#6a6a78', legs: '#1c1c22', skirt: '#2a2a32', boots: '#101014', style: 'plain', ears: true, slim: true },
  { skin: '#5e7d3c', belly: '#c4b283', top: '#5e7d3c', trim: '#5a3e22', legs: '#587639', boots: '#4c6832', style: 'lizard', wrap: '#d8b040' },
];

const DIRS = ['n', 's', 'w', 'e'];
const WOOD = '#74502c';

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
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
    ctx.lineWidth = 1.8;
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

// A torso: broad at the shoulders, a little narrower at the waist.
function torso(ctx, x, y, w, h) {
  return () => {
    ctx.beginPath();
    ctx.moveTo(x, y + 7);
    ctx.quadraticCurveTo(x, y, x + 7, y);
    ctx.lineTo(x + w - 7, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + 7);
    ctx.lineTo(x + w - 3, y + h);
    ctx.lineTo(x + 3, y + h);
    ctx.closePath();
  };
}

// A weapon held at the origin (the hand), pointing up (-y) before `angle`.
export function drawWeapon(ctx, w, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const c = w.colour;
  const shine = (path) => {
    if (w.glow) { ctx.shadowColor = shade(c, 1.3); ctx.shadowBlur = 12; }
    part(ctx, path, c, { x0: -6, x1: 6 });
    ctx.shadowBlur = 0;
  };
  const haft = (top, bottom, width = 5, colour = WOOD) =>
    part(ctx, roundRect(ctx, -width / 2, top, width, bottom - top, 2), colour, { x0: -3, x1: 3 });
  switch (w.kind) {
    case 'sword':
    case 'dagger': {
      const len = w.kind === 'sword' ? 44 : 22, half = w.kind === 'sword' ? 3.8 : 3.2;
      shine(() => { ctx.beginPath(); ctx.moveTo(-half, -5); ctx.lineTo(-half, -len); ctx.lineTo(0, -len - 8); ctx.lineTo(half, -len); ctx.lineTo(half, -5); ctx.closePath(); });
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-0.8, -8); ctx.lineTo(-0.8, -len + 2); ctx.stroke();
      haft(-3, 10, 5, '#3a2616');
      part(ctx, roundRect(ctx, w.kind === 'sword' ? -10 : -7, -7, w.kind === 'sword' ? 20 : 14, 4.5, 2), '#c8a040', { x0: -10, x1: 10 });
      part(ctx, ellipse(ctx, 0, 11, 3.5, 3.5), '#c8a040', { x0: -4, x1: 4 });
      break;
    }
    case 'axe':
      haft(-44, 12);
      shine(() => { ctx.beginPath(); ctx.moveTo(1, -44); ctx.lineTo(9, -43); ctx.quadraticCurveTo(24, -42, 23, -24); ctx.quadraticCurveTo(15, -29, 9, -29); ctx.lineTo(1, -30); ctx.closePath(); });
      break;
    case 'hammer':
      haft(-36, 12);
      shine(roundRect(ctx, -11, -48, 22, 14, 3));
      break;
    case 'staff':
      haft(-60, 26, 5);
      if (w.glow) { ctx.shadowColor = c; ctx.shadowBlur = 16; }
      part(ctx, ellipse(ctx, 0, -64, 6, 6), c, { x0: -6, x1: 6 });
      ctx.shadowBlur = 0;
      break;
    case 'spear':
      haft(-64, 26, 4);
      shine(() => { ctx.beginPath(); ctx.moveTo(-5, -62); ctx.lineTo(0, -82); ctx.lineTo(5, -62); ctx.closePath(); });
      break;
    case 'pick':
      haft(-38, 12);
      shine(() => { ctx.beginPath(); ctx.moveTo(-17, -33); ctx.quadraticCurveTo(0, -47, 17, -33); ctx.lineTo(15, -31); ctx.quadraticCurveTo(0, -40, -15, -31); ctx.closePath(); });
      break;
    case 'shovel':
      haft(-44, 12, 4);
      shine(roundRect(ctx, -7, -62, 14, 19, 6));
      break;
    case 'bow':
      ctx.strokeStyle = shade(c === '#a4acb6' ? WOOD : c, 0.8); ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      if (w.glow) { ctx.shadowColor = c; ctx.shadowBlur = 10; }
      ctx.beginPath(); ctx.moveTo(-2, -36); ctx.quadraticCurveTo(20, 0, -2, 36); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(240,235,220,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-2, -36); ctx.lineTo(-2, 36); ctx.stroke();
      break;
    case 'crossbow':
      part(ctx, roundRect(ctx, -4, -3, 28, 6, 2), WOOD, { x0: -4, x1: 24 });
      ctx.strokeStyle = shade(c, 0.8); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(18, -16); ctx.quadraticCurveTo(26, 0, 18, 16); ctx.stroke();
      break;
    case 'claw':
      for (const i of [-1, 0, 1]) shine(() => { ctx.beginPath(); ctx.moveTo(i * 4 - 1.6, -2); ctx.lineTo(i * 5.5, -22 + Math.abs(i) * 3); ctx.lineTo(i * 4 + 1.6, -2); ctx.closePath(); });
      break;
    default: // orb: a spell held in the hand
      ctx.shadowColor = c; ctx.shadowBlur = 18;
      part(ctx, ellipse(ctx, 0, -7, 7, 7), c, { x0: -7, x1: 7, edge: false });
      ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// A heater shield centred on (x, y); `edgeOn` squeezes it for side views,
// `back` shows its back (seen from behind).
export function drawShield(ctx, s, x, y, { edgeOn = false, back = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (edgeOn) ctx.scale(0.55, 1);
  const face = back ? shade(s.colour, 0.6) : s.colour;
  const outline = () => { ctx.beginPath(); ctx.moveTo(-12, -15); ctx.lineTo(12, -15); ctx.lineTo(12, 2); ctx.quadraticCurveTo(11, 15, 0, 21); ctx.quadraticCurveTo(-11, 15, -12, 2); ctx.closePath(); };
  part(ctx, outline, face, { x0: -12, x1: 12 });
  ctx.strokeStyle = shade(s.colour, back ? 0.4 : 0.75); ctx.lineWidth = 2.5;
  outline(); ctx.stroke();
  if (!back) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(-1, -12); ctx.lineTo(-1, 14); ctx.quadraticCurveTo(-8, 10, -9, 2); ctx.closePath(); ctx.fill();
    part(ctx, ellipse(ctx, 0, -1, 3.5, 3.5), shade(s.colour, 1.25), { x0: -4, x1: 4 });
  }
  ctx.restore();
}

// Scales: rows of small overlapping arcs, a shade darker, over whatever
// path is clipped.
function scales(ctx, colour, x0, y0, x1, y1) {
  ctx.strokeStyle = shade(colour, 0.7);
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 0.9;
  for (let y = y0, row = 0; y < y1; y += 3.6, row++) {
    for (let x = x0 + (row % 2) * 2.6; x < x1; x += 5.2) {
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// Pale claws: from the front (pointing down) or the side (pointing ahead).
function claws(ctx, points, facing) {
  ctx.fillStyle = '#e6dcc0';
  for (const [x, y] of points) {
    ctx.beginPath();
    if (facing === 's') { ctx.moveTo(x - 1.4, y - 2); ctx.lineTo(x, y + 2.4); ctx.lineTo(x + 1.4, y - 2); }
    else { ctx.moveTo(x - 2, y - 1.6); ctx.lineTo(x + 3, y); ctx.lineTo(x - 2, y + 1.4); }
    ctx.closePath(); ctx.fill();
  }
}

// A lizardman's head: a long wedge of a snout, heavy brows, slit-pupilled
// eyes set to the sides, nostrils and a jaw line, with spines down the neck.
function lizardHead(ctx, look, { cx, headY, side, dir, shoulderY }) {
  const skin = look.skin;
  const dark = shade(skin, 0.6);
  // Neck.
  part(ctx, roundRect(ctx, cx - 6 + (side ? -2 : 0), headY + 4, 12, shoulderY - headY, 4), skin, { x0: cx - 6, x1: cx + 6, edge: false });
  let head;
  if (side) {
    head = () => {
      ctx.beginPath();
      ctx.moveTo(cx - 11, headY + 2);
      ctx.bezierCurveTo(cx - 11, headY - 12, cx + 2, headY - 13, cx + 8, headY - 8);
      ctx.quadraticCurveTo(cx + 18, headY - 5, cx + 25, headY + 1);
      ctx.quadraticCurveTo(cx + 28, headY + 5, cx + 23, headY + 7);
      ctx.lineTo(cx + 8, headY + 11);
      ctx.quadraticCurveTo(cx - 6, headY + 14, cx - 11, headY + 2);
      ctx.closePath();
    };
  } else {
    // From the front the snout comes towards you, so the head narrows
    // down to it; from behind it's just the back of the skull.
    head = () => {
      ctx.beginPath();
      ctx.moveTo(cx - 12, headY - 2);
      ctx.bezierCurveTo(cx - 13, headY - 14, cx + 13, headY - 14, cx + 12, headY - 2);
      if (dir === 's') {
        ctx.bezierCurveTo(cx + 11, headY + 6, cx + 8, headY + 13, cx + 5, headY + 15);
        ctx.quadraticCurveTo(cx, headY + 17, cx - 5, headY + 15);
        ctx.bezierCurveTo(cx - 8, headY + 13, cx - 11, headY + 6, cx - 12, headY - 2);
      } else {
        ctx.bezierCurveTo(cx + 12, headY + 8, cx - 12, headY + 8, cx - 12, headY - 2);
      }
      ctx.closePath();
    };
  }
  part(ctx, head, skin, { x0: cx - 13, x1: cx + (side ? 27 : 13) });
  ctx.save(); head(); ctx.clip();
  scales(ctx, skin, cx - 14, headY - 14, cx + 28, headY + 18);
  // A paler throat and jaw.
  ctx.fillStyle = shade(look.belly, 0.95);
  ctx.globalAlpha = 0.55;
  if (side) { ctx.beginPath(); ctx.moveTo(cx - 6, headY + 13); ctx.quadraticCurveTo(cx + 8, headY + 7, cx + 23, headY + 6); ctx.lineTo(cx + 23, headY + 9); ctx.lineTo(cx - 6, headY + 16); ctx.fill(); }
  else if (dir === 's') { ctx.beginPath(); ctx.ellipse(cx, headY + 13, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.restore();

  const eye = (ex, ey) => {
    ctx.fillStyle = '#d8a428';
    ctx.beginPath(); ctx.ellipse(ex, ey, 2.8, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#120c06';
    ctx.beginPath(); ctx.ellipse(ex, ey, 0.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    // A heavy brow ridge over it.
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex - 3.6, ey - 2.4); ctx.quadraticCurveTo(ex, ey - 4.8, ex + 3.8, ey - 2.6); ctx.stroke();
  };
  ctx.lineCap = 'round';
  if (side) {
    eye(cx + 5, headY - 4);
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(cx + 23, headY + 1, 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx + 25, headY + 5); ctx.quadraticCurveTo(cx + 12, headY + 7, cx + 1, headY + 5); ctx.stroke();
  } else if (dir === 's') {
    eye(cx - 7, headY - 3);
    eye(cx + 7, headY - 3);
    ctx.fillStyle = dark;
    for (const nx of [cx - 2.4, cx + 2.4]) { ctx.beginPath(); ctx.ellipse(nx, headY + 11, 0.9, 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = dark; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(cx - 7, headY + 9); ctx.quadraticCurveTo(cx - 6, headY + 15, cx, headY + 15.5); ctx.quadraticCurveTo(cx + 6, headY + 15, cx + 7, headY + 9); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // Spines down the back of the head and neck.
  if (dir !== 's') {
    ctx.fillStyle = dark;
    for (let i = 0; i < 4; i++) {
      const y = headY - 10 + i * 6;
      const x = side ? cx - 9 - i * 1.2 : cx;
      ctx.beginPath();
      if (side) { ctx.moveTo(x + 1, y - 1); ctx.lineTo(x - 5, y + 2); ctx.lineTo(x + 1, y + 4); }
      else { ctx.moveTo(x - 2.5, y + 4); ctx.lineTo(x, y - 3); ctx.lineTo(x + 2.5, y + 4); }
      ctx.closePath(); ctx.fill();
    }
  }
}

// One frame. dir: 'n' | 's' | 'w' | 'e'; walking: the stride frame; gear:
// what's worn (gear.js), drawn over the look.
export function paintPerson(ctx, look, dir, walking, gear = {}) {
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

  // What's worn, over the look's own clothes.
  const armour = gear.torso && gear.torso.kind !== 'cape' ? gear.torso : null;
  const cape = gear.torso?.kind === 'cape' ? gear.torso.colour : null;
  const top = armour?.colour ?? look.top;
  const sleeves = gear.sleeves ?? top;
  const legs = gear.legs?.colour ?? look.legs;
  const trim = gear.belt ?? (armour ? shade(armour.colour, 0.7) : look.trim);
  const hand = gear.hands ?? look.skin;
  const plated = look.style === 'armour' || armour?.kind === 'plate' || armour?.kind === 'chain';
  const helm = gear.helm ?? (look.helm ? { kind: look.horns ? 'horned' : 'helm', colour: look.helm } : null);
  const bodyW = (side ? 26 : 36) - (look.slim ? 4 : 0);
  const bx = cx - bodyW / 2;
  const capePath = () => {
    ctx.beginPath();
    if (side) { ctx.moveTo(cx - 6, shoulderY); ctx.quadraticCurveTo(cx - 20, hipY, cx - 24 - stride * 4, feet - 10); ctx.lineTo(cx + 2, feet - 16); ctx.lineTo(cx + 6, shoulderY); }
    else { ctx.moveTo(bx - 1, shoulderY + 1); ctx.lineTo(bx + bodyW + 1, shoulderY + 1); ctx.lineTo(bx + bodyW + 9, feet - 12); ctx.quadraticCurveTo(cx, feet - 6 + stride * 2, bx - 9, feet - 12); }
    ctx.closePath();
  };

  // A cape hangs behind, except from behind.
  if (cape && dir !== 'n') part(ctx, capePath, shade(cape, 0.8), { x0: bx - 9, x1: bx + bodyW + 9 });

  // Lizard tail, behind everything but the shadow.
  let lizardTail = null;
  if (look.style === 'lizard') {
    const sway = walking ? 4 : 0;
    let tail;
    if (side) {
      tail = () => {
        ctx.beginPath();
        ctx.moveTo(cx - 4, hipY - 8);
        ctx.bezierCurveTo(cx - 22, hipY + 2, cx - 34, feet - 18, cx - 50 - sway, feet - 4);
        ctx.quadraticCurveTo(cx - 34, feet - 6, cx - 18, hipY + 22);
        ctx.quadraticCurveTo(cx - 8, hipY + 14, cx + 4, hipY + 8);
        ctx.closePath();
      };
    } else if (dir === 'n') {
      tail = () => {
        ctx.beginPath();
        ctx.moveTo(cx - 9, hipY - 4);
        ctx.bezierCurveTo(cx - 10, hipY + 20, cx + 4 + sway, feet - 14, cx + 18 + sway, feet - 2);
        ctx.quadraticCurveTo(cx + 2, feet - 6, cx + 9, hipY - 4);
        ctx.closePath();
      };
    } else {
      // From the front, just the tip curling out beside a leg.
      tail = () => {
        ctx.beginPath();
        ctx.moveTo(cx + 8, feet - 26);
        ctx.quadraticCurveTo(cx + 26, feet - 18, cx + 34 + sway, feet - 6);
        ctx.quadraticCurveTo(cx + 22, feet - 10, cx + 8, feet - 16);
        ctx.closePath();
      };
    }
    lizardTail = () => {
      part(ctx, tail, look.skin, { x0: cx - 50, x1: cx + 34 });
      ctx.save(); tail(); ctx.clip();
      scales(ctx, look.skin, cx - 52, hipY - 10, cx + 36, feet);
      ctx.restore();
    };
    // Seen from behind it's in front of everything, so it's drawn last.
    if (dir !== 'n') lizardTail();
  }

  // Legs and boots.
  const legW = 13;
  const knee = (lx, ky) => {
    if (!gear.legs?.plate) return;
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(lx + legW / 2 - 1, ky, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  };
  if (side) {
    const back = stride ? 10 : 2, front = stride ? -10 : -2;
    for (const [off, dark] of [[back, 0.8], [front, 1]]) {
      const lx = cx - legW / 2 + off;
      part(ctx, roundRect(ctx, lx, hipY, legW, feet - hipY - 8, 5), legs, { x0: lx, x1: lx + legW });
      knee(lx, hipY + 18);
      if (dark < 1) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(ctx, lx, hipY, legW, feet - hipY - 8, 5)(); ctx.fill(); }
      // Boots with the toe pointing the way they walk.
      part(ctx, () => { ctx.beginPath(); ctx.roundRect(lx - 1, feet - 15, legW + 2, 13, [4, 4, 2, 3]); ctx.roundRect(lx + legW - 6, feet - 9, 11, 7, [4, 5, 2, 2]); }, look.boots, { x0: lx, x1: lx + legW + 6 });
      if (look.style === 'lizard') claws(ctx, [[lx + legW + 5, feet - 4], [lx + legW + 2, feet - 2]], 'e');
    }
  } else {
    const lift = stride ? 5 : 0;
    for (const [lx, up] of [[cx - legW - 2, lift], [cx + 2, 0]]) {
      part(ctx, roundRect(ctx, lx, hipY, legW, feet - hipY - 8 - up, 5), legs, { x0: lx, x1: lx + legW });
      if (dir === 's') knee(lx, hipY + 18 - up * 0.5);
      part(ctx, roundRect(ctx, lx - 1, feet - 14 - up, legW + 2, 12, 4), look.boots, { x0: lx, x1: lx + legW + 2 });
      if (look.style === 'lizard' && dir === 's') claws(ctx, [0, 1, 2].map((i) => [lx + 2 + i * 4.5, feet - 2 - up]), 's');
    }
  }

  // A skirt (look.skirt: its colour) falls to below the knee.
  if (look.skirt && armour?.kind !== 'robe') {
    const hem = hipY + 30;
    part(ctx, () => {
      ctx.beginPath();
      if (side) { ctx.moveTo(cx - 12, hipY - 6); ctx.lineTo(cx + 12, hipY - 6); ctx.lineTo(cx + 16 + stride * 2, hem); ctx.quadraticCurveTo(cx, hem + 4, cx - 16 - stride * 2, hem); }
      else { ctx.moveTo(bx + 1, hipY - 6); ctx.lineTo(bx + bodyW - 1, hipY - 6); ctx.lineTo(bx + bodyW + 6, hem); ctx.quadraticCurveTo(cx, hem + 4, bx - 6, hem); }
      ctx.closePath();
    }, look.skirt, { x0: bx - 6, x1: bx + bodyW + 6 });
  }

  // A robe falls over the legs to the boots.
  if (armour?.kind === 'robe') {
    part(ctx, () => {
      ctx.beginPath();
      if (side) { ctx.moveTo(cx - 12, hipY - 6); ctx.lineTo(cx + 12, hipY - 6); ctx.lineTo(cx + 17 + stride * 3, feet - 11); ctx.quadraticCurveTo(cx, feet - 7, cx - 17 - stride * 3, feet - 11); }
      else { ctx.moveTo(bx + 1, hipY - 6); ctx.lineTo(bx + bodyW - 1, hipY - 6); ctx.lineTo(bx + bodyW + 7, feet - 11); ctx.quadraticCurveTo(cx, feet - 6, bx - 7, feet - 11); }
      ctx.closePath();
    }, top, { x0: bx - 7, x1: bx + bodyW + 7 });
  }

  // Hands: gloves if worn, else skin.
  const drawHand = (x, y) => part(ctx, ellipse(ctx, x, y, gear.hands ? 6.2 : 5.5, gear.hands ? 6.2 : 5.5), hand, { x0: x - 6, x1: x + 6 });

  // Side view: the back arm (swinging opposite the front leg), with the
  // shield held out in front of the body on it.
  const armW = 10;
  if (side) {
    const sw = stride ? -9 : 0;
    const ax = cx - armW / 2 + sw + 4;
    part(ctx, roundRect(ctx, ax, shoulderY + 4, armW, 34, 5), sleeves, { x0: cx - 10, x1: cx + 10 });
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, ax, shoulderY + 4, armW, 34, 5)(); ctx.fill();
  }

  // From behind, the weapon is in front of the character, mostly hidden.
  const handsNS = () => {
    const sw = stride ? 5 : 0;
    return [[bx - armW + 1, sw], [bx + bodyW - 1, -sw]].map(([ax, dy]) => ({ ax, dy, hx: ax + armW / 2, hy: shoulderY + 40 + dy * 0.3 }));
  };
  if (dir === 'n' && gear.weapon) {
    const h = handsNS()[1];
    drawWeapon(ctx, gear.weapon, h.hx, h.hy - 2, 0.22);
  }

  // Body.
  const bodyPath = torso(ctx, bx, shoulderY, bodyW, hipY - shoulderY + 6);
  part(ctx, bodyPath, top, { x0: bx, x1: bx + bodyW });
  if (look.style === 'lizard' && !armour) {
    ctx.save(); bodyPath(); ctx.clip();
    scales(ctx, top, bx, shoulderY, bx + bodyW, hipY + 6);
    ctx.restore();
    if (dir !== 'n') {
      // The belly: pale, in bands.
      const belly = roundRect(ctx, bx + (side ? 12 : 9), shoulderY + 6, bodyW - (side ? 13 : 18), hipY - shoulderY - 4, side ? [2, 8, 8, 2] : 9);
      part(ctx, belly, look.belly, { x0: bx, x1: bx + bodyW, edge: false });
      ctx.save(); belly(); ctx.clip();
      ctx.strokeStyle = shade(look.belly, 0.72); ctx.lineWidth = 1;
      for (let y = shoulderY + 11; y < hipY; y += 5) { ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(cx, y + 2, bx + bodyW, y); ctx.stroke(); }
      ctx.restore();
    }
    if (dir === 'n' || side) {
      // Spines down the back.
      ctx.fillStyle = shade(look.skin, 0.62);
      const sx = side ? bx + 2 : cx;
      for (let y = shoulderY + 2; y < hipY - 4; y += 7) {
        ctx.beginPath();
        if (side) { ctx.moveTo(sx, y); ctx.lineTo(sx - 5, y + 2); ctx.lineTo(sx, y + 5); }
        else { ctx.moveTo(sx - 2.5, y + 4); ctx.lineTo(sx, y - 2); ctx.lineTo(sx + 2.5, y + 4); }
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.save();
  bodyPath();
  ctx.clip();
  if (armour?.kind === 'chain') {
    // Mail: rows of little rings.
    ctx.strokeStyle = shade(top, 0.55); ctx.lineWidth = 1;
    for (let y = shoulderY + 4; y < hipY + 4; y += 4) {
      for (let x = bx + ((y / 4) % 2) * 2; x < bx + bodyW; x += 4) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI); ctx.stroke(); }
    }
  } else if (armour?.kind === 'leather' && dir !== 'n') {
    ctx.strokeStyle = shade(top, 0.55); ctx.lineWidth = 1.2; ctx.setLineDash([2.5, 2.5]);
    ctx.beginPath(); ctx.moveTo(side ? cx + 6 : cx, shoulderY + 4); ctx.lineTo(side ? cx + 6 : cx, hipY); ctx.stroke();
    ctx.setLineDash([]);
  } else if (armour?.kind === 'hide') {
    ctx.strokeStyle = shade(top, 0.65); ctx.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      const x = bx + ((i * 7.3) % bodyW), y = shoulderY + 6 + ((i * 11.7) % (hipY - shoulderY - 6));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y + 5); ctx.stroke();
    }
  } else if ((armour?.kind === 'cloth' || !armour) && dir === 's' && look.style === 'plain') {
    // A collar.
    ctx.strokeStyle = shade(top, 0.6); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 6, shoulderY); ctx.lineTo(cx, shoulderY + 8); ctx.lineTo(cx + 6, shoulderY); ctx.stroke();
  }
  if (plated) {
    // Plate: a breastplate highlight.
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(ctx, bx + 5, shoulderY + 6, bodyW * 0.4, 18, 6)(); ctx.fill();
  }
  // A chest wrap (look.wrap: its colour), under any armour.
  if (look.wrap && !armour) {
    const wy = shoulderY + 10;
    part(ctx, roundRect(ctx, bx - 1, wy, bodyW + 2, 9, 3), look.wrap, { x0: bx, x1: bx + bodyW });
  }
  ctx.restore();
  if (look.emblem && dir === 's' && !armour) {
    ctx.fillStyle = look.emblem;
    ctx.beginPath(); ctx.moveTo(cx, shoulderY + 12); ctx.lineTo(cx + 8, shoulderY + 20); ctx.lineTo(cx, shoulderY + 30); ctx.lineTo(cx - 8, shoulderY + 20); ctx.closePath(); ctx.fill();
  }
  // Belt, with a buckle from the front.
  part(ctx, roundRect(ctx, bx - 1, hipY - 4, bodyW + 2, 7, 3), trim, { x0: bx, x1: bx + bodyW });
  if (dir === 's' && (gear.belt || look.style === 'plain')) {
    ctx.strokeStyle = '#d8b850'; ctx.lineWidth = 1.6;
    ctx.strokeRect(cx - 3.5, hipY - 3, 7, 5);
  }
  if (gear.neck && dir === 's') {
    ctx.strokeStyle = shade(gear.neck, 0.8); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, shoulderY - 2, 8, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.shadowColor = gear.neck; ctx.shadowBlur = 6;
    part(ctx, ellipse(ctx, cx, shoulderY + 7, 3.2, 3.8), gear.neck, { x0: cx - 3, x1: cx + 3 });
    ctx.shadowBlur = 0;
  }
  if (plated) {
    const pc = armour ? shade(armour.colour, 1.1) : look.trim;
    for (const px of side ? [cx] : [bx - 4, bx + bodyW + 4]) part(ctx, ellipse(ctx, px, shoulderY + 4, side ? 12 : 9, 7), pc, { x0: px - 10, x1: px + 10 });
  }

  // Front arms, with the weapon in the right hand and the shield on the
  // left arm.
  if (side) {
    const sw = stride ? 9 : 0;
    if (gear.shield) drawShield(ctx, gear.shield, cx + 12, shoulderY + 30, { edgeOn: true });
    part(ctx, roundRect(ctx, cx - armW / 2 + sw - 3, shoulderY + 4, armW, 34, 5), sleeves, { x0: cx - 10, x1: cx + 10 });
    if (gear.weapon) drawWeapon(ctx, gear.weapon, cx + sw - 2, shoulderY + 38, gear.weapon.kind === 'crossbow' ? 0 : 0.5 + stride * 0.15);
    drawHand(cx + sw - 2, shoulderY + 40);
  } else {
    const [right, left] = dir === 's' ? handsNS() : handsNS().reverse();
    for (const h of [right, left]) {
      part(ctx, roundRect(ctx, h.ax, shoulderY + 3 + h.dy * 0.3, armW, 34, 5), sleeves, { x0: h.ax, x1: h.ax + armW });
      if (h === right && gear.weapon && dir === 's') drawWeapon(ctx, gear.weapon, h.hx, h.hy - 2, gear.weapon.kind === 'crossbow' ? -Math.PI / 2 + 0.3 : -0.28);
      drawHand(h.hx, h.hy);
      if (h === left && gear.shield) drawShield(ctx, gear.shield, h.hx + (dir === 's' ? 3 : -3), h.hy - 12, { back: dir === 'n' });
    }
  }

  // From behind, a cape covers the back and arms, and a tail hangs over it.
  if (cape && dir === 'n') part(ctx, capePath, cape, { x0: bx - 9, x1: bx + bodyW + 9 });
  if (dir === 'n') lizardTail?.();

  // Head.
  const headR = 13;
  const hx = cx + (side ? 2 : 0);
  const eyes = () => {
    if (!(dir === 's' || side)) return;
    ctx.fillStyle = '#1a1210';
    for (const ex of side ? [cx + 8] : [cx - 5, cx + 5]) { ctx.beginPath(); ctx.ellipse(ex, headY - 1, 1.8, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
    if (dir === 's' && !look.beard) {
      ctx.strokeStyle = shade(look.skin, 0.6); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(cx, headY + 3, 3.5, Math.PI * 0.25, Math.PI * 0.75); ctx.stroke();
    }
  };
  if (look.style === 'lizard') {
    lizardHead(ctx, look, { cx, headY, side, dir, shoulderY });
    if (helm) drawHelm(ctx, helm, { cx, hx, headY: headY - 3, headR: 12, side, dir });
  } else {
    // Neck, head, and features for faces seen from the front or side.
    part(ctx, roundRect(ctx, cx - 5, headY + 8, 10, 10, 3), look.skin, { x0: cx - 5, x1: cx + 5, edge: false });
    if (look.ears) {
      for (const ex of side ? [cx - 6] : [cx - headR, cx + headR]) {
        const tip = ex < cx ? -9 : 9;
        part(ctx, () => { ctx.beginPath(); ctx.moveTo(ex, headY - 2); ctx.lineTo(ex + tip, headY - 10); ctx.lineTo(ex + tip * 0.2, headY + 5); ctx.closePath(); }, look.skin);
      }
    }
    part(ctx, ellipse(ctx, hx, headY, headR, headR + 1), look.skin, { x0: cx - headR, x1: cx + headR });
    if (look.beard && dir !== 'n') part(ctx, ellipse(ctx, cx + (side ? 5 : 0), headY + 10, side ? 7 : 10, 7), look.beard, { x0: cx - 10, x1: cx + 10 });
    // Hair, unless a full helmet hides it, in the look's style (see
    // drawHair): short with a swept fringe unless it says otherwise.
    if (look.hair && !(helm && helm.kind !== 'mask')) drawHair(ctx, look, { cx, hx, headY, headR, side, dir, shoulderY });
    if (helm?.kind !== 'great') eyes();
    if (gear.eyes && dir !== 'n') {
      // Goggles or lenses.
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(side ? cx - 8 : cx - headR, headY - 2.5, side ? headR + 8 : headR * 2, 2.5);
      for (const ex of side ? [cx + 8] : [cx - 5, cx + 5]) part(ctx, ellipse(ctx, ex, headY - 1, 3.6, 3.2), gear.eyes, { x0: ex - 4, x1: ex + 4 });
    }
    if (helm) drawHelm(ctx, helm, { cx, hx, headY, headR, side, dir });
  }
  ctx.restore();
}

// Hair styles (look.hairStyle): 'short' (the default: a cap with a
// swept fringe, the forehead showing), 'long' (to the shoulders),
// 'ponytail', 'bun', 'bald'.
function drawHair(ctx, look, { cx, hx, headY, headR, side, dir, shoulderY }) {
  const style = look.hairStyle ?? 'short';
  if (style === 'bald') return;
  const c = look.hair;
  const opts = { x0: cx - headR, x1: cx + headR };
  const top = headY - headR - 3;
  // Behind the head: long hair and ponytails, seen from behind or the side.
  if (style === 'long' && dir !== 'n') {
    part(ctx, () => {
      ctx.beginPath();
      if (side) { ctx.moveTo(hx - 8, headY - 6); ctx.quadraticCurveTo(hx - 16, headY + 10, hx - 12, shoulderY + 14); ctx.lineTo(hx - 2, shoulderY + 10); ctx.quadraticCurveTo(hx - 4, headY + 6, hx + 2, headY - 8); }
      else {
        for (const d of [-1, 1]) {
          ctx.moveTo(cx + d * (headR - 2), headY - 6);
          ctx.quadraticCurveTo(cx + d * (headR + 5), headY + 8, cx + d * (headR + 3), shoulderY + 12);
          ctx.lineTo(cx + d * (headR - 4), shoulderY + 10);
          ctx.quadraticCurveTo(cx + d * (headR - 1), headY + 6, cx + d * (headR - 6), headY - 4);
        }
      }
      ctx.closePath();
    }, c, opts);
  }
  if (style === 'ponytail' && (side || dir === 'n')) {
    const tx = side ? hx - headR - 1 : cx;
    part(ctx, () => { ctx.beginPath(); ctx.moveTo(tx - 3, headY - 6); ctx.quadraticCurveTo(tx - (side ? 10 : 0) - 4, headY + 6, tx - (side ? 8 : 0), shoulderY + 6); ctx.quadraticCurveTo(tx - (side ? 2 : -5), headY + 6, tx + 4, headY - 6); ctx.closePath(); }, c, opts);
  }
  if (style === 'bun') {
    const bx = side ? hx - headR + 2 : cx;
    part(ctx, ellipse(ctx, bx, dir === 's' ? top + 1 : headY - headR + 2, 7, 6), c, opts);
  }
  // The top of the head.
  part(ctx, () => {
    ctx.beginPath();
    if (dir === 'n') {
      ctx.arc(cx, headY - 2, headR + 1.5, Math.PI, Math.PI * 2);
      const fall = style === 'long' ? shoulderY + 12 - headY : style === 'short' ? 4 : 6;
      ctx.lineTo(cx + headR + 1, headY + fall);
      ctx.quadraticCurveTo(cx, headY + fall + 5, cx - headR - 1, headY + fall);
    } else if (side) {
      // Over the crown and down the back, a fringe at the front.
      ctx.moveTo(hx + headR - 1, headY - 5);
      ctx.quadraticCurveTo(hx + headR, top + 2, hx + 2, top);
      ctx.quadraticCurveTo(hx - headR - 3, top + 1, hx - headR - 1, headY + 4);
      ctx.lineTo(hx - headR + 5, headY + (style === 'long' ? 8 : 3));
      ctx.quadraticCurveTo(hx - 4, headY - 6, hx + 3, headY - 7);
      ctx.quadraticCurveTo(hx + 8, headY - 9, hx + headR - 1, headY - 5);
    } else {
      // Temples, over the top, and a fringe swept to one side.
      ctx.moveTo(cx - headR - 1, headY);
      ctx.quadraticCurveTo(cx - headR - 2, top + 1, cx, top);
      ctx.quadraticCurveTo(cx + headR + 2, top + 1, cx + headR + 1, headY);
      ctx.lineTo(cx + headR - 2, headY - 4);
      ctx.quadraticCurveTo(cx + 4, headY - 11, cx - 6, headY - 6);
      ctx.quadraticCurveTo(cx - headR + 3, headY - 4, cx - headR + 1, headY + 1);
    }
    ctx.closePath();
  }, c, opts);
}

function drawHelm(ctx, helm, { cx, hx, headY, headR, side, dir }) {
  const c = helm.colour;
  switch (helm.kind) {
    case 'cap':
      part(ctx, () => { ctx.beginPath(); ctx.arc(hx, headY - 2, headR + 1, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); }, c, { x0: cx - headR, x1: cx + headR });
      if (side) part(ctx, roundRect(ctx, cx + 6, headY - 5, 11, 3.5, 2), c, { x0: cx, x1: cx + 16 });
      break;
    case 'mask':
      if (dir !== 'n') part(ctx, () => { ctx.beginPath(); ctx.roundRect(side ? cx + 2 : cx - 10, headY + 1, side ? 13 : 20, 11, 5); }, c, { x0: cx - 10, x1: cx + 10 });
      else part(ctx, roundRect(ctx, cx - headR, headY + 2, headR * 2, 3, 1.5), c);
      break;
    case 'great':
      // A full helm with a visor slit.
      part(ctx, () => { ctx.beginPath(); ctx.roundRect(hx - headR - 2, headY - headR - 3, (headR + 2) * 2, (headR + 2) * 2 + 2, [headR + 2, headR + 2, 6, 6]); }, c, { x0: cx - headR, x1: cx + headR });
      if (dir !== 'n') {
        ctx.fillStyle = '#141014';
        ctx.fillRect(side ? cx + 1 : cx - 9, headY - 3, side ? 14 : 18, 3.2);
        if (dir === 's') ctx.fillRect(cx - 1.3, headY - 1, 2.6, 8);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(hx - 5, headY - 9, 3.5, 5, -0.4, 0, Math.PI * 2); ctx.fill();
      break;
    default: {
      // A dome helmet with a brim, a nose guard from the front, and horns
      // for the horned kind.
      part(ctx, () => { ctx.beginPath(); ctx.arc(hx, headY - 1, headR + 2, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); }, c, { x0: cx - headR, x1: cx + headR });
      part(ctx, roundRect(ctx, hx - headR - 2, headY - 3, (headR + 2) * 2, 5, 2), c, { x0: cx - headR, x1: cx + headR });
      if (dir === 's') part(ctx, roundRect(ctx, cx - 1.6, headY - 2, 3.2, 9, 1.5), c, { x0: cx - 2, x1: cx + 2 });
      if (helm.kind === 'horned') {
        for (const hxx of side ? [cx - 6] : [cx - headR - 1, cx + headR + 1]) {
          const d = hxx < cx ? -1 : 1;
          part(ctx, () => { ctx.beginPath(); ctx.moveTo(hxx, headY - 6); ctx.quadraticCurveTo(hxx + d * 12, headY - 10, hxx + d * 10, headY - 26); ctx.quadraticCurveTo(hxx + d * 5, headY - 12, hxx - d * 2, headY - 2); ctx.closePath(); }, '#ece4cc');
        }
      }
    }
  }
}

// The 8 frames of one look (standing/walking × n, s, w, e), OUT px each,
// in a strip.
export function paintFigureStrip(look, gear = {}) {
  const strip = document.createElement('canvas');
  strip.width = 8 * OUT;
  strip.height = OUT;
  const ctx = strip.getContext('2d');
  for (let f = 0; f < 8; f++) {
    ctx.save();
    ctx.translate(f * OUT, 0);
    ctx.beginPath(); ctx.rect(0, 0, OUT, OUT); ctx.clip();
    paintPerson(ctx, look, DIRS[f >> 1], f % 2 === 1, gear);
    ctx.restore();
  }
  return strip;
}

// A players.gif-shaped sheet: 8 frames per look, OUT px each.
export function paintPeopleSheet(count = LOOKS.length) {
  const sheet = document.createElement('canvas');
  sheet.width = count * 8 * OUT;
  sheet.height = OUT;
  const ctx = sheet.getContext('2d');
  for (let i = 0; i < count; i++) ctx.drawImage(paintFigureStrip(LOOKS[i] ?? LOOKS[0]), i * 8 * OUT, 0);
  return sheet;
}
