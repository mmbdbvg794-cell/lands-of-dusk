#!/usr/bin/env python3
"""Makes the mushroom edible. The drow and lizardfolk tutorials sell a water
and a mushroom as food ("No one survives the city hungry"), but the item had
no use script, so "use" said it had no use. Now it feeds like an apple: no
hunger for three hours (10800 ticks, as fix_items.py set for food).

    python3 fix_mushroom.py <game dir> [--apply]

Backs up what it changes to backups/mushroom-<time>/. Running it again
changes nothing. No restart: item files and scripts are read when used;
a mushroom already carried picks it up at the player's next login.
"""
import os
import shutil
import sys
import time

SCRIPT = 'chat trigger "You eat the mushroom. Earthy, and more filling than it looks."\naddconditionwithduration trigger nohunger 10800\nremoveitem trigger mushroom\nendscript\n'


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    apply = "--apply" in sys.argv
    os.chdir(args[0])
    item = os.path.join("defItems", "mushroom")
    script = os.path.join("scripts", "mushroom")
    lines = open(item, encoding="latin-1").read().replace("\r", "").split("\n")
    if any(l.lower() == "onuse" for l in lines):
        print("mushroom: already has a use")
        return
    end = lines.index(".") if "." in lines else len(lines)
    new = lines[:end] + ["onuse", "mushroom", "uses", "1"] + lines[end:]
    if os.path.exists(script):
        print("scripts/mushroom exists already; not overwriting it")
        return
    print("mushroom: onuse mushroom, uses 1; scripts/mushroom: nohunger for 3 hours")
    if not apply:
        print("Dry run; add --apply.")
        return
    keep = os.path.join("backups", "mushroom-" + time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(keep)
    shutil.copy2(item, keep)
    with open(item, "w", encoding="latin-1", newline="\n") as f:
        f.write("\n".join(new))
    with open(script, "w", encoding="latin-1", newline="\n") as f:
        f.write(SCRIPT)
    if os.path.exists(item + ".dsko"):
        os.remove(item + ".dsko")
    print("Done; the old item file is in %s" % keep)


if __name__ == "__main__":
    main()
