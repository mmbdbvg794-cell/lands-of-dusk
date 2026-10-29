// The Mage Guild tower, inside: five floors built as rooms out in the empty
// sea at flan's "Mage guild rooms" (46,559), reached only through the
// tower's door on the isle (tools/world/cities/magetower.mjs), the way the
// city at 185,95 does its insides. Stairs up and down are walk-on squares
// that move you between floors; going up needs the next rank's arcane
// points (server/Classes.java's guild ranks), and the top also the
// Archmage's quest flag. Gods go anywhere.
//
//   floor 1  the Initiates' Hall       arcane trainer; the door back out
//   floor 2  the Apprentices' Library  arcane 10 (Apprentice): shelves, bunks
//   floor 3  the Adepts' Study         arcane 25 (Adept): two alchemy tables
//   floor 4  the Masters' Sanctum      arcane 50 (Master): a crystal circle
//   floor 5  the Archmage's Spire      arcane 75 and archmage_quest (Archmage);
//                                      the Hidden Order's trainer (forbidden
//                                      group: only those it's open to see it)
//
// Each floor is 15 x 11 (walls round 13 x 9), 4 rows of sea apart, at
// x 40-54, y 540, 555, 570, 585, 600. Built by tools/world/city.mjs.

const X0 = 40, Y0 = 540, W = 15, H = 11, GAP = 15;
const FLOORS = [
  { name: "the Initiates' Hall", rank: 'Initiate', points: 0, floor: 'l' },
  { name: "the Apprentices' Library", rank: 'Apprentice', points: 10, floor: 'M' },
  { name: "the Adepts' Study", rank: 'Adept', points: 25, floor: 'M' },
  { name: "the Masters' Sanctum", rank: 'Master', points: 50, floor: 't' },
  { name: "the Archmage's Spire", rank: 'Archmage', points: 75, floor: 't', flag: 'archmage_quest' },
];
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];
const top = (k) => Y0 + k * GAP; // floor k's top wall (k from 0)

// Map squares (absolute) of the things on floor k.
const at = (k, x, y) => [X0 + x, top(k) + y];
const UP = (k) => at(k, 13, 1);       // stairs up, top right
const DOWN = (k) => at(k, 1, 1);      // stairs down, top left
const FROM_BELOW = (k) => at(k, 1, 2); // where you arrive coming up
const FROM_ABOVE = (k) => at(k, 13, 2); // where you arrive coming down
const DOOR_OUT = at(0, 7, 10);        // floor 1's door, back outside

export const FLOOR1_IN = at(0, 7, 8); // where the tower's door puts you
export const TOWER_OUT = [1918, 1294]; // the plaza before the tower's door

const script = (lines) => lines.join('\n') + '\n';

export default {
  name: 'The Mage Guild tower (floors)',
  origin: [X0, Y0],
  size: [W, GAP * (FLOORS.length - 1) + H],
  seed: 32,
  oldWorld: true,          // the sea west of the old world
  // Only empty sea, or the tower's own tiles (to rebuild it): stone wall,
  // torch, door, stairs and the floors it lays.
  mayBuild: (was) => was === 0 || [59, 24, 23, 106, 107, 41, 42, 43, 105, 96, 128, 101].includes(was),
  build(p) {
    FLOORS.forEach((f, k) => {
      const y = k * GAP;
      p.building(0, y, W, H, { wall: 'S', floor: f.floor });
      p.set(13, y + 1, 'u');
      if (k > 0) p.set(1, y + 1, 'U');
      p.set(4, y, 'i');
      p.set(10, y, 'i');
      p.prop('candlestick stand', 1, y + 9);
      p.prop('candlestick stand', 13, y + 9);
      p.sign(`${f.name}`, f.name.replace(/^the /, 'The '), 7, y + 1);
      // Up: the next floor's rank.
      if (k < FLOORS.length - 1) {
        const next = FLOORS[k + 1];
        const [ux, uy] = UP(k), [ax, ay] = FROM_BELOW(k + 1);
        p.file(`defMoveActions/${ux}_${uy}`, script([
          `#The Mage Guild tower: up to the ${ORDINAL[k + 1]} floor, ${next.name} (${next.rank}: arcane ${next.points}${next.flag ? ` and ${next.flag}` : ''}).`,
          'if > trigger privs 2',
          `\tset trigger locxy ${ax} ${ay}`,
          '\tendscript',
          'end',
          `if < trigger skill "arcane group" ${next.points}`,
          `\tchat trigger "Only ${/^[AEIOU]/.test(next.rank) ? 'an' : 'a'} ${next.rank} of the Mage Guild may climb to ${next.name}."`,
          '\tinc trigger locy 1',
          '\tendscript',
          'end',
          ...(next.flag ? [
            `if ! hasCondition trigger ${next.flag}`,
            `\tchat trigger "The stair to ${next.name} is sealed. Only an Archmage, proven before the Guild, may climb it."`,
            '\tinc trigger locy 1',
            '\tendscript',
            'end',
          ] : []),
          `chat trigger "You climb to ${next.name}."`,
          `set trigger locxy ${ax} ${ay}`,
          'endscript',
        ]));
      }
      // Down: the floor below.
      if (k > 0) {
        const [dx, dy] = DOWN(k), [ax, ay] = FROM_ABOVE(k - 1);
        p.file(`defMoveActions/${dx}_${dy}`, script([
          `#The Mage Guild tower: down to the ${ORDINAL[k - 1]} floor, ${FLOORS[k - 1].name}.`,
          `set trigger locxy ${ax} ${ay}`,
          'endscript',
        ]));
      }
    });
    // Furnishing (props block their square: rows 1-3, the arrival rows,
    // stay clear, so every floor's stairs can be reached).
    const props = (k, list) => { for (const [name, x, yy] of list) p.prop(name, x, k * GAP + yy); };
    // 1, the Initiates' Hall: a runner to the trainer, couches, braziers.
    p.fill(7, 5, 1, 5, 'm');
    props(0, [['couch', 3, 6], ['couch', 11, 6], ['brazier', 2, 4], ['brazier', 12, 4]]);
    // 2, the Apprentices' Library: shelves (dark wood), chairs, bunks.
    for (const yy of [5, 7]) { p.fill(3, GAP + yy, 3, 1, 'W'); p.fill(9, GAP + yy, 3, 1, 'W'); }
    props(1, [['chair', 6, 8], ['chair', 8, 8], ['bunk', 2, 8], ['bunk', 12, 8]]);
    // 3, the Adepts' Study: two alchemy tables (Alchemy works at them).
    p.fill(6, 2 * GAP + 4, 3, 3, 'm');
    props(2, [['alchemy table', 4, 5], ['alchemy table', 10, 5], ['chair', 4, 7], ['chair', 10, 7], ['brazier', 2, 7], ['brazier', 12, 7]]);
    // 4, the Masters' Sanctum: a crystal circle round a statue.
    p.oval(4, 3 * GAP + 4, 7, 5, 'c');
    props(3, [['statue', 7, 6], ['brazier', 3, 4], ['brazier', 11, 4], ['brazier', 3, 8], ['brazier', 11, 8]]);
    // 5, the Archmage's Spire: a crystal ring round the Hidden Order's
    // trainer, and a throne.
    p.oval(5, 4 * GAP + 3, 5, 5, 'C');
    props(4, [['Throne', 7, 3], ['brazier', 3, 5], ['brazier', 11, 5], ['statue', 2, 8], ['statue', 12, 8]]);

    // Floor 1: the door out, and the Guild's trainer.
    p.set(7, 10, 'D');
    p.file(`defMoveActions/${DOOR_OUT[0]}_${DOOR_OUT[1]}`, script([
      '#The Mage Guild tower: the door out, to the plaza on the isle.',
      `set trigger locxy ${TOWER_OUT[0]} ${TOWER_OUT[1]}`,
      'endscript',
    ]));
    p.merchant(7, 4, ['train:arcane group', 'train:Spell Power', 'train:Mana Regen'], 'Mage Guild Trainer');
    // Floor 5: the Hidden Order's trainer (Classes.wares shows it only to
    // those the forbidden school is open to).
    p.merchant(7, 4 * GAP + 5, ['train:forbidden group'], 'Hidden Order Trainer');
  },
};
