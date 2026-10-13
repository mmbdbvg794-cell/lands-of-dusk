#!/usr/bin/env python3
"""Two monster drops with no item, and junk in defItems (from audit_items.py).

    python3 fix_loose_ends.py <game dir> [--apply]

  Water Gem      Serpetion's drop (always): now a gem worth selling
  wonder elixer  Cyrii's drop (half the time): now a potion, 800 health and
                 mana (the name as the monster file spells it)
  junk           defItems files that are no item, sold, dropped or carried
                 by anyone (40-48 and 83: old copies of ale; "name", a
                 half item; "specter", a monster; "warning", a sign;
                 bulk_create_items.sh; dc.log): moved to
                 backups/defItems-junk-<time>/, not deleted

No restart: item files are read when an item is made. Running it again
changes nothing.
"""
import os
import shutil
import sys
import time

ITEMS = {
    "Water Gem": "type\nitem\ndescription\na Water Gem, deep blue, with a tide moving inside it. Serpetion guarded it\ncost\n1500\nmod\n0\nimage\n6\n.\n",
    "wonder elixer": "type\nitem\ndescription\na wonder elixir: restores 800 health and mana\ncost\n1200\nimage\n6\nonuse\nwonder elixer.use\nuses\n1\n.\n",
}
SCRIPTS = {
    "wonder elixer.use": 'chat trigger "A wonderful warmth fills you, body and mind."\ninc trigger hp 800\ninc trigger mp 800\nremoveitem trigger "wonder elixer"\nendscript\n',
}
JUNK = ["40", "41", "42", "43", "44", "48", "83", "name", "specter", "warning", "bulk_create_items.sh", "dc.log"]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    apply = "--apply" in sys.argv
    os.chdir(args[0])
    said = []
    for name, text in ITEMS.items():
        path = os.path.join("defItems", name)
        if os.path.exists(path):
            said.append("%s: there already" % name)
            continue
        said.append("%s: new item" % name)
        if apply:
            with open(path, "w", encoding="latin-1", newline="\n") as f:
                f.write(text)
    for name, text in SCRIPTS.items():
        path = os.path.join("scripts", name)
        if os.path.exists(path):
            continue
        said.append("scripts/%s: new" % name)
        if apply:
            with open(path, "w", encoding="latin-1", newline="\n") as f:
                f.write(text)
    there = [j for j in JUNK if os.path.exists(os.path.join("defItems", j))]
    if there:
        keep = os.path.join("backups", "defItems-junk-" + time.strftime("%Y%m%d-%H%M%S"))
        said.append("junk moved to %s: %s" % (keep, ", ".join(there)))
        if apply:
            os.makedirs(keep)
            for j in there:
                shutil.move(os.path.join("defItems", j), os.path.join(keep, j))
                if os.path.exists(os.path.join("defItems", j + ".dsko")):
                    shutil.move(os.path.join("defItems", j + ".dsko"), os.path.join(keep, j + ".dsko"))
    else:
        said.append("junk: none left")
    print("\n".join(said))
    if not apply:
        print("Dry run; add --apply.")


if __name__ == "__main__":
    main()
