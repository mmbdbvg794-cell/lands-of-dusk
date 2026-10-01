// The Journal, Friends and Trade tabs (see js/social.js for what the
// server sends). The panel's own tabs are switched with Panels; this fills
// them in and turns their buttons into commands.

import {
  JOURNAL, FRIENDS, friendAdd, friendRemove, tradeOffer, tradeBack, tradeGold, whisperStart,
} from './social.js';

export class SocialUI {
  // panels: the Panels; quiet(cmd) sends without echoing; run(cmd) sends
  // as if typed; player(): the Player (inventory); whisper(name) starts a
  // whisper in the chat box; note(text) adds a line to the chat.
  constructor({ panels, quiet, run, player, whisper, note }) {
    Object.assign(this, { panels, quiet, run, player, whisper, note });
    this.$ = (id) => document.getElementById(id);
    this.friends = []; // [{ name, online }]
    this.friendNames = new Set();
    this.trade = null; // the table, while trading
    this.journal = null;

    this.$('friend-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.$('friend-name').value.trim();
      if (!name) return;
      this.quiet(friendAdd(name));
      this.$('friend-name').value = '';
    });
    this.$('friends-list').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-friend]');
      if (!b) return;
      if (b.dataset.act === 'whisper') this.whisper(b.dataset.friend);
      else this.quiet(friendRemove(b.dataset.friend));
    });

    this.$('trade-cancel').addEventListener('click', () => this.quiet('trade cancel'));
    this.$('trade-ready').addEventListener('click', () => this.quiet('trade ready'));
    let goldTimer = 0;
    this.$('trade-gold').addEventListener('input', () => {
      clearTimeout(goldTimer);
      goldTimer = setTimeout(() => this.quiet(tradeGold(this.$('trade-gold').value)), 500);
    });
    this.$('trade-pack').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-offer]');
      if (b) this.quiet(tradeOffer(b.dataset.offer));
    });
    this.$('trade-mine').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-back]');
      if (b) this.quiet(tradeBack(b.dataset.back));
    });
  }

  // ---- journal ----

  refreshJournal() {
    this.quiet(JOURNAL);
  }

  setJournal(quests) {
    this.journal = quests;
    const list = this.$('journal-list');
    list.replaceChildren(...quests.map((q) => {
      const li = document.createElement('li');
      li.className = q.done ? 'done' : '';
      const head = document.createElement('div');
      head.className = 'q-title';
      head.append(q.title, Object.assign(document.createElement('span'), { className: 'q-badge', textContent: q.done ? 'Done' : 'In progress' }));
      li.append(head);
      if (q.text) li.append(Object.assign(document.createElement('p'), { className: 'q-text', textContent: q.text }));
      return li;
    }));
    this.$('journal-empty').hidden = quests.length > 0;
  }

  // ---- friends ----

  refreshFriends() {
    this.quiet(FRIENDS);
  }

  setFriends(list) {
    // Say when a friend comes online (not on the first list after login).
    if (this.friendsLoaded) {
      const was = new Map(this.friends.map((f) => [f.name, f.online]));
      for (const f of list) if (f.online && was.get(f.name) === false) this.note(`★ ${f.name} is online.`);
    }
    this.friendsLoaded = true;
    this.friends = list;
    this.friendNames = new Set(list.map((f) => f.name.toLowerCase()));
    const sorted = [...list].sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
    this.$('friends-list').replaceChildren(...sorted.map((f) => {
      const li = document.createElement('li');
      const info = document.createElement('span');
      info.className = 'info';
      info.append(Object.assign(document.createElement('span'), { className: `online-dot${f.online ? ' on' : ''}`, title: f.online ? 'Online' : 'Offline' }),
        Object.assign(document.createElement('span'), { className: 'name', textContent: f.name }));
      const acts = document.createElement('span');
      acts.className = 'acts';
      const btn = (label) => Object.assign(document.createElement('button'), { type: 'button', textContent: label });
      const w = btn('Whisper', 'whisper');
      w.dataset.friend = f.name; w.dataset.act = 'whisper';
      w.disabled = !f.online;
      const r = btn('Remove', 'remove');
      r.dataset.friend = f.name; r.dataset.act = 'remove';
      r.className = 'ghost';
      acts.append(w, r);
      li.append(info, acts);
      return li;
    }));
    this.$('friends-empty').hidden = list.length > 0;
    const on = list.filter((f) => f.online).length;
    this.$('tab-friends-count').textContent = on ? String(on) : '';
  }

  // ---- trading ----

  setTrade(table) {
    const first = !this.trade;
    this.trade = table;
    this.panels.setTabVisible('trade', true);
    if (first) this.panels.selectByName('trade', true);
    this.renderTrade();
  }

  endTrade() {
    if (!this.trade) return;
    this.trade = null;
    this.panels.setTabVisible('trade', false);
  }

  renderTrade() {
    const t = this.trade;
    if (!t) return;
    for (const el of document.querySelectorAll('#tab-trade .trade-with')) el.textContent = t.with;
    const row = (name, button) => {
      const li = document.createElement('li');
      li.append(Object.assign(document.createElement('span'), { className: 'info', textContent: '' }));
      li.firstChild.append(Object.assign(document.createElement('span'), { className: 'name', textContent: name }));
      if (button) {
        const acts = document.createElement('span');
        acts.className = 'acts';
        acts.append(button);
        li.append(acts);
      }
      return this.panels.itemRow ? this.panels.itemRow(name, li) : li;
    };
    const backBtn = () => Object.assign(document.createElement('button'), { type: 'button', textContent: 'Back' });
    this.$('trade-mine').replaceChildren(...t.mine.items.map((n) => {
      const b = backBtn(n);
      b.dataset.back = n;
      return row(n, b);
    }));
    this.$('trade-theirs').replaceChildren(...t.theirs.items.map((n) => row(n, null)));
    if (!t.theirs.items.length) this.$('trade-theirs').replaceChildren(Object.assign(document.createElement('li'), { className: 'empty', textContent: 'Nothing yet.' }));
    if (!t.mine.items.length) this.$('trade-mine').replaceChildren(Object.assign(document.createElement('li'), { className: 'empty', textContent: 'Offer something from your things below.' }));
    const gold = this.$('trade-gold');
    if (document.activeElement !== gold) gold.value = String(t.mine.gold);
    this.$('trade-theirs-gold').textContent = t.theirs.gold ? `and ${t.theirs.gold.toLocaleString()} gp` : '';
    this.$('trade-mine-ready').hidden = !t.mine.ready;
    this.$('trade-theirs-ready').hidden = !t.theirs.ready;
    const ready = this.$('trade-ready');
    ready.disabled = t.mine.ready;
    ready.textContent = t.mine.ready ? (t.theirs.ready ? 'Swapping…' : `Waiting for ${t.with}…`) : 'Ready';
    // What's left to offer: each item as many times as it isn't already on the table.
    const offered = new Map();
    for (const n of t.mine.items) offered.set(n.toLowerCase(), (offered.get(n.toLowerCase()) ?? 0) + 1);
    const pack = this.player().groupedItems().map((g) => ({ ...g, left: g.ids.slice(offered.get(g.name.toLowerCase()) ?? 0) })).filter((g) => g.left.length);
    this.$('trade-pack').replaceChildren(...pack.map((g) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Offer' });
      b.dataset.offer = String(g.left[0]);
      const li = row(g.name, b);
      if (g.left.length > 1) li.querySelector('.info').append(Object.assign(document.createElement('span'), { className: 'count', textContent: `×${g.left.length}` }));
      return li;
    }));
  }
}

export { whisperStart };
