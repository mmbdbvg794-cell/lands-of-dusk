# The Lands of Dusk: the story so far

The canon behind everything players find in the game. Players never read
this whole: each place tells its own piece, from its own side (see "Where
the pieces are" below). Keep new quests, NPCs and items consistent with it,
and add to it here first.

## The fall of Zilen (the old world)

- The old world is the kingdom of **Zilen**: the City of Light (its
  capital), Midnight and the Izaru mines, Riverside, Westsea Harbour, and
  Firetown, a forge town on an island in the southern sea.
- **King Zilen** was a good king. He lies in the City of Light's graveyard
  beside his queen, kept by Tombkeeper Aldous. His elder son **Aldric** took
  the throne; the younger, **Morvane**, a sorcerer, was passed over and
  never forgave it.
- Under Firetown lies one of the **seven gates**: doors under the world to
  places that should never touch it. In the first age they were sealed with
  **warden stones** cut by the lizardfolk elders. The Drow went below to
  guard them.
- Forty years ago Morvane came to Velkarath's markets asking about the gate
  under Firetown. The Drow sold him nothing; he found it anyway. He wanted
  an army that could not die, and he **opened the gate**.
- Through it came the **Ashen Horde**, out of a burning realm, led by
  **Kraghul**, a horned and scaled warlord. Its price for Morvane was paid
  in the dead: everyone the Horde killed rose for him. In the end Morvane
  died too and rose as the **Skeleton King**. Kraghul burns; Morvane raises
  what burns.
- Firetown fell first; the rift is still open there (no one can go: it's
  "hell"). Then the Horde came west. Midnight's deep mines were overrun
  (the Izaru Deeps), King Zilen's grave was robbed of its crown and the
  crypt of his guard defiled (the Zilen Legacy). **The City of Light still
  holds**, barely. The old world is a dying land, dying by emptying, not
  burning: most of its people sailed east, and the ones left are stubborn,
  poor or old. Adventurers go back to fight in it.
- King Aldric proclaimed Morvane a traitor, closed the road to Firetown, and
  sent his people away by sea. He did not come east himself, and he is gone
  now: dead or missing, no one knows (see "Canon decisions").

## The crossing

- Forty ships sailed **east** from Westsea Harbour, packed with refugees.
  Storms took nine. The rest reached the empty coast of the new lands and
  built **Kingshaven** out of their own ships.
- Aldric sent his daughter, **Princess Elowen**, on the last ship, the
  **Dawnward**, to rule the refugees. The Dawnward never arrived. Kingshaven
  ("the king's haven") keeps an empty throne for her. **Lord Steward
  Halvard** governs the city in her name, standing beside the empty chair.
- **What became of her** (the quest chain *The Dawnward*, dawnward.mjs): a
  storm wrecked the Dawnward on the lizardman isles' east shore (the wreck
  is still there, stripped by Dry One raiders). The brood pulled Elowen,
  then about sixteen, from the water. She lived a year in Ssarakh, learned
  from Shaman Ithrae how the gates were sealed, and left with the brood's
  blessing and a shard of the Brood Stone. Twelve years ago, grey-haired,
  she knelt at King Zilen's grave and left a letter with Tombkeeper Aldous:
  her uncle opened the gate under Firetown, and she meant to close it; if
  she didn't come back, the stone is with her "somewhere in the fire".
- **The Firetown Expedition** (firetown.mjs): Elowen left a second page
  with Tombkeeper Aldous: a gate is shut with warden stone, Brood Stone and
  the old words. Archivist Zyrith (who refused Elowen twelve years ago and
  is sorry) gives a fragment of Velkarath's broken warden stone. Old Bram,
  a boatman at Westsea Harbour, rows across past the king's closed road;
  his grandson Tam rows back. Elowen is alive, grey and thin, a prisoner of
  the Fallen in Firetown's cells: they keep her because the rift likes a
  king's blood near it. The Ashen Gaoler, captain of the Fallen, wore the
  shard. At the rift, at the passage's end, the shard and the warden stone
  and the words "Under the world, be still" close it. Elowen gives
  **Dawnbreaker**, King Zilen's sword, and a letter to Old Wenna: "Do not
  keep the chair warm for me; keep the people warm." She stays in Firetown
  until she can walk the passage. (Per player: the rift is closed in each
  player's own story.)
  **Open threads:** Elowen coming home to Kingshaven; Kraghul and the Horde
  still in the dunes above Eastreach; Morvane, still risen.
- New human characters are refugees: the tutorial ("From Refugee to
  Soldier...") is the last of the crossing, and it ends in Kingshaven.

## The peoples of the new lands

- **Elves (Aelindor)** were here long before. Their Elder Council argued a
  week, then gave the refugees the western coast and seed for one spring.
  The **grey blight** in their groves began the year the ships came; it
  smells of ash and old iron. The Green Wardens fight it. The elves suspect
  the wind carries it from the burning across the sea.
- **Drow (Velkarath)** are elves who went below in the first age. The
  surface songs call it **the Sundering** and say they went in pride; the
  Drow say they went on guard, to keep the gates. They felt the Firetown
  gate open: the deep shook for three days, lava rose in the east
  galleries, and the **ember dragon** woke.
- **Lizardfolk (Ssarakh)** are the oldest people; the brood remembers
  everything, egg to egg. Their elders cut the warden stones. The **Brood
  Stone** in Ssarakh's plaza is the last one whole (it may matter, one day,
  to closing the rift). The fallen of the brood wake beside it.
- **The Dry Ones** (the Sand Kings of the Eastreach desert) are lizardfolk
  who left the mire long ago. They bow to Kraghul, who raids the dunes
  above Eastreach: the Horde's foothold on this side of the sea.
- **The wyrms** (ember, stone and frost dragons) wake when the world is
  torn. They all woke when the gate opened. They are old to humans but young
  to dragonkind: elder dragons exist elsewhere (Ithrae: "Old, you call them?
  To you. The brood remembers their mothers.").

## Where the pieces are (tools/world/cities/lore.mjs)

Each piece sets a flag `lore_*`, adds a "Tale: ..." line to the journal,
and counts toward the achievement **Keeper of Tales** (all of them).

| Piece | Where | Flag |
|---|---|---|
| The crossing; the empty throne; the war | Old Wenna the Chronicler, Kingshaven plaza | lore_crossing, lore_throne, lore_fall |
| The Stone of the Crossing | Kingshaven plaza, west side | lore_memorial |
| When the ships came; the blight; the Sundering | Loremistress Faelith, by the Moonwell | lore_ships, lore_blight, lore_sundering |
| The sealed gates; Morvane; the night the gate opened | Archivist Zyrith, Velkarath | lore_gates, lore_morvane, lore_tremor |
| The broken warden stone | Velkarath, east of the square | lore_shard |
| The brood; the Dry Ones; the wyrms | Shaman Ithrae, Ssarakh | lore_brood, lore_dryones, lore_wyrms |
| King Aldric's proclamation | City of Light, the street by the statues | lore_proclamation |
| The last sailings notice | Westsea Harbour quay | lore_lastships |

Smaller touches (no flag): Chieftain Hesska warns of the Dry Ones; the
tutorial's last message; Kraghul's and Morvane's descriptions; Lord Steward
Halvard in Kingshaven's keep (no word of King Aldric; once a player has
brought Elowen's letter home, he has read it too); Tombkeeper Aldous's hint
that someone paid for King Zilen's crown (*The King's Crown*); the
website's Lore page tells only the opening legend.

Other named people in the stories, so names don't clash again: Old Wenna
(Kingshaven's chronicler) and Old Tamsin (the herbalist by Eastreach) keep
their names; the old world's herbalist by the swamp is **Herbalist Linnet**,
the east-field village's reeve is **Reeve Osric** (a man), and Kingshaven's
tailor is **Corra the Tailor**.

## Canon decisions (2026-10-15)

Decided by flan; live NPC dialogue follows them.

- **A. King Aldric is gone.** He is not in Kingshaven and not in the old
  world: dead or missing, and no one knows which. Lord Steward Halvard
  governs Kingshaven in Elowen's name, beside the empty chair.
- **B. The wyrms are young.** The ember, stone and frost wyrms are old to
  humans but young to dragonkind. Elder dragons exist elsewhere (future
  endgame content).
- **C. The crown was bought. (SECRET: players only ever get a hint.)** The
  robber boss in *The King's Crown* was paid to fetch King Zilen's crown by
  an agent of Morvane. In the game Aldous only says "Thieves melt gold; they
  don't keep crowns. Someone paid for this one." Never name Morvane (or his
  agent) in the game.
- **D. The old world is dying by emptying, not burning.** Most people sailed
  east; the ones left are stubborn, poor or old. Its towns should read as
  thinned out and hanging on, not busy or thriving.
- **E. Renames to end name clashes.** Herbalist Wenna is now Herbalist
  Linnet; Reeve Tamsin is now Reeve Osric (a man); Tamsin the Tailor is now
  Corra the Tailor. Old Wenna and Old Tamsin keep their names. Quest ids
  and flags did not change.

**Open threads these create:**
- What happened to King Aldric (dead, missing, taken?).
- Why Morvane wanted his father's crown.
- The elder dragons: where they are, and what they make of the young wyrms.
