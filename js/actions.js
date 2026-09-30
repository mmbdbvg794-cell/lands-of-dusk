// What you can do to something on the map, for the click menu. No DOM,
// so it can be tested in node; js/entitymenu.js shows the list.
//
// Entity types are the ones opcode 4 sends (DuskEngine on the server):
// 0 player, 1 item, 2 merchant (Dusk.java's "on a merchant" check looks
// for type 2 on your square), 3 sign or prop, 4 mob (pets too), 5 door.
// Commands follow the server's Commands.java: "a" and "look" take an ID,
// "get" a name, "opendoor" an ID.

import { isStorage, storageKind } from './storage.js';

export const TYPE = { PLAYER: 0, ITEM: 1, MERCHANT: 2, SIGN: 3, MOB: 4, DOOR: 5 };

// Squares apart, counting diagonals as one, like a melee range of 1
// reaching all eight neighbours.
export function distance(ent, x, y) {
  return Math.max(Math.abs(ent.x - x), Math.abs(ent.y - y));
}

// Returns [{ label, cmd, disabled?, hint? }] for `ent`. `me` is
// { x, y, range }: where the player stands and their attack range
// (opcode 28; 1 until the server says).
export function entityActions(ent, me) {
  const look = { label: 'Look', cmd: `look ${ent.id}` };
  const self = ent.type === TYPE.PLAYER && ent.x === me.x && ent.y === me.y;
  // Shared storage opens from next to it (the Storage tab lists it).
  if (isStorage(ent)) {
    const near = Math.abs(ent.x - me.x) <= 1 && Math.abs(ent.y - me.y) <= 1;
    return near ? [{ label: 'Open', cmd: 'storage' }] : [{ label: `Go to the ${storageKind(ent.name)}`, cmd: `goto ${ent.x} ${ent.y}` }];
  }
  switch (ent.type) {
    case TYPE.MOB: {
      const far = distance(ent, me.x, me.y) > Math.max(1, me.range);
      return [
        far
          ? { label: 'Attack', cmd: `a ${ent.id}`, disabled: true, hint: 'too far' }
          : { label: 'Attack', cmd: `a ${ent.id}` },
        look,
      ];
    }
    case TYPE.PLAYER:
      return self ? [{ label: 'Look at yourself', cmd: `look ${ent.id}` }] : [look];
    case TYPE.ITEM:
      return [{ label: 'Pick up', cmd: `get ${ent.name}` }, look];
    case TYPE.DOOR:
      return [{ label: 'Open', cmd: `opendoor ${ent.id}` }, look];
    // Shopping happens by standing on the merchant, so this walks there.
    case TYPE.MERCHANT:
      return ent.x === me.x && ent.y === me.y
        ? [{ label: 'Shop', shop: true }, look]
        : [{ label: 'Go to shop', cmd: `goto ${ent.x} ${ent.y}` }, look];
    case TYPE.SIGN:
      return [{ label: 'Read', cmd: `look ${ent.id}` }];
    default:
      return [look];
  }
}
