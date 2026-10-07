// Parties (server/Party.java): the party frame over the map (who's in it,
// their health), the invitation with Accept and Decline, and party chat
// ("%" at the start of a line; shown in the chat as "[Party] name: text").

// A server line -> { party: { leader, members: [{ name, hp, maxhp, x, y }] } }
// | { none } | { invite: from } | { chat: { from, text } } | null.
export function parseParty(line) {
  const s = line.trim();
  if (s === 'Party: none') return { none: true };
  let m = /^Party: ([^|]+)\|(.*)$/.exec(s);
  if (m) {
    const members = m[2].split(',').filter(Boolean).map((e) => {
      const [name, hp, maxhp, x, y] = e.split(':');
      return { name, hp: Number(hp) || 0, maxhp: Number(maxhp) || 0, x: Number(x) || 0, y: Number(y) || 0 };
    });
    return { party: { leader: m[1], members } };
  }
  m = /^PartyInvite: (.+)$/.exec(s);
  if (m) return { invite: m[1] };
  m = /^PartyChat: ([^|]+)\|(.*)$/.exec(s);
  if (m) return { chat: { from: m[1], text: m[2] } };
  return null;
}

// "%hello" -> "party say hello"; anything else -> null.
export const partyChatCommand = (text) => (/^%/.test(text) ? `party say ${text.slice(1).trim()}` : null);

export class PartyView {
  // frame: #party-frame; invite: #party-invite; send(cmd) quietly; me():
  // your name; line(text): a chat line.
  constructor(frame, invite, { send, me, line }) {
    Object.assign(this, { frame, invite, send, me, line });
    this.party = null;
    this.names = new Set(); // lower case, for the click menu
    this.inviteTimer = 0;
    invite.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      this.send(`party ${b.dataset.act}`);
      this.hideInvite();
    });
    frame.addEventListener('click', (e) => {
      if (e.target.closest('button.party-leave')) this.send('party leave');
    });
  }

  reply(r) {
    if (r.none) { this.party = null; this.names = new Set(); this.render(); return true; }
    if (r.party) { this.party = r.party; this.names = new Set(r.party.members.map((m) => m.name.toLowerCase())); this.render(); return true; }
    if (r.invite) { this.showInvite(r.invite); return true; }
    if (r.chat) { this.line(`[Party] ${r.chat.from}: ${r.chat.text}`); return true; }
    return false;
  }

  showInvite(from) {
    const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    const yes = h('button', { type: 'button', className: 'small primary', textContent: 'Join' });
    const no = h('button', { type: 'button', className: 'small ghost', textContent: 'No thanks' });
    yes.dataset.act = 'accept';
    no.dataset.act = 'decline';
    this.invite.replaceChildren(h('span', { textContent: `${from} asks you to join their party.` }), yes, no);
    this.invite.hidden = false;
    clearTimeout(this.inviteTimer);
    this.inviteTimer = setTimeout(() => this.hideInvite(), 110000);
  }

  hideInvite() {
    clearTimeout(this.inviteTimer);
    this.invite.hidden = true;
  }

  render() {
    const p = this.party;
    this.frame.hidden = !p;
    if (!p) { this.frame.replaceChildren(); return; }
    const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    const me = (this.me() ?? '').toLowerCase();
    this.frame.replaceChildren(
      h('div', { className: 'party-head' }, h('span', { textContent: 'Party' }), h('button', { type: 'button', className: 'party-leave', title: 'Leave the party', textContent: 'Leave' })),
      ...p.members.map((m) => {
        const pct = m.maxhp > 0 ? Math.max(0, Math.min(100, Math.round((m.hp / m.maxhp) * 100))) : 0;
        const fill = h('div', { className: 'party-fill' });
        fill.style.width = `${pct}%`;
        if (pct < 30) fill.classList.add('low');
        return h('div', { className: `party-member${m.name.toLowerCase() === me ? ' me' : ''}`, title: `${m.name}: ${m.hp}/${m.maxhp} HP, at ${m.x}, ${m.y}` },
          h('span', { className: 'party-name', textContent: (m.name === p.leader ? '★ ' : '') + m.name }),
          h('div', { className: 'party-bar' }, fill));
      }),
    );
  }
}
