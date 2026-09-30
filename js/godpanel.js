// The God tab: quick access to the server's god commands for placing
// things where you stand (items, mobs, props, storage, signs, merchants,
// ground tiles), a merchant's wares, teleporting, hiding, and saving the
// map. Shown only to gods (see god.js). The commands are the server's
// own; this panel just builds them.

import { place, SAVE_MAP, listCommand, search, teleport, wizinvis, addWare, removeWare, SAVED_KINDS } from './god.js';

const KINDS = [
  ['item', 'Item'], ['mob', 'Mob'], ['prop', 'Prop'], ['storage', 'Storage'],
  ['sign', 'Sign'], ['merchant', 'Merchant'], ['tile', 'Tile'],
];
const LISTED = { item: 'items', mob: 'mobs', prop: 'props' };
const SHOWN = 150; // list rows shown at once; searching narrows the rest

export class GodPanel {
  // tab: the #tab-god panel. opts: send(cmd) runs a command; note(text)
  // prints a line to the log; tileSheet() is the map SpriteSheet or null;
  // itemArt() is { sheet, index } for items drawn by name, or null.
  // onFloat(out) is told when the panel pops out into its own window (so
  // the tab can hide) or docks back.
  constructor(tab, { send, note, tileSheet, itemArt, onFloat }) {
    this.tab = tab;
    this.onFloat = onFloat;
    this.floating = null; // the floating window, while popped out
    this.send = send;
    this.note = note;
    this.tileSheet = tileSheet;
    this.itemArt = itemArt;
    this.lists = { items: null, mobs: null, props: null };
    this.requested = new Set();
    this.kind = 'item';
    this.chosen = { item: null, mob: null, prop: null, tile: null };
    this.unsaved = 0;
    this.pos = null;
    this.merchant = null;
    this.build();
  }

  build() {
    const h = (tag, props = {}, ...kids) => {
      const el = document.createElement(tag);
      Object.assign(el, props);
      el.append(...kids.filter((k) => k != null));
      return el;
    };
    this.$ = {};
    const $ = this.$;

    $.where = h('span', { className: 'god-where' });
    $.unsaved = h('span', { className: 'god-unsaved' });
    $.save = h('button', { type: 'button', className: 'primary', textContent: 'Save map', title: 'Keep placed mobs, props, signs, merchants and tiles after a restart' });
    $.save.addEventListener('click', () => {
      this.run(SAVE_MAP);
      this.unsaved = 0;
      this.renderUnsaved();
      this.note('Map saved: mobs, props, signs, merchants and tiles are kept.');
    });
    $.pop = h('button', { type: 'button', className: 'ghost god-pop', textContent: '⇱', title: 'Pop out into its own window' });
    $.pop.addEventListener('click', () => (this.floating ? this.dock() : this.popOut()));
    const head = h('div', { className: 'god-head' }, $.where, $.unsaved, $.save, $.pop);

    $.kinds = h('div', { className: 'god-kinds', role: 'radiogroup', ariaLabel: 'What to place' });
    for (const [k, label] of KINDS) {
      const b = h('button', { type: 'button', textContent: label, role: 'radio' });
      b.dataset.kind = k;
      b.addEventListener('click', () => this.setKind(k));
      $.kinds.append(b);
    }

    // Lists (items, mobs, props): search, rows, and a Place button.
    $.search = h('input', { type: 'search', placeholder: 'Search…', autocomplete: 'off', spellcheck: false, className: 'god-search' });
    $.search.addEventListener('input', () => this.renderList());
    $.level = h('input', { type: 'number', min: 1, max: 999, placeholder: 'level', className: 'god-level', title: 'Mob level (optional)' });
    $.list = h('ul', { className: 'god-list', role: 'listbox' });
    $.list.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-name]');
      if (!li) return;
      this.chosen[this.kind] = li.dataset.name;
      this.renderList();
      this.renderChoice();
    });
    $.list.addEventListener('dblclick', (e) => {
      const li = e.target.closest('li[data-name]');
      if (li) { this.chosen[this.kind] = li.dataset.name; this.placeChosen(); }
    });
    $.listNote = h('p', { className: 'empty' });
    $.listBox = h('div', { className: 'god-listbox' }, h('div', { className: 'god-row' }, $.search, $.level), $.list, $.listNote);

    // Sign, merchant and storage: a text box or two.
    $.text = h('input', { type: 'text', autocomplete: 'off', className: 'god-text' });
    $.storageKind = h('select', { className: 'god-select' }, new Option('Barrel (20 items)', 'barrel'), new Option('Chest (40 items)', 'chest'));
    $.storageKind.addEventListener('change', () => this.renderChoice());
    $.textBox = h('div', { className: 'god-row' }, $.storageKind, $.text);

    // Tiles: a palette of the map's tiles.
    $.tiles = h('div', { className: 'god-tiles' });
    $.tiles.addEventListener('click', (e) => {
      const c = e.target.closest('canvas[data-tile]');
      if (!c) return;
      this.chosen.tile = Number(c.dataset.tile);
      for (const t of $.tiles.querySelectorAll('canvas')) t.classList.toggle('chosen', t === c);
      this.renderChoice();
    });

    $.preview = h('canvas', { width: 48, height: 48, className: 'god-preview' });
    $.choice = h('span', { className: 'god-choice' });
    $.place = h('button', { type: 'button', className: 'primary', textContent: 'Place here' });
    $.place.addEventListener('click', () => this.placeChosen());
    const placeRow = h('div', { className: 'god-place' }, $.preview, $.choice, $.place);

    // The merchant you stand on: its wares, and adding more.
    $.merchName = h('strong');
    $.wares = h('ul', { className: 'rows god-wares' });
    $.wares.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-ware]');
      if (b) this.run(removeWare(b.dataset.ware), 'ware');
    });
    $.wareName = h('input', { type: 'text', placeholder: 'item to sell', autocomplete: 'off', className: 'god-text' });
    $.wareName.setAttribute('list', 'god-items');
    $.itemsList = h('datalist', { id: 'god-items' });
    $.wareAdd = h('button', { type: 'button', textContent: 'Add' });
    $.wareAdd.addEventListener('click', () => {
      const name = $.wareName.value.trim();
      if (name) { this.run(addWare(name), 'ware'); $.wareName.value = ''; }
    });
    $.merchant = h('section', { className: 'god-sec', hidden: true },
      h('h4', { className: 'list-head' }, 'Merchant here: ', $.merchName), $.wares,
      h('div', { className: 'god-row' }, $.wareName, $.wareAdd), $.itemsList);

    // Tools.
    $.tx = h('input', { type: 'number', placeholder: 'x', className: 'god-num' });
    $.ty = h('input', { type: 'number', placeholder: 'y', className: 'god-num' });
    $.go = h('button', { type: 'button', textContent: 'Teleport' });
    $.go.addEventListener('click', () => {
      if ($.tx.value !== '' && $.ty.value !== '') this.run(teleport($.tx.value, $.ty.value));
    });
    $.show = h('button', { type: 'button', textContent: 'Visible' });
    $.hide = h('button', { type: 'button', textContent: 'Hidden' });
    $.show.addEventListener('click', () => this.run(wizinvis(false)));
    $.hide.addEventListener('click', () => this.run(wizinvis(true)));
    const tools = h('section', { className: 'god-sec' },
      h('h4', { className: 'list-head' }, 'Tools'),
      h('div', { className: 'god-row' }, $.tx, $.ty, $.go),
      h('div', { className: 'god-row' }, h('span', { className: 'god-label', textContent: 'To players you are' }), $.show, $.hide));

    const hint = h('p', { className: 'god-hint', textContent:
      'Things are placed on your square. Click something on the map for Remove. ' +
      'Save map keeps mobs, props, signs, merchants and tiles after a restart; items on the ground are never kept, and storage keeps itself.' });

    this.root = h('div', { className: 'god-root' }, head, $.kinds, $.listBox, $.textBox, $.tiles, placeRow, $.merchant, tools, hint);
    this.tab.replaceChildren(this.root);
    this.setKind('item');
    this.renderUnsaved();
  }

  // Pops the panel out into a window of its own, which is dragged by its
  // title bar and remembers where it was.
  popOut() {
    if (this.floating) return;
    const win = document.createElement('section');
    win.className = 'god-float card';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'God tools');
    const bar = document.createElement('div');
    bar.className = 'god-float-bar';
    const title = document.createElement('span');
    title.textContent = 'God';
    const dock = document.createElement('button');
    dock.type = 'button';
    dock.className = 'ghost';
    dock.textContent = 'Dock';
    dock.title = 'Put back with the other tabs';
    dock.addEventListener('click', () => this.dock());
    bar.append(title, dock);
    win.append(bar, this.root);
    document.body.append(win);
    const saved = readPos();
    placeWindow(win, saved?.x ?? window.innerWidth - win.offsetWidth - 24, saved?.y ?? 80);
    dragBy(bar, win);
    this.floating = win;
    this.$.pop.textContent = '⇲';
    this.$.pop.title = 'Dock back with the other tabs';
    this.onFloat?.(true);
    this.opened();
  }

  dock() {
    if (!this.floating) return;
    this.tab.replaceChildren(this.root);
    this.floating.remove();
    this.floating = null;
    this.$.pop.textContent = '⇱';
    this.$.pop.title = 'Pop out into its own window';
    this.onFloat?.(false);
  }

  // Runs a command, counting what "Save map" would keep.
  run(cmd, kind) {
    this.send(cmd);
    if (SAVED_KINDS.has(kind)) {
      this.unsaved++;
      this.renderUnsaved();
    }
  }

  // Something removed from the map by the click menu.
  removed() {
    this.unsaved++;
    this.renderUnsaved();
  }

  // Called when the tab is shown: fetch the name lists the first time.
  opened() {
    for (const kind of ['items', 'mobs', 'props']) {
      if (this.lists[kind] || this.requested.has(kind)) continue;
      this.requested.add(kind);
      this.send(listCommand(kind), { quiet: true });
    }
  }

  // Whether a "Finished showing ..." reply is ours to hide.
  expecting(text) {
    const m = /^Finished showing (items|mobs|props)$/.exec(text.trim());
    return !!m && this.requested.has(m[1]);
  }

  setList(kind, names) {
    this.lists[kind] = names;
    if (kind === 'items') this.$.itemsList.replaceChildren(...names.map((n) => new Option(n)));
    if (LISTED[this.kind] === kind) this.renderList();
  }

  setPos(x, y) {
    this.pos = { x, y };
    this.$.where.textContent = `Placing at ${x}, ${y}`;
  }

  // The merchant on your square ({ name } or null), and its wares.
  setMerchant(ent, wares = []) {
    this.merchant = ent;
    this.$.merchant.hidden = !ent;
    if (!ent) return;
    this.$.merchName.textContent = ent.name.replace(/^(<[^>]*>)+/, '');
    this.$.wares.replaceChildren(...wares.map((w) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = w.name;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Remove';
      b.dataset.ware = w.name;
      li.append(name, b);
      return li;
    }));
  }

  setKind(kind) {
    this.kind = kind;
    const $ = this.$;
    for (const b of $.kinds.children) b.setAttribute('aria-checked', String(b.dataset.kind === kind));
    const listed = !!LISTED[kind];
    $.listBox.hidden = !listed;
    $.level.hidden = kind !== 'mob';
    $.textBox.hidden = !['sign', 'merchant', 'storage'].includes(kind);
    $.storageKind.hidden = kind !== 'storage';
    $.text.placeholder = { sign: 'What the sign says', merchant: 'Merchant name (optional)', storage: 'Label (optional), e.g. Guild' }[kind] ?? '';
    $.tiles.hidden = kind !== 'tile';
    if (kind === 'tile') this.renderTiles();
    if (listed) {
      $.search.value = '';
      this.renderList();
    }
    this.renderChoice();
  }

  renderList() {
    const kind = LISTED[this.kind];
    if (!kind) return;
    const names = this.lists[kind];
    const $ = this.$;
    if (!names) {
      $.list.replaceChildren();
      $.listNote.textContent = 'Loading the list from the server…';
      $.listNote.hidden = false;
      return;
    }
    const hits = search(names, $.search.value, SHOWN);
    const total = $.search.value.trim() ? search(names, $.search.value, Infinity).length : names.length;
    $.list.replaceChildren(...hits.map((n) => {
      const li = document.createElement('li');
      li.dataset.name = n;
      li.textContent = n;
      li.role = 'option';
      li.ariaSelected = String(this.chosen[this.kind] === n);
      return li;
    }));
    $.listNote.hidden = total <= SHOWN && total > 0;
    $.listNote.textContent = total === 0 ? 'Nothing matches.' : `Showing ${SHOWN} of ${total}; search to narrow it down.`;
  }

  renderTiles() {
    const sheet = this.tileSheet();
    const $ = this.$;
    if (!sheet || $.tiles.dataset.count === String(sheet.count)) return;
    $.tiles.dataset.count = String(sheet.count);
    const out = [];
    for (let i = 0; i < sheet.count; i++) {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      c.dataset.tile = String(i);
      c.title = `Tile ${i}`;
      sheet.draw(c.getContext('2d'), i, 0, 0, 32);
      if (i === this.chosen.tile) c.classList.add('chosen');
      out.push(c);
    }
    $.tiles.replaceChildren(...out);
  }

  renderChoice() {
    const $ = this.$;
    const k = this.kind;
    const ctx = $.preview.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    let label = '';
    if (LISTED[k]) label = this.chosen[k] ?? `Pick a ${k} from the list`;
    else if (k === 'tile') label = this.chosen.tile == null ? 'Pick a tile' : `Tile ${this.chosen.tile}`;
    else label = { sign: 'A sign', merchant: 'A merchant', storage: 'Shared storage' }[k];
    $.choice.textContent = label;
    // A picture where the client has one: items drawn by name, and tiles.
    const art = this.itemArt();
    const i = k === 'item' && this.chosen.item != null ? art?.index.get(this.chosen.item.toLowerCase()) : undefined;
    if (i !== undefined) art.sheet.draw(ctx, i, 0, 0, 48);
    else if (k === 'tile' && this.chosen.tile != null) this.tileSheet()?.draw(ctx, this.chosen.tile, 0, 0, 48);
    else if (k === 'storage' && art) {
      const s = art.index.get(`storage ${$.storageKind.value}`);
      if (s !== undefined) art.sheet.draw(ctx, s, 0, 0, 48);
    }
    $.preview.hidden = false;
  }

  placeChosen() {
    const k = this.kind;
    const $ = this.$;
    const at = this.pos ? ` at ${this.pos.x}, ${this.pos.y}` : '';
    let cmd = null;
    let what = '';
    if (LISTED[k]) {
      const name = this.chosen[k];
      if (!name) return this.note(`Pick a ${k} from the list first.`);
      cmd = k === 'mob' ? place.mob(name, $.level.value) : place[k](name);
      what = name;
    } else if (k === 'tile') {
      if (this.chosen.tile == null) return this.note('Pick a tile first.');
      cmd = place.tile(this.chosen.tile);
      what = `tile ${this.chosen.tile}`;
    } else if (k === 'sign') {
      const t = $.text.value.trim();
      if (!t) return this.note('Write what the sign says first.');
      cmd = place.sign(t);
      what = 'a sign';
    } else if (k === 'merchant') {
      cmd = place.merchant($.text.value.trim());
      what = 'a merchant';
    } else if (k === 'storage') {
      cmd = place.storage($.storageKind.value, $.text.value.trim());
      what = `a ${$.storageKind.value}`;
    }
    this.run(cmd, k);
    // The server says nothing when placing works, so say it here.
    if (k !== 'storage') this.note(`Placed ${what}${at}.`);
  }

  renderUnsaved() {
    const n = this.unsaved;
    this.$.unsaved.textContent = n ? `${n} unsaved change${n === 1 ? '' : 's'}` : 'All saved';
    this.$.unsaved.classList.toggle('dirty', n > 0);
  }
}

// ---- the floating window's position ----

const POS_KEY = 'dusk.godfloat';

function readPos() {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY));
  } catch {
    return null;
  }
}

// Keeps the window on screen.
function placeWindow(win, x, y) {
  const maxX = Math.max(0, window.innerWidth - win.offsetWidth - 8);
  const maxY = Math.max(0, window.innerHeight - 40);
  win.style.left = `${Math.min(Math.max(8, x), maxX)}px`;
  win.style.top = `${Math.min(Math.max(8, y), maxY)}px`;
}

function dragBy(handle, win) {
  let press = null;
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    press = { id: e.pointerId, dx: e.clientX - win.offsetLeft, dy: e.clientY - win.offsetTop };
    try { handle.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });
  handle.addEventListener('pointermove', (e) => {
    if (press?.id === e.pointerId) placeWindow(win, e.clientX - press.dx, e.clientY - press.dy);
  });
  const end = (e) => {
    if (press?.id !== e.pointerId) return;
    press = null;
    try { localStorage.setItem(POS_KEY, JSON.stringify({ x: win.offsetLeft, y: win.offsetTop })); } catch {}
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}
