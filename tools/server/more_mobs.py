#!/usr/bin/env python3
"""More monsters in the quest chains' dens: for each placed monster of the
named kinds, another one on a free walkable square close by (within RADIUS,
reached on foot from it, no monster or prop already there).

    python3 more_mobs.py <shortmap> <mobs file> <props file> <tile scripts tsv>
                         <out bundle.json> <name> [<name> ...] [--files <bundle.json> ...]

The tile scripts tsv is "<tile>\\t<script>" for defTileScripts (walkable =
"true"). --files: other bundles whose defMobs files go in too (a plan's
retuned monsters), so one install brings both. Writes a bundle for
tools/world/install_city.py (install it with --force so the changed defMobs
files replace the old, and --old-world for the old world's dens).
"""
import collections
import json
import struct
import sys

RADIUS = 3


def main():
    args = sys.argv[1:]
    extra = []
    if "--files" in args:
        i = args.index("--files")
        extra, args = args[i + 1:], args[:i]
    shortmap, mobs_path, props_path, tiles_tsv, out = args[:5]
    names = {n.lower() for n in args[5:]}
    data = open(shortmap, "rb").read()
    cols, rows = struct.unpack(">ii", data[:8])
    tile = lambda x, y: struct.unpack_from(">h", data, 8 + 2 * (x * rows + y))[0] if 0 <= x < cols and 0 <= y < rows else -1
    walk = set()
    for line in open(tiles_tsv):
        p = line.rstrip("\n").split("\t")
        if len(p) == 2 and p[0].isdigit() and p[1].strip() == "true":
            walk.add(int(p[0]))
    L = open(mobs_path, encoding="latin-1").read().split("\n")
    mobs = [(L[i], int(L[i + 1]), int(L[i + 2]), int(L[i + 3])) for i in range(0, len(L) - 3, 4) if L[i]]
    taken = {(x, y) for _, _, x, y in mobs}
    P = open(props_path, encoding="latin-1").read().split("\n")
    i = 0
    while i + 2 < len(P):
        try:
            taken.add((int(P[i + 1]), int(P[i + 2])))
            i += 3
        except ValueError:
            i += 1
    added = []
    for name, level, x, y in mobs:
        if name.lower() not in names:
            continue
        # Nearest free walkable square reached on foot within RADIUS.
        seen = {(x, y)}
        q = collections.deque([(x, y)])
        spot = None
        while q and not spot:
            cx, cy = q.popleft()
            for n in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if n in seen or abs(n[0] - x) > RADIUS or abs(n[1] - y) > RADIUS or tile(*n) not in walk:
                    continue
                seen.add(n)
                if n not in taken:
                    spot = n
                    break
                q.append(n)
        if spot:
            taken.add(spot)
            added.append({"name": name, "level": level, "x": spot[0], "y": spot[1]})
        else:
            print("no room beside", name, x, y)
    files = {}
    for b in extra:
        for k, v in json.load(open(b))["files"].items():
            if k.startswith("defMobs/"):
                files[k] = v
    bundle = {"name": "Monster tuning", "oldWorld": True, "area": {"x": 0, "y": 0, "w": 1, "h": 1}, "tiles": [], "props": [], "dropProps": [],
              "merchants": [], "signs": [], "mobs": added, "files": files, "copies": [], "sets": [], "journal": [], "conditions": []}
    json.dump(bundle, open(out, "w"), indent=1)
    counts = collections.Counter(m["name"] for m in added)
    print(f"{len(added)} monsters added: " + ", ".join(f"{n} +{c}" for n, c in sorted(counts.items())))
    print(f"{len(files)} monster files: " + ", ".join(sorted(k[8:] for k in files)))


if __name__ == "__main__":
    main()
