import assert from 'node:assert/strict';
import { creatureSheetFor, creatureFallback, hovers, hoverMs, sideDir, drawScale, scaledBox, creatureFx, creatureFxList, FX, FX_POINTS, fxPoint, fxPoints, flicker, nameAbove, opaqueBox, stripColour } from '../js/creatures.js';
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
const ghosts = {
  ghost_water: ['Water Shade', 'shade'],
  ghost_marsh: ['marsh wisp', 'will-o-wisp', 'will o wisp'],
  ghost_swamp: ['swamp horror', 'bog horror'],
  ghost_gloom: ['gloom', 'Glooms', 'banshee'],
  ghost: ['unholy ghost', 'Specter', 'phantom', 'wraith', 'Flame spirit'],
  wolf_black: ['gloom hound'],
  dragon: ['Dragon Spirit'],
  imp: ['Imp', 'imps'],
  kobold: ['kobold', 'Kobolds'],
};
for (const [sheet, names] of Object.entries(ghosts)) for (const n of names) assert.equal(creatureSheetFor(n), sheet, n);
assert.equal(creatureFallback('ghost_marsh'), 'ghost');
assert.equal(creatureSheetFor('Mishaven'), 'mishaven');
assert.equal(creatureSheetFor('mishavens'), 'mishaven');
assert.equal(creatureSheetFor('Mishavenly'), null);
assert.equal(drawScale('mishaven'), 1.3, 'mishaven drawn 1.3x');
assert.equal(drawScale('wolf'), 1, 'wolf drawn 1x');
// scaled about the bottom centre: same bottom edge and centre, 1.3x the side
const [bx, by, bs] = scaledBox(100, 200, 40, 1.3);
assert.ok(Math.abs(bs - 52) < 1e-9 && Math.abs(by + bs - 240) < 1e-9 && Math.abs(bx + bs / 2 - 120) < 1e-9, 'feet stay put');
assert.deepEqual(scaledBox(100, 200, 40, 1), [100, 200, 40]);
for (const n of ['Impala', 'Shadewood', 'Shadeassassin', 'shade_assassin', 'Gloomwick', 'Wispa']) assert.equal(creatureSheetFor(n), null, n);
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
for (const n of ['duergar soldier', 'duergar guard', 'duergar delver', 'Thrumgar the Grey Warlord', 'Duergar Bounty']) assert.equal(creatureSheetFor(n), null, `${n}: not a creature`);
// Bugs, moles; slimers and sludge are slimes; stalfos and the risen are skeletons.
for (const [sheet, ns] of Object.entries({
  bug: ['Bug', 'bog crawler', 'tunnel crawler', 'giant beetle', 'cave grub', 'insects'],
  mole: ['Mole', 'mega mole', 'moles'],
  slime: ['slimer', 'Toxic sludge', 'sludge'],
  slime_blue: ['lake slimer', 'lake slime'],
  slime_red: ['red slimer'],
  skeleton: ['stalfos', "risen king's-man", 'Risen'],
})) for (const n of ns) assert.equal(creatureSheetFor(n), sheet, n);
for (const [n, sheet] of [['Lizard', 'lizard'], ['lizards', 'lizard'], ['newt', 'lizard'], ['mire lizard', 'lizard_mire'], ['swamp lizard', 'lizard_mire'], ['Stone lizard', 'lizard_stone'], ['cave lizard', 'lizard_stone'], ['alligator', 'lizard_gator'], ['Crocodile', 'lizard_gator'], ['gator', 'lizard_gator']]) assert.equal(creatureSheetFor(n), sheet, n);
assert.equal(creatureFallback('lizard_mire'), 'lizard');
for (const n of ['lizardman', 'lizardfolk', 'lizard-folk', 'Lizardton', 'lizard shaman', 'lizard soldier', 'lizard guard', 'navigator']) assert.equal(creatureSheetFor(n), null, n);
for (const n of ['Lizard Axeman', 'lizard axewarrior', 'Mole Hill Farmer', 'slimeball']) assert.equal(creatureSheetFor(n), null, n);
for (const [n, sheet] of [['cat', 'cat'], ['Kitten', 'cat'], ['alley cat', 'cat'], ['lynx', 'cat'], ['shrine gargoyle', 'gargoyle'], ['gargoyle', 'gargoyle'], ['stone gargoyles', 'gargoyle']]) assert.equal(creatureSheetFor(n), sheet, n);
assert.notEqual(creatureSheetFor('Catacomb Guard'), 'cat', 'Catacomb Guard');
for (const n of ['Catherine', 'Cathedral', 'scatter']) assert.equal(creatureSheetFor(n), null, n);
// One-off mobs.
for (const [n, sheet] of [['minion', 'demon_blue'], ['minions', 'demon_blue'], ['DraN', 'demon_blue'], ['Fallen', 'demon_red'], ['Claw', 'demon_red'], ['Bastard', 'demon_red'], ['Ashen Gaoler', 'demon_red'],
  ['dhouly', 'imp_dhouly'], ['Devilkin Champion', 'skeleton'], ['Wurm', 'lizard_gator'], ['Wurm Champion', 'lizard_gator'], ['sand worm', 'snake'], ['Freyrbrand', 'dragon'], ['Grey Herald', 'ghost'], ['Harpy', 'kobold']]) assert.equal(creatureSheetFor(n), sheet, n);
for (const n of ['Fallen Knight', 'Claw Hammer', 'the fallen', 'Bastard Sword', 'executioner', 'Executioner Champion', 'vampire', 'The Last Champion', 'beholder', 'Ash-Sworn Breaker', 'BloodWurm']) assert.equal(creatureSheetFor(n), null, n);
assert.equal(creatureFallback('imp_dhouly'), 'imp');
assert.equal(drawScale('demon_red', 'Ashen Gaoler'), 1.35, 'the Gaoler: bigger than his soldiers');
assert.equal(drawScale('demon_red', 'Fallen'), 1.15);
assert.equal(drawScale('demon_blue', 'minion'), 1.15);
assert.equal(drawScale('mishaven', 'mishaven'), 1.3);
assert.equal(drawScale('wolf', 'wolf'), 1);
// Effects by mob name: burning skeletons.
assert.equal(creatureSheetFor('Devilkin Champion'), 'skeleton');
assert.equal(creatureFx('Devilkin Champion'), 'burning', 'Devilkin Champion burns');
for (const n of ['flaming skeleton', 'burning skeleton', 'fire skeleton', 'Blazing Skeletons', 'ash skeleton', 'ember bones']) {
  assert.equal(creatureFx(n), 'burning', n);
  assert.equal(creatureSheetFor(n), 'skeleton', `${n}: the skeleton strip`);
}
for (const n of ['ice skeleton', 'Frozen Skeletons', 'frost bones']) { assert.equal(creatureFx(n), 'frost', n); assert.equal(creatureSheetFor(n), 'skeleton', `${n}: the skeleton strip`); }
for (const n of ['skeleton', 'Skeleton knight', 'wolf', 'fire slime', 'skeleton of fire', '']) assert.equal(creatureFx(n), null, `${n}: no effect`);
// More effects: by name words, then by the picture.
const fxOf = (n) => creatureFxList(n);
for (const n of ['frost wolf', 'ice wolf', 'snow wolf', 'winter wolf', 'frost bear', 'Ice Spider', 'Snow Lizard']) assert.deepEqual(fxOf(n), ['frost'], n);
for (const n of ['ghost', 'specter', 'gloom', 'banshee', 'marsh wisp', 'swamp horror', 'shade', 'Grey Herald']) assert.deepEqual(fxOf(n), ['ghostly'], n);
assert.deepEqual(fxOf('Water Shade'), ['ghostly', 'wet'], 'Water Shade: ghostly and wet');
for (const n of ['black dog', 'shadow wolf', 'gloom hound', 'Fallen', 'Claw', 'minion', 'DraN', 'Ashen Gaoler', 'dark spider', 'void slime']) assert.deepEqual(fxOf(n), ['shadow'], n);
assert.ok(!fxOf('gloom hound').includes('ghostly'), 'a gloom hound is smoky, not ghostly');
for (const n of ['blighted wolf', 'plague rat', 'rotting wolf', 'bog crawler']) assert.deepEqual(fxOf(n), ['blight'], n);
for (const n of ['lake slimer', 'sea snake', 'river rat']) assert.deepEqual(fxOf(n), ['wet'], n);
for (const n of ['wolf', 'skeleton', 'Bug', 'Lizard', 'Hound', 'slimer', 'man-eater', 'mishaven']) assert.deepEqual(fxOf(n), [], `${n}: no effect`);
assert.deepEqual(fxOf('Devilkin Champion'), ['burning']);
for (const n of ['ice skeleton', 'Fallen', 'Water Shade', 'a frost ghost of the dark lake']) assert.ok(fxOf(n).length <= 2, `${n}: two at most`);
for (const [name, fx] of Object.entries(FX)) {
  assert.ok(fx.parts?.length, `${name}: particles`);
  for (const p of fx.parts) {
    assert.ok(['glow', 'smoke'].includes(p.pool) && p.per > 0 && p.per <= 10 && p.life[0] > 0 && p.life[1] >= p.life[0], `${name}: a sound part`);
    assert.ok(p.colours === 'strip' || p.colours.length, `${name}: colours`);
  }
  if (fx.tint) assert.ok(fx.tintAmount > 0 && fx.tintAmount < 1, `${name}: tint amount`);
  if (fx.light) assert.ok(fx.light.r > 0 && fx.light.creature, `${name}: a creature light`);
}
assert.equal(FX.ghostly.alpha, 0.8, 'ghosts drawn see-through');
assert.equal(FX.ghostly.glow, 'strip', "ghosts glow in their picture's colour");
assert.ok(FX.shadow.parts.every((p) => p.pool === 'smoke'), 'shadow smoke is painted, not added light');
assert.ok(FX.sparkle && !Object.values(FX).includes(undefined), 'sparkle kept for later');
// Beasts' effects come from their head and back.
assert.notDeepEqual(fxPoints('wolf_frost', 2), fxPoints('skeleton', 2), 'a wolf is not a skeleton');
assert.ok(fxPoints('wolf_frost', 2)[0][0] < 0.4 && fxPoints('wolf_frost', 3)[0][0] > 0.6, "a wolf's head is at its front");
// Names over big creatures' heads.
for (const s of ['mishaven', 'demon_blue', 'demon_red', 'dragon', 'wolf_great', 'lizard_gator', 'maneater', 'horse', 'cow']) assert.ok(nameAbove(s), s);
assert.ok(nameAbove('skeleton', 'Ashen Gaoler') || nameAbove('demon_red', 'Ashen Gaoler'), 'the Gaoler');
for (const s of ['wolf', 'skeleton', 'rat', 'ghost', null]) assert.ok(!nameAbove(s), `${s}: under the feet`);
const px = new Uint8ClampedArray(4 * 4 * 4);
assert.deepEqual(opaqueBox(px, 4, 4), { top: 0, left: 0, right: 1, bottom: 1 }, 'an empty frame: the whole of it');
px[(2 * 4 + 1) * 4 + 3] = 255;
px[(3 * 4 + 2) * 4 + 3] = 255;
assert.deepEqual(opaqueBox(px, 4, 4), { top: 0.5, left: 0.25, right: 0.75, bottom: 1 }, 'the box round the pixels');
// a small wolf at the bottom of its frame: its head is in the box, not above it
const wolfBox = { top: 0.55, left: 0.45, right: 0.55, bottom: 0.95 };
for (const [x, y] of fxPoints('wolf_frost', 1, wolfBox)) assert.ok(y >= 0.55 && y <= 0.95 && x >= 0.45 && x <= 0.55, 'inside the picture');
assert.deepEqual(fxPoints('skeleton', 1, wolfBox), FX_POINTS[1], 'people-shaped: on the frame');
const green = new Uint8ClampedArray([40, 120, 30, 255, 0, 0, 255, 0]);
const col = stripColour(green);
assert.ok(col[1] > col[0] && col[1] > col[2] && col[1] >= 200, `a green picture glows green (${col})`);
assert.equal(stripColour(new Uint8ClampedArray(8)), null, 'nothing to read');
assert.ok(FX.burning.tintAmount >= 0.35 && FX.burning.tintAmount <= 0.45, 'burning: bones still read');
assert.equal(FX_POINTS.length, 4, 'points for each facing');
assert.deepEqual(fxPoint(10, 20, [0.5, 1]), [10, 20.5], 'feet: the bottom centre of the square');
assert.deepEqual(fxPoint(10, 20, [0.5, 0], 1.3), [10, 20.5 - 1.3], 'scaled up from the feet');
for (let t = 0; t < 20; t += 0.37) { const f = flicker(t, 7, 1); assert.ok(f > 0.9 && f < 1.1, 'flicker stays near 1'); }
assert.equal(flicker(5, 3, 0), 1, 'no flicker');
console.log('creature tests passed');
