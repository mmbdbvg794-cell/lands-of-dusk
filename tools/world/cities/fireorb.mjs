// "The Fire Orb", the old game's vault quest in the far-south enclave
// (x 5-43, y 940-993; reached by walking into the tree at 3,4), rewritten:
// its scripts were tangled (blocks without ends, the guards' keys not the
// ones the vault door asked for, a "thief" flag shared with the thieves'
// guild) and its items couldn't load, so nobody could finish it.
//
//   7,966    the man whose fire orb is in the vault: starts it, takes the orb
//            back, gives a reward note
//   9,948    the old lady in the west meadow: brews a sleeping potion from a
//            minor potion and a sleeping weed
//   12,946   where the sleeping weed grows (north-west corner of her meadow)
//   24,976   the vault guards either side of its door: the potion puts each
//   26,976   to sleep, and each has a vault key
//   25,975   the vault door: both keys to go in
//   25,974   in the vault: the fire orb
//   32,978   the bank clerk: pays the reward note, 10,000 gp, once
//
// Flags: fireorb_on (looking for it), fireorb_returned (have the note),
// fireorb_done. The items' files are tools/server/fix_item_files.py's.

const TITLE = 'The Fire Orb';
const head = (what) => `#${what} ("The Fire Orb", tools/world/cities/fireorb.mjs).\n`;

const GIVER = head('The man whose fire orb is in the vault') + `if hasCondition trigger fireorb_done
	chat trigger " Thank you again for my fire orb. Spend those riches wisely."
	endscript
end
if hasCondition trigger fireorb_returned
	chat trigger " Take that note to the bank clerk, in the east of the vault building. He'll pay you."
	endscript
end
if hasCondition trigger fireorb_on
	if hasItem trigger "fire orb"
		removeItem trigger "fire orb"
		giveItem trigger "reward note"
		removeCondition trigger fireorb_on
		addCondition trigger fireorb_returned
		chat trigger " My fire orb! Bless you. Here: take this note to the bank clerk, in the east of the vault building, and he'll pay you handsomely."
		endscript
	end
	chat trigger " Haven't you got my fire orb from the vault yet? Its guards won't let anyone near while they're awake... the old lady in the west meadow brews sleeping potions."
	endscript
end
chat trigger " They locked my fire orb in the vault! If you bring it back to me, I'll pay you with amazing riches."
chat trigger " The guards won't let you near it while they're awake. The old lady in the west meadow may help."
addCondition trigger fireorb_on
endscript
`;

const LADY = head('The old lady in the west meadow') + `if ! hasCondition trigger fireorb_on
	chat trigger " Old Lady: Get out of my house!"
	endscript
end
if hasItem trigger "sleeping potion"
	chat trigger " Old Lady: You have your potion. Off with you, and mind those guards."
	endscript
end
if hasItem trigger "minor potion"
	if hasItem trigger "sleeping weed"
		removeItem trigger "minor potion"
		removeItem trigger "sleeping weed"
		giveItem trigger "sleeping potion"
		chat trigger " Old Lady: There. A drop in each guard's cup and they'll sleep like babies."
		endscript
	end
end
chat trigger " Old Lady: The vault guards? I can brew you a sleeping potion. Bring me a minor potion and a sleeping weed. The weed grows in the north-west corner of this meadow."
endscript
`;

const WEED = head('Where the sleeping weed grows') + `if hasCondition trigger fireorb_on
	if ! hasItem trigger "sleeping weed"
		if ! hasItem trigger "sleeping potion"
			giveItem trigger "sleeping weed"
			chat trigger " Among the weeds you find a purple, drowsy-smelling herb: a sleeping weed."
		end
	end
end
endscript
`;

// A guard: the potion, then his key. The potion is used up once both
// guards are asleep.
const guard = (mine, other) => head('A vault guard') + `if ! hasItem trigger "sleeping potion"
	if ! hasItem trigger "${mine}"
		chat trigger "Guard shouts: Get out of here!!"
		chat trigger "Voices in your head tell you to visit the old lady in the west meadow."
		endscript
	end
end
if ! hasItem trigger "${mine}"
	giveItem trigger "${mine}"
	chat trigger " You slip the sleeping potion into the guard's cup. He yawns, slumps and starts to snore, and you take the vault key from his pocket."
	if hasItem trigger "${other}"
		removeItem trigger "sleeping potion"
	end
	endscript
end
chat trigger " The guard is fast asleep."
endscript
`;

const DOOR = head('The vault door') + `if hasItem trigger "fire orb"
	removeItem trigger "vaultkey1"
	removeItem trigger "vaultkey2"
	chat trigger " You lock the vault behind you and leave the keys in the door."
	inc trigger locy 1
	endscript
end
if ! hasItem trigger "vaultkey1"
	chat trigger " The vault is locked. Each guard has a key."
	inc trigger locy 1
	endscript
end
if ! hasItem trigger "vaultkey2"
	chat trigger " The vault is locked. Each guard has a key."
	inc trigger locy 1
	endscript
end
chat trigger " You open the vault and step inside."
inc trigger locy -1
endscript
`;

const VAULT = head('Inside the vault') + `if hasCondition trigger fireorb_on
	if ! hasItem trigger "fire orb"
		giveItem trigger "fire orb"
		removeItem trigger "vaultkey1"
		removeItem trigger "vaultkey2"
		chat trigger " You find the fire orb, a swirl of flame behind glass, and pick it up. You lock the vault behind you and leave the keys in the door."
		inc trigger locy 2
		endscript
	end
end
chat trigger " The vault is empty."
inc trigger locy 2
endscript
`;

const CLERK = head('The bank clerk') + `if hasItem trigger "reward note"
	if hasCondition trigger fireorb_returned
		removeItem trigger "reward note"
		inc trigger cash 10000
		removeCondition trigger fireorb_returned
		addCondition trigger fireorb_done
		chat trigger "Bank Clerk: A reward note, and properly signed. Here is your reward: 10000 gp."
		endscript
	end
end
chat trigger " Bank Clerk: My time is precious, now go away!"
inc trigger locx -6
endscript
`;

const NOTE = 'type\nitem\ndescription\na reward note, signed with a flourish: the bearer is owed 10000 gp at the bank\ncost\n0\nimage\n6\n.\n';

export default {
  name: 'The Fire Orb',
  origin: [5, 940],
  size: [1, 1],
  oldWorld: true,
  mayBuild: () => false, // no squares change
  build(p) {
    p.file('defMoveActions/7_966', GIVER);
    p.file('defMoveActions/9_948', LADY);
    p.file('defMoveActions/12_946', WEED);
    p.file('defMoveActions/24_976', guard('vaultkey1', 'vaultkey2'));
    p.file('defMoveActions/26_976', guard('vaultkey2', 'vaultkey1'));
    p.file('defMoveActions/25_975', DOOR);
    p.file('defMoveActions/25_974', VAULT);
    p.file('defMoveActions/32_978', CLERK);
    p.file('defItems/reward note', NOTE);
    p.journalLine('fireorb_on', TITLE, 'A man in the far-south town wants his fire orb back from the vault. Its guards won\'t let anyone near; the old lady in the west meadow may help.');
    p.journalLine('fireorb_returned', TITLE, 'I brought back the fire orb and got a reward note. The bank clerk, in the east of the vault building, will pay it.');
    p.journalLine('fireorb_done', TITLE, 'The bank clerk paid my reward note: 10,000 gold.', true);
  },
};
