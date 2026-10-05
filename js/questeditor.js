// The God tab's quest wizard: a quest made in one place (js/quests.js),
// written into its NPCs' conversations, the journal and the server's kill
// goals in one go; and, for each quest, who is on which step.

import { newQuest, newStep, questProblems, questJournal, questNpcs, mergeQuest, stripQuest, questSave, questGet, questRemove, questWho, QUEST_LIST, tidyQuest, describeFlag, cleanQuestId } from './quests.js';
import { loadCommand, saveCommand, tidyDialogue } from './dialogue.js';
import { journalSet, journalRemove } from './social.js';

const STEP_KINDS = [['talk', 'Talk to someone'], ['bring', 'Bring an item to someone'], ['kill', 'Kill monsters']];
const WAIT_MS = 8000;

export class QuestEditor {
  // el: the #quest-editor dialog. send(cmd) sends quietly; lists(): the
  // God tab's name lists (mobs, items, props), for suggestions.
  constructor(el, { send, lists, fetchLists }) {
    Object.assign(this, { el, send, lists, fetchLists });
    this.quests = []; // [{ id, title }]
    this.quest = null; // the one being edited
    this.saved = null; // as it was last saved (to know whose talk to tidy)
    this.waiting = null; // { name, resolve } for a dialogue on its way
    this.busy = false;
    this.listBox = el.querySelector('.qe-list');
    this.body = el.querySelector('.qe-body');
    this.status = el.querySelector('.qe-status');
    el.querySelector('[data-qe="close"]').addEventListener('click', () => this.close());
    el.querySelector('[data-qe="new"]').addEventListener('click', () => this.makeNew());
    this.listBox.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-quest]');
      if (b && !this.busy) { this.say(`Opening ${b.dataset.quest}…`); this.send(questGet(b.dataset.quest)); }
    });
  }

  get open() {
    return !this.el.hidden;
  }

  show() {
    this.el.hidden = false;
    if (!this.lists()?.mobs) this.fetchLists?.();
    this.refreshList();
    if (!this.quest) this.say('Pick a quest to change it or see who is on it, or make a new one.');
  }

  close() {
    this.el.hidden = true;
  }

  say(text) {
    this.status.textContent = text ?? '';
  }

  refreshList() {
    this.listing = [];
    this.send(QUEST_LIST);
  }

  makeNew() {
    if (this.busy) return;
    const name = window.prompt('A short name for the new quest (it names its flags), e.g. wolf_trouble:');
    const id = cleanQuestId(name);
    if (!id) return;
    if (this.quests.some((q) => q.id === id)) { this.say(`There's already a quest called ${id}.`); return; }
    this.quest = newQuest(id);
    this.saved = null;
    this.who = null;
    this.render();
    this.say(`A new quest, ${id}. Fill it in and press Save quest.`);
  }

  // ---- the server's answers ----

  // parseQuestReply's results.
  reply(r) {
    if (r.list) { this.listing.push(r.list); return; }
    if (r.listDone) { this.quests = this.listing; this.fillList(); return; }
    if (r.def) {
      this.quest = r.def;
      this.saved = structuredClone(r.def);
      this.who = null;
      this.render();
      this.fillList();
      this.say(`Editing ${r.def.id}. Saving rewrites its stages in each NPC's conversation; the rest of what they say is kept.`);
      return;
    }
    if (r.saved) return this.done?.(r.saved);
    if (r.removed) return this.done?.(r.removed);
    if (r.who) { this.who?.push(r.who); return; }
    if (r.whoDone) { this.renderWho(); }
  }

  // A dialogue the save asked for (parseDialogueReply): true if it was ours.
  dialogue(r) {
    if (!this.waiting || this.waiting.name.toLowerCase() !== r.name.toLowerCase()) return false;
    const w = this.waiting;
    this.waiting = null;
    w.resolve(r);
    return true;
  }

  // Lines that answer the save's own steps, kept out of the chat while saving.
  swallow(text) {
    return this.busy && /^(Saved .*'s dialogue\. Talk to them to try it\.|Journal entry (saved for|for) .*)$/.test(text.trim());
  }

  fetchDialogue(name) {
    return new Promise((resolve, reject) => {
      this.waiting = { name, resolve };
      this.send(loadCommand(name));
      setTimeout(() => {
        if (this.waiting?.name === name) { this.waiting = null; reject(new Error(`${name}'s conversation didn't arrive`)); }
      }, WAIT_MS);
    });
  }

  // The server's "QuestSaved"/"QuestRemoved".
  awaitDone(id) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.done = null; reject(new Error('the server didn\'t answer')); }, WAIT_MS);
      this.done = (got) => { if (got === id) { clearTimeout(timer); this.done = null; resolve(); } };
    });
  }

  // ---- saving and removing ----

  async save() {
    const q = this.quest;
    if (!q || this.busy) return;
    const problems = questProblems(q);
    if (problems.length) { this.say(problems.join(' ')); return; }
    this.busy = true;
    try {
      const now = questNpcs(q);
      const before = this.saved ? questNpcs(this.saved) : [];
      const gone = before.filter((b) => !now.some((n) => n.toLowerCase() === b.toLowerCase()));
      for (const name of [...now, ...gone]) {
        this.say(`Writing ${name}'s part…`);
        const r = await this.fetchDialogue(name);
        if (r.handWritten) throw new Error(`${name}'s conversation is a hand-written script, so the wizard can't add to it. Make it in the dialogue editor first`);
        const dlg = tidyDialogue(r.dialogue);
        const next = now.includes(name) ? mergeQuest(dlg, q, name) : stripQuest(dlg, q.id);
        this.send(saveCommand(name, next));
      }
      this.say('Writing the journal…');
      const lines = questJournal(q);
      for (const j of lines) this.send(journalSet(j));
      // Steps taken out since last time: their journal lines go too.
      for (const old of this.saved ? questJournal(this.saved) : []) {
        if (!lines.some((j) => j.flag === old.flag)) this.send(journalRemove(old.flag));
      }
      const done = this.awaitDone(q.id);
      this.send(questSave(q));
      await done;
      this.saved = structuredClone(q);
      this.say(`Saved ${q.id}: ${now.join(', ')} ${now.length > 1 ? 'have' : 'has'} the quest in their conversation now. Talk to ${q.giver} as a player to try it (gods see the same).`);
      this.refreshList();
    } catch (e) {
      this.say(`Not saved: ${e.message}.`);
    } finally {
      this.busy = false;
    }
  }

  async remove() {
    const q = this.saved ?? this.quest;
    if (!q || this.busy) return;
    if (!window.confirm(`Remove the quest "${q.title || q.id}"? Its stages come out of each NPC's conversation and its journal lines go. Players keep any of its flags they hold, which then do nothing.`)) return;
    this.busy = true;
    try {
      for (const name of questNpcs(q)) {
        this.say(`Taking it out of ${name}'s conversation…`);
        const r = await this.fetchDialogue(name);
        if (!r.handWritten) this.send(saveCommand(name, stripQuest(tidyDialogue(r.dialogue), q.id)));
      }
      for (const j of questJournal(q)) this.send(journalRemove(j.flag));
      if (this.saved) {
        const done = this.awaitDone(q.id);
        this.send(questRemove(q.id));
        await done;
      }
      this.say(`Removed ${q.id}.`);
      this.quest = this.saved = null;
      this.body.replaceChildren();
      this.refreshList();
    } catch (e) {
      this.say(`Not removed: ${e.message}.`);
    } finally {
      this.busy = false;
    }
  }

  showWho() {
    if (!this.saved) { this.say('Save the quest first.'); return; }
    this.who = [];
    this.whoBox?.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Looking…' }));
    this.send(questWho(this.saved.id));
  }

  // ---- drawing ----

  fillList() {
    const rows = this.quests.map((q) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `le-pick${this.quest?.id === q.id ? ' current' : ''}`;
      b.dataset.quest = q.id;
      b.textContent = q.title || q.id;
      b.title = q.id;
      return b;
    });
    if (!rows.length) rows.push(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No quests yet.' }));
    this.listBox.replaceChildren(...rows);
  }

  renderWho() {
    if (!this.whoBox || !this.who || !this.saved) return;
    const q = this.saved;
    // A player's step (the "_on" flag only says they're on it).
    const by = new Map();
    for (const w of this.who) {
      const what = describeFlag(q, w.flag);
      if (!what) continue;
      by.set(w.name, { name: w.name, what, online: w.online });
    }
    const rows = [...by.values()].sort((a, b) => a.what.localeCompare(b.what) || a.name.localeCompare(b.name));
    if (!rows.length) {
      this.whoBox.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Nobody has started it yet.' }));
      return;
    }
    this.whoBox.replaceChildren(...rows.map((r) => {
      const p = document.createElement('div');
      p.className = 'qe-who';
      p.append(Object.assign(document.createElement('strong'), { textContent: r.name }), r.online ? Object.assign(document.createElement('span'), { className: 'qe-online', textContent: ' online' }) : '', ` · ${r.what}`);
      return p;
    }));
  }

  render() {
    const q = this.quest;
    const h = (tag, props = {}, ...kids) => {
      const e = document.createElement(tag);
      Object.assign(e, props);
      e.append(...kids.filter((k) => k != null && k !== false));
      return e;
    };
    const again = () => this.render();
    const field = (label, value, set, opts = {}) => {
      const { long, list, type = 'text', placeholder = '' } = opts;
      const input = long ? h('textarea', { rows: 2, value: value ?? '', placeholder }) : h('input', { type, value: value ?? '', placeholder, autocomplete: 'off' });
      if (list) input.setAttribute('list', list);
      input.addEventListener('input', () => set(input.value));
      return h('div', { className: 'le-row' }, h('span', { className: 'le-label', textContent: label }), input);
    };
    const button = (text, onClick, cls = 'small') => {
      const b = h('button', { type: 'button', textContent: text, className: cls });
      b.addEventListener('click', onClick);
      return b;
    };

    const head = [
      h('div', { className: 'le-row' }, h('span', { className: 'le-label', textContent: 'Quest' }), h('code', { textContent: q.id })),
      field('Title (in the Journal)', q.title, (v) => { q.title = v; }, { placeholder: 'e.g. Wolf Trouble' }),
      field('Given by', q.giver, (v) => { q.giver = v; }, { list: 'qe-npcs', placeholder: 'an NPC\'s name, e.g. Farmer Joe' }),
      (() => {
        const c = h('input', { type: 'checkbox', checked: !!q.repeatable });
        c.addEventListener('change', () => { q.repeatable = c.checked; });
        return h('label', { className: 'toggle le-row' }, c, ' Can be done again (no "finished" flag; offered again afterwards)');
      })(),
    ];
    const offer = [
      h('h4', { className: 'list-head', textContent: 'The offer' }),
      field('They ask', q.offer.says, (v) => { q.offer.says = v; }, { long: true, placeholder: 'Wolves keep taking my sheep. Will you thin them out?' }),
      field('Yes answer', q.offer.accept, (v) => { q.offer.accept = v; }),
      field('…and they say', q.offer.acceptReply, (v) => { q.offer.acceptReply = v; }, { long: true, placeholder: 'Bless you! They come from the fields to the east.' }),
      field('No answer', q.offer.decline, (v) => { q.offer.decline = v; }, { placeholder: '(none: they can only say yes)' }),
      field('…and they say', q.offer.declineReply, (v) => { q.offer.declineReply = v; }),
      field('While it\'s running', q.reminder, (v) => { q.reminder = v; }, { long: true }),
    ];
    const steps = q.steps.map((s, i) => {
      const kinds = h('select', {}, ...STEP_KINDS.map(([k, label]) => new Option(label, k, false, s.kind === k)));
      kinds.addEventListener('change', () => { q.steps[i] = { ...newStep(kinds.value, s.npc ?? q.giver), journal: s.journal }; again(); });
      const move = (d) => () => { const j = i + d; if (j < 0 || j >= q.steps.length) return; [q.steps[i], q.steps[j]] = [q.steps[j], q.steps[i]]; again(); };
      const rows = [];
      if (s.kind === 'kill') {
        rows.push(field('Monster', s.mob, (v) => { s.mob = v; }, { list: 'qe-mobs', placeholder: 'e.g. wolf' }));
        rows.push(field('How many', s.count, (v) => { s.count = v; }, { type: 'number' }));
        rows.push(field('Counted as', s.what, (v) => { s.what = v; }, { placeholder: 'e.g. wolves slain ("Wolves slain: 3 of 5")' }));
      } else {
        rows.push(field('Go to', s.npc, (v) => { s.npc = v; }, { list: 'qe-npcs' }));
        if (s.kind === 'bring') {
          rows.push(field('Item', s.item, (v) => { s.item = v; }, { list: 'qe-items' }));
          const take = h('input', { type: 'checkbox', checked: !!s.take });
          take.addEventListener('change', () => { s.take = take.checked; });
          rows.push(h('label', { className: 'toggle le-row' }, take, ' They keep it (take it from the player)'));
        }
        rows.push(field('They say', s.says, (v) => { s.says = v; }, { long: true, placeholder: s.kind === 'bring' ? 'Is that the pelt?' : 'Joe sent you? Good.' }));
        rows.push(field('Player answers', s.answer, (v) => { s.answer = v; }));
        rows.push(field('…and they say', s.reply, (v) => { s.reply = v; }, { long: true }));
      }
      rows.push(field('Journal line', s.journal, (v) => { s.journal = v; }, { long: true, placeholder: 'What to do now, e.g. Kill 5 wolves in the fields east of the farm.' }));
      return h('section', { className: 'de-stage' },
        h('div', { className: 'de-row de-stage-head' }, h('strong', { textContent: `Step ${i + 1}` }), kinds, h('span', { className: 'de-grow' }),
          button('↑', move(-1), 'ghost'), button('↓', move(1), 'ghost'), button('✕', () => { q.steps.splice(i, 1); again(); }, 'ghost')),
        ...rows);
    });
    const addStep = h('div', { className: 'de-row' }, ...STEP_KINDS.map(([k, label]) => button(`+ ${label}`, () => {
      // A new person-step goes to whoever the last one did, or the giver.
      const lastNpc = [...q.steps].reverse().find((s) => s.npc)?.npc ?? q.giver;
      q.steps.push(newStep(k, lastNpc));
      again();
    })));
    const reward = [
      h('h4', { className: 'list-head', textContent: 'The reward (given at the last step)' }),
      field('Gold', q.reward.gold || '', (v) => { q.reward.gold = v; }, { type: 'number' }),
      field('Experience', q.reward.exp || '', (v) => { q.reward.exp = v; }, { type: 'number' }),
      field('Items', (q.reward.items ?? []).join(', '), (v) => { q.reward.items = v.split(',').map((x) => x.trim()).filter(Boolean); }, { list: 'qe-items', placeholder: 'item names, with commas between' }),
      field('They say', q.reward.says, (v) => { q.reward.says = v; }, { long: true, placeholder: 'You saved my flock! Take this.' }),
      field('Afterwards', q.after, (v) => { q.after = v; }, { long: true }),
    ];
    this.whoBox = h('div', { className: 'qe-whos' });
    const acts = h('div', { className: 'de-row' },
      button('Save quest', () => this.save(), 'primary'),
      button('Who\'s on it?', () => this.showWho(), ''),
      h('span', { className: 'de-grow' }),
      button('Remove quest', () => this.remove(), 'ghost'));
    const names = (k) => this.lists()?.[k] ?? [];
    this.body.replaceChildren(
      ...head, ...offer,
      h('h4', { className: 'list-head', textContent: 'Steps' }),
      h('p', { className: 'de-hint', textContent: 'In order. A kill step counts by itself and moves on when it\'s done; the last step must be someone to talk to or bring something to, as that\'s where the reward comes.' }),
      ...steps, addStep,
      ...reward,
      acts,
      h('h4', { className: 'list-head', textContent: 'Who\'s on it' }),
      this.whoBox,
      h('datalist', { id: 'qe-npcs' }, ...[...names('props'), ...names('mobs')].map((n) => new Option(n))),
      h('datalist', { id: 'qe-mobs' }, ...names('mobs').map((n) => new Option(n))),
      h('datalist', { id: 'qe-items' }, ...names('items').map((n) => new Option(n))));
  }
}
