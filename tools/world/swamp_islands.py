#!/usr/bin/env python3
"""The lizardmen's islands made swamp: the land masses inside a box (the
ring of flan's "Lizardman Island Continent" notes) repainted with the swamp
tiles (tools/server/swamptiles.py, 168-173): marsh and mud for grass and
meadow (by noise, so it looks natural), swamp cypresses for trees, reeds
along the shores, sand only at the water's edge, and bog pools in the
interiors. A pool that would cut any walkable land off from the rest is
taken out again, so whatever could be walked to still can.

    python3 swamp_islands.py <shortmap> <tile scripts tsv> <out bundle.json> [x0 y0 x1 y1]
    python3 swamp_islands.py --trees <shortmap> <tile scripts tsv> <out bundle.json>
        (on a map already done: every tree left on the islands becomes a
        swamp willow, nothing else changes)

Writes a bundle for tools/world/install_city.py (tiles only).
"""
import collections
import json
import math
import random
import struct
import sys

MUD, MARSH, BOG, CYPRESS, REEDS = 168, 169, 170, 171, 172
GRASSY = {1, 36, 37}
TREES = {25, 26, 64, 103, 102}
SAND = {38, 27}
# The open sea (0), lakes and their shores (65-77), and the sandy shore
# pieces between beach and sea (78-89).
WATER = set(range(65, 90)) | {0, 2}
BOX = (1580, 740, 1960, 1150)


def noise(x, y, scale, seed):
    """Smooth value noise in 0..1."""
    def h(i, j):
        n = (i * 374761393 + j * 668265263 + seed * 1442695041) & 0xFFFFFFFF
        n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
        return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0
    fx, fy = x / scale, y / scale
    x0, y0 = math.floor(fx), math.floor(fy)
    tx, ty = fx - x0, fy - y0
    sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    a, b, c, d = h(x0, y0), h(x0 + 1, y0), h(x0, y0 + 1), h(x0 + 1, y0 + 1)
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy


def main():
    trees_only = "--trees" in sys.argv
    if trees_only:
        sys.argv.remove("--trees")
    shortmap, tsv, out = sys.argv[1:4]
    box = tuple(int(v) for v in sys.argv[4:8]) if len(sys.argv) >= 8 else BOX
    data = bytearray(open(shortmap, "rb").read())
    cols, rows = struct.unpack(">ii", data[:8])
    at = lambda x, y: 8 + 2 * (x * rows + y)
    get = lambda x, y: struct.unpack_from(">h", data, at(x, y))[0]
    walk = set()
    for line in open(tsv):
        p = line.rstrip("\n").split("\t")
        if len(p) == 2 and p[0].isdigit() and p[1].strip() == "true":
            walk.add(int(p[0]))
    walk |= {MUD, MARSH, REEDS, 173}
    x0, y0, x1, y1 = box
    inbox = lambda x, y: x0 <= x <= x1 and y0 <= y <= y1
    land = lambda t: t not in WATER

    # The land masses wholly inside the box (not the mainland reaching in).
    seen, islands = set(), []
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            if (x, y) in seen or not land(get(x, y)):
                continue
            comp, q, edge = [], collections.deque([(x, y)]), False
            seen.add((x, y))
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for n in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if n in seen or not (0 <= n[0] < cols and 0 <= n[1] < rows) or not land(get(*n)):
                        continue
                    if not inbox(*n):
                        edge = True
                        continue
                    seen.add(n)
                    q.append(n)
            if not edge:
                islands.append(comp)
    squares = [s for c in islands for s in c]
    print(f"{len(islands)} islands, {len(squares)} squares of land")
    before = {s: get(*s) for s in squares}

    def shore(x, y):
        return any(get(x + dx, y + dy) in WATER for dx in (-1, 0, 1) for dy in (-1, 0, 1))

    r = random.Random(7)
    new = {}
    for (x, y), t in before.items():
        n = noise(x, y, 9, 1)
        if t in TREES:
            new[(x, y)] = CYPRESS
        elif t in SAND:
            new[(x, y)] = t if shore(x, y) else (MUD if n < 0.5 else MARSH)
        elif t in GRASSY:
            if shore(x, y) and r.random() < 0.45:
                new[(x, y)] = REEDS
            elif n < 0.33:
                new[(x, y)] = MUD
            elif n > 0.8 and r.random() < 0.25:
                new[(x, y)] = REEDS
            else:
                new[(x, y)] = MARSH
    if trees_only:
        new = {s: t for s, t in new.items() if t == CYPRESS}
    for (x, y), t in new.items():
        struct.pack_into(">h", data, at(x, y), t)

    # Bog pools, where the noise is deepest, inland: each pool is tried on
    # its own and kept only if the island's walkable land stays in as many
    # pieces as before (so nothing gets cut off).
    def pieces():
        sqs = {s for s in squares if get(*s) in walk}
        n, seen = 0, set()
        for s in sqs:
            if s in seen:
                continue
            n += 1
            q = collections.deque([s])
            seen.add(s)
            while q:
                cx, cy = q.popleft()
                for m in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if m in sqs and m not in seen:
                        seen.add(m)
                        q.append(m)
        return n
    cand = set() if trees_only else {s for s, t in new.items() if t in (MUD, MARSH, REEDS) and not shore(*s) and noise(s[0] + 500, s[1] + 500, 7, 3) > 0.76}
    blobs, done = [], set()
    for s in cand:
        if s in done:
            continue
        b, q = [], collections.deque([s])
        done.add(s)
        while q:
            c = q.popleft()
            b.append(c)
            for m in ((c[0] + 1, c[1]), (c[0] - 1, c[1]), (c[0], c[1] + 1), (c[0], c[1] - 1)):
                if m in cand and m not in done:
                    done.add(m)
                    q.append(m)
        blobs.append(b)
    count = pieces()
    kept = 0
    for b in blobs:
        for x, y in b:
            struct.pack_into(">h", data, at(x, y), BOG)
        now = pieces()
        if now > count:
            for x, y in b:
                struct.pack_into(">h", data, at(x, y), new[(x, y)])
        else:
            for sq in b:
                new[sq] = BOG
            count = now
            kept += 1
    print(f"bog pools: {kept} of {len(blobs)} kept")
    lost = [s for s, t in before.items() if t in walk and get(*s) not in walk and new.get(s) != BOG]
    counts = collections.Counter(t for s, t in new.items() if t != before[s])
    names = {MUD: "mud", MARSH: "marsh", BOG: "bog", CYPRESS: "cypress", REEDS: "reeds"}
    print("changed:", ", ".join(f"{names.get(t, t)} {n}" for t, n in counts.most_common()))
    tiles = [[x, y, t] for (x, y), t in new.items() if t != before[(x, y)]]
    bundle = {"name": "Lizardman isles willows" if trees_only else "Lizardman isles swamp", "oldWorld": False, "area": {"x": x0, "y": y0, "w": x1 - x0 + 1, "h": y1 - y0 + 1}, "tiles": tiles,
              "props": [], "dropProps": [], "merchants": [], "signs": [], "mobs": [], "files": {}, "copies": [], "sets": [], "journal": [], "conditions": []}
    json.dump(bundle, open(out, "w"))
    print(f"{len(tiles)} squares change; walkable squares lost (besides pools): {len(lost)}")


if __name__ == "__main__":
    main()
