// The forum's page (forum.html): the board index, a board's topics and a
// topic's posts, from forum.py's API under forum/api/. Hash routes:
//   #/  #/board/<id>[/<page>]  #/topic/<id>[/<page>]
// bbcode() is pure (tested in node); the rest draws the page.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Old-school BBCode to safe HTML: everything is escaped first, then
// [b] [i] [u] [s] [quote] [quote=name] [url] [url=...] [code] and line
// breaks are turned back into tags. Links are only http(s).
export function bbcode(text) {
  const codes = [];
  let s = String(text ?? '').replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  for (const t of ['b', 'i', 'u', 's']) s = s.replace(new RegExp(`\\[${t}\\]([\\s\\S]*?)\\[\\/${t}\\]`, 'gi'), `<${t}>$1</${t}>`);
  const safeUrl = (u) => (/^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : null);
  s = s.replace(/\[url=([^\]\s]+)\]([\s\S]*?)\[\/url\]/gi, (m, u, label) => (safeUrl(u) ? `<a href="${u}" rel="nofollow noopener" target="_blank">${label}</a>` : m));
  s = s.replace(/\[url\]([^\[\s]+)\[\/url\]/gi, (m, u) => (safeUrl(u) ? `<a href="${u}" rel="nofollow noopener" target="_blank">${u}</a>` : m));
  // Quotes, inside out (they can nest).
  for (let i = 0; i < 5; i++) {
    const before = s;
    s = s.replace(/\[quote=([^\]]{1,40})\]((?:(?!\[quote)[\s\S])*?)\[\/quote\]/i, (_, who, body) => `<blockquote><cite>${who} wrote:</cite>${body}</blockquote>`);
    s = s.replace(/\[quote\]((?:(?!\[quote)[\s\S])*?)\[\/quote\]/i, (_, body) => `<blockquote>${body}</blockquote>`);
    if (s === before) break;
  }
  s = s.replace(/\n/g, '<br>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<pre><code>${esc(codes[Number(i)])}</code></pre>`);
}

// "today 14:05", "3 Oct 2026 14:05".
export function stamp(secs, now = Date.now()) {
  const d = new Date(secs * 1000), n = new Date(now);
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === n.toDateString()) return `today ${hm}`;
  const y = new Date(now - 86400000);
  if (d.toDateString() === y.toDateString()) return `yesterday ${hm}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} ${hm}`;
}

// Page links: [1] 2 3 ... -> [{ n, current }].
export function pageList(page, pages) {
  const out = [];
  for (let n = 1; n <= pages; n++) if (n === 1 || n === pages || Math.abs(n - page) <= 2) out.push(n);
  return out.flatMap((n, i) => (i && n - out[i - 1] > 1 ? [null, n] : [n])).map((n) => (n === null ? { gap: true } : { n, current: n === page }));
}

// ---- the page (only in a browser) ----

if (typeof document !== 'undefined' && document.getElementById('forum')) start();

function start() {
  const $ = (id) => document.getElementById(id);
  const main = $('forum');
  let me = null;

  const api = async (path, body) => {
    const r = await fetch(`forum/api/${path}`, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forum': '1' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({ error: 'The forum didn\'t answer.' }));
    if (!r.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  };
  const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content; };
  const profile = (name) => `profile.html?name=${encodeURIComponent(name)}`;
  const crumbs = (...parts) => `<nav class="crumbs"><a href="#/">Forum index</a>${parts.map((p) => ` › ${p}`).join('')}</nav>`;
  const pager = (base, page, pages) => (pages > 1 ? `<div class="pager">Page ${page} of ${pages}: ${pageList(page, pages).map((p) => (p.gap ? '…' : p.current ? `<b>${p.n}</b>` : `<a href="${base}/${p.n}">${p.n}</a>`)).join(' ')}</div>` : '');

  function renderMe() {
    $('me').replaceChildren(html(me
      ? `Signed in as <a href="${profile(me.name)}" target="_blank">${esc(me.name)}</a>${me.god ? ' <span class="god">God</span>' : ''} · <a href="#" id="logout">Sign out</a>`
      : `<form id="login" class="login"><input name="name" placeholder="Character" autocomplete="username" required maxlength="30"><input name="password" type="password" placeholder="Password" autocomplete="current-password" required><button>Sign in</button><span class="err" id="login-err"></span></form>`));
    $('logout')?.addEventListener('click', async (e) => { e.preventDefault(); await api('logout', {}); me = null; renderMe(); route(); });
    $('login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try { me = (await api('login', { name: f.name.value, password: f.password.value })).me; renderMe(); route(); } catch (err) { $('login-err').textContent = err.message; }
    });
  }

  function editor(label, { title = false, value = '', onSubmit }) {
    const box = html(`<form class="editor">${title ? '<input name="title" placeholder="Topic title" maxlength="100" required>' : ''}
      <div class="bb">${['b', 'i', 'u', 'quote', 'url', 'code'].map((t) => `<button type="button" data-bb="${t}">${t}</button>`).join('')}</div>
      <textarea name="body" rows="7" maxlength="8000" required>${esc(value)}</textarea>
      <div class="row"><button class="primary">${label}</button><span class="err"></span></div></form>`);
    const form = box.querySelector('form');
    form.querySelector('.bb').addEventListener('click', (e) => {
      const t = e.target.dataset.bb;
      if (!t) return;
      const ta = form.body, a = ta.selectionStart, b = ta.selectionEnd;
      ta.setRangeText(`[${t}]${ta.value.slice(a, b)}[/${t}]`, a, b, 'end');
      ta.focus();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      form.querySelector('button.primary').disabled = true;
      try { await onSubmit(form); } catch (err) { form.querySelector('.err').textContent = err.message; form.querySelector('button.primary').disabled = false; }
    });
    return box;
  }

  async function showIndex() {
    main.onclick = null;
    const { boards } = await api('boards');
    document.title = 'Forum · Dusk';
    main.replaceChildren(html(`${crumbs()}<table class="ftable"><thead><tr><th>Board</th><th class="num">Topics</th><th class="num">Posts</th><th class="last">Last post</th></tr></thead><tbody>${boards.map((b) => `
      <tr><td><a class="title" href="#/board/${b.id}">${esc(b.title)}</a><div class="desc">${esc(b.description)}</div></td>
      <td class="num">${b.topics}</td><td class="num">${b.posts}</td>
      <td class="last">${b.last ? `<a href="#/topic/${b.last.id}">${esc(b.last.title)}</a><div class="desc">by ${esc(b.last.last_by)}, ${stamp(b.last.last_at)}</div>` : '<span class="desc">No posts yet</span>'}</td></tr>`).join('')}</tbody></table>`));
  }

  async function showBoard(id, page) {
    main.onclick = null;
    const d = await api(`board/${id}?page=${page}`);
    document.title = `${d.board.title} · Forum · Dusk`;
    const canPost = me && (!d.board.godsOnly || me.god);
    main.replaceChildren(html(`${crumbs(esc(d.board.title))}<h1>${esc(d.board.title)}</h1><p class="desc">${esc(d.board.description)}</p>
      ${pager(`#/board/${id}`, d.page, d.pages)}
      <table class="ftable"><thead><tr><th>Topic</th><th class="num">Replies</th><th class="last">Last post</th></tr></thead><tbody>${d.topics.length ? d.topics.map((t) => `
        <tr><td>${t.pinned ? '<span class="tag">Pinned</span> ' : ''}${t.locked ? '<span class="tag">Locked</span> ' : ''}<a class="title" href="#/topic/${t.id}">${esc(t.title)}</a><div class="desc">by <a href="${profile(t.author)}" target="_blank">${esc(t.author)}</a>, ${stamp(t.created)}</div></td>
        <td class="num">${t.replies}</td><td class="last">${esc(t.last_by)}<div class="desc">${stamp(t.last_at)}</div></td></tr>`).join('') : '<tr><td colspan="3" class="desc">No topics yet. Be the first.</td></tr>'}</tbody></table>
      ${pager(`#/board/${id}`, d.page, d.pages)}<h2>${canPost ? 'Start a new topic' : ''}</h2>`));
    if (canPost) main.append(editor('Post topic', { title: true, onSubmit: async (f) => { const r = await api('topic', { board: id, title: f.title.value, body: f.body.value }); location.hash = `#/topic/${r.topic}`; } }));
    else main.append(html(`<p class="desc">${me ? 'Only the gods start topics here.' : 'Sign in with your character (top right) to start a topic.'}</p>`));
  }

  async function showTopic(id, page) {
    const d = await api(`topic/${id}?page=${page}`);
    const t = d.topic;
    document.title = `${t.title} · Forum · Dusk`;
    const mod = me?.god ? `<div class="mod">Gods: ${t.pinned ? '<button data-mod="unpin">Unpin</button>' : '<button data-mod="pin">Pin</button>'} ${t.locked ? '<button data-mod="unlock">Unlock</button>' : '<button data-mod="lock">Lock</button>'}</div>` : '';
    main.replaceChildren(html(`${crumbs(`<a href="#/board/${t.board_id}">${esc(t.board_title)}</a>`, esc(t.title))}<h1>${esc(t.title)}${t.locked ? ' <span class="tag">Locked</span>' : ''}</h1>${mod}
      ${pager(`#/topic/${id}`, d.page, d.pages)}
      ${d.posts.map((p) => { const a = d.authors[p.author] ?? {}; const mine = me && (me.god || me.name.toLowerCase() === p.author.toLowerCase()); return `
        <article class="post" id="p${p.id}"><aside><a class="who" href="${profile(p.author)}" target="_blank">${esc(p.author)}</a>${a.god ? '<span class="god">God</span>' : ''}
          <div class="desc">${esc(a.title || '')}</div><div class="desc">${esc(a.race ? a.race[0].toUpperCase() + a.race.slice(1) : '')}</div><div class="desc">Posts: ${a.posts ?? 0}</div></aside>
        <div class="body"><div class="meta">${stamp(p.created)}${p.edited ? ` · edited ${stamp(p.edited)}` : ''}<span class="acts">${me && !t.locked ? `<a href="#" data-quote="${p.id}">Quote</a>` : ''}${mine ? ` <a href="#" data-edit="${p.id}">Edit</a> <a href="#" data-del="${p.id}">Delete</a>` : ''}</span></div>
          <div class="text">${bbcode(p.body)}</div></div></article>`; }).join('')}
      ${pager(`#/topic/${id}`, d.page, d.pages)}`));
    main.querySelector('.mod')?.addEventListener('click', async (e) => { const a = e.target.dataset.mod; if (a) { await api('mod', { topic: id, action: a }); showTopic(id, page); } });
    main.onclick = async (e) => {
      const q = e.target.dataset.quote, ed = e.target.dataset.edit, del = e.target.dataset.del;
      if (!q && !ed && !del) return;
      e.preventDefault();
      const post = d.posts.find((p) => String(p.id) === (q ?? ed ?? del));
      if (q) { const ta = main.querySelector('.reply textarea'); if (ta) { ta.value += `[quote=${post.author}]${post.body}[/quote]\n`; ta.focus(); } }
      if (del && confirm(post.first ? 'Delete this post and the whole topic?' : 'Delete this post?')) {
        const r = await api('delete', { post: post.id });
        if (r.topicGone) location.hash = `#/board/${t.board_id}`; else showTopic(id, page);
      }
      if (ed) {
        const box = main.querySelector(`#p${post.id} .text`);
        box.replaceChildren(editor('Save', { value: post.body, onSubmit: async (f) => { await api('edit', { post: post.id, body: f.body.value }); showTopic(id, page); } }));
      }
    };
    if (me && (!t.locked || me.god)) {
      const box = html('<h2>Reply</h2><div class="reply"></div>');
      box.querySelector('.reply').append(editor('Post reply', { onSubmit: async (f) => { const r = await api('reply', { topic: id, body: f.body.value }); location.hash = `#/topic/${id}/${r.page}`; route(true); } }));
      main.append(box);
    } else main.append(html(`<p class="desc">${t.locked ? 'This topic is locked.' : 'Sign in with your character (top right) to reply.'}</p>`));
  }

  async function route(force) {
    const m = location.hash.match(/^#\/(board|topic)\/(\d+)(?:\/(\d+))?/);
    try {
      if (!m) await showIndex();
      else if (m[1] === 'board') await showBoard(Number(m[2]), Number(m[3] ?? 1));
      else await showTopic(Number(m[2]), Number(m[3] ?? 1));
    } catch (err) {
      main.replaceChildren(html(`${crumbs()}<p class="err">${esc(err.message)}</p>`));
    }
    if (!force) window.scrollTo(0, 0);
  }

  addEventListener('hashchange', () => route());
  api('me').then((d) => { me = d.me; renderMe(); route(); }).catch(() => { renderMe(); route(); });
}
