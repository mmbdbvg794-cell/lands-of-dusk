// Player mail (server/Mail.java "mail ..."): letters between players, in
// the Mail tab. A letter waits in the reader's mailbox until they delete
// it; new ones are announced in the chat and counted on the tab.

// A reply line -> { item } | { listDone, unread } | { body } |
// { deleted } | { arrived: { from, unread } } | null. Texts are
// URL-encoded by the server (Java's URLEncoder: spaces as +).
const decode = (s) => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; } };

export function parseMail(line) {
  const s = line.trim();
  let m = /^MailItem: (\d+)\|([^|]*)\|(\d+)\|([01])\|(.*)$/.exec(s);
  if (m) return { item: { id: m[1], from: m[2], when: Number(m[3]), read: m[4] === '1', text: decode(m[5]) } };
  m = /^MailList: done\|(\d+)$/.exec(s);
  if (m) return { listDone: true, unread: Number(m[1]) };
  m = /^MailBody: (\d+)\|([^|]*)\|(\d+)\|(.*)$/.exec(s);
  if (m) return { body: { id: m[1], from: m[2], when: Number(m[3]), text: decode(m[4]) } };
  m = /^MailDeleted: (\d+)$/.exec(s);
  if (m) return { deleted: m[1] };
  m = /^MailNew: ([^|]*)\|(\d+)$/.exec(s);
  if (m) return { arrived: { from: m[1], unread: Number(m[2]) } };
  return null;
}

// The command to send a letter.
export const mailSend = (to, text) => `mail send ${String(to).trim()} ${encodeURIComponent(String(text).trim())}`;

// "today 14:05", "yesterday", "3 Oct".
export function when(ms, now = Date.now()) {
  const d = new Date(ms), n = new Date(now);
  const day = (x) => Math.floor((x.getTime() - x.getTimezoneOffset() * 60000) / 86400000);
  const diff = day(n) - day(d);
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff <= 0) return `today ${hm}`;
  if (diff === 1) return `yesterday ${hm}`;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export class MailView {
  // el: the #tab-mail panel; send(cmd): quietly; note(text): a chat line;
  // badge: the tab's count; friends(): names for the To box.
  constructor(el, { send, note, badge, friends }) {
    Object.assign(this, { el, send, note, badge, friends });
    this.items = [];
    this.pending = [];
    this.open = null; // the letter being read
    this.list = el.querySelector('.mail-list');
    this.reader = el.querySelector('.mail-reader');
    this.form = el.querySelector('.mail-form');
    this.to = this.form.querySelector('[name=to]');
    this.text = this.form.querySelector('[name=text]');
    this.status = el.querySelector('.mail-status');
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const to = this.to.value.trim(), text = this.text.value.trim();
      if (!to || !text) { this.say('Write who it\'s to, and something to say.'); return; }
      this.send(mailSend(to, text));
      this.say(`Sending to ${to}…`);
    });
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-letter]');
      if (b) this.send(`mail read ${b.dataset.letter}`);
    });
    this.reader.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b || !this.open) return;
      if (b.dataset.act === 'reply') {
        this.to.value = this.open.from;
        this.text.focus();
        this.text.value = '';
      }
      if (b.dataset.act === 'delete') this.send(`mail delete ${this.open.id}`);
    });
    this.form.querySelector('[name=to]').addEventListener('focus', () => this.fillFriends());
  }

  say(text) { this.status.textContent = text; }

  fillFriends() {
    const dl = this.el.querySelector('#mail-friends');
    if (!dl) return;
    dl.replaceChildren(...(this.friends?.() ?? []).map((n) => Object.assign(document.createElement('option'), { value: n })));
  }

  refresh() { this.pending = []; this.send('mail list'); }

  setUnread(n) { this.badge.textContent = n ? String(n) : ''; }

  // A server line already parsed by parseMail. Returns true if it was ours.
  reply(r) {
    if (r.item) { this.pending.push(r.item); return true; }
    if (r.listDone) { this.items = this.pending; this.pending = []; this.setUnread(r.unread); this.render(); return true; }
    if (r.body) {
      this.open = r.body;
      const it = this.items.find((i) => i.id === r.body.id);
      if (it && !it.read) { it.read = true; this.setUnread(this.items.filter((i) => !i.read).length); }
      this.render();
      return true;
    }
    if (r.deleted) {
      this.items = this.items.filter((i) => i.id !== r.deleted);
      if (this.open?.id === r.deleted) this.open = null;
      this.setUnread(this.items.filter((i) => !i.read).length);
      this.render();
      return true;
    }
    if (r.arrived) {
      this.setUnread(r.arrived.unread);
      this.note(r.arrived.from
        ? `✉ A letter from ${r.arrived.from} has arrived. Open the Mail tab to read it.`
        : `✉ You have ${r.arrived.unread} unread letter${r.arrived.unread === 1 ? '' : 's'}. Open the Mail tab to read ${r.arrived.unread === 1 ? 'it' : 'them'}.`);
      if (!this.el.hidden) this.refresh();
      return true;
    }
    return false;
  }

  // "Mail: sent to X." and the like, after a send.
  sent(line) {
    if (/^Mail: sent to /.test(line)) { this.text.value = ''; this.say(line.slice(6)); return true; }
    if (/^Mail: /.test(line)) { this.say(line.slice(6)); return true; }
    return false;
  }

  render() {
    const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    if (!this.items.length) this.list.replaceChildren(h('p', { className: 'muted-note', textContent: 'No letters yet.' }));
    else this.list.replaceChildren(...this.items.map((i) => h('button', { type: 'button', className: `mail-row${i.read ? '' : ' unread'}${this.open?.id === i.id ? ' open' : ''}`},
      h('span', { className: 'mail-from', textContent: i.from }),
      h('span', { className: 'mail-when', textContent: when(i.when) }),
      h('span', { className: 'mail-preview', textContent: i.text.replace(/\s+/g, ' ').slice(0, 70) }))));
    this.list.querySelectorAll('.mail-row').forEach((b, k) => { b.dataset.letter = this.items[k].id; });
    this.reader.hidden = !this.open;
    if (this.open) {
      this.reader.replaceChildren(
        h('div', { className: 'mail-head' }, h('strong', { textContent: this.open.from }), h('span', { className: 'mail-when', textContent: ` · ${when(this.open.when)}` })),
        h('p', { className: 'mail-text', textContent: this.open.text }),
        h('div', { className: 'mail-acts' },
          h('button', { type: 'button', className: 'small', textContent: 'Reply' }),
          h('button', { type: 'button', className: 'small ghost', textContent: 'Delete' })));
      const [reply, del] = this.reader.querySelectorAll('.mail-acts button');
      reply.dataset.act = 'reply';
      del.dataset.act = 'delete';
    }
  }
}
