import assert from 'node:assert/strict';
import { npcOutfit, npcLayersFor, npcFacing, shade, trimColour, npcRace, npcFemale, raceAt, npcScale } from '../js/npcoutfits.js';
import { creatureSheetFor } from '../js/creatures.js';

const names = (o) => o.layers.map(([l]) => l);

// Same name, same outfit; different townsfolk differ somewhere.
assert.deepEqual(npcOutfit('Townfolk Bob'), npcOutfit('townfolk bob'), 'case does not matter');
const crowd = ['townfolk 1', 'townfolk 2', 'townfolk 3', 'townfolk 4', 'townfolk 5', 'townfolk 6'].map((n) => JSON.stringify(npcOutfit(n)));
assert.ok(new Set(crowd).size >= 4, 'townsfolk vary');

// Families.
const guard = npcOutfit('kingshaven guard');
assert.equal(guard.look, 0);
for (const l of ['npc-trousers', 'npc-boots', 'torso-chain', 'helm']) assert.ok(names(guard).includes(l), `guard wears ${l}`);
for (const l of ['legs-plate', 'torso-plate', 'helm', 'weapon-sword']) assert.ok(names(npcOutfit('kingshaven knight')).includes(l), `knight wears ${l}`);
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
for (const n of ['wolf', 'skeleton knight', 'Duergar Bounty', 'slime', '']) assert.equal(npcOutfit(n), null, n);

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
const g = npcOutfit('kingshaven knight');
const iPlate = names(g).indexOf('torso-plate');
assert.equal(names(g)[iPlate + 1], 'torso-plate-trim', 'plate trim follows the plate');
assert.notEqual(g.layers[iPlate + 1][1], '#c8b060', 'plain plate: steel trim, not gold');
const gm = npcOutfit('kingshaven guard');
const iMail = names(gm).indexOf('torso-chain');
assert.equal(names(gm)[iMail + 1], 'torso-chain-trim', 'mail trim follows the mail');
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

// The peasant pieces turn up among townsfolk: men in shirts, trousers and shoes, women in bodices.
const men = Array.from({ length: 60 }, (_, i) => names(npcOutfit(`townfolk man ${i}`)));
const women = Array.from({ length: 60 }, (_, i) => names(npcOutfit(`townfolk woman ${i}`)));
for (const l of ['npc-shirt', 'npc-trousers', 'npc-shoes', 'npc-tunic', 'legs-cloth', 'npc-boots']) assert.ok(men.some((m) => m.includes(l)), `some men wear ${l}`);
assert.ok(women.some((w) => w.includes('npc-shirt')), 'some women wear a bodice');
for (const m of men) {
  assert.ok(!(m.includes('npc-shirt') && m.includes('npc-tunic')), 'never a shirt and a tunic');
  assert.ok(!(m.includes('npc-trousers') && m.includes('legs-cloth')), 'never two pairs of legs');
  assert.ok(!(m.includes('npc-shoes') && m.includes('npc-boots')), 'never shoes and boots');
}

// Guards wear mail, not plate; boots always go on over the trousers.
const gate = names(npcOutfit('Gate Guard'));
assert.ok(gate.includes('torso-chain') && !gate.includes('torso-plate'), 'guards wear mail');
for (const who of ['Gate Guard', 'hunter Bob', 'townfolk man 3', 'Innkeeper Sela', 'Bartender Gus']) {
  const ls = names(npcOutfit(who));
  const legs = ls.findIndex((l) => l.startsWith('legs-') || l === 'npc-trousers');
  const boots = ls.findIndex((l) => l === 'npc-boots' || l === 'npc-shoes');
  if (legs >= 0 && boots >= 0) assert.ok(boots > legs, `${who}: boots drawn over the trousers`);
}
assert.ok(names(npcOutfit('Sir Knight')).includes('torso-plate'), 'knights keep plate');

// Dry ones: desert raiders on lizardfolk bodies; raiders fight, diggers dig.
for (const [who, tools] of [['dry one raider', ['weapon-spear', 'weapon-sword']], ['dry one digger', ['weapon-pick', 'weapon-shovel']]]) {
  const o = npcOutfit(who);
  assert.equal(o.look, 6, `${who}: lizardfolk body`);
  for (const l of ['npc-hood', 'torso-hide', 'legs-cloth', 'npc-boots']) assert.ok(names(o).includes(l), `${who} wears ${l}`);
  assert.ok(names(o).some((l) => tools.includes(l)), `${who}: ${tools.join(' or ')}`);
}
assert.equal(npcOutfit('dry one woman').look, 11, 'dry one women: look 11');
// Duergar: the grey dwarf body (look 20) in dark iron, each with its own weapon family.
for (const [who, weapons, wears] of [
  ['duergar soldier', ['weapon-axe'], ['torso-chain', 'legs-plate', 'helm', 'npc-boots']],
  ['duergar guard', ['weapon-axe', 'weapon-spear'], ['torso-plate', 'legs-plate', 'helm', 'npc-boots']],
  ['duergar delver', ['weapon-pick'], ['torso-leather', 'legs-cloth', 'npc-hood', 'npc-boots']],
  ['Thrumgar the Grey Warlord', ['weapon-hammer'], ['torso-plate', 'legs-plate', 'helm']],
]) {
  const o = npcOutfit(who);
  assert.equal(o.look, 20, `${who}: duergar body`);
  assert.ok(names(o).some((l) => weapons.includes(l)), `${who}: ${weapons.join(' or ')}`);
  for (const l of wears) assert.ok(names(o).includes(l), `${who} wears ${l}`);
  assert.ok(names(o).indexOf('npc-boots') > names(o).findIndex((l) => l.startsWith('legs-')), `${who}: boots over the legs`);
}
assert.deepEqual(npcOutfit('duergar guard'), npcOutfit('Duergar Guard'), 'a guard keeps the same weapon');
const thr = npcOutfit('Thrumgar the Grey Warlord');
const plate = (o) => o.layers.find(([l]) => l === 'legs-plate')[1];
assert.notEqual(plate(thr), plate(npcOutfit('duergar soldier')), 'Thrumgar: darker iron than his soldiers');
assert.notEqual(plate(npcOutfit('duergar soldier')), plate(npcOutfit('kingshaven knight')), 'dark iron, not the knights\' steel');
assert.equal(npcOutfit('kingshaven guard').look, 0, 'human guards keep look 0');
// Lizardfolk warriors are people: hides and an axe (or a spear) on the lizardfolk body.
for (const who of ['Lizard Axeman', 'lizard axewarrior']) {
  const o = npcOutfit(who);
  assert.equal(o.look, 6, `${who}: lizardfolk body`);
  assert.ok(names(o).includes('weapon-axe') && names(o).includes('torso-hide') && names(o).includes('legs-cloth'), `${who}: hide, cloth, axe`);
  assert.equal(creatureSheetFor(who), null, `${who}: not a creature`);
}
assert.ok(names(npcOutfit('lizard guard')).includes('weapon-spear'), 'lizard guard: spear');
for (const n of ['Lizard', 'mire lizard', 'Stone lizard', 'alligator', 'Bug', 'couch']) assert.equal(npcOutfit(n), null, `${n}: no outfit`);
assert.equal(npcOutfit('Mole Hill Farmer').look, 0, 'Mole Hill Farmer: still a farmer');
assert.equal(creatureSheetFor('Mole Hill Farmer'), null, 'Mole Hill Farmer: not a mole');

// Named townsfolk (merchants and people props): race from the look or where they stand, sex from the
// look or the name, clothes from the job in the name.
const at = (x, y, look, merchant = false) => ({ x, y, look, merchant });
assert.equal(raceAt(1340, 914), 'drow');
assert.equal(raceAt(1440, 352), 'human', 'Kingshaven');
assert.equal(npcOutfit('Nalfein', at(1339, 913)).look, 2, 'Velkarath man: drow');
assert.equal(npcOutfit('Sabal', at(1334, 937, 'dark elf woman')).look, 10, 'Velkarath woman: drow');
assert.equal(npcOutfit('Merchant', at(1331, 925, undefined, true)).look, 2, 'a merchant in Velkarath: drow');
assert.equal(npcOutfit('Dark Elf Man', at(100, 100)).look, 2, '"Dark Elf" names: drow anywhere');
assert.equal(npcOutfit('Caelum', at(449, 1254, 'elf')).look, 1, 'Aelindor: elf');
assert.equal(npcOutfit('Ssuli the Trader', at(1689, 941)).look, 6, 'Ssuli in Ssarakh: lizardfolk');
assert.equal(npcOutfit('Ssuli the Trader', at(794, 1529, 'lizardfolk')).look, 6, 'Ssuli at Lastwater: lizardfolk by look');
assert.ok(names(npcOutfit('Ssuli the Trader', at(794, 1529, 'lizardfolk'))).includes('npc-belt'), 'traders: a belt');
assert.equal(npcOutfit('Cobb the Grocer', at(1440, 352)).look, 0, 'elsewhere: human');
assert.equal(npcOutfit('Cobb the Grocer', at(5000, 5000)).look, 0, 'unknown place: human');
assert.ok(names(npcOutfit('Brann the Smith', at(1440, 352))).includes('npc-apron'), 'smith: apron');
assert.ok(npcFemale('Matron Xalyth'), 'Matron Xalyth: female');
assert.equal(npcOutfit('Matron Xalyth', at(1345, 895)).look, 10, 'Matron Xalyth: drow woman');
assert.ok(npcFemale('Herb Wife Agna') && npcFemale('Bertha of Kingshaven') && npcFemale('Smith\'s Widow Orla'), 'female names and titles');
assert.ok(!npcFemale('Brann the Smith') && !npcFemale('Captain Hale'), 'default male');
assert.ok(!npcFemale('Kit of Kingshaven', at(0, 0, 'villager man')), 'the look wins over the name');
assert.equal(npcRace('Herbalist Linnet', at(1440, 352, 'woman')), 'human');
assert.ok(names(npcOutfit('Smith\'s Widow Orla', at(1440, 352))).includes('npc-hood'), 'widow: cloak and hood, not an apron');
assert.ok(names(npcOutfit('Captain Hale', at(1440, 352))).includes('torso-chain'), 'captain: guard');
assert.ok(names(npcOutfit('Ranger Faelwen', at(463, 1206))).includes('weapon-bow'), 'ranger: hunter');
assert.ok(names(npcOutfit('Priestess Ilvra', at(1370, 899))).includes('weapon-staff'), 'priestess: robe and staff');
assert.ok(!names(npcOutfit('Archivist Zyrith', at(1340, 914))).some((l) => l.startsWith('weapon')), 'archivist: no staff');
assert.ok(names(npcOutfit('Old Sailor Wick', at(95, 355))).includes('npc-cloak'), 'old: cloak');
assert.ok(names(npcOutfit('Dockhand Bolt', at(95, 355))).includes('npc-shirt'), 'dockhand: shirt');
for (const n of ['couch', 'Water Barrel', 'Unknown', 'training dummy']) assert.equal(npcOutfit(n, at(1440, 352)), null, `${n}: not a person`);
for (const n of ['Dagna\'s Kitchen', 'Pickwright\'s Tools', 'Saelin\'s Armoury', 'Ssuli\'s Stall']) assert.equal(npcOutfit(n, at(1440, 352, undefined, true)), null, `${n}: a shop sign`);
assert.equal(npcOutfit('Pell', at(0, 0, 'barrel')), null, 'a prop that looks like a barrel');
assert.deepEqual(npcOutfit('Old Wenna', at(1440, 352)), npcOutfit('Old Wenna', at(1440, 352)), 'same name, same outfit');
assert.notEqual(npcOutfit('Some Stranger', at(1440, 352)), null, 'anyone else: townsfolk');
assert.equal(npcOutfit('Some Stranger'), null, 'mobs get no fallback');
// Prisoners: human, ragged, barefoot, unarmed, wherever they're held.
for (const [who, where] of [['prisoner', null], ['prisoner', at(1340, 914)], ['DraNs prisoner', at(729, 699)]]) {
  const o = npcOutfit(who, where);
  assert.equal(o.look, 0, `${who}: human`);
  assert.deepEqual(names(o).sort(), ['npc-shirt', 'npc-trousers'], `${who}: shirt and trousers only`);
}
assert.deepEqual(names(npcOutfit('Elowen', at(0, 0, 'prisoner'))).sort(), ['npc-shirt', 'npc-trousers'], 'looks like a prisoner: ragged');
assert.equal(npcOutfit('Elowen', at(0, 0, 'prisoner')).look, 8, 'Elowen: a woman');
assert.ok(names(npcOutfit('Ilzt', at(1366, 937, 'dark elf guard'))).includes('torso-chain'), 'looks like a guard: guard');
assert.ok(names(npcOutfit('Blademistress Zeerith', at(1307, 955, 'dark elf guard'))).includes('helm'), 'blademistress: armed');
// Children drawn at three quarters, everyone else full size; Captain Liriel is an elf woman.
assert.equal(npcOutfit('Child', at(1440, 352)).scale, 0.75, 'Child: 0.75');
assert.equal(npcScale('street urchin'), 0.75);
assert.equal(npcOutfit('Captain Hale', at(1440, 352)).scale, 1, 'Captain Hale: 1');
assert.equal(npcScale('Boyd'), 1, 'whole words only');
const liriel = npcOutfit('Captain Liriel', at(444, 1180, 'elf'));
assert.equal(liriel.look, 9, 'Captain Liriel: elf woman');
assert.ok(names(liriel).includes('torso-chain'), 'Captain Liriel: captain outfit');
// Executioners, vampires and the Last Champion: human, dressed, armed.
for (const [who, weapon, wears] of [
  ['executioner', 'weapon-axe', ['npc-hood', 'torso-hide', 'legs-cloth', 'npc-boots']],
  ['Executioner Champion', 'weapon-axe', ['npc-hood', 'torso-hide', 'legs-cloth', 'legs-plate', 'npc-boots']],
  ['vampire', 'weapon-dagger', ['npc-cloak', 'npc-shirt', 'legs-cloth', 'npc-boots']],
  ['The Last Champion', 'weapon-sword', ['torso-plate', 'legs-plate', 'helm']],
]) {
  const o = npcOutfit(who);
  assert.equal(o.look, 0, `${who}: human`);
  assert.ok(names(o).includes(weapon), `${who}: ${weapon}`);
  for (const l of wears) assert.ok(names(o).includes(l), `${who} wears ${l}`);
  assert.equal(creatureSheetFor(who), null, `${who}: not a creature`);
}
assert.ok(!names(npcOutfit('executioner')).includes('legs-plate'), 'plain executioner: no plate');
assert.equal(npcOutfit('vampire').layers.find(([l]) => l === 'npc-cloak-trim')[1], '#7a1018', 'blood-red lining');
for (const n of ['beholder', 'Ash-Sworn Breaker']) assert.equal(npcOutfit(n), null, `${n}: left as it is`);
console.log('npc outfit tests passed');
