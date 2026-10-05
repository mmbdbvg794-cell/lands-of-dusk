// The gas mask quest, "The Neon Rose", in the old world's west: the toxic
// swamp (x 1-21, y 64-105; its fumes hurt anyone without a gas mask on,
// tools/server/fix_swamp.py) has a hermit in the meadow south of it who
// gives a glowing neon rose, and Herbalist Wenna, west of the walled city,
// weaves it into a gas mask. The hermit's square (5,122, a walk-on script
// from the old game) is rewritten here: his first line had the same
// unquoted "gasmask" as the swamp, so he never said anything.
//
// No squares change: Wenna stands on open grass at 32,126.

const TITLE = 'The Neon Rose';
const WENNA = 'Herbalist Wenna';
const at = [32, 126];

const dlg = {
  shouts: ['Herbs and remedies!'],
  stages: [
    { when: { kind: 'flag', value: 'neonrose_done' }, says: 'How\'s the mask? Ugly as sin, but no fume gets past it. The swamp\'s yours now.', answers: [] },
    {
      when: { kind: 'item', value: 'neonrose' },
      says: 'Is that... a neon rose? It only grows where the swamp fumes are thickest. I can weave its light into a mask that keeps them out.',
      answers: [
        {
          label: 'Please make me a mask',
          reply: 'Hold still... There. Wear it over your face and the fumes won\'t touch you.',
          needs: { kind: 'item', value: 'neonrose' },
          effects: [
            { kind: 'take', item: 'neonrose' },
            { kind: 'give', item: 'gasmask' },
            { kind: 'unflag', flag: 'neonrose_quest' },
            { kind: 'flag', flag: 'neonrose_done', journal: { title: TITLE, text: 'Herbalist Wenna wove the neon rose into a gas mask. Wearing it, the swamp fumes can\'t hurt me.', done: true } },
          ],
        },
        { label: 'Not yet', reply: 'Keep it safe, then. It won\'t wilt.', effects: [] },
      ],
    },
    { when: { kind: 'always', value: '' }, says: 'Herbs and remedies, dear. The swamp to the north-west? Don\'t go in without a mask: the fumes burn the lungs. An old hermit lives in the meadow past it, they say. If he\'s still alive.', answers: [] },
  ],
};

const HERMIT = `#The swamp hermit ("The Neon Rose", tools/world/cities/swamp.mjs): he gives
#a neon rose; Herbalist Wenna, west of the walled city, makes it a gas mask.
if hasCondition trigger neonrose_done
	chat trigger " The hermit says: That mask! So someone could harness the flower after all. Mind the fumes, friend."
	endscript
end
if isWearing trigger "gasmask"
	chat trigger " The hermit says: At last, an item created to stop the effects of the swamp."
	endscript
end
if hasItem trigger "gasmask"
	chat trigger " The hermit says: At last, an item created to stop the effects of the swamp."
	endscript
end
if hasItem trigger neonrose
	chat trigger " The hermit says: Go! Find someone who can harness the powers of this flower. Herbalist Wenna, east of here by the walled city, knows her plants."
	endscript
end
chat trigger " The hermit says: *groan* I couldn't make it through the swamp... I managed to end up in this meadow... this flower is keeping the swamp fumes out... I'll be out of commission for a while, but I'll give you this neon flower. Herbalist Wenna, east of here by the walled city, may know how to harness its power."
giveItem trigger neonrose
addCondition trigger neonrose_quest
endscript
`;

export default {
  name: 'The Neon Rose',
  origin: at,
  size: [1, 1],
  oldWorld: true,
  mayBuild: () => false, // no squares change
  build(p) {
    p.npc({ name: WENNA, look: 'Woman', desc: 'Herbalist Wenna, her apron stained green with a hundred remedies.', x: 0, y: 0, dlg });
    p.file('defMoveActions/5_122', HERMIT);
    p.journalLine('neonrose_quest', TITLE, 'A hermit in the meadow south of the swamp gave me a glowing neon rose. Herbalist Wenna, east of there by the walled city, may know how to use it.');
  },
};
