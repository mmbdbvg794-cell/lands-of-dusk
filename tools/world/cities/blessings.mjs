// A paid blessing at each town's priest (flan, 2026-10-26): all HP and MP
// back, for gold. tools/server/blessings_talk.mjs adds it to the live
// conversations; run it again after merging a quest into one of them
// (mergeQuest rebuilds quest stages without it). Running it twice changes
// nothing.
export const BLESSING_COST = 50;

// name: [the blessing's reply, a farewell for stages that had no answers]
export const PRIESTS = {
  'High Priestess Maren': ['Fifty gold, for the temple. Be whole again, in the Light\'s name.', 'Walk in the Light.'],
  'Priestess Ilsevel': ['Fifty gold, for the Moonwell. Water on your brow... there. Be whole.', 'Go gently.'],
  'Priestess Ilvra': ['Fifty gold. The Spider Queen mends what is useful to her. Rise.', 'Go.'],
  'Shaman Ithrae': ['Fifty gold, for the pot. Hold still. Hsss. The river knows your shape. There.', 'Go well.'],
};

export const blessing = (reply) => ({
  label: 'Blessing', reply, needs: { kind: 'gold', value: BLESSING_COST },
  effects: [{ kind: 'takegold', amount: BLESSING_COST }, { kind: 'heal' }],
});

// The blessing on every stage that ends the talk or offers topics with a
// farewell; not on a quest's yes/no question.
export function addBlessing(dlg, name) {
  const [reply, bye] = PRIESTS[name];
  for (const st of dlg.stages) {
    const answers = st.answers ?? [];
    if (answers.some((a) => a.label === 'Blessing')) continue;
    const farewell = answers.findIndex((a) => /^farewell$/i.test(a.label));
    if (answers.length && farewell < 0) continue;
    st.answers = answers.length ? [...answers.slice(0, farewell), blessing(reply), ...answers.slice(farewell)]
      : [blessing(reply), { label: 'Farewell', reply: bye, effects: [] }];
  }
  return dlg;
}
