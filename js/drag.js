// Lets an absolutely positioned element be dragged around inside its
// container (the minimap over the map). The position is kept as a fraction
// of the room it has to move in, so it stays in the same corner, or the
// same spot, when the map changes size. 1,1 is the bottom-right corner.

const MARGIN = 8; // px kept clear of the container's edges
const DRAG_PX = 5; // movement before a press counts as a drag, not a click

export function makeDraggable(el, container, { pos = [1, 1], onMove } = {}) {
  let [fx, fy] = pos;
  let press = null; // { id, x, y, left, top, dragging }
  let dragged = false; // swallows the click that ends a drag

  const room = () => [
    Math.max(0, container.clientWidth - el.offsetWidth - 2 * MARGIN),
    Math.max(0, container.clientHeight - el.offsetHeight - 2 * MARGIN),
  ];
  const place = () => {
    const [w, h] = room();
    el.style.left = `${MARGIN + fx * w}px`;
    el.style.top = `${MARGIN + fy * h}px`;
    el.style.right = el.style.bottom = 'auto';
  };

  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop, dragging: false };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {} // keeps working, just without capture
  });
  el.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.dragging && Math.hypot(dx, dy) < DRAG_PX) return;
    press.dragging = true;
    el.classList.add('dragging');
    const [w, h] = room();
    fx = w ? clamp((press.left + dx - MARGIN) / w) : 1;
    fy = h ? clamp((press.top + dy - MARGIN) / h) : 1;
    place();
  });
  const end = (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (press.dragging) {
      dragged = true;
      el.classList.remove('dragging');
      onMove?.([fx, fy]);
    }
    press = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // Runs before other click listeners on `el`, so a drag doesn't also zoom.
  el.addEventListener('click', (e) => {
    if (!dragged) return;
    dragged = false;
    e.stopImmediatePropagation();
  }, true);

  new ResizeObserver(place).observe(container);
  place();

  return {
    reset() {
      [fx, fy] = [1, 1];
      place();
      onMove?.([fx, fy]);
    },
  };
}

function clamp(v) {
  return Math.min(1, Math.max(0, v));
}
