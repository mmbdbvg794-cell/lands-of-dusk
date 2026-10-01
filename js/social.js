// Reading the server's replies for the quest journal, friends, world map
// markers and notes, and trading (server/Social.java, MapStore.java,
// Trade.java). No DOM; tested in node. Each reader's feed(line) returns
// null for a line that isn't its own, else what it has made of it, with
// hide: true for lines that shouldn't show in chat.

export const JOURNAL = 'journal';
export const JOURNAL_ALL = 'journal all';
export const journalSet = ({ flag, title, text, done }) => `journal set ${flag}|${clean(title)}|${clean(text)}|${done ? 1 : 0}`;
export const journalRemove = (flag) => `journal remove ${flag}`;
export const FRIENDS = 'friends';
export const friendAdd = (name) => `friend add ${name}`;
export const friendRemove = (name) => `friend remove ${name}`;
export const MARKERS = 'markers';
export const MAP_NOTES = 'mapnotes';
export const noteAdd = (x, y, text) => `mapnote add ${x} ${y} ${clean(text).slice(0, 80)}`;
export const noteRemove = (x, y) => `mapnote remove ${x} ${y}`;
export const tradeWith = (name) => `trade ${name}`;
export const tradeOffer = (id) => `trade offer ${id}`;
export const tradeBack = (name) => `trade back ${name}`;
export const tradeGold = (n) => `trade gold ${Math.max(0, Math.floor(Number(n) || 0))}`;
export const whisperStart = (name) => `/${name} `;

const clean = (s) => String(s ?? '').replace(/[|\n\r]/g, ' ').trim();

// Collects "<Prefix>: ..." lines until "<Prefix>: end <n>".
class ListReader {
  constructor(prefix, parse) {
    this.re = new RegExp(`^${prefix}: (.*)$`);
    this.parse = parse;
    this.items = [];
  }

  feed(text) {
    const m = this.re.exec(text.trim());
    if (!m) return null;
    const end = /^end (\d+)$/.exec(m[1]);
    if (end) {
      const items = this.items;
      this.items = [];
      return { done: items, hide: true };
    }
    const item = this.parse(m[1]);
    if (item) this.items.push(item);
    return { done: null, hide: true };
  }
}

// The player's journal: [{ title, text, done }], one per quest (the done
// entry wins over the others with the same title).
export class JournalReader extends ListReader {
  constructor() {
    super('Journal', (s) => {
      const p = s.split('|');
      return p.length >= 3 ? { title: p[0], text: p[1], done: p[2] === '1' } : null;
    });
  }

  feed(text) {
    const r = super.feed(text);
    if (r?.done) r.done = mergeQuests(r.done);
    return r;
  }
}

export function mergeQuests(entries) {
  const byTitle = new Map();
  for (const e of entries) {
    const had = byTitle.get(e.title.toLowerCase());
    if (!had || (e.done && !had.done)) byTitle.set(e.title.toLowerCase(), e);
  }
  // Open quests first, then finished ones, each in the order given.
  const all = [...byTitle.values()];
  return [...all.filter((e) => !e.done), ...all.filter((e) => e.done)];
}

// Gods: every entry, [{ flag, title, text, done }].
export class JournalDefReader extends ListReader {
  constructor() {
    super('JournalDef', (s) => {
      const p = s.split('|');
      return p.length >= 4 ? { flag: p[0], title: p[1], text: p[2], done: p[3] === '1' } : null;
    });
  }
}

// The world map notes: [{ x, y, text }].
export class NotesReader extends ListReader {
  constructor() {
    super('MapNote', (s) => {
      const m = /^(-?\d+)\|(-?\d+)\|(.*)$/.exec(s);
      return m ? { x: Number(m[1]), y: Number(m[2]), text: m[3] } : null;
    });
  }
}

// "Friends: a=1,b=0" -> [{ name, online }], or null.
export function parseFriends(text) {
  const m = /^Friends:\s*(.*)$/.exec(text.trim());
  if (!m) return null;
  return m[1].split(',').map((s) => /^(.+)=([01])$/.exec(s.trim())).filter(Boolean).map(([, name, on]) => ({ name, online: on === '1' }));
}

// "Markers: kind|name|x|y;..." -> [{ kind, name, x, y }], or null.
export function parseMarkers(text) {
  const m = /^Markers:\s*(.*)$/.exec(text.trim());
  if (!m) return null;
  return m[1].split(';').map((s) => s.split('|')).filter((p) => p.length === 4 && /^-?\d+$/.test(p[2]) && /^-?\d+$/.test(p[3]))
    .map(([kind, name, x, y]) => ({ kind, name: name.replace(/^(<[^>]*>)+/, ''), x: Number(x), y: Number(y) }));
}

// Whispers ("/name text"): who it's with, and which way, or null.
export function parseWhisper(text) {
  const t = text.trim();
  let m = /^(\S+) tells you:\s?(.*)$/.exec(t);
  if (m) return { who: m[1], incoming: true, text: m[2] };
  m = /^You tell (\S+):\s?(.*)$/.exec(t);
  if (m) return { who: m[1], incoming: false, text: m[2] };
  return null;
}

// Trading. feed() returns { request: name } (someone asks), { table }
// once a whole state has come ({ with, mine, theirs }, each side { gold,
// ready, items }), { closed: why }, { done: what } or a partial { hide }.
export class TradeReader {
  constructor() {
    this.table = null;
  }

  feed(text) {
    const m = /^Trade: (\w+)\s?(.*)$/.exec(text.trim());
    if (!m) return null;
    const [, kind, rest] = m;
    const side = (s) => {
      const [gold, ready, items] = s.split('|');
      return { gold: Number(gold) || 0, ready: ready === '1', items: items ? items.split(';').filter(Boolean) : [] };
    };
    switch (kind) {
      case 'request': return { request: rest, hide: true };
      case 'with': this.table = { with: rest }; return { hide: true };
      case 'mine': if (this.table) this.table.mine = side(rest); return { hide: true };
      case 'theirs': if (this.table) this.table.theirs = side(rest); return { hide: true };
      case 'end': {
        const t = this.table;
        this.table = null;
        return t?.mine && t?.theirs ? { table: t, hide: true } : { hide: true };
      }
      case 'closed': return { closed: rest, hide: false };
      case 'done': return { done: rest, hide: false };
      default: return null;
    }
  }
}
