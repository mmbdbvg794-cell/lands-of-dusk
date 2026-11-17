import assert from 'node:assert/strict';
import { creatureSheetFor, creatureFallback, hovers, hoverMs, sideDir } from '../js/creatures.js';
import { renderedFrame } from '../js/renderer.js';

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
const wolves = {
  wolf_great: ['Fenris the Great Wolf', 'Tree Wolf Champion', 'wolf champion'],
  wolf_frost: ['frost wolf', 'Snow Wolves', 'white wolf'],
  wolf_blight: ['blighted wolf', 'plague wolf', 'dire wolf'],
  wolf_black: ['black dog', 'Black dog', 'gloom hound', 'shadow wolf', 'wardog'],
  wolf: ['wolf', 'Tree Wolf', 'wolves', 'Timberwolf', 'wolfie', 'Trained wolf'],
  hound: ['mire hound', 'stray hound', 'Hound', 'white dog', 'dog'],
  coyote: ['Coyote', 'jackal'],
  dinosaur: ['dinosaur', 'dino babe', 'velociraptor'],
  dog: ['pug', 'stray puppy', 'mutt'],
};
for (const [sheet, names] of Object.entries(wolves)) for (const n of names) assert.equal(creatureSheetFor(n), sheet, n);
assert.equal(creatureFallback('wolf_frost'), 'wolf', 'a wolf variant falls back to the grey wolf');
assert.equal(creatureSheetFor('man-eater'), 'maneater');
assert.equal(creatureSheetFor('Man Eater'), 'maneater');
assert.equal(creatureSheetFor('maneaters'), 'maneater');
for (const n of ['Germaneater', 'dry one raider', 'dry one digger']) assert.equal(creatureSheetFor(n), null, n);
for (const n of ['Wolfgang the Smith', 'Houndsworth', 'Dogberry', 'Dinosaurus Rex the Bard']) assert.equal(creatureSheetFor(n), null, n);
for (const n of ['Ratcliffe the Baker', 'Bullseye', 'Rampart Guard', 'Ewen', 'Pigott', 'Asparagus', 'Doge', 'Kingshaven guard', 'Puppet', 'Combat Trainer', 'Battlemage', 'Batista the Cook', 'Dragoon', 'Gelda', 'Dragon Knight', '', null]) {
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
// Snakes side-on only: facing N or S they draw their W or E row; a wolf facing N still draws N.
const row = (creature, dir, last) => Math.floor(renderedFrame(36, sideDir(creature, dir, last) * 2, { x: 0, y: 0 }, 1) / 9);
assert.ok([2, 3].includes(row('snake', 0)), 'snake facing N: a side row');
assert.equal(row('snake', 1), 3, 'snake facing S: E by default');
assert.equal(row('snake', 0, 2), 2, 'snake keeps its last side');
assert.equal(row('snake', 2), 2, 'snake facing W: W');
assert.equal(row('wolf', 0), 0, 'wolf facing N: N');
console.log('creature tests passed');
