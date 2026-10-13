// The Grove of Waking, the elves' tutorial: "From Seedling to Sentinel...".
// Built into the map by tools/world/city.mjs.
//
// A sealed grove in the forest south-west of Aelindor (408-473, 1290-1325):
// clearings cut out of solid old wood, with no way in or out on foot. New
// elves (defRaces/elf starts them here) wake in the roots of the Mother
// Tree and are trained step by step like the humans and dark elves, each
// gap in the trees opening on the step's flag; or they skip it. Either way
// a Moonstone takes them to the Moonwell in Aelindor, which becomes where
// they come back to. Existing elves aren't affected.

import { BASE_PROPS } from './aelindor.mjs';

const ORIGIN = [408, 1290];
const TUT = 'From Seedling to Sentinel...';
const MOONWELL = [473, 1241]; // the Moonwell plaza in Aelindor
const START = [7, 17]; // the Mother Tree's hollow (plan coordinates)

// The first thing a new player hears ends with how to chat.
const CHAT_TIP = " (To talk with other players, press Enter or tap the box at the bottom, then start with ' to speak to those nearby, or ; to be heard across the land.)";
const says = (text, answers = []) => ({ says: text, answers });
const always = (text, answers = []) => ({ when: { kind: 'always', value: '' }, ...says(text, answers) });
const ifFlag = (flag, text, answers = []) => ({ when: { kind: 'flag', value: flag }, ...says(text, answers) });
const jflag = (flag, text, done = false) => ({ kind: 'flag', flag, journal: { title: TUT, text, done } });
const unflag = (flag) => ({ kind: 'unflag', flag });
const TUT_FLAGS = ['elfTut1', 'elfTut2', 'elfTut3', 'elfTut4', 'elfTut5', 'elfTut6', 'elfSkip'];

const WARDEN = {
  shouts: ['Over here, little one. Come into the light.'],
  stages: [
    ifFlag('elfSkip', 'The path to the south. The Moonstone will carry you to Aelindor.'),
    ifFlag('elfTut2', 'Weaver Ysolde waits in the bower, through the trees to the east.'),
    ifFlag('elfTut1', 'Welcome, child of the Mother Tree. Aelindor will need you one day. Will you learn the ways of the wood first, or do you feel ready already?' + CHAT_TIP, [
      { label: 'Teach me', reply: 'Good. Through the trees to the east: Weaver Ysolde will clothe and arm you.', effects: [unflag('elfTut1'), jflag('elfTut2', 'Warden Elarion sent me east, to Weaver Ysolde in the bower.')] },
      { label: 'I am ready', reply: 'Young, and sure of yourself. So were we all. Take the path to the south; the Moonstone will carry you to Aelindor.', effects: [unflag('elfTut1'), jflag('elfSkip', 'I told Warden Elarion I was ready. The Moonstone down the south path leads to Aelindor.')] },
    ]),
    always('The Mother Tree watches over all who wake here.'),
  ],
};
const WEAVER = {
  shouts: [],
  stages: [
    ifFlag('elfTut3', 'One set each, little one. Ranger Thandril waits in the practice glade, to the east.'),
    ifFlag('elfTut2', 'Fresh from the roots, and nothing to wear. Here: a shirt I wove myself, and a blade to start with.', [
      { label: 'Thank you', reply: 'Wear them well. Ranger Thandril waits in the practice glade, through the trees to the east.', effects: [{ kind: 'give', item: 'cloth shirt' }, { kind: 'give', item: 'wooden dagger' }, unflag('elfTut2'), jflag('elfTut3', 'Clothed and armed. Ranger Thandril waits in the practice glade, to the east.')] },
    ]),
    always('The bower is for those newly woken.'),
  ],
};
const RANGER = {
  shouts: [],
  stages: [
    ifFlag('elfTut5', 'Off you go. Provisioner Merrin is through the trees to the south.'),
    ifFlag('elfTut4', 'Well? Take the stuffing from a training dummy and bring it to me. (Stand right beside one, not diagonally, then click it and choose Attack.)', [
      { label: 'Here it is', reply: 'Neatly done. Provisioner Merrin is through the trees to the south: no one should walk the wood hungry.', needs: { kind: 'item', value: 'straw stuffing' }, effects: [{ kind: 'take', item: 'straw stuffing' }, unflag('elfTut4'), jflag('elfTut5', 'Ranger Thandril sent me south to Provisioner Merrin, for water and an apple.')] },
    ]),
    ifFlag('elfTut3', 'First, put on what Ysolde gave you (in your Backpack, press Wear beside each). Then we practise.', [
      { label: 'I am ready', reply: 'Then strike a training dummy, and bring me its stuffing. (Stand beside one, click it and choose Attack.)', effects: [unflag('elfTut3'), jflag('elfTut4', 'Ranger Thandril wants the stuffing of a training dummy. Time to practise.')] },
    ]),
    always('The practice glade is for those in training.'),
  ],
};
const PROVISIONER = {
  shouts: ['Water and apples!'],
  stages: [
    ifFlag('elfTut6', 'You have what you need. The Moonstone is through the trees to the east.'),
    // Both the water and the apple checked in one answer (a follow-up
    // question lost anyone who typed something else).
    { ...ifFlag('elfTut5', 'Nobody leaves the grove hungry. Buy a water and an apple from me: stand in front of my counter, open the Shop tab and press Buy. Then talk to me again.', [
      { label: 'I have them', reply: 'Good. Eat and drink from your Backpack when you need to. Now through the trees to the east, and step on the Moonstone.', needs: { kind: 'item', value: 'water' }, effects: [unflag('elfTut5'), jflag('elfTut6', 'Supplies in hand. The Moonstone, through the trees to the east, leads to Aelindor.')] },
    ]), also: { kind: 'item', value: 'apple' } },
    ifFlag('elfTut5', 'Nobody leaves the grove hungry. Buy a water and an apple from me: stand in front of my counter, open the Shop tab and press Buy. Then talk to me again.', [
      { label: 'I have them', reply: '', needs: { kind: 'item', value: 'apple' }, effects: [] },
    ]),
    always('Water and apples, for the road.'),
  ],
};
// The Moonstone: training done (or skipped), to Aelindor, bound there.
const moonstone = (flag) => [{
  when: { kind: 'flag', value: flag },
  speaker: '',
  says: '** You step onto the Moonstone. Silver light rises around you... and you stand beside the Moonwell of Aelindor. **',
  effects: [...TUT_FLAGS.map(unflag), jflag('elfTutDone', 'Training done (or skipped). Welcome to Aelindor.', true), { kind: 'bind', x: MOONWELL[0], y: MOONWELL[1] }, { kind: 'teleport', x: MOONWELL[0], y: MOONWELL[1] }],
}];
// A gap in the trees that opens on a flag.
const gap = (flag, speaker, words) => ({ kind: 'flag', flag, speaker, verb: 'says', says: words });

export default {
  name: 'Grove of Waking',
  origin: ORIGIN,
  size: [66, 36],
  seed: 31,
  // Only over the forest: ground and trees.
  mayBuild: (t) => [1, 36, 38, 27, 64, 103, 25, 26, 102, 124].includes(t),
  build(p) {
    // The elves' looks, as Aelindor has them (the same files).
    for (const [name, text] of Object.entries(BASE_PROPS)) p.file(`defProps/${name}`, text);
    // Solid old wood everywhere, then the clearings cut out of it.
    p.fill(0, 0, 66, 36, 'T');

    // The Mother Tree's hollow, ringed with golden trees, where elves wake.
    p.oval(2, 12, 11, 11, 'Y');
    p.oval(3, 13, 9, 9, ';');
    p.path([[12, 17], [16, 17]]);
    p.action(13, 17, [{ when: { kind: 'noflag', value: 'elfWoke' }, speaker: '', says: '** You wake among the roots of the Mother Tree, warm and green-lit. Somewhere ahead, a voice calls softly. **', effects: [{ kind: 'flag', flag: 'elfWoke' }, jflag('elfTut1', 'I woke in the roots of the Mother Tree. Someone ahead is calling: find them.')] }]);

    // The Glade of Choosing.
    p.oval(17, 10, 13, 15, ';');
    for (const [x, y] of [[20, 13], [26, 13], [20, 21], [26, 21]]) p.set(x, y, 'c');
    p.npc({ name: 'Warden Elarion', look: 'Elf Elder', desc: 'Warden Elarion, who has met every elf that ever woke in this grove.', x: 23, y: 12, dlg: WARDEN });
    // Skipping: the south path to a Moonstone.
    p.path([[23, 24], [23, 29]]);
    p.walk(23, 24, gap('elfSkip', 'Warden Elarion', 'Not that way yet, little one. Come and speak with me first.'));
    p.oval(21, 29, 5, 5, ';');
    p.set(23, 31, 'c');
    p.action(23, 31, moonstone('elfSkip'));

    // The bower, where the Weaver clothes and arms them.
    p.path([[30, 17], [32, 17]]);
    p.walk(30, 17, gap('elfTut2', 'Warden Elarion', 'Not that way yet, little one. Come and speak with me first.'));
    p.oval(32, 12, 9, 11, ',');
    p.fill(34, 14, 5, 7, '=');
    p.npc({ name: 'Weaver Ysolde', look: 'Elf Woman', desc: 'Weaver Ysolde, a half-finished cloak across her knees.', x: 36, y: 15, dlg: WEAVER });

    // The practice glade, with its dummies.
    p.path([[40, 17], [42, 17]]);
    p.oval(42, 9, 14, 15, 'e');
    p.npc({ name: 'Ranger Thandril', look: 'Elf Guard', desc: 'Ranger Thandril, leaning on a longbow and watching your footwork.', x: 49, y: 11, dlg: RANGER });
    p.mob('training_dummy', 1, 45, 19); p.mob('training_dummy', 1, 52, 19);

    // The provisioner, behind a counter.
    p.path([[49, 23], [49, 25]]);
    p.walk(49, 24, gap('elfTut5', 'Ranger Thandril', 'Not yet! Bring me the stuffing of a training dummy first.'));
    p.oval(43, 25, 13, 9, ',');
    p.fill(48, 27, 3, 1, '#');
    p.npc({ name: 'Provisioner Merrin', look: 'Elf', desc: 'Provisioner Merrin, polishing an apple on his sleeve.', x: 49, y: 26, dlg: PROVISIONER });
    p.merchant(49, 28, ['water', 'apple']);

    // The way out: the Moonstone.
    p.path([[56, 29], [59, 29]]);
    p.walk(56, 29, gap('elfTut6', 'Provisioner Merrin', 'Supplies first! A water and an apple.'));
    p.oval(58, 27, 5, 5, ';');
    p.set(60, 29, 'c');
    p.action(60, 29, moonstone('elfTut6'));

    // New elves start in the hollow.
    p.setValue('defRaces/elf', 'x', ORIGIN[0] + START[0]);
    p.setValue('defRaces/elf', 'y', ORIGIN[1] + START[1]);
  },
};
