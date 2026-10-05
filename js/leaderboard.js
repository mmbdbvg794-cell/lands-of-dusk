// The leaderboard (leaderboard.html): server/Admin.java's leaderboard.json
// -> what the page shows. No DOM; tested in node.

const RACE_NAMES = { human: 'Human', elf: 'Elf', darkelf: 'Dark elf', lizardman: 'Lizardman' };
const STALE_MS = 20 * 60 * 1000; // the server writes every 5 minutes

const played = (ms) => {
  const h = Math.floor((Number(ms) || 0) / 3600000);
  if (h < 1) return 'under an hour';
  return h === 1 ? '1 hour' : `${h} hours`;
};
const big = (n) => Math.floor(Number(n) || 0).toLocaleString('en-US');

// data: { updated, players: [{ name, race, title, exp, maxhp, stats,
// quests, playtime }] } (best first) or null.
// -> { note, empty, rows: [{ rank, name, title, race, exp, quests, hp, stats, played }] }
export function describeBoard(data, now) {
  if (!data || !Array.isArray(data.players) || !data.updated) {
    return { note: 'The leaderboard isn\'t available right now.', empty: 'Is the server running?', rows: [] };
  }
  const rows = data.players
    .filter((p) => p && p.name)
    .map((p, i) => ({
      rank: i + 1,
      name: String(p.name),
      title: String(p.title ?? '').replace(/\.$/, '').trim(),
      race: RACE_NAMES[String(p.race ?? '').toLowerCase()] ?? String(p.race ?? ''),
      exp: big(p.exp),
      quests: Math.max(0, Math.floor(Number(p.quests) || 0)),
      hp: big(p.maxhp),
      stats: big(p.stats),
      played: played(p.playtime),
    }));
  const age = now - data.updated;
  const note = age > STALE_MS ? 'The server hasn\'t updated this lately; it may be down.' : `Ranked by experience. Updated every few minutes${age < 60000 ? '' : ` (last ${Math.floor(age / 60000)} min ago)`}.`;
  return { note, empty: 'Nobody has made a name for themselves yet.', rows };
}
