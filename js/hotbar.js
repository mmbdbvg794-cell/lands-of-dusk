// The hotbar: ten slots, on keys 1-9 and 0, each holding a spell or any
// command. It sits in the black space beside the map and can be dragged
// by its grip; let go and it snaps to the nearest edge of the map area
// (left, right, top or bottom), keeping its place along that edge.
//
// Click an empty slot to fill it, a full one to use it, and right-click
// (or long-press) a full one to change or clear it. Slots are saved per
// character.

import { castCommand, defaultAim, effectKind, spellName } from './spells.js';

export const SLOTS = 10;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const EDGE_GAP = 8;
const LONG_PRESS_MS = 500;
const GLYPH = { heal: '✚', holy: '✦', fire: '🔥', earth: '⛰', dark: '☾', arcane: '✧' };

export class Hotbar {
  // `send(cmd)` runs a command. `context()` returns what can go in a slot
  // and who's targeted: { spells, actions, items, target: entity|null }.
  constructor(el, picker, area, { send, context, load, save }) {
    this.el = el;
    this.picker = picker;
    this.area = area;
    this.send = send;
    this.context = context;
    this.load = load;
    this.save = save;
    this.slots = new Array(SLOTS).fill(null);
    this.dock = { edge: 'right', along: 0.5 };
    this.key = null;

    el.addEventListener('click', (e) => {
      const b = e.target.closest('button.slot');
      if (!b || this.suppressClick) return;
      const i = Number(b.dataset.i);
      if (this.slots[i]) this.use(i);
      else this.openPicker(i, b);
    });
    el.addEventListener('contextmenu', (e) => {
      const b = e.target.closest('button.slot');
      if (!b) return;
      e.preventDefault();
      this.openPicker(Number(b.dataset.i), b);
    });
    // Long press on touch screens, standing in for right-click.
    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('button.slot');
      if (!b || e.pointerType === 'mouse') return;
      clearTimeout(this.pressTimer);
      this.suppressClick = false;
      this.pressTimer = setTimeout(() => {
        this.suppressClick = true;
        this.openPicker(Number(b.dataset.i), b);
      }, LONG_PRESS_MS);
    });
    for (const t of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(t, () => clearTimeout(this.pressTimer));

    picker.addEventListener('click', (e) => this.onPick(e));
    picker.addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = picker.querySelector('input[name="cmd"]').value.trim();
      if (cmd) this.set(this.editing, { type: 'cmd', cmd, label: cmd });
      this.closePicker();
    });
    document.addEventListener('pointerdown', (e) => {
      if (!picker.hidden && !picker.contains(e.target) && !el.contains(e.target)) this.closePicker();
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !picker.hidden) this.closePicker();
    });

    this.makeDraggable();
    new ResizeObserver(() => this.place()).observe(area);
    this.render();
  }

  // Loads the slots saved under `key` (per server and character).
  useKey(key) {
    this.key = key;
    const saved = this.load(`dusk.hotbar.${key}`);
    let data = null;
    try {
      data = saved ? JSON.parse(saved) : null;
    } catch {}
    this.slots = new Array(SLOTS).fill(null);
    if (Array.isArray(data?.slots)) data.slots.slice(0, SLOTS).forEach((s, i) => (this.slots[i] = validSlot(s)));
    this.render();
  }

  persist() {
    if (this.key) this.save(`dusk.hotbar.${this.key}`, JSON.stringify({ slots: this.slots }));
  }

  setDock(dock) {
    if (dock && ['left', 'right', 'top', 'bottom'].includes(dock.edge)) this.dock = { edge: dock.edge, along: clamp(dock.along) };
    this.place();
  }

  // Puts a spell in the first free slot; returns that slot's key, or null
  // if the bar is full.
  addSpell(spell) {
    const i = this.slots.findIndex((s) => !s);
    if (i === -1) return null;
    this.set(i, { type: 'spell', spell, label: spell, aim: defaultAim(spell) });
    return KEYS[i];
  }

  set(i, slot) {
    this.slots[i] = slot;
    this.persist();
    this.render();
  }

  // Key 1-9 or 0; returns true if it was a hotbar key.
  pressKey(k) {
    const i = KEYS.indexOf(k);
    if (i === -1) return false;
    if (this.slots[i]) this.use(i);
    return true;
  }

  use(i) {
    const s = this.slots[i];
    if (!s) return;
    const btn = this.el.querySelector(`button.slot[data-i="${i}"]`);
    btn?.classList.remove('fired');
    void btn?.offsetWidth; // restart the flash animation
    btn?.classList.add('fired');
    if (s.type === 'spell') {
      const target = s.aim === 'target' ? this.context().target : null;
      this.send(castCommand(s.spell, target ? target.name.replace(/^(<[^>]*>)+/, '') : ''));
    } else {
      this.send(this.resolveUse(s.cmd));
    }
  }

  // "use <item name>" slots: the server wants the item's ID, which changes
  // from copy to copy, so look up one we're carrying now; failing that,
  // the name in quotes, which it also accepts.
  resolveUse(cmd) {
    const m = cmd.match(/^use\s+(?!\d+$)(?!")(.+)$/i);
    if (!m) return cmd;
    const id = this.context().itemId?.(m[1].trim());
    return id != null ? `use ${id}` : `use "${m[1].trim()}"`;
  }

  render() {
    const grip = document.createElement('div');
    grip.className = 'grip';
    grip.title = 'Drag to move the hotbar';
    grip.setAttribute('aria-hidden', 'true');
    const buttons = this.slots.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = s ? `slot ${s.type === 'spell' ? `spell ${effectKind(s.spell)}` : 'cmd'}` : 'slot empty';
      b.dataset.i = i;
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = KEYS[i];
      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = s ? (s.type === 'spell' ? GLYPH[effectKind(s.spell)] : '›') : '+';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = s ? s.label : '';
      b.append(key, icon, label);
      if (s?.type === 'spell' && s.aim === 'target') {
        const aim = document.createElement('span');
        aim.className = 'aim';
        aim.textContent = '◎';
        aim.title = 'Cast at your target';
        b.append(aim);
      }
      b.title = s ? `${s.label} (${KEYS[i]})${s.type === 'spell' ? `, cast ${s.aim === 'target' ? 'at your target' : 'on yourself'}` : ''}. Right-click to change.` : `Empty slot ${KEYS[i]}: click to fill`;
      b.setAttribute('aria-label', s ? `Slot ${KEYS[i]}: ${s.label}` : `Slot ${KEYS[i]}: empty`);
      return b;
    });
    this.el.replaceChildren(grip, ...buttons);
    this.grip = grip;
    this.place();
  }

  // ---- filling a slot ----

  openPicker(i, anchor) {
    this.editing = i;
    const ctx = this.context();
    const s = this.slots[i];
    const parts = [`<h3>Slot ${KEYS[i]}</h3>`];
    if (s) {
      parts.push(`<div class="current"><span>${esc(s.label)}</span>`);
      if (s.type === 'spell') {
        parts.push(`<button type="button" data-act="aim">${s.aim === 'target' ? 'Casts at target' : 'Casts on me'} ⇄</button>`);
      }
      parts.push(`<button type="button" data-act="clear" class="ghost">Clear</button></div>`);
    }
    const group = (title, list, type) => {
      if (!list.length) return;
      parts.push(`<h4>${title}</h4><div class="choices">`);
      for (const v of list) parts.push(`<button type="button" data-pick="${type}" data-value="${esc(v)}">${esc(v)}</button>`);
      parts.push('</div>');
    };
    const spells = [...new Set(ctx.spells.map(spellName).filter(Boolean))];
    group('Spells', spells, 'spell');
    group('Actions', ctx.actions, 'cmd');
    group('Use an item', [...new Set(ctx.items)], 'item');
    if (!spells.length) parts.push('<p class="hint">Spells you know appear here once the Stats tab lists them.</p>');
    parts.push(`<h4>Command</h4><form class="custom"><input name="cmd" type="text" autocomplete="off" spellcheck="false" placeholder="e.g. cast mend, or sleep" value="${s?.type === 'cmd' ? esc(s.cmd) : ''}"><button type="submit">Set</button></form>`);
    this.picker.innerHTML = parts.join('');
    this.picker.hidden = false;
    this.placePicker(anchor);
    this.picker.querySelector('button, input')?.focus({ preventScroll: true });
  }

  onPick(e) {
    const b = e.target.closest('button');
    if (!b || b.type === 'submit') return;
    const i = this.editing;
    const s = this.slots[i];
    if (b.dataset.act === 'clear') this.set(i, null);
    else if (b.dataset.act === 'aim' && s) this.set(i, { ...s, aim: s.aim === 'target' ? 'self' : 'target' });
    else if (b.dataset.pick === 'spell') {
      const spell = b.dataset.value;
      this.set(i, { type: 'spell', spell, label: spell, aim: defaultAim(spell) });
    } else if (b.dataset.pick === 'cmd') this.set(i, { type: 'cmd', cmd: b.dataset.value, label: b.dataset.value });
    else if (b.dataset.pick === 'item') this.set(i, { type: 'cmd', cmd: `use ${b.dataset.value}`, label: b.dataset.value });
    else return;
    this.closePicker();
  }

  closePicker() {
    this.picker.hidden = true;
    this.editing = null;
  }

  placePicker(anchor) {
    const area = this.area.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const p = this.picker;
    const w = p.offsetWidth;
    const h = p.offsetHeight;
    let x;
    let y;
    if (this.dock.edge === 'right') x = a.left - area.left - w - 8;
    else if (this.dock.edge === 'left') x = a.right - area.left + 8;
    else x = a.left - area.left;
    if (this.dock.edge === 'bottom') y = a.top - area.top - h - 8;
    else if (this.dock.edge === 'top') y = a.bottom - area.top + 8;
    else y = a.top - area.top;
    p.style.left = `${Math.max(8, Math.min(x, area.width - w - 8))}px`;
    p.style.top = `${Math.max(8, Math.min(y, area.height - h - 8))}px`;
  }

  // ---- docking ----

  place() {
    const { el, area } = this;
    const vertical = this.dock.edge === 'left' || this.dock.edge === 'right';
    el.classList.toggle('vertical', vertical);
    el.classList.toggle('horizontal', !vertical);
    el.dataset.edge = this.dock.edge;
    const W = area.clientWidth;
    const H = area.clientHeight;
    // Smaller slots when the bar doesn't fit along its edge (a short map
    // with the chat across the bottom, say): compact, then tiny.
    el.classList.remove('compact', 'tiny');
    const fits = () => (vertical ? el.offsetHeight : el.offsetWidth) <= (vertical ? H : W) - 2 * EDGE_GAP;
    if (!fits()) el.classList.add('compact');
    if (!fits()) el.classList.add('tiny');
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x;
    let y;
    if (vertical) {
      x = this.dock.edge === 'left' ? EDGE_GAP : W - w - EDGE_GAP;
      y = EDGE_GAP + this.dock.along * Math.max(0, H - h - 2 * EDGE_GAP);
    } else {
      y = this.dock.edge === 'top' ? EDGE_GAP : H - h - EDGE_GAP;
      x = EDGE_GAP + this.dock.along * Math.max(0, W - w - 2 * EDGE_GAP);
    }
    el.style.left = `${Math.max(0, x)}px`;
    el.style.top = `${Math.max(0, y)}px`;
  }

  makeDraggable() {
    let drag = null;
    this.el.addEventListener('pointerdown', (e) => {
      if (!e.target.classList.contains('grip') || e.button !== 0) return;
      e.preventDefault();
      const r = this.el.getBoundingClientRect();
      drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
      this.el.classList.add('dragging');
      try {
        this.el.setPointerCapture(e.pointerId);
      } catch {}
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const a = this.area.getBoundingClientRect();
      this.el.style.left = `${e.clientX - a.left - drag.dx}px`;
      this.el.style.top = `${e.clientY - a.top - drag.dy}px`;
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      this.el.classList.remove('dragging');
      this.snap();
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
  }

  // Snaps to whichever edge the bar's centre is closest to.
  snap() {
    const a = this.area.getBoundingClientRect();
    const r = this.el.getBoundingClientRect();
    const cx = (r.left + r.right) / 2 - a.left;
    const cy = (r.top + r.bottom) / 2 - a.top;
    const d = { left: cx, right: a.width - cx, top: cy, bottom: a.height - cy };
    const edge = Object.entries(d).sort((p, q) => p[1] - q[1])[0][0];
    const vertical = edge === 'left' || edge === 'right';
    // Where along the edge, as a fraction of the room there, once the bar
    // has turned to run along it.
    this.dock.edge = edge;
    this.place();
    const room = vertical ? a.height - this.el.offsetHeight - 2 * EDGE_GAP : a.width - this.el.offsetWidth - 2 * EDGE_GAP;
    const at = vertical ? cy - this.el.offsetHeight / 2 - EDGE_GAP : cx - this.el.offsetWidth / 2 - EDGE_GAP;
    this.dock.along = room > 0 ? clamp(at / room) : 0.5;
    this.place();
    this.onDock?.(this.dock);
  }
}

function validSlot(s) {
  if (s?.type === 'spell' && typeof s.spell === 'string' && s.spell) {
    // Slots saved before spell names were cleaned up held "17 mp) name".
    const spell = spellName(s.spell) || s.spell;
    const label = spellName(String(s.label || spell)) || spell;
    return { type: 'spell', spell, label, aim: s.aim === 'self' ? 'self' : 'target' };
  }
  if (s?.type === 'cmd' && typeof s.cmd === 'string' && s.cmd) return { type: 'cmd', cmd: s.cmd, label: String(s.label || s.cmd) };
  return null;
}

function clamp(v) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
