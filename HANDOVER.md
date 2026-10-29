# Handover: the Dusk browser client and server work

State as of 2026-10-29 UTC. Everything below is live
unless it says otherwise; the repo is committed (last: see git log).
The newest work is at the end of the file; "Open / ideas" sits before
the 2026-10-28 sections.

**Start here (2026-10-29):** everything built is live, with no staged
installs waiting for a restart. Commits since 6de0e47 are not pushed yet
(push only when the user says "push it"; see the memory note on the GitHub
remote). Rules learnt the hard way:
- install and restart together;
- never edit an online player's file (check who.json);
- no god "save" between an install and the restart;
- signs show names only;
- NPC lines are short;
- hidden places get rumours, not signposts.

LORE.md is the lore bible. It opens with the rules for writers and ends
with every open thread, ready to hand to Claude on the web. Lore made
there comes back as proposals (decision S onward) for flan to decide, and
then gets built here.

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
- conf/ scripts (onStart = the login welcome, onDeath, canAttack, ...) and
  conf/prefs need no restart: flan types the god command `reloadprefs`
  (re-reads them all; the tracker is off, so nothing else happens). The
  conf/*.dsko timestamps show it ran.
- dusk-web (serve.py) restarts without the user, as part of a deploy:
  `ssh root@192.168.7.28 'pct exec 303 -- systemctl restart dusk-web'`.
- **Never** let a god "save"/"Save map" between installing content and the
  restart: the running server writes its old copy back.
- A **new server class** must go into build.sh (cp and javac lines) and all
  four class lists in install.sh; after install check
  `ls ~/DuskRPG/<Class>.class` before restarting. Install and restart go
  together (a half-new class set breaks logins). With nobody online (or the
  user's go-ahead) I restart from the host:
  `ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'`
  (no shutdown hook: it saves nothing); else flan types `restart 10`.
  Check with `ps -o lstart= -C java` on duskserver (two lines while
  scratch runs).
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

- Help (2026-10-06, LIVE): a Help button beside Map opens #help-dialog
  (moving, chat prefixes ' ; / : emote, fighting, things, quests,
  settings); the command box says "' to say, ; to gossip".
- Night lights (2026-10-06, LIVE since the 16:58 restart and the deploy): tools/server/add_lights.sh (map.gif tiles
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

- Action list gone (2026-10-06, LIVE): the server only ever offers one of
  sleep / wake / flee (Player.updateActions). Sleep/Wake is a button on
  the conditions row (panels.js renderStats, .cs-rest); Flee is on the
  target card (#target-flee), which shows "In a fight" with nothing
  targeted (a creature that attacked you). panels.onActions -> updateTarget.
- Weather in the lighting layer (2026-10-06, LIVE): js/weather.js draws
  rain with wind, snow drift, fog banks, fireflies, embers off fires and
  lightning (lifts the night) in lighting.js's Pixi stage (below the
  night: rain/snow/fog; above: fireflies/embers/flash). Pooled Pixi 8
  ParticleContainer (no emitter package: @pixi/particle-emitter only
  supports Pixi < 8). setWeather({type, intensity, wind}) sets
  atmosphere.override: one source for Pixi, the canvas fallback
  (atmosphere.drawWeather off while Pixi draws) and the rain sound;
  'clock' goes back to the shared clock. Max at intensity 1: rain 600,
  snow 400, fog 8, fireflies 40, embers 80; halved on low-end (<=4 cores
  or short screen side <=420; localStorage dusk.lowend 1/0 forces it).
  Rain/snow/lightning run the layer at full rate, fog/fireflies/embers
  at the 30 fps idle rate; paused when the tab is hidden. CPU cost
  measured <=0.6 ms/frame for the whole layer (panel shows layer/weather
  ms). Embers (dusk/night/dark sky) and fireflies live in world squares
  (no trails when walking). Fireflies only in green country (grass,
  meadow, woods with no wall/paving within 3 squares), and anywhere in
  Aelindor (box 425-510 x 1175-1280); blue wisps on Underdark floors.
  Indoors: areas closed by walls/doors with no open ground in them
  (indoorSquares, test/weather.test.mjs) plus hand marks: js/indoor.json
  (shared, deployed; empty so far) and the panel's Mark indoor (this
  browser, dusk.indoor; Copy marks gives JSON to fold into indoor.json).
  Panel (#lights): weather buttons, intensity, wind, effect toggles,
  show/mark indoor. The user tried it on a phone: smooth, approved.
  NOT doing a real-weather feed (the user's brief asked for one; they
  dropped it). Weather stays random from the clock.
- Proposed next, waiting for the user's go-ahead: weather per continent
  (find the landmasses from the map, a table of name + odds per
  continent, weatherAt(now, region) with a per-region seed; the sea its
  own stormier odds; client only, a few KB, no server cost), with fog in
  the random rotation and intensity/wind varying per 15-minute slot.

## 2026-10-06 evening

- Weather per continent LIVE (deployed 18:5x): tools/world/regions.mjs
  bakes js/regions.json from the map (4-square cells, landmasses named by
  seed points, sea within 32 squares of land shares the land's weather):
  old (Old World + its west isle), north (Kingshaven's), south
  (Aelindor's), east (Eastreach's + the isle off it), mid (the land
  between north and east, 1596-1951 x 760-1139), sea. atmosphere.js
  CLIMATES holds each one's odds (clear/rain/storm/fog) and weatherDetail
  (now, region) rolls weather, intensity and wind per region per 15-minute
  slot. The #lights panel shows the region. Rerun regions.mjs only when
  land changes a lot.
- Old-world town lights LIVE (restart 19:12; checked at night on scratch,
  screenshots of the City of Light and the Midnight Pub town): tools/world/cities/lights-{cityoflight,midnight,firetown,
  riverside,northwest}.mjs (236 torches, 37 lamps/braziers). lightsPlan
  takes `clear` (1 for the old world's 3-wide streets) and these leave out
  natural rock (49).
- Chat tip LIVE (no restart: Talk recompiles changed scripts): the
  Recruiter (live only, backup in DuskRPG/backups/chat-tip-20261006; also
  dropped an empty answer and a stray quote), Warden Elarion and
  Taskmistress Vhal (CHAT_TIP in grove.mjs / velkarath.mjs).
- conf/onDeath is fine: "set ... locxy" reads a dummy value first (the
  engine's set always parses one value before the switch), so the 83 is
  ignored and the dead go to their bind point with 5 HP and "safe" (120 s).

## 2026-10-06 late evening (all LIVE since the 19:51 restart)

- Bug reports to the gods (server/Mail.java, hooked in Props.command and
  Skills start): the bug dialog's Send also sends "bugreport <subject>
  <body>" (URL-encoded) when logged in. Every character with privs >= 2
  gets it in the chat now, or from mail/<name> when next in (checked
  every 3 s, after blnWorking, seen twice). The chat copy keeps what the
  player wrote and the Character line; everything goes to the
  "bugreports" file. One report a minute per player (gods exempt).
  Client deployed; classes built and installed. Tested on scratch
  (offline waiting, online at once, rate limit).
- The New messages pill covered the yes/no bar's No button (the god
  presence question): it moves up while the bar shows (deployed).
- God tools (tools/server/god_items.py, applied): moo (full heal, kept),
  chaos orb / shifty box (armour sets), exp / coolaexp / godexp (exp,
  gold), cyrils elixer (10k MP), smek p (+999,999 max HP). privs >= 3
  only, "Only gods can use this." otherwise; uses -1 so a refused try
  doesn't use them up; cost 0. Tested on scratch (egate/hgate). alpha,
  beta, dmwexp, fixup, lightning bolt, book of ramaden stay plain.
  Items can be used by id only ("use <id>"; use "<name>" says nothing).
- Restarting: the user's `! ssh duskserver sudo ...` silently didn't run
  twice (no tty for the password). What worked: flan types `restart 10` in
  the game (Admin.java, privs 5; exits with code 3, systemd brings it back,
  no map save). Suggest that first.
- install.sh copies a fixed list of classes: a new server class must be
  added there (and to build.sh's lists), or the restart can't find it.
- More old-world lights (installed): lights-{westsea,westisle,frosthall}.mjs.
  The spy village (83,6) is inside the north-west village's box, already
  lit; 514,5 and 284,151 had nothing to light; the specks at 977,938
  were skipped.

## 2026-10-06 night: area music, Phase 1 (NOT live: needs deploy)

- The user's brief (area-music system, Howler.js, no protocol change) is in
  the 2026-10-06 session; Step 0 found the server never sends music
  (playMusic/updateMusic are empty stubs, conf/prefs "music off", rc/audio
  empty; the battle code calls playMusic(1)/(0) at fight start/end).
  The user chose: moods by location, generated music kept as the fallback,
  Howler in Web Audio mode (fades and volume work on iPhone; ~20 MB a
  minute decoded, at most 2 tracks held).
- js/music.js: MusicPlayer (crossfade 2.5 s, same mood keeps playing,
  next track fetched after 8 s of play, a track fades into another of its
  mood 2.5 s before its end, pause on hidden tab, bad files skipped),
  moodAt (underground > sea (aboard a ferry or region 'sea') > town box >
  night/wilderness), TOWNS (the lights-*.mjs boxes), moodForType (opcode
  12: 0 place, 1 combat, else wilderness), musicPanel (#music, #music-test).
  main.js: mood checked every 2 s and must hold for two checks; Settings
  music slider (dusk.musicvolume), Music switch (dusk.music).
  atmosphere.js: the generated music now goes through its own gain at the
  music volume straight to the speakers (not the sound effects' volume or
  Sound switch). Howler 2.2.4 from cdnjs (script tag with SRI, defer).
- music/manifest.json (empty: live keeps the generated music),
  manifest.test.json + music/test/*.mp3 (ffmpeg test tones), README.md
  (adding a track, ffmpeg, licence checklist), tools/music_compress.sh,
  tools/music_credits.py (deploy runs it on the server: tracks into
  ~/DuskRPG/web/credits.json, entries marked "from": "music").
- ffmpeg was installed in this container (CT 305) for the test tones and
  music_compress.sh.
- Tested: test/music.test.mjs (fake Howl); headless Chrome with the real
  Howler (#music-test: mood switches, crossfade at a track's end, max 2
  held, unload); on scratch logged in as hgate at 455,80 -> town.
- Phase 2: now playing done (below); combat music on hold by the user's
  choice; crossfade lengths not retuned (2.5 s).

- 2026-10-06 late: first real tracks (NOT live: needs deploy). Originals
  in music-incoming/ (gitignored, not deployed). town: The Bard's Tale and
  King's Feast loops (RandomMind); night: Contemplation (Joth);
  underground: Dark Cavern Ambient loop _002 (Paul Wortmann), Loopable
  Dungeon Ambience (JaggedStone), Dungeon Ambience (yd, "Dungeon of
  Galhur"); all CC0 on OpenGameArt. "overworld" = wilderness, "dungeon" =
  underground. morning_2d.2.ogg was given as Sunset Plains (Yoiyami) but
  that page only has sunset_plains.wav (63 MB, ~6 min): held back, asked
  the user. music_compress.sh now uses one fixed gain (to -18 LUFS, peak
  <= -1 dBTP) instead of loudnorm (which would put a level step in a
  loop's join) and keeps the sample rate. Manifest "loop": true: Howler
  loop, no fade, LOOP_MIN_S 180 then hand over at a pass end; a mood's
  only loop keeps going. Chrome decodes the MP3s to the exact original
  sample count (LAME gapless header), so loops are gapless there; Safari
  not checked. Join clips: music-incoming/seams/*-join.mp3 (last 4 s +
  first 4 s); King's Feast and Dark Cavern measured a possible small click
  at the join, Bard's Tale's is its first beat, Loopable Dungeon is clean.

- 2026-10-07: morning_2d.2.ogg is "Morning Sky" by Centurion_of_war
  (CC0, https://opengameart.org/node/179462; the user confirmed it's
  that, not Sunset Plains): music/wilderness/morning-sky.mp3, loop (join
  measured clean, exactly 132.000 s). Now playing: MusicPlayer onTrack
  (once per different track), #now-playing over the map for 5 s (top
  centre; bottom left on phones <= 600 px, where the hotbar is along the
  top), Settings "Track names" (dusk.tracknames). Combat music: the user
  decided against it for now (quick fights would make the music jumpy).
  Needs deploy (it also updates the credits).

- 2026-10-07: the top-bar speaker is now a master mute (dusk.muted):
  sound effects, rain and all music. Settings' Sound and Music switches
  stay separate (dusk.sound, dusk.music). An old saved dusk.sound 0 (the
  speaker used to flip it) becomes muted on first load. The user reported
  music playing while the speaker showed muted.

## 2026-10-07: old-world quest chains (LIVE: installed 02:47, restart 02:51, deployed)

- Three chains, 3 quests each, the user approved the plan (Firetown moved
  to the east-field village: Firetown is Cyril's "hell", reachable only by
  a dead demon's walk-on script, and there's no demon race):
  tools/world/cities/zilen.mjs (Tombkeeper Aldous in King Zilen's
  graveyard 42,111: grave thieves in a glade off the City of Light's south
  road (x 106) at y 280, the robbers' leader in a ruined tower glade at
  y 250, the crypt of the king's guard dug from sealed forest 12-55 x
  236-279, stairs in the robbers' glade), izaru.mjs (Foreman Dask outside
  the Izaru Mine Shop 441,82, stairs on Midnight's plaza 450,85, the mine
  dug from rock 340-403 x 280-333: workings, miners' camp, deep chamber
  with the stone dragon), frozenreach.mjs (Reeve Tamsin in the east-field
  village 530,14: frost wolves in the field's south, a gap cut in the tree
  line 694-698 x 216-217 opens the frozen land 676-810 x 215-365 (sealed
  until now), frost bears, ice skeletons and the frost dragon at ~795,325).
  Old-world plans need oldWorld: true + mayBuild (only trees, grass, paths,
  rock), and install_city.py --old-world.
- js/atmosphere.js UNDERGROUND gained the crypt and mine boxes (dim,
  no weather, underground music; the world map keeps them apart).
- Old world facts: the shortmap is column-major (x*rows + y). Outside towns
  the old world is solid forest (tile 64/103) and rough rock (49) with roads;
  areas are linked by walk-on teleports (defMoveActions "set trigger locxy
  x y"). Reachable from the start points and ports: the City of Light and
  its south road, the NW village, Midnight, a 141-square desert strip south
  of it, the east field. Not reachable: Firetown, the rest of the desert,
  the grey "Hell" rock. Scratchpad ow/: render.py (map picture),
  reach.py/verify.py (walkable + teleport reachability, bundles applied).
- All 9 quests played end to end on scratch as egate. Live install was
  blocked for me: bundles are in duskserver /tmp ({zilen,izaru,frozen}.json,
  dry run on live matched), the user runs `ssh duskserver sh
  /tmp/oldworld-install.sh`, then `restart 10` in game (no god save
  first), then tools/deploy.sh (underground boxes; Painted art for the new
  monster names). The Frozen Reach gap was widened to 690-698 x 216-218
  after the first scratch run (a tree at 692,217 stood in front of it).
- Scratch test harness: scratchpad e2e/oq.mjs + chains.mjs (egate as a god:
  teleport, talk, kill with "a <id>"). egate on scratch was weak (20 HP);
  boosted to 6000 HP, str 90 in users/egate(.backup).

## 2026-10-07: admin page (LIVE since the 03:05 restart)

- js/admin.js + #admin-dialog: a window in the game for gods, from the God
  tab's Server section ("Admin page…") or #admin in the address (opens
  once the presence question is answered: it swallows the first command
  sent, and covered the question on phones). Server status + restart,
  who's in the game (race, HP, exp, where, online for, address; Go to =
  "teleport <name>", Ban = "ban <name>" with a confirm), bug reports
  (newest first, expandable), recent logins, today's errors; refresh
  every 30 s while open. Server: Admin.java "admin players|bugs [n]|
  logins [n]|errors [n]" (gods), reply lines AdminPlayer:/AdminBug:
  (URL-encoded)/AdminLogin:/AdminError: and Admin<Kind>: done|count.
  Tested on scratch (egate, a bug report from hgate; desktop and phone).
- To go live: tools/deploy.sh, then `ssh duskserver sh
  dusk-browser-client/server/build.sh`, `ssh duskserver sh
  dusk-browser-client/server/install.sh`, then `restart 10` in game.

## 2026-10-07: bounty boards (LIVE: installed 09:41, restart 09:43, deployed)

- tools/world/cities/bounties.mjs: 7 boards (Kingshaven 1449,352; Aelindor
  478,1227; Velkarath 1344,907; Eastreach 1675,1305; City of Light 104,153;
  Midnight 444,83; Southfield 535,16), each 3 posters (props looking like
  the newsboard, named "<Monster> Bounty") + a "Bounty Board" sign; each
  poster a repeatable kill quest bt_<board>_<1-3> (kill, then claim at the
  poster), rewards 40/60, 90/160, 180/350 gold/exp (Lizard Axemen 220/450).
  One bounty a day per board: quests.js `again: { minutes, flag, says }`
  (repeatable only) puts a `once` with a flag timer on the accept answer;
  the board's posters share flag bounty_<board> (1200 min). The quest wizard
  has "Taken again after (hours)", "Shared wait flag", "…until then they say".
- city.mjs: things placed off the plan's grid are fine now (left off
  plan.txt), so one plan can spread over the map with a 1x1 grid.
- tools/paintart/items.js: noticeBoard painter for /bounty|newsboard|notice
  board/ props (names like "Highway Thief Bounty" were being painted as people).
- Tested on scratch (egate): take, second poster refused, kill 6, claim,
  retake refused, another board taken; flagtimers has bounty_kh/bounty_sf.
- To go live: `ssh duskserver sh /tmp/bounties-install.sh` (bundle staged in
  /tmp, dry run matched), `restart 10` in game, then tools/deploy.sh.

## 2026-10-07: world bosses (LIVE since the 11:57 restart)

- server/WorldBoss.java (started from Skills, command hooked in Props,
  kill hook in Quests.killed; in build.sh and install.sh lists): every
  `every` ± `spread` minutes (180 ± 60; the first after half that) one boss
  from the "worldbosses" file rises at its lair (new Mob), "World boss: ..."
  to everyone; a reminder at half time; leaves after `stay` (60) minutes if
  unbeaten. Everyone on the winning side when it dies gets gold 300, exp
  800, its trophy, and a 25% roll for one of its rare items. "boss" for
  anyone (reply starts "Boss: "), "boss spawn [name] | clear | reload" for
  gods. Bosses saved with the map are removed at start; spawn deletes the
  boss's stale defMobs .dsko (the engine reads the compiled copy first).
- tools/world/cities/worldbosses.mjs: Ursok the Dread Bear 1544,301,
  Fenris the Great Wolf 610,1211, Kraghul the Warlord 1608,1202, Morvane
  the Skeleton King 620,107 (1,100-1,400 HP, str 52-58, respawn 0),
  trophies (dread bear tooth, great wolf fang, kraghuls war flag, skeleton
  kings crown), the worldbosses file.
- Client: "World boss: " lines show #boss-banner over the map for 12 s
  with a rumble; Help mentions bounty boards and `boss`.
- Tested on scratch (egate, hgate): rise + banner, boss command, fight,
  reward with a rare, fall announcement, clear. egate deals ~40 a round;
  2,500 HP was too slow, so bosses were lowered to 1,100-1,400.
- To go live: tools/deploy.sh; `ssh duskserver sh dusk-browser-client/
  server/build.sh`; `... server/install.sh`; `ssh duskserver sh
  /tmp/worldbosses-install.sh` (bundle staged); `restart 10` in game.

## 2026-10-07: area sounds, player mail + parties (all LIVE since the 12:49 restart)

- js/ambience.js: AreaAmbience (Web Audio beds wind/waves/cave + one-shots
  birds/crickets/owls/gulls/drips/frogs) from areaCounts(tiles in view) +
  areaMix({ light, underground, town }); main.js updates every 2 s;
  Settings "Area sounds" (dusk.ambience); through Sound's master.
- Player mail in server/Mail.java: mailbox/<name> (id|from|when|read|text),
  "mail send|list|read|delete", MailNew at once or at next login; js/mail.js
  MailView = the Mail tab (unread badge, reader with Reply/Delete, compose).
- server/Party.java (in build.sh/install.sh lists, started from Skills,
  command in Props): party invite/accept/decline/leave/kick/say, max 6, in
  memory; "Party: leader|name:hp:maxhp:x:y,..." every 3 s; Quests.killed
  credits winners' party members within 20 squares (Party.withParty).
  js/party.js: #party-frame (HP bars), #party-invite toast, "%" = party say,
  "Invite to party" in a player's click menu (actions.js).
- Tested on scratch (egate, hgate): letter while offline, login notice,
  read, reply, instant notice, delete; invite, join, frames, party chat,
  shared bounty kill, leave.
- Deploy, build and install done 12:16 (backups/classes-20261007-121606);
  waiting only for `restart 10` in game. Check afterwards: java start time,
  then "party" / "mail list" answer in game.

## 2026-10-07: achievements + profiles (LIVE since the 12:49 restart; profiles.json also copied beside the web pages)

- server/Achievements.java (lists, Skills start, Props command): the
  "achievements" file (tools/world/cities/achievements.mjs: 19 of them),
  achieved/<name> (earned|id|ms, count|key|n). Counts: Quests.killed for each
  credited player (winners + party), WorldBoss.reward, a bt_ quest's kill goal
  done (bounty), a 30 s check for flags/exp. A player's first check of the
  session is quiet (one line listing what they'd already done); later ones
  say "Achievement: title|what" (client: gold banner) and announce to all.
  "achievements [name]" -> Achv: lines; "achievements reload" (gods).
- Admin.writeBoard also writes profiles.json (leaderboard's players: stats,
  worn gear from the users file's <slot>2 keys, finished quests by title from
  quests/*.json, achievements, online); serve.py serves it; profile.html +
  js/profile.js; leaderboard and who's-online names link to it.
- Client: js/achievements.js in the Journal tab (list with progress, link to
  your profile).
- Tested on scratch: quiet catch-up, First Blood banner + announcement, list,
  profiles.json (dgate), profile page.
- To go live: `ssh duskserver sh /tmp/achievements-install.sh`, then
  `restart 10` (this restart also turns on mail and parties).

## 2026-10-07 afternoon: sound levels, weather duck, battle swings (client only, deployed)

- Sound: an ambience path (Sound.ambience, its own volume, Settings
  "Ambience" slider, dusk.ambiencevolume) for rain, thunder and area sounds;
  tone/noise take `out`. Wind quieter (bed 0.022, base 0.08). The music's
  volume = slider x a duck eased toward 1 (clear), 0.5 (rain), 0 (storm),
  set from renderer.onWeather (main.js applyMusicLevel).
- Battle swings: world.swings from hit/dodge lines (attacker -> target, one
  per 300 ms), world.swingOf(id); the renderer lunges the attacker 0.2 of a
  square toward its target and draws a weapon arc (drawSwing), 380 ms.
  Styles (renderer SWINGS, LUNGE): slash (swords, default), stab (daggers,
  spears), chop (axes, hammers, picks), claw; main.js renderer.swingStyle:
  your weapon / other players' (Painted gear) via weaponKind + swingStyleFor;
  creatures by name (BEASTS claw, "axe" chop, "dagger" stab, else slash).

## 2026-10-07: the forum (LIVE; dusk-web restarted from the Proxmox host: pct exec 303 -- systemctl restart dusk-web)

- forum.py (in serve.py: everything under .../forum/api/; SQLite
  ~/DuskRPG/forum.sqlite, made on first use): boards (Announcements gods
  only, General, Quests & Lore, Trading Post, Help & Bug Reports, The
  Tavern), topics, posts; game logins (users file: SHA-256 of salt +
  password, as Player.verifyPassword; plain passwords too), 5 tries then 5
  min lockout, banned accounts refused, 30-day HttpOnly SameSite=Lax cookie;
  writes need the X-Forum header; 15 s between posts (gods exempt); gods:
  pin/unpin/lock/unlock/move, edit and delete any post.
- forum.html + js/forum.js (hash routes, BBCode escaped then [b][i][u][s]
  [quote][url][code]); links from leaderboard, who's online, profile, Help.
- Tested locally (serve.py on a temp game dir with egate/hgate): login,
  bad password, topic, BBCode/escaping, rate limit, quote reply, pin, lock.

## 2026-10-07 evening: monster tuning (play-test feedback)

- The user: lake slimers ran after one was killed, and a new character in a
  cloth shirt took no damage; dens too thin for two players.
- Why: Creatures.think flees when the player's total points beat the
  creature's (points + pack) x bravery; a grudge after one kill set a weak
  pack running for good. Damage = stre/2 x (0.5-1.5) x weapon mod/100 -
  (worn mods x 0.05 + DEX): a new character (str/dex/con 7, 20 HP) has ~7-8
  armour, so stre 6-7 creatures could never hurt them.
- Creatures.java FEARLESS = 3.0: bravery that high never flees, it comes at
  you. All quest-chain monsters now bravery 3 (world bosses already 3).
  Weakest tier (<= 40 HP) stre 16, dext 3; middle (50-115 HP) stre +10.
- tools/server/more_mobs.py: one more of each regular chain monster beside
  each one placed (free walkable square within 3, reached on foot): 97 added
  (dens doubled), bundle with the retuned defMobs files.
- Tested on scratch: slimers attack after a kill (did 8 to egate).
- Second pass (the user's test char joe, elf, DEX 13, cloth shirt, belt,
  moonleaf amulet: armour ~20 still took nothing from stre 22 gargoyles).
  Armour = worn mods x slot factor (body 0.4, head 0.2, waist 0.15, others
  0.05) + full DEX. Strength now by HP tier: <= 40 HP 28, <= 115 HP 40,
  <= 200 HP 55, chain finales 70, world bosses 80-90 (the original game's
  own: wolf 30, hound 50, grizzly 75). Files-only bundle /tmp/tune2.json,
  `ssh duskserver sh /tmp/tune2-install.sh`, then restart.
- To go live: deploy + server build/install (Creatures), `ssh duskserver sh
  /tmp/tune-install.sh` (staged; --force for the defMobs files, all 25 were
  unchanged since install), `restart 10`.

## 2026-10-07 night: death, tutorial exits, the lizardman isles (installed 16:17, client deployed; live after the restart)

- Death: conf/onDeath rewritten (the old one sent joe to 20,20, into a wall).
  Every race wakes at its capital with 5 HP and `safe`: human Kingshaven
  1440,352; elf 473,1241; darkelf 1345,912; lizardman Ssarakh 1695,943.
  Backup backups/onDeath-20261007. (joe: as a god `callplayer joe`.)
- Tutorial end + skip (defMoveActions 142_392, 143_392, 117_373 and their
  tileactions json) now bind and teleport to Kingshaven 1440,352. Lore: the
  old world is the war-torn land the human refugees flee; Kingshaven is the
  free city across the sea. Backup backups/tutorial-exit-20261007.
- Swamp tiles 168-173 (tools/server/swamptiles.py, added to map.gif in spare
  palette slots; tools/server/add_swamp.sh writes defTileScripts and raises
  tilecap to 174): mud, marsh, bog (blocks), cypress (blocks), reeds,
  boardwalk. city.mjs legend q Q b v r h. Client: blend/atmosphere/ambience/spawns know them.
- tools/world/swamp_islands.py: the 11 islands in box 1580,740-1960,1150
  (flan's "Lizardman Island Continent" notes) repainted: 60,593 squares;
  bog pools kept only if they cut nothing off.
- tools/world/cities/ssarakh.mjs: Ssarakh, the Mire City (Brood Stone
  1695,943; Chieftain Hesska, Shaman Ithrae + training, Mire Bank, The
  Basking Rock, market, stilt huts, pier with Captain Sskarr). Lizardmen
  start here (defRaces/lizardman x/y). Ferry: the Marsh Wren, Ssarakh <->
  Eastreach (ferry.mjs, routes/mire-eastreach.txt); Brann offers Ssarakh.
- Tested on scratch: the swamp renders, NPCs talk, death sends each race home.
- Painted art: painter.js paints 168-173 itself; js/trees.js draws tile 171
  as a big weeping willow. Pixel 171 redrawn as a willow (live map.gif
  replaced 16:28, backup backups/map-before-willow-20261007.gif). All 1,115
  trees left on the isles made willows (swamp_islands.py --trees, installed
  16:31: needs a restart). js/sprites.js now fetches sheets with no-cache
  (a browser kept the old 168-tile map.gif: the isles drew as sea).

## 2026-10-07 evening: lore (installed 16:58; live after the restart)

- LORE.md is the canon (read it before any story work): Morvane, King
  Aldric's brother, opened the gate under Firetown; the Ashen Horde under
  Kraghul came through; its dead rise for Morvane (the Skeleton King). The
  refugees sailed east from Westsea and built Kingshaven; Princess Elowen's
  ship, the Dawnward, never came (an open thread for a later chain).
- Players get it in pieces (tools/world/cities/lore.mjs): Old Wenna
  (Kingshaven), Loremistress Faelith (Aelindor), Archivist Zyrith
  (Velkarath), Shaman Ithrae (Ssarakh), and four read-once stones/notices
  (walk-on squares). Each tale: flag lore_<key>, a "Tale: ..." journal line
  (the client shows a Lore badge), achievement Keeper of Tales (all 16).
  Hesska warns of the Dry Ones; Kraghul and Morvane have descriptions.
- Website: ~/DuskRPG/web/lore.html (the opening legend only) linked in every
  page's nav (backup backups/web-lore-20261007), and forum.html here.
  Taken down 2026-10-27 at the owner's request (it crowded the Links nav):
  page and nav links gone; the page and the pages before are in
  ~/DuskRPG/backups/web-nolore-20261027-150247 (lore.html.removed).
  Don't put it back. The in-game tales are unchanged.
- Discord on the website (2026-10-27): a stone-and-gold "Discord" button in
  the Server Status box, under Play Now (under "Closed alpha: apply for a
  key" on index and How to Play), from tools/server/discord_button.py. It
  replaced the "Join our Discord" text link in Links; beta_site_links.py no
  longer adds that link. Pages before: backups/web-discord-20261027-151416.
  Play Now (and Send Application on apply.html) got the same stone-and-gold
  look from tools/server/play_button_gold.py; before: web-playgold-20261027-151834.
  The Java client's Download button followed (same tool, 2026-10-27; before:
  web-playgold-20261027-202500), so no page uses blockButton.jpg any more.
- Updates page (web/updates.html, the old server version history) taken down
  2026-10-27 at the owner's request: server code updates aren't public; game
  updates go in the home page News (news.json). Page and nav links gone;
  before: backups/web-noupdates-20261027-152000 (updates.html.removed).
- Rules & Privacy page and the Report a Bug mail link taken off the website
  2026-10-27 (bugs are reported in the game): tools/server/privacy_note.py.
  Every page (and forum.html) has a small foot line instead: "Nothing we
  collect is ever sold or shared." Keep that true. Before:
  backups/web-noprivacy-20261027-153042 (rules.html.removed).
- "Apply for the Alpha" out of Links (2026-10-27): the application link is
  only "Closed alpha: apply for a key" under Play Now, now on every page but
  apply.html (tools/server/alpha_link_under_play.py; beta_site_links.py no
  longer adds the Links entry). Before: backups/web-alphalink-20261027-154958.
- Java Client page (2026-10-27): the classic Java client's download and setup
  moved out of How to Play into web/javaclient.html, linked as "Java Client"
  after How to Play on every page and forum.html; How to Play's Settings
  section (and its Found a bug? tip) is gone. tools/server/java_client_page.py;
  before: backups/web-javapage-20261027-161552.

## 2026-10-07 night: lizardman tutorial (installed 18:15; live after the restart)

- tools/world/cities/hatchery.mjs: the Hatching Pools, "From Hatchling to
  Brood-Guard...", sealed in willow on the east isle (1846-1911, 990-1025),
  built like grove.mjs: hatch (1853,1007) -> Brood-Mother Ssethra (teach /
  ready) -> Scale-Tender Ossik (cloth shirt, wooden dagger) -> Hunt-Master
  Kreeth (training dummies) -> Mossa (water, mushroom) -> the Warm Stone,
  which binds and sends them to the Brood Stone (1695,943). Flags lizTut1-6,
  lizSkip, lizWoke, lizTutDone. defRaces/lizardman now starts in the pools
  (ssarakh.mjs no longer sets it). Tested on scratch with new characters:
  hatch, teach path to Ossik's gear, skip path through the Warm Stone.

## 2026-10-07 night: swamp creatures (installed 18:52; live after the restart)

- tools/world/cities/swampmobs.mjs (MOBS=<mobs file> node city.mjs ...): 8
  new monsters by tier from the Brood Stone: bog slime, mire lizard (<70);
  bog crawler, swamp serpent (<140); marsh wisp, mire hound (<210); swamp
  horror, dry one raider (further; the Sand Kings' raiders, lore). 58 dens,
  215 creatures, only on squares reachable from Ssarakh, not in Ssarakh or
  the Hatching Pools. 27 old unfitting spawns (wolf, Black dog, Mole, Bug,
  Hound, stalker, lizard axe*) removed: new installer field dropMobs
  (Plan.dropMob in city.mjs). Game had ~1,860 mobs before.
- Ssarakh bounty board (bounties.mjs, id ss, at 1692,946): bog slimes,
  swamp serpents, dry one raiders (240 gold / 500 exp).

## 2026-10-07 night: The Dawnward quest chain (installed 19:54; live after the restart)

- tools/world/cities/dawnward.mjs: 4 quests (dw_word, dw_wreck, dw_brood,
  dw_road): Old Wenna -> Trader Kossk -> the wreck on the isles' east shore
  (1929-1941, 1068-1074; 5 dry one raiders; stepping into the cabin at
  1939,1071 during dw_wreck gives the "silver locket", flag dw_locket) ->
  Chieftain Hesska -> Shaman Ithrae -> Tombkeeper Aldous (Elowen's letter)
  -> back to Wenna with the locket: 300 gold, 900 exp, "sunrise pendant"
  (neck, mod 70). Achievement "The Dawnward" (dw_road_done).
- Its NPCs belong to lore.mjs, ssarakh.mjs and zilen.mjs, which wrap their
  dialogue in dawnward(name, dlg): reinstall those with it. Played through
  end to end on scratch as egate. LORE.md has the ending (Firetown thread).

## 2026-10-07 night: duels (installed 20:28: classes + ring; live after the restart)

- server/Duel.java (hooked in Props.command, started from Skills; added to
  build.sh and install.sh): "duel <name>" with both on the Duelling Ring's
  sand, "duel accept|decline", "duel" = your record. On accept: both set
  face to face (1514/1515, 328), count of 3, engine.initiateBattle. Clanless
  players get clan "duellists" for the fight (the engine refuses PvP for
  clan "none"), set back after (and on any online player outside a duel).
  "safe" is cleared on accept. The fight runs to a death: conf/onDeath (now
  written by tools/world/cities/arena.mjs) sends anyone with "dueling" to
  the gate (1515,337) at 1 HP with "duellost"; when both are out of battle
  Duel restores both players' gold, exp, HP and clan to their pre-duel
  values (the engine takes 1/16 and pays the winner) and counts
  duelwin/duelloss in achieved/<name>. Achievements kind "duelwins"
  (Duellist 1, Champion of the Ring 25). Profiles show "Duels: W won, L
  lost". Client: DuelInvite in the party invite box (Fight / No thanks),
  "Challenge to a duel" on players when both are in the ring.
- tools/world/cities/arena.mjs: the ring (1508-1522, 321-335) NE of
  Kingshaven, Ringmaster Corvin, sign, braziers, conditions dueling and
  duellost. Tested on scratch (egate v hgate): 2 duels, gold/exp identical
  before and after, records 2-0 / 0-2, Duellist earned.
- Not handled: a third player joining the battle (anyone in a clan could).


## 2026-10-12: ring and wreck reinstalled (a god save wiped them)

- The live server ran from 2026-10-07 19:13 without a restart, so the
  Dawnward, duels, canAttack and spell restore never went live. On
  2026-10-09 21:19, while flan built Flans Cabin (bed, couch, brazier,
  chest, sign near 191-195,1102-1106), the server wrote its in-memory
  shortmap/props/signs/mobs/merchants/doors, dropping the ring and the wreck.
- 2026-10-12 17:03: rebuilt arena.mjs (base props json = live defProps of
  Guard, Villager Woman, hermit, chair) and dawnward.mjs against the live
  shortmap and reinstalled both (map, signs, braziers, 5 raiders back;
  every script/talk file was intact; cabin kept). Live after a restart.
- The Armor Shop sign at 45,222 is also gone from the running server's
  copy (flan probably removed it in game); not put back.
- Lesson: restart right after installing; a long gap invites a save.

## 2026-10-12: items, HP/MP training, gods-only island, 3-hour food (installed 17:25; live after the restart)

- "That item is used up" with several ales: the use script's "removeitem
  trigger ale" takes the first ale, then useItem counted the use on the
  one clicked. LivingThingPatch now calls Skills.useFirst (clicked item
  ahead of its namesakes) just before "new Script". Skills.revive (on the
  18 s tick) gives a use back to items at 0 uses whose script always
  removes them (not god tools that check first).
- HP/MP training: trainers sell "train:HP"/"train:MP"; the engine only knew
  lower-case hp/mp (and then charged nothing), so "HP" became a skill.
  patch.py now calls Skills.train: +10 max HP/MP a point for traincost exp.
  Old HP/MP skills convert on the tick (elrond, joe, flan had them).
- Gods-only places: file `godonly` in the game dir, "x1 y1 x2 y2 name";
  Skills checks every 2 s and sends players below privs 2 to their bind
  point (or 1414,418). Live: flan's cabin island 56 1062 212 1198 (only
  that island is in the rectangle; nothing sails or teleports there).
- tools/server/fix_items.py (applied): food/drink 2700 -> 10800 ticks (3 h),
  misspelt monster drops, items the engine stopped reading (cost "3,000",
  "weopon", typo keys), belt of the giants' wear script.
- Item effects (tools/server/item_effects.py, installed 17:42, live after
  a restart): wear/unwear scripts for 34 items whose scripts never existed
  (diamond set +25 max HP a piece, dark rod +5 INT +50 MP, excalibur,
  dran gear, satans spear...; table in the script). Bonuses aren't saved;
  wear scripts rerun at login and when monsters dress, so no stacking
  (tested on, off, relog). God tools (killsword, smek, fireball, shifty
  cost-1 set...) still have none, on purpose.
- Audit, not fixed: drops of
  "Water Gem" (Serpetion) and "wonder elixer" (Cyrii) have no item; junk
  files in defItems (40-83, bulk_create_items.sh, dc.log, name, specter,
  warning); bed "prop", golden key "key" types. Rerun: tools/server/audit_items.py <game dir>
  (read-only; copy the game's defItems, scripts, defMobs... locally first).

## 2026-10-12: closed beta gate (LIVE, gate ON since ~18:35; bridge restarted 18:24)

- server/betagate.py + dusk_bridge.py (both copied to ~/DuskRPG/; the bridge
  imports betagate from its own dir). Data in ~/dusk-beta (0700, outside
  both web roots): beta.conf (BETA_GATE, MAX_PLAYERS=25, KEY_REQUEST_URL),
  re-read within seconds (no restart); betakeys.sqlite (keys as SHA-256 +
  last 4, tokens hashed, online sessions, daily peaks).
- Protocol: first WS frame from the client is TEXT "#beta {key|token}";
  game traffic is always binary. Gate on: TCP to the game opens only after
  ok; refusals close 4400 required / 4401 invalid,used / 4403 revoked /
  4429 blocked / 4503 full. Gate off: a #beta frame is answered ok and
  dropped; no frame = old behaviour. GET /ws/status -> {gate, keyUrl}.
  Revoked sessions dropped by a 20 s check. Limits per real address: 10 bad
  keys/10 min -> 30 min block; 30 connections/min (gate on only). Cap
  counts browser sessions (gate on only). Single-use key = one redemption
  (one browser's token); unlimited = any number.
- Client: #login-beta field shown from /status; localStorage dusk.betakey
  and dusk.betatoken (cleared on invalid/revoked/used). js/connection.js
  holds 'open' until the bridge's ok. test/beta.test.mjs.
- tools/betakey (on duskserver: ~/dusk-browser-client/tools/betakey):
  create/list/revoke/unrevoke/stats/gate/cap/url. No sudo.
- noindex: serve.py sends X-Robots-Tag on everything under /play; robots
  meta on index/who/leaderboard/profile/forum; site robots.txt is
  ~/DuskRPG/rc/robots.txt (the Java resource server serves rc/ at "/" and
  the website under /web/): disallows /play, /ws, two test pages.
- Tested on scratch (scratch.sh now starts its bridge with DUSK_GAME_PORT,
  DUSK_BRIDGE_PORT, DUSK_BETA_DIR=~/dusktest/beta) and in Chromium.
  Funnel X-Forwarded-For checked live: a forged header is replaced by the
  real address.
- LEFT OPEN ON PURPOSE (2026-10-12: the user wants old-Java-client players
  to keep playing the classic game; don't suggest closing it again): the funnel also publishes
  tcp :10000 -> game 10001 (old Java client), which skips the gate; the
  game port 10001 is also open on the LAN. Close with
  `sudo tailscale funnel --tcp 10000 off` (check `tailscale funnel status`).
- Backup before the change: ~/backups-beta-20261012-180323 (bridge,
  service unit, serve.py, users.tar.gz, users.md5).
- Keys: "Tester 1".."Tester 5" made for the user (unlimited use; the full
  keys were shown once, only hashes kept). Applicants' keys are labelled
  "#<id> <name or contact>".

## 2026-10-12: beta applications (LIVE since the 18:44 dusk-web restart)

- site/apply.html -> ~/DuskRPG/web/apply.html (copied by hand; deploy.sh
  doesn't ship site/). Built from howtoplay.html's head/sidebar. Posts to
  /play/apply/api/submit. tools/server/beta_site_links.py added "Apply for
  the Beta" to the sidebar of the 7 public pages and a "Closed beta: apply
  for a key" line under Play Now on home and How to Play (backups in
  DuskRPG/backups/web-beta-20261012-184215). KEY_REQUEST_URL points at it.
- apply.py (repo root, beside forum.py; serve.py routes .../apply/api/):
  X-Apply header + Origin allowlist (DUSK_APPLY_ORIGINS adds test origins),
  honeypot "website", caps (name 20, contact 100, why 500, body 4 KB), tags
  and <> stripped, 3/hour per real address (XFF trusted only when the peer
  is this machine: loopback or the bound address 192.168.4.61, which is how
  the funnel reaches serve.py; checked live with a forged header). Only a
  hash of the address is stored. Table "applications" in
  ~/dusk-beta/betakeys.sqlite. DISCORD_URL in beta.conf shows on the
  thank-you (betakey discord <invite>).
- Admin: betakey applications [all] | approve <id> | reject <id>; and the
  admin page's "Beta applications" (js/applications.js), which uses the
  forum's god sign-in (cookie dusk_forum) since the web service can't see
  the game login. Approve makes a key labelled "#<id> <name or contact>".
- No mail is sent (no outbound mail exists): the key and contact are shown
  to the god, who sends it.
- Note: like the rest of /play, the source files (apply.py, server/*.py)
  can be downloaded; they hold no data or secrets.

## 2026-10-12: Discord invite (LIVE; welcome reloaded 20:09)

- One setting: DISCORD_URL in ~/dusk-beta/beta.conf, set with
  `tools/betakey discord <invite>` (now https://discord.gg/N9f5TR5Hz).
  That command also rewrites the invite in the game welcome
  (conf/onStart, removing its .dsko); then flan types `reloadprefs`.
- apply.py serves it at GET /play/apply/api/info -> {discord}. Every
  `a[data-discord]` gets it and its `[data-discord-item]` is unhidden
  (empty invite -> all stay hidden); links open in a new tab, noopener.
  - Website: site/discord.js -> ~/DuskRPG/web/discord.js. "Join our
    Discord" in the sidebar Links of all 8 public pages after "Apply for
    the Beta" (tools/server/beta_site_links.py adds the item and the
    script tag; idempotent; backups web-beta-20261012-194212). The apply
    page also has a line above the form and in the thank-you. The pages
    have no footer. On the LAN address (:8000) /play isn't reachable, so
    the links stay hidden there.
  - Client: main.js showDiscord() fills the login screen line (next to
    Leaderboard) and a "Community" section at the end of the in-game help.
  - Login "Need a key?" still goes to the apply page (KEY_REQUEST_URL).
- Welcome (conf/onStart; backup ~/DuskRPG/backups/onStart-20261012):
  "Welcome to the Lands of Dusk!", Website and Discord links. Chat now
  makes links clickable (main.js CHAT_LINK/linked()), but only https to
  discord.gg, discord.com and our own host, matched whole (lookalikes such
  as discord.gg.evil.com stay plain text). Seen working live by the user.

## 2026-10-12 night: male / female (LIVE: installed 21:42, restart 21:59, client deployed)

- The user's choices: existing characters are asked once at their next
  login (browser client); after that only gods change it.
- Stored as a hidden flag, "female" or "male" (defConditions files made on
  first use). Scripts ask `hasCondition trigger female`; anyone without it
  counts as male (Java-client players are never asked).
- Look: players.gif images 8-11 are the female human, elf, dark elf and
  lizardman (from 0, 1, 2, 6). tools/server/female_sprites.py makes them
  from the race frames (hair to the shoulders, a skirt; the lizardfolk a
  chest wrap); it always rebuilds from the first 8 images. Painted looks:
  js/figure.js LOOKS[8..11] (look.slim, look.skirt, look.wrap).
- server/Sex.java: `sex` -> "Sex: male|female|unset"; `sex male|female`
  once; `setsex <name> male|female` (privs 3, player online). The engine
  resets the image from the race at every login (Player.loadRace), so
  PlayerPatch also calls Sex.afterRace before loadRace returns. A change
  while online is sent to everyone in view as an ENTITY_IMAGE (op 31).
- Client: js/sex.js; main.js asks `sex` (background, so after a god's
  presence question) once graphics load; "Sex: unset" opens #sex-dialog
  with painted previews. Focus starts on the heading so Enter typed for the
  chat can't choose (it did at first).
- Dialogue: condition "Player is (sex)" in the dialogue and tile editors
  (kind 'sex'; male = `! hasCondition trigger female`), and words like
  {sir|madam} or {lad|lass|stranger} (third = not chosen yet) in anything
  said: dialogue.js chatTo writes one chat line per kind of listener.
  Shouts (.greet) take the third or first form. Try it has a sex picker.
  Existing talk files needed no changes: almost none address the player
  by sex (only the player's own "yes sir" answers to the Drill Sergeant
  and Recruiter).
- Also fixed: the tile editor's race condition crashed (a shadowed `r`).
- Tested on scratch (hgate, egate, new character sxnew): picker, pixel and
  painted looks, relogin keeps it, setsex both ways seen live, refusal.

## 2026-10-12 night: talk for the Java client; mining and smithing (LIVE: installed 23:36-23:38, restart 23:38, client deployed)

- server/Talk.java: `talk` with no ID talks to the nearest NPC with a
  script within reach, `talk <words>` to one whose name has the words.
  Java-client players already saw NPC lines and could type answers.
- server/Crafting.java (Props.command, started in Skills.start; in build.sh
  and install.sh): `mine [id]` / `mine stop`, `smith`, `smith <result> [n]`.
  Veins are props (bronze vein, iron vein, coal seam, mithril vein; Mining
  0/15/30/60); a worked-out vein only changes image (62), never its name,
  so a god save can't write it down changed; vein state is in memory (a
  restart refills all). Swings every 4.5 s minus 20 ms a Mining point (2.5 s
  min). Skills "Mining" and "Smithing" (engine skills, saved, Skills tab)
  rise by chance with use. Recipes: game file `recipes`
  (station|level|result|ingredients), re-read when changed.
- Browser-only lines (hidden by the client): "Mining: <ms>|<vein>",
  "Mining: done", "Recipe: ...", "Recipes: stations|level". Only sent when
  BridgedSocket.browser(): sockets that came with the bridge's secret line
  (field viaBridge). Every other reply is plain one-line text: the old
  protocol can't take line breaks (each extra line is read as a new
  message), so the Java list goes out one tell() per line.
- tools/world/veins.mjs: 244 veins in clusters against mountain rock
  (tiles 49/95/104; grey 58/59/98 are town walls too), tiers like
  spawns.mjs; old world bronze/iron/coal only. The list used is
  tools/server/veins.json (made from the live map on 2026-10-12).
- tools/server/install_crafting.py <game> <veins.json> [--apply]: 15 items,
  7 prop kinds, recipes, 244 veins + 5 forges/anvils, tool wares (Brann
  1417,343 and Izaru Mine Shop 440,71) and 3 stalls, ore prices, steel
  gloves/leggings mod 70, sprites 58-64 (tools/server/craftsprites.py).
  Idempotent; backups in backups/crafting-<time>.
- Client: js/crafting.js (menu actions, parsers, SmithView), #mining-bar,
  #smith-dialog, renderer draws image 62 veins as "prop worked-out vein",
  Painted art in tools/paintart/items.js (veins, forge, anvil, ingots),
  js/gear.js mithril and coal colours. Help has a Mining and smithing part.
- Tested on scratch: typed (testclient.py, now with "wait N") and in
  Chromium: mining to worked out, skill gains, smelting, smithing, level
  and material refusals, the window, both art styles (Painted needs the art
  rebuilt from a server that has the new props and sprites: deploy after
  the install).
- To go live: build+install classes, run install_crafting.py --apply on
  ~/DuskRPG, restart at once, then deploy (rebuilds the Painted art).

## 2026-10-12 late: the Java client's Help button (LIVE 23:56)

- Players of the classic client download DuskRPG/web/duskclient.jar via
  web/dusk.jnlp (How to Play links it); it's signed with
  for_web_page/dusk.keystore (alias duskkey, pass changeit; see
  for_web_page/resign_client.sh). rc/duskclient.jar is an older copy.
- javaclient/: patch_mainframe.py (CFR decompile of MainFrame: Help under
  Equipment, Quit moved to y=304), HelpFrame.java (a window that reads
  <rcaddress>javahelp.txt, falling back to a short built-in guide),
  javahelp.txt (the guide: edit it and copy to DuskRPG/rc/ - no new jar),
  build.sh (from for_web_page/duskclient-before-help.jar, signs) and
  install.sh (backups/javaclient-<time>). The recompiled unpatched
  MainFrame had the same calls, fields and constants as the original.
- Tested under Xvfb on the Proxmox host with duskserver's JDK copied to a
  scratchpad (+ libXtst unpacked from its .deb; nothing installed): a
  harness clicks Help and screenshots with java.awt.Robot.
- OpenWebStart may keep the old jar until it checks for updates; players
  can re-open dusk.jnlp from the website.

## 2026-10-13: herbalism and alchemy (LIVE: installed 00:08, restart 00:32, deployed)

- 01:19: the forge, anvil, alchemy table and tool stall in Armsmaster
  Quave's hall (1292-1298,964) taken out: it's the dark elves' tutorial
  (install_crafting.py DROP_PROPS/DROP_STALLS). Live after the next
  restart; a god save before it would write them back from memory.
- mushroom made food (tools/server/fix_mushroom.py, 01:11): the drow and
  lizard tutorials sell it as food. give <npc> hint in Talk.java installed
  01:04, live after the next restart.

- server/Crafting.java is now general: SOURCES (veins and herb patches:
  prop name, item, skill, level, full/empty image, tool, command mine or
  gather) and STATIONS (forge, anvil, alchemy table: skill, tool, verb).
  Commands mine/gather [id|stop], smith/brew [result [n]]. Browser lines
  are now "Working: <ms>|<what>" / "Working: done" (was "Mining:").
  Skills Herbalism and Alchemy. Herb patches: mushroom 0, mandrake 10,
  lavender 20 (item "lavendar"), wolfsbane 35, azeala bush 50, moonpetal
  65; picked image 71; alchemy table 72. Herb sickle needed to gather.
- Alchemy recipes brew the existing unsellable "brewed ..." potions (as
  the herbology spell does, so no gold farm) plus moonpetal elixir (cost
  0, 1000 HP/MP, scripts/moonpetal elixir.use).
- tools/world/herbs.mjs (from veins.mjs: wood edges, trees 64/103/25/26/
  102/124) -> tools/server/herbs.json (263 patches). install_crafting.py
  now takes <game> <veins.json> <herbs.json>; adds only missing recipe
  lines to an existing recipes file; sprites rebuilt 58/65 -> 73; sickles
  sold at Pell (1442,371), Miriel (487,1252) and the stalls.
- Tested on scratch typed and in Chromium (gather bar, picked look,
  brew window, mining unchanged).
- To go live: copy sources, build+install classes, run install_crafting.py
  with both lists --apply, restart at once, deploy (Painted art), copy
  javaclient/javahelp.txt to DuskRPG/rc/.

## 2026-10-13: the tutorials for the classic Java client (LIVE: installed 02:34, restart 03:13)

- WARNING learned: installing classes and not restarting broke every login
  (lazy class loading mixed old Talk with new Sex: NoSuchMethodError).
  Install only when restarting at once. Restart from outside the game:
  ssh root@192.168.7.28 pct exec 303 -- systemctl restart duskserver

- All four race tutorials played start to finish on scratch by typing only
  (server/testclient.py: RACE=..., "wait N", use/wear/a <name> turned into
  IDs as the Java client does, the nearest of a name). Helper functions
  for that (pos/run/flags) were in a scratchpad tut.sh.
- Talk.forClient (PlayerPatch puts it at the start of Player.chatMessage):
  for non-browser players, browser words in NPC lines become the classic
  client's (CLASSIC table: Shop tab -> Merchant button, click it and choose
  Attack -> pick it in the Attack list, Backpack -> type wear/use ...), and
  hidden pushes become words (Achievement, PartyChat, MailNew, Trade) or
  are dropped (DuelInvite/PartyInvite have words of their own; Ship,
  Cooldown). Returning null sends nothing (a branch + F_SAME frame).
- Talk.classicTip at login (from Sex.afterRace): one line, for classic
  players only. "talk" a step too far: "Get closer to <name>".
- patch.py: "buy water" buys one (was "How many of what...").
- The four provisioners (Nym, Mossa, Merrin, Quartermaster) take water and
  food in one answer (tools/server/fix_provisioners.mjs; sources in
  velkarath/hatchery/grove.mjs; the Quartermaster has no source file).
- Answers match without punctuation (dialogue.js looseLabel: "or strequals
  a b"); 23 live scripts rewritten by tools/server/regen_talk.mjs, which
  only touches scripts exactly as the old writer made them (all 138 were).
- The forge/anvil/stall by The Armorer (123-129,376-379) were in the human
  tutorial: taken out like Velkarath's (live after the next restart).
- mushroom is food now (fix_mushroom.py).

## 2026-10-13: the God tab's Crafting window (LIVE: installed + restarted 03:26, deployed)

- server/Crafting.java god commands (privs 3): craft status
  ("CraftStatus: <kind>|<placed>|<used up>", "working|n", "done"), craft
  refill, craft recipes ("CraftRecipes: <b64>"), craft recipes set <b64>
  (every line checked: station, level 0-100, result and ingredient items
  exist; old file to backups/recipes-<time>).
- js/craftadmin.js (+ test): God tab -> Crafting…: place any vein, patch,
  forge, anvil or alchemy table where the god stands (GodPanel.placeProp,
  so it counts as unsaved; Save map keeps it), the counts with Refill all,
  and a recipe editor (station, level, result with item suggestions,
  ingredients). Removing: the click menu's Remove (god) as for any prop.

## 2026-10-13: loose ends (LIVE)

- tools/server/fix_loose_ends.py (applied 03:42): "Water Gem" (Serpetion's
  drop, a 1500 gp gem) and "wonder elixer" (Cyrii's, 800 HP/MP, its use
  script) made; junk defItems files (40-48, 83, name, specter, warning,
  bulk_create_items.sh, dc.log; none sold, dropped or carried) moved to
  backups/defItems-junk-20261013-034202.

## 2026-10-13: woodcutting and fletching; veins and patches re-placed from every home city (LIVE: 09:56 restart, deployed)

- Crafting.java: TREES (oak 0 / ash 15 / yew 35 / elderwood 60, skill
  Woodcutting, tool woodcutter's axe, command chop [x y]): trees are map
  squares (tiles 64, 103, 25, 26, 102, 124, 171), worked like veins but
  keyed by square (negative store keys), nothing on the map changes. The
  workbench (prop, sprite 73) is a station: fletch, skill Fletching, tool
  fletching knife. Recipes: oak -> quarter staff, quiver, cheap bow; ash,
  yew, elderwood staves and bows (new items; elderwood only made); anvil
  makes the woodcutter's axe.
- Tiers now count from the nearest landing OR home city (HOMES in
  Crafting.java = ARRIVALS in veins.mjs/herbs.mjs): Kingshaven had been
  ringed by mithril and moonpetal. Each home also gets 3 easy clusters
  within 300 first. Herbs also grow by willows now. Mithril is rarer (8).
- install_crafting.py --drop=<old list>: the 2026-10-12/13 lists are kept as
  veins-2026-10-12.json and herbs-2026-10-13.json.
- Client: clicking a tree square beside you chops it; Fletch… on
  workbenches; the Crafting window knows workbenches and fletching.

## 2026-10-13: The Firetown Expedition (story chapter) (LIVE: installed 11:37, restart 11:37, deployed)

- tools/world/cities/firetown.mjs: 6 quests ft_page (Aldous) -> ft_stone
  (Zyrith: 6 magma slimes) -> ft_cross (Old Bram, Westsea 96,358: offer
  effects teleport to 380,351; Tam 379,352 rows back to 95,358) -> ft_free
  (Elowen 369,348, a "prisoner" look; kill Ashen Gaoler, new mob 392,377,
  drops brood stone shard 100%) -> ft_seal (the square 393,379 before the
  rift prop 394,379 seals it with shard + fragment, gives ember of the rift;
  tile rules can have `also` now) -> ft_word (letter to Old Wenna).
  Achievement riftsealed (ft_word_done). Per player.
- The cells (370-397, 348-383) connect to nothing on foot; the route to
  the rift avoids 384,349 (drops humans to 1 HP).
- js/quests.js: offer.effects (extra effects on accepting); quest stages
  carry the NPC's own answers (their last "always" stage), rebuilt from
  st.base each merge; offers ordered deepest first. js/dialogue.js:
  "you'll need" with the right article; looseLabel drops apostrophes;
  withArticle: no article before a capitalised name.
- ITEM FILE NAMES MUST BE LOWER CASE: DuskEngine.getItem lower-cases the
  name it opens. "Water Gem" was renamed "water gem" on live.
- tools/server/merge_quests.mjs <talk> <quests> <out>: re-merges every
  quest in quests/*.json into the NPCs it involves (only scripts exactly
  as the editor made them). tools/server/regen_talk.mjs first, with the
  dialogue.js that made the live scripts (git show HEAD:js/dialogue.js
  before committing changes to it). tools/server/add_achievement.py.
- Install order (node isn't on duskserver: run the two .mjs tools locally
  on copies and push back): city.mjs bundle (base props json for
  prisoner/Villager/hermit) -> install_city.py --old-world -> add_achievement
  -> regen_talk -> merge_quests -> restart -> deploy.

## 2026-10-13: fewer NPC shouts (LIVE: 11:52 restart)

- server/Talk.java shout(): once an hour per player per NPC (was 5
  minutes), and only to someone who can walk to beside the NPC within 8
  steps (nearOnFoot: a BFS over tiles whose defTileScripts say "true").
  Not sight: shop counters and town walls are the same tile (62), and only
  19 tiles have see rules (DuskEngine.canSee answers no for a square with
  no defCanSeeScripts file of its own). The hour is kept in memory.

## 2026-10-13 17:00: classes (LIVE: installed + restarted 16:57, deployed)

- server/Classes.java; config DuskRPG/classes (written with defaults on
  first use, re-read when changed): classes, races (drow: Priest/Priestess
  only; others Cleric), core/open/barred lists, multiplier 2, crosscap 50,
  start bonuses, HP/MP per point, gear kinds by item-name words, wears.
- Class = hidden condition class_<id>. No class: moving, attack, buy,
  cast, get, wear, mine... refused (gods exempt). Choosing removes cross
  and barred skills/spell groups, refunding 10 exp per point.
- Hooks: patch.py (Classes.gate + Classes.command first), Skills.train
  (Classes.train, Classes.growth), Sex.afterRace (Classes.atLogin), Admin
  (class in profiles.json and the leaderboard). God: setclass.
- Guild doors (server/content/defMoveActions): Mage = mage, Thieves =
  ranger, Healer = cleric/priest/paladin. The engine runs a script's .dsko
  when it exists: delete it after editing a script.
- Client: js/classes.js, #class-dialog (after the sex picker), tags in the
  Skills tab, Spellbook and shop. Docs: docs/class-plan.md, class-inventory.csv.
- Backup before live: ~/DuskRPG/backups/classes-before-20261013-164220.
- 17:20 (LIVE, restart): the picker has a picture per class (js/icons.js
  CLASS_ICONS: axe, staff, sun, spider, bow, shield); browser players no
  longer get the text prompt (Classes.atLogin skips bridged sockets).
  Gods get "Class: none|..." so the picker stays shut for them.
- Character tabs are icons (js/icons.js TAB_ICONS, iconTabs(); words are
  the tooltip and screen-reader text; counts ride on the icon).
- 17:40 (LIVE, deployed): new fighter/ranger icons; short in-world class
  blurbs (DEFAULTS and the live classes file; backup in
  backups/classes-file-*); Eyes moved beside Skull on the equipment doll.
- tools/golive_classes.sh: deploy + build + door scripts + web pages +
  java help + install + restart, in one go (the user runs it).
- Testing the browser client: playwright-core from an older scratchpad
  (node_modules symlinked into this session's scratchpad/e2e), chromium in
  ~/.cache/ms-playwright; the client served locally on :8124
  (python3 -m http.server) and the scratch bridge on 127.0.0.1:8767.

## 2026-10-13 18:30: spell and mana audit (read-only; nothing changed)

- docs/spell-audit.md (+ .docx, made by tools/md2docx.py), CSVs
  spell-audit-spells / -mp-by-level / -mend, built by tools/spell_audit.py.
  A copy of the .docx is in ~/spell-audit.docx on duskserver.
- Key facts: MP cost = (110 - (group skill - unlock %)) / 2 for every
  spell (55 at unlock, 5 at best); unlock % = 100*i/(n-1) (the last spell
  of a group needs 100). Max MP = start pool + MP bought (no levels, WIS
  doesn't count); regen 1+WIS/2 awake, 3+WIS asleep, every ~18 s, out of
  battle only. Condition ticks are 1 s.
- Result: no class can cast its first spell at the start (54 MP vs pools
  10-30), including the free starting spells. Mend ("cure") is 54 for a
  new Paladin with 18 MP.
- Flags: telepath copies every message to flan; corrupt nets MP; summon
  wurm/leviathan may deal no damage (one-line bug, untested); drain,
  create food/drink unreachable; tools/spellinfo.py's "needs" uses
  100*i/n, not the engine's 100*i/(n-1), so the Spellbook shows wrong %.
- Done since: see "spells, schools, guilds" below.

## 2026-10-13/14: spells, schools, guilds (ALL LIVE; commits fa05111..e60e937)

How magic works now (docs/spell-rework.md has the first round's tables):
- Each defSpells/<spell> has "mp <n>" (cost) and "unlock <n>" (group points
  needed) after its group line; without them the engine's old sums stand.
  Engine: server/SpellPatch.java (ASM: castSpell cost + unlock hooks;
  DuskEngine.refreshEntities trainer lists through Classes.wares; Script's
  "skill" read falls back to spell groups) and server/SpellGroup.java
  (source replaces the class). build.sh/install.sh handle both; originals
  of SpellGroup/Script in storage-originals.
- Schools: arcane, divine, nature, drow, forbidden, open (+ Guardian Force,
  gods only; its leviathan is "great leviathan"). Tiers start at 0/10/25/
  50/75 points; tier 5 also needs a quest flag in arcane/nature.
- Who learns what is in the classes file: "school <group>: class+flag[:max]",
  "tier5", "refuse", "hidden mage", "guild <group>: name | 5 ranks".
  Divine: cleric, paladin up to 49. Drow: priest (starts drow 1). Nature:
  ranger + guild_circle. Arcane: fighter/ranger/mage + guild_mage.
  Forbidden: those + forbidden_lore + archmage_quest + arcane 75. Open: all.
  No cross-class for schools. Trainers hide closed schools (both clients).
  Old Mages get guild_mage at login. Mage can't be chosen.
- Commands: guilds (players), guildflag <name> <flag> on|off, guildflags
  <name> (gods). Plain "guild" is swallowed by an empty commands/guild.
- MP: class start pools (fighter 28, cleric/priest 46, paladin 40, ranger
  36), a full bar on choosing, 4% of max MP back every 18 s out of battle
  ("mpregen"), on top of 1 + WIS/2. Heals x (1 + (points - unlock)/50).
- Battle-only spells (scripts asking "isinbattle caster") are refused out of
  battle before costing MP (Skills.battleOnly).
- Removed: telepath (its copy to flan with it), herbology, translate, the
  alchemy/telepathy/m groups, 63 dead spell files (backups/spell-cleanup-*).
  Conjured sandwich/ale (cost 0) from create food/drink.
- Tools (all idempotent, backups under ~/DuskRPG/backups/): tools/server/
  fix_spell_mana.py, spell_cleanup.py, schools_phase1.py (skips online
  players), schools_phase2.py, schools_phase4.py; go-live drivers
  tools/golive_spellmana.sh, golive_schools.sh, golive_furnish.sh.

Places (tools/world/cities/):
- magetower.mjs: the Mage Guild tower on the isle off Eastreach (door
  1918,1292; Mages and guild_mage only). magetowerfloors.mjs: its five
  floors in the sea at 40-54 x 540-614 (stairs gated by arcane points;
  Mage Guild Trainer on floor 1, Hidden Order Trainer at the top, alchemy
  tables on floor 3). No ferry to the isle (the user's choice, for now).
- circlewood.mjs + circlegrove.mjs: The Circle's dense wood round 703,1216,
  a clearing at 705,1218 (standing stones, campfire, Circle Trainer,
  moonpetal/wolfsbane/mandrake), one trail out to ~741,1231.
- drowtemple.mjs: Drow Priesthood Trainer beside Priestess Ilvra (1372,899).
- guildstubs.mjs: test envoys in Kingshaven (1433,353, 1436,353): they
  invite only characters a god flags guild_tester.
- Trainers can have names: city.mjs merchant(x, y, wares, name);
  install_city.py renames one already in place.

Not done, by the user's choice: the Hidden Order / tier-5 quests (flags are
god-set only for now), haste, turn undead, shadow step, spider swarm.
Old Forbidden trainer at 64,48 stands in the sea (unreachable; the tower's
replaces it).

Lessons:
- Never edit an online player's file (the server writes its copy back at
  logout/restart): check ~/DuskRPG/who.json first.
- LivingThing.parseUserFile System.exit(0)s the server on any error reading
  a user file (e.g. a condition with no defConditions file). Never delete
  defConditions files; Classes makes its flags' files at startup.
- A spell script's .dsko is run instead of the script: the tools move it.
- Testing: scratch test chars spmage/spcler/sppriest/sppal/sprang/spfight,
  scfight/scmage/sccler/scpriest/scrang/scpal, pbfight/pbcler/pbpriest/
  pbrang/pbpal (testpw1); egate god (gatepw1). testclient.py STATS=1 prints
  HP/MP, stats and trainer lists. Scratch-only leftovers: 3000 HP dummies,
  a forbidden ware on the 27,42 trainer, a "flan" test character.

## 2026-10-14 03:16: twice the monsters (LIVE)

- tools/server/double_mobs.py (run ONCE: it doubles whatever the mobs file
  holds): 2,060 -> 3,847 (old world +924, south +243, isles +241, east
  +196, north +147, Underdark +36). Not doubled: kinds with 1-2 placed
  (bosses, champions, quest targets, DraN/Freyrbrand/Harpy/Invader),
  KeyMaster, stationary dummies, race tutorials, gods' island; 207 had no
  room (mostly rubble in mine tunnels). Backup: backups/double-mobs-
  20261014-031624/mobs (restore + restart to undo). Server ~174 MB after.
- Watch play-testing: if an area is too crowded, thin just that area.

## 2026-10-14: layout, character column (client only, deployed; commit 5a3cf0a)

- index.html: #char-card moved out of #side into its own `<aside id="char-side">`.
- css/style.css: at 1200px+ (and wider than tall) the grid is
  char | map | tabs, both side columns `--side-w` (clamp 340-440px) so the
  map is centred; #panel stretches to the full height. 900-1199px: card
  above the tabs on the right (as before). Phones: map, chat, card, tabs.
- The map stays square (the server's view is n x n); it fills the largest
  square that fits the middle column.

## 2026-10-14: settings grouped (client only, deployed; commit c3745a4)

- Settings menu in sections: Display, Screen layout, Sound, Music, Account
  and help, and a collapsed Advanced (bridge address, protocol trace).
  Login errors say "Settings → Advanced". `#settings > summary` styles only
  the top button now.

## 2026-10-14: minimap placement (client only, deployed)

- Wide screens: the minimap canvas moves into `#minimap-slot` under the
  name card (as big a square as the column allows, container query units).
  Settings → Screen layout → "Minimap on wide screens" (dusk.minimap.place:
  card | map). On the map it's 150px now (was 180). js/drag.js only drags
  and places while the element is inside its container.

## 2026-10-14 03:51: creature cap in fights (LIVE: installed + restarted 03:51)

- server/Creatures.java `full()`: a creature won't join (or start) a fight
  once the other side has MAX_PER_PLAYER (2) creatures per player on it
  (a party of 3: 6). The rest wait beside it and join as places free up.
  Fights with no players aren't capped. Change the number in
  MAX_PER_PLAYER, build, install, restart.

## 2026-10-14 afternoon: equipment panel redesign (client only, deployed; commit ccde080)

- js/panels.js renderEquipment: nine equal cards on a fixed 3x5 grid (css
  grid areas: centre Skull/Neck/Torso/Waist/Legs, left Arms/Wield, right
  Eyes/Hands); rows share the tallest card's height (1fr in an auto-height
  grid). Icon (wornIcon: the painted frame cropped to its opaque pixels,
  cached) centred, name under it; nameSize() picks long/xlong/word classes
  so names wrap only at spaces (hyphens become U+2011). Tap/Enter on a
  filled card shows #equip-details (full name + itemDetails(), shared with
  the backpack's showItemInfo). X: 24px, 32px on touch, + an invisible
  6px margin. Body SVG is a stretched backdrop (preserveAspectRatio none).
- Container queries on .doll-wrap: <=300px tighter cards (fits 1440x900
  Classic); <=230px two columns, no body.
- Checked with Playwright against all 293 wearable item names at 320/390/
  1440 px in both looks: no word split, nothing outside a card, no
  sideways scroll. Backups: /root/backups/dusk-equip-panel-20261014-151459.

## 2026-10-14 afternoon: equipment panel, rows (client only, deployed; commit 5360b0e)

- css/style.css: the doll is 3x4 now: ". skull eyes / arms torso neck /
  wield waist hands / . legs ." (Neck moved to the right column). Gaps are
  --gap-y/--gap-x everywhere; Neck's tick (::before + ::after) runs up into
  the Skull/Torso gap to the outline's neck (body backdrop top 6%, 94%).
- One-column layout (max-width 899px or portrait): #tab-equip max-height
  100svh - 64px, scrolls inside if needed; the 5-row doll had been ~730px,
  taller than a phone screen. Touch X 28px seen / 44px hit.
- Backups: /root/backups/dusk-equip-panel-20261014-153254.

## 2026-10-14: Greystone Mine (LIVE since the 18:28 restart, deployed)

- tools/world/cities/greystone.mjs, from flan's map notes "New mine here"
  (1481,192) and "New Mine inside" (871,226). Door: tile '<' in the grey
  cliff at 1482,192 (walk-on teleport to 871,226; out again at 1480,192,
  ~200 steps north of Kingshaven). The mine is dug in empty void (tile 0)
  840-949 x 195-284, so the plan is oldWorld with mayBuild t === 0.
- Inside: entry hall (stairs up 871,224, Overseer Garrick), Pickwright's
  Tools (Hessa Pickwright, shop square 855,225: mining pick, smithing
  hammer, water, apple), east gallery (bronze/iron), lower workings with
  the miners' camp (Old Bryn, Tess the Hauler, forge 876,243, anvil
  878,243), the deep seam (mithril/coal, dark floor). 21 veins. NPCs have
  talk only, no quests yet (hooks: Garrick's "Any work?", Bryn's knocking
  below the deep seam, the caved-in Old Drift east at 914-922,221-222).
  Solid rock left round it to expand into. No monsters.
- js/atmosphere.js UNDERGROUND has the box (deployed).
- Backups: ~/DuskRPG/backups/city-greystone-mine-20261014-170942.

## 2026-10-14 evening: clan halls emptied, clans fixed (LIVE since the 19:10 restart)

- tools/server/clear_clan_halls.py <game> [--apply] (applied 19:02, backup
  backups/clan-halls-20261014-190211): finds each old hall by flood fill
  from inside its door (HAOD-AC 97,86; MTH north 413,29; MTH den 138,891;
  Aop 173,131; DD 945,55; of the Dead 110,193; TFAWC's door is a tree now)
  and removes every prop, sign, shop, monster, walk-on script and walk rule
  in it (79 props, 18 signs, 4 shops, 71 scripts: room locks for Kenny,
  Shifty01, Biohazard, Brian, Gatotic, Kamikaze, Goku, Reans, Jerle; the
  casino, healing beds, free ale, the "hero" tile). Doors say the hall
  "stands empty... can be claimed by a new clan: ask a god". The user's
  choices: strip to bare; the MTH back-alley thieves stay and now rob
  everyone (13 squares); DD (teleport-only) now takes anyone in from
  100,28, out again from 944,58 (sign "Way out") to 101,28. "of the Dead"
  keeps its closet teleport to 29,484. Originals of the Aug 12 rewrites are
  in ~/defMoveActions.zip.
- Clan rules squares 10_24/11_24 rewritten (old gold-cost table was never
  real); backup backups/clan-rules-20261014.
- server/Clans.java (via Props.command, before the engine): clan, clan
  members, clan invite/accept/decline (ClanInvite: line -> js/party.js
  Join box), clan leave [yes], clan kick (online or offline: edits users/
  <name> and .backup); engine aliases addmember/unclan/kick go here too.
  Fixes: members (privs 0) could never leave (engine gates clan commands at
  privs > 0); engine's addmember/unclan blocked on readLine of the other
  socket; kicked leaders kept privs 1; invites stole players from other
  clans; gods' clanleader/changeclan lower-cased the clan name (now kept,
  and an existing clan's spelling reused). Tested on scratch (egate, hgate,
  cgate). install.sh needed Clans added to its class lists (a 30 s window
  at 19:10 had Props without Clans).
- Engine facts: clan leader = privs 1 (who shows {Clan Leader}); PvP needs
  both in a clan; clan chat ":" matches clan names case-sensitively.
- claimhall (LIVE since the 19:26 restart): server/ClanHalls.java, data in
  the game file clanhalls (server/content/clanhalls, copied only if
  missing): name|box|doors x,y,dx,dy|portals x,y|inside|clan. Halls: haod,
  mthnorth, mthden, aop, dd (portals 100,28 / 954,56), dead. Gods:
  claimhall (list), claimhall <clan> (the hall you stand in), claimhall
  <hall> <clan>, claimhall <hall> none. Rewrites the door/portal
  defMoveActions at once (scripts are read per step; .dsko deleted): members
  welcomed, others pushed back; one hall per clan; clan shows "Your hall".
  Tested on scratch (aop: member in, non-member turned back, freed).
  Re-running clear_clan_halls.py would reset doors to free but not the
  clanhalls file: claimhall <hall> none / re-claim after it.

## 2026-10-15: canon cleanup (LIVE: installed 14:12, restart 14:12:57)

- LORE.md has a "Canon decisions" section (A-E): King Aldric is gone (dead
  or missing), Lord Steward Halvard governs Kingshaven; the wyrms are young
  to dragonkind; the crown's buyer is Morvane's agent (SECRET, only Aldous's
  hint in game); the old world is emptying, not burning; renames Herbalist
  Wenna -> Herbalist Linnet, Reeve Tamsin -> Reeve Osric (a man), Tamsin the
  Tailor -> Corra the Tailor.
- Repo plans changed: capital.mjs (Halvard, exported as HALVARD_DLG; Royal
  Guard, Prue/Flora lines, Corra), lore.mjs (king's haven, wyrms),
  zilen.mjs, izaru.mjs, frozenreach.mjs, swamp.mjs, fix_swamp.py.
- Live is patched in place, not reinstalled: tools/server/canon_cleanup.mjs
  (run locally on a copy of ~/DuskRPG; refuses if a conversation was
  hand-edited) -> merge_quests.mjs for Aldous, Osric, Dask ->
  tools/server/canon_install.sh on duskserver (backs up to
  backups/canon-<date>/; live backup canon-20261015-141214). Needed a
  restart (props: Halvard and the renamed NPCs). Talk scripts take effect
  at once, so install and restart together.
- Found: a quest's "after" line was only heard after the LAST quest in that
  giver's chain (the next offer always came first), and an NPC's own
  greeting never. FIXED 2026-10-19 23:03 in js/quests.js mergeQuest: the
  next offer opens with the thank-you before it; the chain's last thank-you
  takes turns (lines) with the NPC's own spoken greeting (not an "acts"
  scene, e.g. Elowen in chains). Live: tools/server/merge_quests.mjs over
  talk/ + quests/ rewrote 11 NPCs (none hand-edited), backup
  backups/after-lines-20261019-230317; no restart needed.
- Step 2's other Kingshaven hits (keep sign "King Aldric holds court
  within", Armsmaster Doyle "the king's own guard", Old Fisher Tam "Fifty
  years", the King's Watch, etc.) and the old-world tone audit
  (docs/oldworld-audit-2026-10-15.md) await flan's decisions.

## 2026-10-15: dusk-bot, a headless client for AI play-testing (outside this repo)

- `~/dusk-playtest/` on this machine (claude-code, 192.168.4.33), not in
  the repo: `dusk_bot.py` (Python stdlib only) + `dusk-bot` wrapper. A daemon
  per session (unix socket in `run/`) holds a direct TCP connection to the
  game port (default live 192.168.4.61:10001; `DUSK_HOST`/`DUSK_PORT` or
  `--host/--port`), not the bridge. CLI: connect (--create, --race, --sex,
  --class), look, status, do, log [--since N], wait N, quit, stop.
- `look`: 11x11 ASCII grid with a player-facing legend (all 174 map.gif
  tiles named by eye in TILE_KINDS; no walkability), entities with display
  names (browser's `1.Guard` rule), kind, HP, relative position; own x,y
  only (the world map shows it). `do` resolves names to the IDs the
  browser's buttons send (attack/look/talk/open/goto/wear/use/drop/unwear),
  `say`/`gossip` -> `'`/`;` (Dusk's chat). IDs never reach the agent's
  output. Rate limit 0.5 s per typed line. Machine lines the browser hides
  are hidden (list in README). Full transcripts in `logs/` (password
  masked; contain IDs: not for the playing agent).
- The server sees direct TCP as the classic Java client (classic tips,
  translated party/mail/trade lines).
- Docs: `README.md` (full: parity decisions, opcode handled/ignored table,
  verification) and `PLAYER.md` (player-only usage, no places/NPCs/test
  details) for the playtesting agent.
- Verified on scratch with test char **botcheck** / botpw42 (human fighter,
  scratch only): bot look vs the browser's raw WS frames at the same spot,
  117/117 terrain cells match; evidence in `~/dusk-playtest/verification/`.
- Playtest launch (the user runs it in a separate terminal): scratch
  started 14:5x and a tunnel `-L 10011` from this machine are UP; export
  `DUSK_HOST=127.0.0.1 DUSK_PORT=10011`, `cd ~/dusk-playtest`, then
  `claude --permission-mode default --allowedTools "Bash(./dusk-bot:*)"
  "Read(./notes/**)" "Read(./PLAYER.md)" "Write(./notes/**)" "Edit(./notes/**)"
  --disallowedTools "Bash(ssh:*)" "Read(./README.md)" "Read(./logs/**)"
  "Read(./verification/**)" "Read(./run/**)" "Read(./dusk_bot.py)" Grep Glob
  WebSearch WebFetch` (deny `Bash(ssh:*)` because settings.local.json allows
  ssh). Agent notes go to `~/dusk-playtest/notes/`.
- **Stop scratch after the playtest** (memory): `ssh duskserver 'sh -s
  stop' < tools/scratch.sh`. Next: read notes/ + logs/ and turn findings
  into fixes.

## 2026-10-15: play-test fixes (LIVE: installed 19:13, content 19:14, restart 19:15; commit 7a5b021)

From the first AI play-test (Wrenna; notes in ~/dusk-playtest/notes/,
review with every claim checked against the transcripts in
~/dusk-playtest/playtest-review-2026-10-15.md).
- Selling works: the engine's sell only took item IDs while every client
  sends "sell <qty> <name>"; Props.sellByName turns the name form into the
  ID form (the ID form still goes straight through).
- NPC questions don't swallow commands: TalkPatch.java (new build tool, run
  in build.sh after SpellPatch script; not a server class, so no install.sh
  change) hooks Script's "input" read to Talk.answer. Talk.forClient records
  each player's last NPC question's choices (says/asks lines ending "(a/b)");
  an answer that's none of them runs as a command, and the NPC's "Hm? Talk
  to me again..." after it is dropped. Free-text questions (no choices) are
  untouched.
- Idle timeout 10 -> 30 minutes (PlayerPatch changes the setSoTimeout
  constant; checked with javap: int 1800000).
- Heavy armour: Classes.gate warns on the first "buy" of gear the class
  can't use; the same buy again within 2 minutes goes through.
- look: Props.sentence ends item/prop/sign text with "." only once
  (patch.py).
- Content (tools/server/fix_playtest.py, idempotent, backups in
  ~/DuskRPG/backups/playtest-20261015-191400): stray hounds stre 28 -> 26
  (damage = stre/2 x 0.5-1.5 - armour; tutorial gear's armour ~15, so 20
  did nothing), grouprelation 0 and NO faction (killing one used to turn the
  faction on you and the rest piled in); kingswatch.mjs matches. Typos at
  the docks, Armorer's wear hint, Drill Sergeant's "right beside, not
  diagonally" and "*takes the straw stuffing*", one-line "sales list",
  help rewritten for today's clients.
- The user's calls: longer timeout yes; hounds a bit weaker and no ganging
  up; warn (not block) on heavy armour; keep the Circle Envoy placeholder.
- Not done (in the review): bounty-board wording/check-before-offer, a
  reply for late answers ("huh?"), armoury prices and item names, race
  descriptions, the browser showing opcode 20 windows (help) to non-gods.
- dusk-bot (~/dusk-playtest) also fixed: plank walls vs floors in the
  legend, op 18/20 windows shown, "You didn't move.", goto waits, "The X"
  name matching, new `map` command. Scratch test chars: fixcheck/fixpw42
  (ranger, at the hound meadow), botcheck, Wrenna (the tester's).

## 2026-10-15 21:23: bounty boards say no up front (LIVE, no restart needed)

- js/quests.js: a repeatable quest with a wait ("again" flag) gets a stage
  `{ wait: true, when: flag <again flag> }` saying the wait text, ranked
  with the offers (stageRank 2) so it sits after "still running" and just
  before its own offer. The accept's own once-check stays. Test in
  test/quests.test.mjs (merged order too).
- bounties.mjs wording: "One bounty a day from <town>'s board, whichever
  notice you pick." / "You've already taken today's bounty from <town>'s
  board (one a day, whichever notice). New notices go up tomorrow."
- Installed with install_city.py --force --old-world (72 files: 48 poster
  talk files + 24 quests/bt_*.json; diffs checked = only this change;
  backups/city-bounty-boards-20261015-212348). Talk scripts recompile on
  use (.dsko removed), so no restart.
- Client deployed 2026-10-15 ~21:30 (js/quests.js for the God tab's quest
  wizard), so re-saving a repeatable quest there keeps the wait stage.

## 2026-10-15 22:40: race bonuses in the classic race list (LIVE since the 22:43 restart)

- Talk.forClient (classic clients only; the browser's race buttons already
  show bonuses from raceinfo.json): the "Choose one of the following
  races:" list gets each race's stat bonuses, "human: +1 STR, +1 DEX, +1
  INT, +1 CON, +1 WIS". The name is still what's typed. dusk-bot reads the
  "name: ..." lines. Tested on scratch (char racecheck).

## 2026-10-16: late answers and shield prices (LIVE since the 12:42 restart)

- "huh?" -> Talk.unknown (patch.py, the engine's one "huh?"): a line that's
  one of the choices of the player's last NPC question (kept in
  lastAsker/lastChoices after it's answered) says "That conversation is
  over: talk to <npc> again." Anything else still gets "huh?". Tested on
  scratch (huhcheck at the Recruiter).
- Armoury prices: per real armour point (LivingThing.getArmorMod weights:
  torso 0.4, skull 0.2, waist 0.15, arms/legs/hands/eyes/neck 0.05) the
  Royal Armoury was already ~25-30 gp/point, except the shields (~100):
  bronze shield 1008 -> 300, iron shield 1608 -> 480 (fix_playtest.py; it
  now keeps CRLF line endings). Prices are read from defItems each time a
  shop list is built or something is bought. Not changed: leather shield
  (604, also ~100/pt) and mithril shield (9000); item names with "_"; the
  browser's Backpack shows the raw mod ("Armour +200"), not the weighted one.

## 2026-10-16 16:30: help in the browser, real armour numbers, leather shield

- Browser (deployed 2026-10-16 ~16:35): opcode 20 windows that aren't a
  god's name list (help, help commands) go in the chat (main.js).
  js/iteminfo.js shows armour as what it really adds (ARMOUR_WEIGHT, the
  server's getArmorMod: torso 0.4, skull 0.2, waist 0.15, the rest 0.05):
  a shield's +200 shows +10, a suit's +50 +20.
- leather shield 604 -> 180 gp (fix_playtest.py; LIVE 16:25, no restart:
  prices are read from defItems each time).

## 2026-10-19: play-test 2 fixes (LIVE since the 18:00 restart)

Play-test 2 (Wrenlow, paladin; review ~/dusk-playtest/playtest-review-2026-10-19.md).
- Engine: unwear shows the stats again (patch.py); armour adds up before
  rounding (LivingThingPatch: getArmorMod -> Skills.armorMod), so cheap
  sleeves/leggings count; who/whois minutes from Who.minutesOn (the engine's
  lngSessionStart restarts at every save).
- Data (tools/server/fix_playtest2.py): ferry fare 50 -> 20 in the five
  captains (ferry.mjs FARE = 20 too); map: trees at 1411,299 (Hilda's door)
  and 1457,413 + 1458,413 (Old Fisher Tam's) -> grass (capital.mjs would
  put random trees back on a rebuild); the "sales list" prop in every shop
  now a general line (fix_playtest.py had made it the 2003 potion list);
  leather gloves 104 -> 30; Wexley's quest and the journal say "the meadow
  behind Hilda's farm, out of the north gate and west along the road";
  a signpost at 1435,318 (signs + signnames). kingswatch.mjs says the same
  but can't be rebuilt over the live map (its Watch Post is built).
- Bounty notices (bounties.mjs, reinstalled with install_city --force):
  the hounds' directions and a difficulty label per tier ("A job for a new
  hunter." / "For seasoned hunters: not for someone fresh off the boat." /
  "Only for the strongest.").
- Kept on purpose: both envoy placeholders (Circle, Mage Guild).
- Not done: elf vs lizardman bonuses (asked), "lavendar" (the item's real
  name), the death message's gp rounding, large/small bag prices.
- Tested on scratch (char runtwo): AC 4 -> 5 -> 6 with sleeves/gloves,
  unwear updates; who "connected 1m"; signpost; Hilda's door; hounds
  reached from her farm; notices; glove price; sign text.
- dusk-bot: open explains map doors, goto X Y refuses beyond the view, the
  class list waits for male/female.

## 2026-10-19 18:10: lizardman bonuses (LIVE: restart 18:06, client deployed)

- defRaces/lizardman: +2 STR, +2 CON, +1 DEX (was +1 DEX, +2 INT, +2 WIS,
  the elves' exactly); via fix_playtest2.py (backup in
  backups/playtest2-*). Bonuses aren't saved in user files: every
  lizardman gets them at their next login. Races are read at start-up
  (restart), and the browser's race buttons read js/raceinfo.json, which
  tools/deploy.sh rebuilds from the server. Tested on scratch (lizcheck).

## 2026-10-19 19:50: play-test 3 fixes (LIVE since the 19:59 restart)

Play-test 3: a lizardman fighter (~/dusk-playtest, notes in
archive/run3/playtest.md). Deployed 19:58
(build.sh + install.sh, class backups in backups/classes-20261019-195843),
content applied 19:59 (backups/playtest3-20261019-195900), restarted
19:59:44 with no errors; live Equipment.wearItem checked (bipush 9) and
both signposts in the signs file. Scratch stopped. The user chose to skip
the next play-test for now (an idea for it: a tester who heads for the
ferry to Eastreach, which none has reached). Server code (build.sh + install.sh, restart):
- Gloves vanished at every login (engine bug, live too): Equipment.wearItem
  (String, Item) counted its slots down from 7 ("int i = 8; while (--i >=
  0)"), so the hands (8) were never put back on. EquipmentPatch makes it 9.
  Players who wore gloves before this have lost them (not recoverable from
  their files; memaw had gloves saved when found).
- Training prices rise (Skills.price): traincost (10) a point times stat/10,
  max HP or MP/30, or 1 + skill/20, never under 1x. Stats, HP, MP and
  skills are all trained in Skills.train now (not the engine's flat
  Merchant.train); cross-class skills pay that times the multiplier; magic
  schools (Classes.trainSchool) stay flat. The trainer's list shows each
  player's price (Classes.wares -> Skills.priced) and is re-sent after
  each purchase (refreshEntities). Stat and skill training now says "Your
  Strength rises by 1." (only HP/MP said anything).
- "get mushroom" (a name, not an item number) threw in the engine and said
  nothing: Props.command answers first, with how to gather/mine when a
  matching patch or vein is within 2 (Crafting.getHint), else "There's no
  X here to pick up."
- Attacks out of reach: "They're too far away: stand right beside them (a
  diagonal square counts as two)." (EnginePatch; range is counted along
  the grid). The tester took diagonal refusals for a stuck attack.
- Talk.forClient: the wear hint lost its "e.g. wear leather vest".
Content (tools/server/fix_playtest3.py, 42 files, backups in
backups/playtest3-*; sources updated to match):
- Ssarakh: signposts at 1689,948 (south: the harbour, Marsh Wren) and
  1704,940 (east: Shaman, slimes); Chieftain Hesska names the board, the
  Shaman and the pier (ssarakh.mjs).
- Bog slime bounty: "east and north-east of the city, past the Shaman's
  hut" (bounties.mjs); tier-2 notices "not for a beginner" (all towns).
- Brood-Mother's gaps say where she is (hatchery.mjs).
- Leather jerkin mod 10 -> 20 (it equalled the free cloth shirt).
- Bog slime, mire lizard, bog crawler, swamp serpent: grouprelation 0, no
  faction (no ganging up, as the hounds; they no longer attack first or
  wander) (swampmobs.mjs).
- Green blob INT 11 -> 1, WIS 12 -> 2: gold is goldgainmod (0.5) x the
  creature's points (cp), so 34 gp -> ~24, and its cp (48) no longer
  looks scarier than a mire lizard's (50).
The user's calls: all five content fixes, rising training price, packs to
0, cut the blob's gold. dusk-bot (playtest repo) also changed: waits for
the sex/class answers after a race, "You are female.", journal listed as
the Journal tab, flee announced, "Damage modifier".

## 2026-10-19 20:30: Friend of Aelindor gets a real task (installed; LIVE after the next restart)

- aelindor.mjs: Ilsevel no longer blesses on the spot. aelindor_welcome ->
  she asks for a gloom fang (new flag aelindor_task, journal line) -> fang
  taken -> aelindor_blessed -> Elder as before. Elder has an aelindor_task line.
- Den: 7 gloom hounds (36 HP, stre 28, dext 4, bravery 3, wolf sprite 21;
  Painted art draws them as dark wolves via /hound/), meadow north-west of
  the city 426-434 x 1181-1192 (open grass, reached from the north gate road
  then west; the west gate is a much longer walk). giveitem gloom fang 0.5; the fang has no cost (unsellable).
- Installed with a trimmed bundle (scratch ilsevel.json: the two NPCs' talk
  files, defMobs/defItems, 7 mobs entries, journal + flag) via install_city
  --force. The full plan can't rebuild over the live map (the city's own
  walls fail mayBuild), so it was built through a wrapper with
  mayBuild: () => true and only those parts kept. Live talk files matched the
  old build exactly before replacing (no god edits lost).
- LIVE since the 20:34 restart. Played end to end on scratch as hgate:
  offer, no-fang refusal, 2nd kill dropped a fang, taken, blessed, Elder
  reward. Ilsevel's directions changed to the north gate (105 steps vs 177
  by the west gate); that talk file reinstalled on live (no restart needed).

## 2026-10-19 22:03: Velkarath welcome + play-test 3 leftovers (installed; LIVE after the restart)

- Velkarath: only dark elves get in (the stairs), so Matron Xalyth's quest
  is a coming-of-age rite (hatchling -> Drow of House Xalyth, the payoff of
  the "From Hatchling to Drow" tutorial), not a test: Xalyth and Ilvra
  (velkarath.mjs; same flags, steps, reward). Talk files installed with a
  trimmed bundle (live matched the old build); journal line patched in
  ~/DuskRPG/journal (read at start-up).
- server/BattleFix.java + BattlePatch (classes; BattleFix in build.sh and
  install.sh lists): rewards only to those standing (a mutual kill pays
  nothing; Quests.splitExp1/2 and world boss/quest kills too); "You have
  won the battle." only after a kill, else "Your foe has fled. The battle
  is over."; death/flee losses = what the message says (floor); a creature
  of the attacking side (it started the fight) now drops its item to
  thnFront2. Patch checks counts (8 gold splits, 12 losses, 2 drops, 1 line).
- tools/server/fix_playtest3b.py (applied, backups playtest3b-20261019-220250):
  cheap bow 600 -> 250; large bag 8 items / 30 weight / 120 gp; lavendar ->
  lavender (item, recipe, shops, storage list, Crafting.java); training_dummy
  -> "training dummy" (defMobs, mobs, city plans; achieved kill counts left);
  Basking Rock counter 1679,948 and Gesh 1678,947 (were out of sight from
  the door; ssarakh.mjs too).
- Tested on scratch (hgate): mutual kill -> no reward, lost 222gp/6798exp
  exactly as said; dummy name; normal kill still "won" + drop; inn seen
  from the doorway. Class backups classes-20261019-220250.

## 2026-10-19 22:51: tutorial arrivals say where to go next (LIVE, restart 22:51)

- tools/server/fix_arrivals.py (applied, backups arrivals-20261019-225105):
  each tutorial's end stone (2 tiles per race: done and skipped; the
  defMoveActions script and its tileactions json) adds one line from
  someone standing there, and the "Training done" journal line says the
  same: humans -> Sergeant Wexley outside Kingshaven's east gate + the
  bounty board; elves -> Elder Faelar; dark elves -> Matron Xalyth; lizardfolk
  -> Chieftain Hesska. grove/velkarath/hatchery.mjs match (velkarath build
  checked byte-for-byte against live); the human tutorial has no plan file.
- Tested on scratch with a new dark elf (arrivetest/arrive42, skipped the
  tutorial): arrival line and journal shown.

## 2026-10-20 00:55: play-test 4 fixes (LIVE, restart 11:59)

Play-test 4 (an elf Ranger, ~70 min; ~/dusk-playtest/archive/run4) never
reached Eastreach and found no monsters. Its "commands stalled for minutes"
was the tester itself: the transcript shows every goto done in a second and
the server sending status throughout. Fixed (plans, then on scratch):
- Aelindor's lake slimer bounty said "by the lake north of the city"; the
  slimers are on the lake shore east (534-584 x 1266-1290, greenwardens.mjs):
  bounties.mjs + its journal line.
- Nobody pointed to Aelindor Landing (444,1184, ships to Eastreach), which
  the tester passed within 10 squares: the Elf Guard says the north road
  goes there, the north gate sign says so, and a new signpost stands at the
  road's turn west (474,1193).
- Tutorial provisioners (Merrin, Mossa, Nym) stood on the near side of
  their counters with the shop square behind: swapped (props + merchants).
- The trainers' gate ("Not yet! Bring me the stuffing...") spoke before the
  player had met them: now "Come and see me first, at the north end of the
  glade/hunting ground/pit". Thandril, Kreeth and Zeerith take the stuffing
  at once if the player beat a dummy before talking to them.
- Quarter staff and cloth shirt were sold for 0 gp: 40 and 5.
- Hunger/thirst lower five stats silently: the messages now say so and what
  to use.
- Morvane's boss call said "the old world": "the east field, south-east of
  Southfield". Captains Liriel and Rowan shouted "Fifty gold!" (the fare is
  20): "Twenty gold!" (their talk files also clear the newer voyage flags,
  as ferry.mjs already did).
- Install: trimmed bundle (the changed talk/tileaction files + worldbosses,
  built from the plans with mayBuild overridden; scratchpad r4/pt4.json)
  with install_city.py --force, then tools/server/fix_playtest4.py
  --apply, then restart. Note: the signs file is text, x, y; signnames is
  x, y, name (a wrong-order entry stops the engine loading props: no NPCs).
- Tested on scratch (Rfivetest/botpw42): dummy before Thandril -> gate line
  -> shortcut hand-in; bought from the near side of Merrin's counter; bounty
  text, guard, gate sign, signpost; Liriel ticket and the Morning Star to
  Eastreach (~4 min).
- Live: installed 11:59 (backups city-play-test-4-20261020-115924 and
  playtest4-20261020-115924), restarted from the host 11:59:26, clean load.
- Not done (then): a new Ranger can't afford the 250 gp bow and has no
  skills or spells at level 1 (see starter kits, 13:20); "look" can't examine your own items (may be dusk-bot
  only); answering after a "look" ends a conversation. (Human tutorial:
  see the 12:48 section.)

## 2026-10-20 12:48: human tutorial + a Midnight rumour (LIVE, no restart needed)

- The human tutorial (no plan file) checked: the Quartermaster is a named
  entry in the merchants file (144,381), not a prop, and is there. The
  Drill Sergeant now takes the stuffing at once from a recruit who beat a
  dummy before talking to him (tools/server/fix_drill_sergeant.mjs makes his
  .dlg and script), and his gate (139,377) says "Not so fast, recruit!
  Report to me first." (tools/server/fix_playtest4b.py). Backups
  playtest4b-talk-20261020-124848, playtest4b-20261020-124849.
- Old Sailor Wick (The Drunken Dragon, Kingshaven; capital.mjs) has "Any
  tales?": his grandfather's tale of a hollow tree in the old country with a
  city of night on the other side. The only hint of Midnight, by design.
- Not played in-game after install (talk scripts made by the same
  toScript as all the others).

## 2026-10-20 13:20: starter kits + ranged fights (LIVE, restart 13:25:57)

- Classes.java: a class's start items and skills (not stats, HP, MP or
  spell groups) are its starter kit. Choosing names it ("You are now a
  Ranger. You get a hunting bow (in your Backpack: wear it) and learn
  Double Attack."). Anyone who chose before gets it once at login (hidden
  flag starter_kit; set only when every item fitted; skills raised to the
  kit's points, never lowered).
- Kits (tools/server/install_starter_kits.py writes the classes file's start
  lines and defItems/hunting bow; Classes.java defaults match): Fighter
  short sword + Double Attack 10 (+ Dodge 5 as before); Ranger hunting bow
  (new: ranged, mod 120, range 3, 60 gp) + Double Attack 10; Paladin short
  sword + Dodge 5; Cleric and Priest quarter staff.
- Double Attack n = n% a round of an extra hit (Battle); Dodge is weak
  (skill x 0.75 x a DEX factor).
- Ranged fights ended after one round with every creature ("X is out of
  range", "Your foe has fled"): a creature out of reach walks toward its
  foe, and LivingThing.moveTo makes any mover flee unless its vctEntities
  holds a foe, which only players keep. LivingThingPatch now swaps those
  two checks for BattleFix.sees (a creature sees a player when the player
  sees it). The cheap bow and every ranged weapon had this.
- Tested on scratch: new Ranger/Cleric/Fighter messages and skills; an old
  Ranger (Rfivetest) got the kit once, not twice; a lizard shot from 3
  squares walked up and the fight went on to the kill.
- To go live: the build in /tmp/dusk-scratch-build/out on duskserver (built
  from live's classes), install.sh with OUT= that dir,
  install_starter_kits.py --apply, restart at once.
- Live: installed by the user 13:25 (backups classes-20261020-132555,
  starter-kits-20261020-132555), restarted 13:25:57, clean load.

## 2026-10-20 16:16: play-test 5 fixes (LIVE, restart 16:16:45)

Play-test 5: a human Ranger (~/dusk-playtest archive/run5). The tutorial,
the kit, the Drill Sergeant and the Gannet to Eastreach all worked; the
lost time was all in Kingshaven. tools/server/fix_playtest5.py changes the
live files; the plans (capital, kingswatch, bounties, eastreach .mjs) match.
- The cathedral altar (defMoveActions/1460_329, on the way up to the
  priestess) took 25 gold at every step, full health or not: the tester
  paid 50 of 90 walking through. Now 5 gold, and only when HP or MP is
  below full; otherwise "You are whole already".
- Sergeant Wexley's post is behind the houses north of the east road;
  nothing on the road said so. A signpost at the lane (1496,357), the
  east gate guard says where, and the arrival line and journal say "north
  of the road, behind the first houses" (and "her": Wexley is a woman).
- "The meadow behind Hilda's farm, the last farmhouse": no such farm (a
  townsperson called Hilda lives in a cottage); the last farm is Farmer
  Hollin's, and the meadow is only reached up the lane beside it. Every
  text (notice, journal, Wexley, north gate sign) now says so, a signpost
  stands at the lane's foot (1399,300) and Hollin mentions the hounds.
- Harbourmaster: "the longest pier, with the Kingshaven Ferry sign at its
  head" (was "the long middle pier"; there are five). Eastreach's sign
  names all four ships. Trees in front of the door at 1511,354 are meadow.
  The hunting bow's description says it needs no arrows.
- Not done: the Royal Armoury's underscored item names (silver_helmet,
  gold_leggings, platinum_suit) need item files, shops and backpacks
  renamed together.
- Tested on scratch with botcheck: altar hurt (5 gold) and full (free),
  Maren, the east guard, both signposts, Hollin, hounds seen from the lane.

## 2026-10-20: beta renamed to alpha (LIVE)

- The user wants to start with alpha testing. Player-facing wording only:
  client (deploy.sh), live web pages + news.json (sed; backup
  DuskRPG/backups/web-alpha-20261020-165617), bridge messages (dusk-bridge
  restarted 16:56 via pct exec 303, nobody online), beta.conf comments.
- Kept internal names on purpose: betagate.py, tools/betakey, ~/dusk-beta,
  betakeys.sqlite, BETA_GATE, DUSK_BETA_DIR, "#beta" protocol frame,
  localStorage dusk.betakey/betatoken, beta_site_links.py (now writes
  "Alpha"). The "beta" god item is unrelated and unchanged.

## 2026-10-20 18:28: armoury names, first thirst (LIVE, restart 18:28)

- tools/server/fix_armoury_names.py (applied, backups armoury-names-*):
  both Kingshaven armour shops (merchants 1427,343 and 1444,343) list
  spaced names; missing twins (bronze/silver/gold belt and sleeves) made
  from the underscored files; the bronze helmet/gloves/leggings/suit twins
  (anvil recipes, zakken drop) took the shop's stats (user's call).
  capital.mjs matches. Underscored files kept (no player holds one).
  "an <consonant>" descriptions fixed in 10 item files AFTER the restart
  (backups armoury-names-an-*), live since the 18:35 restart.
- First thirst: users/default (the new-character template) had nothirst
  duration 600 ticks (10 min); now 3600 (1 hour). Drinks give 10800.
  Backup backups/thirst-*. Read at character creation, no restart.
  nohunger there was ticks 600 / duration -1 (never hungry until the
  first meal); now 0 / 3600 too (backup backups/hunger-*).

## 2026-10-20 18:35: Kingshaven signposts (LIVE, restart 18:35)

- tools/server/fix_kingshaven_signs.py (applied, backups
  kingshaven-signs-*): Signposts at 1441,351 (by the arrival square),
  1433,340 (north), 1413,356 (west), 1459,360 (east), 1438,375 (south),
  each on a crossing corner off the lanes; the keep sign (1414,337) names
  Lord Steward Halvard. capital.mjs SIGNPOSTS matches. Checked with
  dusk-bot on scratch: NPCs load, the plaza signpost reads, the Royal
  Armoury lists spaced names.
- defConditions/starter_kit made on live and scratch by hand. Classes
  makes it at the first kit, but scratch.sh setup (rsync --delete from
  live) had removed scratch's copy, and botcheck (who has the flag) then
  crashed scratch at login. Same risk for any hidden flag made on scratch
  only: check defConditions after a setup.

## 2026-10-20 21:16: play-test 6 fixes (LIVE, restart 21:16:03)

Play-test 6: a dark elf Ranger, Velrith (~/dusk-playtest archive/run6;
notes, transcript, brief). Tutorial fine; never reached Eastreach: nothing
in Velkarath mentions the stairs up. Claims checked in the transcript:
- Real: no way out pointed to (flood fill from the stair mouths: west 106
  steps to Aelindor Landing, east 289 steps to Eastreach on foot, south
  wilderness); the guard's "market lies south" (no market; the tester
  walked into the bank); "stand right beside them" with a bow (the dummy
  was 7 away by the grid, range 3: refusal right, text wrong).
- Not real: "hunger/thirst came silently" (both messages at 20:41, 62
  min in, as the 1-hour start meant; the tester missed them); "only two
  bounty notices" (Cave Slime at 1338,907, never read); "never asked about
  sex" (the bot passed --sex).
- Fixed: tools/server/fix_playtest6.py (backups playtest6-*): tunnel
  signposts 1309,914 / 1347,944 / 1385,921, guard and Matron lines, journal
  "Training done.", bounty boards "the easiest on the left". EnginePatch
  FAR_FIXED: "get closer. Right beside them, or within your bow's reach if
  you wield one". Plans match (velkarath, grove, hatchery, bounties .mjs).
  Class backups classes-20261020-211601. Checked on scratch with Velrith
  (shadow42): the message, the west sign, the guard.
- Not done: (progression: explained at 21:40, see below); dusk-bot's legend names some wall
  tiles "cobblestones" (bot-side); (bank: fixed 22:13, see below).

## 2026-10-20 21:40: progression explained (LIVE, no restart needed)

- tools/server/fix_progression.py (applied, backups progression-*): help
  gets "Growing stronger: ... There are no levels: spend your exp at a
  trainer ..." and "(a bow reaches a few squares)" on the fighting line
  (help is read from disk per use); the four tutorial trainers' hand-in
  replies (Drill Sergeant, Thandril, Kreeth, Zeerith; script + .dlg) add
  that fights earn experience and trainers turn it into strength and skill.
  Plans (grove/hatchery/velkarath .mjs) and fix_playtest.py's HELP match.
  Not played in-game; text checked in the live files.

## 2026-10-20 21:46: clan on the who page (LIVE, restart 21:46:51)

- server/Who.java: who.json players get "clan" (null when none, via
  Clans.none) and "leader" (privs == Clans.LEADER with a clan). js/who.js
  rows get clan ("Grey Hand (leader)" or ''), who.html shows it as a badge
  after the title (rows wrap on phones). test/who.test.mjs covers it.
  Checked on scratch: hgate -> "clan":"Grey Hand","leader":true. Class
  backups classes-20261020-214649.

## 2026-10-20 22:13: Velkarath bank counter (LIVE, restart 22:13:40)

- tools/server/fix_velkarath_bank.py (applied, backup
  velkarath-bank-*): shortmap 1353,927 1354,927 1362,927 1363,927 floor
  (42) -> counter (58), so the counter meets both side walls and the back
  room (teller at 1358,928) is closed off. The run 6 trace: in at the door,
  south blocked, round the east gap into the back, then south/east into
  walls. velkarath.mjs fill(93, 77, 11, ...). No saved character stood in
  the back room. Checked on scratch: "talk Dark Elf Teller" from 1358,926
  answers (TELLER_REACH 5); south is blocked.

## 2026-10-20 22:29: Velkarath guard in short answers (LIVE, no restart)

- The user found the guard's one long speech too long. velkarath.mjs
  GUARD (now exported): "Keep your blade sheathed, Drow. What do you
  need? (city/surface/caves/farewell)", one short reply each.
  tools/server/fix_velkarath_guard.mjs writes the .dlg and script from it;
  copied to live talk/ (backup velkarath-guard-*, .dsko removed). Checked
  on scratch: greeting, surface, city.
- Lesson: keep NPC lines short; split directions into topics.

## 2026-10-20 23:00: shorter NPC lines and signs (LIVE; signs since the 23:21 restart)

- The user: directions "way too long", trim them in every city. Trimmed
  directions/instructions. Story and lore lines stay long (the user's call).
- Every live talk script rebuilds exactly from its .dlg (147/147 checked),
  so: copy talk/ -> tools/server/trim_lines.py edits the .dlg copies ->
  tools/server/regen_talk.mjs rebuilds the scripts -> copy pairs back,
  .dsko removed. 41 NPCs (backup backups/short-lines-*): four Kingshaven
  gate guards (greeting + City/Harbour[/Watch post]/Farewell), Halvard's
  city answer (DIRECTIONS), Elf Guard, Harbourmaster Quint, Ringmaster
  Corvin, Overseer Garrick, Matron Xalyth (both lines), Sergeant Wexley
  (the kingswatch.mjs pieces: offers, acceptReply, afters), Drill
  Sergeant, the tutorial greeters + CHAT_TIP, all 24 bounty notices
  (bounties.mjs template: "Reward: G gold, E exp. <tier>"). Chieftain
  Hesska rebuilt from ssarakh.mjs HESSKA by tools/server/regen_hesska.mjs
  (her topics merge into her quest stages, as mergeQuest does).
- Signs: tools/server/fix_short_signs.py applied to the signs file (backup
  short-signs-*): Grand Plaza, the five Kingshaven signposts, Velkarath's
  west/east stair signs. Read at start-up: flan was online at 23:00, so
  the restart is the user's (`restart 10`). No god "save" before it.
- Plans match: capital (DIRECTIONS, guard(), SIGNPOSTS, plaza sign,
  harbourmaster), aelindor, ssarakh, arena, greystone, kingswatch,
  bounties, grove/hatchery/velkarath.

## 2026-10-20: item audit (report only; nothing changed)

- The user asked for low/mid/high sets, everything working, nothing crazy
  except quest rewards; then chose "report only". Report (private
  artifact): https://claude.ai/artifact/SSGysN9qi33j4robXXDdu4, built from
  tools/server/audit_gear.py's JSON.
- Damage (javap of live Battle.damRoll; CFR showed integer division, it's
  double): STR/2 x (0.5-1.5) x weapon mod/100 - (weighted armour + DEX +
  dextbon/10 + acbon). Fists = 100.
- All items load and work. Findings: bows range 20-25 (cheap bow, wooden
  crossbow, ash/yew/elderwood); crafted armour weaker/dearer than shop
  (bronze breastplate, iron pieces); price outliers (leather vest 832,
  crystal helmet 40000, wizards gauntlets 800); full sets: leather 19,
  bronze 44, silver 58, gold/plat 73, steel 102, crafted mithril 205,
  crystal 102, vortan 152 (2 pieces), diamond 250 +200 HP, blood 198 +90
  HP; steel helmet (30 armour) from early quests (Wexley barrow, Warden
  Marr); shifty god items' wear scripts missing; Generic Item Post junk.
  Only 16 item kinds are owned by players. Waiting for the user's call.

## 2026-10-21 00:15: item rebalance (LIVE, restart 00:15:05)

- The user approved the proposal in the audit artifact (v2):
  tools/server/fix_item_rebalance.py (applied; backups
  item-rebalance-*): 114 defItems (mod/range/cost) + the new game file
  gearneeds (66 items: "name|STR/DEX/INT|n", tiers mid 15 / high 30 /
  top 45; quest-only rewards and low tier exempt). server/Classes.java:
  needs() reads gearneeds when it changes; lacks() checks base + race bonus
  (stre/dext/inte + *bon); wear (by number or typed name) refuses, buy warns
  once (2 min) like the class check; gods exempt. Already-worn gear isn't
  re-checked at login.
- Wexley's barrow and Warden Marr's rewards: iron helmet (talk .dlg +
  scripts, backups quest-helmet-*); kingswatch.mjs / frontier.mjs match.
- Client: tools/iteminfo.py adds range and needs, and skips an underscored
  twin when the spaced file exists (steel_helmet hid steel helmet's
  numbers); js/iteminfo.js shows Range and Needs (test updated).
- Checked on scratch (botcheck, STR 11): gold suit buy warned then bought,
  wear refused with the message; silver suit (low) fine. Class backups
  classes-20261021-001503.
- Not done: the strong old-world sets keep their power (gated by 30-45
  instead); the audit page shows the pre-change numbers plus the proposal.

## 2026-10-21 03:14: play-test 7 fixes (LIVE, restart 03:14:12)

- Run 7: a dark elf Ranger (Velithra), notes + transcript in
  ~/dusk-playtest/archive/run7. It spent most of the hour lost in
  Velkarath and never reached Aelindor. Every place it looked for is
  reachable (checked by walking the map's walkable tiles); what it was
  told didn't get it there.
- tools/server/fix_playtest7.py (28 files, backups playtest7-*):
  - the guard: names the shops by the Fire Well (the tester took the south
    street for "the main street"), says Dral trains in the Pit, and the
    Caves answer gives the way to the slime and duergar caverns; his
    passing line (.greet) is "Walk softly, Drow. Talk to me if you are
    lost." (was "Keep your blade sheathed", read as a telling-off)
  - where to train: Zeerith and the Matron's last line name Weaponmaster
    Dral in the Pit (301 exp went unspent)
  - the dens: the bounties, the Deep Patrol and the journal add "up the
    temple's east side" (north-east cavern), "round behind the Black
    Lantern" (north-west cavern), "south down the Pit's east side" (Ember
    Hollow)
  - the stairs: the sign at each stair's foot names the stair and the way
    to the city; the tunnel signposts say the stair is at the end of the
    tunnel; climbing the west stair says Aelindor Landing lies north-east
    (the tester walked north, away from it), the east stair Eastreach east.
    The game runs defMoveActions/<x>_<y>; tileactions/*.json is the God
    tab's copy (both changed)
  - Armsmaster Quave names what he gives
- velkarath.mjs (STAIRS up/below), bounties.mjs and deeppatrol.mjs match.
  Checked on scratch with Velrith: guard answers, signs, the west stair.
- Not changed (the tester's other points): the slow goto was the tester
  pausing (no command for 70 s); the classic prompt says "Priest" because
  it comes before the sex is chosen; arrows (a thing you use to shoot) are
  described only as "an arrow"; the Archivist says "mire-folk" where the
  journal says "lizardfolk" (lore, kept); the bot legend's walls-as-
  cobblestones (open item). Velkarath feels big and empty (a big plaza,
  ~10 identical houses): the user's call.

## 2026-10-21 11:55: Velkarath lived in (LIVE, restart 11:55:27)

- The user: "fill out velkarath more, make it feel more lived in". Added
  in velkarath.mjs (TOWNSFOLK, WARES garden/weaver/cook, the build's
  homes section):
  - the Fungus Gardens (plan 62-80, 90-97; map 1322-1340, 940-947): 16
    mushroom patches anyone can gather from (Crafting source, sickle),
    Fungus-Tender Ilphra sells herb sickles and mushrooms
  - the Night Market (plan 89-111, 90-97): Weaver Zilvra (leather cap,
    helmet, belt, sleeves, leggings, pants, jerkin, small/large bag:
    Velkarath had no armour shop) and Cook Rhylla (sandwich, mushroom,
    water, ale), barrels, sacks and three shoppers (look-only props)
  - someone in each of the four homes (Old Ghaundra, Sabal and a Drow
    Hatchling prop, Dhuunyl the Lamplighter, Ilzt off duty), a chest and a
    barrel each; Raelag outside the Black Lantern, Lady Myrymma by the
    palace; a barracks north of the Pit (plan 113-122, 57-62) with bunks
    and Sergeant Ilzaer. One short line each (two have topics); only the
    stallholders and Raelag call out
- Installed with only the squares of those three areas
  (tools/world/bundle_only.py <bundle> <out> 1322,940,1340,947
  1349,940,1371,947 1373,907,1382,916): a full Velkarath bundle would
  take out 99 wall torches that lights-velkarath.mjs put in after. Any
  later Velkarath rebuild needs the same, or lights-velkarath rebuilt
  after it. install_city kept the live Dark Elf Guard.dlg (same content).
- Checked on scratch (Velrith): every shop, the dens and all three stairs
  reachable on foot; bought a sickle from Ilphra and gathered a mushroom;
  bought a leather cap from Zilvra.
- B2 off-site backup checked: no cap errors since --fast-list (log quiet
  since 2026-10-20 23:30), the 11:16 users zip is in the bucket.

## 2026-10-21: play-test bot legend (no game change)

- ~/dusk-playtest/dusk_bot.py TILE_KINDS: tile 49 and its edges 50-57
  are "plain brown cobblestones" `b`; 95/104 "cobblestones with large grey
  stones" `c` (both were "cobblestones" `c`). 49 is drawn as a cobbled
  floor in both art styles (pixel map.gif and painted) but blocks
  everywhere: Velkarath's cave walls ('R' in city.mjs) and the old world's
  cliffs (68k squares). Kept as what a player sees, not "rock face", so
  the bot doesn't reveal walkability (README "Walkability is not shown",
  updated). Real players face the same thing in Velkarath: see Open.

## 2026-10-21 12:10: Velkarath rock as grey fieldstone (LIVE, restart 12:10:11)

- The user asked for it after the bot legend fix. Velkarath's cave walls
  were tile 49 (city.mjs 'R'), drawn as a cobbled floor in both art
  styles. tools/server/fix_velkarath_rock.py (backup velkarath-rock-*):
  inside 1260-1429, 850-989 only, 15,355 squares 49 -> 98 (the old
  world's grey rock face; lights.mjs TORCH_ON knows it) and 60 torches
  167 -> 162. Both block, so only the look changed. velkarath.mjs turns
  its 'R' into 98 at the end of the build (a rebuild still needs
  bundle_only.py or lights-velkarath after it). The old world's cliffs
  keep 49.

## 2026-10-21 14:27: Greystone Mine filled out, The Old Drift (LIVE, restart 14:27:43)

- The user picked the Greystone quest chain ("fill out the mine"), then
  "add the drum too". All in tools/world/cities/greystone.mjs (header has
  the places): bunkhouse 860-881 x 201-211 (Cook Dagna's shop square
  876,204; Petra Coalhand), the sump 841-862 x 264-282 (6 tunnel
  crawlers), the Old Drift dug east and south to the lost crew's camp
  928-946 x 236-248 (5 duergar delvers, the W.A. sign), the Grey Delve
  922-948 x 257-282 (5 duergar guards, Thrumgar the Grey Warlord 937,277,
  the great iron drum prop 938,279 with the barrel picture). Rubble
  923,221-222 is tile 49 with a walk rule: gs_dig, set by accepting
  gs_drift (offer.effects). Digger Rook beside it (flag stage).
- Quests gs_crawlers -> gs_drift -> gs_knocking (Garrick, Garrick, Bryn).
  Rewards bronze helmet / iron gloves / bronze shield. Delvers drop the
  "brass lamp" at 0.5 (not "Wil's lamp": the engine says "You got a <name>").
  The lamp has cost 30 (sells for 15; cost 0 can't be sold), added 15:28
  straight into live and scratch defItems (getItem reads the file each
  time: no restart). No player had one yet.
- Old Fisher Tam (capital.mjs): "Forty years I've fished this shore, since
  the ships came." Live talk/ script + .dlg edited 15:30 UTC (backup
  backups/fisher-tam-*, .dsko removed, no restart); dropped from
  lore_bible.py section 7; /root/DUSK_LORE_BIBLE.md regenerated.
- The mine's rock is now tile 98 (end of the build), like Velkarath; the
  new halls are built after the veins, so the 21 veins didn't move (props:
  29 added, 34 already there). mayBuild is now () => true (the whole box is
  the mine's). Garrick's "Any work?" topic is gone (the quest offer
  replaces it); Bryn's topic is "What does it say?".
- Built with `node tools/world/city.mjs tools/world/cities/greystone.mjs
  <shortmap> <out> <props.json>` (props.json = live defProps of Villager
  Woman, Villager Man, hermit), installed with install_city.py
  --old-world --force (backup backups/city-greystone-mine-20261021-142741),
  restarted from the Proxmox host (nobody online).
- Tested end to end on scratch with botcheck (buffed: str 60, hp 500-900):
  rubble blocks without the flag, every step counts, the rewards arrive.
  Thrumgar did ~350 damage to a 40-dex character; the guards ~80 each.
- tools/paintart/bestiary.js: duergar in the person family (grey skin,
  beard, dark iron; delvers a pick, others an axe), Thrumgar horned and
  gold-trimmed. Deployed.
- LORE.md: the duergar and a Greystone section. tools/lore_bible.py adds the
  gs chain, fixes the stale "after lines are never heard" note (they are,
  joined to the next offer) and drops the keep sign from section 7 (fixed
  already). /root/DUSK_LORE_BIBLE.md regenerated from live 14:29, for the
  user to put into Claude on the web.

## 2026-10-21 16:50: canon cleanup, part 2 (INSTALLED 16:42 UTC; talk and walk-ons live, signs and props wait for flan's restart)

The user's "CANON CLEANUP, PART 2" (decisions F-J, now in LORE.md).
tools/server/canon_cleanup2.mjs (canon_cleanup.mjs's shape) makes a bundle
from a copy of live; tools/server/canon_install.sh installs it (backup
under backups/canon-*, refuses if a file changed since: ORIG.sha256).
Staged: duskserver ~/canon2-bundle (everything) and ~/canon2-bundle-noaged
(without step 4's aged signs), both checked against live at 16:45.
Installed the full bundle (backup backups/canon-20261021-164253) with
`ssh duskserver 'sh canon_install.sh ~/canon2-bundle ~/DuskRPG'`,
then a restart (signs and props are read at start-up; flan was online, so
`restart 10` in the game; no god "save" in between).
- Step 1: Armsmaster Doyle "fit for the Royal Guard"; keep sign 1414,337
  "The Lord Steward governs here in the princess's name." (capital.mjs too).
- Step 2: no bug. Halvard's default greeting has all five answers on live;
  lore_bible.py hid answers already shown for an NPC, now says "(also:
  ..., as above)".
- Step 3: 545,16 guard says "Salharasha was our elder. She took ship east
  with the rest. Osric keeps us now." and no longer pushes you back (only
  flan has elderchat; egate did all of Southfield's quests without it, so
  the field is reached another way). Salharasha's prop (946,19), her
  defProps file and her cave script 943,19 removed.
- Step 4: nine original old-world signs get an age line ("The paint is old
  and peeling: ..."). The living-NPC rewrites are a draft only (in the
  user's report, not installed). Trank's 56 thieves are props in his
  training hall (472-485 x 32-40), plus one beggar at 441,54 (walk-on).
- Step 5: signs removed: 500,200 x2, 55,38, 121,78, 167,66, 151,45, 159,45,
  208,897, 3,395, 500,500; edited: 426,170 ("crapy"), 459,77 ("Players"),
  21,806 / 199,899 / 144,894 (AOP, MTH clan names). Walk-ons: 458,85 (LOL),
  194,139 ("You get condition gatotic"), 199,945 (re-spawn), 15,10
  ("coordinate"), 106,36 (stray endscipt), 846,55 ("Mini Boss"). Watts's
  description lost its "lol". Left (listed in the bible's section 7):
  players' names on houses, CHARACTER POINTS, the flag game, 504,13.
- Step 6: Recruiter (greeting, replies, tutorialStart2, shout "Recruits!
  The ships take soldiers first!"), Quartermaster, Drill Sergeant, walk-on
  125,366 (you start on a ship at 125,365: "the coaster that brought you
  down to Westsea"), the three teleport stones' landing line, journal
  tutorialStart / skiptutorial / tutorialStart6.
- Step 7: greystone.mjs `talk` (exported) adds the gs_knocking_done stages:
  Bryn's thank-you replaced, Garrick a gs_knocking-tagged stage ahead of his
  gs_drift one, Dagna an own stage. The quest's "after" line is unchanged
  (a God-tab re-merge of gs_knocking would bring Bryn's old one back).
- Step 8: no numbers changed. Finales are 300-360 HP, strength 70 (the
  Ashen Gaoler 900 HP; the Lizard Axemen 300 HP, strength 40); world
  bosses 1,100-1,400 HP, strength 80-90. The worldbosses note was right;
  the plan headers (kingswatch, zilen, izaru, frozenreach, deeppatrol,
  greenwardens) still said 42-45 from before the tune-up and are fixed.
- Step 9: LORE.md fixes and F-J; lore_bible.py section 7 rewritten.
  /root/DUSK_LORE_BIBLE.md regenerated from live + the bundle (16:50).
- Tested on scratch: both tutorial paths to Kingshaven (canontut,
  canonskip), Halvard with and without ft_word_done, Bryn/Dagna/Garrick
  with (botcheck) and without (canonskip) gs_knocking_done, the guard both
  ways, every edited sign read in game (500,200 and 500,500 can't be stood
  on), the walk-ons that can be reached. Scratch stopped.

## 2026-10-21 17:13: step 4's old-world NPC lines (LIVE, no restart)

- Approved by the user: tools/server/canon_relics.mjs (walk-ons 440,76,
  440,79, 442,72, 463,63, the Midnight inn beds 464,60/464,62/465,61,
  479,37, 479,38, 479,45, 195,197, 7,966; quest fr_dragon's reply and
  after), then merge_quests.mjs for Reeve Osric. Installed with
  canon_install.sh (backup backups/canon-20261021-171343). fireorb.mjs and
  frozenreach.mjs carry the same lines. The 56 thief props in Trank's hall
  are unchanged.

## 2026-10-21 17:25: Trank's hall thinned (LIVE, restart 17:25:56)

- 48 of the 56 thief props in Trank's training hall (472-485 x 32-40)
  removed from props; 8 stay (472,38 474,33 476,39 478,37 480,40 483,34
  484,38 485,36), plus the beggar at 441,54. Backup
  backups/canon-20261021-172555. Nobody was online; restarted via pct.

## 2026-10-21 17:41: City of Light gate and market lines (LIVE, no restart)

- Walk-ons 96-98,109 (into the city): "Be welcome in the City of Light. It
  still stands, whatever you've heard." 96-98,112 (out; it used to say "We
  are looking forward to your visit."): "The gate shuts behind you. Come
  back while there's still a city to come back to." 105,152: "...Market of
  Light. Half its stalls stand empty." 105,151: "Look around a bit; what's
  left is still for sale." Backup backups/canon-20261021-174137, .dsko
  removed.

## 2026-10-21 17:52: north-west village lines (LIVE, no restart)

- 31,36: "You pick a copy of 'Dark Star News' out of the gutter. The last
  issue, by the look of it." defItems/newspaper "the last issue of 'Dark
  Star News', yellowed and torn"; scripts/readNewspaper (was the 2001
  admin's "Einhanzer has returned" note) now the paper's last issue: the
  village gone to Westsea for a berth east. 130,5 / 140,35: "old
  teleporters, still humming" instead of "tweeking teleporters". Backup
  backups/canon-20261021-175238. Left: scripts/news2 ("vortanian news",
  a player's quest note).

## 2026-10-21 18:02: the Vortanian news (LIVE, no restart)

- scripts/news2 (was Gatotic's player note) is now "The Vortanian Crier":
  the two trials, the top one harder with the stronger weapon. Item
  "vortanian news" (name kept: it's the ID) described as the Crier;
  walk-on 200,900 "You pick up a copy of the Vortanian Crier. No one has
  printed a newer one." "Vortania" as the town's name is new (the old
  files spelt it vortanian/voration/votanian). Backup
  backups/canon-20261021-180234.

## 2026-10-21 18:16: old players' house names, the character points gate (LIVE, restart 18:16:45)

- Signs: 123,189 Gatotic's -> "An empty house. The name on the door has
  been scraped off."; 126,191 Tylk's -> "A shuttered house. Whoever lived
  here took the nameplate east."; 119,100 / 121,100 House of Lord Rean ->
  "The Lord's House. The crest over the door has been chiselled away.";
  119,96 "The lord's bedroom"; 121,96 "The guest room"; 596,605 / 600,605
  Kestrons Private Shack -> "A private shack, long empty".
- Walk-ons: 122,79 "This was someone's house. The door is still locked.";
  194,132 "The door won't open for you." / "A comfortable room, if a little
  dusty." (condition still gatotic); 8,492 (gods-only stall) "This stall
  trades only with the gods. You are turned away."; 2,270 (cp < 300) "YOU
  ARE NOT YET MIGHTY ENOUGH TO PASS THROUGH THESE GATES". Backup
  backups/canon-20261021-181643. Nobody online; restarted via pct.

## 2026-10-21 18:18: the flag game's line (LIVE, no restart)

- 955,870 (capturing the flag with no one on the other side, so no 50 gp):
  "But no one is left on the other side to pay the prize." instead of
  "But you're not playing against anyone...". Backup backups/canon-20261021-181816.

## 2026-10-21 18:27: the HAHA square removed (LIVE)

- defMoveActions/504_13 (set gp 0, "HAHA!"; probably out of reach) and its
  .dsko deleted. Backup backups/canon-20261021-182719.

## 2026-10-21 19:11: Recruiter's skip answer; the bible shows after-quest stages

- Recruiter (live, no restart): "Fresh? No just show me the door." is now
  "No. Just show me the door." (also takes "no just show me the door").
  Backup backups/canon-20261021-191104.
- lore_bible.py section 5 now includes each NPC's quest-done stages (36 in
  17 NPCs), so Bryn's and Garrick's gs_knocking_done lines show (they're
  tagged with the quest, which the dump skipped). Live's Bryn/Garrick/Dagna
  talk files are byte-identical to scratch's, where they were played.
- Finale strength 70 dates from 1cd8024 (2026-10-07, "Monster strength by
  tier... 28 / 40 / 55 / 70"); the 42-45 in plan headers was stale. No
  defMobs file has changed since.

## 2026-10-21 19:45: canon decisions K-N (lore only, nothing built)

- LORE.md "Canon decisions (2026-10-21, pillars)": K Morvane wants the
  crown and the chair (not in game); L the Morvane/Kraghul pact broken;
  M Aldric's fate deliberately undecided; N Elowen comes home and refuses
  the crown (to be built). lore_bible.py section 6 updated; bible
  regenerated.
- Engine check for N (report only): per-player visibility exists only for
  creatures and players (conf/canSeeLivingThing, run in
  DuskEngine.refreshEntities/addEntity/removeEntity behind an instanceof
  LivingThing check). Props, so every talking NPC, are sent to everyone
  in view. Options are in the 2026-10-21 report: a small patch (a "shown
  if" flag in defProps, checked in refreshEntities and Talk) is the
  recommended one.

## 2026-10-21 20:05: NPCs shown or hidden by flag (LIVE, restart 20:08:29)

- A prop file (defProps/<name>) may have "shownIf" then a flag on the next
  line (shown only to players with it) and/or "hiddenIf" then a flag
  (hidden from them). The engine's prop loader skips unknown lines.
- server/VisibilityPatch.java (build.sh, after SpellPatch engine) puts
  Props.sees(player, object) into DuskEngine.refreshEntities (before the
  vctEntities.contains check; unseen -> the loop's getNextObject, so an
  already-sent prop gets the usual opcode 16 removal) and addEntity (after
  the contains check; that one compiles as ifeq <add>; goto <next>). Both
  jump to labels that already have frames: ClassWriter(0) is enough.
- Props.sees/rule: rules cached per prop name, file re-read when its
  mtime changes (looked at every 10 s); plain Hashtables, no inner class
  (install.sh copies Props.class only). Props.refresh(engine, who) after a
  Talk script runs and after flagadd/flagremove (only once any rule
  exists, as refreshEntities also resends a shop list). Talk.nearest, talk
  <id> and the shouts skip hidden NPCs.
- Scratch (canonskip, god for flagadd): Netmaker Ilse shownIf vistest
  appeared/vanished at once on flagadd/flagremove and talked only with the
  flag; Old Fisher Tam hiddenIf vistest vanished on flagadd, stayed gone
  after moving, came back on flagremove; a talk script setting the flag
  hid Tam at once; dropped items still show (addEntity); players still see
  each other. Test rules were scratch-only.
- Build: duskserver /tmp/dusk-vis-build/out (built 19:59 from live's
  classes; sources ~/vis-src). To go live: `GAME=$HOME/DuskRPG
  OUT=/tmp/dusk-vis-build/out sh ~/vis-src/install.sh`, then restart at
  once. Nothing changes for players until a prop file has a rule.
- Live: installed 20:08 (backup backups/classes-20261021-200827), restarted
  20:08:29, clean load; no prop has a rule yet.

## 2026-10-21 20:22: main-story NPCs' lines after later quests (LIVE, no restart)

- tools/server/main_story_after.mjs: stages tagged with the later quest
  and marked keep (js/quests.js stripQuest now keeps "keep" stages, so a
  re-merge leaves them; client deployed 20:23): Old Wenna ft_word_done /
  dw_road_done (with her tales menu, no greeting after), Shaman Ithrae
  ft_word_done, Archivist Zyrith ft_word_done, Tombkeeper Aldous
  ft_word_done. quests/dw_road.json after -> "Now you know her road. The
  brood is patient for the rest." (dawnward.mjs too); every quest of
  each NPC merged again; merge_quests.mjs over the result: 0 changes.
  Backup backups/canon-20261021-202208.
- Scratch (msa dw_word, msb dw_road, msc ft_stone, msd ft_word done):
  all four NPCs right at each stage. Aldous offers his zl_ quests before
  any thank-you (as before); with them done msd gets the new line,
  alternating with his greeting.
- 20:27, approved: Trader Kossk dw_brood_done "Hsss. The Chieftain saw
  your locket? Then the girl was real. Buy something, warm-blood."
  (alternates with his greeting); Chieftain Hesska ft_word_done "The shard
  did its work. The brood remembers you now, warm-blood." and dw_road_done
  "Ithrae told me where her road went. The brood remembers her." (her
  greeting and menu after). Same script (now skips what's there already);
  backup backups/canon-20261021-202734; re-merge: 0 changes. Old Bram and
  Elowen needed nothing.

## 2026-10-21 20:35: canon decisions O-P (lore only, nothing built)

- LORE.md pillars: O the Spider Queen is the Weaver of the seals (the
  Drow serve her vigil; the palm mark of the welcome rite is their
  "duty"); P the grey blight is a second gate wearing thin under the
  southern woods near Aelindor, the one Kraghul goes after (place not
  decided). Both NOT YET IN GAME; no NPC lines changed (Faelith's wind
  guess stays). Bible section 6 updated, regenerated.

## 2026-10-21 23:20: The Grey Beneath (sg_) and decision Q (BUILT, tested on scratch, not live)

- tools/world/cities/greybeneath.mjs: sg_return / sg_heart / sg_ash /
  sg_hold (Faelwen, Faelith; every race after gw_grove) and sg_web
  (Priestess Ilvra; requires "velkarath" = velkarath_done). The root-crack
  prop (image 57, as Firetown's rift) at 620,1179; its square is a
  hand-written script (three heartstones taken one by one, given back if
  short; cold grey ash). Grey root dig square 618,1176 (tile rules, flag
  sg_root). 6 dry one diggers (260 HP, str 55, ashen brand 0.6) and the
  Ash-Sworn Breaker (350 HP, str 70, own faction) round it. Items: grey
  root, Elders' heartstone, cold grey ash (cost 0), ashen brand (cost 2),
  Thornward Cloak (torso, mod 120, cost 1200, durability -1; gearneeds
  DEX 15).
- js/quests.js: reward.flags (set when the quest is done): sg_heart sets
  lore_heartstone (in lore.mjs TALES, so Keeper of Tales: 17 now; earned
  ones are never taken away), sg_web lore_web (journal only, not counted:
  drow only). achievements.mjs: doorheld (sg_hold_done).
- tools/server/greybeneath_talk.mjs: merges into live Faelwen, Faelith,
  Ithrae, Ilvra; Faelith gets a kept sg_heart_done stage with "The Grey
  Blight" answered anew (lore_blight).
- paintart: ash-sworn in the person family, horned, ash-red (deploy).
- 23:40 fix: js/quests.js mergeQuest drops a quest stage that a kept stage
  (same quest, same condition) stands in for, so Faelith has one
  sg_heart_done stage. Re-merge of the live main-story NPCs: 0 changes.
  ~/sg-talk rebuilt from live and re-staged.
- Scratch (botcheck boosted to 3000 HP / str 300 for the fights; grove
  thinned to 5 wolves on scratch only): all four quests, the drow through
  sg_web + sg_ash, the crack with 0/2/3 heartstones, Faelith before/after,
  Keeper of Tales kept (2/17 shown, earned), The Door Held on the next 30 s
  check.
- Staged on duskserver: ~/sg-city.json (install_city.py, dry run on live
  clean), ~/sg-talk and ~/sg-extras (canon_install.sh; checked against
  live 23:18). Restart after (props, monsters, achievements), then
  deploy (art, the God tab's quests.js).
- Found: the grove has 20 blighted wolves on live; crowded fights there
  stall ("out of range" forever: diagonal joiners with no free square).
  "You got a ashen brand" (engine's "a"). Both reported, not changed.

## 2026-10-22 11:52: one NPC's own lines where it stands (LIVE, restart 11:52:14, client deployed)

- defPropPlaces/<name>@<x>_<y>: the same lines as a prop file (shownIf,
  hiddenIf, look, description, image), each used instead of the name's
  for the prop placed on that square. For decision N: two props both
  called "Elowen" (cell and Kingshaven), each with its own rule, look and
  description; they share one conversation (talk/ is per name), which
  branches on the same flags.
- server/Props.java: sees() reads the place file then the name's; while
  checking it sets that instance's strDescription and intImage (the
  classic sprite) before it's sent. "prop looks" adds
  "<name>@<x>,<y>=<look>" entries. js/world.js propLook(looks, e) tries
  "name@x,y" then the name (renderer, actions, storage's isTeller).
- Scratch (vischeck): two "Netmaker Ilse" (1469,416 hiddenIf vistest;
  1460,412 shownIf vistest, look Elf Woman): each shown only to the right
  players, with its own description and its own Painted look (screenshots
  compared), talk works for the shown one only.
- Scratch lessons: a user file holding a flag with no defConditions file
  can't log in (NPE at load, and the failed load can truncate the file);
  editing a user file right after a browser session closes is undone by
  the server's save on disconnect: wait for it.

## 2026-10-22 12:05: lore bible from live, with the engine's new story tools

- tools/lore_bible.py: section 0 lists NPC visibility by flag, one NPC in
  two places (defPropPlaces), lines after later quests, quests setting
  extra flags, item-counting squares, and that monsters aren't per player;
  a "Status of this copy" note. Optional 4th argument: a staged quests
  dir, printed for a chain with none on live, marked "Not installed on
  live yet" (now: The Grey Beneath, from scratchpad sg/stagedq).
  /root/DUSK_LORE_BIBLE.md regenerated from live 12:05.

## 2026-10-22 13:05: Homecoming (hc_) and decision R (BUILT, tested on scratch, not live)

- tools/world/cities/homecoming.mjs: hc_row (Elowen in her cell, needs
  ft_word: tell Old Bram) -> hc_chair (Elowen at home: Halvard, then back
  to her) -> hc_herald (the old graves above the beach 1570-1585 x
  435-445: 5 risen king's-men, the Grey Herald, the sealed letter to
  Elowen; gaol-chain belt). Achievement chaircold "The Chair Stays Cold"
  (hc_herald_done).
- Elowen in two places: defPropPlaces/Elowen@369_348 hiddenIf hc_row_done;
  a second Elowen prop at 1430,351 (beside Wenna; no house fits next to
  her: the plaza's west side is Bartender Gus's tavern), place file
  shownIf hc_row_done, look "grey-haired woman" (a new base prop, painted
  in tools/paintart/items.js), its own description.
- Monsters: risen king's-man 120 HP / str 55 (barrow skeleton tier, faction
  of its own), Grey Herald 350 / 70 (own faction, drops the letter 100%);
  image 32; Painted: skeleton family (bestiary.js), a tattered blue tabard
  with a gold sun, and a grey hooded robe with the black-wax letter.
  Items: sealed letter (cost 0), gaol-chain belt (waist, mod 200 = the
  diamond belt's, cost 1200, durability -1, gearneeds STR 15; AC 30 worn).
- tools/server/homecoming_talk.mjs: merges hc_ into Elowen, Old Bram,
  Halvard; kept standing lines (main_story_after's way) for Bram, Wenna,
  Aldous (hc_row_done), Halvard, the Royal Guard (hc_chair_done).
- No notYet on hc_herald: a not-yet stage (rank 3) sits before every
  thank-you, so in her cell it cut in on Across the Burning Sea (a player
  at ft_cross_3 heard "Let me get through the keep first."), and at home
  the hc_chair stages always come first. A later quest in a chain whose
  giver gave earlier ones shouldn't have a notYet.
- tools/server/homecoming_install.sh: install_city + canon_install (talk)
  + add_achievement + the gearneeds line; each step backs up, re-runs
  change nothing. Order-safe with The Grey Beneath (both append).
- Scratch (hcnone: ft up to ft_seal; hcdone: ft_word done; both boosted,
  password hcpw2026): hcnone sees no Elowen on the plaza, and in her cell
  she still offers ft_word; hcdone: hc_row offer/decline/accept/reminder,
  Bram's step, then gone from the cell and beside Wenna; hc_chair; graves
  arrival, 5 of 5, the Herald, letter, belt worn, achievement. Every
  standing line before and after. Talk reach is 2: in Firetown stand at
  371,350 (her cell is walled off from the landing).
- Staged on duskserver ~/hc-stage (made from live 12:40; dry run on live
  clean 13:02). Install, restart, deploy (art and people.json).
- LORE.md: Homecoming under "The crossing", K partly in game, N built,
  decision R (new section 2026-10-22), open threads. lore_bible.py
  section 6 updated; regenerate the bible after the install.

## 2026-10-22 18:50: play-test 8 fixes (BUILT, tested on scratch, not live)

- Run 8 (dark elf Ranger Zyrnaxquel, ~/dusk-playtest/archive/run8, brief =
  run 7's): tutorial and Velkarath fine; never reached the ships. Top
  issues: the west stair's "north-east" led into forest (the pier is 107
  steps away, 12 squares from where it turned north); The Lost Patrol
  (kills before the camp don't count, the reminder didn't name them); the
  Matron's 300 exp makes early fights trivial (flan: leave it for now).
- tools/world/cities/landingpath.mjs: a dirt path, 91 squares, from where
  the stair's cobbled clearing ends (393,1222) north and north-east round
  the trees to the pier's foot (444,1185); sign "To Aelindor Landing" at
  394,1235. Corners found by tools in the scratchpad (fewest turns over
  grass/meadow/sand); mayBuild only 36/37/1/38.
- tools/server/fix_playtest8.py: stair arrival line ("A path runs north
  from the stair..."); Jhaelra's dp_lostpatrol reminder names all three
  steps; the camp counts from 7 squares (places file and json); Ryld's
  sells no arrows (the "arrow" item only works with the old arrow command:
  an item called "bow" plus the Archery skill; Ssarakh's, Aelindor's and
  Kingshaven's bow shops still sell it); "use apple, mushroom, or..." in
  the hunger hint; every ranged item's description ends "It reaches N
  squares (a diagonal square counts as two)" from its own range (the
  engine's look <id> shows a carried item's description; "They are
  wielding <description>" shows it too). Backs up each file once.
- tools/server/fix_playtest8_talk.mjs: Archivist Zyrith, race darkelf
  stage "One of our own, with questions. Ask them quietly." before her
  greeting (lore.mjs zyrith()). Drow on ft_stone still hear "A
  surface-dweller asking..." and the joined "long way down" (not changed).
- tools/server/playtest8_install.sh runs the three (stage ~/pt8-stage).
  velkarath.mjs and deeppatrol.mjs say the same.
- dusk-bot (outside the repo): look/read/examine falls back to an item you
  carry or wear (look <id>), as both clients can; PLAYER.md says so. Run 8's
  "no way to see an item" was partly the bot.
- Scratch (ptdrowa, pt8pw2026): bow description, Zyrith as drow, Ryld's
  wares, stair line and sign, walked the path to Captain Liriel on the
  pier, Lost Patrol reminder and the camp from 7 squares.

## 2026-10-26 17:05: thirst and hunger lines without the hints (LIVE, no restart)

- Live scripts/thirst now says "You feel thirsty, and weaker for it."
  (dropped "Drink something (use water)."; flan: players know to drink).
  Backup: ~/DuskRPG/backups/thirst-20261026-170436.
- scripts/ files are compiled only when their .dsko is missing (Script.java,
  no forcecompile), so a script edit goes live by deleting its .dsko; the
  next run rebuilds it. reloadprefs doesn't touch scripts/. Edit first,
  delete after: a player triggered it between my two edits and the stale
  text got compiled.
- 17:10: hunger too: "You feel hungry, and weaker for it." (backup
  ~/DuskRPG/backups/hunger-20261026-171027). fix_playtest8.py no longer
  touches the hunger hint; the staged ~/pt8-stage copy still has that
  edit, but it's a no-op now (swap only acts when the old text is there).

## 2026-10-26 17:29: item audit 2 (APPLIED 17:28; shops wait for a restart, then deploy)

- Re-audit from live: weapon and armour prices on formula (25 gp per real
  armour point; weapons 4 x ((mod-100)/10)^2); gearneeds tiers in place.
  Gaps: medium and strong gear sold only in human lands; no staff for
  sale; consumable prices (never audited before).
- tools/server/fix_item_audit2.py (backups item-audit2-20261026-172859):
  medium sets at each race's home, torso 80 / the rest 60, 25 gp per
  point, needs 15: leafsilver (Aelindor, Caelum's 449,1252, beside the
  elven chain mail; no torso; DEX), shadowsteel (Velkarath Night Market
  1352,943; DEX), swampscale (Ssarakh 1700,938; STR). Elven chain mail
  needs DEX 15 now (was STR). Ash staff (INT 15, 575) sold at Tome and
  Wand, Caelum's, Ryld's, Ssarakh's weapon shop. Tiny potion 25, red
  potion 1200, mushroom 10; crystal box 2565, bloody book 6815, nova
  package 3410 (the sum of their pieces; were 250k-500k).
- Not changed (flan's call): serpent scales (Warden Marr, 120 real armour,
  no need). Seifer's scroll (god only) isn't used up; left as is.
- audit_items.py read "removeItem" as missing (case): demon's blood and
  fairy dust were never broken. audit_gear.py had lost its import line.
- Not tested on scratch: data only, applied to a copy of the live files
  first (diffs checked, second run changes nothing).

## 2026-10-26 17:48: potions named by what they do (INSTALLED 17:48; restart, then deploy)

- flan: like Diablo 2, not colours to guess; no "plain" in names; the
  flatter prices. tools/server/fix_potions2.py: minor healing potion 25 HP
  50 gp (minor + tiny potion), healing potion 100 / 300 (x-potion),
  strong healing potion 300 / 900 (red), minor mana potion 25 MP / 50,
  mana potion 100 / 300 (new, sold wherever minor mana is), strong mana
  potion 300 / 900 (green), rejuvenation potion 500+500 / 3000 (blue).
  Brewed twins (cost 0) and the alchemy recipes renamed; drops (daemon,
  ddsoldier, dry one raider, marsh wisp, swamp horror), the Fire Orb old
  lady (9_948), the sad man (137_58), the store inventory sign, Jenova,
  rc/javahelp.txt, quests/dw_wreck.json. Old item files stay (no player
  held any; god-made only). The old CoL "place" storage can't take the
  new names (no defConditions); it says so.
- tools/server/fix_potions2_talk.mjs: Kossk's dw_wreck reward, Pell's
  "Rejuvenation potion?" (capital.mjs PELL_REJUVENATION). Installed via
  potions2_install.sh from ~/potions2-stage (backups potions2-*,
  canon-20261026-174836).
- Sources match: capital, ssarakh, aelindor, velkarath, dawnward,
  swampmobs, fireorb. paintart: healing red, mana blue, rejuvenation
  purple; minor small; strong and rejuvenation large and glowing.
- 18:43: potions heal their flat amount or a share of the drinker's max,
  whichever is more (minor 10%, regular 25%, strong 50%; rejuvenation all
  HP and MP; mana the same). js/library.js: item maker effects hppct /
  mppct (restore(): number hpgain / * trigger maxhp P 100; if < hpgain
  flat ...), fix_potions2.py writes identical scripts (minor mana potion
  too now). Engine checked: parseValue reads "trigger maxhp" via
  attributes.getStat; number re-set replaces (Hashtable). Scripts live at
  once (.dsko removed); descriptions after the restart. Not tried in game
  yet: drink one after the restart.
- fix_playtest8.py's Ryld's edit now drops the arrow line whatever else
  the shop sells (the ash staff broke its exact match); ~/pt8-stage copy
  updated.

## 2026-10-26 19:11: potions in every town, priests' blessing (blessing LIVE; shops wait for a restart)

- tools/server/fix_potion_shops.py (backup potion-shops-20261026-191044):
  race homes the whole healing and mana ladder (Miriel's 487,1252 +healing
  +strong mana; Szinra's 1317,925 +strong mana; Ssarakh 1700,944
  +healing); minor and regular healing and mana at Southfield 526,5, the
  Quartermaster 144,381, City of Light 110,141, Troll's Head 29,40, Sabin
  291,151; minor ones at Dagna's 876,204. Rejuvenation only Kingshaven,
  Ssarakh, Southfield. Midnight left alone.
- Blessing: 10 gp since 19:34 (flan: a small donation; was 50), all HP and MP (js/dialogue.js effect "heal": inc hp/mp
  1000000, the server caps; in the dialogue and tile editors).
  tools/world/cities/blessings.mjs + tools/server/blessings_talk.mjs:
  Maren, Ilsevel, Ilvra, Ithrae, on every stage that ends the talk or has
  a Farewell (not on a quest's yes/no). Installed 19:10 (backup
  canon-20261026-191044). Re-run blessings_talk after merging a quest into
  one of them (idempotent). No priests in the old-world towns.
- ~/sg-talk rebuilt from live after it (greybeneath_talk.mjs with the
  sg quests from ~/sg-city.json); its ORIG matches live, blessings kept.
  The old one is ~/sg-talk.before-blessings-20261026.
- 19:34: rebuilt again after the 10 gp change (blessings.mjs now remakes
  an existing Blessing answer). To rebuild ~/sg-talk: copy live talk +
  quests, add the sg_*.json from ~/sg-city.json's "files", run
  greybeneath_talk.mjs.

## 2026-10-26 20:27: staged work installed (LIVE, restart 20:27:37, deployed)

- The Grey Beneath (install_city sg-city.json, canon_install ~/sg-talk and
  ~/sg-extras), Homecoming (~/hc-stage/homecoming_install.sh), play-test 8
  (~/pt8-stage/playtest8_install.sh), and the potion stock, all in one
  restart. Backups city-the-grey-beneath-20261026-202336,
  canon-20261026-202336 (the four canon installs share it; no file
  overlaps), playtest8-*.
- ~/sg-extras/gearneeds was a whole-file copy from before item audit 2:
  rebuilt as live + "thornward cloak|DEX|15" (old copy
  gearneeds.old-20261026), ORIG redone. achievements was unchanged.
- Checked first: every bundle file was new on live; no old potion names in
  any bundle; all talk ORIGs matched live; dry runs clean. After: Ryld's
  has no arrow and keeps the ash staff; gearneeds has the race sets,
  thornward cloak and gaol-chain belt; doorheld and chaircold achievements.
- /root/DUSK_LORE_BIBLE.md regenerated from live 20:30 (no staged chains).
- Not played in game after the install (each was tested on scratch).

## 2026-10-27 00:10: classes chosen at the end of the tutorials, tried in their yards (LIVE 2026-10-27 01:13)

- The user's call: pick the class at the end of the tutorial, with a real
  trial of each in the training yard, and the choice at the end stone.
- server/Classes.java: "tutorial x1 y1 x2 y2" and "trial ..." lines in the
  classes file (DEFAULTS has them; install_class_trials.py appends them to
  live's). Inside a tutorial box no class is needed (gate lets classless
  players act; "class" answers "Class: none|No class yet ...", so the
  browser picker stays shut; classic players get no prompt at login).
  Boxes: human 116-147 x 364-393 (yard 134-138 x 375-383), elf 408-473 x
  1290-1325 (yard 450-463 x 1299-1313), dark elf 1268-1316 x 954-973 (yard
  1301-1313 x 954-966), lizardfolk 1846-1911 x 990-1025 (yard 1888-1901 x
  999-1013).
- "class try <id>" (yard only, no real class yet): writes classtrials/<name>
  (stats incl. hp/mp, skills, spell groups, kit flag), then the class's
  start + kit go on with hidden flags class_<id> + classtrial. Classes with
  a spell group start at 60% HP so Mend / Gloom Mend has something to heal.
  Ended (file put back, kit items taken back worn or carried, flags off) by
  leaving the yard (Conditions.tick calls Classes.trialTick every second;
  the gate also checks), another try, "class end", choosing, or the next
  login (logged out mid-trial). While trying: train/drop/give/sell/put/
  trade/offer refused.
- End stones (all nine: human 142,392 143,392 117,373; elf 468,1319
  431,1321; drow 1316,971 1284,971; lizard 1906,1019 1869,1021) get a first
  rule: step flag and no hidden flag classchosen -> "first, choose your
  calling" + order "class pick" (browser: ClassChoices line opens the
  picker; classic: the typed prompt). Choosing anywhere sets classchosen
  (setFlag) and, standing on a stone whose script says "class pick", runs
  it again: bound and sent on. Anyone with a class gets classchosen at
  login, so old characters still mid-tutorial walk straight through.
- Ordered commands' replies go nowhere (as Housing found): pick/try/end
  say theirs with chatMessage (Classes.say). patch.py: an empty Classes
  reply sends nothing (as Talk's).
- Trial keepers (tools/world/cities/classtrials.mjs, KEEPERS): Veteran
  Maddock (138,376), Sentinel Aeris (462,1303), Weapons-Keeper Zhaun
  (1312,956; "Ilzt" is taken by Velkarath's off-duty guard), Old Ssiv
  (1900,1003). One greeting, answers Fighter/Ranger/Cleric or Priest/
  Paladin/How does it work?/Enough. New dialogue + tile effect kind
  {kind:'class', what:'pick'|'try'|'end', id} (js/dialogue.js, both God-tab
  editors: "Class"). grove/velkarath/hatchery.mjs call classGate and
  trialYard, so rebuilds keep it; classtrials-<race>.mjs are keeper-only
  overlays (no squares change) for install_city.
- Dropped: a sparring dummy that hits back. Dying costs gold and exp and
  sends you to your capital, out of the tutorial; the 60% HP start does the
  job instead.
- Tested on scratch (trialelf, trialelfb, trialbrow, trialhum, trialhumb,
  trialdrow / testpw1): classless moving in the tutorial; try outside the
  yard refused; cleric/ranger/fighter/priest trials (stats, kit, spells,
  Mend and quoted "gloom mend" heal); switching restores first; leaving the
  yard and logging in again restore (kit gone even when worn); drop refused;
  the keeper conversation; the Moonstone with the browser picker
  (playwright: dark stone, picker with 4 classes, Ranger chosen, at the
  Moonwell, bound); classic picker; an old classed human straight through.
  testclient.py misses a line that arrives glued to the previous protocol
  message (raw bytes showed it was sent).
- To go live (nobody online; one restart): `sh tools/golive_class_trials.sh`
  (deploy, build, install, keeper bundles from live's map/props, stones +
  classes file, restart). The stones must not go in without the restart:
  the old server never sets classchosen, so they'd hold everyone at the end.
- LIVE 2026-10-27 01:13 (nobody was online). Smoke test: a new elf got
  "Class: none|No class yet" in the grove; that character was deleted.

## Open / ideas

- Play-tests: runs 1-8 in ~/dusk-playtest/archive/runN (notes, transcript,
  brief). Suggested next: run 8, a dark elf again, to see if run 7's
  directions, the new market/gardens and the grey walls get a newcomer to
  a trainer, the dens and Aelindor Landing (or a lizardfolk, run 3, for
  Ssarakh). archive/run7/brief-run7.md as the template; scratch is stopped
  (tools/scratch.sh setup, then start; tunnel -L 10011). Block archive/**
  and the briefs in the launch line. The bot's legend now names the two
  cobble tiles apart (b plain brown = blocks, c with grey stones).
- Class at the end of the tutorial: live 2026-10-27 (above). A level system (maybe cosmetic levels on top of the
  experience-for-stats training): not started.
- Guilds: the real invitation quests (Mage Guild, The Circle) and the
  Hidden Order / tier-5 quests that set forbidden_lore, archmage_quest,
  archdruid_quest (skipped for now; god-set flags only). A ferry to the
  Mage Guild isle when the user wants players to reach it. The four
  unbuilt spells if wanted (haste needs a Battle patch; turn undead an
  undead flag on monsters; spider swarm an all-foes hit; shadow step a
  "nearby room").
- Lore next: see LORE.md "All open threads" (Morvane coming himself,
  Kraghul, the schools' stories, the duergar, the desert's deep sand...).
- Play-test feedback: world boss strength (1,100-1,400 HP; tune in the God
  tab's Monsters… or the defMobs files), bounty rewards, quest chains, and
  now the doubled monster numbers.
- Game ideas the user liked, not started: owned ships (on hold).
- Classes: Rogue later.
- Greystone: done (The Old Drift). Open: where the duergar come from, and
  whether the Grey Delve's tunnels should one day join Velkarath's caverns.
- Midnight / the Izaru mine (ferry to Westsea, the tree hole at 64,91 to
  494,105, then 450,104 up into Midnight): kept a mystery on purpose; only
  Old Sailor Wick's tale hints at it. No signposts.
- Clans: maybe a "clan hall" sign or name plaque when claimed (the who
  page shows clans since 2026-10-20).
- CHANGELOG.md is up to date to 2026-10-21 (play-tests 1-7, item
  rebalance, Velkarath lived in and its grey walls).

## More notes

My memory directory (`~/.claude/projects/-root-dusk-browser-client/memory/`)
has session-state, server-source, tile-walkability, duskserver-access and
future-ideas notes. `CHANGELOG.md` is the player-facing log (repo only, not served).

## 2026-10-28: slur filter (LIVE: game installed + restarted 13:27, classes before in backups/classes-20261028-132727)

- server/Words.java: the owner's list in ~/DuskRPG/conf/badwords (one word
  a line; "word" = whole word + plurals in chat, "*word" = anywhere, even
  spaced out). Re-read whenever the file changes. Look-alikes (1 i, 3 e,
  @ a, $ s...), accents and repeated letters undone before matching.
- Commands.parseCommand calls Words.check first (patch.py), before even
  commands/ scripts: a line with a listed word is never sent ("That
  language isn't allowed here." to the sender only), logged in
  ~/DuskRPG/logs/language.log, online gods told. 3 in 10 minutes = 30
  minutes' nochannel (not for gods). A nochanneled player can't "'" say
  any more either (the engine let them).
- LivingThing.isValidName -> Words.validName (LivingThingPatch): new
  character and pet names with any listed word anywhere get the usual
  "Not a valid name"; existing characters still log in.
  tools/server/badword_names.py lists existing names that match (read-only).
- forum.py: titles and posts with a listed word refused and logged the same
  way (Words class there; keep it matching Words.java). Deployed 13:13,
  dusk-web restarted; backup ~/DuskRPG/backups/forum.py.20261028-*.
- Not covered: script input answers to NPC questions (Script "input"), god
  file uploads. Login names go through isValidName.

## 2026-10-28 13:50: no entering the world without a race (LIVE, restart 13:50; classes before in backups/classes-20261028-135043)

- Found by the owner: Freya (new elf) left at the race question for 30
  minutes; the read timed out, loadRace caught it and the engine let her in
  raceless at the default spot (she ended up at 17,17, the old world).
  Choosing elf at the next login set the race and bind but never moved her
  (the engine only moves characters still on 1,1), so outside any tutorial
  box she was made to pick a class.
- server/Sex.java afterRace: no race -> any still-empty users file (and
  .backup) is deleted and it throws; Player.run's "Error at run() start"
  closes the connection without saving. Tested on scratch: dropped at the
  race prompt (not let in, no file left), then the same name made again as
  an elf (415,1307, no class asked).
- Freya reset by hand while offline (backups/freya-reset-20261028-135132):
  at 415,1307, base stats, no skills, class flags, kit or sword.
- users/ had ten empty files from creations abandoned before this
  (fred, goober, poop, testelf, testhuman, testings, testingsand, testss,
  testsss, testy): moved out 2026-10-28 to backups/empty-users-*, names free.

## 2026-10-28 16:35: class trials ended at once in the browser (LIVE, restart 16:37; classes before in backups/classes-20261028-163734)

- Found by the owner (Freyan, elf, Sentinel Aeris): each trial's kit
  vanished within ~5 s. The browser asks "class tiers" whenever the class
  changes (js/main.js classAnswer), and Classes.command ended any trial
  before every subcommand but pick/try/end. "tiers" only asks now, so it
  no longer ends one. The classic client never sends it (why scratch tests
  with testclient/dusk-bot passed). Tested on scratch with dusk-bot:
  try ranger + "class tiers" + 6 s, kit and skill still on.

## 2026-10-28 17:05: trial keepers speak up at the hand-in (LIVE 18:13: backups talk-keepers-*, props-keepers-20261028-181301, classes-20261028-181309)

- The owner's call: the keeper beside the trainer, prompting once the straw
  stuffing is handed over. classtrials.mjs: Aeris (51,11 = 459,1301),
  Zhaun (49,105 = 1309,955), Ssiv (51,11 = 1897,1001), each 2 east of
  their trainer; Maddock stays (138,376, already in the Sergeant's room).
  Keepers' shouts gone (they called to anyone within 4 squares, any step).
  keeperPrompt(race): a follow-up on each trainer's two hand-in answers,
  said by the keeper, the keeper's classes plus "Not now".
- js/dialogue.js: a follow-up question can name its own `speaker` (it and
  its answers' replies are theirs); the God tab's editor has "Said by" on
  follow-ups and its Try it shows them. Test in test/dialogue.test.mjs.
- Live: tools/server/keeper_prompts.mjs <dir of fetched talk files> (the
  live scripts were checked identical to toScript of their .dlg first),
  tools/server/move_keepers.py (props; then restart, no god "save").
- server/Talk.answer skips "notdead": the old Java client (and dusk-bot)
  answers every stillThere ping, so a follow-up question in the same
  script read "notdead" as its answer and said "Hm?" at once. The browser
  holds notdead back while a question waits, so it wasn't hit there; 45
  live dialogues have follow-ups (all the bounty boards among them).
- Scratch: all four hand-ins (Thandril/Aeris ranger, Sergeant/Maddock not
  now, Zeerith/Zhaun fighter, Kreeth/Ssiv fighter) prompted and the trial
  started; talking to Aeris directly still works.

## 2026-10-28 evening: signs, pickers, journal, minimap, quest counts (all LIVE)

- No signs at Velkarath's entrances (the user: only warnings allowed): the
  stair-arrival signs, tunnel signposts and the sign by the west stair
  (tools/server/remove_velk_signs.py, backup velk-signs-*; plans changed).
- Class and male/female pickers in the Classic look (stone frame, cards).
- Journal: folding sections Quests / Bounties / Lore (from the Bounty: and
  Tale: title prefixes, js/social.js journalSections); finished quests are
  one-line title cards; a kill step's "(n of m)" is a progress bar.
- Minimap: creatures in view (entity type 4) as red dots. Pets probably too.
- Quest kill counts: "...: n of m." lines also on the Combat tab; kills
  made on a quest's earlier steps count up to the goal and finish the kill
  step when it's reached (Quests.counted/before/ready). Tested on scratch.
- A bring step can be taken early (early: true, a quest-editor box): The
  Waking Stones' heartstone is (Faelwen merged with merge_quests.mjs,
  backup faelwen-early-*). Faelwen moved to 463,1206, clear of the tree at
  467,1207 (tools/server/move_prop.py; tools/golive_quest_counts.sh ran
  23:48, classes-20261028-234839).

## 2026-10-29 00:49: Last Water, the oasis outpost (LIVE)

- tools/world/cities/lastwater.mjs round flan's map note "Oaisis"
  (784,1523): walled spring (770-800 x 1513-1540, the pond itself left as
  the map had it), Wellkeeper Amsel, Ssuli's stall (water, apple,
  sandwich, ale, healing potion), rest tent with bedrolls (10 gold,
  defMoveActions 776/778/782/784_1537), gate guards, a sign; 6 coyotes
  near the walls, 4 sand worms further out. Rumours only, no quests.
- Installed with tools/golive_lastwater.sh (backup city-last-water-*).
  Tested on scratch first (shop, talk, bedroll).

## 2026-10-29 02:03: signs are names only (LIVE)

- The user: signs show only the place's name; no prices, services,
  who-to-see or how-to, except in tutorials. Direction signposts removed.
  Warnings and story inscriptions keep their words; old-world signs only
  lost price/service notes. tools/server/signs_names_only.py (120 changes:
  91 renamed, 16 removed with their labels; backup signs-names-*), and
  the city plans say the same. Directions and prices live in NPC talk.

## 2026-10-29: lore bible ready for Claude on the web

- LORE.md now:
  - opens with "Read this first": what's fixed and what's open, the house
    rules (short lines, mysteries, names-only signs, secrets), what a quest
    can be, and the races, tutorials, classes and schools;
  - adds "The map at a glance", "The southern desert and Last Water", "The
    other stories in the game" (every chain, the world bosses, the
    hill-people barrow hook) and "All open threads".
- Nothing in game changed.
