# Handover: the Dusk browser client and server work

State as of 2026-10-05 17:30 UTC. Read this first in a new session.

## What this is

A browser client (this repo, `/root/dusk-browser-client`, git, branch
`main`) for the user's Dusk RPG Java server, plus server-side additions
and game content. The user (they call their character **flan**, a god)
plays and tests; I build, test on a scratch server, and hand over the
commands that touch live.

## Machines and access

- **duskserver** (192.168.4.61): `ssh duskserver` logs in as flan with a
  key. sudo needs flan's password, so **the user runs every `sudo`**
  (restarts). Game dir `~/DuskRPG`; client served from
  `~/dusk-browser-client` by `dusk-web` (serve.py, port 8080); bridge
  `dusk-bridge` (port 8765). Public: https://duskserver.tailaee0f2.ts.net
  (`/play` = client, `/ws` = bridge).
- The container has **512 MB RAM**; the game uses ~166 MB now, ~150 MB free.

## How changes go live (the user runs these, in Claude with `!`)

1. Client: `! cd /root/dusk-browser-client && sh tools/deploy.sh`
   (checks every js file parses, runs `test/*.test.mjs`, copies to the
   server; also copies `server/` sources there). No restart needed.
2. Server classes: `! cd /root/dusk-browser-client && ssh duskserver 'sh -s' < server/build.sh && ssh duskserver 'sh ~/dusk-browser-client/server/install.sh'`
   then the user runs `sudo systemctl restart duskserver` (add `dusk-web`
   when serve.py changed).
3. Content scripts in `tools/server/*.py` and city/spawn bundles: run
   against `~/DuskRPG` (most need a restart; the map, mobs, props,
   merchants and signs files are only read at startup).
- **Never** let a god "save"/"Save map" between installing content and the
  restart: the running server writes its old copy back.
- The auto-mode permission check often **blocks me** from writing live
  game files or running deploy; then I give the user the exact command.
  Allowed for me: `ssh duskserver 'python3 /tmp/install_city.py ...'`
  (the city/spawn installer, after `scp` of the bundle to /tmp).

## Testing (scratch server)

- `~/dusktest` on duskserver (moved out of /tmp, which the 2026-10-06
  reboot wiped): a copy of the game on port 10011, bridge 8767, resources
  8011. `tools/scratch.sh` does it all, run on duskserver:
  `ssh duskserver 'sh -s setup' < tools/scratch.sh` (copy live's game
  files over it; scratch keeps its own users/), then `start`, `stop`,
  `status`. Stop it when not testing: with both servers up the container
  has only ~140 MB free.
- Build server classes for scratch from live's classes:
  `scp server/* duskserver:/tmp/srv-src/server/` then
  `SRC=/tmp/srv-src/server WORK=/tmp/dusk-scratch-build sh /tmp/srv-src/server/build.sh`,
  copy `/tmp/dusk-scratch-build/out/*.class` into ~/dusktest, restart it.
- Locally: ssh tunnel `-L 8767:127.0.0.1:8767 -L 8011:127.0.0.1:8011`,
  `python3 -m http.server 8124` in the repo, playwright-core +
  Chrome at `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`
  (set `localStorage dusk.server = ws://127.0.0.1:8767`). Session
  scratchpads vanish: playwright-core is in node_modules of the newest
  scratchpad `e2e/` dir (or `npm i playwright-core` again). mkchar.mjs
  there makes a character: `node mkchar.mjs <name> <race> <password>`.
- Test characters on scratch: **egate** (god, elf), **hgate** (human),
  password `gatepw1`. Edit `users/<name>` and `.backup` only while logged
  out. Spell levels are `spell\n<group>\n<level>` lines (not `skill`).
- Handy: turn on the client's protocol trace (`#trace`) to read entity ids
  and positions; `goto` only works within view; attacks need adjacency;
  `get <id>` picks up; gods must answer the presence question first.

## Engine facts learned (decompiled source: `~/DuskRPG/src.zip`, unpacked in /tmp/dsrc)

- The engine never counted condition durations; **server/Conditions.java**
  now ticks them once a second (onoccurance, duration, onend).
- Script `number x rand` stores 0 (numbers are whole); use `rand` directly.
- Selling pays half an item's cost; cost 0 can't be sold.
- Monster "level" in the mobs file is ignored (always 1).
- Patches to compiled classes are done with the JDK's ASM in
  server/*Patch.java (Engine, Player, Battle, AttributeManager); originals
  in `~/DuskRPG/storage-originals/`.

## What's live (all of it, after today's restarts)

- Tutorials: human (Quartermaster restored), dark elf (Velkarath), elf
  (Grove of Waking, 408-473 x 1290-1325). Cities: Aelindor (shops only for
  elves or after the Elder's quest), Velkarath. Ferries.
- Item maker (God tab → Items: When used / While worn → scripts), fixed
  potions (`tools/server/fix_potions.py`).
- Who's online (`server/Who.java` → `~/DuskRPG/who.json`, `who.html`).
- Quest wizard (God tab → Quests…, `js/quests.js`, `server/Quests.java`):
  talk/bring/kill steps, kill counting (BattlePatch), who's on it.
- Richer conversations: and-also conditions, random lines, once/again
  after N minutes (server flag timers), Try it preview.
- Spell audit (`tools/server/fix_spells.py`): conditions tick, bless/
  armor/focus/curse/regenerate/tire/prayer/scan/warp fixed, herbology
  brews unsellable potions, translate & counter poison disabled,
  untrainable spells removed, telepath copies to flan, food lasts 45 min,
  AC bonus shows. Cooldowns in `~/DuskRPG/spellcooldowns` (2 s shared +
  per spell; gods exempt; spellbook/hotbar countdowns).
- Spawn areas (`tools/world/spawns.mjs`): 576 monsters in 162 dens over the
  new lands, by biome and distance from the ferry landings. A missing
  `demonskin` condition was added after the 17:28 restart (Imps load
  cleanly from the next restart).

## 2026-10-05 evening

- LIVE (restart 17:53): quest wizard place steps, prerequisites, stage
  ordering, Journal refresh. Live is missing the Healing Staff fix until
  the user runs `tools/server/fix_healing_staff.py ~/DuskRPG --apply`
  (no restart needed).
- Eastreach Frontier quest chain (`tools/world/cities/frontier.mjs`,
  built with `node tools/world/city.mjs <plan> <shortmap> <out> <props.json>`,
  props.json = the defProps texts of Villager Woman, Guard, hermit, chair):
  tested on scratch end to end (hgate). Install on live with
  install_city.py, then restart (no god save in between). City plans can
  carry quests (`plan.quest`); quests save their chain `depth` (thank-you
  order). Quests 1-3 suit a fresh character in tutorial gear (a cloth
  shirt makes black dogs and slimers harmless; wolves and green blobs
  killed one); quest 4's Lizard Axemen (300 HP, str 40) are a hard
  finale by the user's choice.
- Economy check done: `tools/server/fix_economy.py` (CoL bank negative
  amounts = free gold, Master Quest items without the key, repeatable
  ruby/opal/ore). Applied and tested on scratch; live awaits
  `python3 fix_economy.py ~/DuskRPG --apply` (no restart). Not fixed,
  reported: crystal box / nova package / bloody book (250-500k shop items)
  have no use scripts; the fire orb / reward note chain (7_966, 25_974,
  32_978) uses items that don't exist and 7_966 has an unclosed quote.
- Client changes since the last deploy: the wizard's depth lookup and
  "an iron sword" (needs `tools/deploy.sh`).

## 2026-10-05 late (NOT live yet: needs deploy + server build/install + restart duskserver AND dusk-web)

- Ferries 2x faster (Ferry.java step 125 ms, ferries file "step <ms>") and
  smooth glides (world.js pace(), ships.js): tested aboard on scratch.
- Music rewritten (atmosphere.js), on by default: measured audible.
- God controls (server/Admin.java, God tab Server section, leaderboard.html,
  js/leaderboard.js, serve.py serves leaderboard.json): tested on scratch
  (Server panel, restart 10 s countdown, exit; leaderboard.json written).
- Painted ground blending (js/blend.js, renderer drawBlends): wandering
  edges between plain ground kinds, rounded where boundaries turn,
  checkerboard corners resolved by a hash. Tested by screenshots on
  scratch; a few small straight bits remain in busy checkerboard spots.
  Client only (deploy). The friend's screenshots: pixel.png / smooth.png
  in the repo root (not committed).
- Client deployed 21:3x with ferry glide, music, god panel; the blending
  is committed after that deploy (needs another deploy). Server side
  (faster ferries, restart, leaderboard) needs build/install + restart of
  duskserver AND dusk-web.

## 2026-10-05 night

- LIVE: painted big trees (js/trees.js, depth-sorted with people, fade
  in at the edge, explored map beyond the view), pixel terrain blending
  (js/terrain.js, cached per square), bundles (fix_bundles.py), item
  scripts from ~/DarkStarDusk2002 (fix_items.py; god/test items left
  plain), "use" message (LivingThingPatch), economy fixes.
- Installed 23:14, needs a restart (no god save before it): Herbalist
  Wenna at 32,126 and the hermit's new script (tools/world/cities/swamp.mjs,
  quest "The Neon Rose"), swamp scripts fixed (fix_swamp.py, fumes floor
  at 1 HP since script damage can't kill), and EquipmentPatch: the
  engine's isWearing took an item ID, so every "isWearing trigger <name>"
  script was dead (swamp, shovel 212_151, pick 467_54, flame robe 394_393).
- Engine facts: script "inc trigger hp" can't kill (hp goes negative);
  a script's stale .dsko beside it is run instead (install_city now
  deletes it when replacing); the fairy glade (41-59 x 49-67, the Fairy
  King) is sealed off from the rest of the world.

- Old-script sweep LIVE (no restart needed): tools/server/check_scripts.py
  (run it after content changes) and fix_scripts.py (88 mended, 5 stray
  walk-on files removed, 4 typos). Left: missing content the scripts
  expect (Champion vault key1-key10 and Sword1-Sword10 at 18_978 etc.,
  the fire orb / Reward Note chain, the topaz and aquamarine the summons
  need); extra "end"s are harmless and left.

- 2026-10-06 lost quests: "The Fire Orb" LIVE (tools/world/cities/fireorb.mjs,
  far-south enclave reached via the tree at 3,4; tested end to end on
  scratch); fix_item_files.py (38 item files that couldn't load: capitals
  in the name, no "type" first) LIVE; gems (add_gems.py) LIVE, drops on
  monsters after a restart. The Champions' Gauntlet
  (tools/world/cities/gauntlet.mjs) installed 2026-10-06 00:2x, needs a
  restart for its champions and sign: entrance 37,966, ten champions
  (keys key1-key10), back door 6,988 (flag gauntlet_hall), prize the
  Champion's Blade (mod 900) once, flag Champion. Tested on scratch
  (doors, back door, clerk, a champion's key drop). Scratch's egate was
  given huge stats for that test.

- Kingshaven, the human capital (tools/world/cities/capital.mjs, at flan's
  "Human Capital" note 1452,357): walls x 1388-1485, y 320-397, harbour
  and sprawl outside; Lantern Row houses to rent (server/Housing.java,
  "housing" = houses, "houses" = who rents; landlord talk "rent" effect
  in js/dialogue.js; Quests.setTimer takes the key back). Built and
  tested on scratch (rent, renew, info, doors, bed). Not yet live: needs
  deploy + server build/install + install_city (bundle in /tmp/capital.json
  on duskserver) + restart. LIVE since 03:36. Ferry port added 03:4x
  (Royal Swan to Westsea, Gannet to Eastreach, Captain Rowan on the long
  middle pier; routes tools/world/routes/kingshaven-*.txt): live since
  the 03:54 restart. (A voyage before that restart landed flan in the
  sea: the ferries file hot-reloads but map changes don't, so the new
  pier wasn't in the running map yet. Install map + ferries together,
  restart, then sail. Ferry.rescue skips gods, so a god left at sea stays.)
- Wild dens inside Kingshaven (spawn pass, before the city): spawns.mjs
  KEEP_OUT now covers 1366,282-1526,454; tools/server/clear_mobs.py
  removes the 12 already in the live mobs file (copied to
  ~/DuskRPG/clear_mobs.py; user runs it --apply, then restart).
- Painted art: stone walls 58/59/97/98 were painted as flagstone and read
  as floor; now ashlar block walls (painter.js ashlar(), deployed
  2026-10-06). Kingshaven's bank is now brick ('B') and a row lower (it blocked the Fletcher's
  door). Plans can now drop moved props (plan.dropProp -> bundle
  dropProps; install_city.py takes them out). Rebuild Kingshaven against
  the pre-city map (scratchpad capital/live-shortmap, 03:21): its
  mayBuild refuses its own walls on the live map.

- Pixi spike (2026-10-06, since folded into the game as js/lighting.js): http://192.168.4.61:8080/spike-pixi/ was the
  normal game (index.html via spike-pixi/make-page.sh, run by deploy)
  plus spike-pixi/spike.js, a PixiJS 8.22 WebGL layer over the map:
  night as a render texture with light holes (erase blend) + coloured
  glow (max blend; the layer can only paint over the map, not brighten
  it), lights from tiles 24 (torch), 35/108/130 (lava), 96/128
  (crystal), candlestick stands, the player's lantern and spells;
  spell sparks under pixi-filters 6.1.5 AdvancedBloomFilter. Panel:
  toggles, time slider (T steps it), FPS. main.js shares
  window.__dusk (world, ships, renderer) when window.duskSpike is set.
  Tested headless at 231,197 on scratch (torches and lava). Not yet
  tried on a phone.
- Creature walk frames: bestiary families wolf/dog, bear, slime,
  skeleton and person paint a "<name> walk" frame (57 of 148); the
  renderer shows it for the first half of a step (World.walking). The
  named sheet is now a 16-column grid of 256 px frames (a strip would
  pass Chrome's 32767 px canvas width); main.js loads it with size 256.

- Phone slowness (2026-10-06): not Pixi. A map draw took ~75 ms on a
  fast machine (~450 ms at 6x CPU throttle), almost all drawImage from
  the 4096x2560 named sheet with smoothing (the browser reworks the whole
  sheet per shrink). SpriteSheet.draw now shrinks each frame once at the
  shown size and keeps it (400 a sheet): 12 ms throttled. Profile
  harness: scratchpad e2e/prof3.mjs (drawImage time by source).

- Creature AI (server/Creatures.java, 2026-10-06; installed, live after
  restart): nothing ever called Faction.runAI, so creatures only moved in
  fights. Ported it (600 ms turns for creatures a player sees) with fixes:
  DuskTable groups same-named things in a Vector and runAI skipped those
  (packs never counted each other, so everything fled), the old AI's
  "a <name>" (this server's "a" takes an ID), and checkCanBattle refuses
  fights with clanless players (PvP rule) so creatures start fights
  directly (keeping canAttack/safe, pets, shops, adjacency). Leash 8 from
  home, back to 4. Grudges are factions/<name> (old game's, flan -1 with
  most: creatures flee a god). touch conf/creatures-debug for log lines.
  Tested on scratch: wolf pack attacked hgate (factions/wolf hgate -1.0
  there; scratch also has conf/creatures-debug).

- 2026-10-06 12:39: duskserver (CT 303) rebooted after its disk moved to
  NVMe. Checked after boot: everything installed is live (creature AI,
  real addresses via the bridge, storage chests, all server sources match
  the repo). fix_healing_staff and clear_mobs were already applied
  (dry runs: nothing to do). Nothing awaits install or restart.

- Shop audit 2026-10-06 13:05 LIVE (tools/server/fix_shop.py, no restart):
  war axe 700, pyramid studded necklace 1200, steel helmet 1500, diamond
  belt 2000, arrow 2, quiver 20; free ale at 176,129 once per character
  (flag freeale_given); MTH toll squares and the 441,54 thief can't push
  gold below 0. Checked and fine: buy/sell, buy-use-resell, quest rewards,
  Trade/Storage/Housing, slots (-30% EV), monster drops. Create Food/Drink
  sandwich/ale resale left alone: not in the clerical spell list, so
  nobody can cast them.

- Phone check 2026-10-06 (scratchpad e2e/phone.mjs, stepprof.mjs): headless
  Chrome at 390x844, 3x density, 4x CPU throttle can't judge phones:
  WebGL and canvas raster are software there (Pixi 4 fps, plain page
  ~14 fps while walking), while the page's own JS is nearly idle (~70 ms
  of 5 s walking). Needs a real phone: /play/spike-pixi/ is live and current.

- Three quest chains, installed on live 2026-10-06 15:45 (need a restart
  of duskserver, with no god save before it, and a deploy so the Painted
  art draws the new monsters). Each is 3 quests, a new giver, new
  monsters (defMobs files written by the plan) and an unsellable token
  item; all 9 played end to end on scratch (hgate, dgate):
  tools/world/cities/kingswatch.mjs (Sergeant Wexley, Watch post outside
  Kingshaven's east gate 1502,342: stray hounds in the meadow north of the
  farms, thieves on the wooded point, the barrow in the NE hidden valley),
  deeppatrol.mjs (Patrol Leader Jhaelra by the Fire Well 1356,914: cave
  slimes NE cavern, duergar at the NW cavern's mouth, magma slimes and an
  ember dragon in the Ember Hollow), greenwardens.mjs (Ranger Faelwen on
  the road north of Aelindor 466,1206: lake slimers, shrine gargoyles on
  the western mountains' slopes, the withered grove far east).
  Lessons: dens in thick trees can't be seen (line of sight) or reached;
  a den's kills set the whole faction on you, so bosses get a faction of
  their own; don't put dens by the stairs from the surface (1269,910).
  Monster drops go straight into the killer's pack.
- Client fix committed (needs deploy): in the pixel art style (the
  default) a walking creature threw in Renderer.draw every frame, so the
  map broke whenever creatures moved (since the creature AI went live).
- Test harness: scratchpad e2e/qrun.mjs (talk/kill/walk/journal steps,
  reads entities from window.__dusk with localStorage dusk.debug) and
  tools/uedit.py on duskserver /tmp (moves/boosts a scratch character).
  A test character much stronger than a den makes it flee (creature AI).
- Seen, not checked: conf/onDeath reads "set trigger locxy 83 trigger
  bindlocx trigger bindlocy" (the 83 looks wrong).

- Lighting in the real game (2026-10-06, needs deploy): the Pixi spike
  became js/lighting.js, started by main.js unless Settings > Lighting is
  off (dusk.lighting; on by default). Pixi 8.22 + pixi-filters 6.1.5 from
  jsDelivr through the import map in index.html, fetched only when
  lighting starts; if it can't load (or no WebGL) the normal night stays
  and the switch greys out. #lights at the end of the address shows the
  test panel (fps, time slider). spike-pixi/ is gone; deploy removes it
  on the server. The user tried the spike on a phone: page 60 fps, layer
  28-30 (its idle cap), smooth; the small jumpiness is the same without it.
  Tested headless on scratch: on, off/on in Settings, off from the start,
  CDN blocked (scratchpad e2e/light.mjs).

- Help tab + chat hint (2026-10-06, needs deploy): index.html #tab-help
  (moving, chat prefixes ' ; / : emote, fighting, things, quests,
  settings); the command box says "' to say, ; to gossip".
- Night lights (2026-10-06), installed on live 16:51, need a restart (no
  god save before) and a deploy: tools/server/add_lights.sh (map.gif tiles
  160-167 = torch on walls 59, 58, 98, 97, 60, 62, 101, 49 via
  torchwalls.py; sprites.gif 55-57 = brazier, lamp post, campfire via
  lightsprites.py; defTileScripts 160-167 false; tilecap 168), painted
  versions in painter.js / items.js, light sources in js/lighting.js.
  Placed by tools/world/lights.mjs + cities/lights-{kingshaven,aelindor,
  velkarath,eastreach}.mjs (Kingshaven 142 torches 30 lamps, Aelindor 34
  + 14, Velkarath 99 + 45 braziers, Eastreach 5 + campfires at Kell's and
  the Sand Kings' camps). Westsea is only a pier road; the old world's
  towns aren't lit yet. paintart/build.sh takes GAME=<dir> (and RC) to
  paint from scratch.

## Open / ideas (ask the user before starting)

- Play-test feedback on today's changes (spawns difficulty, hunger, spells).
- Shop price / exploit check across shops. More quest chains (Aelindor,
  Velkarath, the old world).
- God tools: restart button, admin page; leaderboard; owned ships.
- Not touched: god/test items with missing use scripts (alpha, coolaexp...).

## More notes

My memory directory (`~/.claude/projects/-root-dusk-browser-client/memory/`)
has session-state, server-source, tile-walkability, duskserver-access and
future-ideas notes. `CHANGELOG.md` is the player-facing log (not updated
for today's spell/quest/spawn work yet).
