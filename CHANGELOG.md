# Changelog

Everything done on the Dusk browser client, and on the server and website
alongside it, from the first commit (29 September 2026) to now. Grouped by
area rather than by date; `git log` has the day-by-day detail.

## Playing in the browser

- **A browser client for Dusk.** No Java, no OpenWebStart: the game runs in
  the browser. It connects through the dusk-bridge WebSocket bridge, and
  works over https/wss through Tailscale Funnel at
  `https://duskserver.tailaee0f2.ts.net/play/`.
- **Login screen.**
  - Character name and password, with an optional "Remember me on this device".
  - Yes/No buttons for the server's questions.
  - A Reconnect button when the connection drops.
- **Character creation.**
  - A new name asks whether to create the character.
  - Race buttons show each race's picture and stat bonuses.
  - Darkelf is marked as starting in the Underdark.
- **Death screen** when you die.
- **Bug reports** from inside the game (Settings → Report a bug). They can
  include technical details: browser, screen, character, position and the
  last chat lines. Besides the email, a report goes to every god as a
  message in the game, or waits for them until they log in.

## Moving and the map

- Walk with the arrow keys or WASD, or click the ground to walk there.
- **Minimap.** Click it to zoom; it can be dragged and reset.
- **World map** (M, or the Map button). It uses fog of war: it fills in as
  you explore, and is remembered per character.
- **Walk-on scripts fixed.** Broken move actions were repaired:
  - 38_32 teleported onto its own square, which crashed the game loop.
  - 92_76 and 92_77 were missing `endscript`.

  A fixer tool is kept in the repo.
- **The starting area is walkable again.** `tilecap` was raised from 64 to
  160, and the missing tile scripts for tiles 128–159 were added.

## Art

- **Two art styles**, switched with Pixel | Painted in the top bar:
  - Pixel: the original tiles.
  - Painted: new art. It started as a "Smooth" filter and was replaced by
    hand-painted art.
- **Painted world.**
  - Trees, calm water, stone, brick, wood, floors, lava, ice and rocks.
  - Walls, whole framed doors, torches, stairs and the ship.
- **Painted characters and creatures.**
  - Drawn fresh by name, not by filtering the old picture.
  - Cats look like cats, and grizzlies like bears.
  - New: a wildcat, and male and female villagers (with bowl cuts).
- **Your gear shows on your character**: armour, helmets, weapons, shields,
  skirts and hair. **Other players show in their gear too.**
- **Items on the ground** are drawn as what they are: a red potion is a red
  potion, not a bag.
- **Props drawn by name**: chairs, couches and the rest each have their own
  picture.
- **Spell effects everyone nearby sees** (heal, holy, fire, earth, dark,
  arcane), using the server's playsound. They're on every castable spell.

## The panel: your character and tabs

- **Under the HP/MP bars:**
  - STR, INT, DEX, CON and WIS.
  - AC, damage, gold and experience.
  - Hunger and thirst only. Quest flags and other hidden conditions stay
    hidden.
- **Backpack** tab: what you carry, with Use, Wear and Drop.
- **Equipped** tab: what you wear, laid out on a body outline.
- **Spellbook**: the server's grouped spell list, with spell names shown
  without the MP cost.
- **Skills** tab (was Stats): just your skills, each with a bar and its
  value, highest first. Everything else is already shown above.
- **Shop** tab when you stand at a merchant, even one with no price list.
- **Storage** tab for barrels, chests and your deposit box.
- **Hotbar.**
  - Ten slots on keys 1–9 and 0, for spells or any command.
  - Right-click a slot to change it.
  - Drag it by its grip; it snaps to an edge.
  - Saved per character.
- **Chat.**
  - Across the bottom (optional).
  - Always scrolled to the latest line.
  - Up/Down bring back earlier lines you typed.

## Talking, shops and the bank

- **Click anything on the map** for a menu of what you can do with it:
  - Attack, Look, Talk, Shop, Pick up, Open, Read.
  - "Go to …" when it's too far away.
- **Talking to NPCs.**
  - What they say appears in speech boxes.
  - Answers show as buttons. A single choice gets a button too.
  - NPCs call out when you come near.
- **Bank Teller.**
  - Check your balance, deposit and withdraw by talking to them.
  - Every teller shares the same account.
  - Usable from five squares away.
- **Deposit boxes.**
  - 500 gp, paid once.
  - 40 items, one box per player.
  - The same box at every teller.
- **Shared storage.** Barrels and chests that gods place, and that everyone
  shares. Click one next to you to open it.
- **Names on the map.** Three separate settings:
  - People and creatures.
  - NPCs.
  - Objects: furniture, items and signs.

## Looks and settings

- **Classic look.**
  - A retro spellbook style that matches the website: Cinzel and EB
    Garamond fonts, stone and parchment.
  - The God tools keep the clean Modern look.
  - Switch with Classic | Modern.
- **Settings.**
  - Names (three kinds), minimap, hotbar, chat across the bottom.
  - Art style, sound, footsteps.
  - The protocol trace, which starts off on every visit.

## For gods

- **God tab.** Place things on your square:
  - Items, mobs, props, storage, signs, merchants, tiles and tile actions.
  - "Save map" keeps what you placed after a restart, and a counter shows
    unsaved changes.
- **The God tab pops out** into its own window. You drag it by its title
  bar, and it remembers where it was.
  - The tab now stays while the window is out, with **Show window** and
    **Dock it here** buttons, so it can't get lost.
  - The window is kept on screen when the browser is resized.
- **God commands reference** in the God tab. Click one to start typing it.
- **Named props.**
  - Give props names and descriptions of their own ("George" the villager,
    a statue with its own description).
  - Rename or edit them from the click menu.
- **Named, editable signs** (e.g. "Bank"). Rename a sign or change its text
  from the click menu.
- **Dialogue editor.** Make quest givers in the game, with no script
  writing:
  - Shouts.
  - Stages chosen by the player's flags, items or gold.
  - Answer buttons, each with a reply, what it needs (gold, an item, a
    flag), follow-up questions and effects: give or take an item or gold,
    give experience, set or clear a flag, teleport.
  - It warns when an NPC has a hand-written script, and says so if the
    server doesn't answer.
- **Tile messages and tile actions.**
  - A message for whoever steps on a square.
  - An editor for what happens when they do, including **who may step
    there** (e.g. only players with the `tutorial` flag) and what everyone
    else is told.
- **Descriptions** for props and NPCs, shown by Look.
- **Player flags.** Click a player → Flags (god) to see their flags, give
  one, or take one away. Useful for testing quests.
- **Remove** from the click menu for anything placed.
- **Admin page** (God tab → Server → Admin page…, or `#admin` at the end of
  the address): how the server is doing and the restart, who's in the game
  (where they are, their address, Go to and Ban), the latest bug reports,
  recent logins and today's errors, refreshed every 30 seconds.

## Server fixes

These are server classes added alongside the live ones and installed with
backups; see `server/`.

- **Garbled messages fixed.** When something new appeared on the map, every
  player after the first got a mangled message. This caused "Unknown opcode"
  lines and missed updates.
- **IDs freed twice fixed.** Logging in again while the old connection was
  still closing gave two things the same ID.
- **The game loop survives crashes.** An error used to freeze the whole game
  until a restart; now it's logged and the loop starts again.
- **Case-insensitive file names**, so "Red Potion" finds `red potion`.
- **Script caches.** Talk scripts recompile when their source is newer, so
  edits aren't ignored.
- **Condition files fixed.** Empty conditions were filled, and missing ones
  created.

## Later additions

- **Chat tabs**: General and Combat, a combat summary (kills, damage dealt
  and taken, best hit, hit rate, dodges, exp, gold) and chat options (text
  size, times, combat in General, clear).
- **Touch controls**: on-screen arrows (hold to keep walking) and a phone
  layout that fits the screen.
- **Lizardman** redrawn: olive scales, banded belly, a wedge snout, slit
  eyes, spines and claws.
- **Other players' gear** shows within seconds of meeting them.
- **Banning that works**: players' real addresses reach the server through
  the bridge, so `whois`, login history and `banip` see them; `ban`,
  `banip` and `unban` can no longer ban 127.0.0.1 (which locked everyone
  out); new `bandevice`, `unbandevice` and `bans`.
- **Walk-on scripts**: 84 more fixed (missing endings, a broken teleport,
  a shop that didn't push you back out).
- **Bigger deposit boxes**: upgrade at a teller from 40 to 60, 80 and 100
  items (1,500, 4,000 and 8,000 gp).
- **Lockable chests**: gods lock a chest to a key item; only someone
  carrying it can open it. Barrels stay open.
- **The world map is saved on the server**, so it follows you to another
  browser or device.

- **Item pictures and details**: every item in the Backpack, Storage and
  Shop has its picture; tap one for its type, damage or armour, uses and
  value.
- **Quest journal**: a Journal tab with your quests, in progress and done.
  Gods write the entries (God tab → Quest journal…), one per quest flag.
- **Friends**: a Friends tab with who's online, a note when a friend logs
  in, and Whisper buttons; add friends by name or from a player's menu.
- **Whispers**: a Whispers chat tab; click a whisper to answer it.
- **Trading**: a trade window between two players (items and gold, both
  press Ready, any change un-readies both).
- **World map pins**: banks, shops and people with something to say, where
  you've explored; and your own notes ("+ Note"), kept on the server.
- **Night and weather**: a two-hour day with dusk, night (a lantern's
  light around you) and dawn; rain, storms with lightning and thunder, and
  snow on snowy ground, the same for everyone. Optional quiet music.
  Each continent has its own weather (wet, foggy North; dry desert East;
  stormier open sea), fog comes and goes, and how hard it rains and which
  way the wind blows change through the day.
- **Area music**: music that follows where you are (towns, the wilds by
  day, night, underground, at sea), crossfading as you move, with its own
  volume slider in Settings apart from the sound effects. Free (CC0)
  tracks for towns, the wilds by day, night and underground, listed on the
  credits page; loop tracks repeat without a gap. Where there's no track
  yet, the quiet generated music plays. The track's name shows over the map
  for a few seconds when it changes (Settings → Track names turns it off).
- **Lit towns**: torches on the walls and lamp posts or braziers in the
  streets at night in Kingshaven, Aelindor, Velkarath and Eastreach, and in
  the old world's City of Light, Midnight Pub town, Firetown, Riverside,
  north-west village, Westsea Harbour, the west isle and the frost hall.
- **Chat tip**: each race's first tutorial character tells new players how
  to talk to others (Enter, then ' to speak, ; to everyone).
- **Install as an app**: add Dusk to your phone's home screen or your
  computer as an app.

- **Training fixed**: trainers teach Strength, Intelligence, Dexterity,
  Constitution and Wisdom by name (before, "Strength" made a useless skill
  and "Stamina" did nothing). Old Strength points became STR; Stamina's
  experience was refunded.
- **Skills that do something**: Regeneration and Mana Regen heal faster
  (some healing in battle too), Spell Power makes spells cheaper, Lock
  Picking opens locked chests without the key. The Skills tab shows just
  fighting and utility skills, each with what it does; magic is in the
  Spellbook.

- **MP heals properly**: the game loop healed MP by CON instead of WIS and
  capped it at max HP instead of max MP; fixed in the engine.
- **Monsters respawn**: killed monsters come back where they were placed
  (after mobrespawnspeed seconds, or a monster's own "respawn" time).
- **God tab → Monsters, props and items…**: open any definition as a form
  (stats, picture, drops, skills, respawn, description...), save to change
  every placed copy at once, or make a new one from a copy. Also from a
  monster's or prop's click menu.
- **Painted spell effects**: smooth, glowing versions of every spell effect
  in the Painted style.

- **Human tutorial finished**: humans start on the ship at 125,365. The
  Recruiter offers training or the door; training goes Armorer, Drill
  Sergeant (beat a dummy, bring its stuffing), Quartermaster (buy water and
  a sandwich), then a teleport stone to the city (17,10), which becomes
  their respawn point. Each step is gated and has its Journal line; the
  quest "From Refugee to Soldier..." finishes on arrival.
- **Race start points work** (they were ignored: everyone started at 4,4).
- **Logging out saves** (closing the tab or a dropped connection lost up to
  18 seconds of progress).
- **Attack reach** matches the server: right beside, not diagonally.

- **How lines are spoken**: every dialogue line and tile message can be
  said, shouted, asked, whispered, or an Action (just the words, in
  italics: "The guard looks you up and down."). A conversation's last line
  offers OK to close it, and an answer with no reply simply ends the talk.

- **Hand-written walk-on scripts are editable**: the tile editor shows a
  script it didn't make as text to change and save (checked first, the old
  one backed up), or sets it aside to build a tile action in its place.

- **The world is four times bigger**: 2000 × 2000 squares, up from
  1000 × 1000. Everything already built is exactly where it was, in the
  north-west corner. Across a sea channel lie new lands: snowy mountains
  and frozen lakes in the far north, oak forests, meadows and autumn woods
  in the middle, deserts and palm coasts in the south, and 40 rivers
  running down to the sea, all with fitted shores. Made by
  `tools/world/generate.mjs`.
- **Aelindor, the elven city**, in the southern forest (around 473, 1246):
  a ring of oaks with four guarded gates, the Moonwell plaza, the Elder's
  Hall and Moon Shrine (the quest "Friend of Aelindor", rewarding a
  Moonleaf Amulet), the Silver Leaf inn, a bank, a bowyer, a tailor, an
  herbalist, a training glade and homes. Dark elves aren't let through
  the gates. Built from a plan by `tools/world/city.mjs` and installed
  with `tools/world/install_city.py`.
- **Velkarath, the dark elf outpost in the Underdark**: a great cavern
  of black stone, lava and crystal, reached only by the stairs in three
  cave mouths (in the mountains west of Aelindor at 391,1236, in the
  southern range at 686,1484, and on the eastern continent at 1489,1407),
  so its tunnels are also a secret way across. Only dark elves may take
  the stairs. The Matron's palace, the Temple of the Spider Queen (the
  quest "Blood of the Deep", rewarding Shadowsilk Gloves), the Black
  Lantern inn, a bank, a weaponsmith, an alchemist, the training pit,
  homes, the Fire Well, and side caves (bats nest in the north-west one).
  Underground there's no weather and it's always dark, lantern-lit.
  The world map keeps it apart: underground it shows only the caves;
  on the surface they're hidden (gods see sea there).
- **Ferries that really sail**: three ports (**Westsea Harbour** in the
  old world, on the western sea north of the refugee ship and down a new
  forest trail from the road south of the great walled city; **Aelindor
  Landing**, the pier at the end of Aelindor's north road; **Eastreach**
  on the eastern continent) and one ship per route on a timetable: the
  Seahawk (Westsea - Aelindor Landing, about 5 minutes), the Morning Star
  (Aelindor Landing - Eastreach, about 7), and on the long crossing
  (Eastreach - Westsea, about 11) the Grey Gull and the Silver Tern,
  starting from opposite ends and passing in their own lanes mid-sea, so
  one leaves each port twice as often. A captain sells a 50 gp ticket; wait on the pier and
  you're taken aboard when the ship is in, then ride her across the sea,
  the coast sliding past, and step off at your port. The ships are drawn
  by the browser client (a galleon that turns with its course, sails full
  under way, a wake behind); everyone nearby sees them come and go.
  `ferry` says where each ship is and when it's due. (server/Ferry.java,
  js/ships.js; the network is in tools/world/cities/ferry.mjs, routes
  made by tools/world/sea-route.mjs.)
- **Dark elf tutorial, "From Hatchling to Drow..."**: new dark elves wake
  in a cell in a sealed cave complex beneath Velkarath and are trained
  like the humans: Taskmistress Vhal (train, or skip straight to the
  city), Armsmaster Quave (a shirt and a dagger), Blademistress Zeerith in
  the pit (wear your gear, beat a training dummy, bring its stuffing),
  Provisioner Nym (buy a water and a mushroom), then the Spider Stone to
  the Fire Well, which becomes their respawn point. Each door opens on its
  step, and every step has its Journal line.
- **New characters could be refused**: while the server asked "Is that
  correct? (yes/no)", the client's map sync could send its own line,
  which the server took as the answer ("Then what IS your name?"). The
  client now holds its background lines while you log in.
- **Tile editor: walking rules by race** ("Only players of race",
  "Everyone but race").
- **Conversations no longer cut short**: the client's own background
  lines (map saving, lookups) used to be taken as your answer when an NPC
  was waiting for one; they now wait until you've answered.
- **Quest wizard: places and prerequisites.** A step can be "Go to a
  place": a spot (the god's own square with "Where I stand") and how near
  counts; the server sees the player arrive, says the arriving line and
  moves them on. A quest can need another to be finished first, with what
  the giver says until then. Several quests at one NPC no longer get in
  each other's way: steps come first, then reminders, offers, and the
  thank-yous last, so finishing one quest doesn't hide the next one's
  offer. An open Journal catches up when a step is done out in the world.
- **The Eastreach Frontier**, the first quest chain, for every race, at
  the Eastreach ferry port: Warden Marr at the new Warden's Post
  ("Fresh Off the Boat": lizards in the dunes), the dark lookout on the
  ridge and Scout Kell's wild dogs ("The Dark Lookout"), Old Tamsin's
  remedy from the slimer marsh by her cabin ("Roots and Remedies"), and
  the Sand Kings' camp far north in the dunes, a hard finale against
  Lizard Axemen with a scale to bring back ("The Sand Kings"). Rewards:
  leather gloves, a steel helmet, an iron sword and serpent scales.
- **Healing Staff works** (it never had: its script didn't parse).
- **Gold from nothing closed** (an economy check of every shop, script,
  spell and monster): the CoL Bank took negative amounts ("withdraw
  -1000000", then die until the debt shrinks: a free million), the Master
  Quest Blade and Suit were given without the quest key, and the junk-pile
  ruby, the thieves' chest opal and the bronze ore could be collected and
  sold again and again. Shops themselves were sound: they buy at half
  price whatever they sell. (tools/server/fix_economy.py)

## Website

- **Play Now** goes to the browser client (`/play/`). The "Requires
  OpenWebStart" note is gone.
- **How to Play** was rewritten for the browser client. It covers getting
  started, moving, clicking things, the tabs, the hotbar, chat, the bank
  and settings. The old Java and OpenWebStart instructions were removed.
