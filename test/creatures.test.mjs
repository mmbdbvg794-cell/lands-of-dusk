import assert from 'node:assert/strict';
import { creatureSheetFor, creatureFallback, hovers, hoverMs } from '../js/creatures.js';

const want = {
  rat: ['rat', 'Rats', 'ratling', 'Sewer Rat', 'giant rat'],
  spider: ['spider', 'Giant Spider', 'arachnid'],
  snake: ['snake', 'Sea Serpent', 'viper', 'adder', 'asp'],
  frog: ['frog', 'Bog Toad'],
  wasp: ['wasp', 'hornet', 'bee', 'Bees', 'killer bees'],
  cow: ['cow', 'Bull', 'cattle', 'ox'],
  horse: ['horse', 'pony', 'mare', 'Stallion', 'war steed'],
  pig: ['pig', 'hog', 'Wild Boar', 'swine', 'sow'],
  sheep: ['sheep', 'ewe', 'ram', 'lamb'],
  dog: ['pug', 'stray puppy', 'mutt', 'pup', 'lapdog'],
  llama: ['llama', 'alpaca'],
  skeleton: ['Skeleton Warrior', 'bonewalker', 'undead warrior'],
  slime: ['green slime', 'Cave Ooze', 'slime', 'acidic jelly', 'toxic blob'],
  bat: ['vampire bat', 'Fruit Bats'],
  dragon: ['Red Dragon', 'wyvern', 'dragon whelp'],
  mushroom: ['myconid', 'Toadstool', 'fungal sporeling'],
};
for (const [creature, names] of Object.entries(want)) {
  for (const n of names) assert.equal(creatureSheetFor(n), creature, n);
}
for (const n of ['Ratcliffe the Baker', 'Bullseye', 'Rampart Guard', 'Ewen', 'Pigott', 'Asparagus', 'Doge', 'Kingshaven guard', 'wolf', 'black dog', 'hound', 'jackal', 'dog', 'mire hound', 'Puppet', 'Combat Trainer', 'Battlemage', 'Batista the Cook', 'Dragoon', 'Gelda', 'Dragon Knight', '', null]) {
  assert.equal(creatureSheetFor(n), null, String(n));
}
assert.ok(hovers('bat') && hovers('dragon') && !hovers('rat') && !hovers(null), 'bats and dragons flap standing still');
assert.ok(hovers('snake'), 'snakes slither standing still');
assert.ok(hoverMs('dragon') > hoverMs('bat'), 'dragon wings beat slower');
const colours = {
  slime_red: ['red slime', 'Magma Slime', 'blood ooze', 'fire jelly', 'cinder slime'],
  slime_blue: ['frost ooze', 'Ice Slime', 'water blob'],
  slime_purple: ['purple slime', 'void ooze', 'Arcane Jelly'],
  slime_yellow: ['yellow slime', 'golden ooze', 'Sulfur Blob', 'lightning gel'],
  slime_black: ['black pudding', 'Tar Slime', 'shadow ooze'],
  slime_grey: ['grey slime', 'gray ooze', 'Stone Blob', 'ash pudding', 'rock slime'],
};
for (const [sheet, names] of Object.entries(colours)) for (const n of names) assert.equal(creatureSheetFor(n), sheet, n);
assert.equal(creatureSheetFor('dark dragon'), 'dragon', 'colour words only colour slimes');
assert.equal(creatureSheetFor('Redwood Slime'), 'slime', 'whole words: Redwood is not red');
assert.equal(creatureFallback('slime_red'), 'slime', 'a coloured slime falls back to green');
assert.equal(creatureFallback('slime'), null);
assert.equal(creatureFallback('bat'), null);
console.log('creature tests passed');
