// The player's own state from the side-panel opcodes: status (5),
// inventory (6), equipment (7), stats (8) and actions (10). Kept apart
// from the DOM so it can be tested in node.

import { OP, EQUIPMENT_SLOTS } from './protocol.js';

// Inventory slot types, as opcode 6 sends them: 0 is a plain item, 1-9
// are wearable in EQUIPMENT_SLOTS[type - 1].
export const slotForType = (type) => EQUIPMENT_SLOTS[type - 1] ?? null;

export class Player {
  constructor() {
    this.hp = 0;
    this.maxhp = 0;
    this.mp = 0;
    this.maxmp = 0;
    this.x = 0;
    this.y = 0;
    this.items = []; // [{ name, id, slot }] sorted by name, like Dusk.java's vctItems
    this.equipment = Object.fromEntries(EQUIPMENT_SLOTS.map((s) => [s, null]));
    this.stats = [];
    this.actions = [];
    this.range = 1; // attack range, from opcode 28
    this.name = null; // the name typed at login, for the character card
  }

  // Returns the name of the part that changed ('status', 'items',
  // 'equipment', 'stats', 'range', 'actions'), or null if the message
  // isn't ours.
  apply(msg) {
    switch (msg.op) {
      case OP.STATUS:
        Object.assign(this, { hp: msg.hp, maxhp: msg.maxhp, mp: msg.mp, maxmp: msg.maxmp });
        return 'status';
      case OP.MAP:
        this.x = msg.x;
        this.y = msg.y;
        return 'status';
      case OP.INVENTORY:
        // Stable sort, so same-named items keep the server's order.
        this.items = [...msg.items].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
        return 'items';
      case OP.EQUIPMENT:
        this.equipment = { ...msg.slots };
        return 'equipment';
      case OP.STATS:
        this.stats = msg.lines;
        return 'stats';
      case OP.RANGE:
        this.range = msg.range;
        return 'range';
      case OP.ACTIONS:
        this.actions = msg.actions;
        return 'actions';
      default:
        return null;
    }
  }

  // Items with the same name and slot type shown as one row, with every ID
  // kept so a command can go to the first one.
  groupedItems() {
    const groups = [];
    for (const item of this.items) {
      const last = groups[groups.length - 1];
      if (last && last.name === item.name && last.slot === item.slot) last.ids.push(item.id);
      else groups.push({ name: item.name, slot: item.slot, ids: [item.id] });
    }
    return groups;
  }
}

// The commands the server's Commands.java expects: drop, wear and unwear
// take an item ID; use looks the item up by name.
export const command = {
  wear: (id) => `wear ${id}`,
  unwear: (id) => `unwear ${id}`,
  drop: (id) => `drop ${id}`,
  use: (name) => `use ${name}`,
};
