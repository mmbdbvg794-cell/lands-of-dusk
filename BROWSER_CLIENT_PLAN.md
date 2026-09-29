# Browser Client Rebuild — Project Plan

## The goal

A browser-based (and phone-friendly) client, replacing/supplementing the
Java Swing client — no install, works everywhere a browser works. Target
feature set, based on what the friend's client already does:

- Real-time map/sprite rendering (canvas-based)
- HP/MP/Stamina bars, hotbar, inventory/equipment/spells panels
- Sound
- A revealable minimap (fog-of-war style — tracks explored tiles)
- Spell visual effects (particles around a caster)
- A toggleable art style (smooth vs. original pixel art)
- Floating damage numbers, selection boxes (already solved tonight —
  server-side logic already exists and works, just needs the same
  opcode parsing reproduced in JS)

## Why this is a real project, not a quick add-on

The existing Java client can't run in a browser at all — browsers can't
open the raw TCP socket it uses. Everything here depends on building a
translation layer first, then reimplementing the client's rendering and
UI logic in JavaScript from scratch. This is closer to "build a second
client" than "add a feature."

## Architecture

### 1. The bridge (foundation — nothing else works without this)

A small server-side process that:
- Accepts WebSocket connections from browsers
- For each one, opens a plain TCP connection to the game server itself
  (`127.0.0.1:10001`, since the bridge runs on the same container)
- Relays raw bytes bidirectionally between the two, doing no
  interpretation of the game's own protocol at all

This can be intentionally "dumb" — a pure relay. All the actual protocol
intelligence lives in the JavaScript client, exactly like it lives in
`Dusk.java` today. Python (with the `websockets` library) is a
straightforward choice, since Python's already set up on the container
from tonight's Discord bot work.

### 2. The protocol, reimplemented in JavaScript

This is the genuinely large piece of work. The existing protocol is
opcode-based (a single byte, followed by a variable amount of
opcode-specific data) — we've only directly examined a handful of
opcodes so far this session:
- `3`: plain text message
- `29`: set an entity's selection-flag color (green/red)
- `30`: clear all selection flags

There are certainly many more (entity position/movement updates, stat
changes, inventory contents, map data, login sequence, etc.) — each one
needs to be found in `Dusk.java`'s switch statement and its exact byte
layout documented before it can be reproduced in JS. This is the real
bulk of the effort, not the visual/UI layer.

### 3. Rendering and UI

Once messages can be parsed, a `<canvas>`-based renderer draws tiles and
sprites from the same `map.gif`/`sprites.gif`/`players.gif` files the
Java client already uses (loaded via JS Image objects instead of Java's
Toolkit) — no new art needed for this part. HP/MP/inventory panels are
just HTML/CSS reproducing the existing side panel.

### 4. New features beyond either existing client

- **Minimap**: genuinely new logic — track which map tiles a player has
  ever been near, store that client-side, render a small revealed-area
  map. Not a straight port of anything that exists today.
- **Spell VFX**: new, though it can hook off the existing `cast`
  messages/spell system we already understand from earlier tonight's
  work.
- **Sound**: need to check whether the original client's sound system
  (referenced in `Dusk.java` via `AudioClip`, currently unused/untested
  as far as we've seen) can be reused as-is, or needs its own
  implementation.

### 5. Art style toggle (last, most separable)

Needs a complete second art set in a different visual style, switchable
at runtime. Real content work, largely independent of everything above
— can happen at any point once the base renderer exists.

## Suggested build order

1. **The bridge** — prove browser → bridge → game server → browser works
   at all, even with zero graphics (e.g., a bare text-only test page).
2. **Login + text output only** in a real browser page — confirms the
   whole pipeline end to end before investing in graphics.
3. **Basic tile/sprite rendering** — get a static map view working.
4. **Entity movement + the opcodes we already understand** (damage
   numbers, selection boxes) — since we already know these precisely
   from tonight, they're a good "prove the renderer with real gameplay"
   milestone before tackling everything else.
5. **HP/MP/inventory panels.**
6. **Minimap, sound, spell VFX** — the genuinely new features.
7. **Art style toggle** — last, separable, mostly content work.

## Tonight's realistic starting point

Steps 1-2 above: get the bridge running and prove a browser can connect,
log in, and see plain text back from the real game server. That's a
genuinely solid, complete, testable milestone for one session — and
everything else in this plan builds on it directly.
