// The tile editor: what happens when someone steps on the square you're
// standing on. Rules are checked in order and the first that fits is used;
// each can say something and do things (set flags, give items...).
// js/dialogue.js turns them into the square's walk-on script.

import { newRule, newWalk, tileSaveCommand, TILE_GET } from './dialogue.js';
import { tileClear } from './god.js';

const WHEN = [['always', 'Always'], ['flag', 'Player has flag'], ['noflag', "Player doesn't have flag"], ['item', 'Player carries item'], ['gold', 'Player has at least (gold)']];
const WALK = [['everyone', 'Everyone (as normal)'], ['flag', 'Only players with flag'], ['noflag', "Only players without flag"], ['nobody', 'Nobody']];
const EFFECTS = [
  ['flag', 'Set flag'], ['unflag', 'Clear flag'], ['give', 'Give item'], ['take', 'Take item'],
  ['gold', 'Give gold'], ['takegold', 'Take gold'], ['exp', 'Give experience'], ['teleport', 'Teleport to'],
];

export class TileEditor {
  constructor(el, { send, items }) {
    this.el = el;
    this.send = send;
    this.items = items;
    this.rules = null;
    this.body = el.querySelector('.de-body');
    this.warn = el.querySelector('.de-warn');
    el.querySelector('[data-de="close"]').addEventListener('click', () => this.close());
    el.querySelector('[data-de="cancel"]').addEventListener('click', () => this.close());
    el.querySelector('[data-de="save"]').addEventListener('click', () => this.save());
    el.querySelector('[data-de="clear"]').addEventListener('click', () => { this.send(tileClear()); this.close(); });
  }

  get open() {
    return !this.el.hidden;
  }

  // Opens for the square you're on, and asks the server what's there.
  edit(x, y) {
    this.rules = null;
    this.el.querySelector('.de-title').textContent = `Tile action at ${x}, ${y}`;
    this.warn.hidden = true;
    this.body.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Loading…' }));
    this.el.hidden = false;
    this.send(TILE_GET, { quiet: true });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.rules || !this.open) return;
      this.warn.textContent = "The server didn't answer. It may need restarting to use the tile editor.";
      this.warn.hidden = false;
    }, 5000);
  }

  loaded({ x, y, rules, walk, other }) {
    if (!this.open) return;
    clearTimeout(this.timer);
    this.el.querySelector('.de-title').textContent = `Tile action at ${x}, ${y}`;
    if (other) {
      this.rules = null;
      this.warn.textContent = 'This square already has a walk-on script that the editor didn\'t make (a teleport, a healing square...). It\'s left alone: pick the square next to it.';
      this.warn.hidden = false;
      this.body.replaceChildren();
      return;
    }
    this.rules = rules.length ? rules : [newRule()];
    this.walk = walk ?? newWalk();
    this.render();
  }

  close() {
    this.el.hidden = true;
  }

  save() {
    if (!this.rules) return;
    this.send(tileSaveCommand({ rules: this.rules, walk: this.walk }));
    this.close();
  }

  render() {
    const h = (tag, props = {}, ...kids) => {
      const e = document.createElement(tag);
      Object.assign(e, props);
      e.append(...kids.filter((k) => k != null));
      return e;
    };
    const input = (value, placeholder, onInput, { list, ...props } = {}) => {
      const i = h('input', { type: 'text', value: value ?? '', placeholder, autocomplete: 'off', ...props });
      if (list) i.setAttribute('list', list);
      i.addEventListener('input', () => onInput(i.value));
      return i;
    };
    const select = (options, value, onChange) => {
      const s = h('select', {}, ...options.map(([v, label]) => new Option(label, v, false, v === value)));
      s.addEventListener('change', () => onChange(s.value));
      return s;
    };
    const button = (label, onClick, cls = '') => {
      const b = h('button', { type: 'button', textContent: label, className: cls });
      b.addEventListener('click', onClick);
      return b;
    };
    const again = () => this.render();
    const rules = this.rules.map((r, ri) => {
      const valueBox = r.when.kind === 'always' ? null
        : input(r.when.value, r.when.kind === 'item' ? 'item name' : r.when.kind === 'gold' ? 'gold' : 'flag name, e.g. newplayertrain', (v) => { r.when.value = v; },
          r.when.kind === 'item' ? { list: 'te-items' } : r.when.kind === 'gold' ? { type: 'number', min: 1, className: 'de-num' } : {});
      const effects = r.effects.map((e, ei) => {
        const fields = [];
        if (e.kind === 'give' || e.kind === 'take') fields.push(input(e.item, 'item name', (v) => { e.item = v; }, { list: 'te-items' }));
        if (e.kind === 'gold' || e.kind === 'takegold' || e.kind === 'exp') fields.push(input(e.amount, 'amount', (v) => { e.amount = v; }, { type: 'number', min: 1, className: 'de-num' }));
        if (e.kind === 'flag' || e.kind === 'unflag') fields.push(input(e.flag, 'flag name', (v) => { e.flag = v; }));
        if (e.kind === 'teleport') fields.push(input(e.x, 'x', (v) => { e.x = v; }, { type: 'number', className: 'de-num' }), input(e.y, 'y', (v) => { e.y = v; }, { type: 'number', className: 'de-num' }));
        return h('div', { className: 'de-row de-effect' },
          select(EFFECTS, e.kind, (v) => { r.effects[ei] = { kind: v }; again(); }), ...fields,
          button('✕', () => { r.effects.splice(ei, 1); again(); }, 'ghost de-x'));
      });
      return h('section', { className: 'de-stage' },
        h('div', { className: 'de-row de-stage-head' },
          h('strong', { textContent: `Rule ${ri + 1}` }), h('span', { className: 'de-grow' }),
          ri > 0 ? button('↑', () => { this.rules.splice(ri - 1, 0, this.rules.splice(ri, 1)[0]); again(); }, 'ghost') : null,
          ri < this.rules.length - 1 ? button('↓', () => { this.rules.splice(ri + 1, 0, this.rules.splice(ri, 1)[0]); again(); }, 'ghost') : null,
          this.rules.length > 1 ? button('✕', () => { this.rules.splice(ri, 1); again(); }, 'ghost') : null),
        h('div', { className: 'de-row' }, h('span', { className: 'de-label-text', textContent: 'When' }), select(WHEN, r.when.kind, (v) => { r.when = { kind: v, value: '' }; again(); }), valueBox),
        h('div', { className: 'de-row' }, h('span', { className: 'de-label-text', textContent: 'Message' }),
          input(r.speaker, 'Who says it (optional)', (v) => { r.speaker = v; }, { className: 'de-label' }),
          input(r.says, 'What they see (optional)', (v) => { r.says = v; })),
        ...effects,
        h('div', { className: 'de-row' }, button('+ Effect', () => { r.effects.push({ kind: 'flag' }); again(); }, 'de-small')));
    });
    // Who may step onto the square at all.
    const w = this.walk;
    const walk = h('section', { className: 'de-stage' },
      h('div', { className: 'de-row de-stage-head' }, h('strong', { textContent: 'Who can step onto this square' })),
      h('div', { className: 'de-row' },
        select(WALK, w.kind, (v) => { w.kind = v; again(); }),
        w.kind === 'flag' || w.kind === 'noflag' ? input(w.flag, 'flag name, e.g. tutorial', (v) => { w.flag = v; }) : null),
      w.kind === 'everyone' ? null : h('div', { className: 'de-row' }, h('span', { className: 'de-label-text', textContent: 'If not' }),
        input(w.speaker, 'Who says it (optional)', (v) => { w.speaker = v; }, { className: 'de-label' }),
        input(w.says, 'What they\'re told, e.g. Talk to the Recruiter first.', (v) => { w.says = v; })),
      w.kind === 'everyone' ? null : h('p', { className: 'de-hint', textContent: 'Gods walk anywhere, so try this as a player.' }));
    this.body.replaceChildren(
      walk,
      h('h4', { className: 'list-head', textContent: 'When someone steps here' }),
      h('p', { className: 'de-hint', textContent: 'Runs every time someone steps on this square. Rules are checked from the top; the first whose "When" fits is used, so put "Always" last. Tip: set a flag here (e.g. newplayertrain) for an NPC stage further on to check.' }),
      ...rules,
      h('div', { className: 'de-row' }, button('+ Rule', () => { this.rules.splice(Math.max(0, this.rules.length - (this.rules.at(-1)?.when.kind === 'always' ? 1 : 0)), 0, { ...newRule(), when: { kind: 'noflag', value: '' } }); again(); })),
      h('datalist', { id: 'te-items' }, ...(this.items() ?? []).map((n) => new Option(n))));
  }
}
