// The tile editor: what happens when someone steps on the square you're
// standing on. Rules are checked in order and the first that fits is used;
// each can say something and do things (set flags, give items...).
// js/dialogue.js turns them into the square's walk-on script.

import { RACES, newRule, newWalk, tileSaveCommand, TILE_GET, VERBS, tileScriptCommand, TILE_SCRIPT_REPLACE } from './dialogue.js';
import { tileClear } from './god.js';

const WHEN = [['always', 'Always'], ['flag', 'Player has flag'], ['noflag', "Player doesn't have flag"], ['item', 'Player carries item'], ['gold', 'Player has at least (gold)'], ['race', 'Player is race'], ['norace', "Player isn't race"]];
const WALK = [['everyone', 'Everyone (as normal)'], ['flag', 'Only players with flag'], ['noflag', "Only players without flag"], ['race', 'Only players of race'], ['norace', 'Everyone but race'], ['raceorflag', 'Only players of race, or with flag'], ['nobody', 'Nobody']];
const EFFECTS = [
  ['flag', 'Set flag'], ['unflag', 'Clear flag'], ['give', 'Give item'], ['take', 'Take item'],
  ['gold', 'Give gold'], ['takegold', 'Take gold'], ['exp', 'Give experience'], ['teleport', 'Teleport to'], ['bind', 'Set respawn point'],
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

  loaded({ x, y, rules, walk, other, script }) {
    if (!this.open) return;
    clearTimeout(this.timer);
    this.el.querySelector('.de-title').textContent = `Tile action at ${x}, ${y}`;
    if (other) {
      this.rules = null;
      this.warn.hidden = true;
      this.showScript(script ?? "");
      return;
    }
    this.rules = rules.length ? rules : [newRule()];
    this.walk = walk ?? newWalk();
    this.render();
  }

  // A walk-on script written by hand (before the editor, or by hand since):
  // change its text, or set it aside and make a tile action instead.
  showScript(text) {
    const h = (tag, props = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; };
    const area = h('textarea', { value: text, rows: 12, spellcheck: false, className: 'te-script' });
    const save = h('button', { type: 'button', className: 'primary', textContent: 'Save script' });
    // When the check finds a problem: save it as it is anyway.
    this.forceSave = h('button', { type: 'button', className: 'ghost', textContent: 'Save anyway', hidden: true });
    this.forceSave.addEventListener('click', () => {
      this.forceSave.hidden = true;
      this.scriptStatus.textContent = 'Saving…';
      this.send(tileScriptCommand(area.value, true));
    });
    const replace = h('button', { type: 'button', textContent: 'Replace with a new tile action…' });
    this.scriptStatus = h('p', { className: 'de-hint' });
    save.addEventListener('click', () => {
      this.scriptStatus.textContent = 'Saving…';
      this.send(tileScriptCommand(area.value));
    });
    replace.addEventListener('click', () => {
      if (!window.confirm('Set this script aside (it is kept in backups/tilescripts) and make a new tile action here instead?')) return;
      this.scriptStatus.textContent = 'Setting it aside…';
      this.send(TILE_SCRIPT_REPLACE);
    });
    this.body.replaceChildren(
      h('p', { className: 'de-hint', textContent: "This square's walk-on script was written by hand (a teleport, a trap, a message...). Change it here and save (it's checked first, and the old one is backed up), or replace it with a tile action you can build in this editor." }),
      area,
      h('div', { className: 'de-row' }, save, this.forceSave, replace),
      this.scriptStatus);
    this.el.querySelector('[data-de="save"]').hidden = true;
  }

  // The server's answer to a script save or replace.
  scriptReply(r) {
    if (!this.open) return;
    if (r.done === 'replaced') {
      // Now an empty square for the editor.
      this.el.querySelector('[data-de="save"]').hidden = false;
      this.loaded({ x: r.x, y: r.y, rules: [], walk: newWalk(), other: false });
      return;
    }
    if (this.scriptStatus) this.scriptStatus.textContent = 'Saved. Step off and back on to try it.';
    if (this.forceSave) this.forceSave.hidden = true;
  }

  // A failure message for a script save, if it's ours.
  scriptFailed(text) {
    if (!this.open || !this.scriptStatus || !/^(That script has a problem|This square's action was made|Only gods can edit walk-on)/.test(text)) return false;
    this.scriptStatus.textContent = text + (/^That script has a problem/.test(text) ? " If you're sure it's right, Save anyway." : '');
    if (this.forceSave) this.forceSave.hidden = !/^That script has a problem/.test(text);
    return true;
  }

  close() {
    this.el.hidden = true;
    this.el.querySelector('[data-de="save"]').hidden = false;
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
      const raceWhen = r.when.kind === 'race' || r.when.kind === 'norace';
      const valueBox = r.when.kind === 'always' ? null
        : raceWhen ? select(RACES, RACES.some(([r]) => r === r.when.value) ? r.when.value : (r.when.value = 'human'), (v) => { r.when.value = v; })
        : input(r.when.value, r.when.kind === 'item' ? 'item name' : r.when.kind === 'gold' ? 'gold' : 'flag name, e.g. newplayertrain', (v) => { r.when.value = v; },
          r.when.kind === 'item' ? { list: 'te-items' } : r.when.kind === 'gold' ? { type: 'number', min: 1, className: 'de-num' } : {});
      const effects = r.effects.map((e, ei) => {
        const fields = [];
        if (e.kind === 'give' || e.kind === 'take') fields.push(input(e.item, 'item name', (v) => { e.item = v; }, { list: 'te-items' }));
        if (e.kind === 'gold' || e.kind === 'takegold' || e.kind === 'exp') fields.push(input(e.amount, 'amount', (v) => { e.amount = v; }, { type: 'number', min: 1, className: 'de-num' }));
        if (e.kind === 'flag' || e.kind === 'unflag') fields.push(input(e.flag, 'flag name', (v) => { e.flag = v; }));
        if (e.kind === 'teleport' || e.kind === 'bind') fields.push(input(e.x, 'x', (v) => { e.x = v; }, { type: 'number', className: 'de-num' }), input(e.y, 'y', (v) => { e.y = v; }, { type: 'number', className: 'de-num' }));
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
          select(VERBS, r.verb ?? 'says', (v) => { r.verb = v; }),
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
        w.kind === 'flag' || w.kind === 'noflag' ? input(w.flag, 'flag name, e.g. tutorial', (v) => { w.flag = v; }) : null,
        // A race is kept in the same field as a flag.
        w.kind === 'race' || w.kind === 'norace' ? select(RACES, RACES.some(([r]) => r === w.flag) ? w.flag : (w.flag = 'human'), (v) => { w.flag = v; }) : null,
        // Either will do: the race in .race, the flag in .flag.
        w.kind === 'raceorflag' ? select(RACES, RACES.some(([r]) => r === w.race) ? w.race : (w.race = 'elf'), (v) => { w.race = v; }) : null,
        w.kind === 'raceorflag' ? input(w.flag, 'or flag, e.g. aelindor_done', (v) => { w.flag = v; }) : null),
      w.kind === 'everyone' ? null : h('div', { className: 'de-row' }, h('span', { className: 'de-label-text', textContent: 'If not' }),
        input(w.speaker, 'Who says it (optional)', (v) => { w.speaker = v; }, { className: 'de-label' }),
        select(VERBS, w.verb ?? 'says', (v) => { w.verb = v; }),
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
