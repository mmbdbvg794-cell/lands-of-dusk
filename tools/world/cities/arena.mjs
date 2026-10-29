// The Duelling Ring: a fenced ring of sand in the meadow north-east of
// Kingshaven, reached by the lane from the east gate, where players duel
// (server/Duel.java: "duel <name>" with both standing on the sand; nobody
// loses anything). Built by tools/world/city.mjs.
//
//   the ring (fence)       1508-1522, 321-335; its sand 1509-1521, 322-334
//   the gate               1515, 335 (the loser is put just outside, 1515, 337,
//                          by conf/onDeath)
//   Ringmaster Corvin      1513, 337, outside the gate, who explains it
//
// Duel.java keeps the same squares (X0..Y1, SPOT_A/B, GATE).
//
// This plan also writes conf/canAttack (nobody joins a duel from outside)
// and conf/onDeath, the script the engine runs when a
// player dies: a duellist is put at the ring's gate, marked the loser
// (Duel.java gives back what the fight took); anyone else goes back to
// their race's city.

// conf/canAttack, checked before every attack (joining a fight too): not
// someone "safe" (just after dying), and nobody joins a duel from outside
// it (a duellist can be attacked only by someone who is duelling).
const CAN_ATTACK = `and
! hascondition attacked safe
or
! hascondition attacked dueling
hascondition attacking dueling
`;

const ON_DEATH = `#On death (written by tools/world/cities/arena.mjs).
#A duel (server/Duel.java): to the Duelling Ring's gate, marked the loser;
#Duel gives back the gold, experience and health the fight took.
if hasCondition trigger dueling
	addcondition trigger duellost
	set trigger locxy 1515 337
	set trigger hp 1
	endscript
end
#Anyone else: back to their race's city, with a little health, safe a
#moment. Everyone to Kingshaven (humans and anyone else), then elves to
#Aelindor, dark elves to Velkarath, lizardmen to Ssarakh.
set trigger locxy 1440 352
if isRace trigger elf
	set trigger locxy 473 1241
end
if isRace trigger darkelf
	set trigger locxy 1345 912
end
if isRace trigger lizardman
	set trigger locxy 1695 943
end
set trigger hp 5
addcondition trigger safe
endscript
`;

const O = [1508, 321];
const A = (x, y) => [x - O[0], y - O[1]];

const RINGMASTER = {
  shouts: ['Duels in the ring! Come and test yourself. Nobody loses a coin!'],
  stages: [{
    when: { kind: 'always', value: '' },
    says: 'Welcome to the Duelling Ring. Step onto the sand and type duel and a name. Nobody dies or loses a thing here. Type duel alone for your record.',
    answers: [
      { label: 'Who has won the most?', reply: 'Every win and loss is written on your profile, on the website. Win enough and they will know your name in Kingshaven.', effects: [] },
      { label: 'Thank you', reply: 'Fight fair. Or at least fight well.', effects: [] },
    ],
  }],
};

export default {
  name: 'Duelling Ring',
  origin: O,
  size: [15, 20],
  seed: 61,
  mayBuild: (t) => [1, 36, 37, 38].includes(t),
  build(p) {
    // The fence (wooden), the sand, and the gate on the south side.
    p.fill(0, 0, 15, 15, '#');
    p.fill(1, 1, 13, 13, '_');
    p.set(...A(1515, 335), '_');
    // A packed-earth apron outside the gate, and the lane south.
    p.fill(...A(1512, 336), 7, 2, 'e');
    p.path([A(1515, 338), A(1515, 340)]);
    for (const [x, y] of [[1510, 323], [1520, 323], [1510, 333], [1520, 333]]) p.prop('brazier', ...A(x, y));
    p.npc({ name: 'Ringmaster Corvin', look: 'Guard', desc: 'Ringmaster Corvin, broad and scarred, a whistle on a cord round his neck.', x: 1513 - O[0], y: 337 - O[1], dlg: RINGMASTER });
    p.sign('Duelling Ring', 'The Duelling Ring', ...A(1517, 337));
    // The flags Duel.java and conf/onDeath use.
    p.file('defConditions/dueling', 'nodisplay\n.\n');
    p.file('defConditions/duellost', 'nodisplay\n.\n');
    p.file('conf/onDeath', ON_DEATH);
    p.file('conf/canAttack', CAN_ATTACK);
  },
};
