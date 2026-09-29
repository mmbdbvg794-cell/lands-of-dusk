// What the race buttons say about each race, from js/raceinfo.json (built
// by tools/raceinfo.py from the server's defRaces). No DOM; tested in node.

const STAT_NAMES = { STR: 'Strength', DEX: 'Dexterity', INT: 'Intelligence', CON: 'Constitution', WIS: 'Wisdom' };
const ORDER = ['STR', 'DEX', 'INT', 'CON', 'WIS'];

// For each race: its bonus tags ("+3 DEX"), their total, a note if it
// starts somewhere other than most races, and a sentence for the tooltip.
export function describeRaces(info) {
  const races = Object.entries(info ?? {});
  // The usual starting point is the one most races share.
  const starts = new Map();
  for (const [, r] of races) {
    if (!r.start) continue;
    const k = `${r.start.x},${r.start.y}`;
    starts.set(k, (starts.get(k) ?? 0) + 1);
  }
  const usual = [...starts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  const out = {};
  for (const [name, r] of races) {
    const bonuses = ORDER.filter((s) => r.bonuses?.[s]).map((s) => ({ stat: s, n: r.bonuses[s] }));
    const tags = bonuses.map(({ stat, n }) => `${n > 0 ? '+' : ''}${n} ${stat}`);
    const total = bonuses.reduce((sum, b) => sum + b.n, 0);
    const elsewhere = r.start && usual && starts.size > 1 && `${r.start.x},${r.start.y}` !== usual;
    const words = bonuses.map(({ stat, n }) => `${n > 0 ? '+' : ''}${n} ${STAT_NAMES[stat]}`);
    const title = [
      `${cap(name)}: ${words.length ? words.join(', ') : 'no stat bonuses'}.`,
      elsewhere ? `Starts somewhere other than the other races (${r.start.x}, ${r.start.y}).` : '',
    ].filter(Boolean).join(' ');
    out[name] = { tags, total, elsewhere: !!elsewhere, image: r.image ?? null, title };
  }
  return out;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
