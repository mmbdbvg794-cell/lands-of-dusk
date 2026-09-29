# Dusk Protocol Reference — Opcodes 0-32

Reverse-documented directly from `Dusk.java`'s main incoming-message
switch statement in `run()` (lines ~528-1330). This is the authoritative reference
for building the browser client's own protocol parser.

General notes:
- The opcode itself is a single raw byte (`readByte()`, signed; a value
  of -1 / `0xFF` ends the read loop).
- Every other field is a newline-terminated text line (`readLine()`),
  with numbers sent as decimal text and parsed with `Integer.parseInt` /
  `Long.valueOf`. **The one exception is opcodes 24-27**, whose entity ID
  is a raw 8-byte big-endian binary long (`readLong()`), with no newline.
- `readLine()` ends a line at `\n`, `\r`, or `\r\n`, and maps each byte
  to one character (Latin-1). The client sends commands the same way:
  trimmed text + `\n`, one byte per character (`writeBytes()`).
- An unrecognized opcode byte is logged, and the rest of that line is
  read and discarded.
- Whitespace control characters (tab=9, newline=10, CR=13) can appear
  *inside* a text payload (e.g. `\t` prefixes on combat/chat lines) —
  these are not separate opcodes.

| Opcode | Name | Payload | Effect |
|---|---|---|---|
| 0 | Disconnect | none | Closes the connection, marks client unloaded |
| 1 | Set resource address | 1 line (URL/path) | Sets image-loading base path and restarts the graphics thread, which loads `images/map.gif`, `players.gif` and `sprites.gif` from that address. Once they've loaded, the client sends `playerloaded true` |
| 2 | Full map/viewport update | 2 ints (new LocX, LocY) + `mapSize × mapSize` shorts (tile IDs, **column-major**: x is the outer loop, y the inner, filling `shrMap[x][y]`) | Recenters camera, replaces the whole visible tile grid, prunes out-of-range entities, updates HP/MP label, checks if standing on a merchant |
| 3 | Text message | 1 line | Appended to the chat/output log. (Solved tonight — also where we hook damage-number and death-popup parsing) |
| 4 | Spawn/update entity | name; type (a text line parsed with `Byte.parseByte`, not a raw byte); then **if type=0 (player): 5 ints** — ID, x, y, image, step; **any other type: 4 ints** — ID, x, y, image (step is set to -1); then a `"true"`/`"false"` hide-name line; then, only if type is 0 or 4, two more ints (hp, maxhp) | Adds a new entity to the world, or updates an existing one |
| 5 | HP/MP update (self) | 4 ints: hp, maxhp, mp, maxmp | Updates the player's own status bars |
| 6 | Inventory list | int (slot/type), then repeating (name, ID) pairs, each followed by another type int. Ends at the first line where a type int is expected but the line isn't a number (Java detects this by catching the `NumberFormatException`); that terminator line is consumed. An empty inventory is just the terminator line | Rebuilds the full inventory list and equipment dropdown menus |
| 7 | Equipment slots | 9 slots — wield, arms, legs, torso, waist, neck, skull, eyes, hands, in that order. Each is a name line; **if the name is `none` no ID follows**, otherwise an ID int follows | Rebuilds the equipment panel |
| 8 | Full stat block | Multiple lines until a lone `.` | Replaces the entire stats/conditions/skills/spells text panel — resent wholesale on any change, not incremental |
| 9 | Mark as "not loaded" | none | Sets an internal loading-state flag |
| 10 | Action choices list | Lines until `.` | Populates the "Action" dropdown menu |
| 11 | Load music | Nested loop: int (number of music "types"), then per type an int (song count) and that many URLs | Loads background music tracks. **Only the applet reads this payload**; the Java desktop client skips it entirely (`if (!blnApplet) continue`). Not yet confirmed whether the server sends it to non-applet clients, or in what form. The browser client parses it the way the applet does |
| 12 | Play music | 1 int (which music type to play); read only while `blnMusic` is true, which is the default | Picks a random song from that type and loops it |
| 13 | "Not dead" | none | The client replies by sending the `notdead` command to the server |
| 14 | Mark as "loaded" | none | Sets the loaded flag true — seen paired with opcode 3 during login |
| 15 | Play sound effect | 1 int (index) | Plays a preloaded SFX clip |
| 16 | Remove entity | 1 line (ID as decimal text, parsed with `Long.valueOf`; *not* binary like 24-27) | Removes an entity from the world by ID |
| 17 | Merchant wares list | Lines until `.` | Populates the merchant buy-menu |
| 18 | Open edit window (general) | filename/title, then lines until `--EOF--` | Opens a text editor popup (likely admin/building tools) |
| 19 | Set map size | 1 int | Sets `mapSize` (default 11 before this arrives) and derives `viewRange = (mapSize-1)/2`; reallocates the map/entity grids; the client replies by sending `applicationimages` (desktop) or `appletimages` (applet), which the server answers with opcode 1. **Confirmed from login data: mapSize=11.** |
| 20 | Open edit window / populate object list | Either an edit-window sequence (same as 18) or a list-population sequence (title + lines until `--EOF--`), depending on `blnEditorMode` | Dual-purpose — context-dependent on client mode |
| 21 | Close merchant window | none | Hides the merchant UI, clears merchant item lists |
| 22 | Sell-list update | Lines until `.` | Populates the "what can I sell here" list |
| 23 | Colored text message | 3 ints (r,g,b) + 1 line | Same as opcode 3 but with an explicit text color |
| 24 | Entity moved north | 1 **binary** long: 8 raw bytes, big-endian, no newline (entity ID) | Triggers the north-movement animation for that entity |
| 25 | Entity moved south | 1 binary long (entity ID), same as 24 | Same, south |
| 26 | Entity moved west | 1 binary long (entity ID), same as 24 | Same, west |
| 27 | Entity moved east | 1 binary long (entity ID), same as 24 | Same, east |
| 28 | Set attack range | 1 int | Sets the player's current weapon range |
| 29 | Set entity selection flag | 1 line (ID as decimal text, parsed with `Long.valueOf`) + 1 int (flag value: 1=green, 2=red, 0=none) | **Already confirmed live and working in-game tonight** — the green/red selection boxes |
| 30 | Clear all selection flags | none | Resets every entity's flag to 0 |
| 31 | Update single entity's image/tile | 1 int (entity ID; the line is trimmed before parsing) + 1 int (new image index) | Redraws one specific tile+entity in place (e.g. after an equipment change) |
| 32 | Update targeted entity's HP | 1 int (hp; the line is trimmed before parsing) | Updates the "Target: name  hp/maxhp" label, using whatever `targetID` is already set client-side |

## What's confirmed from real login data tonight

Cross-referencing an actual captured login sequence against this table:
- `14` immediately followed by `3` — matches "mark loaded" + a text line,
  seen twice during login (once for the server banner, once later for
  "flan has entered the world" confirmation-adjacent text).
- `28` × 8 in a row, each with payload `1` — attack range being set to 1,
  repeated 8 times. Cause not yet confirmed (possibly one set per
  equipment slot check, or a startup default being pushed multiple
  times — worth checking `LivingThing.java`/`Player.java` server-side if
  this needs to be replicated exactly).
- `19` with payload `11` — confirms `mapSize=11` for this server's
  configured view range.
- `16` with payload `2147` — an entity ID, consistent with IDs being a
  large, ever-incrementing counter over a long-running server, not
  reset per session.
- `2` followed by ~121 numbers — matches an 11×11 = 121 tile grid,
  confirming the map-size opcode was already in effect.
- `4` (entity spawn) for the player's own character, `8` (stat block),
  `6` (inventory), `7` (equipment) all appeared in the expected order
  during login.

## Found while building the renderer (2026-09-29)

- **`rement <id>`**: when an opcode 4 entity is outside the view, or an
  entity walks out of view (24-27), the client drops it *and* sends
  `rement <id>`. The server's Commands.java handles it by removing the ID
  from the player's list of sent entities. The browser client does this
  in `world.js`. Entities pruned by an opcode 2 recenter are not reported,
  because the server sends 16 for those itself.
- **Entity names can carry flag prefixes**: `<sleeping>`, `<wounded>`,
  `<clanname>`, and custom flags, e.g. `<sleeping>wolf`. The server's
  DuskEngine builds them. The Java client shows the raw name, and so do we
  for now.
- **Sprite sheet frame sizes differ**: the frame side is each image's
  height. On this server that's map.gif 32px (160 tiles), players.gif 36px
  (8 characters × 8 frames), sprites.gif 64px (55 sprites). The client
  scales all three to the same cell size.
- **Player frames**: `image*8 + step`, where steps 0/2/4/6 are standing
  facing N/S/W/E and 1/3/5/7 are the walking frames.
- **Opcode 1's address**: this server sends `https://duskserver.tailaee0f2.ts.net/`
  (`rcaddress` in `conf/prefs`). The game server's own ResourceServer also
  serves `images/*.gif` on port 8000.

### Comparison with a friend's browser client

A friend's browser client for a *modified* Dusk server
(`duskserver.tailf3b66d.ts.net/web/play/`) was read for comparison. Its
parser agrees with this table for 0-32. Its server also sends opcodes
33-39 (33 gear, 34 corpse, 35 spellbook, 36 spell effect, 37 auras,
38 stamina, 39 ships), but only to browser players, via server code
(`DuskEngine.sendGear` etc.) that **our server doesn't have**. None of those
methods exist in our server's classes. So our server only sends 0-32, and
those numbers mean nothing here unless we add the server side too. Its
opcode 37 is unrelated to the "37-40" inner switch noted below.

#### Opcodes 33-39 as seen in a capture of that server

These formats are **inferred** from one HAR capture of the modified server
(`harcapture.har`, walked with `tools/har_walk.mjs`), not read from its
source. There's no length field, so message boundaries are the walker's
best guess, but each format stayed consistent every time it repeated. 34,
36 and 37 didn't appear in the capture.

| Op | Meaning | Payload (all newline-terminated lines) |
|----|---------|----------------------------------------|
| 33 | Gear (seen 1×) | 1 int (entity ID), then 9 item names in opcode 7's slot order (wield, arms, legs, torso, waist, neck, skull, eyes, hands). Empty slots are `none`. **No IDs follow**, unlike opcode 7. Sample: `1757`, `executioner axe`, `none`, `none`, `platinum suit`, `none`, `none`, `platinum helmet`, `none`, `none` |
| 35 | Spellbook (seen 6×) | 1 int (`2`), then 10 slot lines (`-` = empty), then 2 ints (`0`, `0`). **Unclear:** the leading int doesn't match the 10 slots, so it may not be a count |
| 38 | Stamina / skills (seen 6×) | 2 ints (probably current and max stamina; seen `30 30` and `30 34`), 1 int count *n*, then *n* × 5 lines: name, cost int, unknown int (always `0`), cooldown in ms, requirement text (`-` = none). Sample entries: `power strike 15 0 3000 -`, `whirlwind 25 0 5000 needs 20 strength`, `jump 20 0 1000 needs 15 dexterity` |
| 39 | Ships (seen 19×) | 1 int count *n*, then *n* × 6 lines: ID, x, y, facing letter (`e`...), 2 int flags (seen `1 1`, then `0 0` while sailing). Sample: `1`, `2`, `546`, `485`, `e`, `1`, `1`. The x,y moved one square per message while sailing east. A bare `0` (no ships) also appeared |

## Source files in `client_src_reference/`

`Commands.java` in that folder is the **server's** command parser (its
`parseCommand` takes a `LivingThing` and `DuskEngine`), not the client's.
The client-side `Commands` class isn't included. The server version is
still useful for seeing how commands like `applicationimages`, `notdead`
and `quit` are handled.

## Not yet covered

There's a second, smaller switch block further down in `Dusk.java`
(cases 37-40 seen at lines ~1682-1703) that appears to be a *different*,
inner switch — not part of this main opcode dispatch. Worth checking
what triggers it before assuming it's part of the same numbering space.

## Next steps for the browser client

1. Confirm the opcode-28-×8 login behavior against the server source,
   if exact replication matters for a clean login sequence.
2. Check the secondary switch (37-40) to see if it's reachable during
   normal play or only in some special mode.
3. Confirm how the server sends opcode 11 (if at all) to a client that
   sent `applicationimages`.

The JS parser (`js/protocol.js`) now covers opcodes 0-32.
