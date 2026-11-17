import assert from 'node:assert/strict';
import { creatureSheetFor } from '../js/creatures.js';

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
};
for (const [creature, names] of Object.entries(want)) {
  for (const n of names) assert.equal(creatureSheetFor(n), creature, n);
}
for (const n of ['Ratcliffe the Baker', 'Bullseye', 'Rampart Guard', 'Ewen', 'Pigott', 'Asparagus', 'Doge', 'Kingshaven guard', 'wolf', 'black dog', 'hound', 'jackal', 'dog', 'mire hound', 'Puppet', '', null]) {
  assert.equal(creatureSheetFor(n), null, String(n));
}
console.log('creature tests passed');
