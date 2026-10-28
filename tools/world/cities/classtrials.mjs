// Choosing a class at the end of a race tutorial, after trying each in its
// training yard (server/Classes.java "tutorial" and "trial" boxes).
//
// Each yard gets a trial keeper: pick a class and you are one, start, kit
// and spells, until you leave the yard (or pick another, or say enough).
// The keeper stands two squares from the yard's trainer, and speaks up as
// soon as the straw stuffing is handed in (keeperPrompt, a follow-up the
// trainer's hand-in answers carry); keepers don't shout at passers-by.
// Each tutorial's end stones (done and skipped) first ask anyone without a
// class to choose one ("class pick" opens the picker; once chosen, the
// server runs the stone again and it lets them through).
//
// The plans of the elf, dark elf and lizardfolk tutorials (grove.mjs,
// velkarath.mjs, hatchery.mjs) use these; the human tutorial has no plan,
// so classtrials-human.mjs places its keeper and
// tools/server/install_class_trials.py puts the gate on every live stone.

const CLASSCHOSEN = 'classchosen';
const tryIt = (id) => ({ kind: 'class', what: 'try', id });

// The end stone's first rule: no class yet, no way on.
export const classGate = (flag, says) => ({
  when: { kind: 'flag', value: flag },
  also: { kind: 'noflag', value: CLASSCHOSEN },
  speaker: '',
  says,
  effects: [{ kind: 'class', what: 'pick' }],
});

// A keeper's conversation: a greeting, then one answer per class.
// healer: the race's praying class ([id, label, how to heal]).
function keeperTalk({ greet, fighter, ranger, healer, paladin, how, enough, prompt, notNow }) {
  return {
    prompt,
    notNow,
    shouts: [],
    stages: [{
      when: { kind: 'always', value: '' },
      says: greet,
      answers: [
        { label: 'Fighter', reply: fighter, effects: [tryIt('fighter')] },
        { label: 'Ranger', reply: ranger, effects: [tryIt('ranger')] },
        { label: healer[1], reply: healer[2], effects: [tryIt(healer[0])] },
        { label: 'Paladin', reply: paladin, effects: [tryIt('paladin')] },
        { label: 'How does it work?', reply: how, effects: [] },
        { label: 'Enough', reply: enough, effects: [{ kind: 'class', what: 'end' }] },
      ],
    }],
  };
}

const HOW = 'While you stay in this yard, you are what you try: its skills, gear and magic. Step out and it all goes back. You choose for good at the end of your training.';

// Plan coordinates within each tutorial's plan (or, for the humans, the
// overlay's own origin).
export const KEEPERS = {
  human: {
    name: 'Veteran Maddock', look: 'Guard', x: 138, y: 376,
    desc: 'Veteran Maddock, who has marched beside every kind of soldier there is.',
    dlg: keeperTalk({
      prompt: 'Good work, recruit. Before you go, try a calling here in the yard?',
      notNow: 'Then on to the Quartermaster. I\'ll be here.',
      greet: 'Every kind of soldier has stood in this yard. Want to try one on?',
      fighter: 'Steel and stamina. Go and hit a dummy.',
      ranger: 'A bow and quick feet. Shoot from a few steps back.',
      healer: ['cleric', 'Cleric', 'Prayer. You look bruised: cast Mend from your Spellbook.'],
      paladin: 'Steel and prayer both. Hit something, then mend yourself.',
      how: HOW,
      enough: 'Back to plain recruit, then.',
    }),
  },
  elf: {
    name: 'Sentinel Aeris', look: 'Elf', x: 51, y: 11,
    desc: 'Sentinel Aeris, who has taught every calling of the wood.',
    dlg: keeperTalk({
      prompt: 'Well struck, little one. Before you go, try a calling here in the glade?',
      notNow: 'Then on to Merrin. I am here if you change your mind.',
      greet: 'Every calling of the wood has practised in this glade. Will you try one?',
      fighter: 'Blade and endurance. Strike a dummy.',
      ranger: 'Bow and swiftness. Shoot from a few steps back.',
      healer: ['cleric', 'Cleric', 'The Light. You look bruised: cast Mend from your Spellbook.'],
      paladin: 'Blade and Light both. Strike, then mend yourself.',
      how: HOW,
      enough: 'Only yourself again. That is no small thing.',
    }),
  },
  darkelf: {
    name: 'Weapons-Keeper Zhaun', look: 'Dark Elf Man', x: 49, y: 105,
    desc: 'Weapons-Keeper Zhaun, who has seen every kind of killer come out of this pit.',
    dlg: keeperTalk({
      prompt: 'Not bad, hatchling. Before you go, try a calling here in the pit?',
      notNow: 'Then on to the Provisioner. I\'ll be here.',
      greet: 'Every kind of killer the House breeds was made in this pit. Try one.',
      fighter: 'Steel. Cut a dummy open.',
      ranger: 'The bow. Shoot from a few steps back.',
      healer: ['priest', 'Priest', 'The Spider Queen\'s rites. You look bruised: cast Gloom Mend from your Spellbook.'],
      paladin: 'Steel and faith both. Strike, then mend yourself.',
      how: HOW,
      enough: 'Nothing but a hatchling again.',
    }),
  },
  lizardman: {
    name: 'Old Ssiv', look: 'lizardfolk', x: 51, y: 11,
    desc: 'Old Ssiv, grey-scaled, who has seen every kind of brood-guard hatch.',
    dlg: keeperTalk({
      prompt: 'Hsss, good. Before you go, try a calling here?',
      notNow: 'Then on to Mossa. I\'ll be here, hss.',
      greet: 'Every kind of brood-guard has hunted on this ground. Try one, hss?',
      fighter: 'Claw and steel. Tear into a dummy.',
      ranger: 'The bow. Shoot from a few steps back.',
      healer: ['cleric', 'Cleric', 'The warm Light. You look bruised: cast Mend from your Spellbook.'],
      paladin: 'Steel and Light both. Strike, then mend yourself.',
      how: HOW,
      enough: 'Only a hatchling again.',
    }),
  },
};

// The keeper in a plan's yard.
export function trialYard(p, race) {
  const k = KEEPERS[race];
  const { prompt, notNow, ...dlg } = k.dlg;
  p.npc({ name: k.name, look: k.look, desc: k.desc, x: k.x, y: k.y, dlg });
}

// The keeper speaking up after the trainer takes the straw stuffing: a
// follow-up for the hand-in answer, said by the keeper, with the keeper's
// classes to try (its answers, but "Not now" for "Enough"). keeperDlg is
// the keeper's own dialogue (live's, when there is one).
export function keeperPrompt(race, keeperDlg = KEEPERS[race].dlg) {
  const k = KEEPERS[race];
  const tries = (keeperDlg.stages?.[0]?.answers ?? []).filter((a) => a.label !== 'Enough');
  return {
    speaker: k.name,
    says: k.dlg.prompt,
    answers: [...structuredClone(tries), { label: 'Not now', reply: k.dlg.notNow, effects: [] }],
  };
}
