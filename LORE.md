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
  holds**, barely. The old world is a dying land; adventurers go back to
  fight in it.
- King Aldric proclaimed Morvane a traitor, closed the road to Firetown, and
  sent his people away by sea.

## The crossing

- Forty ships sailed **east** from Westsea Harbour, packed with refugees.
  Storms took nine. The rest reached the empty coast of the new lands and
  built **Kingshaven** out of their own ships.
- Aldric sent his daughter, **Princess Elowen**, on the last ship, the
  **Dawnward**, to rule the refugees. The Dawnward never arrived. Kingshaven
  ("the king's haven") keeps an empty throne for her. Whether she lives is
  an open thread (a future quest chain).
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
  torn. They all woke when the gate opened.

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
tutorial's last message; Kraghul's and Morvane's descriptions; the
website's Lore page tells only the opening legend.
