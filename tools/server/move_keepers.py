#!/usr/bin/env python3
"""Moves the class-trial keepers next to their tutorial's trainer
(tools/world/cities/classtrials.mjs), in a game's props file.

    python3 - <game dir> [--dry-run] < tools/server/move_keepers.py

The server reads props when it starts and writes it back when a god
saves, so: run this, then restart, with no "save" in between. A copy of
props goes to backups/props-keepers-<time> first. Running it again changes
nothing. Veteran Maddock already stands in the Drill Sergeant's room.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
# name: (from, to), world squares (the plan's x, y plus its origin).
MOVES = {
    "Sentinel Aeris": ((462, 1303), (459, 1301)),        # 2 east of Ranger Thandril
    "Weapons-Keeper Zhaun": ((1312, 956), (1309, 955)),  # 2 east of Blademistress Zeerith
    "Old Ssiv": ((1900, 1003), (1897, 1001)),            # 2 east of Hunt-Master Kreeth
}
path = os.path.join(G, "props")
with open(path, encoding="latin-1") as f:
    lines = f.read().split("\n")
moved = []
for i in range(len(lines) - 2):
    name = lines[i]
    if name not in MOVES:
        continue
    (fx, fy), (tx, ty) = MOVES[name]
    here = (lines[i + 1].strip(), lines[i + 2].strip())
    if here == (str(tx), str(ty)):
        print(f"{name}: already at {tx},{ty}")
    elif here == (str(fx), str(fy)):
        lines[i + 1], lines[i + 2] = str(tx), str(ty)
        moved.append(f"{name} {fx},{fy} -> {tx},{ty}")
    else:
        sys.exit(f"{name} is at {here[0]},{here[1]}, not where expected ({fx},{fy}): nothing changed")
for m in moved:
    print(("Would move " if DRY else "Moved ") + m)
if moved and not DRY:
    keep = os.path.join(G, "backups", time.strftime("props-keepers-%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    shutil.copy2(path, keep)
    with open(path, "w", encoding="latin-1") as f:
        f.write("\n".join(lines))
    print(f"props backed up in {keep}; restart the server for it to take effect")
