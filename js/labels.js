// Name labels that don't overprint each other (Painted style; js/renderer.js).
//
// layoutLabels(labels, measure, lineH) takes the frame's labels as
// { text, x, y, cx, self } - x/y where the label would go (left edge, baseline), cx
// its figure's centre - and returns the labels to draw as { text, x, y }:
//   - neighbours with the same name (figures within two lines of each other, chained)
//     become one label, "name x3", centred over the group;
//   - then each label takes its own spot if it's free, else the nearest free spot
//     one line up or down, at most MAX_LINES lines away (if none is free, its own);
//   - the player's own label (self) is placed first, keeps its spot, and comes last
//     in the result so it's drawn on top.
// measure(text) -> width in pixels.

export const MAX_LINES = 3;
const OFFSETS = [0, -1, 1, -2, 2, -3, 3];

export function layoutLabels(labels, measure, lineH) {
  const n = labels.length;
  if (n === 0) return [];
  // Same-name neighbours, grouped (union of each label with any same-named one nearby).
  const group = new Int32Array(n).map((_, i) => i);
  const root = (i) => { while (group[i] !== i) i = group[i] = group[group[i]]; return i; };
  const near = lineH * 2;
  for (let i = 0; i < n; i++) {
    if (labels[i].self) continue;
    for (let j = i + 1; j < n; j++) {
      const a = labels[i], b = labels[j];
      if (b.self || a.text !== b.text || Math.abs(a.cx - b.cx) > near * 2 || Math.abs(a.y - b.y) > near) continue;
      group[root(j)] = root(i);
    }
  }
  const merged = [];
  const members = new Map();
  for (let i = 0; i < n; i++) {
    const r = root(i);
    const m = members.get(r);
    if (m) m.push(labels[i]); else members.set(r, [labels[i]]);
  }
  for (const list of members.values()) {
    const first = list[0];
    if (list.length === 1) { merged.push({ text: first.text, x: first.x, y: first.y, self: !!first.self, w: measure(first.text) }); continue; }
    const text = `${first.text} x${list.length}`;
    const w = measure(text);
    let cx = 0, y = 0;
    for (const l of list) { cx += l.cx; y += l.y; }
    merged.push({ text, x: cx / list.length - w / 2, y: Math.round(y / list.length), self: false, w });
  }
  // Self first, then top to bottom, left to right, so the layout is steady from frame to frame.
  merged.sort((a, b) => (b.self - a.self) || a.y - b.y || a.x - b.x);
  const placed = [];
  const up = lineH * 0.8, down = lineH * 0.25;
  const free = (x, y, w) => {
    for (const p of placed) {
      if (x < p.x + p.w && x + w > p.x && y - up < p.y + down && y + down > p.y - up) return false;
    }
    return true;
  };
  for (const l of merged) {
    let y = l.y;
    if (!l.self) {
      for (const k of OFFSETS) {
        if (free(l.x, l.y + k * lineH, l.w)) { y = l.y + k * lineH; break; }
      }
    }
    placed.push({ text: l.text, x: l.x, y, w: l.w, self: l.self });
  }
  // Self drawn last, on top.
  const out = placed.filter((p) => !p.self);
  for (const p of placed) if (p.self) out.push(p);
  return out.map(({ text, x, y }) => ({ text, x, y }));
}
