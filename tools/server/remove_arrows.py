#!/usr/bin/env python3
"""Arrows and quivers go (the user, 2026-10-30): bows never needed them, and
the old game's "arrow" command only worked with an item called "bow".

    python3 - <game dir> [--apply] < tools/server/remove_arrows.py

- the shops stop selling arrow, quiver, celestial arrow, flaming arrows;
- fletching no longer makes quivers (the recipes file is read again at
  once);
- commands/arrow (the old shot) is moved into the backup;
- the two fletchers stop talking about arrows.
Items already in packs stay (their files are kept) and sell as before.

Without --apply it says what it would change. Everything changed is copied
to backups/arrows-<time>/ first. Running it again changes nothing. Shops
are read at start-up: restart after it, with no god "save" in between.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
APPLY = "--apply" in sys.argv
WARES = {"arrow", "quiver", "celestial arrow", "flaming arrows"}
# talk file: [(old, new), ...]
LINES = {
    "talk/Wynn the Fletcher": [("Bows and arrows, straight and true.", "Bows, straight and true.")],
    "talk/Wynn the Fletcher.dlg": [("Bows and arrows, straight and true.", "Bows, straight and true."), ("Arrows by the quiver!", "Straight and true!")],
    "talk/Wynn the Fletcher.greet": [("Arrows by the quiver!", "Straight and true!")],
    "talk/Caelum": [("Bows of yew and arrows fletched with owl feathers.", "Bows of yew, strung for elven hands.")],
    "talk/Caelum.dlg": [("Bows of yew and arrows fletched with owl feathers.", "Bows of yew, strung for elven hands.")],
}


def read(name):
    with open(os.path.join(G, name), encoding="latin-1", newline="") as f:
        return f.read()


said, new = [], {}

# Shops: blocks of name, x, y, wares..., "end".
lines = read("merchants").split("\n")
out, i = [], 0
while i < len(lines):
    if i + 2 < len(lines) and lines[i + 1].strip().isdigit() and lines[i + 2].strip().isdigit():
        j = i + 3
        while j < len(lines) and lines[j] != "end":
            j += 1
        gone = [w for w in lines[i + 3:j] if w in WARES]
        if gone:
            said.append(f"shop    {lines[i]} at {lines[i + 1]},{lines[i + 2]}: no more {', '.join(gone)}")
        out += lines[i:i + 3] + [w for w in lines[i + 3:j] if w not in WARES]
        i = j
        continue
    out.append(lines[i])
    i += 1
if said:
    new["merchants"] = "\n".join(out)

recipes = read("recipes").split("\n")
keep = [r for r in recipes if not (r.count("|") >= 3 and r.split("|")[2].strip() in WARES)]
if len(keep) != len(recipes):
    said += [f"recipe  {r}" for r in recipes if r not in keep]
    new["recipes"] = "\n".join(keep)

for name, swaps in LINES.items():
    if not os.path.exists(os.path.join(G, name)):
        continue
    text = was = read(name)
    for old, now in swaps:
        text = text.replace(old, now)
    if text != was:
        new[name] = text
        said.append(f"talk    {name}")

arrow_cmd = os.path.exists(os.path.join(G, "commands/arrow"))
if arrow_cmd:
    said.append("command commands/arrow (moved into the backup)")

for s in said:
    print(("" if APPLY else "would ") + s)
if not said:
    print("Nothing to change.")
elif APPLY:
    keep_dir = os.path.join(G, "backups", time.strftime("arrows-%Y%m%d-%H%M%S"))
    os.makedirs(os.path.join(keep_dir, "talk"), exist_ok=True)
    os.makedirs(os.path.join(keep_dir, "commands"), exist_ok=True)
    for name, text in new.items():
        shutil.copy2(os.path.join(G, name), os.path.join(keep_dir, name))
        with open(os.path.join(G, name), "w", encoding="latin-1", newline="") as f:
            f.write(text)
    if arrow_cmd:
        shutil.move(os.path.join(G, "commands/arrow"), os.path.join(keep_dir, "commands/arrow"))
    print(f"{len(said)} changes; backed up in {keep_dir}. Restart the server for the shops.")
else:
    print(f"{len(said)} changes. Run with --apply.")
