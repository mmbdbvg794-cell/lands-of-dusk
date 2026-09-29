# Dusk browser client

Browser client for Dusk. Currently at step 5 of `BROWSER_CLIENT_PLAN.md`:
connect through `dusk_bridge.py`, log in, show the game's text output, and
draw the map view (tiles, entities, names, selection boxes) on a canvas.
Walkers and the view slide between squares (one step per 270 ms, just over
the server's 250 ms move tick), players show their walking frame, and
damage numbers from combat lines (`did <n> to`, `dodged ...'s attack`)
float over whoever was hit. With the system's "reduce motion" setting on,
everything jumps square to square instead.

The map fills the left of the window; the right-hand column has a
character card (name, location, HP/MP bars, and stamina when the stats
include it), a target card with Attack / Look / Clear while something is
targeted, the tabs, and the chat with the command box. On a phone they
stack under the map. The bridge address and display options are under
Settings.

The tabs are Inventory (gold and exp at the top), Equipment (a 3×3 grid of
slots) and Stats (attributes with their bonuses, combat values, and the
"Affected by" / skills / spells lists), plus the Action menu (opcodes 5–8
and 10). Inventory items can
be used, worn or dropped (Drop asks for a second press), and worn items
removed. The panel sends the same commands the server expects from the
Java client: `wear`, `unwear` and `drop` by item ID, `use` by name. Click
the open tab to fold the panel away; on narrow screens it starts folded.

The minimap in the map's corner (step 6) shows every square you've seen,
centred on you, with the rest left dark. Click it to zoom out (4, 2 or 1
pixels per square), or drag it anywhere over the map; Settings has "Move to
corner" to put it back. What you've explored is saved in the browser per
bridge and character (the name typed first at login), so it's still there
next time; the "Minimap" box in the top bar hides it.

The sprite sheets load from the address the server sends in opcode 1
(`rcaddress` in the server's `conf/prefs`). If that fails, the client tries
the game server's own ResourceServer on the bridge's host, port 8000.

## Running

The page uses ES modules, which browsers won't load from `file://`, so
you need to serve it over HTTP:

    python3 serve.py 8000

`serve.py` is `python3 -m http.server` plus a `Cache-Control: no-cache`
header, so after a deploy browsers pick up every changed file rather than
mixing new HTML with an old cached script.

Open http://localhost:8000/ and press Connect. The bridge address
(default `ws://192.168.4.61:8765`) is under Settings. You can also pass
`?server=ws://host:port` in the URL, and the last address you used is
remembered.

Clicking something on the map opens a menu of what you can do to it:
Attack and Look for creatures (Attack only within your attack range,
opcode 28), Pick up for items, Open for doors, Read for signs. Clicking a
creature also targets it, as in the Java client. Clicking an empty square
walks there; with a menu open, a click elsewhere just closes it.

The hotbar (ten slots on keys 1–9 and 0) sits in the black space beside
the map. Click an empty slot to fill it with a spell from your Stats, an
action, an item to use, or any command; click a full one (or press its key
while the command box is empty) to use it; right-click or long-press to
change or clear it. Spells cast on yourself or at your target (◎), which
you can switch per slot. Drag the grip to move the bar: it snaps to the
nearest edge. Slots are saved per character; Settings can hide the bar.

The Spellbook tab lists the spells you know (from the stats' "-Spells-"
lines) like a book, a chapter per school, with each spell's description
and the skill it needs, plus buttons to cast it on yourself or your target
or put it on the hotbar. The descriptions come from `js/spellinfo.json`,
built from the server's spell files. It's rebuilt on every deploy, and the
server also rebuilds its copy every 10 minutes (a cron job for flan), so
spell changes on the server show up by themselves. By hand:

    ssh duskserver 'python3 - /home/flan/DuskRPG' < tools/spellinfo.py > js/spellinfo.json

Casting a spell (from the hotbar or typed as `cast ...`) plays an effect on
whoever it was aimed at, such as mend's green spiral, unless the server
replies that it failed; being healed by someone else shows one on you.
The server only tells the caster and the target, so other players don't
see your effects. Sounds (hits, dodges, spells, and the server's battle
sounds, opcode 15, and footsteps when you walk) are made in the browser with Web Audio; Settings has
Sound and a volume slider.

Controls, as in the Java client: arrow keys walk (while the command box
is empty; with text in it, Up/Down browse history), and so does WASD when
the command box isn't focused. Enter jumps to the command box. Clicking
the map walks to an empty square or opens the menu above.

Tick "Protocol trace" to see every parsed opcode in the log.

## Layout

- `js/bytereader.js`: buffered `readByte`/`readLine`/`readLong`, matching `DataInputStream`
- `js/protocol.js`: parser for opcodes 0–32, plus 33/35/38/39 from the modified server (consumed, not acted on); every opcode's payload is consumed
- `js/connection.js`: WebSocket link, and the replies the Java client sends automatically
- `js/world.js`: map and entity state, as Dusk.java keeps it (opcodes 2, 4, 16, 19, 24–31), plus slides and damage numbers
- `js/player.js`: the player's own state (opcodes 5–8, 10) and the item commands
- `js/panels.js`: HP/MP bars and the Inventory/Equipment/Stats/Action panel
- `js/explored.js`: every map square seen so far, in 32×32 chunks, and its saved form
- `js/minimap.js`: draws the explored map, each tile as map.gif's frame shrunk to a few pixels
- `js/actions.js`: what you can do to each kind of entity, and the commands for it
- `js/entitymenu.js`: the click menu on the map
- `js/stats.js`: reads opcode 8's stats text into gold, attributes, values and sections
- `js/drag.js`: dragging the minimap around the map, remembered as a position within it
- `js/spells.js`: the cast command, which effect each spell gets, and the replies that mean a cast failed
- `js/effects.js`: the pixel-art spell effects drawn on the map
- `js/hotbar.js`: the hotbar, its slot picker, and docking it to an edge
- `js/spellbook.js`: the Spellbook tab
- `js/spellinfo.json`: each spell's school, description, needed skill and chat lines (from `tools/spellinfo.py`)
- `js/sound.js`: game sounds, generated with Web Audio
- `js/sprites.js`: loads `map.gif`, `players.gif`, `sprites.gif`
- `js/renderer.js`: draws the world on the canvas, following Dusk.java's `update()`/`drawEntity()`
- `js/main.js`: the page UI

## Deploying

    sh tools/deploy.sh

rebuilds the spell data, runs the tests, copies the page to
`~/dusk-browser-client` on duskserver (served by `dusk-web.service` with
`serve.py` on http://192.168.4.61:8080/) and checks it's up.

## Tests

    node test/protocol.test.mjs
    node test/world.test.mjs
    node test/player.test.mjs
    node test/explored.test.mjs
    node test/actions.test.mjs
    node test/stats.test.mjs
    node test/spells.test.mjs
