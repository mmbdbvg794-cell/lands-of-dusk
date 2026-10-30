#!/usr/bin/env python3
"""Caelum's Bows sells just bows (the user, 2026-10-30): his armour and
blades move to his sister Saelin's stall (tools/world/cities/
aelindorarmoury.mjs, installed with the same restart), and his "Elven
mail?" answer sends people to her.

    python3 - <game dir> [--apply] < tools/server/split_caelum.py

Without --apply it says what it would change. The merchants file and
Caelum's talk are copied to backups/caelum-<time>/ first. Running it again
changes nothing. Shops are read at start-up: restart after it, with no god
"save" in between.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
APPLY = "--apply" in sys.argv
AT = ("449", "1252")  # Caelum's shop square
MOVED = {"elven chain mail", "leafsilver helm", "leafsilver sleeves", "leafsilver gloves", "leafsilver belt",
         "leafsilver leggings", "redwood sword", "ash staff", "quarter staff", "woodcutter's axe"}
OLD = "Woven by my sister, link by link. Light as a shirt and it turns a blade. It is on my shelf, if you have the gold."
NEW = "My sister Saelin weaves it, link by link. Her stall is by the south avenue."


def read(name):
    with open(os.path.join(G, name), encoding="latin-1", newline="") as f:
        return f.read()


said, new = [], {}
lines = read("merchants").split("\n")
out, i = [], 0
while i < len(lines):
    if i + 2 < len(lines) and lines[i + 1].strip().isdigit() and lines[i + 2].strip().isdigit():
        j = i + 3
        while j < len(lines) and lines[j] != "end":
            j += 1
        wares = lines[i + 3:j]
        if (lines[i + 1].strip(), lines[i + 2].strip()) == AT:
            gone = [w for w in wares if w in MOVED]
            if gone:
                said.append(f"shop  Caelum's: no more {', '.join(gone)}; keeps {', '.join(w for w in wares if w not in MOVED)}")
            wares = [w for w in wares if w not in MOVED]
        out += lines[i:i + 3] + wares
        i = j
        continue
    out.append(lines[i])
    i += 1
if said:
    new["merchants"] = "\n".join(out)

for name in ("talk/Caelum", "talk/Caelum.dlg"):
    text = read(name)
    if OLD in text:
        new[name] = text.replace(OLD, NEW)
        said.append(f"talk  {name}")

for s in said:
    print(("" if APPLY else "would ") + s)
if not said:
    print("Nothing to change.")
elif APPLY:
    keep = os.path.join(G, "backups", time.strftime("caelum-%Y%m%d-%H%M%S"))
    os.makedirs(os.path.join(keep, "talk"), exist_ok=True)
    for name, text in new.items():
        shutil.copy2(os.path.join(G, name), os.path.join(keep, name))
        with open(os.path.join(G, name), "w", encoding="latin-1", newline="") as f:
            f.write(text)
    print(f"{len(said)} changes; backed up in {keep}. Restart the server for the shops.")
else:
    print(f"{len(said)} changes. Run with --apply.")
