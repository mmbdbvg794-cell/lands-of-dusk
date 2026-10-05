#!/usr/bin/env python3
"""Healing Staff (druidic group, level 1) never worked: two of its chat
lines have the message split over two lines inside the quotes, so the
script parser runs off the end of the file looking for the closing quote
("Error executing script defSpellGroups/1 druidic group @ parse 2::
java.io.EOFException"). This joins them back up, keeps the old file in
backups/, and removes the stale compiled copy (.dsko).

    python3 fix_healing_staff.py [game dir]          dry run: shows the change
    python3 fix_healing_staff.py [game dir] --apply  writes it

Takes effect at once (spell scripts are read when cast); no restart.
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv
path = os.path.join(game, "defSpellGroups", "1 druidic group")

lines = open(path, encoding="latin-1").read().split("\n")
out = []
i = 0
while i < len(lines):
    line = lines[i]
    # A line with an unclosed string: the next line is the rest of it.
    while line.count('"') % 2 == 1 and not line.lstrip().startswith("#") and i + 1 < len(lines):
        i += 1
        line = line + lines[i].strip() if line.endswith(" ") else line + " " + lines[i].strip()
    out.append(line)
    i += 1

fixed = "\n".join(out)
if fixed == "\n".join(lines):
    print("Nothing to fix in", path)
    sys.exit(0)
for line in out:
    if line not in lines:
        print("now:", line.strip())
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
keep = os.path.join(game, "backups", "healing-staff-" + time.strftime("%Y%m%d-%H%M%S"))
os.makedirs(keep, exist_ok=True)
shutil.copy2(path, keep)
if os.path.exists(path + ".dsko"):
    shutil.copy2(path + ".dsko", keep)
    os.remove(path + ".dsko")
with open(path, "w", encoding="latin-1") as f:
    f.write(fixed)
print("Fixed", path, "(old copy in", keep + ")")
