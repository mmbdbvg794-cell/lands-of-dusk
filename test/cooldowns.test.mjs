// Run with: node test/cooldowns.test.mjs
import assert from 'node:assert/strict';
import { parseCooldown, Cooldowns, waitLabel } from '../js/spells.js';

assert.deepEqual(parseCooldown('Cooldown: summon bahamut|10|2'), { spell: 'summon bahamut', own: 10, any: 2 });
assert.equal(parseCooldown('Cooldown: nonsense'), null);
const c = new Cooldowns();
assert.equal(c.left('mend', 0), 0);
c.start({ spell: 'holy', own: 12, any: 2 }, 1000);
assert.equal(c.left('holy', 1000), 12000);
assert.equal(c.left('mend', 1000), 2000, 'every spell waits the shared 2 s');
assert.equal(c.left('mend', 3000), 0);
assert.equal(c.left('Holy', 5000), 8000, 'any case');
c.tidy(14000);
assert.equal(c.active, false);
assert.equal(waitLabel(1200), '2s');
assert.equal(waitLabel(65000), '1:05');
console.log('ok - cooldowns');
{
  const { isCastFailure } = await import('../js/spells.js');
  assert.ok(isCastFailure('You are still gathering your power (2 seconds).'));
  assert.ok(isCastFailure('Holy is ready again in 1 second.'));
  console.log('ok - cooldown refusals');
}
