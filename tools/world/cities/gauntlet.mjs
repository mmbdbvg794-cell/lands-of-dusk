// "The Champions' Gauntlet", the far-south enclave's boss rooms (the old
// game's, which had no champions, no keys and no prize), rebuilt as a
// late-game trial, once per character:
//
//   37,966          from the town, into the top room (a sign beside it); 43,966
//                   inside leads back out
//   42,969 ...      down the east side, then west along the south edge: ten
//   ... 19,993      rooms, each with its champion, whose key opens the next door
//   the hall        (6-17, 989-993) the last champion; its one way in from the
//                   town, 6,988, only lets through who came by the rooms
//   25,984, 18,978  key 10 opens the village vault; the reward clerk gives the
//                   Champion's Blade, takes the keys back and names you
//                   Champion. Once: the champions can still be fought.
//
// Flags: gauntlet_on (inside, not yet champion), gauntlet_hall (reached the
// hall), Champion.

const TITLE = 'The Champions\' Gauntlet';
const head = (what) => `#${what} ("${TITLE}", tools/world/cities/gauntlet.mjs).\n`;

// The champions, weakest first, from the game's own creatures (the same
// pictures): [name, base stats, skills, room centre].
const CHAMPIONS = [
  ['Doom Knight Champion', { maxhp: 900, stre: 160, inte: 40, dext: 100, cons: 100, wisd: 50, image: 51 }, [['Dodge', 20], ['Double Attack', 70]], [41, 971]],
  ['Executioner Champion', { maxhp: 1000, stre: 250, inte: 100, dext: 100, cons: 150, wisd: 50, image: 3 }, [], [41, 976]],
  ['Devilkin Champion', { maxhp: 2000, stre: 130, inte: 100, dext: 120, cons: 100, wisd: 300, image: 34 }, [], [41, 981]],
  ['Wurm Champion', { maxhp: 2300, stre: 210, inte: 400, dext: 140, cons: 200, wisd: 400, image: 26 }, [['Double Attack', 100], ['Triple Attack', 40]], [41, 986]],
  ['Grinder Champion', { maxhp: 2500, stre: 150, inte: 30, dext: 180, cons: 100, wisd: 30, image: 20 }, [['Dodge', 100], ['Double Attack', 100], ['Triple Attack', 100]], [41, 991]],
  ['Skeleton Champion', { maxhp: 3000, stre: 200, inte: 100, dext: 200, cons: 200, wisd: 200, image: 32 }, [['Double Attack', 100]], [35, 991]],
  ['Dark Mage Champion', { maxhp: 3000, stre: 240, inte: 120, dext: 100, cons: 150, wisd: 100, image: 24 }, [], [30, 991]],
  ['Tree Wolf Champion', { maxhp: 3000, stre: 260, inte: 400, dext: 180, cons: 200, wisd: 400, image: 21 }, [['Double Attack', 100], ['Triple Attack', 50]], [25, 991]],
  ['Dark Knight Champion', { maxhp: 3000, stre: 300, inte: 700, dext: 400, cons: 900, wisd: 600, image: 52 }, [], [20, 991]],
  ['The Last Champion', { maxhp: 4500, stre: 380, inte: 700, dext: 450, cons: 900, wisd: 600, image: 52 }, [['Double Attack', 100]], [11, 991]],
];

const mobFile = (stats, skills, key) => [
  ...Object.entries(stats).flatMap(([k, v]) => [k, String(v)]),
  'bravery', '5.0', 'grouprelation', '0.0', 'faction', 'champion',
  ...skills.flatMap(([s, n]) => ['skill', s, String(n)]),
  'giveitem', key, '1.0',
  '.', '',
].join('\n');

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const keyFile = (n) => `type\nitem\ndescription\nthe key to the ${ORDINAL[n - 1]} champion's door of the Champions' Gauntlet\ncost\n0\nimage\n6\n.\n`;
const BLADE = 'type\nweapon\ndescription\nthe Champion\'s Blade, given to whoever beats all ten champions of the far-south gauntlet\ncost\n0\nmod\n900\nimage\n9\ndurability\n500000\n.\n';

const SEALED = (n) => `chat trigger " The door is sealed. The ${ORDINAL[n - 1]} champion holds its key."`;

// A door down the east side: through with the key, pushed back without.
const downDoor = (n) => head(`The door past the ${ORDINAL[n - 1]} champion`) + `if ! hasItem trigger "key${n}"
	${SEALED(n)}
	inc trigger locy -1
	endscript
end
endscript
`;
// A door along the south edge: into the next room west with the key.
const westDoor = (n, to, extra = '') => head(`The door past the ${ORDINAL[n - 1]} champion`) + `if ! hasItem trigger "key${n}"
	${SEALED(n)}
	endscript
end
${extra}set trigger locxy ${to[0]} ${to[1]}
endscript
`;

const ENTRANCE = head('The way in, from the town') + `if ! hasCondition trigger Champion
	addCondition trigger gauntlet_on
end
chat trigger " You step into the Champions' Gauntlet. Ten champions guard ten doors, and each holds the key to the next. Beat them all, and the village vault's prize is yours."
set trigger locxy 40 967
endscript
`;
const EXIT = head('The way out, from the top room') + `chat trigger " You leave the gauntlet."
set trigger locxy 36 966
endscript
`;
const FIRST = head('The first door') + `chat trigger " The first champion waits beyond this door."
endscript
`;
const VAULT = head('The village vault door') + `if ! hasItem trigger "key10"
	chat trigger " The vault door won't open. The last champion holds its key."
	inc trigger locy 1
	endscript
end
chat trigger " Welcome to the village vault, where champions claim their prize."
endscript
`;
const CLERK = head('The reward clerk') + `if hasCondition trigger Champion
	chat trigger " Reward Clerk: You've had your prize already, Champion."
	set trigger locxy 25 985
	endscript
end
if ! hasItem trigger "key10"
	chat trigger " Reward Clerk: What are you doing in here?"
	set trigger locxy 25 985
	endscript
end
giveItem trigger "champion's blade"
${Array.from({ length: 10 }, (_, i) => `removeItem trigger "key${i + 1}"`).join('\n')}
removeCondition trigger gauntlet_on
addCondition trigger Champion
chat trigger " Reward Clerk: All ten champions beaten! The village names you its Champion. This blade is yours: there is no finer."
set trigger locxy 25 985
endscript
`;

export default {
  name: TITLE,
  origin: [6, 965],
  size: [38, 29], // the enclave's south part, x 6-43, y 965-993
  oldWorld: true,
  mayBuild: () => false, // no squares change
  build(p) {
    CHAMPIONS.forEach(([name, stats, skills, at], i) => {
      p.file(`defMobs/${name}`, mobFile(stats, skills, `key${i + 1}`));
      p.mob(name, 1, at[0] - 6, at[1] - 965);
      p.file(`defItems/key${i + 1}`, keyFile(i + 1));
    });
    p.file('defItems/champion\'s blade', BLADE);
    p.file('defMoveActions/37_966', ENTRANCE);
    p.file('defMoveActions/43_966', EXIT);
    p.file('defMoveActions/42_969', FIRST);
    [974, 979, 984, 989].forEach((y, i) => p.file(`defMoveActions/42_${y}`, downDoor(i + 1)));
    p.file('defMoveActions/39_993', westDoor(5, [37, 993]));
    p.file('defMoveActions/34_993', westDoor(6, [32, 993]));
    p.file('defMoveActions/29_993', westDoor(7, [27, 993]));
    p.file('defMoveActions/24_993', westDoor(8, [22, 993]));
    p.file('defMoveActions/19_993', westDoor(9, [17, 993], 'addCondition trigger gauntlet_hall\nchat trigger " You enter the Champions\' Hall. The last champion waits."\n'));
    p.file('defMoveActions/25_984', VAULT);
    p.file('defMoveActions/18_978', CLERK);
    // The hall's one way in from the town: only for who came by the rooms.
    p.farWalk(6, 988, { kind: 'flag', flag: 'gauntlet_hall', speaker: '', verb: 'says', says: 'The way into the Champions\' Hall is barred from this side. Its champions are fought in order, from the gauntlet\'s door by the town\'s east wall.' });
    p.sign('Champions\' Gauntlet', 'The Champions\' Gauntlet', 36 - 6, 965 - 965);
    p.journalLine('gauntlet_on', TITLE, 'Ten champions guard ten doors in the far-south town, each holding the key to the next. Beat them all and claim the prize from the village vault.');
    p.journalLine('Champion', TITLE, 'I beat all ten champions and the village named me its Champion. The Champion\'s Blade is mine.', true);
    p.journalLine('gauntlet_hall', TITLE, 'I reached the Champions\' Hall. One champion left, then the village vault.');
  },
};
