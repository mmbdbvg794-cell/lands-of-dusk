#!/usr/bin/env python3
"""Builds js/raceinfo.json for the race buttons from the server's races.

    python3 tools/raceinfo.py /home/flan/DuskRPG > js/raceinfo.json

Each file in defRaces/ is a race: lines alternating a key and a value,
e.g. "dext" then "3". The keys used are the stat bonuses (stre, dext,
inte, cons, wisd), "image" (the race's picture in players.gif) and "x" /
"y" (where it starts). Dotfiles (.DS_Store and the like) are skipped, as
the client's race buttons do.
"""
import json
import os
import sys

STATS = {"stre": "STR", "dext": "DEX", "inte": "INT", "cons": "CON", "wisd": "WIS"}


def main(root):
    races_dir = os.path.join(root, "defRaces")
    info = {}
    for name in sorted(os.listdir(races_dir)):
        path = os.path.join(races_dir, name)
        if name.startswith(".") or not os.path.isfile(path):
            continue
        with open(path, encoding="latin-1") as f:
            lines = [l.strip() for l in f.read().splitlines() if l.strip()]
        pairs = dict(zip(lines[0::2], lines[1::2]))
        race = {"bonuses": {}}
        for key, value in pairs.items():
            try:
                n = int(value)
            except ValueError:
                continue
            if key in STATS:
                race["bonuses"][STATS[key]] = n
            elif key == "image":
                race["image"] = n
            elif key in ("x", "y"):
                race.setdefault("start", {})[key] = n
        info[name] = race
    json.dump(info, sys.stdout, indent=1, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
