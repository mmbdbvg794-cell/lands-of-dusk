// Mobs drawn as 3D-rendered creatures in the Painted style: art/rendered/mob-<creature>.png,
// a strip of 144x144 frames laid out as a player figure's (N, S, W, E; standing then a
// walk cycle each), no gear layers. Which creature a mob is comes from its name, on whole
// words, first match wins; anything else keeps its painted (or Pixel) picture.

// One-off mobs whose names are plain words ("Claw", "Fallen"): only the whole name, so a "Fallen
// Knight" or a "Claw Hammer" isn't caught. Checked before the word lists below.
const NAMED = new Map([
  ['dran', 'demon_blue'],
  ['fallen', 'demon_red'], ['claw', 'demon_red'], ['bastard', 'demon_red'], ['ashen gaoler', 'demon_red'],
  ['devilkin champion', 'skeleton'],
  ['freyrbrand', 'dragon'],
  ['grey herald', 'ghost'],
  ['harpy', 'kobold'], ['harpies', 'kobold'],
]);

const CREATURES = [
  ['rat', /\b(rats?|ratlings?)\b/],
  ['spider', /\b(spiders?|arachnids?)\b/],
  ['snake', /\b(snakes?|serpents?|vipers?|adders?|asps?|sand worms?)\b/],
  ['frog', /\b(frogs?|toads?)\b/],
  ['wasp', /\b(wasps?|hornets?|bees?)\b/],
  ['cow', /\b(cows?|bulls?|cattle|ox|oxen)\b/],
  ['horse', /\b(horses?|ponies|pony|mares?|stallions?|steeds?)\b/],
  ['pig', /\b(pigs?|hogs?|boars?|swine|sows?)\b/],
  ['sheep', /\b(sheep|ewes?|rams?|lambs?)\b/],
  // the dog picture is a pug: small dogs only, not fierce ones (black dogs, hounds, jackals)
  ['dog', /\b(pugs?|pupp(y|ies)|pups?|lapdogs?|mutts?)\b/],
  // wolves and big dogs, the specific kinds before the plain ones
  ['wolf_great', /\b(great wolf|fenris|wolf champion)\b/],
  ['wolf_frost', /\b(frost|ice|snow|winter|white) wol(f|ves)\b/],
  ['wolf_blight', /\b(blighted|plague|rotting|dire) wol(f|ves)\b/],
  ['wolf_black', /\b(black dogs?|(black|shadow|dark) wol(f|ves)|gloom hounds?|wardogs?)\b/],
  ['wolf', /\b(wol(f|ves)|timberwol(f|ves)|wolfies?)\b/],
  ['hound', /\b(hounds?|white dogs?|dogs?)\b/],
  ['coyote', /\b(coyotes?|jackals?)\b/],
  ['maneater', /\b(man-eaters?|maneaters?|man eaters?)\b/],
  ['dinosaur', /\b(dinosaurs?|dinos?|raptors?|velociraptors?)\b/],
  ['llama', /\b(llamas?|alpacas?)\b/],
  ['skeleton', /\b(skeletons?|skeletal|bones|bonewalkers?|undead warriors?|stalfos|risen|king's-m[ae]n)\b/],
  ['slime', /\b(slimes?|slimers?|sludges?|oozes?|jelly|jellies|gels?|blobs?|puddings?)\b/],
  ['bat', /\b(bats?)\b/],
  // not "Dragon Knight": a man in dragon armour (js/npcoutfits.js)
  ['dragon', /\b(dragons?|drakes?|wyrms?|wyverns?|whelps?|dragonlings?|wyrmlings?)\b(?! knight)/],
  ['mushroom', /\b(mushrooms?|shrooms?|myconids?|fungus|fungi|fungal|toadstools?|sporelings?)\b/],
  // the ghost family, after the wolves (a "gloom hound" is a black wolf) and dragons ("Dragon Spirit")
  ['ghost_water', /\b(water shades?|shades?)\b/],
  ['ghost_marsh', /\b(marsh wisps?|wisps?|will[ -]o[ -]wisps?)\b/],
  ['ghost_swamp', /\b(swamp|bog) horrors?\b/],
  ['ghost_gloom', /\b(glooms?|banshees?)\b/],
  ['ghost', /\b(ghosts?|specters?|spectres?|spirits?|phantoms?|wraiths?|apparitions?)\b/],
  ['mishaven', /\b(mishavens?)\b/],
  ['demon_blue', /\b(minions?)\b/],
  ['imp_dhouly', /\b(dhoul(y|ies))\b/],
  ['imp', /\b(imps?)\b/],
  ['kobold', /\b(kobolds?)\b/],
  ['bug', /\b(bugs?|beetles?|crawlers?|insects?|grubs?)\b/],
  ['mole', /\b(moles?)\b/],
  ['cat', /\b(cats?|kittens?|kitty|kitties|wildcats?|alley cats?|tabby|tabbies|housecats?|bobcats?|lynx|lynxes)\b/],
  ['gargoyle', /\b(gargoyles?)\b/],
  // lizards and their big cousins, the specific kinds first (lizardfolk people are excluded below)
  ['lizard_gator', /\b(alligators?|crocodiles?|crocs?|gators?|wurms?)\b/],
  ['lizard_mire', /\b(mire|swamp|bog|marsh) lizards?\b/],
  ['lizard_stone', /\b(stone|rock|cave) lizards?\b/],
  ['lizard', /\b(lizards?|newts?|salamanders?|geckos?)\b/],
];
// Lizardfolk are people (js/npcoutfits.js), never the lizard animal.
const LIZARD_PEOPLE = /\blizard[- ]?(folk|man|men|woman|women)\b|\blizard.*(axe|warrior|guard|soldier|shaman)/;

// People named after a creature ("Mole Hill Farmer", a rat catcher) stay people (js/npcoutfits.js).
const PERSON = /\b(farmers?|hunters?|catchers?|keepers?|tenders?|traders?|merchants?|sellers?|herders?|tamers?)\b/;

// Slimes come in colours (mob-slime_<colour>.png), picked from a colour or element word
// in the name; anything else is the green mob-slime.png.
const SLIME_COLOURS = [
  ['slime', /\b(toxic|poison|poisonous|acid|acidic)\b/],
  ['slime_red', /\b(red|crimson|scarlet|blood|bloody|fire|flame|flaming|magma|lava|ember|cinder)\b/],
  ['slime_blue', /\b(blue|azure|ice|icy|frost|frozen|water|cold|lake|river|sea)\b/],
  ['slime_purple', /\b(purple|violet|magenta|arcane|void)\b/],
  ['slime_yellow', /\b(yellow|gold|golden|amber|sulphur|sulfur|lightning|electric|shock)\b/],
  ['slime_black', /\b(black|dark|shadow|tar|pitch|oil|oily)\b/],
  ['slime_grey', /\b(grey|gray|white|silver|stone|rock|ash|grime|dust)\b/],
];

export function creatureSheetFor(name) {
  const n = String(name ?? '').toLowerCase().trim();
  if (NAMED.has(n)) return NAMED.get(n);
  if (PERSON.test(n) || LIZARD_PEOPLE.test(n)) return null;
  for (const [creature, re] of CREATURES) {
    if (!re.test(n)) continue;
    if (creature === 'slime') return SLIME_COLOURS.find(([, c]) => c.test(n))?.[0] ?? 'slime';
    return creature;
  }
  return null;
}

// The sheet to fall back on while a variant loads or if it fails (the green slime, the grey wolf), or null.
export function creatureFallback(sheet) {
  if (sheet?.startsWith('slime_')) return 'slime';
  if (sheet?.startsWith('wolf_')) return 'wolf';
  if (sheet?.startsWith('ghost_')) return 'ghost';
  if (sheet?.startsWith('lizard_')) return 'lizard';
  if (sheet === 'imp_dhouly') return 'imp';
  return null;
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

// Creatures only ever seen side-on: facing N or S they show their last side (W or E),
// default E (a raised snake seen head-on is just a tall tube). 0 n, 1 s, 2 w, 3 e.
export const SIDE_ONLY = new Set(['snake']);
// Creatures drawn bigger than a person: their frame scaled about its bottom centre (feet
// stay put; it grows upward and sideways). 1 for everyone else.
export const DRAW_SCALE = { mishaven: 1.3, demon_blue: 1.15, demon_red: 1.15 };
// Bosses that would otherwise look exactly like their own soldiers: by mob name, in place of the sheet's.
export const NAME_SCALE = { 'ashen gaoler': 1.35 };
export function drawScale(creature, name = '') {
  return NAME_SCALE[String(name).toLowerCase().trim()] ?? DRAW_SCALE[creature] ?? 1;
}
// Where a frame of side `cell` drawn at (px, py) goes at that scale: [x, y, side].
export function scaledBox(px, py, cell, scale) {
  const side = cell * scale;
  return [px - (side - cell) / 2, py - (side - cell), side];
}
export function sideDir(creature, dir, lastSide = 3) {
  if (!SIDE_ONLY.has(creature) || dir === 2 || dir === 3) return dir;
  return lastSide === 2 ? 2 : 3;
}
