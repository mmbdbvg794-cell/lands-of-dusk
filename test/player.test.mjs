// Run with: node test/player.test.mjs
import assert from 'node:assert/strict';
import { OP } from '../js/protocol.js';
import { Player, slotForType, command } from '../js/player.js';

const p = new Player();
assert.equal(p.apply({ op: OP.TEXT, text: 'hi' }), null);

assert.equal(p.apply({ op: OP.STATUS, hp: 30, maxhp: 40, mp: 8, maxmp: 12 }), 'status');
assert.deepEqual([p.hp, p.maxhp, p.mp, p.maxmp], [30, 40, 8, 12]);
assert.equal(p.apply({ op: OP.MAP, x: 5, y: 6, tiles: [] }), 'status');
assert.deepEqual([p.x, p.y], [5, 6]);

// Sorted by name, same names grouped with every ID kept in server order.
assert.equal(
  p.apply({
    op: OP.INVENTORY,
    items: [
      { name: 'torch', id: 9, slot: 0 },
      { name: 'sword', id: 3, slot: 1 },
      { name: 'torch', id: 4, slot: 0 },
      { name: 'apple', id: 7, slot: 0 },
    ],
  }),
  'items',
);
assert.deepEqual(p.items.map((i) => i.name), ['apple', 'sword', 'torch', 'torch']);
assert.deepEqual(p.groupedItems(), [
  { name: 'apple', slot: 0, ids: [7] },
  { name: 'sword', slot: 1, ids: [3] },
  { name: 'torch', slot: 0, ids: [9, 4] },
]);

assert.equal(p.equipment.wield, null);
p.apply({ op: OP.EQUIPMENT, slots: { wield: { name: 'axe', id: 2 }, hands: null } });
assert.deepEqual(p.equipment.wield, { name: 'axe', id: 2 });

assert.equal(p.apply({ op: OP.STATS, lines: ['Str: 10'] }), 'stats');
assert.deepEqual(p.stats, ['Str: 10']);
assert.equal(p.range, 1, 'melee until the server says');
assert.equal(p.apply({ op: OP.RANGE, range: 3 }), 'range');
assert.equal(p.range, 3);
assert.equal(p.apply({ op: OP.ACTIONS, actions: ['sit', 'wave'] }), 'actions');
assert.deepEqual(p.actions, ['sit', 'wave']);

// Shops: 17 opens and replaces, 22 fills the sell side, 21 closes.
assert.equal(p.shop.open, false);
assert.equal(p.apply({ op: OP.MERCHANT_WARES, items: ['5gp)apple', '9gp)ale'] }), 'shop');
assert.equal(p.shop.open, true);
p.apply({ op: OP.MERCHANT_WARES, items: ['5gp)apple'] });
assert.deepEqual(p.shop.wares, [{ name: 'apple', price: 5, currency: 'gp' }]);
p.apply({ op: OP.SELL_LIST, items: ['3gp)dagger'] });
assert.deepEqual(p.shop.sell.map((w) => w.name), ['dagger']);
p.apply({ op: OP.CLOSE_MERCHANT });
assert.deepEqual(p.shop, { open: false, wares: [], sell: [] });

assert.equal(slotForType(0), null);
assert.equal(slotForType(1), 'wield');
assert.equal(slotForType(9), 'hands');
assert.equal(slotForType(10), null);
assert.equal(command.wear(3), 'wear 3');
assert.equal(command.unwear(2), 'unwear 2');
assert.equal(command.drop(7), 'drop 7');
assert.equal(command.use('apple'), 'use apple');
console.log('ok - player state');
