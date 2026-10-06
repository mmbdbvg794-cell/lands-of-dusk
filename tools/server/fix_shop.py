#!/usr/bin/env python3
"""Shop price and small-leak fixes from the shop audit (2026-10-06):

  prices      items far stronger than their price next to everything else:
                war axe (Kingshaven)          150 -> 700   (attack 300)
                pyramid studded necklace      300 -> 1200  (armour 150, like the diamond collar)
                steel helmet                  150 -> 1500  (armour 150)
                diamond belt                  600 -> 2000  (armour 200; the next belt has 60)
              and arrows and quivers cost nothing, so ammunition was free:
                arrow 0 -> 2, quiver 0 -> 20
  176_129     the free ale came back every time the last one was used or
              sold (5 gp a trip): now once per character (hidden flag
              freeale_given).
  MTH tolls   13 squares around 125-146 x 876-898 took 100 gp from anyone
              outside the MTH clan whether they had it or not, so players
              went into debt: now they take what you carry, down to 0.
  441_54      the begging thief took 1 gp even from a player with none:
              now only from a player who has some.

    python3 fix_shop.py [game dir]          dry run: says what would change
    python3 fix_shop.py [game dir] --apply  changes it (old files in backups/)

Item files and scripts are read when they're used: no restart needed.
Items already carried keep their old price until the player logs in again.
"""
import os
import re
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv

PRICES = {
    "war axe": 700,
    "pyramid studded necklace": 1200,
    "steel helmet": 1500,
    "diamond belt": 2000,
    "arrow": 2,
    "quiver": 20,
}

TOLL_OLD = 'chat trigger "You get 100 gp stolen from you"\ninc trigger cash -100\n'
TOLL_NEW = ('if < trigger cash 100\n'
            'chat trigger "The thieves turn out your pockets and take every coin you have."\n'
            'set trigger cash 0\n'
            'endscript\n'
            'end\n') + TOLL_OLD

THIEF_OLD = ('\tinc trigger cash -1\n'
             '\tchat trigger " you give the thief 1 gp"\n')
THIEF_NEW = ('\tif > trigger cash 0\n'
             '\t\tinc trigger cash -1\n'
             '\t\tchat trigger " you give the thief 1 gp"\n'
             '\tend\n')

ALE_FLAG = "freeale_given"
ALE_HEAD = ('if hasCondition trigger %s\n'
            'chat trigger "You\'ve had your free one, brother. The next one you pay for."\n'
            'endscript\n'
            'end\n') % ALE_FLAG
ALE_GIVE = 'giveitem trigger "ale"\n'


def item_file(name):
    for f in os.listdir(os.path.join(game, "defItems")):
        if f.lower() == name:
            return "defItems/" + f
    raise ValueError("no item file for " + name)


def set_price(text, price):
    """The item file with its cost set, or None if it already is."""
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    for i, l in enumerate(lines[:-1]):
        if l.strip().lower() == "cost":
            if lines[i + 1].strip() == str(price):
                return None
            lines[i + 1] = str(price)
            return nl.join(lines)
    # No cost line: add one before the closing "." (or at the end).
    at = next((i for i, l in enumerate(lines) if l.strip() == "."), None)
    if at is None:
        while lines and lines[-1].strip() == "":
            lines.pop()
        at = len(lines)
    return nl.join(lines[:at] + ["cost", str(price)] + lines[at:])


def edits():
    out = [(item_file(n), "price", p) for n, p in PRICES.items()]
    moves = os.path.join(game, "defMoveActions")
    for f in sorted(os.listdir(moves)):
        if "." in f:
            continue
        with open(os.path.join(moves, f), encoding="latin-1") as fh:
            text = fh.read()
        if "inc trigger cash -100" in text and "isclan trigger MTH" in text:
            out.append(("defMoveActions/" + f, "toll", None))
    out.append(("defMoveActions/441_54", "thief", None))
    out.append(("defMoveActions/176_129", "ale", None))
    return out


def change(text, kind, arg):
    """The new text, or None if it's already changed; raises if it doesn't look as expected."""
    if kind == "price":
        return set_price(text, arg)
    flat = text.replace("\r\n", "\n")
    if kind == "toll":
        if "set trigger cash 0" in flat:
            return None
        if flat.count(TOLL_OLD) != 1:
            raise ValueError("toll lines not as expected")
        return flat.replace(TOLL_OLD, TOLL_NEW)
    if kind == "thief":
        if "if > trigger cash 0" in flat:
            return None
        if flat.count(THIEF_OLD) != 1:
            raise ValueError("thief lines not as expected")
        return flat.replace(THIEF_OLD, THIEF_NEW)
    if kind == "ale":
        if ALE_FLAG in flat:
            return None
        if flat.count(ALE_GIVE) != 1:
            raise ValueError("expected one free ale")
        return ALE_HEAD + flat.replace(ALE_GIVE, ALE_GIVE + "addCondition trigger %s\n" % ALE_FLAG)
    raise ValueError(kind)


texts, changed = {}, []
for path, kind, arg in edits():
    full = os.path.join(game, path)
    if full not in texts:
        with open(full, encoding="latin-1", newline="") as f:
            texts[full] = f.read()
    new = change(texts[full], kind, arg)
    what = "%s (%s%s)" % (path, kind, " %s" % arg if kind == "price" else "")
    print(("ok, already done: " if new is None else "change: ") + what)
    if new is not None:
        texts[full] = new
        changed.append(full)
flag_file = os.path.join(game, "defConditions", ALE_FLAG)
if not os.path.exists(flag_file):
    print("change: defConditions/" + ALE_FLAG + " (hidden flag)")
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
keep = os.path.join(game, "backups", "shop-" + time.strftime("%Y%m%d-%H%M%S"))
for full in changed:
    rel = os.path.relpath(full, game)
    os.makedirs(os.path.join(keep, os.path.dirname(rel)), exist_ok=True)
    shutil.copy2(full, os.path.join(keep, rel))
    # A stale compiled copy beside a script is run instead of it.
    if os.path.exists(full + ".dsko"):
        shutil.copy2(full + ".dsko", os.path.join(keep, rel + ".dsko"))
        os.remove(full + ".dsko")
    with open(full, "w", encoding="latin-1", newline="") as f:
        f.write(texts[full])
if not os.path.exists(flag_file):
    with open(flag_file, "w") as out:
        out.write("nodisplay\n.\n")
print("Done (old files in %s)" % (keep if changed else "nothing changed"))
