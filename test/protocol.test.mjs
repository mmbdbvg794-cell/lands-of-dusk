// Run with: node test/protocol.test.mjs
import assert from 'node:assert/strict';
import { ByteReader } from '../js/bytereader.js';
import { parseAvailable, OP } from '../js/protocol.js';

// Builds a byte stream the way the server writes it.
function stream(...parts) {
  const out = [];
  for (const p of parts) {
    if (typeof p === 'number') out.push(p);
    else if (typeof p === 'bigint') {
      const b = new DataView(new ArrayBuffer(8));
      b.setBigInt64(0, p);
      out.push(...new Uint8Array(b.buffer));
    } else for (const ch of p) out.push(ch.charCodeAt(0));
  }
  return new Uint8Array(out);
}

const tiles = Array.from({ length: 9 }, (_, i) => `${i}\n`).join('');
const data = stream(
  14, 3, 'Welcome to Dusk!\n',
  19, '3\n',
  1, 'http://example/rc/\n',
  2, '10\n', '20\n', tiles,
  4, 'flan\n', '0\n', '2147\n', '10\n', '20\n', '5\n', '2\n', 'false\n', '30\n', '40\n',
  4, 'rat\n', '1\n', '2148\n', '11\n', '20\n', '7\n', 'true\n',
  5, '30\n', '40\n', '8\n', '12\n',
  6, '0\n', 'torch\n', '55\n', '1\n', 'sword\n', '56\n', '.\n',
  6, '.\n',
  7, 'sword\n', '56\n', ...Array(8).fill('none\n'),
  8, 'Str: 10\n', 'Dex: 9\n', '.\n',
  28, '1\n',
  23, '255\n', '0\n', '0\n', '\tYou hit the rat for 3 damage.\r\n',
  24, 2148n,
  29, '2148\n', '2\n',
  30,
  31, ' 2148 \n', '9\n',
  32, ' 12\n',
  16, '2148\n',
  20, 'Title\n', 'a\n', 'b\n', '--EOF--\n',
  33, '1757\n', 'executioner axe\n', 'none\n', 'none\n', 'platinum suit\n', ...Array(5).fill('none\n'),
  35, '2\n', ...Array(10).fill('-\n'), '0\n', '0\n',
  38, '30\n', '34\n', '2\n', 'power strike\n', '15\n', '0\n', '3000\n', '-\n',
      'jump\n', '20\n', '0\n', '1000\n', 'needs 15 dexterity\n',
  39, '1\n', '2\n', '546\n', '485\n', 'e\n', '1\n', '1\n',
  39, '0\n',
  99, 'junk line\n',
  3, 'caf\xe9\n',
  0,
);

function parseAll(chunks) {
  const r = new ByteReader();
  const ctx = { mapSize: 11 };
  const msgs = [];
  for (const c of chunks) {
    r.append(c);
    msgs.push(...parseAvailable(r, ctx));
  }
  assert.equal(r.available(), 0, 'all bytes consumed');
  return msgs;
}

const whole = parseAll([data]);
const bytewise = parseAll(Array.from(data, (b) => new Uint8Array([b])));
assert.deepEqual(bytewise, whole, 'chunking must not change the result');

const ops = whole.map((m) => m.op);
assert.deepEqual(ops, [14, 3, 19, 1, 2, 4, 4, 5, 6, 6, 7, 8, 28, 23, 24, 29, 30, 31, 32, 16, 20, 33, 35, 38, 39, 39, 99, 3, 0]);
const by = (i) => whole[i];
assert.equal(by(1).text, 'Welcome to Dusk!');
assert.equal(by(4).tiles.length, 3);
assert.deepEqual(by(4).tiles[2], [6, 7, 8]);
assert.equal(by(5).step, 2);
assert.equal(by(5).hp, 30);
assert.equal(by(6).step, -1);
assert.equal(by(6).hideName, true);
assert.equal(by(6).hp, undefined);
assert.deepEqual(by(8).items, [{ name: 'torch', id: 55, slot: 0 }, { name: 'sword', id: 56, slot: 1 }]);
assert.deepEqual(by(9).items, []);
assert.deepEqual(by(10).slots.wield, { name: 'sword', id: 56 });
assert.equal(by(10).slots.hands, null);
assert.deepEqual(by(11).lines, ['Str: 10', 'Dex: 9']);
assert.equal(by(13).text, '\tYou hit the rat for 3 damage.');
assert.equal(by(14).id, 2148);
assert.equal(by(17).id, 2148);
assert.equal(by(18).hp, 12);
assert.equal(by(21).id, 1757);
assert.equal(by(21).slots.wield, 'executioner axe');
assert.equal(by(21).slots.torso, 'platinum suit');
assert.equal(by(21).slots.hands, null);
assert.equal(by(22).slots.length, 10);
assert.deepEqual(by(23).skills[1], { name: 'jump', cost: 20, unknown: 0, cooldown: 1000, requirement: 'needs 15 dexterity' });
assert.equal(by(23).skills[0].requirement, null);
assert.equal(by(23).maxStamina, 34);
assert.deepEqual(by(24).ships, [{ id: 2, x: 546, y: 485, facing: 'e', flag1: 1, flag2: 1 }]);
assert.deepEqual(by(25).ships, []);
assert.equal(by(26).rest, 'junk line');
assert.equal(by(27).text, 'café');
console.log(`ok - ${whole.length} messages parsed identically whole and byte-by-byte`);
