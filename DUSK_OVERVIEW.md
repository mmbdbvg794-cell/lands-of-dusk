# Dusk: an overview

A plain summary of the Dusk project for someone joining the conversation:
what the game is, and what's been built so far (as of the evening of 7
October 2026). The
technical notes (servers, files, commands) are in HANDOVER.md; this skips them.

## What Dusk is

Dusk is an old Java online RPG from the early 2000s: a tile-based world seen
from above, where players walk around, fight monsters, trade, train skills and
talk to NPCs. flan (the owner, a god in the game) runs a server of it, and it
has been brought back to life with a new **browser client**: no Java needed,
you play at a web address on a computer or a phone, and it can be installed
as an app. The old Java server still runs the game, with many fixes and
additions.

## The world

- **The old world**: the original map (the City of Light, Midnight, Riverside
  and more), forest and rock crossed by roads, with its areas linked by
  walk-on teleports.
- **The new lands**: a much bigger world added around it, with continents in
  the north, south, east and middle, linked by **sailing ferries** between
  harbours.
- **Cities**: **Kingshaven** (the human capital, with rentable houses on
  Lantern Row), **Aelindor** (the elven city), **Velkarath** (the dark elves'
  underground city), **Ssarakh** (the lizardfolk's Mire City), **Eastreach**
  (a desert frontier town), and small places such as Southfield village.
- **The lizardman isles**: eleven giant islands east of Eastreach turned to
  swamp, with new map tiles (marsh, mud, reeds, bog pools, boardwalks and
  weeping willows). Ssarakh stands on the west island, with a chieftain, a
  shaman who trains, a bank, a tavern, a market and a harbour; the Marsh
  Wren sails between it and Eastreach.
- **Races** each start somewhere of their own: humans in a short
  **tutorial** at Westsea (they're refugees; it ends with them arriving in
  Kingshaven), elves in the Grove of Waking, dark elves in the caves under
  Velkarath, lizardmen in Ssarakh.
- **Dying** sends you back to your race's capital with a little health.
- Hundreds of **monster dens** across the new lands, set by biome and how far
  they are from the harbours. Creatures now wander, hunt in packs and flee
  when hurt.

## The story

The world now has one history tying it together (the whole of it is in
LORE.md). In short: across the sea is the old kingdom of Zilen. King
Aldric's brother **Morvane** opened a sealed gate under Firetown to get an
army that couldn't die. The **Ashen Horde** came through under the warlord
**Kraghul**, and everyone it killed rose for Morvane, until he died and rose
as the **Skeleton King** (both are world bosses). Aldric sent his people
east by sea: they built **Kingshaven**, and keep its throne empty for
Princess Elowen, whose ship, the Dawnward, never arrived (a thread for a
later quest chain). The elves took the refugees in, the Drow guard the
gates below, and the lizardfolk, the oldest people, cut the stones that
sealed the gates.

Players never get it all at once: chroniclers in each capital and old
stones around the world each tell one piece, from their own side. Each
**tale** goes in the journal, and collecting all 16 earns **Keeper of
Tales**.

## Things to do

- **Quest chains**, each three or four quests from one NPC, with new monsters
  and a hard finale:
  - Kingshaven: *The King's Watch* (hounds, highway thieves, a haunted barrow).
  - Aelindor: *The Green Wardens* (slimers, shrine gargoyles, a blighted grove).
  - Velkarath: *The Deep Patrol* (cave slimes, duergar, an ember dragon).
  - Eastreach: *The Eastreach Frontier* (wild dogs up to the lizardmen's Sand Kings).
  - The City of Light: *The Zilen Legacy* (grave robbers, a stolen crown, the
    crypt of the old king's guard).
  - Midnight: *The Izaru Deeps* (slimes in the mine, missing miners, a stone dragon).
  - Southfield: *The Frozen Reach* (white wolves, and a frozen land beyond the
    trees that had been sealed off, with a frost dragon).
  - Older ones: *The Neon Rose* (a swamp herbalist), *The Fire Orb*, and the
    *Champions' Gauntlet* (ten champions and a prize sword).
- **Bounty boards** in seven towns: three jobs each (easy, middling, hard)
  against the monsters round the town, paid in gold and experience; one a day
  per board.
- **World bosses**: every few hours a great monster rises somewhere (Ursok
  the Dread Bear, Fenris the Great Wolf, Kraghul the Warlord, Morvane the
  Skeleton King), everyone is told, and the players who bring it down share
  gold, experience, a trophy and a chance at a rare item.
- **Spells and skills** (reworked so they all do something), trainers,
  cooldowns, a spellbook and a hotbar.
- Shops, a bank with deposit boxes, shared storage chests, item pictures, and
  an economy checked for exploits.

## Playing together

- **Parties**: invite players, see their health over the map, talk to the
  party, and share quest kills when hunting nearby.
- **Mail**: letters to any character, waiting until they're read.
- **Friends** (with online notices), **whispers**, **trading** between players,
  a **who's online** page and a **leaderboard**.
- **Achievements** (Dragonslayer, Bounty Hunter, Keeper of Tales...) and a
  **profile page** for every character.
- A **forum** on the website: sign in with your character's name and game
  password.
- **Bug reports** from inside the game go straight to the gods.

## Look and feel

- Two art styles: **Pixel** (the original) and **Painted** (new hand-made art
  for the map, characters, creatures, items and props), plus Classic and
  Modern looks for the screen.
- **Day and night** on a two-hour clock, **weather** per continent (rain,
  storms, snow, fog), and **lighting**: torches, lamps, lava and lanterns
  light up the night.
- **Music** that follows where you are (towns, the wilds by day, night,
  underground, at sea), using free CC0 tracks, crossfading as you move and
  showing the track's name; **area sounds** under it (birds, crickets, owls,
  waves, gulls, wind, drips in caves), with separate volume sliders, and the
  music fading down in storms.
- **Battle animations**: your character swings at what it fights (stab with
  a dagger, chop with an axe, slash with a sword).
- A Help page, a journal for quests, a world map with your own notes.

## For the gods

A God tab with tools to build the world from inside the game: place things,
paint tiles, write NPC conversations, make quests with a step-by-step
wizard (including repeatable and daily ones), edit monsters, props and items,
set what happens when someone steps on a square, check players' flags, and an
**admin page** (who's online, bug reports, logins, errors, restart).

## The website

Home page with news (the latest: the browser client announcement), How to
Play, FAQ, Updates, a **Lore** page (just the opening legend), the forum,
the leaderboard and who's online.

## Ideas for later

The lost princess quest chain, monsters and dens on the lizardman isles, a
lizardman tutorial, arena duels, gathering and crafting, owned ships.
