#!/usr/bin/env python3
"""Takes the wild monsters out of a box of the map: the dens the spawn pass
(tools/world/spawns.mjs) put down before a town was built there. Kingshaven's
box is the default; the town's own monsters (its barracks' training dummies)
stay.

    python3 clear_mobs.py [game dir]          dry run: lists what would go
    python3 clear_mobs.py [game dir] --apply  removes them (old file in backups/mobs-*)
    --box x1,y1,x2,y2   another box   --keep name,name   other monsters to keep

The game reads "mobs" when it starts: restart after, with no god "save map"
in between (that would write the old monsters back).
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv
x1, y1, x2, y2 = (int(n) for n in opts.get("box", "1366,282,1526,454").split(","))
keep = set(opts.get("keep", "training dummy").split(","))

path = os.path.join(game, "mobs")
with open(path, encoding="latin-1") as f:
    lines = f.read().split("\n")

# A monster is four lines: name, level, x, y.
out, gone, i = [], [], 0
while i < len(lines):
    try:
        int(lines[i + 1])
        x, y = int(lines[i + 2]), int(lines[i + 3])
    except (ValueError, IndexError):
        out.append(lines[i])
        i += 1
        continue
    if x1 <= x <= x2 and y1 <= y <= y2 and lines[i] not in keep:
        gone.append("%s at %d,%d" % (lines[i], x, y))
    else:
        out += lines[i:i + 4]
    i += 4

for g in gone:
    print(("remove " if apply else "would remove ") + g)
print("%d monster(s) in %d,%d - %d,%d" % (len(gone), x1, y1, x2, y2))
if not apply or not gone:
    if not apply:
        print("Dry run; add --apply to remove them.")
    sys.exit(0)
backup = os.path.join(game, "backups", "mobs-" + time.strftime("%Y%m%d-%H%M%S"))
os.makedirs(backup, exist_ok=True)
shutil.copy2(path, backup)
with open(path, "w", encoding="latin-1") as f:
    f.write("\n".join(out))
print("Done (old file in %s). Restart the game to clear them." % os.path.relpath(backup, game))
