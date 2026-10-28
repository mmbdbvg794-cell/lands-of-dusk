#!/usr/bin/env python3
"""Moves one NPC or prop in a game's props file, from where it should be
to where it should go (as move_keepers.py, for any one).

    python3 - <game dir> "<name>" <x,y> <to x,y> [--dry-run] < tools/server/move_prop.py

The server reads props when it starts and writes it back when a god
saves, so: run this, then restart, with no "save" in between. A copy of
props goes to backups/props-move-<time> first. Running it again changes
nothing; it refuses if the name isn't at <x,y> (or is there twice).
"""
import os
import shutil
import sys
import time

G, NAME = sys.argv[1], sys.argv[2]
FROM = tuple(sys.argv[3].split(","))
TO = tuple(sys.argv[4].split(","))
DRY = "--dry-run" in sys.argv
path = os.path.join(G, "props")
with open(path, encoding="latin-1", newline="") as f:
    lines = f.read().split("\n")
at = [i for i in range(len(lines) - 2) if lines[i] == NAME]
here = [(lines[i + 1].strip(), lines[i + 2].strip()) for i in at]
if TO in here and FROM not in here:
    sys.exit(f"{NAME}: already at {','.join(TO)}")
hits = [i for i, h in zip(at, here) if h == FROM]
if len(hits) != 1:
    sys.exit(f"{NAME}: found at {here or 'nowhere'}, not once at {','.join(FROM)}: nothing changed")
i = hits[0]
print(("Would move " if DRY else "Moved ") + f"{NAME} {','.join(FROM)} -> {','.join(TO)}")
if not DRY:
    keep = os.path.join(G, "backups", time.strftime("props-move-%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    shutil.copy2(path, keep)
    lines[i + 1], lines[i + 2] = TO
    with open(path, "w", encoding="latin-1", newline="") as f:
        f.write("\n".join(lines))
    print(f"props backed up in {keep}; restart the server for it to take effect")
