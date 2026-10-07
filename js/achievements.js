// Achievements (server/Achievements.java): the list in the Journal tab,
// with progress, and a banner when you earn one. No DOM in the parsers.

// "Achv: id|title|what|earned ms|progress|goal" -> { item } ;
// "Achv: done|<name>" -> { done: name } ; "Achievement: title|what" ->
// { earned: { title, what } } ; else null.
export function parseAchv(line) {
  const s = line.trim();
  let m = /^Achv: done\|(.*)$/.exec(s);
  if (m) return { done: m[1] };
  m = /^Achv: ([^|]+)\|([^|]*)\|([^|]*)\|(\d+)\|(\d+)\|(\d+)$/.exec(s);
  if (m) return { item: { id: m[1], title: m[2], what: m[3], earned: Number(m[4]) || 0, progress: Number(m[5]), goal: Number(m[6]) || 1 } };
  m = /^Achievement: ([^|]+)\|(.*)$/.exec(s);
  if (m) return { earned: { title: m[1], what: m[2] } };
  return null;
}

export class AchievementsView {
  // box: the Journal tab's achievements section; send(cmd) quietly;
  // banner(title, what): the earned banner; me(): your name.
  constructor(box, { send, banner, me }) {
    Object.assign(this, { box, send, banner, me });
    this.items = [];
    this.pending = [];
    this.list = box.querySelector('.achv-list');
    this.head = box.querySelector('.achv-head');
    this.link = box.querySelector('.achv-profile');
    box.querySelector('.achv-toggle').addEventListener('click', () => {
      const open = this.list.hidden;
      this.list.hidden = !open;
      if (open) this.refresh();
    });
  }

  refresh() { this.pending = []; this.send('achievements'); }

  reply(r) {
    if (r.item) { this.pending.push(r.item); return true; }
    if (r.done !== undefined) { this.items = this.pending; this.pending = []; this.render(); return true; }
    if (r.earned) { this.banner(r.earned.title, r.earned.what); if (!this.list.hidden) this.refresh(); return true; }
    return false;
  }

  render() {
    const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    const got = this.items.filter((i) => i.earned).length;
    this.head.textContent = `Achievements (${got} of ${this.items.length})`;
    const name = this.me?.();
    if (name) this.link.href = `profile.html?name=${encodeURIComponent(name)}`;
    // Earned first (newest first), then the nearest to done.
    const order = this.items.slice().sort((a, b) => (b.earned - a.earned) || (b.progress / b.goal - a.progress / a.goal));
    this.list.replaceChildren(...order.map((i) => {
      const pct = Math.round(Math.min(1, i.progress / i.goal) * 100);
      const bar = h('div', { className: 'achv-bar' }, Object.assign(h('div', { className: 'achv-fill' }), { style: `width:${pct}%` }));
      return h('li', { className: i.earned ? 'earned' : '' },
        h('span', { className: 'achv-medal', textContent: i.earned ? '★' : '☆' }),
        h('span', { className: 'achv-body' }, h('b', { textContent: i.title }), h('small', { textContent: i.what }),
          i.earned ? h('small', { className: 'achv-when', textContent: `Earned ${new Date(i.earned).toLocaleDateString([], { day: 'numeric', month: 'short' })}` })
            : i.goal > 1 ? h('span', { className: 'achv-prog' }, bar, h('small', { textContent: `${i.progress.toLocaleString()} / ${i.goal.toLocaleString()}` })) : ''));
    }));
  }
}
