// Aelindor, the elven city: a ring of old oaks round a clearing on the
// southern continent, with the Moonwell at its heart. Built into the map
// by tools/world/city.mjs.
//
// The plan's grid starts at (425, 1180); the city itself is the oval at
// local (15, 40), 66 x 54 squares (absolute 440-505, 1220-1273), and a
// road runs north from its gate to the lake shore.

const CITY = { x: 15, y: 40 };

// Coordinates inside the city's oval.
function inCity(p) {
  const o = (x, y) => [CITY.x + x, CITY.y + y];
  return {
    fill: (x, y, w, h, ch) => p.fill(CITY.x + x, CITY.y + y, w, h, ch),
    oval: (x, y, w, h, ch) => p.oval(CITY.x + x, CITY.y + y, w, h, ch),
    ring: (x, y, w, h, t, ch) => p.ring(CITY.x + x, CITY.y + y, w, h, t, ch),
    set: (x, y, ch) => p.set(CITY.x + x, CITY.y + y, ch),
    at: (x, y) => p.at(CITY.x + x, CITY.y + y),
    path: (pts) => p.path(pts.map(([x, y]) => o(x, y))),
    building: (x, y, w, h, opts) => p.building(CITY.x + x, CITY.y + y, w, h, opts),
    prop: (name, x, y) => p.prop(name, ...o(x, y)),
    npc: (n) => p.npc({ ...n, x: CITY.x + n.x, y: CITY.y + n.y }),
    merchant: (x, y, wares) => p.merchant(...o(x, y), wares),
    sign: (name, text, x, y) => p.sign(name, text, ...o(x, y)),
    mob: (name, level, x, y) => p.mob(name, level, ...o(x, y)),
  };
}

// ---- who lives here ----

const says = (text, answers = []) => ({ says: text, answers });
const always = (text, answers = []) => ({ when: { kind: 'always', value: '' }, ...says(text, answers) });
const ifFlag = (flag, text, answers = []) => ({ when: { kind: 'flag', value: flag }, ...says(text, answers) });
const QUEST = 'Friend of Aelindor';

const ELDER = {
  shouts: ['Welcome, traveller, to Aelindor.'],
  stages: [
    ifFlag('aelindor_done', 'Aelindor is glad of you, friend. Walk under our trees whenever you wish.'),
    ifFlag('aelindor_blessed', 'I see the Moonwell\'s light on you. Ilsevel has blessed you, then?', [
      {
        label: 'She has',
        reply: 'Then you are a friend of Aelindor. Take this, with our thanks, and may the leaves shelter you.',
        effects: [
          { kind: 'unflag', flag: 'aelindor_blessed' },
          { kind: 'flag', flag: 'aelindor_done', journal: { title: QUEST, text: 'Elder Faelar named me a friend of Aelindor.', done: true } },
          { kind: 'give', item: 'moonleaf amulet' },
          { kind: 'exp', amount: 300 },
          { kind: 'gold', amount: 150 },
        ],
        next: { verb: 'acts', says: 'Elder Faelar places a Moonleaf Amulet in your hand: a silver leaf on a fine chain. You gain 300 experience and 150 gold.', answers: [] },
      },
    ]),
    ifFlag('aelindor_welcome', 'Have you been to the Moonwell yet? Priestess Ilsevel keeps the shrine across the avenue, to the north-east.'),
    always('Welcome to Aelindor, traveller. Few find their way through the old wood. Would you hear of our city?', [
      {
        label: 'Tell me',
        reply: 'Aelindor was grown, not built, from the first oaks of this land, and the Moonwell at its heart has watched over us for an age. If you would be counted a friend of the elves, go to the Moon Shrine and ask Priestess Ilsevel for the Moonwell\'s blessing.',
        effects: [
          { kind: 'flag', flag: 'aelindor_welcome', journal: { title: QUEST, text: 'Elder Faelar asked me to seek the Moonwell\'s blessing from Priestess Ilsevel, at the Moon Shrine in the north-east of Aelindor.', done: false } },
        ],
      },
      { label: 'Not now', reply: 'As you wish. The trees are patient, and so are we.' },
    ]),
  ],
};

const PRIESTESS = {
  shouts: ['Peace be on you, wanderer.'],
  stages: [
    ifFlag('aelindor_done', 'The Moonwell remembers you, friend of Aelindor.'),
    ifFlag('aelindor_blessed', 'Go to Elder Faelar. He will want to know.'),
    ifFlag('aelindor_welcome', 'The Elder sent you? Then stand in the Moonwell\'s light. Are you ready?', [
      {
        label: 'I am ready',
        replyVerb: 'acts',
        reply: 'Ilsevel dips her fingers in a silver bowl and touches your brow. A cool light runs through you.',
        effects: [
          { kind: 'unflag', flag: 'aelindor_welcome' },
          { kind: 'flag', flag: 'aelindor_blessed', journal: { title: QUEST, text: 'Priestess Ilsevel gave me the Moonwell\'s blessing. I should tell Elder Faelar in his hall, north-west of the Moonwell.', done: false } },
        ],
        next: says('It is done. Go now, and tell Elder Faelar.'),
      },
      { label: 'Not yet', reply: 'Come back when you are.' },
    ]),
    always('The Moonwell\'s light is for all who come in peace. Rest here a while.'),
  ],
};

const shop = (shouts, text, extra = []) => ({ shouts, stages: [always(text, [...extra, { label: 'Thank you', reply: 'Go well.' }])] });

const INNKEEPER = shop(
  ['Food and drink at the Silver Leaf!'],
  'Welcome to the Silver Leaf! Stand at the counter in front of me and open the Shop tab for food and drink.',
  [{ label: 'Any news?', reply: 'Travellers say these lands go on past the mountains to the west. And there are whispers that the dark elves have a city beneath those mountains... but nobody I know has seen it.' }],
);
const BOWYER = shop(
  ['Elven bows! The finest under the trees!'],
  'Bows of yew and arrows fletched with owl feathers. Stand at my counter and look in the Shop tab.',
  [{ label: 'Elven mail?', reply: 'Woven by my sister, link by link. Light as a shirt and it turns a blade. It is on my shelf, if you have the gold.' }],
);
const TAILOR = shop(
  ['Cloth and leather, cut to fit!'],
  'Leather for the road and cloaks for the cold. Stand at my counter and open the Shop tab.',
);
const HERBALIST = shop(
  ['Herbs and potions, fresh from the wood!'],
  'Potions for wounds and weariness, and herbs from the forest floor. Stand at my counter and see the Shop tab.',
  [{ label: 'Herb lore?', reply: 'Lavender calms, mandrake heals in small doses and poisons in large, and wolfsbane... well, wolves don\'t care for it.' }],
);
const TRAINER = shop(
  ['Train body and mind in the glade!'],
  'Strength, speed and wisdom: the glade teaches them all. Stand on the stone in front of me and open the Shop tab to train.',
  [{ label: 'The dummies?', reply: 'Strike them as often as you like. They grow back.' }],
);
const GUARD = {
  shouts: ['Halt! ... Ah, a traveller. Be welcome in Aelindor.', 'Keep to the paths, stranger.'],
  stages: [always('The Elder\'s hall is to the north-west of the Moonwell, the shrine to the north-east. Shops and the inn are along the avenues. Keep the peace and you\'re welcome here.')],
};
const LORIEN = { shouts: [], stages: [always('Have you seen the Moonwell at night? It glows like a second moon.')] };
const NIMUE = { shouts: [], stages: [always('My grandmother says these oaks were saplings when the first elves came. She would know: she planted some of them.')] };

// The props the townsfolk look like (painted as elves, see
// tools/paintart/items.js; image is the old sprite for the Pixel style).
const PROP = (image, desc) => `image\n${image}\ndescription\n${desc}\n.\n`;
const BASE_PROPS = {
  'Elf': PROP(2, 'An elf of Aelindor, tall and quiet.'),
  'Elf Woman': PROP(5, 'An elf of Aelindor, graceful and watchful.'),
  'Elf Guard': PROP(5, 'An elven guard in leaf-green mail, a bow across her back.'),
  'Elf Elder': PROP(2, 'An elf so old his hair has gone white as birch bark.'),
  'Elf Priestess': PROP(5, 'An elven priestess in white, with silver in her hair.'),
  'Elven Teller': PROP(5, 'An elven banker behind a counter of polished oak.'),
};

const WARES = {
  inn: ['water', 'ale', 'sandwich', 'apple'],
  bows: ['cheap bow', 'arrow', 'quiver', 'redwood sword', 'quarter staff', 'elven chain mail'],
  cloth: ['cloth shirt', 'leather cap', 'leather jerkin', 'leather sleeves', 'leather gloves', 'leather leggings', 'leather belt', 'wizards cloak'],
  herbs: ['minor potion', 'minor mana potion', 'red potion', 'lavendar', 'mandrake', 'wolfsbane', 'mushroom', 'apple'],
  train: ['train:Strength', 'train:Intelligence', 'train:Dexterity', 'train:Constitution', 'train:Wisdom', 'train:HP', 'train:MP', 'train:Dodge', 'train:Regeneration', 'train:Mana Regen', 'train:Spell Power'],
};

export default {
  name: 'Aelindor',
  origin: [425, 1180],
  size: [96, 101],
  seed: 11,
  // Only over the forest: ground, trees and beach, never water or rock.
  mayBuild: (t) => [1, 36, 38, 27, 64, 103, 25, 26, 102, 124].includes(t),
  baseProps: BASE_PROPS,
  copies: [
    { from: 'talk/Bank Teller', to: 'talk/Elven Teller', replace: [['Bank Teller says', 'Elven Teller says']] },
  ],
  build(p) {
    const c = inCity(p);
    for (const [name, text] of Object.entries(BASE_PROPS)) p.file(`defProps/${name}`, text);
    // The Elder's reward: worn at the neck.
    p.file('defItems/moonleaf amulet', 'type\narmor\nkind\nneck\ndescription\na silver leaf on a fine chain, glowing faintly like the Moonwell\ncost\n500\nmod\n40\nimage\n7\ndurability\n-1\n.\n');
    p.file('talk/Elven Teller.greet', 'Your gold is safe beneath the oaks.\nThe bank of Aelindor is open.\n');

    // The clearing and its ring of oaks, with four gates.
    c.oval(0, 0, 66, 54, ',');
    c.ring(0, 0, 66, 54, 3, 'T');
    // Gates: openings in the ring, with grass for the guards and signs.
    c.fill(32, 0, 3, 4, ','); c.fill(32, 50, 3, 4, ',');
    c.fill(0, 26, 4, 3, ','); c.fill(62, 26, 4, 3, ',');
    for (const [x, y] of [[34, -1], [32, 54], [-1, 26], [66, 28]]) c.set(x, y, ',');
    // Avenues: north to south and west to east, through the gates.
    c.path([[33, 0], [33, 53]]);
    c.path([[0, 27], [65, 27]]);

    // The Moonwell plaza: ornate stone, a ring of crystal, the pool.
    c.oval(24, 20, 19, 15, 'o');
    c.oval(28, 23, 11, 9, 'c');
    c.oval(30, 25, 7, 5, '~');
    c.set(33, 24, 'c'); c.set(33, 30, 'c');

    // Elder's Hall (north-west): marble with a teal runner.
    c.building(14, 9, 17, 9, { doors: [['e', 4]] });
    c.fill(16, 13, 13, 1, 't');
    c.path([[31, 13], [32, 13]]);
    c.npc({ name: 'Elder Faelar', look: 'Elf Elder', desc: 'The Elder of Aelindor, ancient and kind-eyed.', x: 17, y: 13, dlg: ELDER });
    c.prop('Flower Box', 15, 10); c.prop('Flower Box', 15, 16);
    c.prop('candlestick stand', 29, 10); c.prop('candlestick stand', 29, 16);
    c.prop('chair', 18, 11); c.prop('chair', 18, 15);
    c.sign('Elder\'s Hall', 'The Elder\'s Hall. All are welcome to speak with Elder Faelar.', 32, 12);

    // The Moon Shrine (north-east): pale stone, marble, a crystal altar.
    c.building(36, 9, 15, 9, { wall: 'S', floor: 'l', doors: [['w', 4]] });
    c.fill(46, 12, 3, 3, 'c');
    c.fill(38, 13, 8, 1, 't');
    c.path([[34, 13], [35, 13]]);
    c.npc({ name: 'Priestess Ilsevel', look: 'Elf Priestess', desc: 'Priestess Ilsevel, keeper of the Moonwell.', x: 45, y: 13, dlg: PRIESTESS });
    c.prop('plants', 37, 10); c.prop('plants', 37, 16); c.prop('plants', 49, 10); c.prop('plants', 49, 16);
    c.sign('Moon Shrine', 'The Moon Shrine. Speak softly.', 34, 12);

    // The Silver Leaf inn (west of the plaza), its counter at the back.
    c.building(5, 18, 16, 8, { doors: [['s', 8]] });
    c.fill(8, 20, 5, 1, '#');
    c.npc({ name: 'Thalia', look: 'Elf Woman', desc: 'Thalia, keeper of the Silver Leaf.', x: 10, y: 19, dlg: INNKEEPER });
    c.merchant(10, 21, WARES.inn);
    c.prop('chair', 15, 20); c.prop('chair', 17, 20); c.prop('chair', 15, 23); c.prop('chair', 17, 23);
    c.prop('couch', 7, 23);
    c.prop('bed', 19, 19); c.prop('bed', 19, 21);
    c.path([[13, 26], [13, 26]]);
    c.sign('The Silver Leaf', 'The Silver Leaf: food, drink and a fire.', 12, 26);

    // The bank (east of the plaza).
    c.building(45, 18, 14, 8, { doors: [['s', 6]] });
    c.fill(48, 20, 7, 1, '#');
    c.npc({ name: 'Elven Teller', look: null, x: 51, y: 19 });
    c.prop('plants', 46, 24); c.prop('plants', 57, 24);
    c.path([[51, 26], [51, 26]]);
    c.sign('Bank of Aelindor', 'The Bank of Aelindor: your gold and your deposit box, the same as at every bank.', 52, 26);

    // Shops south-west and south-east of the plaza, each with its keeper
    // behind a counter and the shop square in front of it.
    const store = (x, sign, text, who, wares, plants) => {
      c.building(x, 29, 9, 7, { doors: [['n', 4]] });
      c.fill(x + 3, 33, 3, 1, '#');
      c.npc({ ...who, x: x + 4, y: 34 });
      c.merchant(x + 4, 32, wares);
      c.path([[x + 4, 28], [x + 4, 28]]);
      c.sign(sign, text, x + 5, 28);
      if (plants) { c.prop('plants', x + 1, 30); c.prop('plants', x + 7, 30); }
    };
    store(5, 'Caelum\'s Bows', 'Caelum\'s Bows: bows, arrows and elven mail.',
      { name: 'Caelum', look: 'Elf', desc: 'Caelum the bowyer, a half-strung bow in his hands.', dlg: BOWYER }, WARES.bows);
    store(14, 'Sylwen\'s Cloth and Leather', 'Sylwen\'s: cloth and leather, cut to fit.',
      { name: 'Sylwen', look: 'Elf Woman', desc: 'Sylwen the tailor, needle in hand.', dlg: TAILOR }, WARES.cloth);
    store(43, 'Miriel\'s Herbs', 'Miriel\'s Herbs: potions and herbs.',
      { name: 'Miriel', look: 'Elf Woman', desc: 'Miriel the herbalist, smelling of lavender.', dlg: HERBALIST }, WARES.herbs, true);

    // The training glade (south-east).
    c.fill(53, 29, 8, 8, 'm');
    c.path([[56, 28], [56, 28]]);
    c.npc({ name: 'Master Aerendyl', look: 'Elf', desc: 'Master Aerendyl, who has taught the sword and the spell for three hundred years.', x: 56, y: 30, dlg: TRAINER });
    c.merchant(56, 32, WARES.train);
    c.mob('training_dummy', 1, 54, 35); c.mob('training_dummy', 1, 59, 35);
    c.sign('Training Glade', 'The Training Glade. Talk to Master Aerendyl to train.', 57, 28);

    // Homes along the south avenue.
    const home = (x, y, door, who) => {
      c.building(x, y, 8, 6, { doors: [door] });
      if (who) c.npc(who);
      c.prop('bed', x + 1, y + 1);
      c.prop('chair', x + 5, y + 3);
    };
    home(23, 38, ['e', 2], { name: 'Lorien', look: 'Elf', desc: 'Lorien, a young elf with ink-stained fingers.', x: 26, y: 40, dlg: LORIEN });
    c.path([[31, 40], [32, 40]]);
    home(36, 38, ['w', 2], { name: 'Nimue', look: 'Elf Woman', desc: 'Nimue, who tends the city\'s gardens.', x: 39, y: 40, dlg: NIMUE });
    c.path([[34, 40], [35, 40]]);
    home(23, 44, ['e', 2]);
    c.path([[31, 46], [32, 46]]);
    home(36, 44, ['w', 2]);
    c.path([[34, 46], [35, 46]]);

    // Gardens and a few trees along the avenues.
    // Golden groves.
    c.oval(10, 38, 9, 5, 'Y');
    c.oval(47, 38, 9, 5, 'Y');
    c.set(14, 40, ','); c.set(51, 40, ',');
    for (const [x, y] of [[29, 4], [37, 4], [29, 50], [37, 50]]) c.set(x, y, 'T');
    c.prop('well', 14, 40); c.prop('well', 51, 40);

    // Guards at the gates, and the city's name outside each.
    c.npc({ name: 'Elf Guard', look: null, x: 32, y: 2, dlg: GUARD });
    c.prop('Elf Guard', 34, 51);
    c.prop('Elf Guard', 2, 26);
    c.prop('Elf Guard', 63, 28);
    // Dark elves aren't let through the gates (gods walk anywhere).
    const noDarkElves = { kind: 'norace', flag: 'darkelf', speaker: 'Elf Guard', verb: 'shouts', says: 'Halt! No dark elf passes the gates of Aelindor. Turn back to your caves.' };
    for (const x of [32, 33, 34]) { p.walk(CITY.x + x, CITY.y + 1, noDarkElves); p.walk(CITY.x + x, CITY.y + 52, noDarkElves); }
    for (const y of [26, 27, 28]) { p.walk(CITY.x + 1, CITY.y + y, noDarkElves); p.walk(CITY.x + 64, CITY.y + y, noDarkElves); }
    const welcome = 'Aelindor, city of the elves. Be welcome under the trees.';
    c.sign('Aelindor', welcome, 34, -1);
    c.sign('Aelindor', welcome, 32, 54);
    c.sign('Aelindor', welcome, -1, 26);
    c.sign('Aelindor', welcome, 66, 28);

    // The road north to the lake shore, and short roads out of the other gates.
    p.path([[CITY.x + 33, CITY.y - 1], [CITY.x + 33, 14], [21, 14], [21, 8]]);
    p.fill(17, 6, 9, 2, '_');
    c.path([[33, 54], [33, 60]]);
    c.path([[-1, 27], [-12, 27]]);
    c.path([[66, 27], [78, 27]]);
  },
};
