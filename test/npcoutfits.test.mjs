import assert from 'node:assert/strict';
import { npcOutfit, npcLayersFor, npcFacing, shade, trimColour } from '../js/npcoutfits.js';

const names = (o) => o.layers.map(([l]) => l);

// Same name, same outfit; different townsfolk differ somewhere.
assert.deepEqual(npcOutfit('Townfolk Bob'), npcOutfit('townfolk bob'), 'case does not matter');
const crowd = ['townfolk 1', 'townfolk 2', 'townfolk 3', 'townfolk 4', 'townfolk 5', 'townfolk 6'].map((n) => JSON.stringify(npcOutfit(n)));
assert.ok(new Set(crowd).size >= 4, 'townsfolk vary');

// Families.
const guard = npcOutfit('kingshaven guard');
assert.equal(guard.look, 0);
for (const l of ['legs-plate', 'torso-plate', 'helm', 'weapon-sword']) assert.ok(names(guard).includes(l), `guard wears ${l}`);
assert.ok(names(npcOutfit('gladiator')).includes('weapon-spear'), 'gladiator: spear');
assert.ok(!names(npcOutfit('gladiator')).includes('helm'), 'gladiator: bare-headed');
assert.equal(npcOutfit('dark knight').layers.find(([l]) => l === 'torso-plate')[1], '#2a2830', 'dark knight: dark armour');
assert.ok(names(npcOutfit('old wizard')).includes('torso') && names(npcOutfit('old wizard')).includes('weapon-staff'), 'wizard: robe and staff');
assert.ok(names(npcOutfit('hunter')).includes('weapon-bow'), 'hunter: bow');
assert.ok(names(npcOutfit('thief')).includes('npc-hood'), 'thief: hood');
assert.ok(names(npcOutfit('bartender')).includes('npc-apron'), 'bartender: apron');

// Women: body 8, dresses/skirts only for them.
const barmaid = npcOutfit('barmaid');
assert.equal(barmaid.look, 8);
assert.ok(names(barmaid).includes('npc-dress'));
for (let i = 0; i < 40; i++) {
  const man = npcOutfit(`townfolk man ${i}`);
  assert.ok(!names(man).some((l) => l === 'npc-dress' || l === 'npc-skirt'), 'men wear no dresses');
  const woman = npcOutfit(`townfolk woman ${i}`);
  assert.equal(woman.look, 8);
  assert.ok(names(woman).includes('npc-dress') || names(woman).includes('npc-skirt'), 'women: a dress or a skirt');
  assert.ok(!(names(woman).includes('npc-hood') && names(woman).includes('npc-hat')), 'never a hood and a hat');
}

// Not people (or no body for them yet): painted art stays.
for (const n of ['wolf', 'skeleton knight', 'duergar delver', 'slime', '']) assert.equal(npcOutfit(n), null, n);

// Order: cloak under the rest except facing north; weapon behind facing north/west.
const o = { look: 0, layers: [['legs-plate', 'a'], ['torso-plate', 'b'], ['npc-cloak', 'c'], ['helm', 'd'], ['weapon-sword', 'e']] };
assert.deepEqual(npcLayersFor(o, 1).map(([l]) => l), ['npc-cloak', 'legs-plate', 'torso-plate', 'helm', 'weapon-sword'], 'facing south');
assert.deepEqual(npcLayersFor(o, 0).map(([l]) => l), ['weapon-sword', 'legs-plate', 'torso-plate', 'helm', 'npc-cloak'], 'facing north');
assert.deepEqual(npcLayersFor(o, 2).map(([l]) => l), ['weapon-sword', 'npc-cloak', 'legs-plate', 'torso-plate', 'helm'], 'facing west');

// Facing from the last step.
assert.equal(npcFacing({ x: 5, y: 5, anim: { fx: 5, fy: 6 } }), 0, 'stepped north');
assert.equal(npcFacing({ x: 4, y: 5, anim: { fx: 5, fy: 5 } }), 2, 'stepped west');
assert.equal(npcFacing({ x: 5, y: 5, anim: null }, 3), 3, 'standing: keeps its last facing');

// Trims: right after their piece, in a second colour.
const g = npcOutfit('kingshaven guard');
const iPlate = names(g).indexOf('torso-plate');
assert.equal(names(g)[iPlate + 1], 'torso-plate-trim', 'plate trim follows the plate');
assert.equal(g.layers[iPlate + 1][1], '#c8b060', 'guard: gold trim');
assert.ok(!names(npcOutfit('townfolk 1')).includes(undefined), 'no empty layers');
for (let i = 0; i < 40; i++) {
  const o = npcOutfit(`townfolk ${i}`);
  for (const [l, c] of o.layers) assert.match(c, /^#[0-9a-f]{6}$/, `${l} has a colour`);
  for (const [k, [l]] of o.layers.entries()) if (l.endsWith('-trim')) assert.equal(o.layers[k - 1][0], l.slice(0, -5), 'trim right after its piece');
}
const caped = { look: 0, layers: [['torso-plate', 'a'], ['torso-plate-trim', 'b'], ['npc-cloak', 'c'], ['npc-cloak-trim', 'd']] };
assert.deepEqual(npcLayersFor(caped, 1).map(([l]) => l), ['npc-cloak', 'npc-cloak-trim', 'torso-plate', 'torso-plate-trim'], 'cloak and its trim together');
assert.equal(shade('#808080', 0.5), '#404040');
assert.equal(shade('#808080', 2), '#ffffff');
assert.equal(trimColour('#a4acb6', true), shade('#a4acb6', 1.45), 'metal: brighter edges');
assert.equal(trimColour('#6a4a2a', false), shade('#6a4a2a', 0.55), 'leather: darker edges');

console.log('npc outfit tests passed');
