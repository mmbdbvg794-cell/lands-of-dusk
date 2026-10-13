#!/usr/bin/env python3
"""Adds achievement lines to a game's "achievements" file (the same lines
tools/world/cities/achievements.mjs makes), without rebuilding it.

    python3 add_achievement.py <game dir> "<id|title|what|kind|what|n>"... [--apply]

A line whose id is there already is left alone. Then "achievements reload"
in the game, or a restart, reads it.
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
if len(args) < 2:
    sys.exit(__doc__)
path = os.path.join(args[0], "achievements")
text = open(path, encoding="utf-8").read()
have = {l.split("|")[0] for l in text.splitlines() if l and not l.startswith("#")}
new = [l for l in args[1:] if l.count("|") == 5 and l.split("|")[0] not in have]
print("adding: %s" % (", ".join(l.split("|")[0] for l in new) or "nothing"))
if new and "--apply" in sys.argv:
    os.makedirs(os.path.join(args[0], "backups"), exist_ok=True)
    shutil.copy2(path, os.path.join(args[0], "backups", "achievements-" + time.strftime("%Y%m%d-%H%M%S")))
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.rstrip("\n") + "\n" + "\n".join(new) + "\n")
