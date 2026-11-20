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
// Effects on a creature (drawn by js/renderer.js, js/lighting.js and the particle pools in
// js/weather.js): by mob NAME first (named mobs, then whole-word rules), then by the SHEET it
// draws with; a mob can have two (a Water Shade is ghostly and wet). Only rendered creatures
// show them, so a name with no picture yet (frost bear) waits for its art.
export const CREATURE_FX = { 'devilkin champion': ['burning'] };
const FX_WORDS = [
  // "ice skeleton", "frost wolf", "Snow Bear": any cold word
  ['frost', /\b(ice|icy|frost|frosty|frozen|snow|winter|rime|glacial)\b/],
  // "fire skeleton", not "skeleton of fire" nor "fire slime"
  ['burning', /\b(fire|fires|fiery|flame|flames|flaming|burning|blazing|ember|embers|ash|ashen|infernal)\b.*\b(skeletons?|skeletal|bones|bonewalkers?)\b/],
  ['shadow', /\b(shadow|shadows|dark|void)\b/],
  ['blight', /\b(blight|blighted|plague|plagued|rotting|rotten|diseased|bog crawlers?)\b/],
  ['wet', /\b(sea|lake|water|river|tide|drowned)\b/],
];
// By the picture: every ghost is ghostly (gloom, Water Shade, marsh wisp, swamp horror, Grey
// Herald...); demons, black dogs and gloom hounds (the black wolf) smoky.
const SHEET_FX = [
  ['ghostly', /^ghost/],
  ['shadow', /^(demon_red|demon_blue|wolf_black)$/],
];
// The order a pair is drawn in (the first one's tint is the figure's), and the most a mob has.
const FX_ORDER = ['burning', 'frost', 'ghostly', 'shadow', 'blight', 'wet', 'sparkle'];
const MAX_FX = 2;
export function creatureFxList(name, sheet = creatureSheetFor(name)) {
  const n = String(name ?? '').toLowerCase().trim();
  if (CREATURE_FX[n]) return CREATURE_FX[n];
  const found = new Set();
  for (const [fx, re] of FX_WORDS) if (re.test(n)) found.add(fx);
  if (sheet) for (const [fx, re] of SHEET_FX) if (re.test(sheet)) found.add(fx);
  return FX_ORDER.filter((f) => found.has(f)).slice(0, MAX_FX);
}
// The first of them, or null.
export function creatureFx(name) {
  return creatureFxList(name)[0] ?? null;
}

// The effects.
//   light   as js/lighting.js's lights (radius in squares, colour, glow, flicker): the ground
//           lit at night; null for none
//   glow    a light pool drawn under the figure, day or night ([r, g, b], glowAlpha); 'strip'
//           takes the colour from the creature's own picture
//   pulse   the glow (and light) swelling slowly, seconds a cycle; aura: the glow's colour
//           washed over the figure too (alpha), pulsing with it
//   tint    the figure washed toward a colour (tintAmount 0-1); flash: its flicker highlight
//   alpha, bob   the figure drawn see-through, and drifting up and down (part of a square)
//   ground  a soft patch on the ground at the feet: [r, g, b, alpha]
//   shine   a slow glint sweeping over the figure (alpha)
//   parts   particles, each { pool: 'glow' (added light) or 'smoke' (painted over), colours
//           ('strip' for the picture's), per: how many each creature keeps, from: 'points'
//           (skull/shoulders/hands), 'head', 'body' or 'feet', life [min, max] s, vx spread,
//           vy [min, max] squares/s (negative up), fall: gravity, size [min, max] squares,
//           grow: size at the end of its life (1 steady, <1 shrinking), alpha, twinkle,
//           wait [min, max] s between one and the next (now and then), breath: blown the way
//           it faces }
export const FX = {
  burning: {
    light: { r: 2.8, color: 0xff6a20, glow: 0.4, flicker: 1, creature: true },
    glow: [255, 120, 40], glowAlpha: 0.5, tint: '#ff6a1a', tintAmount: 0.4, flash: '#ffc060',
    parts: [{ pool: 'glow', colours: [0xffb040, 0xff7a20, 0xffe070, 0xff5018], per: 10, from: 'points', life: [0.3, 0.75], vx: 0.15, vy: [-0.75, -0.3], size: [0.06, 0.14], grow: 0.5, alpha: 1 }],
  },
  frost: {
    light: { r: 2.2, color: 0x80c8ff, glow: 0.25, flicker: 0.2, creature: true },
    glow: [150, 210, 255], glowAlpha: 0.3, tint: '#9ad0ff', tintAmount: 0.25, flash: '#e0f4ff',
    parts: [
      // snowflakes drifting slowly down and about
      { pool: 'glow', colours: [0xf0f8ff, 0xc8e8ff, 0xffffff], per: 5, from: 'body', life: [1.4, 2.4], vx: 0.25, vy: [-0.05, 0.12], size: [0.04, 0.08], grow: 0.8, alpha: 0.85 },
      // a puff of frosty breath now and then
      { pool: 'smoke', colours: [0xeef6ff], per: 1, from: 'head', life: [0.8, 1.2], vx: 0.05, vy: [-0.12, -0.05], size: [0.12, 0.16], grow: 2.6, alpha: 0.32, wait: [1.5, 4], breath: 0.35 },
    ],
  },
  ghostly: {
    light: { r: 2, color: 0x9ab8ff, glow: 0.2, flicker: 0, creature: true },
    glow: 'strip', glowAlpha: 0.4, pulse: 3.2, aura: 0.22, tint: null, alpha: 0.8, bob: 0.04,
    parts: [{ pool: 'glow', colours: 'strip', per: 3, from: 'feet', life: [1.5, 2.6], vx: 0.18, vy: [-0.3, -0.12], size: [0.14, 0.22], grow: 1.6, alpha: 0.3 }],
  },
  shadow: {
    light: null,
    glow: null, tint: '#140a1c', tintAmount: 0.12, ground: [10, 0, 16, 0.4],
    parts: [{ pool: 'smoke', colours: [0x100818, 0x1c1028, 0x08040c], per: 6, from: 'body', life: [1, 1.8], vx: 0.35, vy: [-0.45, -0.18], size: [0.1, 0.16], grow: 2.2, alpha: 0.3 }],
  },
  blight: {
    light: { r: 1.6, color: 0xa8d040, glow: 0.15, flicker: 0.1, creature: true },
    glow: null, tint: '#a8c040', tintAmount: 0.14, ground: [100, 140, 20, 0.25],
    parts: [
      { pool: 'glow', colours: [0xb8d040, 0xd8e060, 0x90c030], per: 4, from: 'body', life: [0.8, 1.4], vx: 0.12, vy: [-0.35, -0.12], size: [0.05, 0.09], grow: 0.6, alpha: 0.8 },
      { pool: 'smoke', colours: [0x9ab030, 0x7a9020], per: 1, from: 'body', life: [0.5, 0.7], vx: 0, vy: [0, 0.05], fall: 2.4, size: [0.04, 0.05], grow: 1, alpha: 0.9, wait: [1.2, 3.5] },
    ],
  },
  wet: {
    light: null,
    glow: null, tint: null, shine: 0.2,
    parts: [{ pool: 'smoke', colours: [0xa8d8ff, 0xd0ecff], per: 2, from: 'body', life: [0.45, 0.6], vx: 0, vy: [0, 0.05], fall: 2.6, size: [0.035, 0.045], grow: 1, alpha: 0.85, wait: [0.8, 2.6] }],
  },
  // not on anything yet
  sparkle: {
    light: null,
    glow: null, tint: null,
    parts: [{ pool: 'glow', colours: [0xfff0b0, 0xffffff, 0xffe080], per: 4, from: 'body', life: [0.35, 0.7], vx: 0, vy: [0, 0], size: [0.05, 0.1], grow: 1, twinkle: true, alpha: 1, wait: [0.2, 1.2] }],
  },
};
// Effects on a player's wielded weapon (yours and other players', Painted style; the name ->
// effect is js/gear.js weaponFx). Only the weapon: drawn by js/renderer.js over the weapon
// layer's own pixels in each frame (so it follows the swing and the walk), its light and
// particles by js/lighting.js and js/weather.js from the same box. As FX, plus:
//   glint   a bright band travelling along the weapon (alpha), every `glintEvery` seconds
//   reach   the glow pool's size, times the weapon's
export const WEAPON_FX = {
  // small flames licking up the blade, a warm flicker that lights the ground a little at night
  flaming: {
    light: { r: 1.3, color: 0xff7a28, glow: 0.3, flicker: 1, creature: true },
    glow: [255, 130, 40], glowAlpha: 0.45, reach: 1.1,
    parts: [{ pool: 'glow', colours: [0xffb040, 0xff7a20, 0xffe070], per: 5, from: 'body', life: [0.25, 0.5], vx: 0.08, vy: [-0.55, -0.25], size: [0.035, 0.08], grow: 0.4, alpha: 1 }],
  },
  // a pale blue glow and a few drifting ice motes
  frost: {
    light: null,
    glow: [160, 215, 255], glowAlpha: 0.35, reach: 1,
    parts: [{ pool: 'glow', colours: [0xf0f8ff, 0xc8e8ff], per: 3, from: 'body', life: [1, 1.8], vx: 0.15, vy: [-0.05, 0.1], size: [0.025, 0.05], grow: 0.8, alpha: 0.85 }],
  },
  // mithril, elven, silver, holy: a slow glint along it and a faint white-blue shimmer
  glint: {
    light: null,
    glow: [215, 232, 255], glowAlpha: 0.2, reach: 0.9, pulse: 2.6, glint: 1, glintEvery: 2.8,
    parts: [],
  },
  // a thin dark smoke wisping off it
  shadow: {
    light: null,
    glow: null,
    parts: [{ pool: 'smoke', colours: [0x100818, 0x1c1028], per: 3, from: 'body', life: [0.8, 1.4], vx: 0.15, vy: [-0.35, -0.15], size: [0.04, 0.07], grow: 2.2, alpha: 0.32 }],
  },
  // sickly green drips
  venom: {
    light: null,
    glow: null,
    parts: [{ pool: 'smoke', colours: [0x9ac030, 0x7ab020, 0xb0d040], per: 2, from: 'body', life: [0.45, 0.6], vx: 0, vy: [0, 0.05], fall: 2.4, size: [0.03, 0.04], grow: 1, alpha: 0.95, wait: [0.5, 1.6] }],
  },
};
// Where a weapon effect is in world squares, for its light and particles: the weapon layer's
// box (opaqueBox, parts of the frame) on a figure standing on (x, y) at its normal size; its
// anchor is the middle of that box, its points the tip end and the middle.
export function weaponFxSource(x, y, box) {
  const [x0, y0] = fxPoint(x, y, [box.left, box.top]);
  const [x1, y1] = fxPoint(x, y, [box.right, box.bottom]);
  const anchor = [(x0 + x1) / 2, (y0 + y1) / 2];
  return { box: { x0, y0, x1, y1 }, anchor, pts: [[anchor[0], y0 + (y1 - y0) * 0.2], anchor], head: [anchor[0], y0] };
}

// Names drawn over the head rather than under the feet: creatures drawn bigger than a person,
// by their draw scale or because their frames are filled by a big beast.
const BIG_FRAMES = new Set(['dragon', 'wolf_great', 'lizard_gator', 'maneater', 'horse', 'cow']);
export function nameAbove(creature, name = '') {
  return !!creature && (drawScale(creature, name) > 1.1 || BIG_FRAMES.has(creature));
}
// The box a frame's picture fills (pixels with alpha over minAlpha), as parts of the frame:
// { top, left, right, bottom } from 0 to 1; the whole frame for an empty one.
export function opaqueBox(data, w, h, minAlpha = 16) {
  let top = h, left = w, right = -1, bottom = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] <= minAlpha) continue;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
    if (x < left) left = x;
    if (x > right) right = x;
  }
  if (right < 0) return { ...WHOLE_FRAME };
  return { top: top / h, left: left / w, right: (right + 1) / w, bottom: (bottom + 1) / h };
}
export const WHOLE_FRAME = Object.freeze({ top: 0, left: 0, right: 1, bottom: 1 });
// A picture's own colour: the average of its opaque pixels, brightened and deepened to a glow
// ([r, g, b]).
export function stripColour(data, minAlpha = 64) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= minAlpha) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  if (!n) return null;
  r /= n; g /= n; b /= n;
  const k = 235 / Math.max(r, g, b, 1); // as bright as it goes, the hue kept
  const rgb = [r * k, g * k, b * k];
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3; // and more of it: a pale picture still glows a colour
  return rgb.map((v) => Math.round(Math.max(0, Math.min(255, mean + (v - mean) * 1.8))));
}
// Beasts on four legs: where their effects come from, by facing (0 n, 1 s, 2 w, 3 e): head
// first, then along the back; as parts of the box their picture fills (not the frame: a wolf
// seen head-on is a small thing at the bottom of it).
const BEASTS = /^(wolf|hound|coyote|cat|bug|mole|lizard|dinosaur|maneater|horse|cow|pig|sheep|dog|llama|rat)/;
const BEAST_POINTS = [
  [[0.5, 0.12], [0.5, 0.35], [0.5, 0.6]], // n
  [[0.5, 0.2], [0.35, 0.3], [0.65, 0.3]], // s
  [[0.12, 0.2], [0.45, 0.3], [0.75, 0.3]], // w
  [[0.88, 0.2], [0.55, 0.3], [0.25, 0.3]], // e
];
// A creature's effect points by facing, as parts of its frame: people-shaped ones (skeletons,
// ghosts, demons) on their frame; beasts fitted into `box`, the part of the frame their picture
// fills (opaqueBox).
export function fxPoints(creature, dir, box = WHOLE_FRAME) {
  if (!BEASTS.test(creature ?? '')) return FX_POINTS[dir] ?? FX_POINTS[1];
  const pts = BEAST_POINTS[dir] ?? BEAST_POINTS[1];
  return pts.map(([x, y]) => [box.left + x * (box.right - box.left), box.top + y * (box.bottom - box.top)]);
}
// Where an effect's particles rise from, by facing (0 n, 1 s, 2 w, 3 e): skull, shoulders and
// hands, as [x, y] across a figure's frame (0-1 from the top left, before its draw scale).
const SKULL = [0.5, 0.2];
export const FX_POINTS = [
  [SKULL, [0.4, 0.33], [0.6, 0.33], [0.32, 0.52], [0.68, 0.52]], // n
  [SKULL, [0.38, 0.33], [0.62, 0.33], [0.3, 0.52], [0.7, 0.52]], // s
  [[0.47, 0.2], [0.5, 0.33], [0.4, 0.5], [0.58, 0.54]], // w
  [[0.53, 0.2], [0.5, 0.33], [0.6, 0.5], [0.42, 0.54]], // e
];
// A point of a figure drawn on the square (x, y) at a scale, in world squares (feet anchored
// at the bottom centre, as scaledBox).
export function fxPoint(x, y, [fx, fy], scale = 1) {
  return [x + (fx - 0.5) * scale, y + 0.5 - (1 - fy) * scale];
}
// The flicker of a fire (and lighting.js's lights): about 1, by `amount`, never repeating exactly.
export function flicker(secs, seed, amount = 1) {
  return 1 + amount * 0.06 * (Math.sin(secs * 3.2 + seed) + Math.sin(secs * 7.3 + seed * 3) * 0.5);
}

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
