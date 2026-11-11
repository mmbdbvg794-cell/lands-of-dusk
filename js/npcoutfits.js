// Townsfolk and other people NPCs drawn as 3D-rendered figures in the Painted
// style: a rendered body (art/rendered/look0.png men, look8.png women) wearing
// white clothing layers (look<N>-npc-*.png and the gear layers) tinted per NPC.
// Everything is chosen from the NPC's name, so the same NPC always looks the
// same. Names that aren't people (animals, skeletons, ...) or people without a
// fitting body (duergar, ash-sworn) get null and keep their painted art.

function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

const FEMALE = /woman|girl|lady|maid|wife|witch|queen|princess|nun|priestess|mother|sister|daughter/;

// Everyday dyes: linen, oatmeal, browns, greens, blues, madder, rust, plum, charcoal, grey.
const CLOTH = ['#c8b890', '#a89870', '#6a4a2a', '#7a5a3a', '#4f6b3a', '#5a6a4a', '#4a5f80', '#3a4a6a', '#7a2a2a', '#8a5a3a', '#5a3a5a', '#3a3a40', '#8a8a7a'];
const LEATHER = ['#6a4a2a', '#5a3a20', '#3a2a1a', '#7a5a3a'];
const ROBES = ['#3a4a8a', '#5a2a6a', '#7a2a2a', '#2a5a4a', '#3a3a40'];
const GREENS = ['#4f6b3a', '#5a6a4a', '#6a5a3a'];
const APRON = '#d8d0b8';
const WOOD = '#74502c';
const STEEL = '#c8ccd4';
// [name pattern, armour colour, trim/cloak colour] as tools/paintart/bestiary.js.
const ARMOURS = [
  [/dark|doom|shadow/, '#2a2830', '#8a2a2a'],
  [/dragon/, '#2a6a3a', '#d8b040'],
  [/water/, '#2a7a8a', '#a8e0e8'],
  [/hell/, '#6a1410', '#f08030'],
  [/forest/, '#3a5a2a', '#a08a50'],
  [/gladiator/, '#a8743a', '#f0d080'],
  [/guard|warden|soldier/, '#8a8e98', '#c8b060'],
];

export function npcOutfit(name) {
  const n = String(name ?? '').toLowerCase();
  if (!n) return null;
  const female = FEMALE.test(n);
  const look = female ? 8 : 0;
  const pick = (list, key) => list[Math.floor(hash(`${n}|${key}`) * list.length)];
  const chance = (key, p) => hash(`${n}|${key}`) < p;
  const layers = [];
  const wear = (layer, colour) => layers.push([layer, colour]);

  if (/skeleton|stalfos|king's-man|grey herald|duergar|thrumgar|ash-sworn/.test(n)) return null;

  if (/knight|guard|warden|soldier|gladiator|warlord/.test(n)) {
    const [, metal, trim] = ARMOURS.find(([re]) => re.test(n)) ?? [null, '#8a8e98', '#c8b060'];
    wear('legs-plate', metal);
    wear('torso-plate', metal);
    if (chance('cloak', /knight|warlord/.test(n) ? 0.6 : 0.2)) wear('npc-cloak', trim);
    if (!/gladiator/.test(n)) wear('helm', metal);
    wear(/gladiator/.test(n) ? 'weapon-spear' : 'weapon-sword', STEEL);
    return { look, layers };
  }
  if (/wizard|mage|keymaster|plenton/.test(n)) {
    const robe = pick(ROBES, 'robe');
    wear('torso', robe);
    if (chance('belt', 0.5)) wear('npc-belt', pick(LEATHER, 'belt'));
    if (chance('hat', 0.5)) wear('npc-hat', robe);
    wear('weapon-staff', WOOD);
    return { look, layers };
  }
  if (/hunter/.test(n)) {
    wear('npc-boots', pick(LEATHER, 'boots'));
    wear('legs-cloth', pick(LEATHER, 'legs'));
    wear('npc-tunic', pick(GREENS, 'tunic'));
    wear('npc-belt', pick(LEATHER, 'belt'));
    if (chance('hood', 0.5)) wear('npc-hood', pick(GREENS, 'hood'));
    wear('weapon-bow', WOOD);
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
  if (/bartender|cashier|innkeeper|cook|baker|barmaid/.test(n)) {
    wear('npc-boots', pick(LEATHER, 'boots'));
    if (female) {
      wear('npc-dress', pick(CLOTH, 'dress'));
    } else {
      wear('legs-cloth', pick(CLOTH, 'legs'));
      wear('npc-tunic', pick(CLOTH, 'tunic'));
      wear('npc-vest', pick(CLOTH, 'vest'));
    }
    wear('npc-apron', APRON);
    return { look, layers };
  }
  if (/townfolk|townsfolk|villager|peasant|farmer|merchant|invader|stalker|bob|zack|andy|kenny|cecil|boss|bigbum|grinder|clone/.test(n)) {
    if (female) {
      if (chance('boots', 0.5)) wear('npc-boots', pick(LEATHER, 'boots'));
      if (chance('dress', 0.6)) {
        wear('npc-dress', pick(CLOTH, 'dress'));
      } else {
        wear('npc-skirt', pick(CLOTH, 'skirt'));
        wear('npc-tunic', pick(CLOTH, 'tunic'));
      }
      if (chance('apron', 0.3)) wear('npc-apron', APRON);
      if (chance('belt', 0.3)) wear('npc-belt', pick(LEATHER, 'belt'));
      if (chance('cloak', 0.1)) wear('npc-cloak', pick(CLOTH, 'cloak'));
      if (chance('hood', 0.15)) wear('npc-hood', pick(CLOTH, 'hood'));
      else if (chance('hat', 0.1)) wear('npc-hat', pick(CLOTH, 'hat'));
    } else {
      if (chance('boots', 0.85)) wear('npc-boots', pick(LEATHER, 'boots'));
      wear('legs-cloth', pick(CLOTH, 'legs'));
      wear('npc-tunic', pick(CLOTH, 'tunic'));
      if (chance('vest', 0.25)) wear('npc-vest', pick(CLOTH, 'vest'));
      if (chance('belt', 0.5)) wear('npc-belt', pick(LEATHER, 'belt'));
      if (chance('cloak', 0.15)) wear('npc-cloak', pick(CLOTH, 'cloak'));
      if (chance('hood', 0.1)) wear('npc-hood', pick(CLOTH, 'hood'));
      else if (chance('hat', 0.2)) wear('npc-hat', pick(CLOTH, 'hat'));
    }
    return { look, layers };
  }
  return null;
}

// The outfit's layers in drawing order for a facing (0 n, 1 s, 2 w, 3 e). A cloak
// hangs at the back: under the rest unless the NPC faces away (north). The weapon
// is in the right hand: behind the body facing north or west, as for players.
export function npcLayersFor(outfit, dir) {
  const back = dir === 0;
  const cloak = outfit.layers.filter(([l]) => l === 'npc-cloak');
  const weapon = outfit.layers.filter(([l]) => l.startsWith('weapon'));
  const rest = outfit.layers.filter(([l]) => l !== 'npc-cloak' && !l.startsWith('weapon'));
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
