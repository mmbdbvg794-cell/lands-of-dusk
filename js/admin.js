// The admin page, for gods: how the server is doing (with the restart),
// who's in the game, the latest bug reports, recent logins and today's
// errors. A window in the game (the God tab's "Admin page…", or #admin at
// the end of the address), so it uses the god's own login. The data comes
// from server/Admin.java ("serverinfo" and "admin players|bugs|logins|
// errors"), sent quietly; the parsers here are tested in node.

import { describeServer } from './god.js';
import { ApplicationsPanel } from './applications.js';

// A reply line from "admin ..." -> { player } | { bug } | { login } |
// { error } | { done: 'players'|'bugs'|'logins'|'errors', count } | null.
export function parseAdmin(line) {
  const s = line.trim();
  let m = /^AdminPlayer: (.*)$/.exec(s);
  if (m) {
    const f = m[1].split('|');
    if (f.length < 12) return null;
    const n = (i) => Number(f[i]) || 0;
    return { player: { name: f[0], race: f[1], title: f[2], privs: n(3), x: n(4), y: n(5), hp: n(6), maxhp: n(7), exp: n(8), since: n(9) || null, address: f[10], hidden: f[11] === '1' } };
  }
  m = /^AdminBug: (.*)$/.exec(s);
  if (m) {
    let text;
    try { text = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch { text = m[1]; }
    return { bug: parseBug(text) };
  }
  m = /^AdminLogin: (.*)$/.exec(s);
  if (m) return { login: parseLogin(m[1]) };
  m = /^AdminError: (.*)$/.exec(s);
  if (m) return { error: m[1] };
  m = /^Admin(Players|Bugs|Logins|Errors): done(?:\|(\d+))?$/.exec(s);
  if (m) return { done: m[1].toLowerCase(), count: m[2] == null ? null : Number(m[2]) };
  return null;
}

// "Bug report from <name> (<when>): <subject>\n<body>" (server/Mail.java)
// -> { from, at, subject, body }; anything else is all body.
export function parseBug(text) {
  const m = /^Bug report from (\S+) \(([^)]*)\): ([^\n]*)\n?([\s\S]*)$/.exec(text.trim());
  if (!m) return { from: '', at: '', subject: '', body: text.trim() };
  return { from: m[1], at: m[2], subject: m[3].trim(), body: m[4].trim() };
}

// "[2026-10-07 00:09:16] flan logged in from 1.2.3.4" -> { at, name,
// address, text }; a line in another shape keeps just its text.
export function parseLogin(line) {
  const m = /^\[([^\]]+)\] (\S+) logged in from (\S+)/.exec(line.trim());
  return m ? { at: m[1], name: m[2], address: m[3], text: line.trim() } : { at: '', name: '', address: '', text: line.trim() };
}

// "2 h 5 min", "40 min", "3 d 1 h", from milliseconds.
export function duration(ms) {
  const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d ? `${d} d ${h % 24} h` : h ? `${h} h ${m % 60} min` : `${m} min`;
}

const REFRESH_MS = 30000;

export class AdminView {
  // el: the #admin-dialog. send(cmd) sends quietly; run(cmd) sends as if
  // typed (so the reply shows in the chat).
  constructor(el, { send, run, me = () => '' }) {
    Object.assign(this, { el, send, run });
    this.timer = 0;
    this.fresh();
    const h = (tag, { dataset, ...props } = {}, ...kids) => {
      const e = Object.assign(document.createElement(tag), props);
      if (dataset) Object.assign(e.dataset, dataset);
      e.append(...kids);
      return e;
    };
    this.h = h;
    this.status = h('p', { className: 'ad-status' });
    this.restartIn = h('p', { className: 'ad-warn' });
    this.secs = h('input', { type: 'number', min: 10, max: 600, value: 60, className: 'de-num', title: 'Seconds of warning players get' });
    const restart = h('button', { type: 'button', textContent: 'Restart server', title: 'Warns everyone, counts down, saves everyone and restarts. God level 5.' });
    const cancel = h('button', { type: 'button', textContent: 'Call it off' });
    restart.addEventListener('click', () => {
      const secs = Math.max(10, Math.min(600, Math.floor(Number(this.secs.value) || 60)));
      if (!window.confirm(`Restart the server in ${secs} seconds? Everyone is warned, then saved; it's back a few seconds after. The map is not saved.`)) return;
      this.run(`restart ${secs}`);
      setTimeout(() => this.refresh(), 800);
    });
    cancel.addEventListener('click', () => { this.run('restart cancel'); setTimeout(() => this.refresh(), 800); });
    this.players = h('div', { className: 'ad-table-wrap' });
    this.bugs = h('div', { className: 'ad-list' });
    this.logins = h('div', { className: 'ad-list' });
    this.errors = h('div', { className: 'ad-list' });
    this.heads = {
      players: h('h3', { textContent: 'In the game' }),
      bugs: h('h3', { textContent: 'Bug reports' }),
      logins: h('h3', { textContent: 'Recent logins' }),
      errors: h('h3', { textContent: 'Errors today' }),
    };
    this.auto = h('input', { type: 'checkbox', checked: true });
    const refresh = h('button', { type: 'button', textContent: 'Refresh' });
    refresh.addEventListener('click', () => this.refresh());
    this.updated = h('span', { className: 'ad-updated' });
    this.apps = new ApplicationsPanel(h, me);
    el.querySelector('.de-body').replaceChildren(
      h('div', { className: 'ad-bar' }, refresh, h('label', { className: 'toggle' }, this.auto, ' Every 30 s'), this.updated),
      h('section', { className: 'ad-sec' }, h('h3', { textContent: 'Server' }), this.status, this.restartIn,
        h('div', { className: 'de-row' }, h('span', { textContent: 'Restart in' }), this.secs, h('span', { textContent: 's' }), restart, cancel,
          h('a', { href: 'leaderboard.html', target: '_blank', rel: 'noopener', textContent: 'Leaderboard' }),
          h('a', { href: 'who.html', target: '_blank', rel: 'noopener', textContent: 'Who\'s online page' }))),
      this.apps.el,
      h('section', { className: 'ad-sec' }, this.heads.players, this.players),
      h('section', { className: 'ad-sec' }, this.heads.bugs, this.bugs),
      h('div', { className: 'ad-cols' },
        h('section', { className: 'ad-sec' }, this.heads.logins, this.logins),
        h('section', { className: 'ad-sec' }, this.heads.errors, this.errors)),
    );
    el.querySelector('[data-ad="close"]').addEventListener('click', () => this.close());
    this.auto.addEventListener('change', () => this.schedule());
    this.players.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const name = b.dataset.name;
      if (b.dataset.act === 'goto') this.run(`teleport ${name}`);
      if (b.dataset.act === 'ban' && window.confirm(`Ban ${name}? Their account, address and browser are banned and they're disconnected. "unban ${name}" lifts it.`)) {
        this.run(`ban ${name}`);
        setTimeout(() => this.refresh(), 800);
      }
    });
  }

  get open() {
    return !this.el.hidden;
  }

  show() {
    this.el.hidden = false;
    this.refresh();
    this.schedule();
  }

  close() {
    this.el.hidden = true;
    clearInterval(this.timer);
    this.timer = 0;
  }

  schedule() {
    clearInterval(this.timer);
    this.timer = this.open && this.auto.checked ? setInterval(() => this.refresh(), REFRESH_MS) : 0;
  }

  fresh() {
    this.got = { players: [], bugs: [], logins: [], errors: [], serverErrors: [] };
  }

  refresh() {
    this.apps.refresh();
    this.fresh();
    for (const cmd of ['serverinfo', 'admin players', 'admin bugs 30', 'admin logins 40', 'admin errors 30']) this.send(cmd);
  }

  // A "serverinfo" reply (god.js parseServerInfo), shared with the God tab.
  serverReply(r) {
    if (!this.open) return;
    if (r.info) {
      const d = describeServer(r.info);
      this.status.textContent = d.status;
      this.restartIn.textContent = d.restart;
    }
  }

  // A parseAdmin result. Each list is drawn once its "done" arrives.
  reply(r) {
    const h = this.h;
    if (r.player) { this.got.players.push(r.player); return; }
    if (r.bug) { this.got.bugs.push(r.bug); return; }
    if (r.login) { this.got.logins.push(r.login); return; }
    if (r.error) { this.got.errors.push(r.error); return; }
    if (!r.done) return;
    this.updated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    const empty = (text) => h('p', { className: 'de-hint', textContent: text });
    if (r.done === 'players') {
      const ps = this.got.players.sort((a, b) => a.name.localeCompare(b.name));
      this.heads.players.textContent = `In the game (${ps.length})`;
      if (!ps.length) { this.players.replaceChildren(empty('Nobody is in the game.')); return; }
      const now = Date.now();
      const row = (p) => h('tr', {},
        h('td', {}, h('strong', { textContent: p.name }), p.privs > 1 ? h('span', { className: 'ad-tag', textContent: `god ${p.privs}` }) : '', p.hidden ? h('span', { className: 'ad-tag', textContent: 'hidden' }) : ''),
        h('td', { textContent: p.race }),
        h('td', { textContent: `${p.hp}/${p.maxhp}` }),
        h('td', { textContent: p.exp.toLocaleString() }),
        h('td', { textContent: `${p.x}, ${p.y}` }),
        h('td', { textContent: p.since ? duration(now - p.since) : '—' }),
        h('td', { className: 'ad-addr', textContent: p.address }),
        h('td', { className: 'ad-acts' },
          h('button', { type: 'button', className: 'small', textContent: 'Go to', dataset: { act: 'goto', name: p.name } }),
          p.privs > 1 ? '' : h('button', { type: 'button', className: 'small ad-ban', textContent: 'Ban', dataset: { act: 'ban', name: p.name } })));
      this.players.replaceChildren(h('table', { className: 'ad-table' },
        h('thead', {}, h('tr', {}, ...['Name', 'Race', 'HP', 'Exp', 'Where', 'Online for', 'Address', ''].map((t) => h('th', { textContent: t })))),
        h('tbody', {}, ...ps.map(row))));
    }
    if (r.done === 'bugs') {
      const bs = this.got.bugs.slice().reverse();
      this.heads.bugs.textContent = `Bug reports (${r.count ?? bs.length}${r.count > bs.length ? `, latest ${bs.length}` : ''})`;
      this.bugs.replaceChildren(...(bs.length ? bs.map((b) => h('details', { className: 'ad-bug' },
        h('summary', {}, h('strong', { textContent: b.subject || '(no subject)' }), h('span', { className: 'ad-meta', textContent: ` ${b.from}${b.at ? ' · ' + b.at : ''}` })),
        h('pre', { textContent: b.body || '(nothing more)' }))) : [empty('No bug reports yet.')]));
    }
    if (r.done === 'logins') {
      const ls = this.got.logins.slice().reverse();
      this.logins.replaceChildren(...(ls.length ? ls.map((l) => h('div', { className: 'ad-line' },
        l.name ? h('span', {}, h('strong', { textContent: l.name }), ` ${l.at}`, h('span', { className: 'ad-addr', textContent: ` ${l.address}` })) : l.text)) : [empty('No logins recorded.')]));
    }
    if (r.done === 'errors') {
      const es = this.got.errors.slice().reverse();
      this.heads.errors.textContent = `Errors today (${r.count ?? es.length})`;
      this.errors.replaceChildren(...(es.length ? es.map((e) => h('code', { className: 'ad-error', textContent: e })) : [empty('No errors today.')]));
    }
  }
}
