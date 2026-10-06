#!/usr/bin/env python3
"""The topaz and aquamarine the summon spells look for: carrying one makes
Summon Wurm (topaz) and Summon Leviathan (aquamarine) hit harder, but
neither gem existed. This makes them, priced like the opal, and has them
drop now and then from fitting creatures of the new lands:

  topaz       Wurm 15%, Scorpion 8%       (the desert, far out)
  aquamarine  Water Shade 15%, squid 8%   (the sea shore, far out)

    python3 add_gems.py [game dir]          dry run
    python3 add_gems.py [game dir] --apply  writes them (old monster files in backups/gems-*)

New monsters read their file: a restart puts the drops on every one.
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv

GEMS = {
    "topaz": "a golden topaz, warm to the touch. A summoned Wurm fights harder for whoever carries one",
    "aquamarine": "a sea-blue aquamarine, cool as deep water. A summoned Leviathan fights harder for whoever carries one",
}
DROPS = [("Wurm", "topaz", "0.15"), ("Scorpion", "topaz", "0.08"), ("Water Shade", "aquamarine", "0.15"), ("squid", "aquamarine", "0.08")]

todo = []
for gem, desc in GEMS.items():
    path = os.path.join(game, "defItems", gem)
    if not os.path.exists(path):
        todo.append(("item", path, "type\nitem\ndescription\n%s\ncost\n400\nmod\n0\nimage\n6\n.\n" % desc))
for mob, gem, chance in DROPS:
    path = os.path.join(game, "defMobs", mob)
    if not os.path.isfile(path):
        print("NOTE: no monster " + mob)
        continue
    with open(path, encoding="latin-1") as f:
        text = f.read()
    lines = text.replace("\r", "").split("\n")
    if any(lines[i].strip() == "giveitem" and lines[i + 1].strip().lower() == gem for i in range(len(lines) - 1)):
        continue
    # Before the closing "." (or at the end if there's none).
    end = max((i for i, l in enumerate(lines) if l.strip() == "."), default=len(lines))
    new = lines[:end] + ["giveitem", gem, chance] + lines[end:]
    todo.append(("drop", path, "\n".join(new)))

for kind, path, _ in todo:
    print(("write " if apply else "would write ") + kind + ": " + os.path.relpath(path, game))
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
keep = os.path.join(game, "backups", "gems-" + time.strftime("%Y%m%d-%H%M%S"))
os.makedirs(keep, exist_ok=True)
for kind, path, text in todo:
    if os.path.exists(path):
        shutil.copy2(path, keep)
    with open(path, "w", encoding="latin-1") as f:
        f.write(text)
print("Done.")
