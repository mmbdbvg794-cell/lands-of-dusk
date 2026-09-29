// Incoming-message parser: one opcode byte, then an opcode-specific payload.
//
// Byte layouts follow Dusk.java's run() switch exactly (see
// DUSK_PROTOCOL_REFERENCE.md). Every opcode is fully consumed here even if
// nothing in the UI uses it yet, so the stream never drifts out of sync.
//
// Almost every field is a newline-terminated text line; the exceptions are
// the opcode byte itself and the entity ID in 24-27, which is a raw
// 8-byte big-endian long.

import { NeedMoreData, ProtocolError, isJavaInt, parseJavaInt } from './bytereader.js';

export const OP = {
  DISCONNECT: 0,
  RESOURCE_ADDRESS: 1,
  MAP: 2,
  TEXT: 3,
  ENTITY: 4,
  STATUS: 5,
  INVENTORY: 6,
  EQUIPMENT: 7,
  STATS: 8,
  NOT_LOADED: 9,
  ACTIONS: 10,
  LOAD_MUSIC: 11,
  PLAY_MUSIC: 12,
  NOT_DEAD: 13,
  LOADED: 14,
  PLAY_SFX: 15,
  REMOVE_ENTITY: 16,
  MERCHANT_WARES: 17,
  EDIT_WINDOW: 18,
  MAP_SIZE: 19,
  EDIT_OR_LIST: 20,
  CLOSE_MERCHANT: 21,
  SELL_LIST: 22,
  COLOR_TEXT: 23,
  MOVE_NORTH: 24,
  MOVE_SOUTH: 25,
  MOVE_WEST: 26,
  MOVE_EAST: 27,
  RANGE: 28,
  SET_FLAG: 29,
  CLEAR_FLAGS: 30,
  ENTITY_IMAGE: 31,
  TARGET_HP: 32,
  // Only sent by a friend's modified server (see the reference). Formats
  // are inferred from a capture; we consume them but don't act on them.
  // 34, 36 and 37 also exist there but their formats aren't known yet.
  GEAR: 33,
  SPELLBOOK: 35,
  STAMINA: 38,
  SHIPS: 39,
};

const OP_NAMES = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));

export function isKnownOp(op) {
  return op === -1 || op in OP_NAMES;
}

export function opName(op) {
  return OP_NAMES[op] ?? `UNKNOWN_${op}`;
}

export const EQUIPMENT_SLOTS = ['wield', 'arms', 'legs', 'torso', 'waist', 'neck', 'skull', 'eyes', 'hands'];

// Parse one complete message. Throws NeedMoreData if the buffer ends
// mid-message; the caller is responsible for mark()/reset().
// `ctx.mapSize` must be kept current (opcode 19 changes it).
export function parseMessage(r, ctx) {
  const op = r.readByte();
  const msg = { op };

  switch (op) {
    case -1: // DataInputStream returned 0xFF; Dusk.java's loop exits on it.
    case OP.DISCONNECT:
    case OP.NOT_LOADED:
    case OP.NOT_DEAD:
    case OP.LOADED:
    case OP.CLOSE_MERCHANT:
    case OP.CLEAR_FLAGS:
      break;

    case OP.RESOURCE_ADDRESS:
      msg.address = r.readLine();
      break;

    case OP.MAP: {
      msg.x = r.readInt();
      msg.y = r.readInt();
      // Java stores shrMap[i][i2] with i as the outer loop, i.e. column-major:
      // tiles[x][y].
      const n = ctx.mapSize;
      msg.tiles = [];
      for (let x = 0; x < n; x++) {
        const col = new Array(n);
        for (let y = 0; y < n; y++) col[y] = r.readInt();
        msg.tiles.push(col);
      }
      break;
    }

    case OP.TEXT:
      msg.text = r.readLine();
      break;

    case OP.ENTITY: {
      msg.name = r.readLine();
      msg.type = r.readInt();
      msg.id = r.readInt();
      msg.x = r.readInt();
      msg.y = r.readInt();
      msg.image = r.readInt();
      // Only players (type 0) carry an animation step.
      msg.step = msg.type === 0 ? r.readInt() : -1;
      msg.hideName = r.readLine().trim().toLowerCase() === 'true';
      if (msg.type === 0 || msg.type === 4) {
        msg.hp = r.readInt();
        msg.maxhp = r.readInt();
      }
      break;
    }

    case OP.STATUS:
      msg.hp = r.readInt();
      msg.maxhp = r.readInt();
      msg.mp = r.readInt();
      msg.maxmp = r.readInt();
      break;

    case OP.INVENTORY: {
      // [slotType, (name, id, slotType)*] ending at the first line that
      // isn't an integer where a slotType is expected (Java detects the end
      // by catching the NumberFormatException).
      msg.items = [];
      let line = r.readLine();
      while (isJavaInt(line)) {
        const slot = parseJavaInt(line);
        const name = r.readLine();
        const idLine = r.readLine();
        if (!isJavaInt(idLine)) break; // Java would bail here too.
        msg.items.push({ name, id: parseJavaInt(idLine), slot });
        line = r.readLine();
      }
      break;
    }

    case OP.EQUIPMENT:
      msg.slots = {};
      for (const slot of EQUIPMENT_SLOTS) {
        const name = r.readLine();
        msg.slots[slot] = name === 'none' ? null : { name, id: r.readInt() };
      }
      break;

    case OP.STATS:
      msg.lines = readUntil(r, '.');
      break;

    case OP.ACTIONS:
      msg.actions = readUntil(r, '.');
      break;

    case OP.LOAD_MUSIC: {
      // The Java *application* skips this payload entirely (only the applet
      // reads it); we parse it the way the applet does.
      const types = r.readInt();
      msg.music = [];
      for (let t = 0; t < types; t++) {
        const count = r.readInt();
        const urls = [];
        for (let s = 0; s < count; s++) urls.push(r.readLine());
        msg.music.push(urls);
      }
      break;
    }

    // Java swallows parse errors for these two, so be equally lenient.
    case OP.PLAY_MUSIC:
      msg.type = parseInt(r.readLine(), 10);
      break;

    case OP.PLAY_SFX:
      msg.index = parseInt(r.readLine(), 10);
      break;

    case OP.REMOVE_ENTITY:
      msg.id = parseJavaInt(r.readLine());
      break;

    case OP.MERCHANT_WARES:
      msg.items = readUntil(r, '.');
      break;

    case OP.EDIT_WINDOW:
    case OP.EDIT_OR_LIST:
      // Both shapes of opcode 20 consume the same bytes: title + lines.
      msg.title = r.readLine();
      msg.lines = readUntil(r, '--EOF--');
      break;

    case OP.MAP_SIZE:
      msg.size = r.readInt();
      break;

    case OP.SELL_LIST:
      msg.items = readUntil(r, '.');
      break;

    case OP.COLOR_TEXT:
      msg.r = r.readInt();
      msg.g = r.readInt();
      msg.b = r.readInt();
      msg.text = r.readLine();
      break;

    case OP.MOVE_NORTH:
    case OP.MOVE_SOUTH:
    case OP.MOVE_WEST:
    case OP.MOVE_EAST:
      msg.id = r.readLong();
      break;

    case OP.RANGE:
      msg.range = r.readInt();
      break;

    case OP.SET_FLAG:
      msg.id = parseJavaInt(r.readLine());
      msg.flag = r.readInt();
      break;

    case OP.ENTITY_IMAGE:
      msg.id = parseJavaInt(r.readLine().trim());
      msg.image = r.readInt();
      break;

    case OP.TARGET_HP:
      msg.hp = parseJavaInt(r.readLine().trim());
      break;

    case OP.GEAR:
      msg.id = r.readInt();
      msg.slots = {};
      for (const slot of EQUIPMENT_SLOTS) {
        const name = r.readLine();
        msg.slots[slot] = name === 'none' ? null : name;
      }
      break;

    case OP.SPELLBOOK: {
      // Unclear whether the first int is a count: it was 2 with 10 slots.
      msg.first = r.readInt();
      msg.slots = [];
      for (let i = 0; i < 10; i++) {
        const name = r.readLine();
        msg.slots.push(name === '-' ? null : name);
      }
      msg.a = r.readInt();
      msg.b = r.readInt();
      break;
    }

    case OP.STAMINA: {
      msg.stamina = r.readInt();
      msg.maxStamina = r.readInt();
      const n = r.readInt();
      msg.skills = [];
      for (let i = 0; i < n; i++) {
        const name = r.readLine();
        const cost = r.readInt();
        const unknown = r.readInt();
        const cooldown = r.readInt();
        const req = r.readLine();
        msg.skills.push({ name, cost, unknown, cooldown, requirement: req === '-' ? null : req });
      }
      break;
    }

    case OP.SHIPS: {
      const n = r.readInt();
      msg.ships = [];
      for (let i = 0; i < n; i++) {
        msg.ships.push({
          id: r.readInt(),
          x: r.readInt(),
          y: r.readInt(),
          facing: r.readLine(),
          flag1: r.readInt(),
          flag2: r.readInt(),
        });
      }
      break;
    }

    default:
      // Same recovery as Dusk.java: log it and throw away the rest of the line.
      msg.unknown = true;
      msg.rest = r.readLine();
      break;
  }
  return msg;
}

function readUntil(r, terminator) {
  const lines = [];
  for (let line = r.readLine(); line !== terminator; line = r.readLine()) lines.push(line);
  return lines;
}

// Drains every complete message currently buffered in `reader`.
export function* parseAvailable(reader, ctx) {
  while (reader.available() > 0) {
    reader.mark();
    let msg;
    try {
      msg = parseMessage(reader, ctx);
    } catch (e) {
      reader.reset();
      if (e instanceof NeedMoreData) return;
      throw e;
    }
    reader.mark();
    if (msg.op === OP.MAP_SIZE) ctx.mapSize = msg.size;
    yield msg;
  }
}

export { ProtocolError };
