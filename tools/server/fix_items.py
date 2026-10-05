#!/usr/bin/env python3
"""Items whose use script is missing ("That has no use"), found in the
2026-10-05 check: their scripts come back from the game's 2002 copy
(~/DarkStarDusk2002/scripts) where it has them, and the few with none
anywhere lose their dead "onuse" line, so they're plain items.

Restored for players: demons blood (sold, 3000 gp: the Demonic condition
for a while), arrow and quiver (Aelindor and Velkarath shops), chaos tome,
newspaper and vortanian news (reading), fairy dust, mud.
Restored as god tools (nothing gives them to players; a god can make
them with "<name>"): alpha, beta, coolaexp, exp, godexp, dmwexp, fixup,
moo, smek p, cyrils elixer, chaos orb, shifty box, book of ramaden,
lightning bolt.
No script anywhere, so the "onuse" goes: golden key, tesst, xyphoidstone,
zaria's note (whose script name was garbled).

A script is only copied if every item it hands out and every condition
it adds exists here; otherwise it's reported and left out.

    python3 fix_items.py [game dir] [2002 dir]          dry run
    python3 fix_items.py [game dir] [2002 dir] --apply  writes (old item files in backups/items-*)

Two of the old scripts are mended as they're copied: moo's "set trigger mp
maxmp" (whose maxmp?) and any that stop without an endscript.

Scripts are read when an item is used: no restart needed.
"""
import os
import re
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
old = args[1] if len(args) > 1 else os.path.expanduser("~/DarkStarDusk2002")
apply = "--apply" in sys.argv

RESTORE = [
    "dblood", "arrow", "quiver", "chaos tome", "readNewspaper", "news2", "fairy dust", "mud",
    "alpha", "beta", "coolaexp", "t god exp", "godexp", "dmwexp", "fixme", "moos", "sp", "celix",
    "corb", "sbox", "bor", "Lightning Bolt Use",
]
PLAIN = ["golden key", "tesst", "xyphoidstone", "zaria's note"]


def read(path):
    with open(path, encoding="latin-1") as f:
        return f.read()


def exists_ci(folder, name):
    name = name.strip().lower()
    return any(f.lower() == name for f in os.listdir(os.path.join(game, folder)) if not f.endswith(".dsko"))


problems = []
writes = []
for name in RESTORE:
    dst = os.path.join(game, "scripts", name)
    if os.path.exists(dst):
        print("already there: scripts/" + name)
        continue
    # The 2002 copy may spell the name in other letters' case; the game
    # looks up the item's own spelling, which is what's written here.
    found = [f for f in os.listdir(os.path.join(old, "scripts")) if f.lower() == name.lower() and not f.endswith(".dsko")]
    src = os.path.join(old, "scripts", found[0]) if found else ""
    if not found:
        problems.append("no 2002 script " + name)
        continue
    text = read(src).replace("\r\n", "\n")
    # Mended on the way: moo's "maxmp" said nobody's (the parser fails on
    # it), and scripts that just stop need an endscript, or the parser runs
    # off the end.
    text = text.replace("set trigger mp maxmp", "set trigger mp trigger maxmp")
    body = [l.strip().lower() for l in text.split("\n") if l.strip() and not l.strip().startswith("#")]
    if not body or body[-1] not in ("endscript", "end script"):
        text = text.rstrip("\n") + "\nendscript\n"
    low = text.lower()
    missing = [m.group(1) for m in re.finditer(r'giveitem\s+\w+\s+"?([^"\n]+?)"?\s*$', low, re.M) if not exists_ci("defItems", m.group(1))]
    missing += ["condition " + m.group(1) for m in re.finditer(r'addcondition(?:withduration)?\s+\w+\s+"?([^"\s]+)"?', low) if not exists_ci("defConditions", m.group(1))]
    if missing:
        problems.append("scripts/%s left out: it needs %s" % (name, ", ".join(missing)))
        continue
    writes.append((dst, text))
    print(("write: " if apply else "would write: ") + "scripts/" + name)

plain = []
for item in PLAIN:
    path = os.path.join(game, "defItems", item)
    if not os.path.isfile(path):
        continue
    lines = read(path).split("\n")
    out, i, dropped = [], 0, False
    while i < len(lines):
        if lines[i].strip().lower() == "onuse" and i + 1 < len(lines):
            i += 2
            dropped = True
            continue
        out.append(lines[i])
        i += 1
    if dropped:
        plain.append((path, lines, out))
        print(("plain: " if apply else "would make plain: ") + "defItems/" + item)
    else:
        print("already plain: defItems/" + item)

for p in problems:
    print("NOTE: " + p)
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
for dst, text in writes:
    with open(dst, "w", encoding="latin-1") as f:
        f.write(text)
if plain:
    keep = os.path.join(game, "backups", "items-" + time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    for path, lines, out in plain:
        shutil.copy2(path, keep)
        if os.path.exists(path + ".dsko"):
            os.remove(path + ".dsko")
        with open(path, "w", encoding="latin-1") as f:
            f.write("\n".join(out))
print("Done.")
