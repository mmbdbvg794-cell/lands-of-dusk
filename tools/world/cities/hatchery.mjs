// The Hatching Pools, the lizardmen's tutorial: "From Hatchling to
// Brood-Guard...". Built into the map by tools/world/city.mjs, on the same
// lines as the elves' Grove of Waking (grove.mjs).
//
// A sealed hollow in the willow-choked heart of the big east isle
// (1846-1911, 990-1025): clearings cut out of solid swamp willow, with no
// way in or out on foot. New lizardmen (defRaces/lizardman starts them
// here) hatch in the pools and are trained step by step, each gap in the
// willows opening on the step's flag; or they skip it. Either way the Warm
// Stone, a chip of the Brood Stone, takes them to the Brood Stone in
// Ssarakh, which becomes where they come back to. Existing lizardmen
// aren't affected.

import { HEART } from './ssarakh.mjs';
import { classGate, trialYard } from './classtrials.mjs';

const ORIGIN = [1846, 990];
const TUT = 'From Hatchling to Brood-Guard...';
const START = [7, 17]; // the hatching pools (plan coordinates)

const CHAT_TIP = " (To chat: press Enter, then start with ' for those nearby or ; for everyone.)";
const says = (text, answers = []) => ({ says: text, answers });
const always = (text, answers = []) => ({ when: { kind: 'always', value: '' }, ...says(text, answers) });
const ifFlag = (flag, text, answers = []) => ({ when: { kind: 'flag', value: flag }, ...says(text, answers) });
const jflag = (flag, text, done = false) => ({ kind: 'flag', flag, journal: { title: TUT, text, done } });
const unflag = (flag) => ({ kind: 'unflag', flag });
const TUT_FLAGS = ['lizTut1', 'lizTut2', 'lizTut3', 'lizTut4', 'lizTut5', 'lizTut6', 'lizSkip'];

const MOTHER = {
  shouts: ['Hsss. Here, hatchling. Come to the warm.'],
  stages: [
    ifFlag('lizSkip', 'The way to the south. The Warm Stone will carry you to Ssarakh.'),
    ifFlag('lizTut2', 'Scale-Tender Ossik waits in the hut, through the willows to the east.'),
    ifFlag('lizTut1', 'Out of the shell at last. Will you learn the ways of the mire first, or are you grown already?' + CHAT_TIP, [
      { label: 'Teach me', reply: 'Wise, for one so small. Through the willows to the east: Scale-Tender Ossik will clothe and arm you.', effects: [unflag('lizTut1'), jflag('lizTut2', 'Brood-Mother Ssethra sent me east, to Scale-Tender Ossik in the hut.')] },
      { label: 'I am ready', reply: 'Every hatchling says so. Go, then: the path to the south, and the Warm Stone will carry you to Ssarakh.', effects: [unflag('lizTut1'), jflag('lizSkip', 'I told Brood-Mother Ssethra I was ready. The Warm Stone down the south path leads to Ssarakh.')] },
    ]),
    always('The pools keep the eggs warm, and the brood keeps the pools.'),
  ],
};
const TENDER = {
  shouts: [],
  stages: [
    ifFlag('lizTut3', 'One each, hatchling. Hunt-Master Kreeth waits on the hunting ground, to the east.'),
    ifFlag('lizTut2', 'Soft scales still, and nothing over them. Here: a shirt of woven reed, and a knife to bite with until your own teeth are worth something.', [
      { label: 'Thank you', reply: 'Wear them well. Hunt-Master Kreeth waits on the hunting ground, through the willows to the east.', effects: [{ kind: 'give', item: 'cloth shirt' }, { kind: 'give', item: 'wooden dagger' }, unflag('lizTut2'), jflag('lizTut3', 'Clothed and armed. Hunt-Master Kreeth waits on the hunting ground, to the east.')] },
    ]),
    always('The hut is for the newly hatched.'),
  ],
};
const HUNTER = {
  shouts: [],
  stages: [
    ifFlag('lizTut5', 'Go on. Mossa keeps the larder, through the willows to the south.'),
    ifFlag('lizTut4', 'Well? Tear the stuffing out of a training dummy and bring it to me. (Stand right beside one, not diagonally, then click it and choose Attack.)', [
      { label: 'Here it is', reply: 'Hsss, not bad. Every hunt earns you experience: trainers turn it into strength and skill. Mossa keeps the larder, through the willows to the south. Nobody hunts hungry.', needs: { kind: 'item', value: 'straw stuffing' }, effects: [{ kind: 'take', item: 'straw stuffing' }, unflag('lizTut4'), jflag('lizTut5', 'Hunt-Master Kreeth sent me south to Mossa, for water and a mushroom.')] },
    ]),
    // Dressed and a dummy beaten before speaking to him: straight to the hand-in.
    { ...ifFlag('lizTut3', 'Hsss, you did not wait for me: dressed, and a dummy already torn open. Show me the stuffing.', [
      { label: 'Here it is', reply: 'Hsss, not bad. Every hunt earns you experience: trainers turn it into strength and skill. Mossa keeps the larder, through the willows to the south. Nobody hunts hungry.', needs: { kind: 'item', value: 'straw stuffing' }, effects: [{ kind: 'take', item: 'straw stuffing' }, unflag('lizTut3'), jflag('lizTut5', 'Hunt-Master Kreeth sent me south to Mossa, for water and a mushroom.')] },
    ]), also: { kind: 'item', value: 'straw stuffing' } },
    ifFlag('lizTut3', 'First, put on what Ossik gave you (in your Backpack, press Wear beside each). Then we hunt.', [
      { label: 'I am ready', reply: 'Then go at a training dummy, and bring me its stuffing. (Stand beside one, click it and choose Attack.)', effects: [unflag('lizTut3'), jflag('lizTut4', 'Hunt-Master Kreeth wants the stuffing of a training dummy. Time to practise.')] },
    ]),
    always('The hunting ground is for those in training.'),
  ],
};
const LARDER = {
  shouts: ['Water and mushrooms!'],
  stages: [
    ifFlag('lizTut6', 'You have what you need. The Warm Stone is through the willows to the east.'),
    // Both the water and the mushroom checked in one answer (a follow-up
    // question lost anyone who typed something else).
    { ...ifFlag('lizTut5', 'Nobody leaves the pools hungry. Buy a water and a mushroom from me: stand in front of my counter, open the Shop tab and press Buy. Then talk to me again.', [
      { label: 'I have them', reply: 'Good. Eat and drink from your Backpack when you need to. Now through the willows to the east, and step on the Warm Stone.', needs: { kind: 'item', value: 'water' }, effects: [unflag('lizTut5'), jflag('lizTut6', 'Supplies in hand. The Warm Stone, through the willows to the east, leads to Ssarakh.')] },
    ]), also: { kind: 'item', value: 'mushroom' } },
    ifFlag('lizTut5', 'Nobody leaves the pools hungry. Buy a water and a mushroom from me: stand in front of my counter, open the Shop tab and press Buy. Then talk to me again.', [
      { label: 'I have them', reply: '', needs: { kind: 'item', value: 'mushroom' }, effects: [] },
    ]),
    always('Water and mushrooms, for the road.'),
  ],
};
// The Warm Stone: training done (or skipped), to the Brood Stone, bound there.
export const warmStone = (flag) => [classGate(flag, '** The Warm Stone stays cold under your feet: first, choose your calling. **'), {
  when: { kind: 'flag', value: flag },
  speaker: '',
  says: '** You step onto the Warm Stone. It hums under your feet like something alive... and you stand before the Brood Stone of Ssarakh. ** A brood-guard flicks her tongue at you: \'New hatchling? Chieftain Hesska sees every one. The Hall of the Brood is just north of the Brood Stone.\'',
  effects: [...TUT_FLAGS.map(unflag), jflag('lizTutDone', 'Training done. Chieftain Hesska sees every new hatchling, in the Hall of the Brood north of the Brood Stone.', true), { kind: 'bind', x: HEART[0], y: HEART[1] }, { kind: 'teleport', x: HEART[0], y: HEART[1] }],
}];
// A gap in the willows that opens on a flag.
const gap = (flag, speaker, words) => ({ kind: 'flag', flag, speaker, verb: 'says', says: words });
const lizard = (name, desc, x, y, dlg) => ({ name, look: 'lizardfolk', desc, x, y, dlg });

export default {
  name: 'Hatching Pools',
  origin: ORIGIN,
  size: [66, 36],
  seed: 37,
  // Only over the swamp (and any tree the willows didn't take).
  mayBuild: (t) => [168, 169, 170, 171, 172, 173, 1, 36, 38, 27, 64, 103, 25, 26, 102].includes(t),
  build(p) {
    // Solid swamp willow everywhere, then the clearings cut out of it.
    p.fill(0, 0, 66, 36, 'v');

    // The hatching pools: warm mud ringed with bog, a few pools still
    // holding eggs.
    p.oval(2, 12, 11, 11, 'b');
    p.oval(3, 13, 9, 9, 'q');
    for (const [x, y] of [[5, 15], [9, 15], [5, 19], [9, 20]]) p.set(x, y, 'b');
    p.path([[12, 17], [16, 17]], 'h');
    p.action(13, 17, [{ when: { kind: 'noflag', value: 'lizWoke' }, speaker: '', says: '** The shell gives way. You push free into the warm mud of the hatching pools, blinking. Somewhere ahead, someone hisses a welcome. **', effects: [{ kind: 'flag', flag: 'lizWoke' }, jflag('lizTut1', 'I hatched in the pools of the brood. Someone ahead is calling: find them.')] }]);

    // The Brood-Mother's clearing.
    p.oval(17, 10, 13, 15, 'Q');
    for (const [x, y] of [[20, 13], [26, 13], [20, 21], [26, 21]]) p.set(x, y, 'r');
    p.npc(lizard('Brood-Mother Ssethra', 'Brood-Mother Ssethra, vast and slow, who has watched every egg in these pools hatch.', 23, 12, MOTHER));
    // Skipping: the south path to the Warm Stone.
    p.path([[23, 24], [23, 29]], 'h');
    p.walk(23, 24, gap('lizSkip', 'Brood-Mother Ssethra', 'Not that way yet, hatchling. Come and speak with me first: I am by the pools, to the north.'));
    p.oval(21, 29, 5, 5, 'Q');
    p.set(23, 31, 'c');
    p.action(23, 31, warmStone('lizSkip'));

    // The Scale-Tender's hut.
    p.path([[30, 17], [32, 17]], 'h');
    p.walk(30, 17, gap('lizTut2', 'Brood-Mother Ssethra', 'Not that way yet, hatchling. Come and speak with me first: I am by the pools, to the north-west.'));
    p.oval(32, 12, 9, 11, 'Q');
    p.fill(34, 14, 5, 7, 'h');
    p.npc(lizard('Scale-Tender Ossik', 'Scale-Tender Ossik, weaving reed with quick clawed fingers.', 36, 15, TENDER));

    // The hunting ground, with its dummies.
    p.path([[40, 17], [42, 17]], 'h');
    p.oval(42, 9, 14, 15, 'q');
    p.npc(lizard('Hunt-Master Kreeth', 'Hunt-Master Kreeth, scarred across the snout, watching how you move.', 49, 11, HUNTER));
    p.mob('training dummy', 1, 45, 19); p.mob('training dummy', 1, 52, 19);
    trialYard(p, 'lizardman');

    // The larder, behind a counter: its near side (the way in) is where
    // buyers stand.
    p.path([[49, 23], [49, 25]], 'h');
    p.walk(49, 24, gap('lizTut5', 'Hunt-Master Kreeth', 'Not yet! Come and see me first, at the north end of the hunting ground.'));
    p.oval(43, 25, 13, 9, 'Q');
    p.fill(48, 27, 3, 1, '#');
    p.npc(lizard('Mossa', 'Mossa, keeper of the larder, sorting mushrooms by smell.', 49, 28, LARDER));
    p.merchant(49, 26, ['water', 'mushroom']);

    // The way out: the Warm Stone.
    p.path([[56, 29], [59, 29]], 'h');
    p.walk(56, 29, gap('lizTut6', 'Mossa', 'Supplies first! A water and a mushroom.'));
    p.oval(58, 27, 5, 5, 'Q');
    p.set(60, 29, 'c');
    p.action(60, 29, warmStone('lizTut6'));

    // New lizardmen hatch in the pools.
    p.setValue('defRaces/lizardman', 'x', ORIGIN[0] + START[0]);
    p.setValue('defRaces/lizardman', 'y', ORIGIN[1] + START[1]);
  },
};
