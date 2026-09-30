// Run with: node test/gear.test.mjs
import assert from 'node:assert/strict';
import { gearFromEquipment, weaponKind, material, parseWorn, wornCommand } from '../js/gear.js';

const worn = (o) => Object.fromEntries(Object.entries(o).map(([slot, name]) => [slot, { name, id: 1 }]));

assert.deepEqual(gearFromEquipment({}), {});
assert.deepEqual(gearFromEquipment({ wield: null, torso: null }), {});

// Weapons by shape.
for (const [name, kind] of [
  ['long sword', 'sword'], ['excalibur', 'sword'], ['soul reaver', 'sword'],
  ['rusty_dagger', 'dagger'], ['small knife', 'dagger'],
  ['executioner axe', 'axe'], ["thor's hammer", 'hammer'], ['stone fist', 'claw'],
  ['quarter_staff', 'staff'], ['dark rod', 'staff'], ['spear', 'spear'], ['satans spear', 'spear'],
  ['celestial bow', 'bow'], ['chaos crossbow', 'crossbow'], ['pickaxe', 'pick'],
  ['bronze shovel', 'shovel'], ['fireball', 'orb'], ['summon demon', 'orb'],
]) assert.equal(weaponKind(name), kind, name);

// Materials: the first match wins.
assert.equal(material('blood_stained_dagger'), material('blood suit'));
assert.equal(material('lightning staff'), material('energy saber'));
assert.notEqual(material('lightning staff'), material('blade of light'));
assert.equal(material('bronze helmet'), material('bronze_suit'));
assert.equal(material('mystery thing'), material('steel suit'));

const g = gearFromEquipment(worn({
  wield: 'fire blade', torso: 'elven chain mail', skull: 'steel plate helm', arms: 'iron shield',
  legs: 'leather pants', hands: 'iron gloves', waist: 'leather belt', neck: 'crystal necklace', eyes: 'goggles',
}));
assert.deepEqual(g.weapon, { kind: 'sword', colour: material('fire'), glow: true });
assert.equal(g.torso.kind, 'chain');
assert.equal(g.helm.kind, 'great');
assert.deepEqual(g.shield, { colour: material('iron') });
assert.equal(g.sleeves, undefined);
assert.deepEqual(g.legs, { colour: material('leather'), plate: false });
assert.ok(g.hands && g.belt && g.neck && g.eyes);

// Sleeves share the arms slot with shields.
assert.equal(gearFromEquipment(worn({ arms: 'gold_sleeves' })).sleeves, material('gold'));
assert.equal(gearFromEquipment(worn({ arms: 'gold_sleeves' })).shield, undefined);

// Body armour kinds.
for (const [name, kind] of [
  ['iron suit', 'plate'], ['bronze breastplate', 'plate'], ['wizards cloak', 'cape'], ['golden cape', 'cape'],
  ['flame robe', 'robe'], ['Heavenly Garb', 'robe'], ['leather jerkin', 'leather'], ['grizzly bear hide', 'hide'],
  ['cloth_shirt', 'cloth'], ['generic tunic', 'cloth'],
]) assert.equal(gearFromEquipment(worn({ torso: name })).torso.kind, kind, name);

for (const [name, kind] of [['leather cap', 'cap'], ['gaia skull', 'horned'], ['gasmask', 'mask'], ['iron helmet', 'helm']]) {
  assert.equal(gearFromEquipment(worn({ skull: name })).helm.kind, kind, name);
}

// Other players' gear.
assert.deepEqual(parseWorn('Worn: 2073|wield=iron sword;torso=iron suit'), { id: 2073, equipment: { wield: { name: 'iron sword' }, torso: { name: 'iron suit' } } });
assert.deepEqual(parseWorn('Worn: 12|'), { id: 12, equipment: {} });
assert.equal(parseWorn('Worn: |').id, null);
assert.equal(parseWorn('You wear it.'), null);
assert.equal(gearFromEquipment(parseWorn('Worn: 1|wield=long sword').equipment).weapon.kind, 'sword');
assert.equal(wornCommand(5), 'worn 5');
console.log('gear tests passed');
