#!/usr/bin/env python3
"""The toxic swamp in the old world's west (x 1-21, y 64-105) never worked:
its walk-on scripts say `isWearing trigger gasmask` without quotes, which
the script parser can't read, so every step there failed (an error in the
log each time) and the fumes never did anything. This quotes it, so
without a gas mask on the fumes hurt (10 HP a step, but never below 1: a
script's damage can't kill, so it would leave someone at minus HP) and the
gate at 3,105 turns you back; and says where a mask comes from. The mask is made by
Herbalist Linnet from the swamp hermit's neon rose (the quest in
tools/world/cities/swamp.mjs, which also rewrites the hermit's own square).

    python3 fix_swamp.py [game dir]          dry run: counts what would change
    python3 fix_swamp.py [game dir] --apply  changes them (old ones in backups/swamp-*)

Walk-on scripts are read when stepped on: no restart needed.
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv
folder = os.path.join(game, "defMoveActions")
HERMIT = "5_122"  # the quest plan's

HINT = " (A gas mask would keep them out: Herbalist Linnet, west of the walled city, knows how to make one.)"

changes = []
for name in sorted(os.listdir(folder)):
    if name.endswith(".dsko") or name == HERMIT:
        continue
    path = os.path.join(folder, name)
    with open(path, encoding="latin-1") as f:
        text = f.read()
    if "gasmask" not in text:
        continue
    new = text.replace("isWearing trigger gasmask", 'isWearing trigger "gasmask"')
    new = new.replace('"You feel dizzy from all these toxic fumes."', '"You feel dizzy from all these toxic fumes.' + HINT + '"')
    new = new.replace("in order to survive safely in the swamp.\"", "in order to survive safely in the swamp." + HINT + "\"")
    if "inc trigger hp -10" in new and "set trigger hp 1" not in new:
        new = new.replace("inc trigger hp -10", "inc trigger hp -10\n\tif < trigger hp 1\n\t\tset trigger hp 1\n\t\tchat trigger \"The fumes knock you to your knees. Get out of the swamp!\"\n\tend")
    if new != text:
        changes.append((path, new))

print(("change" if apply else "would change") + ": %d swamp squares" % len(changes))
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
keep = os.path.join(game, "backups", "swamp-" + time.strftime("%Y%m%d-%H%M%S"))
os.makedirs(keep, exist_ok=True)
for path, new in changes:
    shutil.copy2(path, keep)
    if os.path.exists(path + ".dsko"):
        os.remove(path + ".dsko")
    with open(path, "w", encoding="latin-1") as f:
        f.write(new)
print("Done (old scripts in %s)" % keep)
