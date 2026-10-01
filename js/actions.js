// What you can do to something on the map, for the click menu. No DOM,
// so it can be tested in node; js/entitymenu.js shows the list.
//
// Entity types are the ones opcode 4 sends (DuskEngine on the server):
// 0 player, 1 item, 2 merchant (Dusk.java's "on a merchant" check looks
// for type 2 on your square), 3 sign or prop, 4 mob (pets too), 5 door.
// Commands follow the server's Commands.java: "a" and "look" take an ID,
// "get" a name, "opendoor" an ID.

import { isStorage, isChest, storageKind, isTeller, unlockCommand, BOX, TELLER_REACH } from './storage.js';
import { talkCommand } from './talk.js';
import { bareName } from './world.js';

// Signs and props are both type 3; signs show the sign picture (the
// server's signimage, 1) and are called "sign" unless they've been named.
export const isSign = (ent) => ent.type === 3 && (ent.image === 1 || /sign$/i.test(bareName(ent.name ?? '')));

export const TYPE = { PLAYER: 0, ITEM: 1, MERCHANT: 2, SIGN: 3, MOB: 4, DOOR: 5 };

// Squares apart, counting diagonals as one, like a melee range of 1
// reaching all eight neighbours.
export function distance(ent, x, y) {
  return Math.max(Math.abs(ent.x - x), Math.abs(ent.y - y));
}

// Whether storage is within reach: on your square or next to it.
export const storageReach = (ent, me) => Math.abs(ent.x - me.x) <= 1 && Math.abs(ent.y - me.y) <= 1;

// Returns [{ label, cmd?, storage?, disabled?, hint?, god? }] for `ent`
// (storage: 'open' or 'close' the Storage tab, instead of a command). `me` is
// { x, y, range, god }: where the player stands, their attack range
// (opcode 28; 1 until the server says), and whether they're a god, who
// can also remove things ("unset", or "storage remove" standing on it).
export function entityActions(ent, me) {
  const acts = playerActions(ent, me);
  const name = bareName(ent.name ?? '');
  // Tellers stand behind counters, so they're reached from further away:
  // straight to your deposit box, or a talk.
  const teller = isTeller(ent, me.looks);
  const reach = teller ? TELLER_REACH : 2;
  const within = Math.abs(ent.x - me.x) <= reach && Math.abs(ent.y - me.y) <= reach;
  if (teller && within) acts.unshift({ label: 'Deposit box', cmd: BOX });
  // NPCs with something to say (me.talkers: lower-case names, from the
  // server's "talk names"; a named prop talks like what it looks like, from
  // me.looks) get Talk first.
  const look = me.looks?.get(name.toLowerCase());
  if (ent.type !== TYPE.PLAYER && (me.talkers?.has(name.toLowerCase()) || (look && me.talkers?.has(look)))) {
    acts.unshift(within ? { label: 'Talk', cmd: talkCommand(ent.id) } : { label: `Go talk to ${name}`, cmd: `goto ${ent.x} ${ent.y}` });
  }
  // Gods can look at and change a player's flags (quest testing).
  if (me.god && ent.type === TYPE.PLAYER) acts.push({ label: 'Flags (god)', flags: true, god: true });
  if (!me.god || ent.type === TYPE.PLAYER) return acts;
  // Signs can be renamed and rewritten; NPCs given something to say.
  if (isSign(ent)) acts.push({ label: 'Rename (god)', sign: 'name', god: true }, { label: 'Edit text (god)', sign: 'text', god: true });
  else if (!isStorage(ent) && (ent.type === TYPE.SIGN || ent.type === TYPE.MOB || ent.type === TYPE.MERCHANT)) acts.push({ label: 'Edit dialogue (god)', dialogue: name, god: true });
  // Props: what "Look" says about them.
  if (ent.type === TYPE.SIGN && !isSign(ent) && !isStorage(ent)) acts.push({ label: 'Edit description (god)', describe: true, god: true });
  // Chests can be locked to a key item (barrels stay open).
  if (isChest(ent)) {
    const near = storageReach(ent, me);
    acts.push(near ? { label: 'Lock with a key… (god)', lock: true, god: true } : { label: 'Lock with a key… (god)', disabled: true, hint: 'stand next to it', god: true });
    acts.push(near ? { label: 'Unlock (god)', cmd: `${unlockCommand(ent.id)}`, god: true } : { label: 'Unlock (god)', disabled: true, hint: 'stand next to it', god: true });
  }
  if (isStorage(ent)) {
    if (ent.x === me.x && ent.y === me.y) acts.push({ label: 'Remove (god)', cmd: 'storage remove', god: true });
    else acts.push({ label: 'Remove (god)', disabled: true, hint: 'stand on it', god: true });
  } else {
    acts.push({ label: 'Remove (god)', cmd: `unset ${ent.id}`, god: true });
  }
  return acts;
}

function playerActions(ent, me) {
  const look = { label: 'Look', cmd: `look ${ent.id}` };
  const self = ent.type === TYPE.PLAYER && ent.x === me.x && ent.y === me.y;
  // Shared storage opens (and closes) from next to it; the Storage tab
  // lists it. me.storageOpen is the ID of the one that's open.
  if (isStorage(ent)) {
    if (!storageReach(ent, me)) return [{ label: `Go to the ${storageKind(ent.name)}`, cmd: `goto ${ent.x} ${ent.y}` }];
    return me.storageOpen === ent.id ? [{ label: 'Close', storage: 'close' }] : [{ label: 'Open', storage: 'open' }];
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
    // Signs and props are both type 3: signs are read, the rest looked at.
    case TYPE.SIGN:
      return [{ label: isSign(ent) ? 'Read' : 'Look', cmd: `look ${ent.id}` }];
    default:
      return [look];
  }
}
