// Mobs drawn as 3D-rendered creatures in the Painted style: art/rendered/mob-<creature>.png,
// a strip of 144x144 frames laid out as a player figure's (N, S, W, E; standing then a
// walk cycle each), no gear layers. Which creature a mob is comes from its name, on whole
// words, first match wins; anything else keeps its painted (or Pixel) picture.

const CREATURES = [
  ['rat', /\b(rats?|ratlings?)\b/],
  ['spider', /\b(spiders?|arachnids?)\b/],
  ['snake', /\b(snakes?|serpents?|vipers?|adders?|asps?)\b/],
  ['frog', /\b(frogs?|toads?)\b/],
  ['wasp', /\b(wasps?|hornets?|bees?)\b/],
  ['cow', /\b(cows?|bulls?|cattle|ox|oxen)\b/],
  ['horse', /\b(horses?|ponies|pony|mares?|stallions?|steeds?)\b/],
  ['pig', /\b(pigs?|hogs?|boars?|swine|sows?)\b/],
  ['sheep', /\b(sheep|ewes?|rams?|lambs?)\b/],
  // the dog picture is a pug: small dogs only, not fierce ones (black dogs, hounds, jackals)
  ['dog', /\b(pugs?|pupp(y|ies)|pups?|lapdogs?|mutts?)\b/],
  ['llama', /\b(llamas?|alpacas?)\b/],
  ['skeleton', /\b(skeletons?|skeletal|bones|bonewalkers?|undead warriors?)\b/],
  ['slime', /\b(slimes?|oozes?|jelly|jellies|gels?|blobs?|puddings?)\b/],
  ['bat', /\b(bats?)\b/],
  // not "Dragon Knight": a man in dragon armour (js/npcoutfits.js)
  ['dragon', /\b(dragons?|drakes?|wyrms?|wyverns?|whelps?|dragonlings?|wyrmlings?)\b(?! knight)/],
  ['mushroom', /\b(mushrooms?|shrooms?|myconids?|fungus|fungi|fungal|toadstools?|sporelings?)\b/],
];

// Slimes come in colours (mob-slime_<colour>.png), picked from a colour or element word
// in the name; anything else is the green mob-slime.png.
const SLIME_COLOURS = [
  ['slime_red', /\b(red|crimson|scarlet|blood|bloody|fire|flame|flaming|magma|lava|ember|cinder)\b/],
  ['slime_blue', /\b(blue|azure|ice|icy|frost|frozen|water|cold)\b/],
  ['slime_purple', /\b(purple|violet|magenta|arcane|void)\b/],
  ['slime_yellow', /\b(yellow|gold|golden|amber|sulphur|sulfur|lightning|electric|shock)\b/],
  ['slime_black', /\b(black|dark|shadow|tar|pitch|oil|oily)\b/],
  ['slime_grey', /\b(grey|gray|white|silver|stone|rock|ash|grime|dust)\b/],
];

export function creatureSheetFor(name) {
  const n = String(name ?? '').toLowerCase();
  for (const [creature, re] of CREATURES) {
    if (!re.test(n)) continue;
    if (creature === 'slime') return SLIME_COLOURS.find(([, c]) => c.test(n))?.[0] ?? 'slime';
    return creature;
  }
  return null;
}

// The sheet to fall back on while a variant loads or if it fails (the green slime), or null.
export function creatureFallback(sheet) {
  return sheet?.startsWith('slime_') ? 'slime' : null;
}

// Creatures that keep moving when they aren't going anywhere: fliers flap, snakes slither.
// The value is ms a frame: a dragon's big wings beat slower than a bat's.
const FLIERS = new Map([['bat', 90], ['dragon', 130], ['snake', 110]]);
export function hovers(creature) {
  return FLIERS.has(creature);
}
export function hoverMs(creature) {
  return FLIERS.get(creature) ?? 90;
}
