// Who's online (who.html): server/Who.java's who.json -> what the page shows.
// No DOM; tested in node.

const RACE_NAMES = { human: 'Human', elf: 'Elf', darkelf: 'Dark elf', lizardman: 'Lizardman' };
const STALE_MS = 3 * 60 * 1000; // the server writes every 30 s

const ago = (ms) => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
};

// data: { updated, players: [{ name, race, title, god, since, clan, leader }] } or null.
// -> { count, updated, empty, rows: [{ name, race, title, god, clan, online }] }
// clan is what the page shows: "Clan Name", "Clan Name (leader)", or ''.
export function describeWho(data, now) {
  if (!data || !Array.isArray(data.players) || !data.updated) {
    return { count: "Can't tell right now.", updated: '', empty: 'The list isn\'t available. Is the server running?', rows: [] };
  }
  if (now - data.updated > STALE_MS) {
    return { count: "Can't tell right now.", updated: `Last heard from the server ${ago(now - data.updated)} ago.`, empty: 'The server hasn\'t updated the list lately. It may be down or restarting.', rows: [] };
  }
  const rows = data.players
    .map((p) => ({
      name: String(p.name ?? ''),
      race: RACE_NAMES[String(p.race ?? '').toLowerCase()] ?? String(p.race ?? ''),
      // Titles read "the newbie." in the game.
      title: String(p.title ?? '').replace(/\.$/, '').trim(),
      god: !!p.god,
      clan: p.clan ? `${String(p.clan)}${p.leader ? ' (leader)' : ''}` : '',
      online: p.since ? `online ${ago(now - p.since)}` : '',
    }))
    .filter((p) => p.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const n = rows.length;
  return {
    count: n === 0 ? 'Nobody is playing right now.' : n === 1 ? '1 player online' : `${n} players online`,
    updated: `Updated ${ago(now - data.updated)}${now - data.updated < 60000 ? '' : ' ago'}.`,
    empty: 'Nobody is playing right now. Be the first!',
    rows,
  };
}
