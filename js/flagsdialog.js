// A player's flags, for gods: what they have (each with Remove), and a box
// to give one. Flags are how quests remember progress (see dialogue.js);
// this is for testing them. Opened from a player's click menu.

import { flagsCommand, flagAdd, flagRemove } from './god.js';

// Flags every player has that aren't quest flags: shown, but greyed.
const EVERYDAY = /^(no)?(hunger|thirst)$/i;

export class FlagsDialog {
  constructor(el, { send }) {
    this.el = el;
    this.send = send;
    this.id = null;
    this.list = el.querySelector('.fl-list');
    this.input = el.querySelector('.fl-new');
    el.querySelector('[data-fl="close"]').addEventListener('click', () => this.close());
    el.querySelector('.fl-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const flag = this.input.value.trim().replace(/[^A-Za-z0-9_]/g, '_');
      if (flag && this.id != null) this.send(flagAdd(this.id, flag));
      this.input.value = '';
    });
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-flag]');
      if (b && this.id != null) this.send(flagRemove(this.id, b.dataset.flag));
    });
  }

  get open() {
    return !this.el.hidden;
  }

  edit(id, name) {
    this.id = id;
    this.el.querySelector('.de-title').textContent = `Flags: ${name}`;
    this.list.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Loading…' }));
    this.el.hidden = false;
    this.send(flagsCommand(id), { quiet: true });
    this.input.focus();
  }

  loaded({ id, name, flags }) {
    if (!this.open || id !== this.id) return;
    if (!name) {
      this.list.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: "That player isn't here any more." }));
      return;
    }
    this.el.querySelector('.de-title').textContent = `Flags: ${name}`;
    if (!flags.length) {
      this.list.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No flags.' }));
      return;
    }
    this.list.replaceChildren(...[...flags].sort((a, b) => EVERYDAY.test(a) - EVERYDAY.test(b) || a.localeCompare(b)).map((f) => {
      const row = document.createElement('div');
      row.className = `de-row fl-row${EVERYDAY.test(f) ? ' fl-everyday' : ''}`;
      const code = document.createElement('code');
      code.textContent = f;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Remove';
      b.dataset.flag = f;
      row.append(code, b);
      return row;
    }));
  }

  close() {
    this.el.hidden = true;
  }
}
