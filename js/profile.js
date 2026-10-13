// A player's profile page (profile.html?name=...), from profiles.json
// (server/Admin.java): who they are, their gear, quests and achievements.
// No DOM; tested in node.

const played = (ms) => {
  const h = Math.floor((ms || 0) / 3600000), m = Math.floor(((ms || 0) % 3600000) / 60000);
  return h ? `${h} h ${m} min` : `${m} min`;
};
const day = (ms) => new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

// data: profiles.json; name: from the address -> { found, name, ... } |
// { found: false, message }.
export function describeProfile(data, name) {
  const key = String(name ?? '').trim().toLowerCase();
  if (!key) return { found: false, message: 'Whose profile? Pick a name on the leaderboard.' };
  const p = data?.players?.[key];
  if (!p) return { found: false, message: `There's no profile for ${String(name).trim()} yet. Profiles are for players with some experience (gods aren't listed), and are updated every few minutes.` };
  const s = p.stats ?? {};
  return {
    found: true,
    name: p.name,
    title: p.title && p.title !== 'null' ? p.title : '',
    race: p.race ? p.race[0].toUpperCase() + p.race.slice(1) : '',
    cls: p.class ?? '', // the class's name (server/Classes.java), '' if none yet
    online: !!p.online,
    facts: [
      ['Experience', Number(p.exp || 0).toLocaleString()],
      ['Health', String(p.maxhp ?? 0)],
      ['Played', played(p.playtime)],
      ['Quests finished', String((p.quests ?? []).length)],
      ['Achievements', String((p.achievements ?? []).length)],
      // Duels in the Duelling Ring (server/Duel.java), once there are any.
      ...(p.duels && (p.duels.wins || p.duels.losses) ? [['Duels', `${p.duels.wins} won, ${p.duels.losses} lost`]] : []),
    ],
    stats: [['Strength', s.str], ['Dexterity', s.dex], ['Constitution', s.con], ['Intelligence', s.int], ['Wisdom', s.wis]].map(([k, v]) => [k, String(v ?? 0)]),
    gear: (p.gear ?? []).map((g) => [g.slot, g.item]),
    quests: [...(p.quests ?? [])],
    achievements: (p.achievements ?? []).slice().sort((a, b) => b.when - a.when).map((a) => ({ title: a.title, what: a.what, when: day(a.when) })),
    updated: data.updated ? new Date(data.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
  };
}
