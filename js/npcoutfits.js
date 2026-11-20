// Townsfolk and other people NPCs drawn as 3D-rendered figures in the Painted
// style: a rendered body (art/rendered/look0.png men, look8.png women) wearing
// white clothing layers (look<N>-npc-*.png and the gear layers) tinted per NPC.
// Everything is chosen from the NPC's name, so the same NPC always looks the
// same. Names that aren't people (animals, skeletons, ...) or people without a
// fitting body (ash-sworn) get null and keep their painted art. Duergar wear dark
// iron on the rendered-only grey dwarf body, look 20.

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

const FEMALE = /woman|girl|lady|maid|wife|widow|witch|queen|princess|nun|priestess|mistress|matron|mother|sister|daughter/;

// Everyday dyes: linen, oatmeal, browns, greens, blues, madder, rust, plum, charcoal, grey.
const CLOTH = ['#c8b890', '#a89870', '#6a4a2a', '#7a5a3a', '#4f6b3a', '#5a6a4a', '#4a5f80', '#3a4a6a', '#7a2a2a', '#8a5a3a', '#5a3a5a', '#3a3a40', '#8a8a7a'];
const LEATHER = ['#6a4a2a', '#5a3a20', '#3a2a1a', '#7a5a3a'];
const ROBES = ['#3a4a8a', '#5a2a6a', '#7a2a2a', '#2a5a4a', '#3a3a40'];
const GREENS = ['#4f6b3a', '#5a6a4a', '#6a5a3a'];
const APRON = '#d8d0b8';
// Sun-bleached desert colours: sand, ochre, faded brown, bone, dust.
// Earth colours for the lizardfolk warriors: mud, moss, clay, bark.
const EARTH = ['#5a4a32', '#4a5232', '#7a5a3a', '#3e3424', '#6a6040'];
const SAND = ['#d8c49a', '#c8a060', '#9a7a52', '#e4dcc4', '#b0a088'];
// Contrasting trims: ochre, cream, dark brown, madder, indigo, black.
const TRIMS = ['#c8a040', '#d8d0b8', '#3a2a1a', '#7a2a2a', '#3a4a6a', '#2a2a2a'];
const WOOD = '#74502c';
const STEEL = '#c8ccd4';
// Duergar dark iron: near-black steel with a little blue; Thrumgar's darker and heavier, dull gold trim.
const IRON = '#3a4250';
const WARLORD_IRON = '#262a32';
const DULL_GOLD = '#8a7438';
const OLD_GOLD = '#a08a4a';
export const DUERGAR_LOOK = 20;
// [name pattern, armour colour, trim/cloak colour] as tools/paintart/bestiary.js.
const ARMOURS = [
  [/dark|doom|shadow/, '#2a2830', '#8a2a2a'],
  [/dragon/, '#2a6a3a', '#d8b040'],
  [/water/, '#2a7a8a', '#a8e0e8'],
  [/hell/, '#6a1410', '#f08030'],
  [/forest/, '#3a5a2a', '#a08a50'],
  [/gladiator/, '#a8743a', '#f0d080'],
];

// A hex colour lighter (f > 1, toward white) or darker (f < 1).
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f));
  return `#${ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

// The trim colour for a player's piece of gear: metal edges polished brighter, cloth and
// leather edges darker.
export function trimColour(hex, metal) {
  return hex ? shade(hex, metal ? 1.45 : 0.55) : hex;
}

// Boots and shoes go on over the trousers (their tops would otherwise poke out either side of
// the leg), and under everything else; each trim stays right after its piece.
function layerRank(layer) {
  const base = layer.replace(/-trim$/, '');
  if (base.startsWith('legs-') || base === 'npc-trousers') return 0;
  if (base === 'npc-boots' || base === 'npc-shoes') return 1;
  return 2;
}

// Children are drawn smaller, about their feet (as js/creatures.js DRAW_SCALE).
const CHILD = /\b(child|children|kids?|boys?|girls?|urchins?|orphans?)\b/;
export function npcScale(name) {
  return CHILD.test(String(name ?? '').toLowerCase()) ? 0.75 : 1;
}

export function npcOutfit(name, where = null) {
  const outfit = dressNpc(name, where);
  if (outfit) outfit.scale = npcScale(name);
  if (outfit) outfit.layers = outfit.layers.map((l, i) => [l, i]).sort((a, b) => layerRank(a[0][0]) - layerRank(b[0][0]) || a[1] - b[1]).map(([l]) => l);
  return outfit;
}

// Bodies by race: [man, woman] (players.gif looks; see js/figure.js).
const BODIES = { human: [0, 8], elf: [1, 9], drow: [2, 10], lizard: [6, 11] };
// The towns of the other races, [race, x0, y0, x1, y1]: a person standing there has that
// race's body unless what they look like says otherwise. Everywhere else: human.
export const RACE_AREAS = [
  ['drow', 1260, 850, 1429, 989], // Velkarath, underground (js/atmosphere.js)
  ['elf', 420, 1170, 520, 1330], // Aelindor, Aelindor Landing, the Grove of Waking
  ['lizard', 1650, 900, 1740, 1000], // Ssarakh
  ['lizard', 1835, 980, 1915, 1030], // the Hatching Pools
];
export function raceAt(x, y) {
  return RACE_AREAS.find(([, x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)?.[0] ?? 'human';
}
// Female first names that occur in the world, for people whose name and look don't say.
export const FEMALE_NAMES = new Set(['agna', 'bertha', 'corra', 'elowen', 'flora', 'hessa', 'hilda', 'ilse', 'ingrid', 'kit', 'linnet', 'liriel', 'mabel', 'miriel', 'mossa', 'nan', 'nimue', 'orla', 'petra', 'prue', 'rhea', 'sylwen', 'tamsin', 'tess', 'thalia', 'wenna', 'ysolde', 'jenova']);
// Not people, whatever their name or dialogue: furniture, dummies, barrels, notices.
const NOT_PEOPLE = /\b(couch|training dummy|dummy|water barrel|barrel|unknown)\b/;

// Race and sex for an NPC: what the prop looks like (the server's "prop looks": "Dark Elf
// Woman", "lizardfolk", "Villager Man"), then its name, then where it stands.
export function npcRace(name, where) {
  const n = String(name ?? '').toLowerCase(), seen = String(where?.look ?? '').toLowerCase();
  for (const s of [seen, n]) {
    if (/\b(dark elf|drow)\b/.test(s)) return 'drow';
    if (/\b(elf|elven)\b/.test(s)) return 'elf';
    if (/\blizard/.test(s)) return 'lizard';
  }
  return where && Number.isFinite(where.x) ? raceAt(where.x, where.y) : 'human';
}
export function npcFemale(name, where) {
  const n = String(name ?? '').toLowerCase(), seen = String(where?.look ?? '').toLowerCase();
  if (/woman|matron|priestess|girl|lady/.test(seen)) return true;
  if (/\bman\b/.test(seen)) return false;
  return FEMALE.test(n) || n.split(/[^a-z']+/).some((w) => FEMALE_NAMES.has(w));
}

// where (merchants and props that are people, not mobs): { x, y, look, merchant }. With it,
// people get their race's body for where they stand, and those with no wardrobe of their
// own a fallback one from the job in their name.
function dressNpc(name, where = null) {
  const n = String(name ?? '').toLowerCase();
  if (!n) return null;
  const seen = String(where?.look ?? '').toLowerCase();
  if (NOT_PEOPLE.test(n) || /barrel|newsboard|\bboard\b|\bsign\b/.test(seen)) return null;
  // a merchant called "Dagna's Kitchen" is a shop, not a person: it keeps its picture
  if (where?.merchant && /'s\b/.test(n)) return null;
  const female = npcFemale(n, where);
  const [man, woman] = BODIES[where ? npcRace(n, where) : 'human'];
  const look = female ? woman : man;
  const pick = (list, key) => list[Math.floor(hash(`${n}|${key}`) * list.length)];
  const chance = (key, p) => hash(`${n}|${key}`) < p;
  const layers = [];
  // A piece and, if given, its trim (edges, hems, plate bands) in a second colour, drawn right after it.
  const wear = (layer, colour, trim) => {
    layers.push([layer, colour]);
    if (trim) layers.push([`${layer}-trim`, trim]);
  };

  // The wardrobes, shared by the named jobs and the fallbacks below.
  const guard = () => {
    // a mail coat with a leather border over plain trousers and boots, and a helm
    const leather = pick(LEATHER, 'boots');
    // breeches, not the wide generated trousers (which flare into cones); dark so they don't vanish on wooden floors
    wear('npc-trousers', pick(['#26262a', '#2e3440', '#1e2a22'], 'legs'));
    wear('npc-boots', leather);
    wear('torso-chain', '#8a8e98', shade(leather, 0.7));
    wear('helm', '#8a8e98');
    wear(chance('spear', 0.4) ? 'weapon-spear' : 'weapon-sword', STEEL);
  };
  const hunter = () => {
    const leather = pick(LEATHER, 'boots');
    wear('npc-boots', leather, shade(leather, 0.6));
    wear('legs-cloth', pick(LEATHER, 'legs'));
    wear('npc-tunic', pick(GREENS, 'tunic'), leather);
    wear('npc-belt', pick(LEATHER, 'belt'));
    if (chance('hood', 0.5)) wear('npc-hood', pick(GREENS, 'hood'), leather);
    wear('weapon-bow', WOOD);
  };
  const robe = (staff = true) => {
    const colour = pick(ROBES, 'robe');
    wear('torso', colour);
    if (chance('belt', 0.5)) wear('npc-belt', pick(LEATHER, 'belt'));
    if (chance('hat', 0.5) && !/priest/.test(n)) wear('npc-hat', colour);
    if (staff) wear('weapon-staff', WOOD);
  };
  // legs for working people: a skirt for women, trousers or hose for men
  const legs = () => {
    if (female) wear('npc-skirt', pick(CLOTH, 'skirt'), chance('skirttrim', 0.5) && pick(TRIMS, 'skirttrim'));
    else wear(chance('trousers', 0.5) ? 'npc-trousers' : 'legs-cloth', pick(CLOTH, 'legs'));
  };
  const commoner = (hooded = true) => {
    if (female) {
      if (chance('boots', 0.5)) wear('npc-boots', pick(LEATHER, 'boots'));
      if (chance('dress', 0.6)) {
        wear('npc-dress', pick(CLOTH, 'dress'), chance('dresstrim', 0.6) && pick(TRIMS, 'dresstrim'));
      } else {
        wear('npc-skirt', pick(CLOTH, 'skirt'), chance('skirttrim', 0.5) && pick(TRIMS, 'skirttrim'));
        // a laced bodice (npc-shirt on the women's body) or a tunic
        const top = chance('bodice', 0.5) ? 'npc-shirt' : 'npc-tunic';
        wear(top, pick(CLOTH, 'tunic'), chance('tunictrim', 0.5) && pick(TRIMS, 'tunictrim'));
      }
      if (chance('apron', 0.3)) wear('npc-apron', APRON);
      if (chance('belt', 0.3)) wear('npc-belt', pick(LEATHER, 'belt'));
      if (!hooded) return;
      if (chance('cloak', 0.1)) wear('npc-cloak', pick(CLOTH, 'cloak'));
      if (chance('hood', 0.15)) wear('npc-hood', pick(CLOTH, 'hood'));
      else if (chance('hat', 0.1)) { const h = pick(CLOTH, 'hat'); wear('npc-hat', h, shade(h, 0.7)); }
    } else {
      if (chance('boots', 0.85)) wear(chance('shoes', 0.4) ? 'npc-shoes' : 'npc-boots', pick(LEATHER, 'boots'));
      // baggy peasant trousers or plain hose; a shirt or a tunic
      wear(chance('trousers', 0.5) ? 'npc-trousers' : 'legs-cloth', pick(CLOTH, 'legs'));
      wear(chance('shirt', 0.4) ? 'npc-shirt' : 'npc-tunic', pick(CLOTH, 'tunic'), chance('tunictrim', 0.6) && pick(TRIMS, 'tunictrim'));
      if (chance('vest', 0.25)) wear('npc-vest', pick(CLOTH, 'vest'), chance('vesttrim', 0.5) && pick(TRIMS, 'vesttrim'));
      if (chance('belt', 0.5)) wear('npc-belt', pick(LEATHER, 'belt'));
      if (!hooded) return;
      if (chance('cloak', 0.15)) wear('npc-cloak', pick(CLOTH, 'cloak'));
      if (chance('hood', 0.1)) wear('npc-hood', pick(CLOTH, 'hood'));
      else if (chance('hat', 0.2)) { const h = pick(CLOTH, 'hat'); wear('npc-hat', h, shade(h, 0.7)); }
    }
  };

  if (/skeleton|stalfos|king's-man|grey herald|ash-sworn/.test(n)) return null;

  if (/duergar|thrumgar/.test(n)) {
    // grey dwarves (look 20, sharing look 7's gear layers) in dark iron; not the "Duergar Bounty" notice
    if (/bounty|notice|board/.test(n)) return null;
    const leather = pick(['#3a2a1a', '#2e2218', '#2a2420'], 'boots');
    wear('npc-boots', leather);
    if (/thrumgar|warlord/.test(n)) {
      wear('legs-plate', WARLORD_IRON, DULL_GOLD);
      wear('torso-plate', WARLORD_IRON, DULL_GOLD);
      wear('helm', WARLORD_IRON);
      wear('weapon-hammer', IRON);
    } else if (/delver/.test(n)) {
      wear('legs-cloth', pick(['#26262a', '#2a2622'], 'legs'));
      wear('torso-leather', pick(['#4a3a2e', '#3e3026'], 'leather'), shade(leather, 0.8));
      wear('npc-hood', pick(['#2e2e32', '#363438'], 'hood'));
      wear('weapon-pick', WOOD);
    } else if (/guard/.test(n)) {
      wear('legs-plate', IRON, shade(IRON, 1.3));
      wear('torso-plate', IRON, shade(IRON, 1.3));
      wear('helm', IRON);
      wear(chance('spear', 0.5) ? 'weapon-spear' : 'weapon-axe', IRON);
    } else {
      wear('legs-plate', IRON, shade(IRON, 1.3));
      wear('torso-chain', IRON, shade(leather, 0.8));
      wear('helm', IRON);
      wear('weapon-axe', IRON);
    }
    return { look: DUERGAR_LOOK, layers };
  }
  if (/\bprisoners?\b/.test(n) || /\bprisoner\b/.test(seen)) {
    // ragged and barefoot, wherever they're held: human
    wear('npc-trousers', pick(['#5a5650', '#4a4038', '#6a6258'], 'legs'));
    wear('npc-shirt', pick(['#7a7468', '#6a5a48', '#8a8274'], 'shirt'));
    return { look: female ? 8 : 0, layers };
  }
  if (/\bexecutioners?\b/.test(n)) {
    // the headsman: black hood, black leather jerkin over bare arms, an axe; the Champion in plate legs too
    wear('legs-cloth', '#22201e');
    if (/champion/.test(n)) wear('legs-plate', '#3a3a40', '#22201e');
    wear('npc-boots', '#2a2018');
    wear('torso-hide', '#1e1c1c', '#3a302a');
    wear('npc-hood', '#141414');
    wear('weapon-axe', STEEL);
    return { look: 0, layers };
  }
  if (/\bvampires?\b/.test(n)) {
    // black cloak lined blood-red, an off-white shirt, a dagger
    wear('legs-cloth', '#18181c');
    wear('npc-boots', '#2a2420');
    wear('npc-shirt', '#e8e0d0');
    wear('npc-cloak', '#141418', '#7a1018');
    wear('weapon-dagger', STEEL);
    return { look: 0, layers };
  }
  if (/\blast champion\b/.test(n)) {
    // the last of the champions, in old gold-steel plate (its server picture is empty)
    wear('legs-plate', OLD_GOLD, '#3a2e1e');
    wear('torso-plate', OLD_GOLD, '#3a2e1e');
    wear('helm', OLD_GOLD);
    wear('weapon-sword', STEEL);
    return { look: 0, layers };
  }
  if (/\bdry ones?\b/.test(n)) {
    // desert raiders by the lizard-folk swamps: lizardfolk bodies, sun-bleached hood and hides
    const leather = pick(LEATHER, 'boots');
    wear('npc-boots', leather);
    wear('legs-cloth', pick(SAND, 'legs'));
    wear('torso-hide', pick(SAND, 'hide'), shade(leather, 0.8));
    wear('npc-hood', pick(SAND, 'hood'), chance('hoodtrim', 0.5) && pick(SAND, 'hoodtrim'));
    const tools = /digger/.test(n) ? ['weapon-pick', 'weapon-shovel'] : ['weapon-spear', 'weapon-sword'];
    wear(pick(tools, 'weapon'), /pick|shovel/.test(pick(tools, 'weapon')) ? WOOD : STEEL);
    return { look: female ? 11 : 6, layers };
  }
  if (/\blizard/.test(n) && /axe|warrior|guard|soldier/.test(n)) {
    // lizardfolk warriors: hides and plain cloth in earth colours, an axe or a spear
    wear('legs-cloth', pick(EARTH, 'legs'));
    wear('torso-hide', pick(EARTH, 'hide'), pick(LEATHER, 'hidetrim'));
    wear(/axe/.test(n) ? 'weapon-axe' : 'weapon-spear', STEEL);
    return { look: female ? 11 : 6, layers };
  }
  if (/guard|warden|soldier/.test(n) && !/knight|warlord|gladiator/.test(n)) {
    guard();
    return { look, layers };
  }
  if (/knight|gladiator|warlord/.test(n)) {
    // plate: named armours keep their colours; plain steel gets brighter steel edges, not gold
    const [, metal, trim] = ARMOURS.find(([re]) => re.test(n)) ?? [null, '#8a8e98', shade('#8a8e98', 1.35)];
    wear('legs-plate', metal, trim);
    wear('torso-plate', metal, trim);
    if (chance('cloak', /knight|warlord/.test(n) ? 0.6 : 0.2)) wear('npc-cloak', trim, shade(trim, 0.6));
    if (!/gladiator/.test(n)) wear('helm', metal);
    wear(/gladiator/.test(n) ? 'weapon-spear' : 'weapon-sword', STEEL);
    return { look, layers };
  }
  if (/wizard|mage|keymaster|plenton/.test(n)) {
    robe();
    return { look, layers };
  }
  if (/hunter/.test(n)) {
    hunter();
    return { look, layers };
  }
  if (/thief|stalker|assassin/.test(n)) {
    wear('npc-boots', '#2a2420');
    wear('legs-cloth', '#2a2a2e');
    wear('npc-tunic', '#2a2a2e');
    wear('npc-vest', '#1e1e22');
    if (chance('cloak', 0.6)) wear('npc-cloak', '#26262a');
    wear('npc-hood', '#1e1e22');
    wear('weapon-dagger', STEEL);
    return { look, layers };
  }
  if (/bartender|bar tender|cashier|innkeeper|cook|baker|barmaid/.test(n)) {
    wear('npc-boots', pick(LEATHER, 'boots'));
    if (female) {
      wear('npc-dress', pick(CLOTH, 'dress'), pick(TRIMS, 'dresstrim'));
    } else {
      wear('legs-cloth', pick(CLOTH, 'legs'));
      wear('npc-tunic', pick(CLOTH, 'tunic'), pick(TRIMS, 'tunictrim'));
      wear('npc-vest', pick(CLOTH, 'vest'), pick(TRIMS, 'vesttrim'));
    }
    wear('npc-apron', APRON, pick(TRIMS, 'aprontrim'));
    return { look, layers };
  }
  if (/townfolk|townsfolk|villager|peasant|farmer|merchant|invader|stalker|bob|zack|andy|kenny|cecil|boss|bigbum|grinder|clone/.test(n)) {
    commoner();
    return { look, layers };
  }
  // Mobs stop here; merchants and people props get a wardrobe from the job in their name.
  if (!where) return null;
  if (/\bold\b|widow|herb wife/.test(n)) {
    // the old: everyday clothes under a cloak and hood
    commoner(false);
    const wrap = pick(['#5a5048', '#4a4a44', '#6a5a48', '#3a3a40'], 'wrap');
    wear('npc-cloak', wrap);
    wear('npc-hood', wrap);
  } else if (/smith|armou?rer|weaponmaster|weapons-keeper|armsmaster/.test(n)) {
    // the forge: a shirt, trousers (a skirt for women) and a leather apron
    wear('npc-boots', pick(LEATHER, 'boots'));
    if (female) legs(); else wear('npc-trousers', pick(['#3a3a40', '#4a3a2a', '#2e3440'], 'legs'));
    wear('npc-shirt', pick(CLOTH, 'shirt'));
    wear('npc-apron', pick(LEATHER, 'apron'), pick(LEATHER, 'aprontrim'));
  } else if (/scout|ranger/.test(n)) {
    hunter();
  } else if (/captain|sergeant|drill|patrol|sentinel|recruiter|veteran|quartermaster|blademistress|blademaster/.test(n)) {
    guard();
  } else if (/priest|magister|archivist|loremistress|shaman|elder/.test(n)) {
    robe(!/archivist/.test(n));
  } else if (/trader|seller|grocer|jeweller|pedlar|provisioner|chandler|teller|merchant|monger/.test(n)) {
    // shopkeepers: a tunic or a waistcoat, and a belt for the purse
    wear('npc-boots', pick(LEATHER, 'boots'));
    legs();
    if (chance('vest', 0.5)) {
      wear('npc-shirt', pick(CLOTH, 'shirt'));
      wear('npc-vest', pick(CLOTH, 'vest'), chance('vesttrim', 0.6) && pick(TRIMS, 'vesttrim'));
    } else {
      wear('npc-tunic', pick(CLOTH, 'tunic'), chance('tunictrim', 0.6) && pick(TRIMS, 'tunictrim'));
    }
    wear('npc-belt', pick(LEATHER, 'belt'));
  } else if (/dockhand|sailor|fisher|netmaker|shipwright|harbourmaster/.test(n)) {
    // the waterside: shirt and trousers (or a skirt), a hat for sailors
    wear('npc-boots', pick(LEATHER, 'boots'));
    if (female) legs(); else wear('npc-trousers', pick(CLOTH, 'legs'));
    wear('npc-shirt', pick(CLOTH, 'shirt'));
    if (/sailor/.test(n)) { const h = pick(['#3a4a6a', '#2a2a2e', '#5a4a3a'], 'hat'); wear('npc-hat', h, shade(h, 0.7)); }
  } else if (/\b(guard|soldier)\b/.test(seen)) {
    // no job in the name, but they look like a guard
    guard();
  } else {
    commoner();
  }
  return { look, layers };
}

// The outfit's layers in drawing order for a facing (0 n, 1 s, 2 w, 3 e). A cloak
// hangs at the back: under the rest unless the NPC faces away (north). The weapon
// is in the right hand: behind the body facing north or west, as for players.
export function npcLayersFor(outfit, dir) {
  const back = dir === 0;
  const isCloak = ([l]) => l.startsWith('npc-cloak');
  const isWeapon = ([l]) => l.startsWith('weapon');
  const cloak = outfit.layers.filter(isCloak);
  const weapon = outfit.layers.filter(isWeapon);
  const rest = outfit.layers.filter((x) => !isCloak(x) && !isWeapon(x));
  const before = [...(dir === 0 || dir === 2 ? weapon : []), ...(back ? [] : cloak)];
  const after = [...(back ? cloak : []), ...(dir === 0 || dir === 2 ? [] : weapon)];
  return [...before, ...rest, ...after];
}

// Which way an NPC faces, from its last step (e.anim.fx/fy -> e.x/e.y); `prev`
// when it hasn't moved. 0 n, 1 s, 2 w, 3 e.
export function npcFacing(e, prev = 1) {
  if (!e?.anim) return prev;
  const dx = e.x - e.anim.fx;
  const dy = e.y - e.anim.fy;
  if (!dx && !dy) return prev;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 2 : 3;
  return dy < 0 ? 0 : 1;
}
