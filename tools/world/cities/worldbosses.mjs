// World bosses (server/WorldBoss.java): the bosses' monster files, their
// trophies and the "worldbosses" file that says where each rises and what
// the winners get. Built by tools/world/city.mjs like a town, though no
// squares change and nothing is placed: the server raises a boss itself,
// every few hours, at one of the lairs below.
//
// Lairs (open ground anyone can reach):
//   Ursok the Dread Bear        1544, 301   the hills north-east of Kingshaven
//   Fenris the Great Wolf       610, 1211   the woods east of Aelindor
//   Kraghul the Warlord         1608, 1202  the northern dunes above Eastreach
//   Morvane the Skeleton King   620, 107    the old world's east field
// Each is a fight for a group: 1,100-1,400 HP and strength 80-90 (a quest
// chain's finale is about 350 HP, strength 70). Names carry a family
// word (bear, wolf, warlord, skeleton) so the Painted art draws them.

const mobFile = (stats) => Object.entries(stats).map(([k, v]) => `${k}\n${v}`).join('\n') + '\n.\n';
const itemFile = (desc, image) => `type\nitem\ndescription\n${desc}\nimage\n${image}\n.\n`;

const BOSSES = [
  { name: 'Ursok the Dread Bear', at: [1544, 301], where: 'in the hills north-east of Kingshaven', image: 12,
    stats: { maxhp: 1300, stre: 85, dext: 35, cons: 50 },
    trophy: ['dread bear tooth', 'a tooth as long as your hand, from Ursok the Dread Bear'], rare: ['blood gloves', 'titanium suit'] },
  { name: 'Fenris the Great Wolf', at: [610, 1211], where: 'in the woods east of Aelindor', image: 21,
    stats: { maxhp: 1100, stre: 80, dext: 55, cons: 45 },
    trophy: ['great wolf fang', 'a fang from Fenris the Great Wolf, still sharp'], rare: ['air boots', 'blood belt'] },
  { name: 'Kraghul the Warlord', at: [1608, 1202], where: 'in the northern dunes above Eastreach', image: 39,
    desc: 'Kraghul, warlord of the Ashen Horde: horned, scaled and smoking, come through the burning gate under Firetown. The Sand Kings of the desert bow to him.',
    stats: { maxhp: 1400, stre: 90, dext: 40, cons: 50 },
    trophy: ['kraghuls war flag', 'the tattered war flag of Kraghul the Warlord'], rare: ['nova fists', 'blood helmet'] },
  { name: 'Morvane the Skeleton King', at: [620, 107], where: 'in the east field of the old world', image: 32,
    desc: 'Morvane, once a prince of Zilen and King Aldric\'s brother, who opened the gate under Firetown. Now bones in a rusted crown, and every soul the Horde kills rises for him.',
    stats: { maxhp: 1200, stre: 85, dext: 40, cons: 48 },
    trophy: ['skeleton kings crown', 'the iron crown of Morvane the Skeleton King, cold to the touch'], rare: ['diamond gauntlets', 'serpent scales'] },
];

export const SETTINGS = { every: 180, spread: 60, stay: 60, gold: 300, exp: 800, chance: 0.25 };

export function worldbossesFile() {
  const s = SETTINGS;
  return [
    '# World bosses (server/WorldBoss.java; made by tools/world/cities/worldbosses.mjs).',
    '# Every <every> minutes, give or take <spread>, one rises at its lair if none',
    '# is about, and leaves after <stay> minutes if no one beats it. Everyone on the',
    '# winning side when it falls gets <gold> and <exp>, its trophy, and a chance of',
    '# one of its rare items. "boss reload" in the game reads this again.',
    `every ${s.every}`, `spread ${s.spread}`, `stay ${s.stay}`, `gold ${s.gold}`, `exp ${s.exp}`,
    '# boss <name>|<x>|<y>|<where, in words>|<trophy>|<rare items>|<chance>',
    ...BOSSES.map((b) => `boss ${b.name}|${b.at[0]}|${b.at[1]}|${b.where}|${b.trophy[0]}|${b.rare.join(',')}|${s.chance}`),
    '',
  ].join('\n');
}

export default {
  name: 'World Bosses',
  origin: [0, 0],
  size: [1, 1],
  seed: 83,
  oldWorld: true,
  mayBuild: () => false, // no squares change
  build(p) {
    for (const b of BOSSES) {
      p.file(`defMobs/${b.name}`, mobFile({
        ...(b.desc ? { description: b.desc } : {}),
        maxhp: b.stats.maxhp, maxsp: 100, ...b.stats, inte: 30, wisd: 30,
        bravery: '3.0', grouprelation: '0.0', image: b.image, faction: b.name.toLowerCase(), respawn: 0,
      }));
      p.file(`defItems/${b.trophy[0]}`, itemFile(b.trophy[1], 7));
    }
    p.file('worldbosses', worldbossesFile());
  },
};
