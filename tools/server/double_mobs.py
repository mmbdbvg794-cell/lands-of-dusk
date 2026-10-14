#!/usr/bin/env python3
"""Twice the monsters: for each placed monster, one more of its kind on the
nearest free walkable square reached on foot from it (within 3 squares, or
5 if those are full): no monster, prop, shop, sign or walk-on square
(doors, teleports) there already.

    python3 double_mobs.py <game dir> <out bundle.json>

Run it ONCE: it doubles whatever the mobs file holds, so a second run would
double the doubled. (Installing the same bundle twice adds nothing.)
Reads the game's shortmap, mobs, props, merchants, signs, defMobs,
defTileScripts and defMoveActions; changes nothing. Install the bundle with
tools/world/install_city.py --old-world (the old world has most dens), then
restart (the mobs file is read at startup).

Left as they are:
  - kinds with one or two placed (bosses, champions, quest targets, and
    the god-tier DraN, Freyrbrand, Harpy and Invader)
  - the KeyMaster (it drops the quest keys)
  - stationary ones (training dummies)
  - anything in the four race tutorials or on the gods-only island
"""
import collections
import json
import os
import struct
import sys

RADIUS = (3, 5)
SKIP = {"KeyMaster"}
# x1, y1, x2, y2: where nothing is added.
KEEP_OUT = [
    (95, 345, 160, 410),       # human tutorial (start 125,365)
    (400, 1285, 480, 1330),    # elf tutorial, the Grove of Waking
    (1260, 940, 1325, 985),    # dark elf tutorial halls (Velkarath)
    (1840, 985, 1915, 1030),   # lizardman tutorial, the Hatching Pools
    (56, 1062, 212, 1198),     # gods-only island
]


def lines(path):
    with open(path, encoding="latin-1") as f:
        return f.read().replace("\r", "").split("\n")


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    game, out = sys.argv[1:]
    data = open(os.path.join(game, "shortmap"), "rb").read()
    cols, rows = struct.unpack(">ii", data[:8])
    tile = lambda x, y: struct.unpack_from(">H", data, 8 + 2 * (x * rows + y))[0] if 0 <= x < cols and 0 <= y < rows else -1
    walk = set()
    for f in os.listdir(os.path.join(game, "defTileScripts")):
        if f.isdigit() and lines(os.path.join(game, "defTileScripts", f))[0].strip().lower() == "true":
            walk.add(int(f))

    L = lines(os.path.join(game, "mobs"))
    mobs = [(L[i], L[i + 1], int(L[i + 2]), int(L[i + 3])) for i in range(0, len(L) - 3, 4)
            if L[i] and L[i + 2].lstrip("-").isdigit() and L[i + 3].lstrip("-").isdigit()]
    taken = {(x, y) for _, _, x, y in mobs}
    P = lines(os.path.join(game, "props"))
    for i in range(0, len(P) - 2, 3):
        if P[i + 1].isdigit() and P[i + 2].isdigit():
            taken.add((int(P[i + 1]), int(P[i + 2])))
    S = lines(os.path.join(game, "signs"))
    for i in range(0, len(S) - 2, 3):
        if S[i + 1].isdigit() and S[i + 2].isdigit():
            taken.add((int(S[i + 1]), int(S[i + 2])))
    M = lines(os.path.join(game, "merchants"))
    for i in range(len(M) - 2):
        if M[i][:1].isalpha() and M[i] != "end" and M[i + 1].isdigit() and M[i + 2].isdigit():
            taken.add((int(M[i + 1]), int(M[i + 2])))
    for f in os.listdir(os.path.join(game, "defMoveActions")):
        a, _, b = f.partition("_")
        if a.isdigit() and b.isdigit():
            taken.add((int(a), int(b)))

    count = collections.Counter(n for n, _, _, _ in mobs)
    def still(name):
        p = os.path.join(game, "defMobs", name)
        if not os.path.exists(p):
            return True  # no definition: leave it
        return "stationary" in " ".join(lines(p)).split()
    skip_kind = {n for n in count if count[n] <= 2 or n in SKIP or still(n)}

    added, no_room, skipped = [], [], collections.Counter()
    for name, level, x, y in mobs:
        if name in skip_kind:
            skipped[name] += 1
            continue
        if any(x1 <= x <= x2 and y1 <= y <= y2 for x1, y1, x2, y2 in KEEP_OUT):
            skipped["(in a tutorial or the gods' island)"] += 1
            continue
        spot = None
        for radius in RADIUS:
            seen = {(x, y)}
            q = collections.deque([(x, y)])
            while q and not spot:
                cx, cy = q.popleft()
                for n in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if n in seen or abs(n[0] - x) > radius or abs(n[1] - y) > radius or tile(*n) not in walk:
                        continue
                    seen.add(n)
                    if n not in taken:
                        spot = n
                        break
                    q.append(n)
            if spot:
                break
        if spot:
            taken.add(spot)
            added.append({"name": name, "level": int(level) if level.lstrip("-").isdigit() else 1, "x": spot[0], "y": spot[1]})
        else:
            no_room.append((name, x, y))
    bundle = {"name": "Twice the monsters", "oldWorld": True, "area": {"x": 0, "y": 0, "w": 1, "h": 1}, "tiles": [], "props": [], "dropProps": [],
              "dropMobs": [], "merchants": [], "signs": [], "mobs": added, "files": {}, "copies": [], "sets": [], "journal": [], "conditions": []}
    json.dump(bundle, open(out, "w"), indent=1)
    print(f"{len(mobs)} monsters now; {len(added)} to add ({len(mobs) + len(added)} after); no room beside {len(no_room)}")
    print("left as they are:", ", ".join(f"{n} {c}" for n, c in sorted(skipped.items())))
    if no_room:
        print("no room:", ", ".join(f"{n} {x},{y}" for n, x, y in no_room[:30]), "..." if len(no_room) > 30 else "")


if __name__ == "__main__":
    main()
