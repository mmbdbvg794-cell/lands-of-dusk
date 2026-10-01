// The quest journal's entries, for gods: one per flag, with the title and
// text players with that flag see in their Journal (server/Social.java).

import { JOURNAL_ALL, journalSet, journalRemove } from './social.js';

export class JournalEditor {
  // el: the #journal-editor dialog; send(cmd) sends quietly.
  constructor(el, { send }) {
    this.el = el;
    this.send = send;
    this.entries = [];
    this.list = el.querySelector('.je-list');
    this.form = el.querySelector('.je-form');
    el.querySelector('[data-je="close"]').addEventListener('click', () => this.close());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = (c) => this.form.querySelector(c);
      const entry = { flag: f('.je-flag').value.trim(), title: f('.je-title').value.trim(), text: f('.je-text').value.trim(), done: f('.je-done').checked };
      if (!/^[A-Za-z0-9_]{1,40}$/.test(entry.flag) || !entry.title) return;
      this.send(journalSet(entry));
      this.form.reset();
      setTimeout(() => this.load(), 400);
    });
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-je-flag]');
      if (!b) return;
      const entry = this.entries.find((x) => x.flag === b.dataset.jeFlag);
      if (!entry) return;
      if (b.dataset.act === 'remove') {
        if (window.confirm(`Remove the journal entry for ${entry.flag}?`)) {
          this.send(journalRemove(entry.flag));
          setTimeout(() => this.load(), 400);
        }
        return;
      }
      const f = (c) => this.form.querySelector(c);
      f('.je-flag').value = entry.flag;
      f('.je-title').value = entry.title;
      f('.je-text').value = entry.text;
      f('.je-done').checked = entry.done;
      f('.je-title').focus();
    });
  }

  get open() {
    return !this.el.hidden;
  }

  show() {
    this.el.hidden = false;
    this.list.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Loading…' }));
    this.load();
  }

  close() {
    this.el.hidden = true;
  }

  load() {
    this.send(JOURNAL_ALL);
  }

  loaded(entries) {
    this.entries = entries;
    if (!entries.length) {
      this.list.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No entries yet.' }));
      return;
    }
    this.list.replaceChildren(...entries.map((e) => {
      const div = document.createElement('div');
      div.className = 'je-entry';
      const head = document.createElement('div');
      head.append(Object.assign(document.createElement('code'), { textContent: e.flag }), ' ', Object.assign(document.createElement('strong'), { textContent: e.title }), e.done ? ' (finishes it)' : '');
      const acts = document.createElement('div');
      acts.className = 'je-acts';
      for (const [label, act] of [['Edit', 'edit'], ['Remove', 'remove']]) {
        const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label, className: act === 'remove' ? 'ghost' : '' });
        b.dataset.jeFlag = e.flag;
        b.dataset.act = act;
        acts.append(b);
      }
      div.append(head, acts, Object.assign(document.createElement('div'), { className: 'muted', textContent: e.text }));
      return div;
    }));
  }
}
