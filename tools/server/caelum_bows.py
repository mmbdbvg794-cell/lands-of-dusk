#!/usr/bin/env python3
"""More bows at Caelum's Bows (the user, 2026-10-30): a middling and a
strong one beside the cheap bow. Priced and gated like the rest
(item audit 2: weapons 4 x ((mod-100)/10)^2 gold; gearneeds), and kept
below the elderwood bow (520), which can only be made.

    elven bow          mod 240, reaches 5, DEX 15,   784 gold
    moonwood longbow   mod 350, reaches 6, DEX 30, 2,500 gold

    python3 - <game dir> [--apply] < tools/server/caelum_bows.py

Without --apply it says what it would change. The merchants and gearneeds
files are copied to backups/caelum-bows-<time>/ first. Running it again
changes nothing. Shops and gearneeds are read at start-up: restart after
it, with no god "save" in between.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
APPLY = "--apply" in sys.argv
AT = ("449", "1252")  # Caelum's shop square
BOWS = {
    "elven bow": ("an elven bow of pale ash, light in the hand. It reaches 5 squares (a diagonal square counts as two)", 240, 5, 15),
    "moonwood longbow": ("a moonwood longbow, strung in the Moonwell's light. It reaches 6 squares (a diagonal square counts as two)", 350, 6, 30),
}


def read(name):
    with open(os.path.join(G, name), encoding="latin-1", newline="") as f:
        return f.read()


def item(desc, mod, reach):
    cost = 4 * ((mod - 100) // 10) ** 2
    return f"type\nranged\ndescription\n{desc}\ncost\n{cost}\nimage\n8\nmod\n{mod}\ndurability\n100000\nrange\n{reach}\n.\n"


said, new, items = [], {}, {}
for name, (desc, mod, reach, _) in BOWS.items():
    path = os.path.join("defItems", name)
    text = item(desc, mod, reach)
    if not os.path.exists(os.path.join(G, path)) or read(path) != text:
        items[path] = text
        said.append(f"item   {name}")

needs = read("gearneeds")
have = {l.split("|")[0] for l in needs.split("\n") if "|" in l}
add = [f"{n}|DEX|{d}" for n, (_, _, _, d) in BOWS.items() if n not in have]
if add:
    new["gearneeds"] = needs.rstrip("\n") + "\n" + "\n".join(add) + "\n"
    said += [f"needs  {a}" for a in add]

lines = read("merchants").split("\n")
out, i, shop = [], 0, False
while i < len(lines):
    if i + 2 < len(lines) and lines[i + 1].strip().isdigit() and lines[i + 2].strip().isdigit():
        j = i + 3
        while j < len(lines) and lines[j] != "end":
            j += 1
        wares = lines[i + 3:j]
        if (lines[i + 1].strip(), lines[i + 2].strip()) == AT:
            more = [b for b in BOWS if b not in wares]
            if more:
                wares = wares + more
                shop = True
                said.append(f"shop   Caelum's: {', '.join(more)}")
        out += lines[i:i + 3] + wares
        i = j
        continue
    out.append(lines[i])
    i += 1
if shop:
    new["merchants"] = "\n".join(out)

for s in said:
    print(("" if APPLY else "would ") + s)
if not said:
    print("Nothing to change.")
elif APPLY:
    keep = os.path.join(G, "backups", time.strftime("caelum-bows-%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    for name, text in new.items():
        shutil.copy2(os.path.join(G, name), keep)
        with open(os.path.join(G, name), "w", encoding="latin-1", newline="") as f:
            f.write(text)
    for path, text in items.items():
        with open(os.path.join(G, path), "w", encoding="latin-1", newline="") as f:
            f.write(text)
    print(f"{len(said)} changes; backed up in {keep}. Restart the server for the shop.")
else:
    print(f"{len(said)} changes. Run with --apply.")
