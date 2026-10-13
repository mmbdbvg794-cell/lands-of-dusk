// Achievements (server/Achievements.java): the "achievements" file. Built
// by tools/world/city.mjs like a town, though nothing on the map changes.
// Each line: id|title|what to do|kind|what|how many (see the server class).

const CHAINS = [
  ['watch', 'Friend of the Watch', 'Finish The King\'s Watch, round Kingshaven', 'kw_barrow_done'],
  ['warden', 'Green Warden', 'Finish The Green Wardens, round Aelindor', 'gw_grove_done'],
  ['patrol', 'Deep Patrol', 'Finish The Deep Patrol, round Velkarath', 'dp_ember_done'],
  ['frontier', 'Frontier Hand', 'Finish The Eastreach Frontier', 'er_sandkings_done'],
  ['zilen', 'Keeper of the Crypt', 'Finish The Zilen Legacy, round the City of Light', 'zl_crypt_done'],
  ['izaru', 'Friend of Izaru', 'Finish The Izaru Deeps, below Midnight', 'iz_deep_done'],
  ['frozen', 'Hero of Southfield', 'Finish The Frozen Reach', 'fr_dragon_done'],
];
import { LORE_FLAGS } from './lore.mjs';

const BOSSES = ['Ursok the Dread Bear', 'Fenris the Great Wolf', 'Kraghul the Warlord', 'Morvane the Skeleton King'];

export const ACHIEVEMENTS = [
  ['first_blood', 'First Blood', 'Win your first fight', 'kills', '', 1],
  ['hunter', 'Hunter', 'Defeat 100 creatures', 'kills', '', 100],
  ['slayer', 'Slayer', 'Defeat 1,000 creatures', 'kills', '', 1000],
  ['dragonslayer', 'Dragonslayer', 'Slay the ember dragon, the stone dragon and the frost dragon', 'killset', 'ember dragon,stone dragon,frost dragon', 3],
  ['bossbreaker', 'Bossbreaker', 'Help bring down a world boss', 'boss', '', 1],
  ['legend', 'Legend of the Realm', 'Help bring down every world boss', 'bossset', BOSSES.join(','), BOSSES.length],
  ['bounty_hunter', 'Bounty Hunter', 'Finish 10 bounty jobs', 'bounty', '', 10],
  ['bounty_master', 'Bounty Master', 'Finish 50 bounty jobs', 'bounty', '', 50],
  ...CHAINS.map(([id, title, what, flag]) => [id, title, what, 'flags', flag, 1]),
  ['questmaster', 'Questmaster', 'Finish all seven quest chains', 'flags', CHAINS.map((c) => c[3]).join(','), CHAINS.length],
  ['dawnward', 'The Dawnward', 'Learn what became of Princess Elowen', 'flags', 'dw_road_done', 1],
  ['riftsealed', 'The Rift Sealed', 'Close the rift under Firetown and bring word home', 'flags', 'ft_word_done', 1],
  ['champion', 'Champion', 'Win the Champion\'s Blade in the Champions\' Gauntlet', 'flags', 'Champion', 1],
  ['loremaster', 'Keeper of Tales', 'Learn every tale of Dusk, from the chroniclers and the old stones', 'flags', LORE_FLAGS.join(','), LORE_FLAGS.length],
  ['duellist', 'Duellist', 'Win a duel in the Duelling Ring', 'duelwins', '', 1],
  ['ringchampion', 'Champion of the Ring', 'Win 25 duels in the Duelling Ring', 'duelwins', '', 25],
  ['seasoned', 'Seasoned', 'Earn 10,000 experience', 'exp', '', 10000],
  ['veteran', 'Veteran', 'Earn 100,000 experience', 'exp', '', 100000],
];

export const achievementsFile = () => [
  '# Achievements (server/Achievements.java; made by tools/world/cities/achievements.mjs).',
  '# id|title|what to do|kind|what|how many. "achievements reload" in the game reads it again.',
  ...ACHIEVEMENTS.map((a) => a.join('|')),
  '',
].join('\n');

export default {
  name: 'Achievements',
  origin: [0, 0],
  size: [1, 1],
  seed: 89,
  oldWorld: true,
  mayBuild: () => false, // nothing on the map changes
  build(p) {
    p.file('achievements', achievementsFile());
  },
};
