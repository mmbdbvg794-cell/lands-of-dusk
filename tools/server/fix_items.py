#!/usr/bin/env python3
"""Item audit fixes (2026-10-12), and food that lasts three hours.

    python3 fix_items.py <game dir> [--dry-run]

  Hunger and thirst  ale, apple, crisps, packed lunch, sandwich and water
                     kept hunger or thirst away for 2700 condition ticks
                     (a tick a second: 45 minutes). Now 10800 (3 hours).
  Monster drops      giveitem lines naming items that don't exist, so the
                     monster dropped nothing: expertsword, longsword,
                     cutlass, rusty dagger, vampire fang, Alligators Tooth
                     and bone, now the items they meant.
  Broken numbers     "cost 3,000" stops the engine reading the item there
                     (cost 0, and no mod, image or durability): ultima
                     blade, supra_blade, blade_of_destruction (its
                     durability was 42 digits, too big for the engine).
  Misspelt keys      grizzly bear claw ("weopon": couldn't be wielded),
                     diamond belt, red rose, enterencekey (description and
                     image keys the engine skipped), dark rod, divine armor
                     and super fire (description and its text on one line,
                     so no description), belt of the giants (wear script
                     "armor" -> armorstart, so taking it off no longer
                     costs 10 AC it never gave).

Old files go to backups/items-<time>/; compiled .dsko copies of changed
scripts are removed so the engine reads the new ones. The server reads
items and monsters when it starts: restart after. Running it again changes
nothing.
"""
import os
import re
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
keep = os.path.join(G, "backups", time.strftime("items-%Y%m%d-%H%M%S"))
changed = []


def read(rel):
    with open(os.path.join(G, rel), "rb") as f:
        return f.read().decode("latin-1")


def write(rel, text):
    path = os.path.join(G, rel)
    if read(rel) == text:
        return
    changed.append(rel)
    if DRY:
        return
    os.makedirs(os.path.dirname(os.path.join(keep, rel)), exist_ok=True)
    shutil.copy2(path, os.path.join(keep, rel))
    with open(path, "wb") as f:
        f.write(text.encode("latin-1"))
    if os.path.exists(path + ".dsko"):
        os.remove(path + ".dsko")


def sub(rel, old, new):
    """Replace whole lines equal to old (any case) with new."""
    text = read(rel)
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    out = []
    for line in lines:
        if line.strip().lower() == old.lower():
            out.extend(new.split("\n"))
        else:
            out.append(line)
    write(rel, nl.join(out))


for s in ["ale", "apple", "crisps.use", "packed lunch.use", "sandwich", "water"]:
    rel = "scripts/" + s
    write(rel, re.sub(r"(no(?:hunger|thirst)) 2700\b", r"\1 10800", read(rel)))

drops = {
    "expertsword": "expert sword", "longsword": "long sword", "cutlass": "cutlas",
    "rusty dagger": "rusty_dagger", "vampire fang": "vampire fangs",
    "alligators tooth": "alligator tooth", "bone": "skeleton bones",
}
for m in sorted(os.listdir(os.path.join(G, "defMobs"))):
    if m.endswith(".dsko"):
        continue
    rel = "defMobs/" + m
    text = read(rel)
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    for i in range(1, len(lines)):
        if lines[i - 1].strip().lower() == "giveitem" and lines[i].strip().lower() in drops:
            lines[i] = drops[lines[i].strip().lower()]
    write(rel, nl.join(lines))

for item in ["ultima blade", "supra_blade", "blade_of_destruction"]:
    rel = "defItems/" + item
    text = re.sub(r"(?m)^(-?\d{1,3}(?:,\d{3})+)(\r?)$", lambda m: m.group(1).replace(",", "") + m.group(2), read(rel))
    text = re.sub(r"(?m)^(durability\r?\n)\d{19,}", r"\g<1>1000000000", text)
    write(rel, text)

sub("defItems/grizzly bear claw", "weopon", "weapon")
sub("defItems/diamond belt", "desription", "description")
sub("defItems/red rose", "descritption", "description")
sub("defItems/enterencekey", "iamge", "image")
sub("defItems/dark rod", "description A magical rod from the Dark Wizard", "description\nA magical rod from the Dark Wizard")
sub("defItems/divine armor", "description super charged dragon armor", "description\nsuper charged dragon armor")
sub("defItems/super fire", "description;Fire that Burns inside of the Dragon King", "description\nFire that Burns inside of the Dragon King")
text = read("defItems/belt of the giants")
write("defItems/belt of the giants", re.sub(r"(?mi)^(onwear\r?\n)armor(\r?)$", r"\1armorstart\2", text))

print(("Would change" if DRY else "Changed") + " %d files" % len(changed) + ("" if DRY or not changed else " (backups in %s)" % keep))
for c in changed:
    print("  " + c)
