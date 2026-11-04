#!/usr/bin/env python3
"""Bounty boards in a grid (the user, 2026-11-04): Kingshaven's hard
poster stood in the Royal Bank's doorway and its sign inside the bank, and
every board stood in a line, where the client's "Bounty Board" labels run
together. Each board's three posters and sign move to a two-by-two grid
(tools/world/cities/bounties.mjs `posts` and `sign`, the same squares):
easy top left, middling top right, hard bottom left, the sign bottom right.

    python3 - <game dir> [--apply] < tools/server/bounty_grid.py

Without --apply it says what it would change. It stops if a new square
isn't walkable or something else stands there. The props, signs and
signnames files are copied to backups/bounty-grid-<time>/ first. Running it
again changes nothing. Props and signs are read at start-up: restart after
it, with no god "save" in between.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
APPLY = "--apply" in sys.argv

# Board: (poster names easy, middling, hard), the sign's text, where each
# of the four goes (posters then sign).
BOARDS = {
    "kh": (("Stray Hound Bounty", "Highway Thief Bounty", "Barrow Skeleton Bounty"), "Kingshaven Bounty Board", (1440, 351)),
    "ae": (("Lake Slimer Bounty", "Shrine Gargoyle Bounty", "Blighted Wolf Bounty"), "Aelindor Bounty Board", (474, 1226)),
    "vk": (("Cave Slime Bounty", "Duergar Bounty", "Magma Slime Bounty"), "Velkarath Bounty Board", (1338, 906)),
    "er": (("Lizard Bounty", "Black Dog Bounty", "Lizard Axeman Bounty"), "Eastreach Bounty Board", (1669, 1304)),
    "cl": (("Grave Thief Bounty", "Robber Guard Bounty", "Crypt Skeleton Bounty"), "City of Light Bounty Board", (100, 153)),
    "mn": (("Rock Slime Bounty", "Mine Stalker Bounty", "Cinder Slime Bounty"), "Midnight Bounty Board", (435, 82)),
    "sf": (("Frost Wolf Bounty", "Frost Bear Bounty", "Ice Skeleton Bounty"), "Southfield Bounty Board", (530, 16)),
    "ss": (("Bog Slime Bounty", "Swamp Serpent Bounty", "Dry One Raider Bounty"), "Ssarakh Bounty Board", (1696, 945)),
}


def grid(x, y):
    return [(x, y), (x + 3, y), (x, y + 2), (x + 3, y + 2)]


def read(name):
    with open(os.path.join(G, name), encoding="latin-1", newline="") as f:
        return f.read()


def triples(text):
    lines = text.replace("\r", "").split("\n")
    return [(i, lines[i], int(lines[i + 1]), int(lines[i + 2]))
            for i in range(0, len(lines) - 2, 3) if lines[i + 1].strip().isdigit() and lines[i + 2].strip().isdigit()]


props = read("props").replace("\r", "").split("\n")
signs = read("signs").replace("\r", "").split("\n")
names = read("signnames").replace("\r", "").split("\n")

# The map: walkable tiles are those whose tile script starts "true".
import struct
data = open(os.path.join(G, "shortmap"), "rb").read()
cols, rows = struct.unpack(">ii", data[:8])
walk = set()
for f in os.listdir(os.path.join(G, "defTileScripts")):
    if f.isdigit() and open(os.path.join(G, "defTileScripts", f), encoding="latin-1").read().strip().startswith("true"):
        walk.add(int(f))
tile = lambda x, y: struct.unpack_from(">h", data, 8 + 2 * (x * rows + y))[0]

moving = set()
plan = []  # (kind, index into its file, old x, old y, new x, new y, label)
problems = []
for b, (posters, sign, at) in BOARDS.items():
    to = grid(*at)
    for name, (nx, ny) in zip(posters, to):
        found = [(i, x, y) for i, n, x, y in triples("\n".join(props)) if n == name]
        if len(found) != 1:
            problems.append(f"{b}: {len(found)} props named {name}")
            continue
        i, x, y = found[0]
        moving.add((x, y))
        plan.append(("prop", i, x, y, nx, ny, name))
    found = [(i, x, y) for i, n, x, y in triples("\n".join(signs)) if n == sign]
    if len(found) != 1:
        problems.append(f"{b}: {len(found)} signs reading {sign}")
    else:
        i, x, y = found[0]
        moving.add((x, y))
        plan.append(("sign", i, x, y, *to[3], sign))

# Everything else standing anywhere: props, signs, shop squares.
taken = {(x, y) for _, _, x, y in triples("\n".join(props)) + triples("\n".join(signs))} - moving
m = read("merchants").replace("\r", "").split("\n")
for i in range(len(m) - 2):
    if m[i + 1].strip().isdigit() and m[i + 2].strip().isdigit() and (i == 0 or m[i - 1] == "end"):
        taken.add((int(m[i + 1]), int(m[i + 2])))
for _, _, x, y, nx, ny, label in plan:
    if tile(nx, ny) not in walk:
        problems.append(f"{label}: {nx},{ny} isn't walkable (tile {tile(nx, ny)})")
    if (nx, ny) in taken:
        problems.append(f"{label}: something already stands at {nx},{ny}")

if problems:
    print("Stopped:\n  " + "\n  ".join(problems))
    sys.exit(1)

said = []
for kind, i, x, y, nx, ny, label in plan:
    if (x, y) == (nx, ny):
        continue
    said.append(f"{kind}  {label}: {x},{y} -> {nx},{ny}")
    lines = props if kind == "prop" else signs
    lines[i + 1], lines[i + 2] = str(nx), str(ny)
    if kind == "sign":
        for j in range(0, len(names) - 2, 3):
            if names[j].strip() == str(x) and names[j + 1].strip() == str(y):
                names[j], names[j + 1] = str(nx), str(ny)

for s in said:
    print(("" if APPLY else "would ") + s)
if not said:
    print("Nothing to change.")
elif APPLY:
    keep = os.path.join(G, "backups", time.strftime("bounty-grid-%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    for name, lines in (("props", props), ("signs", signs), ("signnames", names)):
        shutil.copy2(os.path.join(G, name), keep)
        with open(os.path.join(G, name), "w", encoding="latin-1", newline="") as f:
            f.write("\n".join(lines))
    print(f"{len(said)} moved; backed up in {keep}. Restart the server for them to stand there.")
else:
    print(f"{len(said)} to move. Run with --apply.")
