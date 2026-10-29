#!/usr/bin/env python3
"""Every shop that sells water sells full waterskins too (the water
barrels, tools/world/cities/waterbarrels.mjs: a waterskin holds three
drinks and a barrel fills it).

    python3 - <game dir> [--apply] < tools/server/add_waterskins.py

Without --apply it lists the shops. The merchants file is copied to
backups/merchants-waterskins-<time>/ first. Running it again changes
nothing. Shops are read at start-up: restart after it, with no god "save"
in between.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
APPLY = "--apply" in sys.argv
WARE = "full waterskin"
path = os.path.join(G, "merchants")
lines = open(path, encoding="latin-1", newline="").read().split("\n")

# Blocks: name, x, y, wares..., "end".
out, said, i = [], [], 0
while i < len(lines):
    if i + 2 < len(lines) and lines[i + 1].strip().isdigit() and lines[i + 2].strip().isdigit():
        j = i + 3
        while j < len(lines) and lines[j] != "end":
            j += 1
        wares = lines[i + 3:j]
        block = lines[i:j]
        if "water" in wares and WARE not in wares:
            block.insert(block.index("water", 3) + 1, WARE)
            said.append(f"{lines[i]} at {lines[i + 1]},{lines[i + 2]}")
        out += block
        i = j
        continue
    out.append(lines[i])
    i += 1

for s in said:
    print(("" if APPLY else "would ") + "add a waterskin: " + s)
if not said:
    print("Nothing to change.")
elif APPLY:
    keep = os.path.join(G, "backups", time.strftime("merchants-waterskins-%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    shutil.copy2(path, keep)
    with open(path, "w", encoding="latin-1", newline="") as f:
        f.write("\n".join(out))
    print(f"{len(said)} shops; backed up in {keep}. Restart the server for it to take effect.")
else:
    print(f"{len(said)} shops. Run with --apply.")
