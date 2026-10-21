// Creatures by name. The server sends each creature's name with its
// picture, and many different creatures share one picture (a dragon, a
// lizard and an alligator are all sprite 28). In the Painted style the
// client can pick art by name instead: this draws one frame per creature
// name that belongs to a family below (dragons, people, wolves, slimes,
// wizards, skeletons), with colours and gear chosen from the name, into a
// "named" sheet, plus an index from name to frame. Names with no family
// keep their picture's art.

import { paintPerson } from './figure.js';

const OUT = 256;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb(hex, f = 1) {
  return `rgb(${hexToRgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * f)))).join(',')})`;
}
// A hex colour lighter or darker by f (for painters that want hex).
function shadeHex(hex, f) {
  return `#${hexToRgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('')}`;
}
function fill(ctx, path, colour, [x0, y0, x1, y1] = [0, 0, OUT, OUT], edge = 2.5) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgb(colour, 1.25)); g.addColorStop(0.5, rgb(colour, 1)); g.addColorStop(1, rgb(colour, 0.62));
  ctx.fillStyle = g;
  path();
  ctx.fill();
  if (edge) { ctx.strokeStyle = rgb(colour, 0.4); ctx.lineWidth = edge; ctx.lineJoin = 'round'; ctx.stroke(); }
}
const ell = (ctx, x, y, rx, ry, a = 0) => () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); };
function shadow(ctx, x, y, rx, ry) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function glint(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, -0.6, 0, Math.PI * 2); ctx.fill();
}
function limb(ctx, pts, w0, w1, colour) {
  ctx.lineCap = 'round';
  for (const [dw, f] of [[3, 0.4], [0, 1]]) {
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 1);
      ctx.strokeStyle = rgb(colour, f === 1 ? 1 - t * 0.2 : f);
      ctx.lineWidth = w0 + (w1 - w0) * t + dw;
      ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[i + 1]); ctx.stroke();
    }
  }
}
function eye(ctx, x, y, r, colour = '#f0d040') {
  ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.ellipse(x + r * 0.15, y, r * 0.35, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
}
function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

// ---- dragons ----

const DRAGON_COLOURS = [
  [/gold/, { body: '#d8a830', belly: '#f4e090', wing: '#b8801c' }],
  [/silver|platinum/, { body: '#b8bcc4', belly: '#eceef2', wing: '#8a8e98' }],
  [/emerald|green/, { body: '#2e9a4a', belly: '#b8e0a0', wing: '#1e6a34' }],
  [/ruby|fire|freyr|flame/, { body: '#b8201c', belly: '#f0b060', wing: '#801410' }],
  [/sea|water/, { body: '#2a70b0', belly: '#a8d8f0', wing: '#1c4a80' }],
  [/cave|stone/, { body: '#6a6258', belly: '#b0a890', wing: '#4a443c' }],
  [/dark|shadow|doom/, { body: '#2a2230', belly: '#6a5a70', wing: '#18121e' }],
  [/divine|holy|spirit/, { body: '#e8e4f0', belly: '#fff8d0', wing: '#c8c0e0', glow: true }],
  [/puff|babe/, { body: '#e890c0', belly: '#fce0ec', wing: '#c86898', small: true }],
  [/king|super|ultima/, { body: '#6a2a9a', belly: '#e0c060', wing: '#4a1a70', crown: true }],
  [/ice|frost|snow/, { body: '#9ad0f0', belly: '#eaf6ff', wing: '#6aa8d8' }],
];
function dragonColours(name) {
  for (const [re, c] of DRAGON_COLOURS) if (re.test(name)) return c;
  return { body: '#a02820', belly: '#e8b070', wing: '#701810' };
}

function dragon(ctx, name) {
  const c = dragonColours(name);
  ctx.save();
  if (c.small) { ctx.translate(OUT * 0.15, OUT * 0.2); ctx.scale(0.7, 0.7); }
  if (c.glow) {
    const g = ctx.createRadialGradient(128, 130, 10, 128, 130, 120);
    g.addColorStop(0, 'rgba(255,250,210,0.45)'); g.addColorStop(1, 'rgba(255,250,210,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, OUT, OUT);
  }
  shadow(ctx, 124, 224, 96, 16);
  // Far wing, legs, tail.
  const wing = (x, flip, f) => fill(ctx, () => {
    ctx.beginPath(); ctx.moveTo(x, 118);
    ctx.quadraticCurveTo(x - 20 * flip, 40, x - 70 * flip, 30);
    ctx.quadraticCurveTo(x - 62 * flip, 70, x - 84 * flip, 96);
    ctx.quadraticCurveTo(x - 58 * flip, 100, x - 60 * flip, 128);
    ctx.quadraticCurveTo(x - 36 * flip, 120, x - 26 * flip, 144);
    ctx.closePath();
  }, f < 1 ? c.wing : c.wing, [x - 84, 30, x + 84, 144]);
  wing(150, -1, 0.8);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (const [x, f] of [[96, 0.8], [150, 0.8]]) limb(ctx, [[x, 168], [x - 6, 196], [x + 2, 218]], 18, 12, c.body);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(76, 168); ctx.quadraticCurveTo(30, 178, 20, 214); ctx.quadraticCurveTo(14, 196, 34, 180); ctx.quadraticCurveTo(26, 168, 70, 150); ctx.closePath(); }, c.body, [14, 150, 76, 214]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(22, 214); ctx.lineTo(8, 222); ctx.lineTo(24, 204); ctx.closePath(); }, c.wing, [8, 204, 24, 222], 1.5);
  // Body and belly.
  fill(ctx, ell(ctx, 124, 158, 58, 34), c.body, [66, 124, 182, 192]);
  fill(ctx, ell(ctx, 128, 172, 40, 16), c.belly, [88, 156, 168, 188], 0);
  ctx.strokeStyle = rgb(c.belly, 0.7); ctx.lineWidth = 1.5;
  for (let x = 98; x < 160; x += 9) { ctx.beginPath(); ctx.moveTo(x, 162); ctx.lineTo(x + 2, 184); ctx.stroke(); }
  for (const x of [108, 164]) limb(ctx, [[x, 172], [x + 4, 198], [x + 10, 220]], 18, 12, c.body);
  // Neck and head.
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(160, 140); ctx.quadraticCurveTo(178, 104, 176, 74); ctx.lineTo(196, 72); ctx.quadraticCurveTo(200, 112, 180, 160); ctx.closePath(); }, c.body, [160, 72, 200, 160]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(172, 70); ctx.quadraticCurveTo(190, 50, 214, 60); ctx.quadraticCurveTo(240, 68, 244, 82); ctx.quadraticCurveTo(222, 92, 196, 90); ctx.quadraticCurveTo(176, 88, 172, 70); ctx.closePath(); }, c.body, [172, 50, 244, 92]);
  for (const [hx, hy] of [[186, 58], [198, 54]]) fill(ctx, () => { ctx.beginPath(); ctx.moveTo(hx, hy + 4); ctx.lineTo(hx - 12, hy - 22); ctx.lineTo(hx + 6, hy + 2); ctx.closePath(); }, '#e8dcc0', [hx - 12, hy - 22, hx + 6, hy + 4], 1.5);
  if (c.crown) {
    ctx.fillStyle = '#f0c040';
    ctx.beginPath(); ctx.moveTo(182, 54); for (let i = 0; i < 4; i++) { ctx.lineTo(186 + i * 7, 40); ctx.lineTo(189 + i * 7, 52); } ctx.lineTo(214, 56); ctx.closePath(); ctx.fill();
  }
  eye(ctx, 208, 68, 4.2, c.glow ? '#80d0ff' : '#f0d040');
  ctx.fillStyle = '#1a0a08'; ctx.beginPath(); ctx.arc(240, 78, 2, 0, Math.PI * 2); ctx.fill();
  // Spines along the back, near wing on top.
  ctx.fillStyle = rgb(c.wing, 0.9);
  for (let i = 0; i < 6; i++) { const x = 80 + i * 16; ctx.beginPath(); ctx.moveTo(x, 128 - Math.sin(i / 5 * Math.PI) * 4); ctx.lineTo(x + 6, 112 - Math.sin(i / 5 * Math.PI) * 6); ctx.lineTo(x + 12, 128); ctx.closePath(); ctx.fill(); }
  wing(118, 1, 1);
  glint(ctx, 104, 140, 10);
  ctx.restore();
}

// ---- wolves and dogs ----

const DOG_COLOURS = [
  [/timber|dark/, { fur: '#5a5654', back: '#34302e', belly: '#8a8680' }],
  [/coyote/, { fur: '#b0885a', back: '#7a5a38', belly: '#e0c8a0' }],
  [/tree/, { fur: '#6a6a3a', back: '#4a4a24', belly: '#a0a070' }],
  [/black|hound|war/, { fur: '#2e2a28', back: '#181614', belly: '#4a4440' }],
  [/white/, { fur: '#e8e4dc', back: '#c0bab0', belly: '#fffaf0' }],
  [/puppy/, { fur: '#c89060', back: '#a06a40', belly: '#f0d8b8', small: true }],
];
function dogColours(name) {
  for (const [re, c] of DOG_COLOURS) if (re.test(name)) return c;
  return { fur: '#8a7a64', back: '#5a4e40', belly: '#d8c8a8' };
}
// step 1: mid-stride (the walking frame): far legs forward, near legs
// back, the body a little higher.
function wolf(ctx, name, step = 0) {
  const c = dogColours(name);
  const sw = step ? 14 : 0;
  ctx.save();
  if (c.small) { ctx.translate(40, 70); ctx.scale(0.7, 0.7); }
  shadow(ctx, 128, 214, 86, 16);
  if (step) ctx.translate(0, -4);
  for (const [x, back] of [[92, 1], [168, 1]]) limb(ctx, [[x, 150], [x - 4 + sw * 0.5, 186], [x + 2 + sw, 212 + (step ? 4 : 0)]], 16, 11, c.back);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(72, 126); ctx.quadraticCurveTo(38, 116, 26, 146); ctx.quadraticCurveTo(46, 138, 76, 146); ctx.closePath(); }, c.fur, [26, 116, 76, 146]);
  fill(ctx, ell(ctx, 130, 140, 62, 28), c.fur, [68, 112, 192, 168]);
  ctx.fillStyle = rgb(c.back, 1); ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.ellipse(126, 122, 54, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = rgb(c.belly, 1); ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.ellipse(134, 158, 40, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  for (const x of [104, 178]) limb(ctx, [[x, 152], [x + 4 - sw * 0.5, 186], [x + 8 - sw, 212 + (step ? 4 : 0)]], 16, 11, c.fur);
  // Neck, head with a pointed muzzle and ears.
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(170, 124); ctx.quadraticCurveTo(186, 104, 198, 106); ctx.lineTo(198, 144); ctx.quadraticCurveTo(182, 150, 170, 148); ctx.closePath(); }, c.fur, [170, 104, 198, 150]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(186, 100); ctx.quadraticCurveTo(206, 88, 222, 100); ctx.lineTo(242, 112); ctx.quadraticCurveTo(232, 124, 212, 124); ctx.quadraticCurveTo(190, 122, 186, 108); ctx.closePath(); }, c.fur, [186, 88, 242, 124]);
  for (const ex of [194, 206]) fill(ctx, () => { ctx.beginPath(); ctx.moveTo(ex, 98); ctx.lineTo(ex + 5, 76); ctx.lineTo(ex + 12, 96); ctx.closePath(); }, c.back, [ex, 76, ex + 12, 98], 2);
  ctx.fillStyle = '#141010'; ctx.beginPath(); ctx.arc(241, 112, 3.6, 0, Math.PI * 2); ctx.fill();
  eye(ctx, 214, 104, 3.2, '#e8c040');
  ctx.restore();
}

// ---- cats ----

// A wildcat: lean, stalking low on four legs, striped, with a thick banded
// tail, tufted ears and narrowed eyes. Kittens keep the cute sitting cat.
function cat(ctx, name) {
  if (/kitty|kitten/.test(name)) return kittenCat(ctx, name);
  const fur = /black|shadow|panther/.test(name) ? '#2e2a2a' : /white|snow/.test(name) ? '#e4ded2' : '#a8845a';
  const dark = /black|shadow|panther/.test(name) ? '#121010' : /white|snow/.test(name) ? '#8a8478' : '#3e2c1a';
  const belly = /black|shadow|panther/.test(name) ? '#3a3434' : '#e4d2b0';
  shadow(ctx, 128, 208, 96, 12);
  // Far legs, darker.
  for (const [x, top] of [[92, 150], [170, 146]]) limb(ctx, [[x, top], [x - 4, 184], [x + 2, 204]], 15, 11, shadeHex(fur, 0.75));
  // Tail: thick, low, curving up at the end, banded, with a black tip.
  const tail = [[70, 136], [40, 150], [24, 176], [30, 196]];
  limb(ctx, tail, 17, 14, fur);
  ctx.strokeStyle = dark; ctx.lineWidth = 16; ctx.lineCap = 'butt';
  for (const t of [0.35, 0.6]) {
    const x = 40 - 12 * t, y = 150 + 40 * t;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 4); ctx.lineTo(x + 3, y + 4); ctx.stroke();
  }
  fill(ctx, ell(ctx, 30, 196, 9, 8), dark, [21, 188, 39, 204], 1.5);
  // Body: long and low, shoulders dropped as it stalks.
  fill(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(66, 142);
    ctx.quadraticCurveTo(70, 112, 104, 114);
    ctx.quadraticCurveTo(140, 118, 176, 128);
    ctx.quadraticCurveTo(192, 136, 184, 154);
    ctx.quadraticCurveTo(140, 168, 96, 164);
    ctx.quadraticCurveTo(66, 162, 66, 142);
    ctx.closePath();
  }, fur, [66, 112, 192, 168]);
  ctx.fillStyle = belly; ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.ellipse(126, 160, 42, 7, 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Stripes down the flank.
  ctx.strokeStyle = dark; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.75;
  for (const x of [88, 104, 120, 136, 152, 166]) { ctx.beginPath(); ctx.moveTo(x, 120 + (x - 88) * 0.08); ctx.quadraticCurveTo(x - 6, 136, x - 2, 152); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(80, 118); ctx.quadraticCurveTo(128, 112, 176, 128); ctx.lineWidth = 3; ctx.stroke();
  ctx.globalAlpha = 1;
  // Near legs, one front paw raised mid-step.
  limb(ctx, [[104, 150], [98, 186], [104, 206]], 17, 12, fur);
  limb(ctx, [[180, 146], [192, 170], [204, 180]], 16, 11, fur);
  for (const [x, y] of [[106, 206], [206, 181]]) fill(ctx, ell(ctx, x, y, 9, 5), fur, [x - 9, y - 5, x + 9, y + 5], 1.5);
  // Head, low and forward: a broad face with a muzzle.
  fill(ctx, ell(ctx, 204, 134, 27, 22, -0.1), fur, [177, 112, 231, 156]);
  fill(ctx, ell(ctx, 226, 144, 14, 11, 0.2), belly, [212, 133, 240, 155], 1.5);
  // Ears: pointed, with black tufts.
  for (const [ex, lean] of [[190, -1], [210, 1]]) {
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(ex - 9, 120); ctx.lineTo(ex + lean * 3, 92); ctx.lineTo(ex + 9, 118); ctx.closePath(); }, fur, [ex - 9, 92, ex + 9, 120], 2);
    ctx.strokeStyle = '#141010'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ex + lean * 3, 93); ctx.lineTo(ex + lean * 5, 82); ctx.stroke();
  }
  // Face stripes, a narrowed yellow eye, nose and a bared fang.
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  for (const [x1, y1, x2, y2] of [[192, 124, 200, 140], [198, 120, 206, 134], [214, 128, 204, 142]]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.fillStyle = '#e8c030';
  ctx.beginPath(); ctx.moveTo(206, 128); ctx.quadraticCurveTo(214, 122, 222, 128); ctx.quadraticCurveTo(214, 132, 206, 128); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.ellipse(215, 127.5, 1.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#101010'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(204, 124); ctx.lineTo(224, 126); ctx.stroke();
  ctx.fillStyle = '#3a2420'; ctx.beginPath(); ctx.moveTo(236, 140); ctx.lineTo(240, 146); ctx.lineTo(233, 146); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a1010'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(222, 152); ctx.quadraticCurveTo(230, 156, 238, 150); ctx.stroke();
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(229, 152); ctx.lineTo(232, 161); ctx.lineTo(234, 152); ctx.closePath(); }, '#f4ecd8', [229, 152, 234, 161], 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
  for (const dy of [-2, 3]) { ctx.beginPath(); ctx.moveTo(228, 146); ctx.lineTo(252, 142 + dy); ctx.stroke(); }
}

// ---- cats ----

function kittenCat(ctx, name) {
  const kitten = true;
  const fur = /black/.test(name) ? '#2e2a2a' : /white/.test(name) ? '#ece6dc' : '#d08a40';
  const stripe = /black/.test(name) ? '#141212' : /white/.test(name) ? '#c8c0b4' : '#8a5020';
  ctx.save();
  if (kitten) { ctx.translate(46, 70); ctx.scale(0.66, 0.66); }
  shadow(ctx, 128, 206, 66, 13);
  // Tail curling up, then body sitting, front legs, head.
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(84, 190); ctx.quadraticCurveTo(40, 190, 44, 150); ctx.quadraticCurveTo(48, 128, 62, 128); ctx.quadraticCurveTo(56, 150, 64, 168); ctx.quadraticCurveTo(76, 178, 90, 178); ctx.closePath(); }, fur, [40, 128, 90, 190]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(84, 204); ctx.quadraticCurveTo(76, 150, 104, 124); ctx.quadraticCurveTo(128, 108, 150, 124); ctx.quadraticCurveTo(170, 150, 164, 204); ctx.quadraticCurveTo(124, 212, 84, 204); }, fur, [76, 108, 170, 212]);
  ctx.strokeStyle = stripe; ctx.lineWidth = 4; ctx.globalAlpha = 0.6;
  for (const y of [150, 166, 182]) { ctx.beginPath(); ctx.moveTo(88, y); ctx.quadraticCurveTo(100, y - 6, 110, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,245,230,0.5)'; ctx.beginPath(); ctx.ellipse(132, 170, 16, 26, 0, 0, Math.PI * 2); ctx.fill();
  for (const x of [118, 142]) fill(ctx, () => { ctx.beginPath(); ctx.roundRect(x - 6, 168, 12, 38, 6); }, fur, [x - 6, 168, x + 6, 206], 2);
  // Head: round, with pointed ears, green eyes, a small nose and whiskers.
  fill(ctx, ell(ctx, 130, 104, 32, 28), fur, [98, 76, 162, 132]);
  for (const [ex, d] of [[108, -1], [152, 1]]) {
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(ex - 10 * d, 90); ctx.lineTo(ex + 2 * d, 60); ctx.lineTo(ex + 12 * d, 84); ctx.closePath(); }, fur, [ex - 12, 60, ex + 12, 90], 2);
    ctx.fillStyle = 'rgba(240,160,160,0.7)'; ctx.beginPath(); ctx.moveTo(ex - 4 * d, 86); ctx.lineTo(ex + 2 * d, 68); ctx.lineTo(ex + 7 * d, 84); ctx.closePath(); ctx.fill();
  }
  for (const ex of [118, 142]) {
    ctx.fillStyle = '#7ad048'; ctx.beginPath(); ctx.ellipse(ex, 102, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.ellipse(ex, 102, 1.8, 6, 0, 0, Math.PI * 2); ctx.fill();
    glint(ctx, ex - 2, 99, 1.6);
  }
  ctx.fillStyle = '#e07a8a'; ctx.beginPath(); ctx.moveTo(126, 112); ctx.lineTo(134, 112); ctx.lineTo(130, 117); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
  for (const d of [-1, 1]) for (const dy of [-2, 3]) { ctx.beginPath(); ctx.moveTo(130 + d * 6, 116); ctx.lineTo(130 + d * 30, 114 + dy); ctx.stroke(); }
  ctx.restore();
}

// ---- bears ----

function bear(ctx, name, step = 0) {
  const fur = /polar|ice|white/.test(name) ? '#ece8e0' : /black/.test(name) ? '#2a2420' : '#7a5230';
  const sw = step ? 10 : 0;
  shadow(ctx, 128, 212, 96, 16);
  ctx.save();
  if (step) ctx.translate(0, -3);
  for (const [x, f] of [[86, 0.8], [168, 0.8]]) limb(ctx, [[x, 150], [x - 2 + sw * 0.5, 190], [x + 4 + sw, 210 + (step ? 3 : 0)]], 26, 22, fur);
  fill(ctx, ell(ctx, 122, 144, 70, 44), fur, [52, 100, 192, 188]);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(118, 118, 60, 14, 0, 0, Math.PI * 2); ctx.fill();
  for (const x of [100, 182]) limb(ctx, [[x, 158], [x + 2 - sw * 0.5, 194], [x + 6 - sw, 212 + (step ? 3 : 0)]], 26, 22, fur);
  // Hump, head with round ears and a lighter muzzle.
  fill(ctx, ell(ctx, 170, 118, 26, 22), fur, [144, 96, 196, 140]);
  fill(ctx, ell(ctx, 204, 122, 28, 24), fur, [176, 98, 232, 146]);
  for (const ex of [192, 212]) fill(ctx, ell(ctx, ex, 100, 9, 9), fur, [ex - 9, 91, ex + 9, 109], 2);
  fill(ctx, ell(ctx, 224, 132, 14, 11), '#c8a070', [210, 121, 238, 143], 1.5);
  ctx.fillStyle = '#141010'; ctx.beginPath(); ctx.ellipse(234, 128, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(210, 116, 3, 0, Math.PI * 2); ctx.fill();
  glint(ctx, 96, 118, 12);
  ctx.restore();
}

// ---- slimes ----

// step 1: squashed flat and wide, as it pushes itself along.
function slime(ctx, name, step = 0) {
  const colour = /toxic|sludge/.test(name) ? '#9a5ac8' : /green|slimer/.test(name) ? '#58c030' : '#5a90c8';
  shadow(ctx, 128, 196, step ? 80 : 70, 14);
  ctx.save();
  if (step) { ctx.translate(128, 196); ctx.scale(1.1, 0.86); ctx.translate(-128, -196); }
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(62, 192); ctx.bezierCurveTo(52, 150, 80, 108, 128, 106); ctx.bezierCurveTo(178, 104, 206, 150, 196, 192); ctx.quadraticCurveTo(128, 204, 62, 192); }, colour, [62, 104, 196, 200], 3);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(116, 150, 34, 22, 0, 0, Math.PI * 2); ctx.fill();
  if (/toxic|sludge/.test(name)) for (const [x, y, r] of [[90, 176, 6], [150, 130, 4], [170, 178, 5]]) { ctx.fillStyle = 'rgba(210,255,120,0.7)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  glint(ctx, 104, 130, 12); glint(ctx, 160, 150, 5);
  for (const ex of [112, 144]) { ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.ellipse(ex, 158, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); glint(ctx, ex - 2, 155, 2); }
  ctx.restore();
}

// ---- wizards and mages ----

function wizardColours(name) {
  if (/blue/.test(name)) return ['#2a4ab0', '#e0c050'];
  if (/green/.test(name)) return ['#2a8a3a', '#e0c050'];
  if (/red/.test(name)) return ['#a82020', '#f0c050'];
  if (/dark|mech/.test(name)) return ['#2a2430', '#8a60c0'];
  if (/battle/.test(name)) return ['#7a4a20', '#c0c0c8'];
  if (/1st/.test(name)) return ['#6a3a9a', '#e0c050'];
  if (/2nd/.test(name)) return ['#9a3a6a', '#e0c050'];
  if (/3rd/.test(name)) return ['#3a6a9a', '#e0c050'];
  if (/key/.test(name)) return ['#8a6a20', '#f0e090'];
  return ['#4a3a9a', '#e0c050'];
}
function wizard(ctx, name) {
  const [robe, trim] = wizardColours(name);
  shadow(ctx, 128, 228, 52, 12);
  // Staff with a glowing orb.
  limb(ctx, [[176, 228], [170, 90]], 6, 6, '#6a4424');
  const g = ctx.createRadialGradient(170, 82, 1, 170, 82, 20);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, trim); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(170, 82, 20, 0, Math.PI * 2); ctx.fill();
  // Robe, trim, sleeves.
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(104, 110); ctx.quadraticCurveTo(92, 180, 88, 226); ctx.lineTo(168, 226); ctx.quadraticCurveTo(164, 180, 152, 110); ctx.closePath(); }, robe, [88, 110, 168, 226]);
  ctx.fillStyle = trim; ctx.fillRect(90, 216, 76, 6); ctx.fillRect(125, 112, 6, 104);
  fill(ctx, ell(ctx, 160, 138, 12, 22, -0.3), robe, [148, 116, 172, 160]);
  fill(ctx, ell(ctx, 168, 156, 7, 7), '#e0b890', [160, 148, 176, 164], 1.5);
  // Face, long beard, pointed hat.
  fill(ctx, ell(ctx, 128, 96, 18, 19), '#e0b890', [110, 77, 146, 115]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(112, 100); ctx.quadraticCurveTo(128, 150, 144, 100); ctx.closePath(); }, '#e8e8e4', [112, 100, 144, 150], 1.5);
  for (const ex of [121, 135]) { ctx.fillStyle = '#1a1210'; ctx.beginPath(); ctx.arc(ex, 93, 2.2, 0, Math.PI * 2); ctx.fill(); }
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(96, 84); ctx.quadraticCurveTo(128, 74, 160, 84); ctx.quadraticCurveTo(150, 60, 136, 22); ctx.quadraticCurveTo(122, 46, 110, 66); ctx.closePath(); }, robe, [96, 22, 160, 84]);
  ctx.fillStyle = trim; ctx.beginPath(); ctx.ellipse(128, 82, 34, 5, 0, 0, Math.PI * 2); ctx.fill();
  for (const [sx, sy] of [[124, 56], [136, 42], [118, 70]]) { ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill(); }
}

// ---- skeletons ----

// step 1: one leg lifted and forward, the other back, a slight bob.
function skeleton(ctx, name, step = 0) {
  const bone = '#e4dcc8', armed = /knight|warrior|stalfos/.test(name), knight = /knight/.test(name);
  shadow(ctx, 128, 228, 48, 11);
  ctx.save();
  if (step) ctx.translate(0, -3);
  if (step) {
    limb(ctx, [[114, 158], [110, 190], [106, 214]], 7, 6, bone); // lifted
    limb(ctx, [[142, 158], [146, 194], [148, 225]], 7, 6, bone);
  } else for (const x of [114, 142]) limb(ctx, [[x, 158], [x - 2, 194], [x, 222]], 7, 6, bone);
  // Pelvis, spine and ribs.
  fill(ctx, ell(ctx, 128, 158, 20, 9), bone, [108, 149, 148, 167], 1.5);
  limb(ctx, [[128, 150], [128, 100]], 6, 6, bone);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = rgb(bone, 0.45); ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(128, 108 + i * 10, 22 - i * 2, 6, 0, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.strokeStyle = bone; ctx.lineWidth = 4; ctx.stroke();
  }
  for (const [x, d] of [[104, -1], [152, 1]]) limb(ctx, [[x, 100], [x + d * 8, 130], [x + d * 4, 156]], 6, 5, bone);
  // Skull.
  fill(ctx, ell(ctx, 128, 76, 20, 22), bone, [108, 54, 148, 98]);
  for (const ex of [120, 136]) { ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.ellipse(ex, 76, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.moveTo(128, 82); ctx.lineTo(124, 90); ctx.lineTo(132, 90); ctx.closePath(); ctx.fill();
  for (let x = 120; x <= 136; x += 4) ctx.fillRect(x, 94, 2, 4);
  if (armed) {
    limb(ctx, [[158, 158], [178, 84]], 4, 3, '#b8bcc4');
    ctx.fillStyle = '#6a4424'; ctx.fillRect(152, 152, 14, 5);
    fill(ctx, ell(ctx, 100, 130, 18, 24), knight ? '#6a6a74' : '#7a5a34', [82, 106, 118, 154]);
  }
  if (knight) fill(ctx, () => { ctx.beginPath(); ctx.arc(128, 72, 23, Math.PI, Math.PI * 2); ctx.closePath(); }, '#7a7a84', [105, 49, 151, 72]);
  ctx.restore();
}

// ---- people, drawn with the character painter facing you ----

const CIVILIAN = [
  { skin: '#e0b890', hair: '#6a4424', top: '#7a2a2a', trim: '#4a1a1a', legs: '#3a3a4a', boots: '#2a1c10', style: 'plain' },
  { skin: '#c89468', hair: '#2a1a10', top: '#2a5a7a', trim: '#1a3a4a', legs: '#4a3a2a', boots: '#2a1c10', style: 'plain' },
  { skin: '#f0d0b0', hair: '#c8a040', top: '#5a7a2a', trim: '#3a4a1a', legs: '#5a4a3a', boots: '#3a2818', style: 'plain' },
  { skin: '#8a6040', hair: '#1a1210', top: '#9a7a4a', trim: '#6a5030', legs: '#3a3028', boots: '#1a140c', style: 'plain' },
  { skin: '#e8c8a8', hair: '#9a9a9a', top: '#5a4a7a', trim: '#3a2a5a', legs: '#2a2a2a', boots: '#1a1a1a', style: 'plain', beard: '#9a9a9a' },
];
// Townswomen: skirts and long hair, a bun or a ponytail.
const CIVILIAN_WOMEN = [
  { skin: '#e8c0a0', hair: '#8a4a24', hairStyle: 'long', top: '#6a2a4a', skirt: '#3a2a5a', trim: '#3a1a2a', legs: '#3a3a4a', boots: '#2a1c10', style: 'plain' },
  { skin: '#c89468', hair: '#2a1a10', hairStyle: 'bun', top: '#2a6a5a', skirt: '#6a4a2a', trim: '#1a3a3a', legs: '#4a3a2a', boots: '#2a1c10', style: 'plain' },
  { skin: '#f0d0b0', hair: '#c8a040', hairStyle: 'ponytail', top: '#8a5a2a', skirt: '#2a4a7a', trim: '#4a3018', legs: '#5a4a3a', boots: '#3a2818', style: 'plain' },
];
const FEMALE = /woman|girl|lady|maid|wife|witch|queen|princess|nun|priestess|mother|sister|daughter/;
const ARMOURS = [
  [/dark|doom|shadow/, ['#2a2830', '#8a2a2a']],
  [/dragon/, ['#2a6a3a', '#d8b040']],
  [/water/, ['#2a7a8a', '#a8e0e8']],
  [/hell/, ['#6a1410', '#f08030']],
  [/forest/, ['#3a5a2a', '#a08a50']],
  [/gladiator/, ['#a8743a', '#f0d080']],
  [/guard|warden|soldier/, ['#8a8e98', '#c8b060']],
];
function person(ctx, name, step = 0) {
  let look = FEMALE.test(name) ? CIVILIAN_WOMEN[Math.floor(hash(name) * CIVILIAN_WOMEN.length)] : CIVILIAN[Math.floor(hash(name) * CIVILIAN.length)];
  let gear = {};
  for (const [re, [metal, trim]] of ARMOURS) {
    if (re.test(name)) {
      look = { skin: '#c89468', top: metal, trim, legs: metal, boots: '#1a1818', style: 'armour', helm: metal };
      gear = { weapon: { kind: /gladiator/.test(name) ? 'spear' : 'sword', colour: '#c8ccd4' }, shield: { colour: trim } };
      break;
    }
  }
  if (/hunter/.test(name)) { look = { ...CIVILIAN[1], top: '#4a6a2a', trim: '#6a4a24' }; gear = { weapon: { kind: 'bow', colour: '#74502c' } }; }
  if (/thief|stalker|assassin/.test(name)) { look = { ...CIVILIAN[3], top: '#2a2a2e', trim: '#1a1a1e', legs: '#1e1e22', hair: '#1a1a1a' }; gear = { weapon: { kind: 'dagger', colour: '#c8ccd4' } }; }
  // Duergar: grey dwarves, grey-skinned and bearded, in dark iron; delvers dig.
  if (/duergar|thrumgar/.test(name)) { look = { skin: '#8a8c90', top: '#3e3e44', trim: '#7a6a4a', legs: '#2e2e34', boots: '#1a1818', style: 'armour', helm: '#4a4a52', beard: '#5a5a60' }; gear = { weapon: { kind: /delver/.test(name) ? 'pick' : 'axe', colour: '#9a9ca4' } }; }
  if (/thrumgar/.test(name)) { look = { ...look, trim: '#c8a040', helm: '#2e2e34', horns: true }; gear = { ...gear, shield: { colour: '#c8a040' } }; }
  ctx.save();
  ctx.translate(OUT * 0.5 - 144 * 0.85, OUT - 144 * 1.7 - 4);
  ctx.scale(1.7, 1.7);
  paintPerson(ctx, look, 's', !!step, gear);
  ctx.restore();
}

// ---- families: which names they cover ----

// First match wins, so skeletons come before knights ("skeleton knight").
export const FAMILIES = [
  { paint: skeleton, match: /skeleton|stalfos/, walks: true },
  { paint: person, match: /knight|guard|warden|soldier|gladiator|warlord|duergar/, walks: true },
  { paint: dragon, match: /dragon|freyrbrand|dino|dinosaur/ },
  { paint: wolf, match: /wolf|coyote|dog|hound|puppy|rufus|trainer/, walks: true },
  { paint: cat, match: /\bcat\b|kitty|kitten/ },
  { paint: bear, match: /grizzly|bear/, walks: true },
  { paint: slime, match: /blob|slime|sludge/, walks: true },
  { paint: wizard, match: /wizard|mage|keymaster|plenton/ },
  { paint: person, match: /townfolk|bartender|cashier|hunter|thief|invader|stalker|bob|zack|andy|kenny|cecil|boss|bigbum|grinder|clone/, walks: true },
];

export function familyFor(name) {
  const n = name.toLowerCase();
  return FAMILIES.find((f) => f.match.test(n)) ?? null;
}

// The named sheet for these creature names, and the index from each
// (lowercased) name to its frame. Families that walk also get a
// mid-stride frame, "<name> walk", shown while they step (js/renderer.js).
const COLS = 16;
export function paintNamedSheet(names) {
  const frames = [];
  for (const name of names) {
    const f = familyFor(name);
    if (!f) continue;
    frames.push([name.toLowerCase(), f, 0]);
    if (f.walks) frames.push([name.toLowerCase(), f, 1]);
  }
  // A grid, COLS frames a row (one long strip would pass the canvas's
  // width limit), read left to right, top to bottom.
  const sheet = document.createElement('canvas');
  sheet.width = Math.min(COLS, Math.max(1, frames.length)) * OUT;
  sheet.height = Math.max(1, Math.ceil(frames.length / COLS)) * OUT;
  const ctx = sheet.getContext('2d');
  const index = {};
  frames.forEach(([name, f, step], i) => {
    ctx.save();
    ctx.translate((i % COLS) * OUT, Math.floor(i / COLS) * OUT);
    ctx.beginPath(); ctx.rect(0, 0, OUT, OUT); ctx.clip();
    f.paint(ctx, name, step);
    ctx.restore();
    index[step ? `${name} walk` : name] = i;
  });
  return { sheet, index };
}
