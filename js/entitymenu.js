// The popup that opens when you click something on the map: one section
// per entity on that square, each with the actions from js/actions.js.
// It closes on a choice, Escape, a click elsewhere, or when everything it
// was showing has left the view.

import { entityActions } from './actions.js';

export class EntityMenu {
  // `send(cmd)` runs a command; `getMe()` returns { x, y, range }.
  constructor(el, send, getMe) {
    this.el = el;
    this.send = send;
    this.getMe = getMe;
    this.ents = [];

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-cmd]');
      if (!btn || btn.disabled) return;
      this.close();
      if (btn.dataset.shop) this.onShop?.();
      else if (btn.dataset.storage) this.onStorage?.(btn.dataset.storage, Number(btn.dataset.ent));
      else if (btn.dataset.sign) this.onSign?.(btn.dataset.sign, Number(btn.dataset.ent));
      else this.send(btn.dataset.cmd);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Up/Down move between choices rather than walking.
        e.preventDefault();
        e.stopPropagation();
        const btns = [...el.querySelectorAll('button:not(:disabled)')];
        const i = btns.indexOf(document.activeElement);
        btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length]?.focus();
      }
    });
    // Any press outside closes it; the map's own click handler then decides
    // whether that press opens a new menu.
    // A press on the map that closes the menu does only that, rather than
    // also walking there; see consumeDismiss().
    document.addEventListener('pointerdown', (e) => {
      if (this.el.hidden || this.el.contains(e.target)) return;
      this.close();
      this.dismissed = true;
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.el.hidden) this.close();
    });
  }

  // True once after a press outside closed the menu, so the map's click
  // handler can ignore that click.
  consumeDismiss() {
    const d = this.dismissed;
    this.dismissed = false;
    return d;
  }

  get open() {
    return !this.el.hidden;
  }

  // `ents` are the entities on the clicked square, `names` World's
  // display names, and (px, py) the click position inside the map area.
  show(ents, names, px, py, focus) {
    this.ents = ents;
    this.names = names;
    this.render();
    this.el.hidden = false;
    this.place(px, py);
    if (focus) this.el.querySelector('button:not(:disabled)')?.focus();
  }

  // Redraws after the world changes (a mob stepping into or out of range),
  // and closes once none of the entities is still there.
  refresh(world) {
    if (!this.open) return;
    this.ents = this.ents.map((e) => world.entities.get(e.id)).filter(Boolean);
    if (this.ents.length === 0) return this.close();
    this.names = world.displayNames();
    const focused = document.activeElement?.dataset?.cmd;
    this.render();
    if (focused) this.el.querySelector(`button[data-cmd="${CSS.escape(focused)}"]`)?.focus();
  }

  close() {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.ents = [];
    this.onClose?.();
  }

  render() {
    const me = this.getMe();
    this.el.replaceChildren(
      ...this.ents.map((ent) => {
        const sec = document.createElement('section');
        const h = document.createElement('h3');
        h.textContent = this.names.get(ent.id) ?? ent.name;
        if (ent.type === 0 || ent.type === 4) {
          const hp = document.createElement('span');
          hp.className = 'hp';
          hp.textContent = `${ent.hp}/${ent.maxhp}`;
          h.append(' ', hp);
        }
        sec.append(h);
        for (const act of entityActions(ent, me)) {
          const b = document.createElement('button');
          b.type = 'button';
          b.dataset.cmd = act.cmd ?? '';
          if (act.shop) b.dataset.shop = '1';
          if (act.sign) {
            b.dataset.sign = act.sign;
            b.dataset.ent = String(ent.id);
          }
          if (act.storage) {
            b.dataset.storage = act.storage;
            b.dataset.ent = String(ent.id);
          }
          b.disabled = !!act.disabled;
          b.textContent = act.label;
          if (act.hint) {
            const hint = document.createElement('span');
            hint.className = 'hint';
            hint.textContent = act.hint;
            b.append(' ', hint);
          }
          sec.append(b);
        }
        return sec;
      }),
    );
  }

  // Next to the click, kept inside the map area.
  place(px, py) {
    const box = this.el.parentElement.getBoundingClientRect();
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const gap = 8;
    let x = px + gap;
    let y = py + gap;
    if (x + w > box.width - gap) x = px - w - gap;
    if (y + h > box.height - gap) y = box.height - h - gap;
    this.el.style.left = `${Math.max(gap, x)}px`;
    this.el.style.top = `${Math.max(gap, y)}px`;
  }
}
