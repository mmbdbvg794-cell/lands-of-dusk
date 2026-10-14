// The Mage Guild tower, inside: five floors built as rooms out in the empty
// sea at flan's "Mage guild rooms" (46,559), reached only through the
// tower's door on the isle (tools/world/cities/magetower.mjs), the way the
// city at 185,95 does its insides. Stairs up and down are walk-on squares
// that move you between floors; going up needs the next rank's arcane
// points (server/Classes.java's guild ranks), and the top also the
// Archmage's quest flag. Gods go anywhere.
//
//   floor 1  the Initiates' Hall       arcane trainer; the door back out
//   floor 2  the Apprentices' Library  arcane 10 (Apprentice)
//   floor 3  the Adepts' Study         arcane 25 (Adept)
//   floor 4  the Masters' Sanctum      arcane 50 (Master)
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
  mayBuild: (was) => was === 0, // only empty sea
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
      p.sign(`${f.name}`, `The Mage Guild: ${f.name}, the ${ORDINAL[k]} floor.${k < FLOORS.length - 1 ? ` The stairs up are for ${FLOORS[k + 1].rank}s and above.` : ''}`, 7, y + 1);
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
    // Floor 1: the door out, and the Guild's trainer.
    p.set(7, 10, 'D');
    p.file(`defMoveActions/${DOOR_OUT[0]}_${DOOR_OUT[1]}`, script([
      '#The Mage Guild tower: the door out, to the plaza on the isle.',
      `set trigger locxy ${TOWER_OUT[0]} ${TOWER_OUT[1]}`,
      'endscript',
    ]));
    p.merchant(7, 4, ['train:arcane group', 'train:Spell Power', 'train:Mana Regen']);
    // Floor 5: the Hidden Order's trainer (Classes.wares shows it only to
    // those the forbidden school is open to).
    p.merchant(7, 4 * GAP + 5, ['train:forbidden group']);
  },
};
