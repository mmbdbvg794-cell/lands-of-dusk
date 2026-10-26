// A paid blessing at each town's priest (flan, 2026-10-26): all HP and MP
// back, for gold. tools/server/blessings_talk.mjs adds it to the live
// conversations; run it again after merging a quest into one of them
// (mergeQuest rebuilds quest stages without it). Running it twice changes
// nothing.
export const BLESSING_COST = 10; // a small donation (flan)

// name: [the blessing's reply, a farewell for stages that had no answers]
export const PRIESTS = {
  'High Priestess Maren': ['A small gift for the temple. Be whole again, in the Light\'s name.', 'Walk in the Light.'],
  'Priestess Ilsevel': ['A coin or two for the Moonwell. Water on your brow... there. Be whole.', 'Go gently.'],
  'Priestess Ilvra': ['Ten gold, an offering. The Spider Queen mends what is useful to her. Rise.', 'Go.'],
  'Shaman Ithrae': ['A little gold, for the pot. Hold still. Hsss. The river knows your shape. There.', 'Go well.'],
};

export const blessing = (reply) => ({
  label: 'Blessing', reply, needs: { kind: 'gold', value: BLESSING_COST },
  effects: [{ kind: 'takegold', amount: BLESSING_COST }, { kind: 'heal' }],
});

// The blessing on every stage that ends the talk or offers topics with a
// farewell; not on a quest's yes/no question. One already there is made
// again (a new price or line).
export function addBlessing(dlg, name) {
  const [reply, bye] = PRIESTS[name];
  for (const st of dlg.stages) {
    const answers = st.answers ?? [];
    const had = answers.findIndex((a) => a.label === 'Blessing');
    if (had >= 0) {
      answers[had] = blessing(reply);
      continue;
    }
    const farewell = answers.findIndex((a) => /^farewell$/i.test(a.label));
    if (answers.length && farewell < 0) continue;
    st.answers = answers.length ? [...answers.slice(0, farewell), blessing(reply), ...answers.slice(farewell)]
      : [blessing(reply), { label: 'Farewell', reply: bye, effects: [] }];
  }
  return dlg;
}
