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

- `/tmp/dusktest` on duskserver: a copy of the game on port 10011, bridge
  on 8767 (`conf/prefs` must keep port 10011 and rcaddress
  http://127.0.0.1:8011/). Start: `cd /tmp/dusktest && nohup java DuskServer > srv.log 2>&1 &`.
  Stop by pid only after checking `/proc/<pid>/cwd` is /tmp/dusktest
  (pkill patterns can kill your own shell).
- Build server classes for scratch from live's classes:
  `scp server/* duskserver:/tmp/srv-src/server/` then
  `SRC=/tmp/srv-src/server WORK=/tmp/dusk-scratch-build sh /tmp/srv-src/server/build.sh`,
  copy `/tmp/dusk-scratch-build/out/*.class` into /tmp/dusktest, restart it.
- Locally: ssh tunnel `-L 8767:127.0.0.1:8767 -L 8011:127.0.0.1:8011`,
  `python3 -m http.server 8124` in the repo, playwright-core +
  Chrome at `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`
  (set `localStorage dusk.server = ws://127.0.0.1:8767`).
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

## Built 2026-10-05 evening, NOT live yet

- Quest wizard: "Go to a place" steps (`quests/<id>.places`, checked
  every 2 s by the FlagTimers thread in server/Quests.java; `quest set`
  takes an optional 4th field), "Finish first" prerequisite + "not yet"
  line, stage ordering across quests at one NPC (js/quests.js stageRank:
  steps, running, offers, not yet, thank-yous), open Journal refreshes on
  "Your journal has been updated.". Tested on scratch (quest silent_tower,
  giver Thalia, hgate played it through). Needs: deploy + server
  build/install + `sudo systemctl restart duskserver`. Existing quests
  only get the new ordering when re-saved in the wizard.

## Open / ideas (ask the user before starting)

- Play-test feedback on today's changes (spawns difficulty, hunger, spells).
- A first real quest chain; shop price / exploit check across shops.
- God tools: restart button, admin page; leaderboard; owned ships.
- Not touched: god/test items with missing use scripts (alpha, coolaexp...).

## More notes

My memory directory (`~/.claude/projects/-root-dusk-browser-client/memory/`)
has session-state, server-source, tile-walkability, duskserver-access and
future-ideas notes. `CHANGELOG.md` is the player-facing log (not updated
for today's spell/quest/spawn work yet).
