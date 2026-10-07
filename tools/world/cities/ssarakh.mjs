// Ssarakh, the Mire City: the lizardmen's capital, on the west of their
// swamp islands (flan's "Lizardman Island Continent" notes; the swamp is
// tools/world/swamp_islands.py over tiles 168-173 from
// tools/server/swamptiles.py). Built by tools/world/city.mjs on the swamp.
//
//   the Brood Stone, the plaza's heart       1695, 943   (lizardmen arrive
//                                                         from the Hatching
//                                                         Pools, and wake here)
//   the Hall of the Brood (Chieftain Hesska)  1688-1702, 920-930
//   the Shaman's hut (training)               1708-1716, 928-935
//   the Mire Bank (the Mire Teller)           1674-1682, 932-938
//   The Basking Rock (a tavern)               1672-1682, 945-952
//   the harbour: a boardwalk south to a pier into the bay, 1690, 972-990,
//   where Captain Sskarr sells passage on the Marsh Wren to Eastreach.
// Streets are boardwalks over the marsh and bog; houses stand on stilts
// (wooden walls, plank floors). Lizardfolk NPCs look like the game's
// lizardman (a prop of its own, "lizardfolk", image 39).

import { captain } from './ferry.mjs';
import { teller } from './lore.mjs';

const O = [1660, 914];
const A = (x, y) => [x - O[0], y - O[1]];
export const HEART = [1695, 943];

const WARES = {
  food: ['water', 'ale', 'apple', 'sandwich', 'crisps', 'mushroom'],
  weapons: ['dagger', 'short sword', 'broad sword', 'war axe', 'heavy axe', 'bronze sword', 'cheap bow', 'arrow', 'quiver'],
  armour: ['leather cap', 'leather jerkin', 'leather sleeves', 'leather leggings', 'leather gloves', 'leather belt', 'leather shield'],
  potions: ['minor potion', 'minor mana potion', 'tiny potion', 'red potion', 'green potion', 'blue potion', 'mandrake', 'mushroom'],
  train: ['train:Strength', 'train:Intelligence', 'train:Dexterity', 'train:Constitution', 'train:Wisdom', 'train:HP', 'train:MP', 'train:Dodge', 'train:Regeneration', 'train:Mana Regen', 'train:Spell Power'],
};

const say = (says, answers = []) => ({ shouts: [], stages: [{ when: { kind: 'always', value: '' }, says, answers }] });

export default {
  name: 'Ssarakh',
  origin: O,
  size: [75, 85],
  seed: 97,
  // The swamp and its shores, and the bay (for the pier); nothing built.
  mayBuild: (t) => [168, 169, 170, 171, 172, 1, 36, 37, 38, 27, 0, 65, 64, 103, 25, 26, 102].includes(t) || (t >= 66 && t <= 89),
  copies: [
    { from: 'talk/Bank Teller', to: 'talk/Mire Teller', replace: [['Bank Teller says', 'Mire Teller says']] },
  ],
  build(p) {
    const F = (x, y, w, h, ch) => p.fill(...A(x, y), w, h, ch);
    const S = (x, y, ch) => p.set(...A(x, y), ch);
    const B = (x, y, w, h, opts) => p.building(...A(x, y), w, h, opts);
    const PR = (name, x, y) => p.prop(name, ...A(x, y));
    const SIGN = (name, text, x, y) => p.sign(name, text, ...A(x, y));
    const MER = (x, y, wares) => p.merchant(...A(x, y), wares);
    const NPC = (n) => p.npc({ ...n, x: n.x - O[0], y: n.y - O[1] });
    const WALK = (points) => p.path(points.map(([x, y]) => A(x, y)), 'h');

    p.file('defProps/lizardfolk', 'description\nOne of the lizardfolk of the mire, scaled and patient.\nimage\n39\n.\n');
    p.file('defProps/Mire Teller', 'description\nThe Mire Teller, scales gleaming, keeper of the brood\'s coin.\nimage\n39\nlook\nBank Teller\n.\n');

    // The plaza and the boardwalk round it.
    F(1686, 934, 19, 15, 'h');
    F(1688, 936, 15, 11, 'e');
    // Streets: north to the hall, west, east, and south to the harbour.
    WALK([[1695, 931], [1695, 933]]);
    WALK([[1668, 941], [1685, 941]]);
    WALK([[1705, 941], [1724, 941]]);
    WALK([[1690, 949], [1690, 971]]);
    // The pier into the bay.
    F(1690, 972, 1, 19, '=');
    F(1689, 988, 3, 3, '=');

    // The Hall of the Brood.
    B(1688, 920, 15, 11, { wall: 'W', floor: 'P', doors: [['s', 7]] });
    NPC({ name: 'Chieftain Hesska', look: 'lizardfolk', desc: 'Chieftain Hesska, old and broad, her crest faded to the grey of river stone.', x: 1695, y: 924,
      dlg: say('Ssss. Welcome to Ssarakh, warm-blood or scale-kin. The mire keeps us, and we keep the mire. Mind the bog pools; they keep what they take. And if you go east to the sands, beware the Dry Ones. They were brood once.') });
    SIGN('Hall of the Brood', 'The Hall of the Brood. Chieftain Hesska hears all who come in peace.', 1697, 932);

    // The Shaman's hut: training.
    B(1708, 928, 9, 8, { wall: '#', floor: 'P', doors: [['s', 4]] });
    WALK([[1712, 936], [1712, 940]]);
    MER(1712, 931, WARES.train);
    NPC({ name: 'Shaman Ithrae', look: 'lizardfolk', desc: 'Shaman Ithrae, hung with bones and river shells, eyes like wet stones.', x: 1714, y: 930,
      dlg: teller('The mire teaches, if you sit still long enough. Stand at my mat and I will teach you faster, for a price in what you have learned. Or sit, and ask what the brood remembers.', ['brood', 'dryones', 'wyrms'], 'Patience, warm-blood.') });
    SIGN('Shaman', 'The Shaman\'s hut. Training, for those with the patience of reeds.', 1713, 937);

    // The Mire Bank.
    B(1674, 932, 9, 7, { wall: 'W', floor: 'P', doors: [['e', 3]] });
    WALK([[1683, 935], [1683, 940]]);
    NPC({ name: 'Mire Teller', x: 1677, y: 935 });
    SIGN('Mire Bank', 'The Mire Bank. Deposit boxes, kept dry.', 1684, 934);

    // The Basking Rock, a tavern.
    B(1672, 945, 11, 8, { wall: '#', floor: 'P', doors: [['e', 3]] });
    WALK([[1683, 942], [1683, 948]]);
    MER(1676, 948, WARES.food);
    NPC({ name: 'Innkeeper Gesh', look: 'lizardfolk', desc: 'Innkeeper Gesh, tail curled round a barrel, grinning with a great many teeth.', x: 1675, y: 950,
      dlg: say('Sit, sit. Warm stones by the fire, cold drink in the jar. The Basking Rock never closes; we sleep in shifts.') });
    SIGN('The Basking Rock', 'The Basking Rock. Food, drink and a warm stone.', 1684, 949);

    // The market, on the plaza.
    MER(1690, 938, WARES.food);
    MER(1690, 944, WARES.weapons);
    MER(1700, 938, WARES.armour);
    MER(1700, 944, WARES.potions);
    NPC({ name: 'Trader Kossk', look: 'lizardfolk', desc: 'Trader Kossk, quick-tongued, counting coins with a forked tongue\'s flick.', x: 1689, y: 941,
      dlg: say('Buy, buy! Blades from the mainland, leathers from the hunters, potions from the shaman\'s own pot. Stand at a stall to see.') });

    // The Brood Stone at the plaza's heart, and braziers for the night.
    SIGN('Brood Stone', 'The Brood Stone of Ssarakh. Here the brood returns: those who fall in the mire wake here.', HEART[0], HEART[1] - 2);
    for (const [x, y] of [[1688, 936], [1702, 936], [1688, 946], [1702, 946]]) PR('brazier', x, y);
    SIGN('Ssarakh', 'Ssarakh, the Mire City of the lizardfolk. All who come in peace are welcome.', 1691, 960);

    // A few stilt huts along the streets.
    for (const [x, y, side] of [[1668, 935, 's'], [1712, 944, 'n'], [1718, 944, 'n'], [1670, 954, 'n'], [1696, 952, 'w']]) {
      B(x, y, 5, 5, { wall: '#', floor: 'P', doors: [[side, 2]] });
    }
    WALK([[1670, 940], [1670, 940]]);
    WALK([[1714, 942], [1714, 943]]);
    WALK([[1720, 942], [1720, 943]]);
    WALK([[1672, 953], [1683, 953], [1683, 949]]);
    WALK([[1691, 954], [1695, 954]]);

    // The harbour: Captain Sskarr sells passage to Eastreach.
    NPC({ name: 'Captain Sskarr', look: 'lizardfolk', desc: 'Captain Sskarr, salt-crusted scales and a sailor\'s squint.', x: 1689, y: 989,
      dlg: captain('mire', 'The Marsh Wren sails for Eastreach! Passage at the pier!') });
    SIGN('Harbour', 'Ssarakh harbour. The Marsh Wren to Eastreach; tickets from Captain Sskarr.', 1691, 988);

    // (New lizardmen start in the Hatching Pools, hatchery.mjs, which bring them here.)
  },
};
