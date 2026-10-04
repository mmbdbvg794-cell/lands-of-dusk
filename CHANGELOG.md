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
  last chat lines.

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

## Website

- **Play Now** goes to the browser client (`/play/`). The "Requires
  OpenWebStart" note is gone.
- **How to Play** was rewritten for the browser client. It covers getting
  started, moving, clicking things, the tabs, the hotbar, chat, the bank
  and settings. The old Java and OpenWebStart instructions were removed.
