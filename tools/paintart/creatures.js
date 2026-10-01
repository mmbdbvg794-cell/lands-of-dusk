// Painted creatures, drawn fresh in the same style as the trees and
// characters: shapes shaded from the upper left, soft darker edges, a
// shadow underneath. One painter per sprites.gif image, starting with the
// ones this server's mobs use most (by how many are placed in the world);
// sprites without a painter here keep the oil-paint filter (figures.js).

const OUT = 256;

function rgb(hex, f = 1) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f)))).join(',')})`;
}

// Fill a path with light from the upper left, then a soft darker edge.
function fill(ctx, path, colour, bounds = [0, 0, OUT, OUT], edge = 2.5) {
  const [x0, y0, x1, y1] = bounds;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgb(colour, 1.25));
  g.addColorStop(0.5, rgb(colour, 1));
  g.addColorStop(1, rgb(colour, 0.62));
  ctx.fillStyle = g;
  path();
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = rgb(colour, 0.4);
    ctx.lineWidth = edge;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}
const ell = (ctx, x, y, rx, ry, a = 0) => () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); };
function shadow(ctx, x, y, rx, ry) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function glint(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, -0.6, 0, Math.PI * 2); ctx.fill();
}
// A tapering limb along points, e.g. a leg.
function limb(ctx, pts, w0, w1, colour) {
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    ctx.strokeStyle = rgb(colour, 0.4);
    ctx.lineWidth = w0 + (w1 - w0) * t + 3;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[i + 1]); ctx.stroke();
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    ctx.strokeStyle = rgb(colour, 1 - t * 0.2);
    ctx.lineWidth = w0 + (w1 - w0) * t;
    ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[i + 1]); ctx.stroke();
  }
}

// 21: wolf, side view.
function wolf(ctx) {
  shadow(ctx, 128, 214, 86, 16);
  const fur = '#8a7a64', dark = '#4a4034';
  for (const [x, back] of [[92, 1], [168, 1], [100, 0], [176, 0]]) {
    limb(ctx, [[x, 150], [x + (back ? -4 : 4), 186], [x + (back ? 2 : 6), 212]], 16, 11, back ? '#6a5c4a' : fur);
  }
  // Tail, body, neck, head.
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(72, 128); ctx.quadraticCurveTo(34, 130, 30, 172); ctx.quadraticCurveTo(44, 150, 76, 146); ctx.closePath(); }, fur, [30, 128, 76, 172]);
  fill(ctx, ell(ctx, 132, 138, 64, 30), fur, [68, 108, 196, 168]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(172, 116); ctx.quadraticCurveTo(194, 98, 206, 108); ctx.lineTo(200, 146); ctx.quadraticCurveTo(180, 150, 170, 150); ctx.closePath(); }, fur, [170, 98, 206, 150]);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(190, 92); ctx.quadraticCurveTo(214, 84, 238, 110); ctx.quadraticCurveTo(226, 124, 206, 124); ctx.quadraticCurveTo(190, 118, 188, 104); ctx.closePath(); }, fur, [188, 84, 238, 124]);
  for (const ex of [196, 208]) fill(ctx, () => { ctx.beginPath(); ctx.moveTo(ex, 96); ctx.lineTo(ex + 6, 70); ctx.lineTo(ex + 12, 96); ctx.closePath(); }, fur, [ex, 70, ex + 12, 96], 2);
  // Darker back, pale belly, nose and eye.
  ctx.fillStyle = 'rgba(40,32,24,0.35)';
  ctx.beginPath(); ctx.ellipse(126, 118, 56, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(240,226,200,0.3)';
  ctx.beginPath(); ctx.ellipse(132, 158, 42, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(236, 110, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c040'; ctx.beginPath(); ctx.arc(212, 100, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.arc(212.5, 100, 1.4, 0, Math.PI * 2); ctx.fill();
}

// 29: giant spider, grey with red markings.
function spider(ctx) {
  shadow(ctx, 128, 206, 96, 20);
  const leg = '#6c6c70';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const bx = 128 + side * 18, by = 118 + i * 10;
      const kx = 128 + side * (60 + i * 6), ky = 70 + i * 22;
      const fx = 128 + side * (96 + (i % 2) * 10), fy = 150 + i * 16;
      limb(ctx, [[bx, by], [kx, ky], [fx, fy]], 9, 5, leg);
    }
  }
  fill(ctx, ell(ctx, 128, 158, 40, 34), '#7a7a80', [88, 124, 168, 192]);
  // Red hourglass on the abdomen.
  ctx.fillStyle = '#c0282a';
  ctx.beginPath(); ctx.moveTo(116, 144); ctx.lineTo(140, 144); ctx.lineTo(128, 158); ctx.lineTo(140, 172); ctx.lineTo(116, 172); ctx.lineTo(128, 158); ctx.closePath(); ctx.fill();
  fill(ctx, ell(ctx, 128, 116, 26, 22), '#8a8a90', [102, 94, 154, 138]);
  // Eyes: a cluster of red glints.
  for (const [ex, ey, r] of [[119, 106, 4], [137, 106, 4], [124, 99, 2.6], [132, 99, 2.6]]) {
    ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
    glint(ctx, ex - r * 0.3, ey - r * 0.3, r * 0.4);
  }
  glint(ctx, 112, 144, 8);
}

// 33: slime, a glossy green blob.
function slime(ctx) {
  shadow(ctx, 128, 196, 70, 14);
  fill(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(62, 192);
    ctx.bezierCurveTo(52, 150, 80, 108, 128, 106);
    ctx.bezierCurveTo(178, 104, 206, 150, 196, 192);
    ctx.quadraticCurveTo(128, 204, 62, 192);
  }, '#58c030', [62, 104, 196, 200], 3);
  ctx.fillStyle = 'rgba(200,255,120,0.35)';
  ctx.beginPath(); ctx.ellipse(116, 150, 34, 22, 0, 0, Math.PI * 2); ctx.fill();
  glint(ctx, 104, 130, 12);
  glint(ctx, 160, 150, 5);
  for (const ex of [112, 144]) {
    ctx.fillStyle = '#10200a'; ctx.beginPath(); ctx.ellipse(ex, 158, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
    glint(ctx, ex - 2, 155, 2);
  }
}

// 2: a hooded, cloaked figure (townsfolk, thieves, vampires).
function hooded(ctx) {
  shadow(ctx, 128, 226, 50, 12);
  const cloak = '#34302e';
  fill(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(96, 96); ctx.quadraticCurveTo(84, 170, 88, 224);
    ctx.lineTo(168, 224); ctx.quadraticCurveTo(172, 170, 160, 96); ctx.closePath();
  }, cloak, [84, 96, 172, 224]);
  // Folds.
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3;
  for (const x of [112, 132, 148]) { ctx.beginPath(); ctx.moveTo(x, 120); ctx.quadraticCurveTo(x - 2, 180, x + 2, 222); ctx.stroke(); }
  // Hood with a shadowed face and faint eyes.
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(100, 104); ctx.quadraticCurveTo(100, 50, 128, 46); ctx.quadraticCurveTo(156, 50, 156, 104); ctx.quadraticCurveTo(128, 112, 100, 104); }, '#3e3a36', [100, 46, 156, 112]);
  ctx.fillStyle = '#14100e';
  ctx.beginPath(); ctx.ellipse(128, 86, 16, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(210,200,170,0.8)';
  for (const ex of [121, 135]) { ctx.beginPath(); ctx.ellipse(ex, 84, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
  // Hands clasped at the front.
  fill(ctx, ell(ctx, 128, 150, 12, 8), '#b89070', [116, 142, 140, 158], 1.5);
}

// 28: an upright lizard, olive with a pale belly (as the lizardman race).
function lizard(ctx) {
  shadow(ctx, 124, 222, 54, 12);
  const skin = '#5e7d3c';
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(124, 176); ctx.quadraticCurveTo(170, 200, 206, 214); ctx.quadraticCurveTo(168, 212, 118, 196); ctx.closePath(); }, skin, [118, 176, 206, 214]);
  for (const [x, f] of [[106, 0.8], [136, 1]]) limb(ctx, [[x, 170], [x - 4, 196], [x + 4, 218]], 16, 12, f < 1 ? '#4c6832' : skin);
  fill(ctx, ell(ctx, 122, 140, 30, 42), skin, [92, 98, 152, 182]);
  fill(ctx, ell(ctx, 124, 146, 16, 30), '#c4b283', [108, 116, 140, 176], 0);
  for (const [x, f] of [[92, 0.8], [152, 1]]) limb(ctx, [[x, 116], [x + (x < 120 ? -10 : 10), 146], [x + (x < 120 ? -4 : 14), 166]], 12, 8, f < 1 ? '#4c6832' : skin);
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(104, 96); ctx.quadraticCurveTo(110, 66, 134, 66); ctx.quadraticCurveTo(166, 68, 172, 86); ctx.quadraticCurveTo(160, 98, 136, 100); ctx.quadraticCurveTo(114, 104, 104, 96); }, skin, [104, 66, 172, 104]);
  ctx.fillStyle = '#d8a428'; ctx.beginPath(); ctx.arc(138, 78, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.ellipse(139, 78, 1.6, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Scales: a scatter of darker dabs.
  ctx.fillStyle = 'rgba(30,44,16,0.4)';
  for (let i = 0; i < 26; i++) {
    const a = (i * 2.4) % (Math.PI * 2), r = 10 + ((i * 7) % 20);
    ctx.beginPath(); ctx.arc(120 + Math.cos(a) * r, 136 + Math.sin(a) * r * 1.4, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

// 31: a red scorpion with a curled, segmented tail.
function scorpion(ctx) {
  shadow(ctx, 128, 206, 90, 16);
  const shell = '#c02a1e';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) limb(ctx, [[128 + side * 20, 168 + i * 6], [128 + side * (52 + i * 6), 150 + i * 10], [128 + side * (66 + i * 8), 196 + i * 2]], 7, 4, '#9a2016');
  }
  // Tail: segments curling up and over the back.
  const segs = [[128, 176], [128, 150], [132, 122], [142, 98], [156, 82], [172, 78], [184, 88]];
  segs.forEach(([x, y], i) => fill(ctx, ell(ctx, x, y, 15 - i, 12 - i * 0.8), shell, [x - 15, y - 12, x + 15, y + 12], 2));
  fill(ctx, () => { ctx.beginPath(); ctx.moveTo(184, 94); ctx.quadraticCurveTo(200, 104, 190, 122); ctx.quadraticCurveTo(186, 106, 178, 100); ctx.closePath(); }, '#e8d8a0', [178, 94, 200, 122], 1.5);
  fill(ctx, ell(ctx, 128, 176, 34, 24), shell, [94, 152, 162, 200]);
  // Claws, open pincers forward.
  for (const side of [-1, 1]) {
    limb(ctx, [[128 + side * 26, 176], [128 + side * 56, 186], [128 + side * 70, 204]], 10, 8, shell);
    fill(ctx, () => { ctx.beginPath(); ctx.moveTo(128 + side * 64, 202); ctx.quadraticCurveTo(128 + side * 96, 206, 128 + side * 86, 226); ctx.lineTo(128 + side * 76, 212); ctx.lineTo(128 + side * 70, 226); ctx.quadraticCurveTo(128 + side * 60, 212, 128 + side * 64, 202); }, shell, [128 + side * 60, 202, 128 + side * 96, 226], 2);
  }
  for (const ex of [120, 136]) { ctx.fillStyle = '#101010'; ctx.beginPath(); ctx.arc(ex, 188, 3, 0, Math.PI * 2); ctx.fill(); glint(ctx, ex - 1, 187, 1.2); }
  glint(ctx, 116, 168, 8);
}

// 41: an armoured rock beetle with glowing orbs.
function rockBeetle(ctx) {
  shadow(ctx, 128, 196, 92, 18);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) limb(ctx, [[128 + side * 40, 140 + i * 18], [128 + side * 78, 132 + i * 20], [128 + side * 90, 170 + i * 12]], 10, 6, '#5a564e');
  fill(ctx, ell(ctx, 128, 150, 62, 44), '#7a766c', [66, 106, 190, 194]);
  // Plates.
  ctx.strokeStyle = 'rgba(30,28,24,0.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(128, 108); ctx.lineTo(128, 192); ctx.stroke();
  for (const y of [132, 158]) { ctx.beginPath(); ctx.ellipse(128, y, 58, 10, 0, 0.15, Math.PI - 0.15); ctx.stroke(); }
  fill(ctx, ell(ctx, 128, 104, 34, 20), '#6a665c', [94, 84, 162, 124]);
  // Glowing orbs: blue and red, like the original.
  for (const [x, y, c] of [[108, 146, '#4a70ff'], [148, 146, '#ff4030']]) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
  }
  for (const ex of [118, 138]) { ctx.fillStyle = '#e8e040'; ctx.beginPath(); ctx.arc(ex, 98, 3.4, 0, Math.PI * 2); ctx.fill(); }
  glint(ctx, 100, 124, 10);
}

export const CREATURES = { 2: hooded, 21: wolf, 28: lizard, 29: spider, 31: scorpion, 33: slime, 41: rockBeetle };

// Paints over `sheet` (a sprites sheet at OUT px per frame) every sprite
// that has a painter, leaving the others as they are.
export function paintCreatures(sheet) {
  const ctx = sheet.getContext('2d');
  for (const [i, paint] of Object.entries(CREATURES)) {
    const x = Number(i) * OUT;
    if (x >= sheet.width) continue;
    ctx.clearRect(x, 0, OUT, OUT);
    ctx.save();
    ctx.translate(x, 0);
    ctx.beginPath(); ctx.rect(0, 0, OUT, OUT); ctx.clip();
    paint(ctx);
    ctx.restore();
  }
  return sheet;
}
