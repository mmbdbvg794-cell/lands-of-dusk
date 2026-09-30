// Makes sense of opcode 8's stats text for the Stats tab. The server
// sends plain lines, e.g.
//
//   37 gp / 0 exp / str: 7 + -1 / ... / DamMod: 600 / Range: 1 / AC: 42 /
//   (blank) / Stamina: 30/30 / -Affected by- / thirst / -Skills- / -Spells-
//
// so this picks out what it recognises and keeps the rest as plain lines,
// in case a server words things differently. No DOM; tested in node.

const ATTRIBUTES = { str: 'Strength', int: 'Intelligence', dex: 'Dexterity', con: 'Constitution', wis: 'Wisdom' };
const LABELS = { dammod: 'Damage modifier', ac: 'Armour (AC)', range: 'Range' };

export function parseStats(lines) {
  const out = { gold: null, exp: null, attributes: [], values: [], bars: [], sections: [], other: [] };
  let section = null; // after a "-Title-" line, lines belong to it
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^-(.+)-$/))) {
      section = { title: m[1].trim(), items: [] };
      out.sections.push(section);
    } else if (section) {
      section.items.push(line);
    } else if ((m = line.match(/^(-?\d+) gp$/i))) {
      out.gold = Number(m[1]);
    } else if ((m = line.match(/^(-?\d+) exp$/i))) {
      out.exp = Number(m[1]);
    } else if ((m = line.match(/^(\w+): (-?\d+)(?: \+ (-?\d+))?$/)) && ATTRIBUTES[m[1].toLowerCase()]) {
      // "str: 7 + 1", or just "str: 7" when there's no bonus.
      out.attributes.push({ key: m[1].toLowerCase(), label: ATTRIBUTES[m[1].toLowerCase()], base: Number(m[2]), bonus: Number(m[3] ?? 0) });
    } else if ((m = line.match(/^([\w ]+): (-?\d+)\/(-?\d+)$/))) {
      out.bars.push({ label: m[1], value: Number(m[2]), max: Number(m[3]) });
    } else if ((m = line.match(/^([\w ]+): (.+)$/))) {
      out.values.push({ label: LABELS[m[1].toLowerCase()] ?? m[1], value: m[2] });
    } else {
      out.other.push(line);
    }
  }
  return out;
}

// Conditions ("-Affected by-") include the server's quest and place flags
// (visitedSlots, atTrainingPlace, ...), which mean nothing to a player.
// These are the ones worth showing, with how to say them.
const PLAYER_CONDITIONS = { hunger: 'Hungry', thirst: 'Thirsty' };

// The conditions a player should see, as labels.
export function playerConditions(names) {
  return names.map((n) => PLAYER_CONDITIONS[n.trim().toLowerCase()]).filter(Boolean);
}
