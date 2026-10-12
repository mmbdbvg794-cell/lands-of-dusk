// Beta applications in the admin page (js/admin.js): who applied on the
// website (apply.py), with Approve (makes their beta key, shown once, with
// where to send it) and Reject. The list and the actions are web requests
// to serve.py, so they need the forum's sign-in as a god (the game login
// doesn't reach the web service); without it, a small sign-in shows here.
// Everything is put on the page as text, never as HTML.

// Today's date as the server writes it ("2026-10-12 18:33:20").
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "N waiting · M new today" for the panel's heading line.
export function summary(apps, day = today()) {
  const waiting = apps.filter((a) => a.status === 'waiting').length;
  const fresh = apps.filter((a) => (a.created || '').startsWith(day)).length;
  return `${waiting} waiting · ${fresh} new today`;
}

export class ApplicationsPanel {
  // h: admin.js's element maker. me(): the god's character name.
  constructor(h, me) {
    this.h = h;
    this.me = me;
    this.apps = [];
    this.showAll = h('input', { type: 'checkbox' });
    this.showAll.addEventListener('change', () => this.render());
    this.line = h('p', { className: 'ad-status' });
    this.result = h('div', { className: 'ap-result', hidden: true });
    this.list = h('div', { className: 'ad-list' });
    this.signin = this.signinBox();
    this.el = h('section', { className: 'ad-sec' },
      h('h3', { textContent: 'Beta applications' }), this.line,
      h('label', { className: 'toggle' }, this.showAll, ' Show approved and rejected'),
      this.result, this.signin, this.list);
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (b) this.act(b.dataset.act, Number(b.dataset.id));
    });
  }

  signinBox() {
    const h = this.h;
    this.pass = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Password' });
    this.signMsg = h('span', { className: 'ad-updated' });
    const go = h('button', { type: 'button', textContent: 'Sign in' });
    const submit = () => this.signIn();
    go.addEventListener('click', submit);
    this.pass.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
    return h('div', { className: 'de-row', hidden: true },
      h('span', { textContent: 'Sign in as a god to see applications:' }), this.pass, go, this.signMsg);
  }

  async signIn() {
    this.signMsg.textContent = 'Signing in…';
    try {
      const r = await fetch('forum/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forum': '1' },
        body: JSON.stringify({ name: this.me() || '', password: this.pass.value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Sign-in failed.');
      this.pass.value = '';
      this.signMsg.textContent = '';
      this.refresh();
    } catch (e) {
      this.signMsg.textContent = e.message;
    }
  }

  async refresh() {
    try {
      const r = await fetch('apply/api/admin/list', { cache: 'no-store' });
      if (r.status === 401) {
        this.signin.hidden = false;
        this.line.textContent = 'Signed out of the website.';
        this.apps = [];
        this.render();
        return;
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Couldn\'t load applications.');
      this.signin.hidden = true;
      this.apps = j.applications || [];
      this.line.textContent = summary(this.apps);
      this.render();
    } catch (e) {
      this.line.textContent = e.message || 'Couldn\'t load applications.';
    }
  }

  render() {
    const h = this.h;
    const shown = this.showAll.checked ? this.apps : this.apps.filter((a) => a.status === 'waiting');
    if (!shown.length) {
      this.list.replaceChildren(h('p', { className: 'ad-empty', textContent: this.signin.hidden ? 'No applications waiting.' : '' }));
      return;
    }
    this.list.replaceChildren(...shown.map((a) => {
      const acts = a.status === 'waiting'
        ? [h('button', { type: 'button', textContent: 'Approve', dataset: { act: 'approve', id: a.id } }),
           h('button', { type: 'button', textContent: 'Reject', dataset: { act: 'reject', id: a.id } })]
        : [h('span', { className: 'ad-updated', textContent: `${a.status}${a.key_tail ? ` (key ..${a.key_tail})` : ''}` })];
      return h('div', { className: 'ap-row' },
        h('div', { className: 'ap-head' },
          h('strong', { textContent: `#${a.id} ${a.name || '(no name)'}` }),
          h('span', { textContent: ` · ${a.contact} · ${a.device} · ${(a.created || '').slice(0, 16)}` })),
        a.why ? h('p', { className: 'ap-why', textContent: a.why }) : '',
        h('div', { className: 'de-row' }, ...acts));
    }));
  }

  async act(what, id) {
    const a = this.apps.find((x) => x.id === id);
    if (!a) return;
    const who = `#${id} ${a.name || a.contact}`;
    if (what === 'approve' && !window.confirm(`Approve ${who}? This makes their beta key now.`)) return;
    if (what === 'reject' && !window.confirm(`Reject ${who}?`)) return;
    try {
      const r = await fetch(`apply/api/admin/${what}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Apply': '1' },
        body: JSON.stringify({ id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'That didn\'t work.');
      if (what === 'approve') this.showKey(j);
      this.refresh();
    } catch (e) {
      this.line.textContent = e.message;
    }
  }

  // The new key, shown once: copy it and send it to the contact.
  showKey({ key, contact, label }) {
    const h = this.h;
    const copy = h('button', { type: 'button', textContent: 'Copy key' });
    copy.addEventListener('click', () => navigator.clipboard?.writeText(key).then(() => (copy.textContent = 'Copied')));
    const done = h('button', { type: 'button', textContent: 'Done' });
    done.addEventListener('click', () => { this.result.hidden = true; this.result.replaceChildren(); });
    this.result.replaceChildren(
      h('p', {}, h('strong', { textContent: `Key for ${label}: ` }), h('code', { textContent: key })),
      h('p', { textContent: `Send it to: ${contact}. It's shown only now.` }),
      h('div', { className: 'de-row' }, copy, done));
    this.result.hidden = false;
  }
}
