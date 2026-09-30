// The dialogue editor: shouts, and conversation stages with answers and
// what they do, for one NPC. Opened from the God tab or an NPC's click
// menu; saved as the NPC's talk script (js/dialogue.js turns it into one).

import { newDialogue, saveCommand, loadCommand } from './dialogue.js';

const WHEN = [['always', 'Always'], ['flag', 'Player has flag'], ['noflag', "Player doesn't have flag"], ['item', 'Player carries item']];
const EFFECTS = [
  ['give', 'Give item'], ['take', 'Take item'], ['gold', 'Give gold'], ['exp', 'Give experience'],
  ['flag', 'Set flag'], ['unflag', 'Clear flag'], ['teleport', 'Teleport to'],
];

export class DialogueEditor {
  // el: the #dialogue-editor dialog; send(cmd, opts) runs a command;
  // items(): item names for suggestions.
  constructor(el, { send, items }) {
    this.el = el;
    this.send = send;
    this.items = items;
    this.name = null;
    this.dlg = null;
    this.body = el.querySelector('.de-body');
    el.querySelector('[data-de="close"]').addEventListener('click', () => this.close());
    el.querySelector('[data-de="cancel"]').addEventListener('click', () => this.close());
    el.querySelector('[data-de="save"]').addEventListener('click', () => this.save());
  }

  get open() {
    return !this.el.hidden;
  }

  // Opens for an NPC by name, and asks the server for its dialogue.
  edit(name) {
    this.name = name;
    this.dlg = null;
    this.el.querySelector('.de-title').textContent = `Dialogue: ${name}`;
    this.el.querySelector('.de-warn').hidden = true;
    this.body.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Loading…' }));
    this.el.hidden = false;
    this.send(loadCommand(name), { quiet: true });
  }

  // The server's answer to the load (see parseDialogueReply).
  loaded({ name, dialogue, handWritten }) {
    if (!this.open || name.toLowerCase() !== this.name?.toLowerCase()) return;
    this.dlg = dialogue ?? newDialogue();
    this.el.querySelector('.de-warn').hidden = !handWritten;
    this.render();
  }

  close() {
    this.el.hidden = true;
  }

  save() {
    if (!this.dlg) return;
    this.send(saveCommand(this.name, this.dlg));
    this.close();
  }

  render() {
    const d = this.dlg;
    const h = (tag, props = {}, ...kids) => {
      const e = document.createElement(tag);
      Object.assign(e, props);
      e.append(...kids.filter((k) => k != null));
      return e;
    };
    const input = (value, placeholder, onInput, { list, ...props } = {}) => {
      const i = h('input', { type: 'text', value: value ?? '', placeholder, autocomplete: 'off', ...props });
      if (list) i.setAttribute('list', list); // read-only as a property
      i.addEventListener('input', () => onInput(i.value));
      return i;
    };
    const area = (value, placeholder, onInput, rows = 2) => {
      const t = h('textarea', { value: value ?? '', placeholder, rows });
      t.addEventListener('input', () => onInput(t.value));
      return t;
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

    // Shouts.
    const shouts = h('section', { className: 'de-sec' },
      h('h4', { className: 'list-head', textContent: 'Shouts' }),
      h('p', { className: 'de-hint', textContent: 'What they call out when players come near (one line each, a random one each time). Leave empty for none.' }),
      area(d.shouts.join('\n'), 'Hey you! Come here!', (v) => { d.shouts = v.split('\n'); }, 2));

    // Stages.
    const stages = d.stages.map((st, si) => {
      const valueBox = st.when.kind === 'always' ? null : input(st.when.value, st.when.kind === 'item' ? 'item name' : 'flag name, e.g. wolfquest', (v) => { st.when.value = v; }, st.when.kind === 'item' ? { list: 'de-items' } : {});
      const answers = st.answers.map((a, ai) => {
        const effects = a.effects.map((e, ei) => {
          const fields = [];
          if (e.kind === 'give' || e.kind === 'take') fields.push(input(e.item, 'item name', (v) => { e.item = v; }, { list: 'de-items' }));
          if (e.kind === 'gold' || e.kind === 'exp') fields.push(input(e.amount, 'amount', (v) => { e.amount = v; }, { type: 'number', min: 1, className: 'de-num' }));
          if (e.kind === 'flag' || e.kind === 'unflag') fields.push(input(e.flag, 'flag name', (v) => { e.flag = v; }));
          if (e.kind === 'teleport') fields.push(input(e.x, 'x', (v) => { e.x = v; }, { type: 'number', className: 'de-num' }), input(e.y, 'y', (v) => { e.y = v; }, { type: 'number', className: 'de-num' }));
          return h('div', { className: 'de-row de-effect' },
            select(EFFECTS, e.kind, (v) => { a.effects[ei] = { kind: v }; again(); }), ...fields,
            button('✕', () => { a.effects.splice(ei, 1); again(); }, 'ghost de-x'));
        });
        return h('div', { className: 'de-answer' },
          h('div', { className: 'de-row' },
            input(a.label, 'Button, e.g. Yes', (v) => { a.label = v; }, { className: 'de-label' }),
            input(a.reply, 'What they say back', (v) => { a.reply = v; }),
            button('✕', () => { st.answers.splice(ai, 1); again(); }, 'ghost de-x')),
          ...effects,
          h('div', { className: 'de-row' }, button('+ Effect', () => { a.effects.push({ kind: 'give' }); again(); }, 'de-small')));
      });
      return h('section', { className: 'de-stage' },
        h('div', { className: 'de-row de-stage-head' },
          h('strong', { textContent: `Stage ${si + 1}` }),
          h('span', { className: 'de-grow' }),
          si > 0 ? button('↑', () => { d.stages.splice(si - 1, 0, d.stages.splice(si, 1)[0]); again(); }, 'ghost') : null,
          si < d.stages.length - 1 ? button('↓', () => { d.stages.splice(si + 1, 0, d.stages.splice(si, 1)[0]); again(); }, 'ghost') : null,
          d.stages.length > 1 ? button('✕', () => { d.stages.splice(si, 1); again(); }, 'ghost') : null),
        h('div', { className: 'de-row' }, h('span', { className: 'de-label-text', textContent: 'When' }), select(WHEN, st.when.kind, (v) => { st.when = { kind: v, value: '' }; again(); }), valueBox),
        h('div', { className: 'de-row' }, h('span', { className: 'de-label-text', textContent: 'Says' }), area(st.says, 'What they say', (v) => { st.says = v; })),
        h('div', { className: 'de-answers' }, ...answers),
        h('div', { className: 'de-row' }, button('+ Answer button', () => { st.answers.push({ label: '', reply: '', effects: [] }); again(); }, 'de-small')));
    });

    const itemsList = h('datalist', { id: 'de-items' }, ...(this.items() ?? []).map((n) => new Option(n)));
    this.body.replaceChildren(shouts,
      h('h4', { className: 'list-head', textContent: 'Conversation' }),
      h('p', { className: 'de-hint', textContent: 'Stages are checked from the top; the first whose "When" fits the player is used. Put "Always" last. Flags remember quest progress: set one with an effect, then check it in a stage above.' }),
      ...stages,
      h('div', { className: 'de-row' }, button('+ Stage', () => { d.stages.splice(Math.max(0, d.stages.length - 1), 0, { when: { kind: 'flag', value: '' }, says: '', answers: [] }); again(); })),
      itemsList);
  }
}
