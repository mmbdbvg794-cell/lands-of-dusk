import assert from 'node:assert/strict';
import { npcOutfit, npcLayersFor, npcFacing } from '../js/npcoutfits.js';

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

console.log('npc outfit tests passed');
