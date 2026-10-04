// Items by name. Most of the server's items share a handful of pictures
// (sprite 6, a bag, is ninety different things: potions, gems, apples,
// teeth...), so in the Painted style items on the ground are drawn by name
// instead: one frame per item that belongs to a family below, with the
// colour and shape picked from its name (a red potion is a red flask, every
// key a key), into an "items" sheet plus an index from name to frame. Items
// with no family keep their picture's art.
//
// Weapons and armour are drawn lying on the ground with the same shapes and
// materials your character wears them in (js/figure.js, js/gear.js).

import { drawWeapon, drawShield, paintPerson } from './figure.js';
import { material, weaponKind, torsoKind, helmKind } from './gear.js';

const OUT = 128;
const CX = 64, GROUND = 96;

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function fill(ctx, path, colour, [x0, y0, x1, y1] = [20, 20, 108, 108], edge = 2) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, shade(colour, 1.3)); g.addColorStop(0.5, colour); g.addColorStop(1, shade(colour, 0.62));
  ctx.fillStyle = g;
  path();
  ctx.fill();
  if (edge) { ctx.strokeStyle = shade(colour, 0.4); ctx.lineWidth = edge; ctx.lineJoin = 'round'; ctx.stroke(); }
}
const ell = (ctx, x, y, rx, ry, a = 0) => () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); };
const rr = (ctx, x, y, w, h, r) => () => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const poly = (ctx, pts) => () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
function shadow(ctx, rx = 30, ry = 8, y = GROUND) {
  const g = ctx.createRadialGradient(CX, y, 1, CX, y, rx);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(CX, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function glint(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, -0.6, 0, Math.PI * 2); ctx.fill();
}
function glow(ctx, colour, blur, draw) {
  ctx.save(); ctx.shadowColor = colour; ctx.shadowBlur = blur; draw(); ctx.restore();
}

// Colours named in item names, for potions, gems, books and stones.
const HUES = [
  [/red|ruby|blood|fire|flame|rose/, '#c8242c'],
  [/blue|mana|sapphire|water|ice/, '#2c5cd0'],
  [/green|emerald|forest|poison/, '#2a9a3c'],
  [/purple|amethyst|anti-curse|chaos|curse/, '#8a38b8'],
  [/sleep|lavend/, '#a88ad8'],
  [/gold|elix|x-potion|ambrosia|sun|divine|god/, '#e0b030'],
  [/dark|shadow|death|ink|black/, '#2a2230'],
  [/white|diamond|opal|pearl|crystal|xyphoid/, '#d8eef8'],
  [/sand/, '#d6bc84'],
];
const hue = (n, fallback) => HUES.find(([re]) => re.test(n))?.[1] ?? fallback;

// ---- the painters: each draws one item centred on the frame ----

function potion(ctx, n) {
  const c = hue(n, '#d0508a');
  const s = /tiny|minor/.test(n) ? 0.78 : /x-potion|elix|ambrosia/.test(n) ? 1.1 : 1;
  shadow(ctx, 22 * s, 6);
  ctx.save(); ctx.translate(CX, GROUND); ctx.scale(s, s); ctx.translate(-CX, -GROUND);
  const body = () => { ctx.beginPath(); ctx.moveTo(CX - 7, 44); ctx.lineTo(CX - 7, 58); ctx.bezierCurveTo(CX - 30, 66, CX - 28, 96, CX, 96); ctx.bezierCurveTo(CX + 28, 96, CX + 30, 66, CX + 7, 58); ctx.lineTo(CX + 7, 44); ctx.closePath(); };
  // Glass, then the liquid inside it, then the shine.
  ctx.fillStyle = 'rgba(220,235,240,0.35)'; body(); ctx.fill();
  ctx.save(); body(); ctx.clip();
  glow(ctx, c, /x-potion|elix|ambrosia|mana|anti-curse/.test(n) ? 10 : 0, () => fill(ctx, rr(ctx, CX - 32, 66, 64, 34, 0), c, [CX - 30, 66, CX + 30, 96], 0));
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(CX - 32, 66, 64, 3);
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,50,60,0.75)'; ctx.lineWidth = 2; body(); ctx.stroke();
  glint(ctx, CX - 12, 74, 4);
  fill(ctx, rr(ctx, CX - 6, 34, 12, 12, 3), '#9a6a3a', [CX - 6, 34, CX + 6, 46]);
  ctx.restore();
}

function vial(ctx, n) {
  const c = hue(n, '#6a1418');
  shadow(ctx, 14, 5);
  ctx.fillStyle = 'rgba(220,235,240,0.35)'; rr(ctx, CX - 8, 46, 16, 48, 7)(); ctx.fill();
  fill(ctx, rr(ctx, CX - 8, 62, 16, 32, 7), c, [CX - 8, 60, CX + 8, 94], 0);
  ctx.strokeStyle = 'rgba(40,50,60,0.75)'; ctx.lineWidth = 2; rr(ctx, CX - 8, 46, 16, 48, 7)(); ctx.stroke();
  fill(ctx, rr(ctx, CX - 6, 38, 12, 10, 3), '#9a6a3a');
  glint(ctx, CX - 3, 70, 2.5);
}

function key(ctx, n) {
  const c = /gold|golden/.test(n) ? '#e0b030' : /dark|shadow/.test(n) ? '#4a4450' : /dragon/.test(n) ? '#3c8a44' : /crystal|bifrost/.test(n) ? '#9ad8f0' : /silver|vault|safe/.test(n) ? '#c8ccd4' : '#c09040';
  shadow(ctx, 30, 7);
  ctx.save(); ctx.translate(CX, 76); ctx.rotate(-0.5);
  const shape = () => {
    ctx.beginPath();
    ctx.arc(-24, 0, 12, 0, Math.PI * 2);
    ctx.rect(-14, -3.5, 44, 7);
    ctx.rect(20, 3, 5, 9); ctx.rect(28, 3, 4, 12);
  };
  fill(ctx, shape, c, [-36, -12, 34, 14]);
  ctx.fillStyle = '#1a1a14'; ctx.beginPath(); ctx.arc(-24, 0, 5, 0, Math.PI * 2); ctx.fill();
  glint(ctx, -28, -6, 3);
  ctx.restore();
}

function gem(ctx, n) {
  const c = hue(n, '#40c8a8');
  shadow(ctx, 20, 6);
  glow(ctx, c, 12, () => fill(ctx, poly(ctx, [[CX - 20, 66], [CX - 11, 54], [CX + 11, 54], [CX + 20, 66], [CX, 94]]), c, [CX - 20, 54, CX + 20, 94]));
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(CX - 20, 66); ctx.lineTo(CX + 20, 66); ctx.moveTo(CX - 11, 54); ctx.lineTo(CX - 6, 66); ctx.lineTo(CX, 94); ctx.lineTo(CX + 6, 66); ctx.lineTo(CX + 11, 54); ctx.stroke();
  glint(ctx, CX - 9, 60, 3);
}

function crystal(ctx, n) {
  const c = hue(n, '#9ad8f0');
  shadow(ctx, 22, 6);
  for (const [dx, h, w, a] of [[-12, 30, 9, -0.3], [12, 26, 8, 0.35], [0, 44, 11, 0]]) {
    ctx.save(); ctx.translate(CX + dx, 94); ctx.rotate(a);
    glow(ctx, c, 10, () => fill(ctx, poly(ctx, [[-w, 0], [-w, -h], [0, -h - 10], [w, -h], [w, 0]]), c, [-w, -h, w, 0]));
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-w + 2, -h, 3, h - 2);
    ctx.restore();
  }
}

function stone(ctx, n) {
  const c = hue(n, '#8a8478');
  shadow(ctx, 26, 7);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 26, 92); ctx.bezierCurveTo(CX - 32, 70, CX - 12, 56, CX + 4, 60); ctx.bezierCurveTo(CX + 26, 60, CX + 32, 80, CX + 24, 94); ctx.closePath(); }, c, [CX - 30, 58, CX + 30, 94]);
  if (/pentagram/.test(n)) {
    glow(ctx, '#ff4040', 6, () => {
      ctx.strokeStyle = '#ff5040'; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 4 / 5); const x = CX + Math.cos(a) * 11, y = 78 + Math.sin(a) * 11; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    });
  } else if (/xyphoid|chaos/.test(n)) {
    glow(ctx, c, 10, () => { ctx.fillStyle = shade(c, 1.4); ctx.beginPath(); ctx.arc(CX, 76, 5, 0, Math.PI * 2); ctx.fill(); });
  }
  glint(ctx, CX - 10, 68, 4);
}

function ore(ctx, n) {
  stone(ctx, 'grey');
  const c = material(n);
  for (const [x, y, r] of [[-10, 76, 4], [6, 70, 3], [12, 84, 4.5], [-2, 86, 3]]) fill(ctx, ell(ctx, CX + x, y, r, r * 0.8), c, [CX + x - r, y - r, CX + x + r, y + r], 1);
}

function orb(ctx, n) {
  const c = /fire|flame/.test(n) ? '#f06020' : /demon/.test(n) ? '#a01818' : /chaos/.test(n) ? '#9040c8' : /soul/.test(n) ? '#a8d0ff' : '#60c0f0';
  shadow(ctx, 20, 6);
  glow(ctx, c, 22, () => fill(ctx, ell(ctx, CX, 72, 20, 20), c, [CX - 20, 52, CX + 20, 92], 1.5));
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(CX + 4, 76, 11, 0, Math.PI * 2); ctx.fill();
  glint(ctx, CX - 8, 63, 5);
}

function coins(ctx) {
  shadow(ctx, 30, 8);
  const coin = (x, y) => { fill(ctx, ell(ctx, x, y, 11, 5), '#e0b030', [x - 11, y - 5, x + 11, y + 5], 1.2); ctx.fillStyle = shade('#e0b030', 1.25); ctx.fillRect(x - 5, y - 1, 10, 1.5); };
  for (const [x, y] of [[-16, 92], [0, 94], [16, 92], [-8, 88], [8, 88], [0, 83], [-10, 82], [10, 81], [0, 76], [-4, 70], [3, 65]]) coin(CX + x, y);
}

function book(ctx, n) {
  const c = /chaos/.test(n) ? '#6a2a8a' : /blood/.test(n) ? '#8a1a1a' : /spell|magic/.test(n) ? '#2a4aa0' : /ramaden/.test(n) ? '#2a6a3a' : '#7a4a26';
  shadow(ctx, 30, 7);
  ctx.save(); ctx.translate(CX, 80); ctx.rotate(-0.12);
  fill(ctx, rr(ctx, -26, -8, 52, 18, 3), '#e8dcc0', [-26, -8, 26, 10], 1.5);
  ctx.strokeStyle = '#b8a888'; ctx.lineWidth = 1;
  for (let y = -4; y < 10; y += 3) { ctx.beginPath(); ctx.moveTo(-24, y); ctx.lineTo(24, y); ctx.stroke(); }
  fill(ctx, rr(ctx, -28, -24, 56, 18, 3), c, [-28, -24, 28, -6]);
  fill(ctx, rr(ctx, -28, -8, 56, 4, 2), shade(c, 0.8), [-28, -8, 28, -4], 1);
  ctx.strokeStyle = '#d8b050'; ctx.lineWidth = 1.5; ctx.strokeRect(-20, -20, 40, 10);
  if (/chaos|spell|tome|magic/.test(n)) glow(ctx, '#f0d070', 6, () => { ctx.fillStyle = '#f0d070'; ctx.beginPath(); ctx.arc(0, -15, 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}

function scroll(ctx) {
  shadow(ctx, 30, 7);
  ctx.save(); ctx.translate(CX, 80); ctx.rotate(-0.35);
  fill(ctx, rr(ctx, -26, -9, 52, 18, 3), '#e8d8b0', [-26, -9, 26, 9]);
  for (const x of [-28, 28]) fill(ctx, ell(ctx, x, 0, 5, 11), '#d8c898', [x - 5, -11, x + 5, 11], 1.5);
  fill(ctx, rr(ctx, -3, -10, 6, 20, 1), '#a82020', [-3, -10, 3, 10], 1);
  ctx.restore();
}

function paper(ctx) {
  shadow(ctx, 28, 6);
  ctx.save(); ctx.translate(CX, 82); ctx.rotate(0.2);
  fill(ctx, poly(ctx, [[-22, -14], [22, -16], [24, 12], [-20, 14]]), '#ece4d0', [-22, -16, 24, 14], 1.5);
  ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 1.2;
  for (let y = -9; y < 10; y += 4) { ctx.beginPath(); ctx.moveTo(-16, y); ctx.lineTo(16 - (y > 5 ? 12 : 0), y - 0.6); ctx.stroke(); }
  ctx.restore();
}

function apple(ctx) {
  shadow(ctx, 18, 5);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX, 66); ctx.bezierCurveTo(CX - 26, 54, CX - 26, 96, CX, 94); ctx.bezierCurveTo(CX + 26, 96, CX + 26, 54, CX, 66); ctx.closePath(); }, '#c8242c', [CX - 20, 60, CX + 20, 94]);
  ctx.strokeStyle = '#4a2e18'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(CX, 66); ctx.quadraticCurveTo(CX + 2, 58, CX + 5, 54); ctx.stroke();
  fill(ctx, ell(ctx, CX + 10, 58, 7, 3.5, -0.5), '#3a8a2a', [CX + 3, 54, CX + 17, 62], 1);
  glint(ctx, CX - 9, 72, 3.5);
}

function egg(ctx) {
  shadow(ctx, 16, 5);
  fill(ctx, ell(ctx, CX, 78, 14, 18), '#ece0c8', [CX - 14, 60, CX + 14, 96], 1.5);
  glint(ctx, CX - 5, 70, 3);
}

function mushroom(ctx) {
  shadow(ctx, 20, 5);
  fill(ctx, rr(ctx, CX - 6, 72, 12, 22, 5), '#ece0c8', [CX - 6, 72, CX + 6, 94], 1.5);
  fill(ctx, () => { ctx.beginPath(); ctx.ellipse(CX, 74, 24, 18, 0, Math.PI, Math.PI * 2); ctx.closePath(); }, '#b8322a', [CX - 24, 56, CX + 24, 74]);
  ctx.fillStyle = '#f4ecd8';
  for (const [x, y, r] of [[-12, 67, 3.5], [4, 62, 4], [14, 69, 3]]) { ctx.beginPath(); ctx.arc(CX + x, y, r, 0, Math.PI * 2); ctx.fill(); }
}

function sandwich(ctx) {
  shadow(ctx, 28, 7);
  fill(ctx, poly(ctx, [[CX - 26, 90], [CX + 26, 90], [CX, 66]]), '#d8a860', [CX - 26, 66, CX + 26, 90]);
  ctx.fillStyle = '#5aa83a'; ctx.fillRect(CX - 24, 85, 48, 3);
  ctx.fillStyle = '#c85a4a'; ctx.fillRect(CX - 22, 82, 44, 3);
  fill(ctx, poly(ctx, [[CX - 26, 82], [CX + 26, 82], [CX, 58]]), '#e8c080', [CX - 26, 58, CX + 26, 82]);
}

function packet(ctx) {
  shadow(ctx, 20, 6);
  fill(ctx, poly(ctx, [[CX - 18, 58], [CX + 18, 58], [CX + 20, 94], [CX - 20, 94]]), '#d83030', [CX - 20, 58, CX + 20, 94]);
  ctx.fillStyle = '#f0d040'; ctx.beginPath(); ctx.ellipse(CX, 76, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a1a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(CX - 18, 62); ctx.lineTo(CX + 18, 62); ctx.stroke();
}

function mug(ctx) {
  shadow(ctx, 22, 6);
  ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(CX + 17, 78, 9, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  fill(ctx, rr(ctx, CX - 16, 60, 32, 34, 4), '#8a5a30', [CX - 16, 60, CX + 16, 94]);
  ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 2;
  for (const y of [68, 86]) { ctx.beginPath(); ctx.moveTo(CX - 16, y); ctx.lineTo(CX + 16, y); ctx.stroke(); }
  fill(ctx, ell(ctx, CX, 60, 17, 6), '#f4ecd8', [CX - 17, 54, CX + 17, 66], 1.5);
}

function herb(ctx, n) {
  const c = /rose|red/.test(n) ? '#c8242c' : /lavend|sleep/.test(n) ? '#9a78d0' : /wolfsbane/.test(n) ? '#5a4ab0' : /azeala|azalea/.test(n) ? '#e060a0' : '#e8d850';
  shadow(ctx, 22, 5);
  ctx.strokeStyle = '#3a6a2a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const [dx, top] of [[-8, 62], [0, 54], [9, 60]]) {
    ctx.beginPath(); ctx.moveTo(CX + dx * 0.3, 94); ctx.quadraticCurveTo(CX + dx, 80, CX + dx, top); ctx.stroke();
    fill(ctx, ell(ctx, CX + dx + 5, top + 14, 5, 2.5, -0.6), '#4a8a34', [0, 0, 128, 128], 0);
  }
  if (/mandrake/.test(n)) {
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 10, 84); ctx.bezierCurveTo(CX - 14, 100, CX + 14, 100, CX + 10, 84); ctx.closePath(); }, '#c8a070', [CX - 12, 84, CX + 12, 98]);
  } else {
    for (const [dx, top] of [[-8, 62], [0, 54], [9, 60]]) {
      for (let i = 0; i < 5; i++) { ctx.fillStyle = shade(c, 0.85 + i * 0.07); ctx.beginPath(); ctx.arc(CX + dx + Math.cos(i * 1.26) * 4, top + Math.sin(i * 1.26) * 4, 3.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f4e8a0'; ctx.beginPath(); ctx.arc(CX + dx, top, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function fang(ctx) {
  shadow(ctx, 22, 5);
  for (const [dx, a] of [[-8, -0.25], [8, 0.25]]) {
    ctx.save(); ctx.translate(CX + dx, 64); ctx.rotate(a);
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-6, 20, 1, 32); ctx.quadraticCurveTo(5, 18, 7, 0); ctx.closePath(); }, '#ece4cc', [-7, 0, 7, 32], 1.5);
    ctx.restore();
  }
}

function claw(ctx) {
  shadow(ctx, 24, 5);
  ctx.save(); ctx.translate(CX - 16, 90);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, -34, 36, -34); ctx.quadraticCurveTo(18, -24, 12, 2); ctx.closePath(); }, '#3a3430', [0, -34, 36, 2], 1.5);
  ctx.restore();
}

function stinger(ctx) {
  shadow(ctx, 24, 5);
  fill(ctx, poly(ctx, [[CX - 18, 70], [CX + 26, 88], [CX - 14, 90]]), '#d8c040', [CX - 18, 70, CX + 26, 90], 1.5);
  ctx.fillStyle = '#2a2418'; ctx.fillRect(CX - 18, 72, 5, 16);
}

function horns(ctx) {
  shadow(ctx, 28, 6);
  for (const d of [-1, 1]) {
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX + d * 4, 92); ctx.quadraticCurveTo(CX + d * 30, 88, CX + d * 26, 56); ctx.quadraticCurveTo(CX + d * 20, 80, CX + d * 4, 82); ctx.closePath(); }, '#3a2a28', [CX - 30, 56, CX + 30, 92], 1.5);
  }
}

function scales(ctx, n) {
  const c = /divine/.test(n) ? '#e8d890' : /lizard|serpent|dragon/.test(n) ? '#3c8a44' : '#6a9a8a';
  shadow(ctx, 22, 6);
  for (const [x, y] of [[-10, 84], [10, 84], [0, 74]]) {
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX + x - 12, y - 6); ctx.quadraticCurveTo(CX + x, y - 14, CX + x + 12, y - 6); ctx.quadraticCurveTo(CX + x + 10, y + 8, CX + x, y + 12); ctx.quadraticCurveTo(CX + x - 10, y + 8, CX + x - 12, y - 6); ctx.closePath(); }, c, [CX + x - 12, y - 12, CX + x + 12, y + 12], 1.5);
  }
}

function wings(ctx) {
  shadow(ctx, 34, 6);
  for (const d of [-1, 1]) {
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX, 88); ctx.lineTo(CX + d * 8, 54); ctx.lineTo(CX + d * 40, 60); ctx.quadraticCurveTo(CX + d * 30, 72, CX + d * 36, 84); ctx.quadraticCurveTo(CX + d * 20, 80, CX, 88); ctx.closePath(); }, '#5a3a3a', [CX - 40, 54, CX + 40, 88], 1.5);
  }
}

function bones(ctx) {
  shadow(ctx, 32, 7);
  const bone = (a, y) => {
    ctx.save(); ctx.translate(CX, y); ctx.rotate(a);
    fill(ctx, () => { ctx.beginPath(); ctx.roundRect(-24, -3.5, 48, 7, 3); for (const x of [-26, 26]) for (const dy of [-4, 4]) { ctx.moveTo(x + 5, dy); ctx.arc(x, dy, 5, 0, Math.PI * 2); } }, '#e8e0c8', [-30, -8, 30, 8], 1.5);
    ctx.restore();
  };
  bone(0.4, 84); bone(-0.35, 82);
}

function skull(ctx) {
  shadow(ctx, 22, 6);
  fill(ctx, () => { ctx.beginPath(); ctx.arc(CX, 72, 18, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(CX + 10, 94); ctx.lineTo(CX - 10, 94); ctx.closePath(); }, '#ece4cc', [CX - 18, 54, CX + 18, 94], 1.5);
  ctx.fillStyle = '#2a2420';
  for (const x of [-7, 7]) { ctx.beginPath(); ctx.ellipse(CX + x, 74, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(CX, 80); ctx.lineTo(CX - 3, 86); ctx.lineTo(CX + 3, 86); ctx.closePath(); ctx.fill();
}

function dust(ctx) {
  shadow(ctx, 18, 5);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 6, 64); ctx.bezierCurveTo(CX - 26, 70, CX - 22, 96, CX, 95); ctx.bezierCurveTo(CX + 22, 96, CX + 26, 70, CX + 6, 64); ctx.closePath(); }, '#d8b8e8', [CX - 22, 64, CX + 22, 95]);
  ctx.strokeStyle = '#8a5aa0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(CX - 8, 66); ctx.lineTo(CX + 8, 66); ctx.stroke();
  glow(ctx, '#fff6a0', 8, () => { ctx.fillStyle = '#fff6c0'; for (const [x, y] of [[-14, 50], [2, 44], [14, 54], [-4, 56], [20, 44]]) { ctx.beginPath(); ctx.arc(CX + x, y, 1.8, 0, Math.PI * 2); ctx.fill(); } });
}

function bag(ctx, n) {
  const c = /cloth|small/.test(n) ? '#a88a60' : '#7a4a26';
  const s = /small/.test(n) ? 0.82 : 1;
  shadow(ctx, 26 * s, 7);
  ctx.save(); ctx.translate(CX, GROUND); ctx.scale(s, s); ctx.translate(-CX, -GROUND);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 8, 56); ctx.bezierCurveTo(CX - 34, 64, CX - 30, 96, CX, 95); ctx.bezierCurveTo(CX + 30, 96, CX + 34, 64, CX + 8, 56); ctx.closePath(); }, c, [CX - 30, 56, CX + 30, 95]);
  fill(ctx, poly(ctx, [[CX - 10, 56], [CX - 14, 46], [CX, 52], [CX + 14, 46], [CX + 10, 56]]), c, [CX - 14, 46, CX + 14, 56], 1.5);
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CX - 10, 57); ctx.lineTo(CX + 10, 57); ctx.stroke();
  ctx.restore();
}

function box(ctx, n) {
  const c = /crystal/.test(n) ? '#9ad8f0' : /shifty/.test(n) ? '#2e9a64' : '#8a5a30';
  shadow(ctx, 28, 7);
  fill(ctx, rr(ctx, CX - 22, 68, 44, 26, 3), c, [CX - 22, 68, CX + 22, 94]);
  fill(ctx, rr(ctx, CX - 24, 60, 48, 12, 3), shade(c, 1.1), [CX - 24, 60, CX + 24, 72]);
  fill(ctx, rr(ctx, CX - 4, 66, 8, 9, 2), '#d8b050', [CX - 4, 66, CX + 4, 75], 1);
}

function chest(ctx) {
  shadow(ctx, 36, 8);
  fill(ctx, rr(ctx, CX - 32, 66, 64, 30, 3), '#7a4a26', [CX - 32, 66, CX + 32, 96]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 32, 68); ctx.lineTo(CX - 32, 58); ctx.quadraticCurveTo(CX, 42, CX + 32, 58); ctx.lineTo(CX + 32, 68); ctx.closePath(); }, '#8a5a30', [CX - 32, 46, CX + 32, 68]);
  ctx.fillStyle = '#3a3030';
  for (const x of [-24, 20]) ctx.fillRect(CX + x, 50, 5, 46);
  fill(ctx, rr(ctx, CX - 5, 62, 10, 12, 2), '#d8b050', [CX - 5, 62, CX + 5, 74], 1);
}

// Storage barrels (the server's Storage props) stand as big as a person's
// middle, so they're drawn larger than things on the ground.
function barrel(ctx) {
  shadow(ctx, 38, 9, 110);
  const top = 26, bottom = 108, w = 30, bulge = 6;
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(CX - w, top + 6);
    ctx.quadraticCurveTo(CX - w - bulge * 2, (top + bottom) / 2, CX - w, bottom - 4);
    ctx.quadraticCurveTo(CX, bottom + 6, CX + w, bottom - 4);
    ctx.quadraticCurveTo(CX + w + bulge * 2, (top + bottom) / 2, CX + w, top + 6);
    ctx.closePath();
  };
  fill(ctx, body, '#8a5a30', [CX - w - bulge, top, CX + w + bulge, bottom]);
  // Staves.
  ctx.save(); body(); ctx.clip();
  ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.lineWidth = 1.5;
  for (const f of [-0.66, -0.33, 0, 0.33, 0.66]) {
    ctx.beginPath(); ctx.moveTo(CX + f * w, top); ctx.quadraticCurveTo(CX + f * (w + bulge * 2), (top + bottom) / 2, CX + f * w, bottom + 4); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,230,190,0.12)'; ctx.fillRect(CX - w * 0.55, top, w * 0.3, bottom - top);
  ctx.restore();
  // Iron hoops.
  for (const [y, grow] of [[top + 16, 0.6], [bottom - 16, 0.6], [(top + bottom) / 2 - 8, 1], [(top + bottom) / 2 + 8, 1]]) {
    const hw = w + bulge * 2 * grow * 0.75;
    ctx.strokeStyle = '#3a3634'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(CX - hw, y); ctx.quadraticCurveTo(CX, y + 6, CX + hw, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,210,0.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(CX - hw + 2, y - 1.5); ctx.quadraticCurveTo(CX, y + 4.5, CX + hw - 2, y - 1.5); ctx.stroke();
  }
  // The lid.
  fill(ctx, ell(ctx, CX, top + 6, w, 9), '#9a6a3a', [CX - w, top - 3, CX + w, top + 15]);
  ctx.strokeStyle = 'rgba(40,22,10,0.5)'; ctx.lineWidth = 1.2;
  for (const dy of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(CX - w + 6, top + 6 + dy * 2); ctx.lineTo(CX + w - 6, top + 6 + dy * 2); ctx.stroke(); }
  ctx.strokeStyle = '#3a3634'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(CX, top + 6, w, 9, 0, 0, Math.PI * 2); ctx.stroke();
}

// A storage chest: the wooden chest, drawn bigger.
function bigChest(ctx) {
  ctx.save(); ctx.translate(CX, 118); ctx.scale(1.45, 1.45); ctx.translate(-CX, -96);
  chest(ctx);
  ctx.restore();
}

function quiver(ctx) {
  shadow(ctx, 26, 6);
  ctx.save(); ctx.translate(CX, 80); ctx.rotate(-0.6);
  for (const dx of [-5, 0, 5]) {
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx, -10); ctx.lineTo(dx, -36); ctx.stroke();
    fill(ctx, poly(ctx, [[dx - 3, -32], [dx, -40], [dx + 3, -32]]), '#e8e0d0', [dx - 3, -40, dx + 3, -32], 1);
  }
  fill(ctx, rr(ctx, -9, -14, 18, 44, 5), '#6a4424', [-9, -14, 9, 30]);
  ctx.restore();
}

function arrows(ctx, n) {
  shadow(ctx, 32, 6);
  const fire = /flam|fire/.test(n), holy = /celestial/.test(n);
  ctx.save(); ctx.translate(CX, 80); ctx.rotate(-0.35); ctx.scale(1.35, 1.35);
  for (const dy of /arrows/.test(n) ? [-6, 0, 6] : [0]) {
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-30, dy); ctx.lineTo(24, dy); ctx.stroke();
    const tip = () => fill(ctx, poly(ctx, [[24, dy - 4], [34, dy], [24, dy + 4]]), holy ? '#f0e090' : '#b0b4bc', [24, dy - 4, 34, dy + 4], 1);
    fire ? glow(ctx, '#ff6020', 10, tip) : holy ? glow(ctx, '#fff0a0', 8, tip) : tip();
    fill(ctx, poly(ctx, [[-30, dy], [-24, dy - 5], [-18, dy - 5], [-24, dy]]), '#e8e0d0', [-30, dy - 5, -18, dy], 1);
  }
  ctx.restore();
}

function chains(ctx) {
  shadow(ctx, 32, 6);
  for (let i = 0; i < 6; i++) {
    const x = CX - 30 + i * 12, y = 84 - Math.sin(i * 0.9) * 6;
    ctx.strokeStyle = '#6a6e76'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(x, y, 7, i % 2 ? 2.5 : 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#b8bcc4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 0.5, 7, i % 2 ? 2.5 : 5, 0, Math.PI, Math.PI * 1.8); ctx.stroke();
  }
}

function amulet(ctx, n) {
  const c = material(n) === '#a4acb6' ? '#e0b030' : material(n);
  shadow(ctx, 24, 6);
  ctx.strokeStyle = /collar/.test(n) ? shade(c, 0.8) : '#c8a040'; ctx.lineWidth = /collar/.test(n) ? 6 : 1.8;
  ctx.beginPath(); ctx.ellipse(CX, 72, 24, 14, 0, 0, Math.PI * 2); ctx.stroke();
  glow(ctx, c, 10, () => fill(ctx, /pyramid/.test(n) ? poly(ctx, [[CX - 9, 94], [CX, 78], [CX + 9, 94]]) : ell(ctx, CX, 88, 8, 9), c, [CX - 9, 78, CX + 9, 97], 1.5));
  glint(ctx, CX - 3, 85, 2);
}

function flag(ctx, n) {
  const c = /blue/.test(n) ? '#2c5cd0' : '#c8242c';
  shadow(ctx, 20, 5);
  ctx.strokeStyle = '#6a4424'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(CX - 14, 96); ctx.lineTo(CX - 14, 30); ctx.stroke();
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 12, 32); ctx.quadraticCurveTo(CX + 6, 26, CX + 28, 36); ctx.quadraticCurveTo(CX + 12, 46, CX + 28, 58); ctx.quadraticCurveTo(CX + 6, 50, CX - 12, 58); ctx.closePath(); }, c, [CX - 12, 30, CX + 28, 58], 1.5);
}

function mud(ctx, n) {
  const c = /god gold/.test(n) ? '#e0b030' : /goo/.test(n) ? '#5ab83a' : /wet/.test(n) ? '#4a3420' : '#6a4a2a';
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 34, 90); ctx.bezierCurveTo(CX - 36, 74, CX - 10, 72, CX, 76); ctx.bezierCurveTo(CX + 18, 70, CX + 38, 78, CX + 32, 92); ctx.bezierCurveTo(CX + 10, 100, CX - 20, 98, CX - 34, 90); ctx.closePath(); }, c, [CX - 36, 70, CX + 36, 98], 1.5);
  glint(ctx, CX - 12, 80, /wet/.test(n) ? 5 : 2.5);
}

function rope(ctx) {
  shadow(ctx, 26, 6);
  ctx.strokeStyle = '#b89860'; ctx.lineWidth = 4.5;
  for (const r of [22, 16, 10]) { ctx.beginPath(); ctx.ellipse(CX, 82, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = '#6a5030'; ctx.lineWidth = 1;
  for (const r of [22, 16, 10]) { ctx.beginPath(); ctx.ellipse(CX, 82, r, r * 0.45, 0, 0.2, 1.2); ctx.stroke(); }
}

function ladder(ctx) {
  shadow(ctx, 36, 6);
  ctx.save(); ctx.translate(CX, 82); ctx.rotate(-0.2);
  for (const y of [-9, 9]) fill(ctx, rr(ctx, -38, y - 2.5, 76, 5, 2), '#8a5a30', [-38, y, 38, y + 5], 1);
  for (let x = -30; x <= 30; x += 12) fill(ctx, rr(ctx, x - 2, -9, 4, 18, 1), '#a0703c', [x - 2, -9, x + 2, 9], 1);
  ctx.restore();
}

function boat(ctx) {
  shadow(ctx, 40, 8);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 42, 72); ctx.lineTo(CX + 42, 72); ctx.quadraticCurveTo(CX + 36, 96, CX, 96); ctx.quadraticCurveTo(CX - 36, 96, CX - 42, 72); ctx.closePath(); }, '#7a4a26', [CX - 42, 72, CX + 42, 96]);
  ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = 1.5;
  for (const y of [80, 88]) { ctx.beginPath(); ctx.moveTo(CX - 36, y); ctx.quadraticCurveTo(CX, y + 5, CX + 36, y); ctx.stroke(); }
}

function glasses(ctx, n) {
  const c = material(n);
  shadow(ctx, 26, 5);
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(CX - 4, 80); ctx.quadraticCurveTo(CX, 76, CX + 4, 80); ctx.moveTo(CX - 28, 78); ctx.lineTo(CX - 36, 72); ctx.moveTo(CX + 28, 78); ctx.lineTo(CX + 36, 72); ctx.stroke();
  for (const x of [-15, 15]) fill(ctx, ell(ctx, CX + x, 82, 11, 9), /shades|blood/.test(n) ? '#2a1418' : c, [CX + x - 11, 73, CX + x + 11, 91], 2.5);
  glint(ctx, CX - 19, 79, 3); glint(ctx, CX + 11, 79, 3);
}

// ---- worn things, lying on the ground ----

function weapon(ctx, n) {
  if (weaponKind(n) === 'orb') return orb(ctx, n);
  const w = { kind: weaponKind(n), colour: material(n), glow: /fire|flame|burn|hell|ice|crystal|lightning|energy|light|solar|holy|god|chaos|dark|soul|excalibur|masamune|emerald|nova/.test(n) };
  // Each shape's length (tip above the hand, butt below), to lie it
  // across the frame.
  const [tip, butt] = { sword: [52, 14], dagger: [30, 14], axe: [44, 12], hammer: [48, 12], staff: [70, 26], spear: [82, 26], pick: [46, 12], shovel: [62, 12], bow: [36, 36], crossbow: [16, 16], claw: [22, 4], orb: [14, 0] }[w.kind] ?? [50, 14];
  const k = Math.min(1.7, 96 / (tip + butt));
  shadow(ctx, 36, 7);
  ctx.save();
  ctx.translate(CX, 76);
  ctx.rotate(w.kind === 'crossbow' || w.kind === 'orb' ? 0 : w.kind === 'bow' ? -0.5 : 0.85);
  ctx.scale(k, k);
  drawWeapon(ctx, w, 0, (tip - butt) / 2, 0);
  ctx.restore();
}

function helmet(ctx, n) {
  const c = material(n), kind = helmKind(n);
  shadow(ctx, 28, 7);
  if (kind === 'cap') {
    fill(ctx, () => { ctx.beginPath(); ctx.ellipse(CX, 88, 26, 22, 0, Math.PI, Math.PI * 2); ctx.closePath(); }, c, [CX - 26, 66, CX + 26, 88]);
    fill(ctx, rr(ctx, CX - 28, 85, 56, 7, 3), shade(c, 0.85), [CX - 28, 85, CX + 28, 92], 1.5);
    return;
  }
  if (kind === 'mask') {
    fill(ctx, rr(ctx, CX - 20, 66, 40, 28, 12), c, [CX - 20, 66, CX + 20, 94]);
    ctx.fillStyle = '#2a2420'; for (const x of [-9, 9]) { ctx.beginPath(); ctx.arc(CX + x, 76, 5, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 26, 92); ctx.lineTo(CX - 26, 74); ctx.arc(CX, 74, 26, Math.PI, Math.PI * 2); ctx.lineTo(CX + 26, 92); ctx.closePath(); }, c, [CX - 26, 48, CX + 26, 92]);
  if (kind === 'great') {
    ctx.fillStyle = '#141014'; ctx.fillRect(CX - 18, 70, 36, 5); ctx.fillRect(CX - 2, 74, 4, 14);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.moveTo(CX - 18, 92); ctx.lineTo(CX - 18, 78); ctx.quadraticCurveTo(CX, 70, CX + 18, 78); ctx.lineTo(CX + 18, 92); ctx.closePath(); ctx.fill();
    fill(ctx, rr(ctx, CX - 3, 70, 6, 18, 2), c, [CX - 3, 70, CX + 3, 88], 1);
  }
  if (kind === 'horned') {
    for (const d of [-1, 1]) fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX + d * 22, 66); ctx.quadraticCurveTo(CX + d * 40, 60, CX + d * 38, 34); ctx.quadraticCurveTo(CX + d * 32, 56, CX + d * 18, 58); ctx.closePath(); }, '#ece4cc', [CX - 40, 34, CX + 40, 66], 1.5);
  }
  glint(ctx, CX - 12, 60, 4);
}

function bodyArmour(ctx, n) {
  const c = material(n), kind = torsoKind(n);
  shadow(ctx, 34, 8);
  if (kind === 'cape' || kind === 'robe') {
    // Folded cloth.
    fill(ctx, rr(ctx, CX - 32, 70, 64, 24, 8), c, [CX - 32, 70, CX + 32, 94]);
    fill(ctx, rr(ctx, CX - 28, 62, 56, 16, 7), shade(c, 1.1), [CX - 28, 62, CX + 28, 78]);
    ctx.strokeStyle = shade(c, 0.6); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CX - 26, 84); ctx.lineTo(CX + 26, 84); ctx.stroke();
    if (/wizard|flame|heaven|divine|golden/.test(n)) { ctx.strokeStyle = '#e0c060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CX - 28, 74); ctx.lineTo(CX + 28, 74); ctx.stroke(); }
    return;
  }
  // A breastplate or shirt laid flat: shoulders, body and arm holes.
  const shape = () => { ctx.beginPath(); ctx.moveTo(CX - 30, 50); ctx.lineTo(CX - 12, 46); ctx.quadraticCurveTo(CX, 54, CX + 12, 46); ctx.lineTo(CX + 30, 50); ctx.lineTo(CX + 32, 64); ctx.lineTo(CX + 22, 66); ctx.lineTo(CX + 22, 94); ctx.lineTo(CX - 22, 94); ctx.lineTo(CX - 22, 66); ctx.lineTo(CX - 32, 64); ctx.closePath(); };
  fill(ctx, shape, c, [CX - 32, 46, CX + 32, 94]);
  ctx.save(); shape(); ctx.clip();
  if (kind === 'chain') {
    ctx.strokeStyle = shade(c, 0.55); ctx.lineWidth = 1;
    for (let y = 48; y < 96; y += 4) for (let x = CX - 32 + ((y / 4) % 2) * 2; x < CX + 32; x += 4) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI); ctx.stroke(); }
  } else if (kind === 'plate') {
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(CX - 18, 54, 14, 26);
    ctx.strokeStyle = shade(c, 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(CX, 54); ctx.lineTo(CX, 92); ctx.stroke();
  } else if (kind === 'leather' || kind === 'hide') {
    ctx.strokeStyle = shade(c, 0.55); ctx.lineWidth = 1.2; ctx.setLineDash([2.5, 2.5]);
    ctx.beginPath(); ctx.moveTo(CX, 52); ctx.lineTo(CX, 92); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

function pair(ctx, draw) {
  for (const [dx, a] of [[-15, -0.15], [15, 0.15]]) { ctx.save(); ctx.translate(CX + dx, 0); ctx.rotate(a * 0.3); draw(); ctx.restore(); }
}

function gloves(ctx, n) {
  const c = material(n);
  shadow(ctx, 32, 6);
  pair(ctx, () => {
    fill(ctx, rr(ctx, -10, 66, 20, 26, 7), c, [-10, 66, 10, 92]);
    fill(ctx, rr(ctx, 7, 72, 8, 12, 4), c, [7, 72, 15, 84], 1.5);
    fill(ctx, rr(ctx, -11, 88, 22, 7, 3), shade(c, 0.8), [-11, 88, 11, 95], 1.5);
  });
}

function sleeves(ctx, n) {
  const c = material(n);
  shadow(ctx, 30, 6);
  pair(ctx, () => { fill(ctx, rr(ctx, -9, 56, 18, 38, 7), c, [-9, 56, 9, 94]); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-6, 60, 4, 30); });
}

function leggings(ctx, n) {
  const c = material(n);
  shadow(ctx, 30, 7);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 22, 46); ctx.lineTo(CX + 22, 46); ctx.lineTo(CX + 24, 96); ctx.lineTo(CX + 6, 96); ctx.lineTo(CX, 62); ctx.lineTo(CX - 6, 96); ctx.lineTo(CX - 24, 96); ctx.closePath(); }, c, [CX - 24, 46, CX + 24, 96]);
  fill(ctx, rr(ctx, CX - 23, 44, 46, 6, 2), shade(c, 0.8), [CX - 23, 44, CX + 23, 50], 1.5);
}

function boots(ctx, n) {
  const c = /red/.test(n) ? '#c8242c' : /air/.test(n) ? '#c8e4f0' : /sandal/.test(n) ? '#a07040' : '#5a3a20';
  shadow(ctx, 32, 6);
  pair(ctx, () => {
    if (/flipper/.test(n)) { fill(ctx, poly(ctx, [[-6, 60], [6, 60], [14, 94], [-14, 94]]), c, [-14, 60, 14, 94]); return; }
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(-8, 58); ctx.lineTo(6, 58); ctx.lineTo(6, 82); ctx.lineTo(14, 86); ctx.lineTo(14, 94); ctx.lineTo(-8, 94); ctx.closePath(); }, c, [-8, 58, 14, 94]);
  });
  if (/air/.test(n)) glow(ctx, '#ffffff', 8, () => { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; for (const x of [-22, 8]) { ctx.beginPath(); ctx.moveTo(CX + x, 64); ctx.lineTo(CX + x - 6, 58); ctx.stroke(); } });
}

function belt(ctx, n) {
  const c = /leather|sash/.test(n) ? (/red/.test(n) ? '#c8242c' : /sash/.test(n) ? '#3a5aa0' : '#6a4424') : material(n);
  shadow(ctx, 30, 7);
  ctx.strokeStyle = shade(c, 0.5); ctx.lineWidth = 12;
  ctx.beginPath(); ctx.ellipse(CX, 82, 28, 11, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = c; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.ellipse(CX, 82, 28, 11, 0, 0, Math.PI * 2); ctx.stroke();
  if (!/sash/.test(n)) { ctx.strokeStyle = '#d8b050'; ctx.lineWidth = 3; ctx.strokeRect(CX - 7, 87, 14, 10); }
}

function shield(ctx, n) {
  shadow(ctx, 28, 7);
  ctx.save(); ctx.translate(CX, 70); ctx.scale(1.9, 1.9);
  drawShield(ctx, { colour: material(n) }, 0, 0);
  ctx.restore();
}


// ---- props: furniture and people placed on the map ----
//
// Props share pictures too (sprite 16 is every chair, couch, throne and
// mattress; sprite 5 a guard, a woman, a child and a statue), so they're
// drawn by name as well, under "prop <name>" in the same sheet.

function hashName(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
const FABRICS = ['#8a2a2a', '#2a4a8a', '#2e6b4f', '#6a3a8a', '#8a6a2a', '#3a3a44', '#9a4a2a'];
const fabric = (n) => FABRICS[Math.floor(hashName(n) * FABRICS.length)];

function chair(ctx) {
  shadow(ctx, 26, 7, 104);
  const wood = '#7a4a26';
  for (const x of [CX - 20, CX + 16]) fill(ctx, rr(ctx, x, 70, 5, 34, 2), shade(wood, 0.8), [x, 70, x + 5, 104], 1);
  fill(ctx, rr(ctx, CX - 22, 20, 44, 50, 4), wood, [CX - 22, 20, CX + 22, 70]);
  ctx.strokeStyle = shade(wood, 0.55); ctx.lineWidth = 1.5;
  for (const x of [CX - 10, CX, CX + 10]) { ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, 64); ctx.stroke(); }
  fill(ctx, rr(ctx, CX - 26, 64, 52, 12, 3), shade(wood, 1.1), [CX - 26, 64, CX + 26, 76]);
  for (const x of [CX - 24, CX + 19]) fill(ctx, rr(ctx, x, 76, 5, 30, 2), wood, [x, 76, x + 5, 106], 1);
}

function couch(ctx, n) {
  const c = fabric(n);
  shadow(ctx, 50, 9, 104);
  fill(ctx, rr(ctx, CX - 48, 40, 96, 40, 12), shade(c, 0.85), [CX - 48, 40, CX + 48, 80]);
  fill(ctx, rr(ctx, CX - 44, 66, 88, 30, 8), c, [CX - 44, 66, CX + 44, 96]);
  ctx.strokeStyle = shade(c, 0.6); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(CX, 68); ctx.lineTo(CX, 94); ctx.stroke();
  for (const x of [CX - 56, CX + 40]) fill(ctx, rr(ctx, x, 56, 16, 44, 7), shade(c, 0.95), [x, 56, x + 16, 100]);
  for (const x of [CX - 50, CX + 44]) fill(ctx, rr(ctx, x, 98, 6, 8, 2), '#3a2414', [x, 98, x + 6, 106], 1);
}

function throne(ctx) {
  shadow(ctx, 34, 8, 106);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 26, 70); ctx.lineTo(CX - 26, 22); ctx.lineTo(CX - 14, 30); ctx.lineTo(CX, 10); ctx.lineTo(CX + 14, 30); ctx.lineTo(CX + 26, 22); ctx.lineTo(CX + 26, 70); ctx.closePath(); }, '#d8a830', [CX - 26, 10, CX + 26, 70]);
  fill(ctx, rr(ctx, CX - 18, 30, 36, 40, 4), '#9a1a24', [CX - 18, 30, CX + 18, 70], 1);
  fill(ctx, rr(ctx, CX - 32, 66, 64, 16, 4), '#d8a830', [CX - 32, 66, CX + 32, 82]);
  fill(ctx, rr(ctx, CX - 28, 80, 56, 26, 3), '#b8881e', [CX - 28, 80, CX + 28, 106]);
  glow(ctx, '#ff3040', 6, () => { ctx.fillStyle = '#e02030'; ctx.beginPath(); ctx.arc(CX, 20, 4, 0, Math.PI * 2); ctx.fill(); });
}

function bed(ctx, n) {
  const blanket = /haunt|fire|firey/.test(n) ? (/fire/.test(n) ? '#c8401a' : '#4a3a5a') : fabric(n);
  const bunk = /bunk/.test(n);
  const one = (y, s) => {
    fill(ctx, rr(ctx, CX - 44, y, 88, 30 * s, 4), '#7a4a26', [CX - 44, y, CX + 44, y + 30 * s]);
    fill(ctx, rr(ctx, CX - 40, y - 8 * s, 80, 22 * s, 6), '#ece4d0', [CX - 40, y - 8 * s, CX + 40, y + 14 * s], 1);
    fill(ctx, rr(ctx, CX - 36, y - 12 * s, 24, 14 * s, 6), '#f8f4ea', [CX - 36, y - 12 * s, CX - 12, y + 2 * s], 1);
    fill(ctx, rr(ctx, CX - 10, y - 10 * s, 52, 24 * s, 5), blanket, [CX - 10, y - 10 * s, CX + 42, y + 14 * s]);
  };
  shadow(ctx, 50, 9, 108);
  if (bunk) {
    for (const x of [CX - 46, CX + 40]) fill(ctx, rr(ctx, x, 16, 6, 92, 2), '#5a3418', [x, 16, x + 6, 108], 1);
    one(38, 0.8); one(84, 0.8);
  } else {
    fill(ctx, rr(ctx, CX - 46, 50, 8, 56, 2), '#5a3418', [CX - 46, 50, CX - 38, 106], 1);
    one(72, 1);
  }
}

// People placed as props: the character painter, dressed by name.
function propPerson(ctx, n) {
  const look = { skin: ['#c89468', '#e0b890', '#8a6040'][Math.floor(hashName(n + 's') * 3)], hair: ['#4a2e18', '#2a1a10', '#8a6a3a', '#1a1210'][Math.floor(hashName(n + 'h') * 4)], hairStyle: 'short', top: fabric(n), trim: '#3a2414', legs: '#3e3a2c', boots: '#2a1c10', style: 'plain' };
  // Men now and then have a beard.
  if (/villager man|^villager$|farmer|\bman$/.test(n) && !/woman/.test(n) && hashName(n + 'b') < 0.5) look.beard = look.hair;
  let gear = {};
  let s = 0.82;
  if (/\belf\b|elven/.test(n) && !/dark elf/.test(n)) {
    // Elves (Aelindor): fair, pointed ears, long golden, silver or auburn
    // hair, in greens and silvers; guards in leaf-green mail with a bow.
    const hair = ['#e8d078', '#e0e0e8', '#a0502a', '#d8b860'][Math.floor(hashName(n + 'h') * 4)];
    Object.assign(look, { skin: '#f0d8bc', hair, hairStyle: 'long', top: ['#3a6a3a', '#5a7a4a', '#c8ccc0', '#2e5a4a'][Math.floor(hashName(n + 't') * 4)], trim: '#c8b878', legs: '#4a5a3a', boots: '#5a4028', ears: true, beard: null });
    if (/guard/.test(n)) {
      Object.assign(look, { top: '#4a6a3a', trim: '#c8ccd4', legs: '#3a4a2e', style: 'armour', hairStyle: 'ponytail' });
      gear = { weapon: { kind: 'bow', colour: '#8a5a2a' } };
    } else if (/woman|maiden|lady/.test(n)) {
      Object.assign(look, { skirt: ['#3a6a4a', '#c8ccc0', '#6a4a7a'][Math.floor(hashName(n + 'x') * 3)] });
    } else if (/teller/.test(n)) {
      Object.assign(look, { top: '#2e5a4a', trim: '#d8b050', legs: '#1e3a30' });
    } else if (/elder|priest/.test(n)) {
      Object.assign(look, { top: '#e8e8e0', trim: '#c8b060', hair: '#e8e8f0', hairStyle: 'long' });
    }
  } else if (/guard|soldier|sergeant/.test(n)) {
    Object.assign(look, { top: '#8a8e98', trim: '#c8b060', legs: '#6a6e78', style: 'armour', helm: '#8a8e98' });
    gear = { weapon: { kind: 'spear', colour: '#c8ccd4' }, shield: { colour: '#c8b060' } };
  } else if (/thief|spy/.test(n)) {
    Object.assign(look, { top: '#2a2a2e', trim: '#1a1a1e', legs: '#1e1e22', hair: '#1a1a1a' });
    gear = { weapon: { kind: 'dagger', colour: '#c8ccd4' } };
  } else if (/cook/.test(n)) {
    Object.assign(look, { top: '#f0ece0', trim: '#c8c0a8', legs: '#4a4a4a' });
  } else if (/bouncer/.test(n)) {
    Object.assign(look, { top: '#1a1a1a', trim: '#3a3a3a', legs: '#1a1a1a', hair: null });
  } else if (/teller|banker/.test(n)) {
    Object.assign(look, { top: '#2a3a5a', trim: '#d8b050', legs: '#1e2a40' });
  } else if (/prisoner/.test(n)) {
    Object.assign(look, { top: '#8a8478', trim: '#5a544c', legs: '#6a645c', hair: '#6a5a4a' });
  } else if (/woman|girl|lady|maid|wife|kat$|jenova/.test(n)) {
    // Women: a skirt, and long hair, a bun or a ponytail.
    const styles = ['long', 'bun', 'ponytail'];
    Object.assign(look, {
      skin: '#e8c0a0',
      hair: /jenova|old/.test(n) ? '#c8c8d0' : ['#8a4a24', '#2a1a10', '#c8a040', '#a0401e'][Math.floor(hashName(n + 'h') * 4)],
      hairStyle: /old/.test(n) ? 'bun' : styles[Math.floor(hashName(n) * styles.length)],
      top: fabric(n), skirt: fabric(n + 'x'),
    });
  } else if (/hermit|old|crazy/.test(n)) {
    Object.assign(look, { top: '#6a5a3a', trim: '#4a3a24', hair: '#d8d8d0', beard: '#d8d8d0' });
  } else if (/child/.test(n)) {
    s = 0.62;
  } else if (/dark elf/.test(n)) {
    Object.assign(look, { skin: '#8a8c9a', hair: '#e8e8f0', top: '#3a3a44', legs: '#1c1c22', ears: true });
  } else if (/statue|skeleton statue|demon statue/.test(n)) {
    Object.assign(look, { skin: '#9a9a96', hair: '#8a8a86', top: '#9a9a96', trim: '#7a7a76', legs: '#8a8a86', boots: '#7a7a76' });
  }
  ctx.save();
  ctx.translate(CX - 72 * s, 118 - 134 * s);
  ctx.scale(s, s);
  if (/statue/.test(n)) {
    // A plinth under the stone figure.
    ctx.restore(); ctx.save();
    fill(ctx, rr(ctx, CX - 28, 100, 56, 18, 2), '#7a7a76', [CX - 28, 100, CX + 28, 118]);
    ctx.translate(CX - 72 * s, 100 - 134 * s); ctx.scale(s, s);
  }
  paintPerson(ctx, look, 's', false, gear);
  ctx.restore();
  // A teller stands behind a counter with coins on it.
  if (/teller|banker/.test(n)) {
    fill(ctx, rr(ctx, CX - 48, 78, 96, 40, 3), '#6a3a1c', [CX - 48, 78, CX + 48, 118]);
    fill(ctx, rr(ctx, CX - 52, 74, 104, 8, 2), '#8a5a30', [CX - 52, 74, CX + 52, 82]);
    ctx.strokeStyle = '#4a2810'; ctx.lineWidth = 1.5;
    for (const x of [CX - 16, CX + 16]) { ctx.beginPath(); ctx.moveTo(x, 84); ctx.lineTo(x, 116); ctx.stroke(); }
    for (const [x, y] of [[-30, 72], [-24, 70], [-27, 67], [28, 72]]) fill(ctx, ell(ctx, CX + x, y, 5, 2.2), '#e0b030', [CX + x - 5, y - 2, CX + x + 5, y + 2], 1);
  }
}

function tombstone(ctx, n) {
  shadow(ctx, 28, 7, 106);
  const c = /king|zilen/.test(n) ? '#a8a49a' : '#8a8680';
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(CX - 22, 104); ctx.lineTo(CX - 22, 44); ctx.arc(CX, 44, 22, Math.PI, Math.PI * 2); ctx.lineTo(CX + 22, 104); ctx.closePath(); }, c, [CX - 22, 22, CX + 22, 104]);
  ctx.fillStyle = shade(c, 0.55);
  if (/grave/.test(n) && !/r\.i\.p/.test(n)) { ctx.fillRect(CX - 2.5, 36, 5, 34); ctx.fillRect(CX - 11, 46, 22, 5); }
  else { ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('R.I.P', CX, 62); }
  fill(ctx, rr(ctx, CX - 30, 102, 60, 8, 2), '#5a4a30', [CX - 30, 102, CX + 30, 110], 1);
}

function well(ctx) {
  shadow(ctx, 40, 9, 108);
  for (const x of [CX - 36, CX + 30]) fill(ctx, rr(ctx, x, 18, 6, 60, 2), '#6a4424', [x, 18, x + 6, 78], 1);
  fill(ctx, poly(ctx, [[CX - 44, 26], [CX, 6], [CX + 44, 26], [CX + 40, 30], [CX, 12], [CX - 40, 30]]), '#8a3a22', [CX - 44, 6, CX + 44, 30]);
  fill(ctx, ell(ctx, CX, 72, 38, 12), '#8a8680', [CX - 38, 60, CX + 38, 84]);
  fill(ctx, rr(ctx, CX - 38, 72, 76, 34, 4), '#7a7670', [CX - 38, 72, CX + 38, 106]);
  ctx.fillStyle = '#1a2a4a'; ctx.beginPath(); ctx.ellipse(CX, 72, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = shade('#7a7670', 0.6); ctx.lineWidth = 1;
  for (let y = 80; y < 104; y += 8) { ctx.beginPath(); ctx.moveTo(CX - 38, y); ctx.lineTo(CX + 38, y); ctx.stroke(); }
}

function flowerBox(ctx, n) {
  shadow(ctx, 44, 8, 106);
  const plants = /^plants?$/.test(n);
  if (!plants) fill(ctx, rr(ctx, CX - 44, 80, 88, 24, 3), '#7a4a26', [CX - 44, 80, CX + 44, 104]);
  for (let i = 0; i < 7; i++) {
    const x = CX - 36 + i * 12, top = 48 + (i % 3) * 8;
    ctx.strokeStyle = '#3a6a2a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, plants ? 104 : 82); ctx.quadraticCurveTo(x + 4, 70, x, top); ctx.stroke();
    fill(ctx, ell(ctx, x + 5, top + 16, 6, 3, -0.5), '#4a8a34', [0, 0, 128, 128], 0);
    if (!plants) {
      const c = ['#e04040', '#f0d040', '#e070c0', '#f0f0f0'][i % 4];
      for (let k = 0; k < 5; k++) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.26) * 4, top + Math.sin(k * 1.26) * 4, 3.2, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}

function candlestick(ctx) {
  shadow(ctx, 18, 5, 108);
  fill(ctx, rr(ctx, CX - 14, 100, 28, 8, 3), '#c8a040', [CX - 14, 100, CX + 14, 108]);
  fill(ctx, rr(ctx, CX - 3, 40, 6, 62, 2), '#c8a040', [CX - 3, 40, CX + 3, 102]);
  fill(ctx, rr(ctx, CX - 18, 36, 36, 6, 2), '#c8a040', [CX - 18, 36, CX + 18, 42], 1);
  for (const x of [CX - 16, CX, CX + 16]) {
    fill(ctx, rr(ctx, x - 3, 18, 6, 18, 1), '#f4ecd8', [x - 3, 18, x + 3, 36], 1);
    glow(ctx, '#ffb040', 12, () => { ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.ellipse(x, 12, 3, 6, 0, 0, Math.PI * 2); ctx.fill(); });
  }
}

function slotMachine(ctx) {
  shadow(ctx, 28, 7, 108);
  fill(ctx, rr(ctx, CX - 26, 22, 52, 86, 6), '#b82a2a', [CX - 26, 22, CX + 26, 108]);
  fill(ctx, rr(ctx, CX - 20, 38, 40, 22, 3), '#f4ecd8', [CX - 20, 38, CX + 20, 60], 1);
  ctx.font = 'bold 14px Georgia'; ctx.textAlign = 'center'; ctx.fillStyle = '#b82a2a';
  ctx.fillText('7 7 7', CX, 54);
  ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CX + 26, 50); ctx.lineTo(CX + 36, 30); ctx.stroke();
  fill(ctx, ell(ctx, CX + 36, 28, 5, 5), '#e02020', [CX + 31, 23, CX + 41, 33], 1);
  fill(ctx, rr(ctx, CX - 14, 80, 28, 10, 2), '#3a1a1a', [CX - 14, 80, CX + 14, 90], 1);
}

function coffin(ctx) {
  shadow(ctx, 40, 8, 106);
  ctx.save(); ctx.translate(CX, 70); ctx.rotate(-0.08);
  fill(ctx, poly(ctx, [[-14, -40], [14, -40], [24, -20], [16, 40], [-16, 40], [-24, -20]]), '#5a3418', [-24, -40, 24, 40]);
  ctx.fillStyle = '#c8a040'; ctx.fillRect(-2, -26, 4, 30); ctx.fillRect(-10, -18, 20, 4);
  ctx.restore();
}

const PROPS = [
  [/teller|banker/, propPerson],
  [/\belf\b|elven/, propPerson],
  [/throne/, throne],
  [/couch|sofa/, couch],
  [/chair|stool/, chair],
  [/\bbed\b|bunk|mattress/, bed],
  [/grave|tombstone|r\.i\.p/, tombstone],
  [/\bwell\b/, well],
  [/flower box|^plants?$/, flowerBox],
  [/candle/, candlestick],
  [/slot machine/, slotMachine],
  [/coffin/, coffin],
  [/^skull$/, skull],
  [/^key$/, key],
  [/^(sword|dagger|pickaxe|excalibur|chaos sword)$/, (ctx, n) => weapon(ctx, n)],
  [/^(box|box of stuff|goods|junk)$/, box],
  [/^chest$/, chest],
  [/^food$/, sandwich],
  [/statue|guard|soldier|sergeant|farmer|lady|maid|thief|spy|cook|bouncer|innkeeper|bar tender|prisoner|villager|hermit|woman|girl|child|dark elf|crazyoldman|oldcrazyman|old demon woman|kat$|jenova/, propPerson],
];

export function propPainterFor(name) {
  const n = name.toLowerCase();
  return PROPS.find(([re]) => re.test(n))?.[1] ?? null;
}

// ---- families: which items they cover ----

// First match wins. Items are { name, type, kind } from defItems; weapons
// and armour go by their type and slot, everything else by name.
const BY_NAME = [
  [/\bkey\b|key$|key\d/, key],
  [/crystal box|shifty box|\bbox\b/, box],
  [/potion|elix|ambrosia/, potion],
  [/vial|blood$|demons blood/, vial],
  [/scroll/, scroll],
  [/note|news|pass\b|trankpass|warning|letter|map\b/, paper],
  [/book|tome/, book],
  [/amethyst|emerald|ruby|opal|diamond|sapphire|forest gem|\bgem\b/, gem],
  [/crystal/, crystal],
  [/\bore\b/, ore],
  [/orb\b|^soul$/, orb],
  [/stone/, stone],
  [/^gold$|god gold|^gp$|coin/, coins],
  [/apple/, apple],
  [/^egg$/, egg],
  [/mushroom/, mushroom],
  [/sandwich|lunch/, sandwich],
  [/crisps/, packet],
  [/^ale$|mead|beer|wine/, mug],
  [/lavend|azeala|wolfsbane|mandrake|weed|rose\b|herb/, herb],
  [/tooth|fang/, fang],
  [/stinger/, stinger],
  [/horns/, horns],
  [/scale/, scales],
  [/wings/, wings],
  [/bones/, bones],
  [/^skull$/, skull],
  [/fairy dust|dust/, dust],
  [/bag|pouch|sack/, bag],
  [/chest$/, chest],
  [/quiver/, quiver],
  [/arrow/, arrows],
  [/chains/, chains],
  [/amulet|necklace|collar|pendant/, amulet],
  [/flag/, flag],
  [/mud/, mud],
  [/climbing gear|rope/, rope],
  [/ladder/, ladder],
  [/^boat$/, boat],
];

const ARMOUR_BY_NAME = [
  [/boot|sandal|flipper/, boots],
  [/shield|orkshield/, shield],
  [/glasses|lens|goggles|shades|eye of/, glasses],
  [/amulet|necklace|collar/, amulet],
  [/belt|sash/, belt],
  [/glove|gauntlet|fists|loves$/, gloves],
  [/sleeves|cuffs/, sleeves],
  [/legging|loggings|pants/, leggings],
  [/helm|cap\b|skull|mask|gasmask/, helmet],
];
const ARMOUR_BY_SLOT = { skull: helmet, torso: bodyArmour, legs: leggings, hands: gloves, waist: belt, neck: amulet, eyes: glasses, arms: sleeves };

// Names that win whatever the item's type says (the server files call a
// bow armour and gp a weapon).
const OVERRIDES = [
  [/^gp$|^gold$/, coins],
  [/arrow/, arrows],
  [/quiver/, quiver],
  [/ladder/, ladder],
  [/package/, box],
  [/glasses/, glasses],
  [/ball of goo/, mud],
  [/^ice$/, crystal],
  [/eternal flame/, orb],
  [/staff|\bbow\b/, weapon],
];

export function painterFor({ name, type = '', kind = '' }) {
  const n = name.toLowerCase().replace(/_/g, ' ');
  const t = type.toLowerCase();
  const over = OVERRIDES.find(([re]) => re.test(n));
  if (over) return over[1];
  if (t === 'weapon' || t === 'weopon' || t === 'ranged') return /claw/.test(n) && !/grinder|serpent|morph/.test(n) ? claw : weapon;
  if (t === 'armor') {
    const byName = ARMOUR_BY_NAME.find(([re]) => re.test(n));
    if (byName) return byName[1];
    return ARMOUR_BY_SLOT[kind.toLowerCase()] ?? bodyArmour;
  }
  if (t === 'prop' || t === 'container' && /chest/.test(n)) return /chest/.test(n) ? chest : null;
  return BY_NAME.find(([re]) => re.test(n))?.[1] ?? null;
}

// Storage (the server's barrels and chests, props named by kind), drawn
// under these names; the renderer looks storage up by its kind.
export const STORAGE = [{ name: 'storage barrel', paint: barrel }, { name: 'storage chest', paint: bigChest }];

// items: [{ name, type, kind }]. The index keys are lower case, with
// underscores kept and also as spaces, since names arrive both ways. The
// sheet is a grid, COLS frames wide (one strip would pass the widest
// canvas a browser allows).
export const COLS = 32;
// props: the server's prop names, drawn under "prop <name>" (lower case).
export function paintItemSheet(items, props = []) {
  const drawn = [
    ...items.map((it) => [it, painterFor(it)]).filter(([, p]) => p),
    ...STORAGE.map((st) => [{ name: st.name }, st.paint]),
    ...props.map((name) => [{ name: `prop ${name}`, draw: name }, propPainterFor(name)]).filter(([, p]) => p),
  ];
  const sheet = document.createElement('canvas');
  sheet.width = COLS * OUT;
  sheet.height = Math.max(1, Math.ceil(drawn.length / COLS)) * OUT;
  const ctx = sheet.getContext('2d');
  const index = {};
  drawn.forEach(([it, paint], i) => {
    ctx.save();
    ctx.translate((i % COLS) * OUT, Math.floor(i / COLS) * OUT);
    ctx.beginPath(); ctx.rect(0, 0, OUT, OUT); ctx.clip();
    ctx.lineCap = 'butt';
    paint(ctx, (it.draw ?? it.name).toLowerCase().replace(/_/g, ' '));
    ctx.restore();
    index[it.name.toLowerCase()] = i;
    index[it.name.toLowerCase().replace(/_/g, ' ')] = i;
  });
  // Props that are people (for the client's NPC name setting).
  const people = props.filter((name) => propPainterFor(name) === propPerson).map((n) => n.toLowerCase());
  return { sheet, index, people };
}
