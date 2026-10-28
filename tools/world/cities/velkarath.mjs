// Velkarath, the dark elf outpost in the Underdark. Built into the map by
// tools/world/city.mjs.
//
// Underground places are a block of the map nobody can walk to, far out
// in the open sea (1260-1429, 850-989): solid rock with caverns in it,
// reached only by the stairs in three cave mouths on surface mountains.
// The client knows the block is underground (js/atmosphere.js
// UNDERGROUND): no weather, always dim. Only dark elves may take the
// stairs down (gods walk anywhere).

import { classGate, keeperPrompt, trialYard } from './classtrials.mjs';

const RACE_ONLY = { kind: 'race', flag: 'darkelf', speaker: 'A voice in the dark', verb: 'whispers', says: 'Only the Drow walk the Underdark. Turn back, surface-dweller.' };

// The way down from each mouth (map coordinates: the mouth in the rock,
// the square in front of it) and where it comes out below (plan
// coordinates: the stair up, the square you arrive on).
const STAIRS = [
  { name: 'west', mouth: [391, 1236], front: [392, 1236], stair: [9, 60], arrive: [10, 60],
    up: ' A path runs north from the stair to Aelindor Landing and its ships.' },
  { name: 'south', mouth: [686, 1484], front: [686, 1485], stair: [80, 130], arrive: [80, 129],
    up: '' },
  { name: 'east', mouth: [1489, 1407], front: [1488, 1407], stair: [162, 72], arrive: [161, 72],
    up: ' Eastreach lies a long walk east.' },
];
const ORIGIN = [1260, 850];

// ---- shapes ----

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296);
}
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Smooth noise, 0..1, varying over about `scale` squares.
function noise(x, y, scale) {
  const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy);
  const sx = fx - x0, sy = fy - y0, u = sx * sx * (3 - 2 * sx), v = sy * sy * (3 - 2 * sy);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// A cave: an oval with ragged walls.
function cave(p, cx, cy, rx, ry, rough = 0.35, ch = 'k') {
  for (let y = Math.floor(cy - ry * 1.5); y <= cy + ry * 1.5; y++) for (let x = Math.floor(cx - rx * 1.5); x <= cx + rx * 1.5; x++) {
    const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
    if (d + (noise(x, y, 5) - 0.5) * rough * 2 < 1) p.set(x, y, ch);
  }
}
// A winding tunnel through the points, `width` squares wide.
function tunnel(p, points, width = 3, ch = 'k') {
  const r = width / 2;
  for (let k = 1; k < points.length; k++) {
    const [ax, ay] = points[k - 1], [bx, by] = points[k];
    const len = Math.hypot(bx - ax, by - ay), steps = Math.ceil(len * 2);
    const nx = -(by - ay) / len, ny = (bx - ax) / len; // across the tunnel
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wobble = Math.sin(t * Math.PI) * (noise(ax + t * 40, ay + k * 17, 9) - 0.5) * 8;
      const x = ax + (bx - ax) * t + nx * wobble, y = ay + (by - ay) * t + ny * wobble;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if (Math.hypot(dx, dy) <= r) p.set(Math.round(x + dx), Math.round(y + dy), ch);
      }
    }
  }
}

// ---- who lives here ----

// The first thing a new player hears ends with how to chat.
const CHAT_TIP = " (To chat: press Enter, then start with ' for those nearby or ; for everyone.)";
const says = (text, answers = []) => ({ says: text, answers });
const always = (text, answers = []) => ({ when: { kind: 'always', value: '' }, ...says(text, answers) });
const ifFlag = (flag, text, answers = []) => ({ when: { kind: 'flag', value: flag }, ...says(text, answers) });
const QUEST = 'Blood of the Deep';

const MATRON = {
  shouts: ['Kneel before House Xalyth.'],
  stages: [
    ifFlag('velkarath_done', 'Serve well. Train with Weaponmaster Dral in the Pit, hunt for the bounty board, or climb the east stair and learn what the surface folk are building at Eastreach.'),
    ifFlag('velkarath_marked', 'The Spider\'s mark is on your hand. Good.', [
      {
        label: 'It is done',
        reply: 'Then you are a hatchling no longer, but Drow of House Xalyth. Take these, and do not shame us.',
        effects: [
          { kind: 'unflag', flag: 'velkarath_marked' },
          { kind: 'flag', flag: 'velkarath_done', journal: { title: QUEST, text: 'Matron Xalyth named me Drow of House Xalyth.', done: true } },
          { kind: 'give', item: 'shadowsilk gloves' },
          { kind: 'exp', amount: 300 },
          { kind: 'gold', amount: 150 },
        ],
        next: { verb: 'acts', says: 'Matron Xalyth tosses you a pair of Shadowsilk Gloves, black as the deep. You gain 300 experience and 150 gold.', answers: [] },
      },
    ]),
    ifFlag('velkarath_task', 'Why are you still here? Go to the temple, east of my palace. Priestess Ilvra is waiting.'),
    always('A hatchling from the cells below. Until the Spider Queen marks you, you are nothing in Velkarath. Will you take her mark?', [
      {
        label: 'I will',
        reply: 'Then go to the Temple of the Spider Queen, east of my palace. Priestess Ilvra will mark you. Come back to me when it is done.',
        effects: [
          { kind: 'flag', flag: 'velkarath_task', journal: { title: QUEST, text: 'Matron Xalyth told me to receive the Spider\'s mark from Priestess Ilvra, in the temple east of her palace.', done: false } },
        ],
      },
      { label: 'Not now', reply: 'Then stay a hatchling. The Spider Queen is patient. I am less so.' },
    ]),
  ],
};

const PRIESTESS = {
  shouts: ['The Spider Queen sees you.'],
  stages: [
    ifFlag('velkarath_done', 'The Spider Queen watches over you, child of Velkarath.'),
    ifFlag('velkarath_marked', 'Go. The Matron is waiting.'),
    ifFlag('velkarath_task', 'The Matron sent you, hatchling? Hold out your hand. This will sting.', [
      {
        label: 'I am ready',
        replyVerb: 'acts',
        reply: 'Ilvra draws a silver needle across your palm. A spider-shaped mark blooms there, black as ink.',
        effects: [
          { kind: 'unflag', flag: 'velkarath_task' },
          { kind: 'flag', flag: 'velkarath_marked', journal: { title: QUEST, text: 'Priestess Ilvra marked me with the Spider. I should go back to Matron Xalyth in her palace.', done: false } },
        ],
        next: says('It is done. Return to the Matron.'),
      },
      { label: 'Not yet', reply: 'Then do not waste my time.' },
    ]),
    always('Kneel, or leave.'),
  ],
};

const shop = (shouts, text, extra = []) => ({ shouts, stages: [always(text, [...extra, { label: 'Thank you', reply: 'Go quietly.' }])] });
const INNKEEPER = shop(
  ['Mushroom ale at the Black Lantern!'],
  'The Black Lantern. Mushroom ale and something to eat. Stand at the counter in front of me and open the Shop tab.',
  [{ label: 'Any news?', reply: 'The surface elves of Aelindor have built their city right over our western stair. One day the Matron will remind them whose land this is.' }],
);
const SMITH = shop(
  ['Blades and crossbows, Drow-made!'],
  'Crossbows, and blades thin enough to slip between ribs. Stand at my counter and look in the Shop tab.',
);
const ALCHEMIST = shop(
  ['Potions! Poisons! ...Potions.'],
  'Potions to close wounds and fungus from the deep caves. Stand at my counter and see the Shop tab.',
  [{ label: 'Poisons?', reply: 'I said potions. Only potions. For you.' }],
);
const TRAINER = shop(
  ['To the pit! Train or be trained upon!'],
  'The pit makes the Drow strong and quick. Stand on the stone in front of me and open the Shop tab to train.',
  [{ label: 'The dummies?', reply: 'Hit them. They do not hit back. Yet.' }],
);
// Short, with a topic to pick (the user, 2026-10-20: one long speech was
// too much to read). tools/server/fix_velkarath_guard.mjs puts it on live.
export const GUARD = {
  shouts: ['Walk softly, Drow. Talk to me if you are lost.', 'The Matron sees all.'],
  stages: [always('Keep your blade sheathed, Drow. What do you need?', [
    { label: 'City', reply: 'The palace is north of the Fire Well, the temple beside it. Ryld\'s Blades and Szinra\'s Alchemy are just west of the Well, the bank just south-east, doors on their north side. The Black Lantern is north-west; the Pit east, where Weaponmaster Dral trains you.' },
    { label: 'Surface', reply: 'Take the stair at the end of a tunnel. West: up by Aelindor and its ships. East: the hills, a long walk from Eastreach. South: wild hills.' },
    { label: 'Caves', reply: 'Slimes in the north-east cavern, up the temple\'s east side. Duergar and bats in the north-west cavern, round behind the Black Lantern. Go armed.' },
    { label: 'Farewell', reply: 'The Matron sees all.' },
  ])],
};
// Townsfolk (the user, 2026-10-21: make Velkarath feel lived in). Short
// lines; only the stallholders and Raelag call out.
const GARDENER = shop(
  ['Mushrooms, fresh from the dark!'],
  'The gardens feed the city. Gather from any patch with a sickle: stand beside it and type gather. Sickles at my counter.',
);
const WEAVER = shop(
  ['Leather and silk, cut for the Drow!'],
  'Caps, belts, leggings and bags. Stand at my counter and look in the Shop tab.',
);
const COOK = shop(
  ['Hot food! Cheaper than the Lantern!'],
  'Roast cave lizard in bread. Do not ask which cave. Stand at my counter and open the Shop tab.',
);
const talker = (text, answers = []) => ({ shouts: [], stages: [always(text, answers)] });
const TOWNSFOLK = [
  // [name, look, description, x, y, dialogue]
  ['Old Ghaundra', 'Dark Elf Woman', 'Old Ghaundra, white-haired and sharp-eyed.', 64, 87,
    talker('I have served three Matrons. This one is the cleverest. Do not tell her I said so.')],
  ['Sabal', 'Dark Elf Woman', 'Sabal, mending a crossbow string.', 74, 87,
    talker('Mind the hatchling. She bites.')],
  ['Dhuunyl the Lamplighter', 'Dark Elf Man', 'Dhuunyl, soot to the elbows.', 96, 87,
    talker('The dark is ours, but we like to see it. Every brazier in the city is mine to tend.')],
  ['Ilzt', 'Dark Elf Guard', 'Ilzt, an off-duty guard with his boots off.', 106, 87,
    talker('Off duty. Go away. ...Unless you brought ale.')],
  ['Raelag', 'Dark Elf Man', 'Raelag, swaying gently outside the Black Lantern.', 62, 60,
    { shouts: ['Mushroom ale! Brewed in the dark, drunk in the dark!'], stages: [always('The ale here is brewed from mushrooms. So am I, by now.', [
      { label: 'News?', reply: 'They say the surface elves sleep with their windows open. Madness.' },
      { label: 'Farewell', reply: 'Mind the step. There is no step. Mind it anyway.' },
    ])] }],
  ['Lady Myrymma', 'Dark Elf Matron', 'Lady Myrymma of House Xalyth, in violet silk.', 91, 57,
    talker('A cousin of the Matron. You may look at me. Briefly.')],
  ['Sergeant Ilzaer', 'Dark Elf Guard', 'Sergeant Ilzaer, sharpening a long knife.', 119, 59,
    talker('The Pit is for hatchlings. Real fights are in the caverns.', [
      { label: 'Duergar?', reply: 'Grey dwarves from below. They raid the north-west cavern. The bounty board pays for them.' },
      { label: 'Farewell', reply: 'Keep your edge.' },
    ])],
];
const NALFEIN = { shouts: [], stages: [always('The Fire Well never goes out. They say it reaches down to the heart of the world.')] };
const ZESSTRA = { shouts: [], stages: [always('Watch the side caves. The bats up north-west are the size of dogs, and twice as hungry.')] };

// ---- the dark elf tutorial: "From Hatchling to Drow..." ----
// New dark elves wake in a cell in a sealed cave complex south-west of
// the city (defRaces/darkelf starts them there), and are trained step by
// step like the humans' tutorial, each door opening on the step's flag;
// or they skip it. Either way the Spider Stone takes them to the Fire
// Well, which becomes where they come back to.

const TUT = 'From Hatchling to Drow...';
const WELL = [1345, 912]; // beside the Fire Well
const START = [11, 110]; // the cell (plan coordinates)
const jflag = (flag, text, done = false) => ({ kind: 'flag', flag, journal: { title: TUT, text, done } });
const unflag = (flag) => ({ kind: 'unflag', flag });
const TUT_FLAGS = ['drowTut1', 'drowTut2', 'drowTut3', 'drowTut4', 'drowTut5', 'drowTut6', 'drowSkip'];

const TASKMISTRESS = {
  shouts: ['You! Hatchling! Over here.'],
  stages: [
    ifFlag('drowSkip', 'The south passage. Go, before I change my mind.'),
    ifFlag('drowTut2', 'Why are you still here? Armsmaster Quave is through the east door.'),
    ifFlag('drowTut1', 'So, the newest hatchling crawls out of its cell. Will you be trained, or are you ready for the city?' + CHAT_TIP, [
      { label: 'Train me', reply: 'Wise. Through the east door: Armsmaster Quave will arm you.', effects: [unflag('drowTut1'), jflag('drowTut2', 'Taskmistress Vhal sent me east, to Armsmaster Quave.')] },
      { label: 'I am ready', reply: 'Arrogant. We shall see. The passage to the south leads to the Spider Stone; it will carry you to the city.', effects: [unflag('drowTut1'), jflag('drowSkip', 'I told Taskmistress Vhal I needed no training. The Spider Stone down the south passage leads to the city.')] },
    ]),
    always('Velkarath has no use for idlers.'),
  ],
};
const ARMSMASTER = {
  shouts: [],
  stages: [
    ifFlag('drowTut3', 'One set each, hatchling. The pit is through the east door.'),
    ifFlag('drowTut2', 'Another blade for the House. Take these: a cloth shirt and a wooden dagger.', [
      { label: 'Thank you', reply: 'Do not thank me; survive. Blademistress Zeerith waits in the pit, through the east door.', effects: [{ kind: 'give', item: 'cloth shirt' }, { kind: 'give', item: 'wooden dagger' }, unflag('drowTut2'), jflag('drowTut3', 'Armed and dressed. The Blademistress waits in the pit, through the east door.')] },
    ]),
    always('I arm hatchlings. You are not one I was sent.'),
  ],
};
const BLADEMISTRESS = {
  shouts: [],
  stages: [
    ifFlag('drowTut5', 'Go. The Provisioner is through the south door.'),
    ifFlag('drowTut4', 'Well? Cut the stuffing out of a training dummy and bring it to me. (Stand right beside one, not diagonally, then click it and choose Attack.)', [
      { label: 'Here it is', reply: 'Clean work. Every kill earns you experience: Weaponmaster Dral, in the Pit east of the Fire Well, turns it into strength and skill. The Provisioner is through the south door: you will need food and water in the city.', needs: { kind: 'item', value: 'straw stuffing' }, effects: [{ kind: 'take', item: 'straw stuffing' }, unflag('drowTut4'), jflag('drowTut5', 'The Blademistress sent me through the south door to the Provisioner, for water and a mushroom.')], next: keeperPrompt('darkelf') },
    ]),
    // Dressed and a dummy beaten before speaking to her: straight to the hand-in.
    { ...ifFlag('drowTut3', 'You did not wait to be told. Good. Show me the stuffing.', [
      { label: 'Here it is', reply: 'Clean work. Every kill earns you experience: Weaponmaster Dral, in the Pit east of the Fire Well, turns it into strength and skill. The Provisioner is through the south door: you will need food and water in the city.', needs: { kind: 'item', value: 'straw stuffing' }, effects: [{ kind: 'take', item: 'straw stuffing' }, unflag('drowTut3'), jflag('drowTut5', 'The Blademistress sent me through the south door to the Provisioner, for water and a mushroom.')], next: keeperPrompt('darkelf') },
    ]), also: { kind: 'item', value: 'straw stuffing' } },
    ifFlag('drowTut3', 'Put on what Quave gave you (in your Backpack, press Wear beside each). Then we fight.', [
      { label: 'I am ready', reply: 'Then strike a training dummy, and bring me its stuffing. (Stand beside one, click it and choose Attack.)', effects: [unflag('drowTut3'), jflag('drowTut4', 'The Blademistress wants the stuffing of a training dummy. Time to fight.')] },
    ]),
    always('The pit is for those in training.'),
  ],
};
const PROVISIONER = {
  shouts: ['Water and mushrooms!'],
  stages: [
    ifFlag('drowTut6', 'You have what you need. The Spider Stone is through the east door.'),
    // Both the water and the mushroom checked in one answer (a follow-up
    // question lost anyone who typed something else).
    { ...ifFlag('drowTut5', 'No one survives the city hungry. Buy a water and a mushroom from me: stand in front of my counter, open the Shop tab and press Buy. Then talk to me again.', [
      { label: 'I have them', reply: 'Good. Eat and drink from your Backpack when you need to. Now through the east door, and step on the Spider Stone.', needs: { kind: 'item', value: 'water' }, effects: [unflag('drowTut5'), jflag('drowTut6', 'Supplies in hand. The Spider Stone, through the east door, leads to the city.')] },
    ]), also: { kind: 'item', value: 'mushroom' } },
    ifFlag('drowTut5', 'No one survives the city hungry. Buy a water and a mushroom from me: stand in front of my counter, open the Shop tab and press Buy. Then talk to me again.', [
      { label: 'I have them', reply: '', needs: { kind: 'item', value: 'mushroom' }, effects: [] },
    ]),
    always('Water and mushrooms, for those who can pay.'),
  ],
};
// The Spider Stone: training done (or skipped), to the city, bound there;
// first, a class (classtrials.mjs).
export const spiderStone = (flag) => [classGate(flag, '** The Spider Stone stays cold under your feet: first, choose your calling. **'), {
  when: { kind: 'flag', value: flag },
  speaker: '',
  says: '** You step onto the Spider Stone. Webs of light close around you... and you stand beside the Fire Well of Velkarath. ** A guard looks you over: \'Another hatchling. Matron Xalyth sees every new one, in her palace north of the Fire Well. Do not keep her waiting.\'',
  effects: [...TUT_FLAGS.map(unflag), jflag('drowTutDone', 'Training done. Matron Xalyth sees every new hatchling, in her palace north of the Fire Well.', true), { kind: 'bind', x: WELL[0], y: WELL[1] }, { kind: 'teleport', x: WELL[0], y: WELL[1] }],
}];
const door = (flag, speaker, words) => ({ kind: 'flag', flag, speaker, verb: 'says', says: words });

function tutorial(p) {
  // The cell, and the way out of it, where the quest begins.
  p.fill(8, 108, 7, 5, 'k');
  p.fill(15, 110, 4, 1, 'k');
  p.action(16, 110, [{ when: { kind: 'noflag', value: 'drowWoke' }, speaker: '', says: '** You wake on cold stone in a cell beneath Velkarath. Somewhere ahead, a voice snaps orders. **', effects: [{ kind: 'flag', flag: 'drowWoke' }, jflag('drowTut1', 'I woke in a cell beneath Velkarath. Someone ahead is giving orders: find them.')] }]);
  // The Hall of Choosing.
  p.fill(19, 105, 11, 11, 'k');
  for (const [x, y] of [[19, 105], [29, 105], [19, 115], [29, 115]]) p.set(x, y, 'C');
  p.npc({ name: 'Taskmistress Vhal', look: 'Dark Elf Matron', desc: 'Taskmistress Vhal, who trains Velkarath\'s hatchlings, and is not patient about it.', x: 24, y: 107, dlg: TASKMISTRESS });
  // Skipping: the south passage to a Spider Stone.
  p.set(24, 116, 'D');
  p.walk(24, 116, door('drowSkip', 'Taskmistress Vhal', 'Not that way, hatchling. Speak to me first.'));
  p.fill(24, 117, 1, 4, 'k');
  p.set(24, 121, 'C');
  p.action(24, 121, spiderStone('drowSkip'));
  // The armory.
  p.set(30, 110, '>');
  p.walk(30, 110, door('drowTut2', 'Taskmistress Vhal', 'Not that way, hatchling. Speak to me first.'));
  p.fill(31, 106, 9, 9, 'M');
  p.npc({ name: 'Armsmaster Quave', look: 'Dark Elf Man', desc: 'Armsmaster Quave, surrounded by racks of blades.', x: 35, y: 107, dlg: ARMSMASTER });
  // The pit, with its dummies.
  p.set(40, 110, '>');
  p.fill(41, 104, 13, 13, 'e');
  p.npc({ name: 'Blademistress Zeerith', look: 'Dark Elf Guard', desc: 'Blademistress Zeerith, watching your footwork with contempt.', x: 47, y: 105, dlg: BLADEMISTRESS });
  p.mob('training dummy', 1, 44, 113); p.mob('training dummy', 1, 50, 113);
  trialYard(p, 'darkelf');
  // The provisioner, behind a counter: its near side (the way in) is where
  // buyers stand.
  p.set(47, 117, 'D');
  p.walk(47, 117, door('drowTut5', 'Blademistress Zeerith', 'Not yet! Come and see me first, at the north end of the pit.'));
  p.fill(43, 118, 9, 6, 'k');
  p.fill(46, 120, 3, 1, 's');
  p.npc({ name: 'Provisioner Nym', look: 'Dark Elf Woman', desc: 'Provisioner Nym, counting mushrooms.', x: 47, y: 121, dlg: PROVISIONER });
  p.merchant(47, 119, ['water', 'mushroom']);
  // The way out: the Spider Stone.
  p.set(52, 121, '>');
  p.walk(52, 121, door('drowTut6', 'Provisioner Nym', 'Supplies first! A water and a mushroom.'));
  p.fill(53, 121, 3, 1, 'k');
  p.set(56, 121, 'C');
  p.action(56, 121, spiderStone('drowTut6'));
  // New dark elves start in the cell.
  p.setValue('defRaces/darkelf', 'x', ORIGIN[0] + START[0]);
  p.setValue('defRaces/darkelf', 'y', ORIGIN[1] + START[1]);
}

const PROP = (image, desc) => `image\n${image}\ndescription\n${desc}\n.\n`;
const BASE_PROPS = {
  'Dark Elf Man': PROP(5, 'A dark elf of Velkarath, watching you with red eyes.'),
  'Dark Elf Woman': PROP(5, 'A dark elf of Velkarath, cold and graceful.'),
  'Dark Elf Guard': PROP(5, 'A dark elf guard in black mail, a crossbow ready.'),
  'Dark Elf Matron': PROP(5, 'A dark elf matron in purple and gold, used to being obeyed.'),
  'Dark Elf Priestess': PROP(5, 'A dark elf priestess, a silver spider at her throat.'),
  'Dark Elf Teller': PROP(5, 'A dark elf banker behind a counter of black stone.'),
  'Drow Hatchling': PROP(5, 'A dark elf hatchling, chewing on a mushroom stalk.'),
};

const WARES = {
  inn: ['water', 'ale', 'mushroom', 'sandwich'],
  smith: ['dagger', 'curved dagger', 'assassin blade', 'short sword', 'wooden crossbow', 'leather vest', 'leather gloves'],
  alchemy: ['minor healing potion', 'minor mana potion', 'mana potion', 'strong healing potion', 'healing potion', 'strong mana potion', 'mushroom', 'mandrake', 'wolfsbane'],
  garden: ['herb sickle', 'mushroom'],
  weaver: ['leather cap', 'leather helmet', 'leather belt', 'leather sleeves', 'leather leggings', 'leather pants', 'leather jerkin', 'small bag', 'large bag'],
  cook: ['sandwich', 'mushroom', 'water', 'ale'],
  train: ['train:Strength', 'train:Intelligence', 'train:Dexterity', 'train:Constitution', 'train:Wisdom', 'train:HP', 'train:MP', 'train:Dodge', 'train:Regeneration', 'train:Mana Regen', 'train:Spell Power'],
};

export default {
  name: 'Velkarath',
  origin: ORIGIN,
  size: [170, 140],
  seed: 23,
  // The block is all this plan's (carved out of open sea, nothing else
  // near it), so it may build over anything in it, its own rock included.
  mayBuild: () => true,
  copies: [
    { from: 'talk/Bank Teller', to: 'talk/Dark Elf Teller', replace: [['Bank Teller says', 'Dark Elf Teller says']] },
  ],
  build(p) {
    for (const [name, text] of Object.entries(BASE_PROPS)) p.file(`defProps/${name}`, text);
    p.file('talk/Dark Elf Teller.greet', 'Your gold is safe in the dark.\n');
    p.file('defItems/shadowsilk gloves', 'type\narmor\nkind\nhands\ndescription\ngloves of black spider silk, light as shadow\ncost\n400\nmod\n30\nimage\n7\ndurability\n-1\n.\n');

    // Solid rock, then the caves.
    p.fill(0, 0, 170, 140, 'R');
    cave(p, 86, 68, 52, 36, 0.22);
    for (const s of STAIRS) {
      const [sx, sy] = s.stair, [ax, ay] = s.arrive;
      const cx = ax + Math.sign(ax - sx) * 6, cy = ay + Math.sign(ay - sy) * 5;
      cave(p, cx, cy, 7, 6, 0.3);
      p.path([[ax, ay], [cx, cy]].map(([x, y]) => [x, y])); // a clear way from the stair
    }
    // Tunnels from the stairs to the city, and out to the side caves.
    tunnel(p, [[16, 60], [30, 50], [46, 64]]);
    tunnel(p, [[80, 122], [68, 110], [85, 97]]);
    tunnel(p, [[154, 72], [140, 82], [127, 70]]);
    cave(p, 38, 20, 14, 9); tunnel(p, [[58, 42], [46, 30], [40, 22]], 3);       // the bat cave
    cave(p, 138, 22, 12, 8); tunnel(p, [[112, 42], [126, 30], [136, 24]], 3);   // the crystal grotto
    for (let y = 10; y < 34; y++) for (let x = 122; x < 154; x++) if (p.at(x, y) === 'k' && noise(x, y, 3) > 0.68) p.set(x, y, 'C');
    cave(p, 140, 116, 12, 8); tunnel(p, [[116, 92], [130, 106], [138, 114]], 3); // the lava cave
    cave(p, 143, 118, 6, 4, 0.3, 'L');
    // The path tiles from the stairs are for walking room only: floor.
    for (let y = 0; y < 140; y++) for (let x = 0; x < 170; x++) if (p.at(x, y) === '.') p.set(x, y, 'k');

    // Stairs up, and the stairs down in the mountains.
    for (const s of STAIRS) {
      const [sx, sy] = s.stair, [ax, ay] = s.arrive;
      p.set(sx, sy, 'U');
      p.set(ax, ay, 'k');
      p.action(sx, sy, [{ when: { kind: 'always', value: '' }, speaker: '', says: 'You climb the long stair up into the open air.' + s.up, effects: [{ kind: 'teleport', x: s.front[0], y: s.front[1] }] }]);
      p.farTile(s.mouth[0], s.mouth[1], 'u');
      p.farWalk(s.mouth[0], s.mouth[1], RACE_ONLY);
      p.farAction(s.mouth[0], s.mouth[1], [{ when: { kind: 'always', value: '' }, speaker: '', says: 'You descend a long, winding stair into the dark...', effects: [{ kind: 'teleport', x: ORIGIN[0] + ax, y: ORIGIN[1] + ay }] }]);
      // No sign where you arrive (the user, 2026-10-28: no signs at
      // Velkarath's entrances, unless one warns people off).
      const [gx, gy] = s.name === 'south' ? [ax + 1, ay - 1] : [ax + Math.sign(ax - sx), ay + 1];
      p.set(gx, gy, 'k');
    }

    // ---- the city ----
    // Streets of packed earth, and the Fire Well in the plaza.
    p.fill(50, 67, 72, 3, 'e');
    p.fill(84, 54, 3, 40, 'e');
    p.fill(56, 81, 56, 2, 'e');
    p.oval(74, 61, 23, 15, 'M');
    p.oval(80, 65, 11, 7, 'C');
    p.oval(82, 66, 7, 5, 'L');
    p.npc({ name: 'Nalfein', look: 'Dark Elf Man', desc: 'Nalfein, staring into the Fire Well.', x: 79, y: 63, dlg: NALFEIN });
    p.npc({ name: 'Zesstra', look: 'Dark Elf Woman', desc: 'Zesstra, a scout with dust on her boots.', x: 92, y: 72, dlg: ZESSTRA });

    // The Matron's palace (north), a throne at the back.
    p.building(74, 42, 23, 12, { wall: 's', floor: 'x', doors: [['s', 11]] });
    p.fill(84, 44, 3, 8, 't');
    for (const [x, y] of [[74, 42], [96, 42], [74, 53], [96, 53], [83, 53], [87, 53]]) p.set(x, y, 'i');
    p.prop('Throne', 85, 44);
    p.npc({ name: 'Matron Xalyth', look: 'Dark Elf Matron', desc: 'Matron Xalyth, mistress of Velkarath.', x: 85, y: 45, dlg: MATRON });
    p.prop('candlestick stand', 76, 44); p.prop('candlestick stand', 94, 44);
    p.prop('Dark Elf Guard', 83, 55); p.prop('Dark Elf Guard', 87, 55);
    p.sign('Palace of House Xalyth', 'The Palace of House Xalyth. Enter on your knees.', 88, 56);

    // The Temple of the Spider Queen (north-east): fire and crystal.
    p.building(100, 44, 15, 11, { wall: 's', floor: 'M', doors: [['s', 7]] });
    p.fill(111, 48, 2, 3, 'C');
    for (const [x, y] of [[102, 46], [102, 52], [109, 46], [109, 52]]) p.set(x, y, 'L');
    p.npc({ name: 'Priestess Ilvra', look: 'Dark Elf Priestess', desc: 'Priestess Ilvra of the Spider Queen.', x: 110, y: 49, dlg: PRIESTESS });
    p.fill(107, 55, 1, 12, 'e');
    p.sign('Temple of the Spider Queen', 'The Temple of the Spider Queen.', 108, 56);

    // The Black Lantern (north-west).
    p.building(52, 50, 15, 9, { wall: 's', floor: 'M', doors: [['s', 7]] });
    p.fill(56, 52, 5, 1, 's');
    p.npc({ name: 'Vaelra', look: 'Dark Elf Woman', desc: 'Vaelra, keeper of the Black Lantern.', x: 58, y: 51, dlg: INNKEEPER });
    p.merchant(58, 53, WARES.inn);
    p.prop('chair', 62, 54); p.prop('chair', 64, 54); p.prop('chair', 62, 56); p.prop('chair', 64, 56);
    p.prop('bed', 54, 55); p.prop('bed', 54, 57);
    p.fill(59, 59, 1, 8, 'e');
    p.sign('The Black Lantern', 'The Black Lantern: mushroom ale and a place to sleep.', 60, 60);

    // Shops on the south side of the main street, keepers behind counters.
    const store = (x, sign, text, who, wares) => {
      p.building(x, 72, 11, 8, { wall: 's', floor: 'M', doors: [['n', 5]] });
      p.fill(x + 4, 76, 3, 1, 's');
      p.npc({ ...who, x: x + 5, y: 77 });
      p.merchant(x + 5, 75, wares);
      p.set(x + 5, 70, 'e'); p.set(x + 5, 71, 'e');
      p.sign(sign, text, x + 6, 71);
    };
    store(52, 'Szinra\'s Alchemy', 'Szinra\'s Alchemy: potions and deep-cave fungus.',
      { name: 'Szinra', look: 'Dark Elf Woman', desc: 'Szinra the alchemist, fingers stained green.', dlg: ALCHEMIST }, WARES.alchemy);
    store(66, 'Ryld\'s Blades', 'Ryld\'s Blades: crossbows and blades.',
      { name: 'Ryld', look: 'Dark Elf Man', desc: 'Ryld the weaponsmith, testing an edge with his thumb.', dlg: SMITH }, WARES.smith);

    // The bank (south-east of the plaza).
    p.building(92, 74, 13, 7, { wall: 's', floor: 'M', doors: [['n', 6]] });
    p.fill(93, 77, 11, 1, 's'); // the counter, wall to wall (the back room was a dead end)
    p.npc({ name: 'Dark Elf Teller', look: null, x: 98, y: 78 });
    p.set(98, 70, 'e'); p.set(98, 71, 'e'); p.set(98, 72, 'e'); p.set(98, 73, 'e');
    p.sign('Bank of Velkarath', 'The Bank of Velkarath: your gold and your deposit box, the same as at every bank.', 99, 72);

    // The training pit (east).
    p.fill(108, 72, 13, 9, 'e');
    p.npc({ name: 'Weaponmaster Dral', look: 'Dark Elf Man', desc: 'Weaponmaster Dral, scarred and patient.', x: 114, y: 73, dlg: TRAINER });
    p.merchant(114, 75, WARES.train);
    p.mob('training dummy', 1, 110, 79); p.mob('training dummy', 1, 118, 79);
    p.sign('The Pit', 'The Pit. Talk to Weaponmaster Dral to train.', 115, 71);

    // Homes along the south street.
    const home = (x, who) => {
      p.building(x, 84, 8, 6, { wall: 's', floor: 'M', doors: [['n', 3]] });
      p.set(x + 3, 83, 'e');
      p.prop('bed', x + 1, 88); p.prop('chair', x + 5, 86);
      p.prop('chest', x + 6, 88); p.prop('barrel', x + 6, 85);
    };
    home(60); home(70); home(92); home(102);
    p.prop('Drow Hatchling', 72, 86);

    // Who lives here: the homes, the street, the barracks.
    for (const [name, look, desc, x, y, dlg] of TOWNSFOLK) p.npc({ name, look, desc, x, y, dlg });

    // The barracks, north of the Pit.
    p.building(113, 57, 10, 6, { wall: 's', floor: 'M', doors: [['s', 5]] });
    for (const [x, y] of [[114, 58], [116, 58], [114, 61], [116, 61]]) p.prop('bunk', x, y);
    p.prop('chest', 121, 61);
    p.fill(118, 63, 1, 4, 'e');
    p.sign('Barracks', 'The barracks of the city guard.', 119, 64);

    // The Fungus Gardens (south): patches anyone may gather from.
    p.fill(62, 90, 19, 8, 'k');
    p.fill(63, 93, 17, 5, 'e');
    for (const y of [94, 96]) for (let x = 64; x <= 78; x += 2) p.prop('mushroom patch', x, y);
    p.npc({ name: 'Fungus-Tender Ilphra', look: 'Dark Elf Woman', desc: 'Ilphra, who tends the Fungus Gardens.', x: 72, y: 91, dlg: GARDENER });
    p.merchant(72, 92, WARES.garden);
    p.sign('The Fungus Gardens', 'The Fungus Gardens. Gather with a sickle: Ilphra sells them.', 80, 91);

    // The Night Market (south-east of the gardens): two stalls and shoppers.
    p.fill(89, 90, 23, 8, 'k');
    const stall = (x, who, wares) => {
      p.fill(x - 1, 92, 3, 1, 's');
      p.npc({ ...who, x, y: 91 });
      p.merchant(x, 93, wares);
    };
    stall(92, { name: 'Weaver Zilvra', look: 'Dark Elf Woman', desc: 'Zilvra the weaver, a spool of black silk on her wrist.', dlg: WEAVER }, WARES.weaver);
    stall(101, { name: 'Cook Rhylla', look: 'Dark Elf Woman', desc: 'Rhylla, turning skewers over a bed of coals.', dlg: COOK }, WARES.cook);
    p.sign('The Night Market', 'The Night Market: leather and silk, and hot food.', 89, 91);
    for (const [name, x, y] of [['barrel', 90, 96], ['barrel', 91, 96], ['goods', 106, 92], ['food', 107, 92], ['brazier', 104, 95],
      ['Dark Elf Woman', 96, 95], ['Dark Elf Man', 99, 96], ['Dark Elf Man', 108, 94]]) p.prop(name, x, y);

    // Lava pools and crystals in the cavern.
    p.oval(51, 86, 6, 4, 'L');
    p.oval(118, 46, 5, 3, 'L');
    for (const [x, y] of [[49, 44], [122, 56], [50, 62], [121, 88], [66, 92], [104, 92], [70, 40], [100, 40]]) if (p.at(x, y) === 'k') p.set(x, y, 'c');

    // Guards where the tunnels come in; their Surface answer says where each
    // stair comes out (play-test 6). No signposts (the user, 2026-10-28).
    for (const [x, y] of [[49, 65], [86, 95], [125, 72]]) p.set(x, y, 'k');
    p.npc({ name: 'Dark Elf Guard', look: null, x: 49, y: 65, dlg: GUARD });
    p.prop('Dark Elf Guard', 86, 95);
    p.prop('Dark Elf Guard', 125, 72);

    // The tutorial's caves, sealed off from the rest.
    tutorial(p);

    // The rock as grey fieldstone (tile 98, the old world's rock face), not
    // the legend's 'R' (49), which is drawn as a cobbled floor: run 7's
    // tester took Velkarath's walls for street. lights-velkarath.mjs puts
    // its torches on it (162) as on any wall.
    for (let y = 0; y < 140; y++) for (let x = 0; x < 170; x++) if (p.at(x, y) === 'R') p.set(x, y, 98);

    // Bats in the north-west cave.
    for (const [x, y] of [[34, 18], [40, 22], [44, 17], [32, 23]]) if (p.at(x, y) === 'k') p.mob('Bat', 1, x, y);
  },
};
