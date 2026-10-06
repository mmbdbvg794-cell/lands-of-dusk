#!/usr/bin/env python3
"""Item files the engine can't load (found reviving "The Fire Orb"):

  - names with capitals ("Fire Orb", "Sleeping Potion", "StarterKey"...): the
    engine opens defItems/<name in lower case>, so these were never found;
    renamed to lower case.
  - no "type" first ("questkey", the vault and room keys, "daemon horns",
    "flaming arrows"...): the engine stops reading an item whose first line
    isn't "type"; the file's own type moved first, or "type item" added.
  - "type " with a space after it ("blue potion"): the key lines trimmed.

Files that aren't items (a shell script, a log, a monster's stats, a
leftover "name" or "warning") are left alone.

    python3 fix_item_files.py [game dir]          dry run
    python3 fix_item_files.py [game dir] --apply  changes them (old ones in backups/items-*)

Item files are read whenever an item is made: no restart needed.
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv
folder = os.path.join(game, "defItems")
NOT_ITEMS = {"bulk_create_items.sh", "dc.log", "specter", "name", "warning"}
KEYS = {"type", "description", "cost", "image", "mod", "kind", "onuse", "onwear", "onunwear", "onget", "ondrop", "uses", "range", "durability", "iamge"}


def mend(text):
    lines = text.replace("\r", "").split("\n")
    # Trim the key lines ("type " -> "type"); values are kept as they are.
    lines = [l.strip() if l.strip().lower() in KEYS else l for l in lines]
    if lines and lines[0].strip().lower() == "type":
        return "\n".join(lines)
    # Its own "type" pair, moved first; or an ordinary item.
    pair = ["type", "item"]
    for i, l in enumerate(lines[:-1]):
        if l.strip().lower() == "type":
            pair = ["type", lines[i + 1].strip() or "item"]
            del lines[i:i + 2]
            break
    while lines and not lines[0].strip():
        lines.pop(0)
    return "\n".join(pair + lines)


plan = []  # (old path, new path, new text)
names = set(os.listdir(folder))
for name in sorted(names):
    if name.endswith(".dsko") or name in NOT_ITEMS or name.startswith("."):
        continue
    path = os.path.join(folder, name)
    if not os.path.isfile(path):
        continue
    with open(path, encoding="latin-1") as f:
        text = f.read()
    new_text = mend(text)
    new_name = name.lower()
    if new_name != name and new_name in names:
        print("NOTE: %s and %s both exist; left alone" % (name, new_name))
        continue
    if new_text != text.replace("\r", "") or new_name != name:
        plan.append((path, os.path.join(folder, new_name), new_text))
        what = []
        if new_name != name:
            what.append("renamed to %r" % new_name)
        if new_text != text.replace("\r", ""):
            what.append("type first" if not text.lower().startswith("type") else "lines trimmed")
        print(("fix: " if apply else "would fix: ") + name + " (" + ", ".join(what) + ")")

print("%d item files" % len(plan))
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
keep = os.path.join(game, "backups", "items-" + time.strftime("%Y%m%d-%H%M%S"))
os.makedirs(keep, exist_ok=True)
for old, new, text in plan:
    shutil.copy2(old, keep)
    for p in (old + ".dsko", new + ".dsko"):
        if os.path.exists(p):
            os.remove(p)
    if old != new:
        os.remove(old)
    with open(new, "w", encoding="latin-1") as f:
        f.write(text)
print("Done (old files in %s)" % keep)
