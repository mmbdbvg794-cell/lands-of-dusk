#!/usr/bin/env python3
"""Takes the signs at Velkarath's entrances out of a game (the user,
2026-10-28: no signs there unless they warn people off): the sign where
each stair arrives, the signpost in each tunnel, and the one beside the
west stair on the surface. velkarath.mjs and landingpath.mjs no longer
place them.

    python3 - <game dir> [--dry-run] < tools/server/remove_velk_signs.py

The signs file is text, x, y; signnames is x, y, name. Both are copied to
backups/velk-signs-<time>/ first. Running it again changes nothing. Signs
are read at start-up: restart after it, with no god "save" in between.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
GONE = {
    (1271, 911): "Velkarath",            # west stair arrival
    (1341, 978): "Velkarath",            # south stair arrival
    (1420, 923): "Velkarath",            # east stair arrival
    (1309, 914): "Signpost",             # west tunnel
    (1347, 944): "Signpost",             # south tunnel
    (1385, 921): "Signpost",             # east tunnel
    (394, 1235): "To Aelindor Landing",  # beside the west stair, above
}


def read(name):
    with open(os.path.join(G, name), encoding="latin-1", newline="") as f:
        return f.read().split("\n")


def num(s):
    try:
        return int(s.strip())
    except ValueError:
        return None


signs, names = read("signs"), read("signnames")
keep_signs, keep_names, removed = [], [], []
i = 0
while i < len(signs):
    if i + 2 < len(signs) and (num(signs[i + 1]), num(signs[i + 2])) in GONE:
        removed.append(f"sign {signs[i + 1]},{signs[i + 2]}: {signs[i][:60]}")
        i += 3
        continue
    keep_signs.append(signs[i])
    i += 1
i = 0
while i < len(names):
    at = (num(names[i]), num(names[i + 1])) if i + 2 < len(names) else None
    if at in GONE and names[i + 2].strip() == GONE[at]:
        removed.append(f"name {names[i]},{names[i + 1]}: {names[i + 2]}")
        i += 3
        continue
    keep_names.append(names[i])
    i += 1

for r in removed:
    print(("Would remove " if DRY else "Removed ") + r)
if not removed:
    print("Nothing to remove.")
elif not DRY:
    keep = os.path.join(G, "backups", time.strftime("velk-signs-%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    for name, lines in (("signs", keep_signs), ("signnames", keep_names)):
        shutil.copy2(os.path.join(G, name), keep)
        with open(os.path.join(G, name), "w", encoding="latin-1", newline="") as f:
            f.write("\n".join(lines))
    print(f"Backed up in {keep}; restart the server for it to take effect")
