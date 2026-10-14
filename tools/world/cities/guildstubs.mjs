// Placeholder guild invitations (schools pass 1, phase 3): two test NPCs
// in Kingshaven's plaza, east of Old Wenna, so joining a guild can be
// tested end to end before the real quest chains exist. Not story: each
// says plainly that it's a test, and invites only characters a god has
// marked with guild_tester ("guildflag <name> guild_tester on"), so
// players can't join early.
//
//   Mage Guild Envoy   1433, 353   sets guild_mage    (Fighters and Rangers)
//   Circle Envoy       1436, 353   sets guild_circle  (Rangers)
//
// Built by tools/world/city.mjs; nothing on the map changes.

const stub = (guild, flag, classes, who) => ({
  shouts: [],
  stages: [
    { when: { kind: 'flag', value: flag }, says: `(Test) You are already one of the ${guild}.`, answers: [] },
    { when: { kind: 'noflag', value: 'guild_tester' }, says: `(Test placeholder for the ${guild}'s invitation. Only characters a god has marked as testers are invited.)`, answers: [] },
    ...classes.length === 1
      ? [{ when: { kind: 'noflag', value: `class_${classes[0]}` }, says: `(Test) The ${guild} takes only ${who}.`, answers: [] }]
      : [{ when: { kind: 'noflag', value: `class_${classes[0]}` }, also: { kind: 'noflag', value: `class_${classes[1]}` }, says: `(Test) The ${guild} takes only ${who}.`, answers: [] }],
    { when: { kind: 'always', value: '' }, says: `(Test placeholder) The ${guild} invites you. Will you join?`,
      answers: [
        { label: 'Join', reply: `(Test) You are now one of the ${guild}.`, effects: [{ kind: 'flag', flag }] },
        { label: 'Not now', reply: '(Test) Come back when you are ready.', effects: [] },
      ] },
  ],
});

export default {
  name: 'Guild invitations (test stubs)',
  origin: [0, 0],
  size: [1, 1],
  seed: 1,
  mayBuild: () => false,
  build(p) {
    p.npc({ name: 'Mage Guild Envoy', look: 'Villager Woman', desc: 'A Mage Guild envoy (test placeholder for the Guild\'s invitation).', x: 1433, y: 353,
      dlg: stub('Mage Guild', 'guild_mage', ['fighter', 'ranger'], 'Fighters and Rangers') });
    p.npc({ name: 'Circle Envoy', look: 'hermit', desc: 'An envoy of The Circle (test placeholder for its invitation).', x: 1436, y: 353,
      dlg: stub('Circle', 'guild_circle', ['ranger'], 'Rangers') });
  },
};
