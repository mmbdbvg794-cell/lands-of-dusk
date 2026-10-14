// The Mage Guild's tower, outside: a round stone tower on the isle off
// Eastreach, where flan marked "mage guild here" (1918,1291). Like the
// buildings of the city at 185,95, you never walk into it: its door sends
// you to the first of five floors built as rooms out in the empty sea at
// flan's "Mage guild rooms" (46,559; tools/world/cities/magetowerfloors.mjs).
//
//   tower   1912-1924 x 1280-1292 (a 13-square circle of stone)
//   door    1918,1292: Mages and invited members (guild_mage) go in, to the
//           first floor; everyone else is turned back. Gods always.
//   plaza   1916-1920 x 1293-1294, the way back out
//
// Nothing sails here yet: the isle needs a ferry route before players can
// reach it. Built by tools/world/city.mjs.

import { FLOOR1_IN, TOWER_OUT } from './magetowerfloors.mjs';

export const DOOR = [1918, 1292];

export default {
  name: 'The Mage Guild tower (outside)',
  origin: [1912, 1280],
  size: [13, 16],
  seed: 31,
  build(p) {
    p.oval(0, 0, 13, 13, 'S');      // the tower's wall
    p.oval(2, 2, 9, 9, 's');        // its roof, darker
    p.oval(5, 5, 3, 3, 'S');        // the spire
    for (const [x, y] of [[3, 11], [9, 11], [0, 6], [12, 6]]) p.set(x, y, 'i'); // torches on the wall
    p.set(6, 12, 'D');
    p.fill(4, 13, 5, 2, 'o');       // the plaza before the door
    p.path([[6, 15], [6, 15]]);
    p.file(`defMoveActions/${DOOR[0]}_${DOOR[1]}`, [
      '#The Mage Guild tower\'s door: Mages and those the Guild has invited (guild_mage) go up to',
      '#the first floor (tools/world/cities/magetower.mjs). Gods always.',
      'if > trigger privs 2',
      `\tset trigger locxy ${FLOOR1_IN[0]} ${FLOOR1_IN[1]}`,
      '\tendscript',
      'end',
      'if ! isPlayer trigger',
      '\tendscript',
      'end',
      'if or hasCondition trigger "class_mage" hasCondition trigger "guild_mage"',
      '\tchat trigger "The door knows you, and opens."',
      `\tset trigger locxy ${FLOOR1_IN[0]} ${FLOOR1_IN[1]}`,
      '\tendscript',
      'end',
      'chat trigger "The door will not open. Only mages and those the Mage Guild has invited may enter."',
      'inc trigger locy 1',
      'endscript',
      '',
    ].join('\n'));
  },
};
export { TOWER_OUT };
