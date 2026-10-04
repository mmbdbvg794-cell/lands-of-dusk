// The God tab's editor for the game's definitions: a monster's, prop's
// or item's file as a form (js/library.js), to change what's there or make
// a new one. Saving changes every placed copy at once (server/Library.js).

import { FIELDS, parseDef, writeDef, libGet, libSet, libNew } from './library.js';
import { place } from './god.js';

const KIND_WORDS = { mob: 'monster', prop: 'prop', item: 'item' };
const TITLES = { mob: 'Monsters', prop: 'Props', item: 'Items' };
const SHOWN = 300; // names listed at once; searching narrows the rest
const LISTS = { mob: 'mobs', prop: 'props', item: 'items' };

export class LibraryEditor {
  // el: the #library-editor dialog. send(cmd) sends quietly; run(cmd) as
  // typed; lists(): the God tab's name lists; sprites(): the sprite sheet
  // for pictures; note(text): a line in the chat.
  constructor(el, { send, run, lists, fetchLists, sprites, note }) {
    Object.assign(this, { el, send, run, lists, fetchLists, sprites, note });
    this.kind = 'mob';
    this.name = null;
    this.def = null;
    this.body = el.querySelector('.le-body');
    this.kindSel = el.querySelector('.le-kind');
    this.nameBox = el.querySelector('.le-name');
    this.status = el.querySelector('.le-status');
    el.querySelector('[data-le="close"]').addEventListener('click', () => this.close());
    this.search = el.querySelector('.le-search');
    this.namesBox = el.querySelector('.le-names');
    this.search.addEventListener('input', () => this.fillNames());
    this.namesBox.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-name]');
      if (b) this.load(this.kindSel.value, b.dataset.name);
    });
    el.querySelector('[data-le="new"]').addEventListener('click', () => this.makeNew());
    el.querySelector('[data-le="save"]').addEventListener('click', () => this.save());
    el.querySelector('[data-le="place"]').addEventListener('click', () => {
      if (this.name && this.kind !== 'item') this.run(this.kind === 'mob' ? place.mob(this.name) : place.prop(this.name));
      else if (this.name) this.run(place.item(this.name));
    });
  }

  get open() {
    return !this.el.hidden;
  }

  // Opens the editor for one kind: its list on the left, and a form.
  show(kind = this.kind, name = '') {
    this.el.hidden = false;
    if (kind !== this.kindSel.value || !this.def || this.kind !== kind) {
      this.def = null;
      this.name = null;
      this.body.replaceChildren();
      this.el.querySelector('[data-le="save"]').disabled = true;
      this.el.querySelector('[data-le="place"]').hidden = true;
    }
    this.kindSel.value = kind;
    this.kind = kind;
    this.el.querySelector('.de-title').textContent = TITLES[kind];
    this.el.querySelector('[data-le="new"]').textContent = `New ${KIND_WORDS[kind]}…`;
    this.search.value = '';
    this.fillNames();
    if (name) this.load(kind, name);
    else if (!this.def) this.say(`Pick a ${KIND_WORDS[kind]} from the list to change it, or make a new one. Saving changes every one of them in the game.`);
  }

  close() {
    this.el.hidden = true;
  }

  say(text) {
    this.status.textContent = text ?? '';
  }

  fillNames() {
    const kind = this.kindSel.value;
    const names = this.lists()?.[LISTS[kind]];
    if (!names) {
      this.fetchLists?.();
      this.namesBox.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Loading…' }));
      return;
    }
    const q = this.search.value.trim().toLowerCase();
    const hits = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
    const rows = hits.slice(0, SHOWN).map((n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `le-pick${this.name && n.toLowerCase() === this.name.toLowerCase() ? ' current' : ''}`;
      b.dataset.name = n;
      b.textContent = n;
      return b;
    });
    if (hits.length > SHOWN) rows.push(Object.assign(document.createElement('p'), { className: 'empty', textContent: `…and ${hits.length - SHOWN} more: search to narrow it down.` }));
    if (!hits.length) rows.push(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'None match.' }));
    this.namesBox.replaceChildren(...rows);
  }

  load(kind, name) {
    if (!name) return;
    this.kind = kind;
    this.say(`Opening ${name}…`);
    this.send(libGet(kind, name));
  }

  makeNew() {
    const kind = this.kindSel.value;
    let name = window.prompt(`Name for the new ${KIND_WORDS[kind]}:${this.def && this.kind === kind ? `\n(it starts as a copy of ${this.name}; clear the copy below to start blank)` : ''}`);
    if (!name?.trim()) return;
    name = name.trim();
    // Item names are lower case (the server lowercases them as it loads).
    if (kind === 'item') name = name.toLowerCase();
    const template = this.def && this.kind === kind && window.confirm(`Start "${name}" as a copy of ${this.name}?`) ? this.name : '';
    this.pendingNew = { kind, name };
    this.say(`Making ${name}…`);
    this.send(libNew(kind, name, template));
  }

  // The server's answers (parseLibReply).
  reply(r) {
    if (!this.open) return;
    if (r.saved) {
      if (this.pendingNew && this.pendingNew.name.toLowerCase() === r.name.toLowerCase()) {
        this.pendingNew = null;
        this.lists()?.[LISTS[r.kind]]?.push(r.name);
        this.load(r.kind, r.name);
        return;
      }
      this.say(`Saved ${r.name}.${r.updated ? ` ${r.updated} on the map changed with it.` : ''}`);
      return;
    }
    this.kind = r.kind;
    this.name = r.name;
    this.def = parseDef(r.kind, r.text);
    this.kindSel.value = r.kind;
    this.nameBox.value = r.name;
    this.render();
    this.fillNames();
    this.say(`Editing the ${KIND_WORDS[r.kind]} ${r.name}. Saving changes every one of them in the game.`);
  }

  // A server message that isn't ours but answers us ("There's no ...").
  failed(text) {
    if (this.open && /^(There's no|There's already|Names are|That didn't|Only gods|Usage: lib|That file)/.test(text)) {
      this.say(text);
      this.pendingNew = null;
      return true;
    }
    return false;
  }

  save() {
    if (!this.def) return;
    this.say('Saving…');
    this.send(libSet(this.kind, this.name, writeDef(this.kind, this.def)));
  }

  render() {
    const d = this.def;
    const h = (tag, props = {}, ...kids) => {
      const e = document.createElement(tag);
      Object.assign(e, props);
      e.append(...kids.filter((k) => k != null));
      return e;
    };
    const rows = [];
    for (const [key, label, type] of FIELDS[this.kind]) {
      let input;
      if (type === 'flag') {
        input = h('input', { type: 'checkbox', checked: !!d.fields[key] });
        input.addEventListener('change', () => { d.fields[key] = input.checked; });
        rows.push(h('label', { className: 'toggle le-row' }, input, ` ${label}`));
        continue;
      }
      if (Array.isArray(type)) {
        input = h('select', {}, ...type.map((v) => new Option(v || '(none)', v, false, (d.fields[key] ?? '') === v)));
        input.addEventListener('change', () => { d.fields[key] = input.value; });
      } else if (type === 'long') {
        input = h('textarea', { rows: 2, value: d.fields[key] ?? '' });
        input.addEventListener('input', () => { d.fields[key] = input.value; });
      } else {
        input = h('input', { type: type === 'number' || type === 'image' ? 'number' : 'text', value: d.fields[key] ?? '', autocomplete: 'off' });
        if (type === 'item') input.setAttribute('list', 'de-items');
        input.addEventListener('input', () => { d.fields[key] = input.value; if (type === 'image') this.drawPicture(pic, input.value); });
      }
      let pic = null;
      if (type === 'image') {
        pic = h('canvas', { width: 48, height: 48, className: 'le-pic' });
        const step = (n) => () => { input.value = String(Math.max(0, (Number(input.value) || 0) + n)); d.fields[key] = input.value; this.drawPicture(pic, input.value); };
        const prev = h('button', { type: 'button', className: 'ghost', textContent: '◀', title: 'Previous picture' });
        const next = h('button', { type: 'button', className: 'ghost', textContent: '▶', title: 'Next picture' });
        prev.addEventListener('click', step(-1));
        next.addEventListener('click', step(1));
        rows.push(h('div', { className: 'le-row' }, h('span', { className: 'le-label', textContent: label }), h('span', { className: 'le-picrow' }, prev, pic, next, input)));
        this.drawPicture(pic, input.value);
        continue;
      }
      const row = h('div', { className: 'le-row' }, h('span', { className: 'le-label', textContent: label }), input);
      row.dataset.key = key;
      rows.push(row);
    }
    const lists = [];
    if (this.kind === 'mob') {
      const listOf = (title, items, cols, make) => {
        const box = h('div', { className: 'le-list' }, h('h4', { className: 'list-head', textContent: title }));
        items.forEach((it, i) => {
          const row = h('div', { className: 'le-row' });
          for (const [field, placeholder, attrs] of cols) {
            // "list" can only be set as an attribute (the property is read-only).
            const { list, ...rest } = attrs ?? {};
            const inp = h('input', { type: 'text', value: it[field] ?? '', placeholder, autocomplete: 'off', ...rest });
            if (list) inp.setAttribute('list', list);
            inp.addEventListener('input', () => { it[field] = inp.value; });
            row.append(inp);
          }
          const x = h('button', { type: 'button', className: 'ghost', textContent: '✕' });
          x.addEventListener('click', () => { items.splice(i, 1); this.render(); });
          row.append(x);
          box.append(row);
        });
        const add = h('button', { type: 'button', className: 'small', textContent: `+ ${title.replace(/s$/, '')}` });
        add.addEventListener('click', () => { items.push(make()); this.render(); });
        box.append(add);
        return box;
      };
      lists.push(h('p', { className: 'de-hint', textContent: 'Drops: what it leaves when it\'s killed (chance 1 = always, .5 = half the time). Skills: Dodge and Double / Triple / Quadruple Attack are what fights use.' }));
      lists.push(listOf('Drops', d.drops, [['item', 'item name', { list: 'de-items' }], ['chance', 'chance 0 to 1, e.g. .5', { className: 'le-num' }]], () => ({ item: '', chance: '1' })));
      lists.push(listOf('Skills', d.skills, [['name', 'skill, e.g. Dodge'], ['level', '0 to 100', { className: 'le-num' }]], () => ({ name: '', level: '50' })));
    }
    // Drops and skills right after the stats, where they're seen.
    if (lists.length) {
      const at = rows.findIndex((r) => r.dataset?.key === 'bravery');
      rows.splice(at >= 0 ? at : rows.length, 0, ...lists);
      lists.length = 0;
    }
    const extra = h('textarea', { rows: 3, value: d.extra.join('\n'), className: 'le-extra' });
    extra.addEventListener('input', () => { d.extra = extra.value.split('\n'); });
    const items = h('datalist', { id: 'de-items' }, ...(this.lists()?.items ?? []).map((n) => new Option(n)));
    this.body.replaceChildren(
      ...rows, ...lists,
      h('h4', { className: 'list-head', textContent: 'Other settings (a key, then its value, a line each)' }), extra,
      items);
    this.el.querySelector('[data-le="place"]').hidden = false;
    this.el.querySelector('[data-le="save"]').disabled = false;
  }

  drawPicture(canvas, n) {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    const sheet = this.sprites();
    const i = Number(n);
    if (sheet && Number.isInteger(i) && i >= 0) sheet.draw(g, i, 0, 0, canvas.width);
  }
}
