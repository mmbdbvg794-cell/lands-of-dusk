// Bounty boards: in eight towns, three posters (an easy, a middling and a
// hard job), each a repeatable kill quest for every race. A board gives
// each player one bounty a day: the posters share a wait (the quest's
// "again" flag, 20 hours, server/Quests.java flag timers), so a player
// picks which one. Built by tools/world/city.mjs; the quests are in the God
// tab's quest wizard's shape (js/quests.js), so they can be changed there.
//
// No squares change: the posters (props that look like the newsboard,
// painted as notice boards by tools/paintart) and a sign stand on open
// ground in each town, given in map coordinates (the plan's grid is a
// single square at 0,0; city.mjs places things off it as they are).

import { newQuest, newStep, mergeQuest } from '../../../js/quests.js';

const AGAIN_MINUTES = 20 * 60; // "once a day", whenever you play
const TIERS = [
  { gold: 40, exp: 60, label: 'A job for a new hunter.' },
  { gold: 90, exp: 160, label: 'For seasoned hunters: not for a beginner.' },
  { gold: 180, exp: 350, label: 'Only for the strongest.' },
];

// Each board: `at`, where the sign stands (just east of where the posters
// first stood, in a row: `at` is the first of them), `posts`, where the
// three posters stand now (spread out, so their names don't run into each
// other), and its jobs: [monster, how many, poster name,
// where they are (for the offer and Journal), a reward override].
const BOARDS = [
  { id: 'kh', town: 'Kingshaven', at: [1449, 352], posts: [[1443,  352],  [1446,  352],  [1449,  352]], jobs: [
    ['stray hound', 6, 'Stray Hound Bounty', 'in the meadow up the lane beside Farmer Hollin\'s, the last farm west of the north gate'],
    ['highway thief', 5, 'Highway Thief Bounty', 'on the wooded point south-east of the city'],
    ['barrow skeleton', 4, 'Barrow Skeleton Bounty', 'in the hidden valley in the hills north-east'],
  ] },
  { id: 'ae', town: 'Aelindor', at: [478, 1227], posts: [[472,  1227],  [475,  1227],  [478,  1227]], jobs: [
    ['lake slimer', 6, 'Lake Slimer Bounty', 'on the lake shore east of the city'],
    ['shrine gargoyle', 5, 'Shrine Gargoyle Bounty', 'at the shrines on the western mountains\' slopes'],
    ['blighted wolf', 4, 'Blighted Wolf Bounty', 'in the withered grove far to the east'],
  ] },
  { id: 'vk', town: 'Velkarath', at: [1344, 907], posts: [[1338,  907],  [1341,  907],  [1344,  907]], jobs: [
    ['cave slime', 6, 'Cave Slime Bounty', 'in the north-east cavern, up the temple\'s east side'],
    ['duergar soldier', 5, 'Duergar Bounty', 'at the mouth of the north-west cavern, round behind the Black Lantern'],
    ['magma slime', 4, 'Magma Slime Bounty', 'in the Ember Hollow, south down the Pit\'s east side'],
  ] },
  { id: 'er', town: 'Eastreach', at: [1675, 1305], posts: [[1669,  1305],  [1672,  1305],  [1675,  1305]], jobs: [
    ['Lizard', 8, 'Lizard Bounty', 'in the scrub round the town'],
    ['black dog', 8, 'Black Dog Bounty', 'on the plains round the town'],
    ['Lizard Axeman', 2, 'Lizard Axeman Bounty', 'in the Sand Kings\' country', { gold: 220, exp: 450 }],
  ] },
  { id: 'cl', town: 'the City of Light', at: [104, 153], posts: [[101,  153],  [104,  153],  [110,  153]], jobs: [
    ['grave thief', 6, 'Grave Thief Bounty', 'in the glade west of the south road'],
    ['robber guard', 5, 'Robber Guard Bounty', 'round the ruined tower east of the south road'],
    ['crypt skeleton', 4, 'Crypt Skeleton Bounty', 'in the crypt under the robbers\' glade'],
  ] },
  { id: 'mn', town: 'Midnight', at: [444, 83], posts: [[438,  83],  [441,  83],  [444,  83]], jobs: [
    ['rock slime', 6, 'Rock Slime Bounty', 'in the upper workings of the Izaru mine'],
    ['mine stalker', 5, 'Mine Stalker Bounty', 'round the old miners\' camp in the Izaru mine'],
    ['cinder slime', 4, 'Cinder Slime Bounty', 'in the deep chamber of the Izaru mine'],
  ] },
  { id: 'sf', town: 'Southfield', at: [535, 16], posts: [[529,  16],  [532,  16],  [535,  16]], jobs: [
    ['frost wolf', 6, 'Frost Wolf Bounty', 'at the south end of the field'],
    ['frost bear', 5, 'Frost Bear Bounty', 'in the frozen land beyond the trees'],
    ['ice skeleton', 4, 'Ice Skeleton Bounty', 'round the dragon\'s lair in the frozen land'],
  ] },
  { id: 'ss', town: 'Ssarakh', at: [1692, 946], posts: [[1692,  946],  [1698,  946],  [1701,  946]], jobs: [
    ['bog slime', 6, 'Bog Slime Bounty', "in the marsh east and north-east of the city, past the Shaman's hut"],
    ['swamp serpent', 5, 'Swamp Serpent Bounty', 'out in the mire beyond the city'],
    ['dry one raider', 4, 'Dry One Raider Bounty', 'deep in the isles, where the Dry Ones raid', { gold: 240, exp: 500 }],
  ] },
];

const plural = (mob, n) => {
  if (n === 1 || /s$/.test(mob)) return mob;
  if (/(thief|wolf|elf)$/i.test(mob)) return mob.replace(/f$/i, 'ves');
  if (/(sh|ch|x)$/.test(mob)) return `${mob}es`;
  if (/man$/i.test(mob)) return mob.replace(/man$/i, (m) => (m[0] === 'M' ? 'Men' : 'men'));
  return `${mob}s`;
};
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function bountyQuest(board, [mob, count, poster, where, pay], tier) {
  const reward = { ...TIERS[tier], ...(pay ?? {}) };
  const q = newQuest(`bt_${board.id}_${tier + 1}`);
  const many = plural(mob, count);
  Object.assign(q, {
    title: `Bounty: ${title(many)}`,
    giver: poster,
    repeatable: true,
    again: { minutes: AGAIN_MINUTES, flag: `bounty_${board.id}`, says: `You've already taken today's bounty from ${board.town}'s board (one a day, whichever notice). New notices go up tomorrow.` },
    offer: {
      ...q.offer,
      says: `WANTED: ${count} ${many}, ${where}. Reward: ${reward.gold} gold, ${reward.exp} exp. ${TIERS[tier].label}`,
      accept: 'I will take it',
      acceptReply: `Your name is on the notice. Kill ${count} ${many} and come back to claim it.`,
      decline: 'Not today',
      declineReply: 'The notice stays up.',
    },
    reminder: `Kill ${count} ${many} ${where}, then come back to claim the bounty.`,
    reward: { ...q.reward, gold: reward.gold, exp: reward.exp, says: 'The bounty is paid.' },
  });
  q.steps = [
    { ...newStep('kill'), mob, count, what: `${many} for the bounty`, journal: `Bounty: kill ${count} ${many} ${where}, for ${board.town}'s bounty board.` },
    { ...newStep('talk', poster), says: `Back to claim the bounty on the ${many}?`, answer: 'Claim the bounty', reply: 'The clerk crosses your name off the notice and counts out your reward.', journal: `Claim the bounty at ${board.town}'s bounty board.` },
  ];
  return q;
}

export const QUESTS = BOARDS.flatMap((b) => b.jobs.map((job, i) => ({ board: b, job, quest: bountyQuest(b, job, i) })));

const LOOK = 'newsboard';

export default {
  name: 'Bounty Boards',
  origin: [0, 0],
  size: [1, 1],
  seed: 79,
  oldWorld: true,
  mayBuild: () => false, // no squares change
  build(p) {
    for (const b of BOARDS) {
      const [x, y] = b.at;
      b.jobs.forEach((job, i) => {
        const { quest } = QUESTS.find((e) => e.board === b && e.job === job);
        const poster = job[2];
        const dlg = mergeQuest({ stages: [{ when: { kind: 'always', value: '' }, says: 'An old notice, its job already done.', answers: [] }] }, quest, poster);
        const [px, py] = b.posts?.[i] ?? [x + i, y];
        // Where it first stood (side by side), if it has moved.
        if (px !== x + i || py !== y) p.dropProp(poster, x + i, y);
        p.npc({ name: poster, look: LOOK, desc: `A bounty notice on ${b.town}'s bounty board: ${job[1]} ${plural(job[0], job[1])} wanted.`, x: px, y: py, dlg });
        p.quest(quest);
      });
      p.sign('Bounty Board', `${b.town}'s bounty board. Three jobs, one a day per hunter, the easiest on the left: read a notice to take it, and come back to it to be paid.`, x + 3, y);
    }
  },
};
