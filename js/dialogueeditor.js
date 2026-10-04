// The dialogue editor: shouts, and conversation stages with answers and
// what they do, for one NPC. Opened from the God tab or an NPC's click
// menu; saved as the NPC's talk script (js/dialogue.js turns it into one).

import { newDialogue, saveCommand, loadCommand, MAX_DEPTH, journalEntriesOf, fillJournal, VERBS } from './dialogue.js';
import { journalSet, JOURNAL_ALL } from './social.js';

const WHEN = [['always', 'Always'], ['flag', 'Player has flag'], ['noflag', "Player doesn't have flag"], ['item', 'Player carries item'], ['gold', 'Player has at least (gold)']];
const EFFECTS = [
  ['give', 'Give item'], ['take', 'Take item'], ['gold', 'Give gold'], ['takegold', 'Take gold'], ['exp', 'Give experience'],
  ['flag', 'Set flag'], ['unflag', 'Clear flag'], ['teleport', 'Teleport to'], ['bind', 'Set respawn point'],
];
const NEEDS = [['none', 'Needs nothing'], ['gold', 'Needs gold'], ['item', 'Needs item'], ['flag', 'Needs flag']];

export class DialogueEditor {
  // el: the #dialogue-editor dialog; send(cmd, opts) runs a command;
  // items(): item names for suggestions. A "Set flag" effect can carry its
  // quest journal entry too (server/Social.java): the journal is fetched
  // when the editor opens (journalLoaded) and saved with the dialogue.
  constructor(el, { send, items }) {
    this.el = el;
    this.send = send;
    this.items = items;
    this.journal = new Map(); // flag (lower case) -> { title, text, done }
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
    this.journalFilled = false;
    this.send(JOURNAL_ALL, { quiet: true });
    this.send(loadCommand(name), { quiet: true });
    // No answer (a server without the editor's part, or not restarted since
    // it was installed): say so rather than loading forever.
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.dlg || !this.open) return;
      this.body.replaceChildren(Object.assign(document.createElement('p'), {
        className: 'de-warn',
        textContent: "The server didn't answer. It may need restarting to use the dialogue editor (sudo systemctl restart duskserver).",
      }));
    }, 5000);
  }

  // The server's answer to the load (see parseDialogueReply).
  loaded({ name, dialogue, handWritten }) {
    if (!this.open || name.toLowerCase() !== this.name?.toLowerCase()) return;
    clearTimeout(this.timer);
    this.dlg = dialogue ?? newDialogue();
    this.el.querySelector('.de-warn').hidden = !handWritten;
    if (this.journal.size) { fillJournal(this.dlg, this.journal); this.journalFilled = true; }
    this.render();
  }

  close() {
    this.el.hidden = true;
  }

  // The journal's entries ([{ flag, title, text, done }]), from "journal all".
  journalLoaded(entries) {
    this.journal = new Map(entries.map((e) => [e.flag.toLowerCase(), e]));
    // Filled in once, when it arrives after the dialogue (never over edits).
    if (this.open && this.dlg && !this.journalFilled) {
      fillJournal(this.dlg, this.journal);
      this.journalFilled = true;
      this.render();
    }
  }

  save() {
    if (!this.dlg) return;
    this.send(saveCommand(this.name, this.dlg));
    // The journal entries written on its "Set flag" effects.
    for (const entry of journalEntriesOf(this.dlg)) this.send(journalSet(entry), { quiet: true });
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

    // A question's answers: each with its reply, what it needs, its
    // effects, and maybe a follow-up question with answers of its own.
    const renderAnswers = (node, depth) => node.answers.map((a, ai) => {
      const effects = a.effects.map((e, ei) => {
        const fields = [];
        if (e.kind === 'give' || e.kind === 'take') fields.push(input(e.item, 'item name', (v) => { e.item = v; }, { list: 'de-items' }));
        if (e.kind === 'gold' || e.kind === 'takegold' || e.kind === 'exp') fields.push(input(e.amount, 'amount', (v) => { e.amount = v; }, { type: 'number', min: 1, className: 'de-num' }));
        if (e.kind === 'flag' || e.kind === 'unflag') fields.push(input(e.flag, 'flag name', (v) => { e.flag = v; }));
        // Setting a flag can write the quest's journal entry for it.
        const journal = e.kind === 'flag'
          ? h('div', { className: 'de-row de-journal' },
            h('span', { className: 'de-label-text', textContent: '📖 Journal' }),
            input(e.journal?.title, 'Quest title (leave empty for none)', (v) => { (e.journal ??= {}).title = v; }, { className: 'de-jtitle' }),
            input(e.journal?.text, 'What the player should do next', (v) => { (e.journal ??= {}).text = v; }),
            h('label', { className: 'toggle de-jdone', title: 'The journal shows this quest as done' },
              (() => { const c = h('input', { type: 'checkbox', checked: !!e.journal?.done }); c.addEventListener('change', () => { (e.journal ??= {}).done = c.checked; }); return c; })(),
              ' finishes it'))
          : null;
        if (e.kind === 'teleport' || e.kind === 'bind') fields.push(input(e.x, 'x', (v) => { e.x = v; }, { type: 'number', className: 'de-num' }), input(e.y, 'y', (v) => { e.y = v; }, { type: 'number', className: 'de-num' }));
        const row = h('div', { className: 'de-row de-effect' },
          select(EFFECTS, e.kind, (v) => { a.effects[ei] = { kind: v }; again(); }), ...fields,
          button('✕', () => { a.effects.splice(ei, 1); again(); }, 'ghost de-x'));
        return journal ? h('div', { className: 'de-effect-group' }, row, journal) : row;
      });
      const need = a.needs ?? { kind: 'none', value: '' };
      const needValue = need.kind === 'none' ? null
        : input(need.value, need.kind === 'gold' ? 'gold' : need.kind === 'item' ? 'item name' : 'flag name', (v) => { a.needs.value = v; },
          need.kind === 'gold' ? { type: 'number', min: 1, className: 'de-num' } : need.kind === 'item' ? { list: 'de-items' } : {});
      const follow = a.next
        ? h('div', { className: 'de-follow' },
          h('div', { className: 'de-row' },
            h('span', { className: 'de-label-text', textContent: 'Then' }),
            select(VERBS, a.next.verb ?? 'says', (v) => { a.next.verb = v; }),
            area(a.next.says, 'A follow-up question', (v) => { a.next.says = v; }),
            button('✕', () => { delete a.next; again(); }, 'ghost de-x')),
          h('div', { className: 'de-answers' }, ...renderAnswers(a.next, depth + 1)),
          h('div', { className: 'de-row' }, button('+ Answer button', () => { a.next.answers.push({ label: '', reply: '', effects: [] }); again(); }, 'de-small')))
        : null;
      return h('div', { className: 'de-answer' },
        h('div', { className: 'de-row' },
          input(a.label, 'Button, e.g. Yes', (v) => { a.label = v; }, { className: 'de-label' }),
          select(VERBS, a.replyVerb ?? 'says', (v) => { a.replyVerb = v; }),
          input(a.reply, 'What they say back (empty: the answer just ends the talk)', (v) => { a.reply = v; }),
          button('✕', () => { node.answers.splice(ai, 1); again(); }, 'ghost de-x')),
        h('div', { className: 'de-row de-effect' },
          select(NEEDS, need.kind, (v) => { if (v === 'none') delete a.needs; else a.needs = { kind: v, value: '' }; again(); }), needValue),
        ...effects,
        follow,
        h('div', { className: 'de-row' },
          button('+ Effect', () => { a.effects.push({ kind: 'give' }); again(); }, 'de-small'),
          !a.next && depth + 1 < MAX_DEPTH ? button('+ Follow-up question', () => { a.next = { says: '', answers: [] }; again(); }, 'de-small') : null));
    });

    // Stages.
    const stages = d.stages.map((st, si) => {
      const valueBox = st.when.kind === 'always' ? null
        : input(st.when.value, st.when.kind === 'item' ? 'item name' : st.when.kind === 'gold' ? 'gold' : 'flag name, e.g. wolfquest', (v) => { st.when.value = v; },
          st.when.kind === 'item' ? { list: 'de-items' } : st.when.kind === 'gold' ? { type: 'number', min: 1, className: 'de-num' } : {});
      const answers = renderAnswers(st, 0);
      return h('section', { className: 'de-stage' },
        h('div', { className: 'de-row de-stage-head' },
          h('strong', { textContent: `Stage ${si + 1}` }),
          h('span', { className: 'de-grow' }),
          si > 0 ? button('↑', () => { d.stages.splice(si - 1, 0, d.stages.splice(si, 1)[0]); again(); }, 'ghost') : null,
          si < d.stages.length - 1 ? button('↓', () => { d.stages.splice(si + 1, 0, d.stages.splice(si, 1)[0]); again(); }, 'ghost') : null,
          d.stages.length > 1 ? button('✕', () => { d.stages.splice(si, 1); again(); }, 'ghost') : null),
        h('div', { className: 'de-row' }, h('span', { className: 'de-label-text', textContent: 'When' }), select(WHEN, st.when.kind, (v) => { st.when = { kind: v, value: '' }; again(); }), valueBox),
        h('div', { className: 'de-row' }, select(VERBS, st.verb ?? 'says', (v) => { st.verb = v; }), area(st.says, 'What they say (an Action shows just these words, e.g. "The guard looks you up and down.")', (v) => { st.says = v; })),
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
