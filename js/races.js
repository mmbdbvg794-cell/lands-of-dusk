// What the race buttons say about each race, from js/raceinfo.json (built
// by tools/raceinfo.py from the server's defRaces). No DOM; tested in node.

const STAT_NAMES = { STR: 'Strength', DEX: 'Dexterity', INT: 'Intelligence', CON: 'Constitution', WIS: 'Wisdom' };
const ORDER = ['STR', 'DEX', 'INT', 'CON', 'WIS'];
// Names for starting points, by "x,y" as in the race files: a named one
// is always shown. A race that starts somewhere unnamed, away from where
// most races start, just "starts elsewhere".
export const PLACES = { '110,96': 'the Underdark', '1271,960': 'the Underdark', '415,1307': 'the Grove of Waking' };

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
  // (Only when two or more share it.)
  const top = [...starts.entries()].sort((a, b) => b[1] - a[1])[0];
  const usual = top?.[1] > 1 ? top[0] : null;

  const out = {};
  for (const [name, r] of races) {
    const bonuses = ORDER.filter((s) => r.bonuses?.[s]).map((s) => ({ stat: s, n: r.bonuses[s] }));
    const tags = bonuses.map(({ stat, n }) => `${n > 0 ? '+' : ''}${n} ${stat}`);
    const total = bonuses.reduce((sum, b) => sum + b.n, 0);
    const at = r.start ? `${r.start.x},${r.start.y}` : null;
    const place = at ? PLACES[at] ?? null : null;
    const elsewhere = !!at && (place != null || (usual != null && starts.size > 1 && at !== usual));
    const note = elsewhere ? (place ? `starts in ${place}` : 'starts elsewhere') : null;
    const words = bonuses.map(({ stat, n }) => `${n > 0 ? '+' : ''}${n} ${STAT_NAMES[stat]}`);
    const title = [
      `${cap(name)}: ${words.length ? words.join(', ') : 'no stat bonuses'}.`,
      elsewhere ? (place ? `Starts in ${place}.` : `Starts somewhere other than the other races (${r.start.x}, ${r.start.y}).`) : '',
    ].filter(Boolean).join(' ');
    out[name] = { tags, total, elsewhere: !!elsewhere, note, image: r.image ?? null, title };
  }
  return out;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
