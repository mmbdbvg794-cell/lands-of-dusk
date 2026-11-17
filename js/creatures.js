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

export function creatureSheetFor(name) {
  const n = String(name ?? '').toLowerCase();
  for (const [creature, re] of CREATURES) if (re.test(n)) return creature;
  return null;
}

// Creatures that fly: they keep flapping when they aren't going anywhere.
const FLIERS = new Set(['bat']);
export function hovers(creature) {
  return FLIERS.has(creature);
}
