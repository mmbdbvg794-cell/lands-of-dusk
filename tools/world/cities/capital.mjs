import { captain } from './ferry.mjs';

// Kingshaven, the human capital (the new lands' west coast, where flan's
// world map note "Human Capital" is, about the size of the City of Light):
// a walled city packed with streets and buildings, a harbour quay with
// piers along the south shore, and the sprawl outside the walls: farms to
// the north, a hamlet past the east gate, a fishing quarter down the
// south-east shore. Built by tools/world/city.mjs.
//
// Inside the walls (x 1388-1485, y 320-397), a grid of streets: the royal
// keep and the cathedral in the north, the grand plaza where the avenues
// cross, the market, the shops, the bank and the guilds round it, three
// inns and three taverns, the barracks, Lantern Row's houses to rent
// (server/Housing.java: "rent" in the landlord's talk), and row houses.
//
// Everything is placed in map coordinates (A() turns them into the plan's).

const NAME = 'Kingshaven';
const O = [1376, 292];
const A = (x, y) => [x - O[0], y - O[1]];

// The walls and the street grid.
const W = { x0: 1388, x1: 1485, y0: 320, y1: 397 };
const AVE_X = [1435, 1437]; // the north-south avenue (3 wide)
const AVE_Y = [357, 359]; // the east-west avenue (3 wide)
const ST_X = [[1410, 1411], [1460, 1461]]; // side streets, 2 wide
const ST_Y = [[338, 339], [377, 378]];

// A tiny random number generator, so the same plan always makes the same city.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296);
}

// ---- who says what ----

const says = (text, answers = []) => ({ says: text, answers });
const always = (text, answers = []) => ({ when: { kind: 'always', value: '' }, ...says(text, answers) });
const talk = (text, answers = [], shouts = []) => ({ shouts, stages: [always(text, answers)] });
const ask = (label, reply) => ({ label, reply, effects: [] });
const bye = ask('Farewell', 'Go well.');

const DIRECTIONS = 'The keep is to the north-west, the cathedral to the north-east, and the grand plaza where the avenues cross. Shops and the bank are round the plaza, the market south-west of it, the inns and taverns all over, and the harbour through the south gate.';

// Lord Steward Halvard governs in Princess Elowen's name, beside her empty
// chair in the keep (LORE.md: King Aldric stayed behind and is gone). Once
// the player has brought Elowen's letter home (ft_word_done), he has read
// it too. Exported for tools/server/canon_cleanup.mjs.
export const HALVARD = 'Lord Steward Halvard';
export const HALVARD_DESC = 'Lord Steward Halvard, grey and tired, in a plain dark coat. He stands beside the throne, not on it.';
const HALVARD_ANSWERS = [
  ask('Whose chair is that?', 'Princess Elowen\'s. Her father sent her on the last ship. We have kept it for her forty years.'),
  ask('And King Aldric?', 'Ships still come from Westsea, and none of them carry word of him. Dead, some say. I say I do not know, and I will not pretend to.'),
  ask('What news?', 'The new lands are full of wonders and teeth. We need brave souls. Speak to Captain Merrow at the barracks if you would serve.'),
  ask('Tell me of the city', DIRECTIONS),
  bye];
export const HALVARD_DLG = { shouts: [], stages: [
  { when: { kind: 'flag', value: 'ft_word_done' }, says: 'Wenna showed me the letter. \'Keep the people warm.\' I suppose that is my work now.', answers: HALVARD_ANSWERS },
  always(`Welcome to the keep. I am Halvard, steward of ${NAME}. I govern in the princess's name, until she comes.`, HALVARD_ANSWERS)] };

const SHOP = (shout, text, extra = []) => talk(text, [...extra, bye], shout ? [shout] : []);

const TOWNSFOLK_LINES = [
  'They say the steward hasn\'t slept since the ships stopped bringing word of the king.',
  'Mind your purse near the harbour. Not everyone at the docks is a sailor.',
  'The cathedral bells woke me again. Every morning, the same three notes.',
  'My brother went east past the mountains to find gold. He found a lizardman instead.',
  'Have you tried the stew at the Crown and Anchor? Don\'t. Have the bread.',
  'Lantern Row has houses to let, if you\'re staying. The landlord drives a hard bargain.',
  'The market\'s best before noon, when the fish is still fresh.',
  'My grandmother says there was nothing on this shore when the ships came. Now look at it.',
  'The guards are stricter since the trouble in the old world. Keep your sword sheathed.',
  'There\'s a man at the Rusty Tankard who swears he\'s seen the Underdark. Drink makes liars of us all.',
  'If you\'re after a fight, the barracks yard lets anyone strike the dummies.',
  'The bank keeps your gold safe, and a box for your things, too. Same box at every bank, they say.',
  'Ships come in from Westsea and the elven landing. You can smell the tar from here.',
  'My roof leaks. The landlord says it\'s "character".',
  'The jeweller on the plaza buys nothing and sells everything. Typical.',
  'Children play in the fountain when the guards aren\'t looking. I did, too.',
  'I\'ve lived on this street forty years and I still get lost in the alleys.',
  'The Drunken Dragon has the best ale and the worst songs.',
  'Watch for the night watch. They carry lanterns, and grudges.',
  'Fresh bread, fresh fish, fresh gossip: that\'s Kingshaven.',
];
const FIRST = ['Aldric', 'Bess', 'Corwin', 'Delia', 'Emmet', 'Faye', 'Garth', 'Hester', 'Ivan', 'Joan', 'Kit', 'Lark', 'Milo', 'Nora', 'Odo', 'Prue', 'Reeve', 'Sable', 'Tobin', 'Una', 'Vane', 'Wilma', 'Yorick', 'Zelda', 'Ansel', 'Bree', 'Colm', 'Dot', 'Errol', 'Flora', 'Aldo', 'Bertha', 'Cedric', 'Dora', 'Edwin', 'Fenna', 'Godric', 'Hilda', 'Ivo', 'Jessa', 'Kurt', 'Lena', 'Marten', 'Nell', 'Osric', 'Pella', 'Quill', 'Rosa', 'Silas', 'Tilda', 'Ulric', 'Vera', 'Wendel', 'Yara', 'Bram', 'Clara', 'Dunstan', 'Elsa', 'Finn', 'Greta', 'Hugo', 'Ida'];
const TRADE = ['the cooper', 'the weaver', 'the baker', 'the fishwife', 'the carter', 'the chandler', 'the mason', 'the tanner', 'the scribe', 'the lamplighter', 'the washerwoman', 'the porter', 'the potter', 'the net-mender', 'the clerk', 'the midwife'];
const MALE_LOOKS = ['Villager Man', 'Villager'];
const FEMALE_LOOKS = ['Villager Woman', 'Woman', 'pretty girl'];
const FEMALE = new Set(['Bess', 'Delia', 'Faye', 'Hester', 'Joan', 'Lark', 'Nora', 'Prue', 'Sable', 'Una', 'Wilma', 'Zelda', 'Bree', 'Dot', 'Flora', 'Bertha', 'Dora', 'Fenna', 'Hilda', 'Jessa', 'Lena', 'Nell', 'Pella', 'Rosa', 'Tilda', 'Vera', 'Yara', 'Clara', 'Elsa', 'Greta', 'Ida']);

const WARES = {
  weapons: ['dagger', 'short sword', 'broad sword', 'long sword', 'iron sword', 'bronze sword', 'war axe', 'heavy axe', 'expert sword', 'burn blade', 'crystal sword'],
  armour: ['leather cap', 'leather jerkin', 'leather sleeves', 'leather leggings', 'leather gloves', 'leather belt', 'bronze_helmet', 'bronze_suit', 'bronze_sleeves', 'bronze_leggings', 'bronze_gloves', 'bronze_belt', 'leather shield'],
  royal: ['silver_helmet', 'silver_suit', 'silver_sleeves', 'silver_leggings', 'silver_gloves', 'silver_belt', 'gold_helmet', 'gold_suit', 'gold_sleeves', 'gold_leggings', 'gold_gloves', 'gold_belt', 'platinum_suit', 'steel plate mail', 'bronze shield', 'iron shield'],
  bows: ['cheap bow', 'wooden crossbow', 'arrow', 'quiver', 'celestial arrow'],
  potions: ['minor potion', 'minor mana potion', 'tiny potion', 'x-potion', 'anti-curse potion', 'red potion', 'green potion', 'blue potion', 'lavendar', 'mandrake', 'mushroom'],
  jewels: ['opal', 'ruby', 'topaz', 'aquamarine', 'chaotic amulet', 'pyramid studded necklace', 'goggles', 'crystal lens'],
  magic: ['spell book', 'book', 'wizards cloak', 'wizards gauntlets', 'minor mana potion', 'crystal lens'],
  general: ['water', 'ale', 'apple', 'sandwich', 'crisps', 'small bag', 'large bag', 'lumberjack axe', 'quarter staff', 'leather pants'],
  tailor: ['cloth shirt', 'leather jerkin', 'leather vest', 'leather pants', 'leather cap', 'leather belt', 'wizards cloak', 'sash'],
  food: ['water', 'ale', 'apple', 'sandwich', 'crisps'],
  fish: ['water', 'sandwich', 'crisps', 'apple'],
  train: ['train:Strength', 'train:Intelligence', 'train:Dexterity', 'train:Constitution', 'train:Wisdom', 'train:HP', 'train:MP', 'train:Dodge', 'train:Regeneration', 'train:Mana Regen', 'train:Spell Power'],
  docks: ['water', 'ale', 'small bag', 'large bag', 'lumberjack axe', 'leather pants', 'leather gloves'],
};

// A bed at an inn: a night's sleep for a few coins (walked onto).
const innBed = (inn, price) => `#A bed at ${inn}, in ${NAME} (tools/world/cities/capital.mjs).
if < trigger cash ${price}
	chat trigger " A bed at ${inn} is ${price} gold. Come back when you have it."
	endscript
end
inc trigger cash - 0 ${price}
set trigger hp trigger maxhp
set trigger mp trigger maxmp
chat trigger " You pay ${price} gold for a bed at ${inn} and sleep soundly. You wake refreshed."
endscript
`;
// The bed in a rented house: free, for whoever has the key.
const HOME_BED = `#The bed in a rented house on Lantern Row (only its tenant gets in).
set trigger hp trigger maxhp
set trigger mp trigger maxmp
chat trigger " You sleep in your own bed and wake refreshed."
endscript
`;
// The cathedral's altar: a blessing for a donation.
const BLESSING = `#The altar of the Cathedral of Light, in ${NAME}.
if < trigger cash 25
	chat trigger " A priest whispers: A blessing asks a donation of 25 gold."
	endscript
end
inc trigger cash - 0 25
set trigger hp trigger maxhp
set trigger mp trigger maxmp
chat trigger " You kneel at the altar and give 25 gold. Warm light fills you: you are healed."
endscript
`;

export default {
  name: NAME,
  origin: O,
  size: [140, 152],
  seed: 61,
  // Grass, meadow, trees, sand and the sea (for the piers); never rock.
  mayBuild: (t) => [1, 36, 37, 38, 39, 27, 40, 64, 103, 102, 124, 25, 26, 0, 65].includes(t) || (t >= 66 && t <= 89),
  copies: [
    { from: 'talk/Bank Teller', to: 'talk/Royal Teller', replace: [['Bank Teller says', 'Royal Teller says']] },
  ],
  build(p) {
    const r = rng(61);
    const pick = (list) => list[Math.floor(r() * list.length)];
    const F = (x, y, w, h, ch) => p.fill(...A(x, y), w, h, ch);
    const S = (x, y, ch) => p.set(...A(x, y), ch);
    const B = (x, y, w, h, opts) => p.building(...A(x, y), w, h, opts);
    const PR = (name, x, y) => p.prop(name, ...A(x, y));
    const SIGN = (name, text, x, y) => p.sign(name, text, ...A(x, y));
    const MER = (x, y, wares) => p.merchant(...A(x, y), wares);
    const NPC = (n) => p.npc({ ...n, x: n.x - O[0], y: n.y - O[1] });
    const PATH = (pts, ch) => p.path(pts.map(([x, y]) => A(x, y)), ch);
    const WALK = (x, y, rule) => p.walk(...A(x, y), rule);
    const ACT = (x, y, script) => p.file(`defMoveActions/${x}_${y}`, script);
    const used = new Set();
    let folk = 0;
    // Someone who lives here, with a line of their own.
    const townsperson = (x, y) => {
      const free = FIRST.filter((f) => !used.has(f));
      if (!free.length) return; // everyone has a home already
      const first = free[Math.floor(r() * free.length)];
      used.add(first);
      const look = FEMALE.has(first) ? pick(FEMALE_LOOKS) : pick(MALE_LOOKS);
      NPC({ name: `${first} of ${NAME}`, look, desc: `${first} ${pick(TRADE)}, of ${NAME}.`, x, y, dlg: talk(TOWNSFOLK_LINES[folk++ % TOWNSFOLK_LINES.length]) });
    };

    // ---- ground ----

    // The city's floor: cobbles everywhere inside the walls, then streets
    // and buildings over it.
    F(W.x0, W.y0, W.x1 - W.x0 + 1, W.y1 - W.y0 + 1, 'k');
    // The walls, two thick, with towers at the corners and halfway along.
    F(W.x0, W.y0, W.x1 - W.x0 + 1, 2, 'S'); F(W.x0, W.y1 - 1, W.x1 - W.x0 + 1, 2, 'S');
    F(W.x0, W.y0, 2, W.y1 - W.y0 + 1, 'S'); F(W.x1 - 1, W.y0, 2, W.y1 - W.y0 + 1, 'S');
    for (const [x, y] of [[W.x0, W.y0], [W.x1 - 3, W.y0], [W.x0, W.y1 - 3], [W.x1 - 3, W.y1 - 3], [1424, W.y0], [1446, W.y0], [W.x0, 340], [W.x0, 375], [W.x1 - 3, 340], [W.x1 - 3, 375], [1404, W.y1 - 3], [1466, W.y1 - 3]]) F(x, y, 4, 4, 's');
    // The avenues and the gates through the walls.
    F(AVE_X[0], W.y0, 3, W.y1 - W.y0 + 1, 'o');
    F(W.x0, AVE_Y[0], W.x1 - W.x0 + 1, 3, 'o');
    // Side streets.
    for (const [a, b] of ST_X) F(a, W.y0 + 2, b - a + 1, W.y1 - W.y0 - 3, 'e');
    for (const [a, b] of ST_Y) F(W.x0 + 2, a, W.x1 - W.x0 - 3, b - a + 1, 'e');
    // A street round the inside of the walls.
    F(W.x0 + 2, W.y0 + 2, W.x1 - W.x0 - 3, 1, 'e'); F(W.x0 + 2, W.y1 - 2, W.x1 - W.x0 - 3, 1, 'e');
    F(W.x0 + 2, W.y0 + 2, 1, W.y1 - W.y0 - 3, 'e'); F(W.x1 - 2, W.y0 + 2, 1, W.y1 - W.y0 - 3, 'e');

    // ---- the grand plaza ----
    F(1424, 347, 25, 23, 'o');
    p.oval(...A(1430, 352), 13, 13, 'm');
    p.oval(...A(1433, 355), 7, 7, '~');
    S(1436, 358, 'c'); // the fountain's spout
    for (const [x, y] of [[1426, 349], [1446, 349], [1426, 367], [1446, 367]]) PR('Flower Box', x, y);
    PR('statue', 1436, 349);
    PR('newsboard', 1434, 347);
    SIGN('Grand Plaza', `The Grand Plaza of ${NAME}. ${DIRECTIONS}`, 1438, 347);

    // ---- the royal keep (north-west) ----
    F(1392, 324, 43, 13, ','); // its courtyard garden
    B(1396, 325, 34, 11, { wall: 'S', floor: 'M', doors: [['s', 17]] });
    F(1399, 329, 28, 1, 't'); // the red runner to the throne
    F(1399, 327, 2, 5, 'S'); F(1425, 327, 2, 5, 'S'); // pillars
    PR('Throne', 1413, 327);
    NPC({ name: HALVARD, look: 'Villager Man', desc: HALVARD_DESC, x: 1413, y: 328, dlg: HALVARD_DLG });
    NPC({ name: 'Royal Guard', look: 'Guard', desc: 'A royal guard in a blue tabard, halberd planted.', x: 1411, y: 328, dlg: talk('The chair is the princess\'s. Bow to it, or keep your distance.') });
    PR('Guard', 1415, 328);
    for (const x of [1400, 1405, 1420, 1425]) PR('candlestick stand', x, 333);
    PR('plants', 1397, 326); PR('plants', 1428, 326);
    SIGN('The Royal Keep', `The Royal Keep of ${NAME}. King Aldric holds court within.`, 1414, 337);
    PR('well', 1394, 326); PR('Flower Box', 1394, 334); PR('Flower Box', 1432, 334);

    // ---- the Cathedral of Light (north-east) ----
    B(1442, 324, 37, 13, { wall: 'S', floor: 'l', doors: [['s', 18]] });
    F(1458, 326, 5, 3, 'c'); // the altar
    F(1449, 330, 23, 1, 't');
    for (let x = 1446; x <= 1474; x += 4) { PR('chair', x, 332); PR('chair', x, 334); }
    PR('statue', 1460, 325); PR('candlestick stand', 1456, 326); PR('candlestick stand', 1464, 326);
    NPC({ name: 'High Priestess Maren', look: 'Woman', desc: 'High Priestess Maren, in white and gold.', x: 1460, y: 328,
      dlg: talk('The Light keeps all who ask. Kneel at the altar before me and give what you can: twenty-five gold, and the Light will heal you.', [ask('Tell me of the Light', 'It burned in the old world before the cities, and it burns here. Some say the elves\' Moonwell is its sister.'), bye], ['Peace be on you, child.']) });
    ACT(1460, 329, BLESSING);
    SIGN('Cathedral of Light', 'The Cathedral of Light. A blessing heals for a donation: kneel at the altar.', 1461, 337);

    // ---- shops: a counter, its keeper behind it, its shop square in front ----
    const shop = ({ x, y, w = 9, h = 7, door = 's', sign, text, who, wares, extra }) => {
      const dx = Math.floor(w / 2);
      B(x, y, w, h, { doors: [[door, dx]] });
      const cx = x + dx;
      if (door === 's') {
        F(x + 2, y + 2, w - 4, 1, '#');
        NPC({ ...who, x: cx, y: y + 1 });
        MER(cx, y + 3, wares);
        SIGN(sign, text, cx + 1, y + h);
      } else {
        F(x + 2, y + h - 3, w - 4, 1, '#');
        NPC({ ...who, x: cx, y: y + h - 2 });
        MER(cx, y + h - 4, wares);
        SIGN(sign, text, cx + 1, y - 1);
      }
      PR('sales list', x + 1, door === 's' ? y + 4 : y + 1);
      if (extra) extra(cx);
    };
    // North of the plaza: the shop row along the east-west side street.
    shop({ x: 1413, y: 340, door: 's', sign: 'Hammer and Anvil', text: 'Hammer and Anvil: blades and axes.', wares: WARES.weapons,
      who: { name: 'Brann the Smith', look: 'Villager Man', desc: 'Brann the smith, arms like oak boughs.', dlg: SHOP('Steel for sale! Good steel!', 'Swords and axes, forged here. Stand at my counter and open the Shop tab.', [ask('Anything special?', 'The crystal sword: brittle-looking, but it bites. For a price.')]) } });
    shop({ x: 1423, y: 340, door: 's', sign: 'The Iron Shell', text: 'The Iron Shell: armour for every purse.', wares: WARES.armour,
      who: { name: 'Gerda the Armourer', look: 'Villager Woman', desc: 'Gerda the armourer, a hammer at her belt.', dlg: SHOP('Armour! Leather and bronze!', 'Leather for the road, bronze for the fight. Stand at my counter and see the Shop tab.') } });
    shop({ x: 1440, y: 340, door: 's', sign: 'Royal Armoury', text: 'The Royal Armoury: silver, gold and plate.', wares: WARES.royal,
      who: { name: 'Armsmaster Doyle', look: 'Guard', desc: 'Armsmaster Doyle, keeper of the Royal Armoury.', dlg: SHOP('', 'Silver, gold and plate, fit for the king\'s own guard. Stand at the counter and open the Shop tab, if your purse is deep.') } });
    shop({ x: 1450, y: 340, door: 's', sign: 'Fletcher\'s', text: 'The Fletcher\'s: bows and arrows.', wares: WARES.bows,
      who: { name: 'Wynn the Fletcher', look: 'Villager', desc: 'Wynn the fletcher, feathers in her hair.', dlg: SHOP('Bows! Crossbows! Arrows by the quiver!', 'Bows and arrows, straight and true. Stand at my counter and look in the Shop tab.') } });
    // South of the plaza: alchemy, jewels, magic, the general store, the tailor.
    shop({ x: 1438, y: 368, door: 'n', sign: 'The Bubbling Flask', text: 'The Bubbling Flask: potions and herbs.', wares: WARES.potions,
      who: { name: 'Alchemist Pell', look: 'hermit', desc: 'Pell the alchemist, eyebrows singed.', dlg: SHOP('Potions! Cures for what ails you!', 'Potions for every hurt, and herbs to make your own. Stand at my counter and open the Shop tab.', [ask('Blue potion?', 'Heals body and mind both, all at once. Six thousand gold, and worth every coin in a pinch.')]) } });
    shop({ x: 1448, y: 368, door: 'n', sign: 'Gems of the Crown', text: 'Gems of the Crown: jewels and charms.', wares: WARES.jewels,
      who: { name: 'Jeweller Ansel', look: 'Villager Man', desc: 'Ansel the jeweller, a loupe in one eye.', dlg: SHOP('', 'Opals, rubies, and the rarer stones from the far shores. Stand at my counter and see the Shop tab.', [ask('Topaz?', 'Wurm-country stone. Summoners swear by it.')]) } });
    shop({ x: 1413, y: 368, door: 'n', sign: 'Tome and Wand', text: 'Tome and Wand: books, robes and the arcane.', wares: WARES.magic,
      who: { name: 'Magister Oswin', look: 'hermit', desc: 'Magister Oswin, robed in faded blue.', dlg: SHOP('', 'Books of spells, robes that hold a charm. Stand at my counter and open the Shop tab.') } });
    shop({ x: 1424, y: 368, door: 'n', sign: 'Cobb\'s Provisions', text: 'Cobb\'s Provisions: food, bags and tools.', wares: WARES.general,
      who: { name: 'Cobb the Grocer', look: 'cook', desc: 'Cobb the grocer, apron dusted with flour.', dlg: SHOP('Provisions! Everything for the road!', 'Food, water, bags and tools. Stand at my counter and see the Shop tab.') } });
    shop({ x: 1413, y: 360, door: 'n', sign: 'Needle and Thread', text: 'Needle and Thread: clothes and leather.', wares: WARES.tailor,
      who: { name: 'Corra the Tailor', look: 'Woman', desc: 'Corra the tailor, pins in her sleeve.', dlg: SHOP('', 'Shirts, vests and cloaks, made to last. Stand at my counter and open the Shop tab.') } });

    // ---- the bank (east of the plaza) ----
    // Brick: the painted stone wall looks like paving. A row clear of the
    // Fletcher's door (it stood on row 347 till 2026-10-06; the statue
    // there goes).
    F(1449, 347, 11, 1, 'k');
    B(1449, 348, 11, 9, { wall: 'B', floor: 'l', doors: [['w', 4]] });
    F(1455, 350, 1, 5, '#');
    NPC({ name: 'Royal Teller', look: null, x: 1457, y: 351 });
    p.file('defProps/Royal Teller', 'description\nThe Royal Teller, behind a counter of polished stone.\nimage\n5\nlook\nBank Teller\n.\n');
    p.file('talk/Royal Teller.greet', 'The Royal Bank of Kingshaven.\nYour gold is safe with the crown.\n');
    PR('statue', 1451, 349); PR('plants', 1451, 354);
    p.dropProp('statue', ...A(1451, 348));
    SIGN('Royal Bank', 'The Royal Bank: your gold and your deposit box, the same as at every bank.', 1449, 348);

    // ---- the market (south-west of the plaza) ----
    F(1412, 379, 23, 15, 'o');
    const stall = (x, y, who, wares, shout) => {
      F(x - 1, y, 3, 1, '#');
      NPC({ ...who, x, y: y - 1, dlg: SHOP(shout, who.line) });
      MER(x, y + 1, wares);
      PR('goods', x - 2, y - 1);
    };
    stall(1415, 382, { name: 'Fruit Seller Mabel', look: 'Villager Woman', desc: 'Mabel, with a barrow of apples.', line: 'Apples, crisp and red! Stand in front of my stall and open the Shop tab.' }, WARES.food, 'Apples! Fresh apples!');
    stall(1422, 382, { name: 'Baker Hollis', look: 'cook', desc: 'Hollis the baker, warm bread in a basket.', line: 'Sandwiches and loaves, still warm. Stand in front of my stall and see the Shop tab.' }, WARES.food, 'Fresh bread! Hot sandwiches!');
    stall(1429, 382, { name: 'Pedlar Jory', look: 'Villager', desc: 'Jory the pedlar, a tray of oddments round his neck.', line: 'Bags, axes, odds and ends. Stand in front of my stall and open the Shop tab.' }, WARES.general, 'Bargains! Bargains!');
    stall(1418, 389, { name: 'Herb Wife Agna', look: 'hermit', desc: 'Agna, bundles of herbs drying on her stall.', line: 'Herbs and simples. Stand in front of my stall and look in the Shop tab.' }, ['lavendar', 'mandrake', 'mushroom', 'minor potion', 'tiny potion'], 'Herbs! Simples!');
    stall(1426, 389, { name: 'Cloth Seller Rhea', look: 'Woman', desc: 'Rhea, bolts of cloth piled high.', line: 'Cloth for every season. Stand in front of my stall and open the Shop tab.' }, ['cloth shirt', 'sash', 'leather cap', 'leather belt'], '');
    PR('well', 1433, 386);
    SIGN('Market Square', 'The Market Square: food, cloth, herbs and bargains.', 1413, 380);

    // ---- inns: a counter, beds to sleep in for a few coins ----
    const inn = ({ x, y, w, h, door, name, text, keeper, price }) => {
      const dx = Math.floor(w / 2);
      B(x, y, w, h, { doors: [door] });
      const top = door[0] === 's';
      const cy = top ? y + 2 : y + h - 3;
      F(x + 2, cy, 5, 1, '#');
      NPC({ ...keeper, x: x + 4, y: top ? y + 1 : y + h - 2 });
      MER(x + 4, top ? cy + 1 : cy - 1, WARES.food);
      // Beds along the far side, each a night's sleep.
      const by = top ? y + h - 2 : y + 1;
      for (let bx = x + w - 2; bx >= x + w - 8 && bx > x + 7; bx -= 2) {
        PR('bed', bx, by);
        ACT(bx, by + (top ? -1 : 1), innBed(name, price));
      }
      for (const [tx, ty] of [[x + 2, y + Math.floor(h / 2)], [x + 4, y + Math.floor(h / 2)]]) PR('chair', tx, ty);
      SIGN(name, text, x + dx + 1, top ? y + h : y - 1);
    };
    inn({ x: 1441, y: 379, w: 18, h: 9, door: ['s', 9], name: 'the Crown and Anchor', text: 'The Crown and Anchor: food, drink and beds (20 gold a night). Walk onto a bed to sleep.', price: 20,
      keeper: { name: 'Innkeeper Hobb', look: 'innkeeper', desc: 'Hobb, keeper of the Crown and Anchor.', dlg: SHOP('Beds and suppers at the Crown and Anchor!', 'Welcome, welcome! Food and drink at the counter, Shop tab; and a bed\'s twenty gold, just walk onto one.') } });
    inn({ x: 1462, y: 340, w: 18, h: 9, door: ['s', 9], name: 'the Wayfarer\'s Rest', text: 'The Wayfarer\'s Rest: beds for travellers (15 gold a night). Walk onto a bed to sleep.', price: 15,
      keeper: { name: 'Innkeeper Sela', look: 'Villager Woman', desc: 'Sela, keeper of the Wayfarer\'s Rest.', dlg: SHOP('Rest your feet at the Wayfarer\'s!', 'Come from the east road? You look it. Food at the counter, and a bed\'s fifteen gold: walk onto one.') } });
    inn({ x: 1392, y: 360, w: 17, h: 9, door: ['n', 8], name: 'the Gilded Griffin', text: 'The Gilded Griffin: the finest beds in Kingshaven (40 gold a night). Walk onto a bed to sleep.', price: 40,
      keeper: { name: 'Innkeeper Lucan', look: 'innkeeper', desc: 'Lucan, the Griffin\'s elegant host.', dlg: SHOP('', 'The Griffin has the softest beds in the city, forty gold the night. Supper at the counter: open the Shop tab.') } });

    // ---- taverns ----
    const tavern = ({ x, y, w, h, door, name, text, keeper, patrons }) => {
      B(x, y, w, h, { doors: [door] });
      const top = door[0] === 's';
      const cy = top ? y + 2 : y + h - 3;
      F(x + 2, cy, w - 4, 1, '#');
      NPC({ ...keeper, x: x + 3, y: top ? y + 1 : y + h - 2 });
      MER(x + 3, top ? cy + 1 : cy - 1, ['ale', 'water', 'crisps', 'sandwich']);
      for (let tx = x + 2; tx < x + w - 2; tx += 3) { PR('chair', tx, top ? y + h - 2 : y + 1); }
      patrons.forEach((who, i) => NPC({ ...who, x: x + 5 + i * 3, y: top ? y + h - 3 : y + 2 }));
      SIGN(name, text, x + Math.floor(w / 2) + 1, top ? y + h : y - 1);
    };
    tavern({ x: 1413, y: 348, w: 10, h: 8, door: ['e', 4], name: 'The Rusty Tankard', text: 'The Rusty Tankard: ale and talk.',
      keeper: { name: 'Bartender Gus', look: 'Bar Tender', desc: 'Gus, wiping a tankard that will never be clean.', dlg: SHOP('Ale! Cold ale!', 'What\'ll it be? Stand at the bar and open the Shop tab.', [ask('Heard anything?', 'Fellow in the corner swears he\'s been to the Underdark. Buy him an ale and he\'ll tell you twice.')]) },
      patrons: [{ name: 'Old Sailor Wick', look: 'hermit', desc: 'Wick, an old sailor with one ear.', dlg: talk('I sailed with the Seahawk when she was new. Now she\'s a ferry. Now I\'m a drunk. We all come down in the world.') }] });
    tavern({ x: 1392, y: 379, w: 17, h: 8, door: ['n', 8], name: 'The Drunken Dragon', text: 'The Drunken Dragon: the best ale and the worst songs.',
      keeper: { name: 'Bartender Maud', look: 'Villager Woman', desc: 'Maud, who has thrown out bigger than you.', dlg: SHOP('Ale and song at the Dragon!', 'Ale\'s at the bar: open the Shop tab. Sing if you must. Fight and you\'re out.') },
      patrons: [{ name: 'Minstrel Fenwick', look: 'Villager', desc: 'Fenwick the minstrel, lute out of tune.', dlg: talk('Oh, the king had a crown and the crown had a king... no, wait. How does it go?') }, { name: 'Dockhand Bolt', look: 'Villager Man', desc: 'Bolt, a dockhand off his shift.', dlg: talk('Unloaded forty crates of eels today. Forty! Pour me another.') }] });

    // ---- the barracks and the training yard (south-east) ----
    B(1463, 349, 18, 8, { wall: 'S', doors: [['s', 9]] });
    for (let bx = 1465; bx <= 1478; bx += 3) PR('bunk', bx, 350);
    NPC({ name: 'Captain Merrow', look: 'Guard', desc: 'Captain Merrow of the city watch, scar across her chin.', x: 1471, y: 354,
      dlg: talk('The watch keeps the peace inside the walls; outside, it\'s every soul for themselves. Want to toughen up? Drillmaster Hask in the yard will train you, for gold.', [ask('Any work?', 'Lizards in the dunes, wolves in the hills, worse beyond. Eastreach always needs blades: take the ferry, see Warden Marr.'), bye]) });
    F(1463, 360, 18, 16, 'e');
    NPC({ name: 'Drillmaster Hask', look: 'Drill Sergeant', desc: 'Drillmaster Hask, voice like a gravel pit.', x: 1471, y: 362, dlg: SHOP('Lift those feet!', 'Strength, speed, toughness: I teach them all. Stand on the mark in front of me and open the Shop tab to train.') });
    MER(1471, 364, WARES.train);
    for (const [x, y] of [[1465, 368], [1469, 371], [1473, 368], [1477, 371]]) p.mob('training_dummy', 1, ...A(x, y));
    SIGN('Barracks', 'The Barracks of the City Watch, and its training yard.', 1472, 360);

    // ---- the guild halls ----
    B(1450, 360, 9, 7, { doors: [['n', 4]] });
    NPC({ name: 'Guildmaster Ingrid', look: 'Woman', desc: 'Ingrid of the Mages\' Guild, ink on her fingers.', x: 1454, y: 364, dlg: talk('The Mages\' Guild. We study what others fear. The Tome and Wand on the plaza sells our books.') });
    PR('candlestick stand', 1452, 362); PR('candlestick stand', 1456, 362);
    SIGN('Mages\' Guild', 'The Mages\' Guild of Kingshaven.', 1455, 359);
    B(1462, 379, 13, 7, { wall: 'B', doors: [['n', 6]] });
    NPC({ name: 'Guildmaster Torvald', look: 'Villager Man', desc: 'Torvald of the Warriors\' Guild, a greatsword on his back.', x: 1468, y: 383, dlg: talk('The Warriors\' Guild. Strength is earned, never bought... though Hask at the barracks will sell you some.') });
    PR('sword', 1464, 384); PR('sword', 1472, 384);
    SIGN('Warriors\' Guild', 'The Warriors\' Guild of Kingshaven.', 1469, 378);

    // ---- Lantern Row: houses to rent (server/Housing.java) ----
    // Two rows of five small houses along a lane, west of the plaza, the
    // landlord at the lane's east end.
    const HOUSES = [];
    const house = (id, x, y, door) => {
      B(x, y, 5, 6, { doors: [door] });
      const doorX = x + (door[0] === 's' || door[0] === 'n' ? door[1] : door[0] === 'e' ? 4 : 0);
      const doorY = y + (door[0] === 's' ? 5 : door[0] === 'n' ? 0 : door[1]);
      const flag = `house_${id}`;
      WALK(doorX, doorY, { kind: 'flag', flag, speaker: '', verb: 'says', says: `The door of house ${id} is locked. Lantern Row's houses are let by Landlord Crake, at the lane's east end.` });
      const bedY = door[0] === 's' ? y + 1 : y + 4;
      PR('bed', x + 1, bedY);
      ACT(x + 2, bedY, HOME_BED);
      PR('chair', x + 3, door[0] === 's' ? y + 3 : y + 2);
      HOUSES.push({ id, x: doorX, y: doorY });
    };
    for (let i = 0; i < 5; i++) house(i + 1, 1392 + i * 4, 340, ['s', 2]);
    F(1392, 346, 18, 2, 'e'); // the lane
    for (let i = 0; i < 5; i++) house(i + 6, 1392 + i * 4, 348, ['n', 2]);
    NPC({ name: 'Landlord Crake', look: 'Villager Man', desc: 'Crake, landlord of Lantern Row, keys jangling at his belt.', x: 1409, y: 346,
      dlg: {
        shouts: ['Houses to let on Lantern Row!'],
        stages: [always('Lantern Row\'s houses: a bed of your own and a door only you can open. Three hundred gold for a week, and you can renew before it runs out.', [
          { label: 'Rent a house', reply: '', effects: [{ kind: 'rent', what: 'rent' }] },
          { label: 'Which is mine?', reply: '', effects: [{ kind: 'rent', what: 'info' }] },
          bye,
        ])],
      } });
    SIGN('Lantern Row', 'Lantern Row: houses to let, by the week. See Landlord Crake.', 1409, 347);
    p.file('housing', `#Lantern Row's houses (server/Housing.java): id|door x|door y|price|days\n${HOUSES.map((h) => `${h.id}|${h.x}|${h.y}|300|7`).join('\n')}\n`);
    for (const h of HOUSES) p.journalLine(`house_${h.id}`, 'A House on Lantern Row', `I rent house ${h.id} on Lantern Row in Kingshaven (its door is at ${h.x}, ${h.y}). Landlord Crake renews it.`);

    // ---- row houses: every block left over, packed with homes ----
    // A house: walls, a door onto the street, a bed and a chair; some lived in.
    const home = (x, y, w, h, door, lived) => {
      B(x, y, w, h, { doors: [door] });
      const inY = door[0] === 's' ? y + 1 : y + h - 2;
      PR('bed', x + 1, inY);
      if (w > 4) PR('chair', x + w - 2, inY);
      if (lived) townsperson(x + Math.floor(w / 2), door[0] === 's' ? y + h - 2 : y + 1);
    };
    // A row of houses between x0 and x1, y to y+h-1, doors one way.
    const row = (x0, x1, y, h, door) => {
      let x = x0;
      while (x + 4 <= x1) {
        const w = Math.min(x1 - x + 1, 5 + Math.floor(r() * 4));
        if (w < 4) break;
        home(x, y, w, h, [door, Math.floor(w / 2)], r() < 0.45);
        x += w - 1; // houses share a wall
      }
    };
    // South-west, between the Griffin and the Dragon, and south of the Dragon.
    row(1392, 1409, 370, 6, 'n');
    row(1392, 1409, 388, 6, 's');
    // South-east, by the harbour gate, below the warriors' guild.
    row(1462, 1481, 387, 7, 's');
    // East of the market, below the Crown and Anchor.
    row(1441, 1459, 389, 6, 's');
    // The north-east corner, beyond the cathedral.
    row(1479, 1483, 324, 6, 's');

    // ---- gates, guards and the city's name ----
    const guard = (x, y, line) => NPC({ name: `Gate Guard ${['North', 'South', 'West', 'East'][guard.n++]}`, look: 'Guard', desc: 'A guard of the city watch.', x, y, dlg: talk(line ?? DIRECTIONS, [bye], ['Welcome to Kingshaven!']) });
    guard.n = 0;
    guard(1434, 322);
    guard(1438, 395, `${DIRECTIONS} The harbour's through this gate: ferries, fish and the Salty Mermaid.`);
    guard(1391, 356);
    guard(1482, 356);
    const welcome = `${NAME}, the capital. Welcome, traveller.`;
    SIGN(NAME, welcome, 1439, 319);
    SIGN(NAME, welcome, 1434, 398);
    SIGN(NAME, welcome, 1387, 361);
    SIGN(NAME, welcome, 1486, 356);

    // ---- the harbour (outside the south gate) ----
    // The quay along the shore, planked over the beach.
    F(1386, 398, 60, 4, '=');
    F(1446, 398, 14, 6, '=');
    // Piers into the sea, three wide.
    for (const x of [1393, 1403, 1423]) F(x, 402, 3, 10, '=');
    // The middle pier runs out to deep water: the ferry pier (ferry.mjs),
    // its captain at the end, ships berthing either side.
    F(1413, 402, 3, 17, '=');
    NPC({ name: 'Captain Rowan', look: 'Villager Man', desc: 'Captain Rowan, the harbour\'s ferry captain, salt-white beard.', x: 1413, y: 417, dlg: captain('kingshaven', 'Ferries to Westsea Harbour and Eastreach! Fifty gold!') });
    SIGN('Kingshaven Ferry', 'The Kingshaven ferry pier. The Royal Swan sails to Westsea Harbour, the Gannet to Eastreach: buy a ticket from Captain Rowan and wait at the pier\'s end.', 1416, 403);
    F(1450, 404, 3, 9, '=');
    // Warehouses and the harbour's buildings, east of the gate.
    B(1440, 398, 7, 5, { doors: [['w', 2]] }); PR('Box', 1442, 399); PR('goods', 1444, 400); PR('junk', 1442, 401);
    B(1460, 398, 9, 7, { doors: [['w', 3]] });
    NPC({ name: 'Harbourmaster Quint', look: 'Villager Man', desc: 'Quint the harbourmaster, a ledger under his arm.', x: 1464, y: 401,
      dlg: talk('Every ship that ties up here pays its due to the crown. The ferries call at the long middle pier: the Royal Swan from Westsea, the Gannet from Eastreach. Captain Rowan sells the tickets.', [ask('What\'s down the shore?', 'The fishing quarter. Smells of fish because it is fish.'), bye]) });
    PR('sales list', 1462, 399);
    SIGN('Harbourmaster', 'The Harbourmaster of Kingshaven.', 1459, 402);
    // The Salty Mermaid, a dockside tavern.
    B(1469, 398, 12, 8, { doors: [['w', 4]] });
    F(1471, 400, 1, 4, '#');
    NPC({ name: 'Bartender Nan', look: 'Bar Tender', desc: 'Nan of the Salty Mermaid, salt in her hair.', x: 1470, y: 401, dlg: SHOP('Grog at the Mermaid!', 'Grog, ale and a dry seat. Stand at the bar and open the Shop tab.') });
    MER(1472, 401, ['ale', 'water', 'crisps']);
    PR('chair', 1475, 400); PR('chair', 1478, 400); PR('chair', 1475, 404); PR('chair', 1478, 404);
    NPC({ name: 'Captain Grizzle', look: 'hermit', desc: 'Grizzle, a captain without a ship.', x: 1476, y: 402, dlg: talk('Lost my ship to a squid the size of the cathedral. Nobody believes me. Do you believe me? Buy me a grog and you will.') });
    SIGN('The Salty Mermaid', 'The Salty Mermaid: grog and sea stories.', 1468, 397);
    // Fish market and the shipwright on the quay.
    F(1426, 398, 7, 1, '#');
    NPC({ name: 'Fishmonger Dell', look: 'Villager Woman', desc: 'Dell the fishmonger, arms to the elbow in eels.', x: 1429, y: 397, dlg: SHOP('Fresh fish! Eels! Crab!', 'The catch of the day... or of yesterday. Stand in front of my stall and open the Shop tab.') });
    MER(1429, 399, WARES.fish);
    PR('food', 1427, 397); PR('food', 1431, 397);
    NPC({ name: 'Shipwright Bodil', look: 'Villager Man', desc: 'Bodil the shipwright, sawdust in his beard.', x: 1398, y: 400, dlg: talk('I build boats. Fishing boats, mostly. A ferry, one day, when the crown pays.') });
    PR('Box', 1396, 399); PR('Box', 1400, 399);
    NPC({ name: 'Dockhand Sully', look: 'Villager', desc: 'Sully, a dockhand coiling rope.', x: 1414, y: 405, dlg: talk('Mind the edge. Fell in once. The eels were very understanding.') });
    NPC({ name: 'Chandler Brisk', look: 'Woman', desc: 'Brisk the chandler, selling to sailors.', x: 1408, y: 399, dlg: SHOP('Supplies for sailors!', 'Rope, bags, tools for the voyage. Stand in front of my crates and open the Shop tab.') });
    MER(1408, 400, WARES.docks);
    // The west landing: a short pier from the west gate.
    PATH([[1387, 358], [1384, 358]], '.');
    F(1376, 357, 8, 3, '=');

    // ---- the fishing quarter (down the south-east shore) ----
    const hut = (x, y, door, who) => {
      B(x, y, 6, 5, { doors: [door] });
      PR('bed', x + 1, y + 1);
      if (who) NPC({ ...who, x: x + 3, y: y + 2 });
    };
    hut(1452, 408, ['s', 3], { name: 'Old Fisher Tam', look: 'hermit', desc: 'Tam, mending nets on his doorstep.', dlg: talk('Fifty years I\'ve fished this shore. The fish get smaller and the stories get bigger.') });
    hut(1459, 411, ['s', 3]);
    hut(1466, 414, ['s', 3], { name: 'Netmaker Ilse', look: 'Villager Woman', desc: 'Ilse the netmaker.', dlg: talk('A good net catches fish. A great net catches gossip.') });
    hut(1472, 419, ['w', 2]);
    F(1462, 418, 3, 6, '=');
    PR('goods', 1457, 409); PR('junk', 1470, 417);
    PATH([[1449, 406], [1478, 406], [1478, 417]], '.');

    // ---- the sprawl: farms to the north, a hamlet past the east gate ----
    PATH([[1436, 319], [1436, 301], [1400, 301]], '.');
    const farm = (x, y, who) => {
      B(x, y, 7, 5, { wall: 'W', doors: [['s', 3]] });
      PR('bed', x + 1, y + 1); PR('chair', x + 5, y + 1);
      if (who) NPC({ ...who, x: x + 3, y: y + 2 });
      for (let fy = y + 6; fy < y + 12; fy += 2) F(x - 2, fy, 11, 1, 'e');
    };
    farm(1392, 296, { name: 'Farmer Hollin', look: 'Villager Man', desc: 'Hollin, a farmer with mud to the knees.', dlg: talk('The city eats what I grow and complains about the price. Every year.') });
    farm(1408, 304, { name: 'Farmer Joss', look: 'Villager', desc: 'Joss, leaning on a hoe.', dlg: talk('Wolves took two sheep last week. The watch says it\'s outside the walls, not their trouble.') });
    farm(1420, 296);
    PATH([[1486, 358], [1510, 358]], '.');
    hut(1490, 350, ['s', 3], { name: 'Waggoner Pim', look: 'Villager Man', desc: 'Pim, who drives the east road.', dlg: talk('The east road goes on and on, and then there are mountains, and then there are worse things.') });
    hut(1499, 350, ['s', 3]);
    hut(1494, 362, ['n', 3], { name: 'Smith\'s Widow Orla', look: 'Woman', desc: 'Orla, who keeps the roadside forge cold now.', dlg: talk('My husband shod every horse on this road. Now the horses go barefoot and so do I.') });
    hut(1503, 362, ['n', 3]);
    hut(1508, 350, ['s', 3]);
    // Cottages along the north road, outside the gate.
    for (const [x, y, door] of [[1429, 306, ['e', 2]], [1429, 312, ['e', 2]], [1421, 312, ['e', 2]], [1408, 294, ['s', 3]], [1400, 312, ['n', 3]]]) {
      hut(x, y, door, r() < 0.5 ? null : undefined);
      if (r() < 0.6) townsperson(x + 3, y + 2);
    }

    // ---- infill: every open patch left inside the walls gets a house ----
    // A patch is all city floor ('k'), with no door next to it, and its own
    // door onto open floor or a street.
    const at = (x, y) => p.at(...A(x, y));
    const OPEN = new Set(['k', 'e', 'o', '.']);
    const DOOR = new Set(['D', '<', '>']);
    const free = (x, y, w, h) => {
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) {
        const c = at(i, j);
        const inside = i >= x && i < x + w && j >= y && j < y + h;
        if (inside && c !== 'k') return false;
        if (!inside && DOOR.has(c)) return false;
      }
      return true;
    };
    // Where a door can go: the middle of a side with open ground outside it.
    const doorFor = (x, y, w, h) => {
      const sides = [['s', Math.floor(w / 2), x + Math.floor(w / 2), y + h], ['n', Math.floor(w / 2), x + Math.floor(w / 2), y - 1],
        ['e', Math.floor(h / 2), x + w, y + Math.floor(h / 2)], ['w', Math.floor(h / 2), x - 1, y + Math.floor(h / 2)]];
      const ok = sides.find(([, , dx, dy]) => OPEN.has(at(dx, dy)));
      return ok ? [ok[0], ok[1]] : null;
    };
    for (let y = W.y0 + 3; y <= W.y1 - 8; y++) {
      for (let x = W.x0 + 3; x <= W.x1 - 8; x++) {
        for (const [w, h] of [[8, 6], [7, 6], [6, 5], [5, 5]]) {
          if (!free(x, y, w, h)) continue;
          const door = doorFor(x, y, w, h);
          if (!door) continue;
          home(x, y, w, h, door, r() < 0.5);
          break;
        }
      }
    }
  },
};
