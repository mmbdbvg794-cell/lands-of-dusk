#!/usr/bin/env python3
"""Gives the three bundle items back their use scripts, so using one hands
out what it promises instead of "That has no use":

  crystal box    (250,000 gp)  the eight-piece Crystal armour set
  bloody book    (500,000 gp)  the eight-piece Blood armour set
  nova package   (310,000 gp)  Nova Fists, Nova Armor, Air Boots, Gaia Skull

The scripts are the game's own, from the 2002 copy
(~/DarkStarDusk2002/scripts), lost when the game moved. Each bundle costs
far more than its contents sell for (half their price), so no gold can be
made from them.

    python3 fix_bundles.py [game dir]          dry run: says what it would write
    python3 fix_bundles.py [game dir] --apply  writes the missing ones

A script that's already there is left alone. The three items also lose
their "uses 1": the engine counts a use down on the bundle opened, but the
script's removeitem takes the first one carried, so someone holding two
would lose an unopened one and keep a used-up one. Without it every bundle
is the same and opening one takes one away. Item files are read when an
item is made, so bundles already carried keep their old count.
No restart needed.
"""
import os
import sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv

SCRIPTS = {
    "crystalbox": """#The crystal box (defItems/crystal box): a whole set of crystal armour.
giveitem trigger "Crystal Helmet"
giveitem trigger "Crystal Suit"
giveitem trigger "Crystal Sleeves"
giveitem trigger "Crystal Leggings"
giveitem trigger "Crystal Necklace"
giveitem trigger "Crystal Lens"
giveitem trigger "Crystal Belt"
giveitem trigger "Crystal Gloves"
chat trigger " You open the box and find a whole set of crystal armor."
removeitem trigger "Crystal Box"
endscript
""",
    "bloodybook": """#The bloody book (defItems/bloody book): the armour of dead warriors.
giveitem trigger "Blood Helmet"
giveitem trigger "Blood Suit"
giveitem trigger "Blood Sleeves"
giveitem trigger "Blood Leggings"
giveitem trigger "Necklace of the Dead"
giveitem trigger "Eye of the Dead"
giveitem trigger "Blood Belt"
giveitem trigger "Blood Gloves"
chat trigger " You read an inscription in this book and get the armor of dead warriors"
removeitem trigger "Bloody Book"
endscript
""",
    "Nova Package": """#The nova package (defItems/nova package): a full set of Nova armour.
giveitem trigger "Nova Fists"
giveitem trigger "Nova Armor"
giveitem trigger "Air Boots"
giveitem trigger "Gaia Skull"
chat trigger " You open the package and find a full set of Nova armor."
removeitem trigger "Nova Package"
endscript
""",
}

# Every item they give must exist, or the bundle would be half empty.
missing_items = []
for text in SCRIPTS.values():
    for line in text.splitlines():
        if line.startswith("giveitem"):
            item = line.split('"')[1].lower()
            if not os.path.isfile(os.path.join(game, "defItems", item)):
                missing_items.append(item)
if missing_items:
    sys.exit("These items don't exist: " + ", ".join(missing_items))

for name, text in SCRIPTS.items():
    path = os.path.join(game, "scripts", name)
    if os.path.exists(path):
        print("already there: scripts/" + name)
        continue
    print(("write: " if apply else "would write: ") + "scripts/" + name)
    if apply:
        with open(path, "w", encoding="latin-1") as f:
            f.write(text)
for item in ("crystal box", "bloody book", "nova package"):
    path = os.path.join(game, "defItems", item)
    with open(path, encoding="latin-1") as f:
        lines = f.read().split("\n")
    out, i, dropped = [], 0, False
    while i < len(lines):
        if lines[i].strip().lower() == "uses" and i + 1 < len(lines):
            i += 2
            dropped = True
            continue
        out.append(lines[i])
        i += 1
    if not dropped:
        print("already done: defItems/" + item + " (no use count)")
        continue
    print(("drop: " if apply else "would drop: ") + "the use count of defItems/" + item)
    if apply:
        keep = os.path.join(game, "backups", "bundles")
        os.makedirs(keep, exist_ok=True)
        with open(os.path.join(keep, item), "w", encoding="latin-1") as f:
            f.write("\n".join(lines))
        with open(path, "w", encoding="latin-1") as f:
            f.write("\n".join(out))
if not apply:
    print("Dry run; add --apply to write them.")
