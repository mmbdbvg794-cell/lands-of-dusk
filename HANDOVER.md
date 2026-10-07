# Handover: the Dusk browser client and server work

State as of 2026-10-07 02:55 (duskserver time). Read this first in a new session.
(The newest work is at the end, before "Open / ideas".)

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

## Open / ideas (ask the user before starting)

- Play-test feedback on today's changes (spawns difficulty, hunger, spells).
- Owned ships. (Admin page, restart and leaderboard are done.)

## More notes

My memory directory (`~/.claude/projects/-root-dusk-browser-client/memory/`)
has session-state, server-source, tile-walkability, duskserver-access and
future-ideas notes. `CHANGELOG.md` is the player-facing log (not updated
for today's spell/quest/spawn work yet).
