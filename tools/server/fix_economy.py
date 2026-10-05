#!/usr/bin/env python3
"""Closes the ways to make gold from nothing found in the shop and economy
check (2026-10-05):

  CoL Bank   "withdraw -1000000" stored a million and left the player's
             cash negative, and dying moves negative cash back towards 0
             (Battle: cash -= cash * gplosemod), so the million came free.
             "deposit -3000" paid cash out of thin air the same way. Both
             now refuse anything below 1 gp. Bit 18 of the stored amount
             also counted 262146 instead of 262144 (2 gp extra per trip).
  197_845    the Master Quest Blade and Suit were handed to anyone on the
  214_841    square (sells for 2500 / 4500), and then the quest key they
             should cost was taken away if there was one: now no key, no
             reward.
  5_51       the ruby in the junk pile came back every time the last one
  467_54     was sold (500 gp a trip), the opal in the thieves' chest too:
             now once per player (hidden flags junkruby_found, chestopal_found).
  212_151    a bronze shovel dug a bronze ore (25 gp) on every step: now only
             while not carrying one.

    python3 fix_economy.py [game dir]          dry run: says what would change
    python3 fix_economy.py [game dir] --apply  changes it (old files in backups/)

Scripts are read when they run: no restart needed.
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv

REFUSE = """if < {var} 1
chat trigger "How much? Give a number of gold pieces above 0."
endscript
end
"""

KEY = """if ! hasitem trigger questkey
chat trigger "Nothing happens. You need a quest key."
set trigger locxy 200 900
endscript
end
"""

def edits():
    out = []
    # The bank: refuse amounts below 1, before the transaction lock is taken.
    for name, var in (("withdraw", "toWithdraw"), ("deposit", "toStore")):
        out.append(("commands/" + name, "bank", var))
    for name in ("balance", "deposit", "withdraw"):
        out.append(("commands/" + name, "bit18", None))
    out.append(("defMoveActions/197_845", "key", None))
    out.append(("defMoveActions/214_841", "key", None))
    out.append(("defMoveActions/5_51", "once", ("junkruby_found", "giveItem trigger ruby")))
    out.append(("defMoveActions/467_54", "once", ("chestopal_found", "giveItem trigger opal")))
    out.append(("defMoveActions/212_151", "ore", None))
    return out


def change(text, kind, arg):
    """The new text, or None if it's already changed; raises if it doesn't look as expected."""
    lines = text.split("\n")
    if kind == "bank":
        if "if < %s 1\n" % arg in text:
            return None
        # After the "not a number" check (its endscript/end), before the lock.
        for i, l in enumerate(lines):
            if l.strip().lower() == ("if ! variableisnumber %s" % arg).lower():
                j = i
                while lines[j].strip() != "end":
                    j += 1
                return "\n".join(lines[: j + 1] + REFUSE.format(var=arg).rstrip("\n").split("\n") + lines[j + 1 :])
        raise ValueError("no 'if ! variableIsNumber %s' check" % arg)
    if kind == "bit18":
        if "262146" not in text:
            return None
        return text.replace("262146", "262144")
    if kind == "key":
        if "if ! hasitem trigger questkey" in text:
            return None
        # Before the reward: after the "already got one" block.
        marker = "set trigger locxy 200 900\nendscript\nend\n"
        flat = "\n".join(l.strip() for l in lines)
        if flat.count(marker) < 1:
            raise ValueError("no 'already got one' block")
        k = flat.index(marker) + len(marker)
        return flat[:k] + KEY + flat[k:]
    if kind == "once":
        flag, give = arg
        if "addCondition trigger %s" % flag in text:
            return None
        flat = "\n".join(l.strip() for l in lines)
        if flat.count(give) != 1:
            raise ValueError("expected one '%s'" % give)
        # Found before: say so instead. Given: remember it.
        head = "if hasCondition trigger %s\nchat trigger \"There's nothing more to find here.\"\nendscript\nend\n" % flag
        flat = flat.replace(give, give + "\naddCondition trigger %s" % flag)
        start = 0
        while flat[start:].startswith("#"):
            start = flat.index("\n", start) + 1
        return flat[:start] + head + flat[start:]
    if kind == "ore":
        if 'hasitem trigger "bronze ore"' in text:
            return None
        old = 'if iswearing trigger "bronze shovel"'
        flat = "\n".join(l.strip() for l in lines)
        if flat.count(old) != 1:
            raise ValueError("no shovel check")
        return flat.replace(old, 'if hasitem trigger "bronze ore"\nendscript\nend\n' + old)
    raise ValueError(kind)


# Each file's edits in turn, on the text as the one before left it.
texts = {}
changed = set()
for path, kind, arg in edits():
    full = os.path.join(game, path)
    if full not in texts:
        with open(full, encoding="latin-1") as f:
            texts[full] = f.read()
    new = change(texts[full], kind, arg)
    print(("ok, already done: " if new is None else "change: ") + path + " (" + kind + ")")
    if new is not None:
        texts[full] = new
        changed.add(full)
plan = [(full, texts[full]) for full in texts if full in changed]
flags = ["junkruby_found", "chestopal_found"]
missing = [f for f in flags if not os.path.exists(os.path.join(game, "defConditions", f))]
for f in missing:
    print("change: defConditions/" + f + " (hidden flag)")
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
keep = os.path.join(game, "backups", "economy-" + time.strftime("%Y%m%d-%H%M%S"))
os.makedirs(keep, exist_ok=True)
for full, new in plan:
    rel = os.path.relpath(full, game)
    os.makedirs(os.path.join(keep, os.path.dirname(rel)), exist_ok=True)
    shutil.copy2(full, os.path.join(keep, rel))
    if os.path.exists(full + ".dsko"):
        shutil.copy2(full + ".dsko", os.path.join(keep, rel + ".dsko"))
        os.remove(full + ".dsko")
    with open(full, "w", encoding="latin-1") as f:
        f.write(new)
for f in missing:
    with open(os.path.join(game, "defConditions", f), "w") as out:
        out.write("nodisplay\n.\n")
print("Done (old files in %s)" % keep)
