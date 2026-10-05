#!/usr/bin/env python3
"""Makes the potions (and a few other things to eat or drink) work.

Their items named use scripts that were never there (tpotion, tmana,
redpotion...), so using one only said "That has no use." This gives each
its own script, scripts/<item>.use, in the item maker's form (js/library.js
useScript), so the Items editor opens them with their numbers; points the
item at it; and replaces the copied "some ale." descriptions.

    python3 fix_potions.py <game dir> [--dry-run]

Everything it changes is copied to backups/potions-<time>/ first. Running
it again changes nothing. No restart needed: the server reads an item's
file when one is made and a script when it's first used. Potions already
in someone's backpack pick up the change when they next log in.
"""
import json
import os
import shutil
import sys
import time

MADE = "#Made by the item maker: "

# item -> (what using it does, a new description or None to keep it)
POTIONS = {
    "tiny potion": ({"hp": 15, "message": "You feel a little better."}, "a tiny healing potion"),
    "minor potion": ({"hp": 25, "message": "You feel better."}, "a small healing potion"),
    "minor mana potion": ({"mp": 25, "message": "Your mind clears."}, "a small potion that restores mana"),
    "x-potion": ({"hp": 100, "message": "Warmth floods through you."}, "a strong healing potion"),
    "red potion": ({"hp": 300, "message": "Your wounds close before your eyes."}, None),
    "green potion": ({"mp": 300, "message": "Power hums in your fingertips."}, "a green potion that restores mana"),
    "blue potion": ({"hp": 500, "mp": 500, "message": "You feel completely restored."}, "a blue potion that restores health and mana"),
    "ambrosia": ({"hp": 50, "mp": 50, "message": "The food of the gods. You feel wonderful."}, None),
    "soul": ({"hp": 50, "message": "You devour the soul. Strength returns to you."}, None),
    "crisps": ({"food": 2700, "message": "*Crunch crunch*"}, None),
    "packed lunch": ({"food": 2700, "hp": 50, "message": "Andy's packed lunch. Delicious."}, None),
}
# Not a number the item maker knows: a hand-written script.
ANTICURSE = ("anti-curse potion", 'chat trigger "The curse lifts from you."\nremoveCondition trigger cursed\nremoveitem trigger "anti-curse potion"\nendscript\n')


def use_script(item, e):
    """The same script js/library.js useScript writes."""
    spec = {}
    for k in ("hp", "mp", "food", "drink"):
        if e.get(k):
            spec[k] = e[k]
    if e.get("message"):
        spec["message"] = e["message"]
    spec["gone"] = True
    lines = [MADE + json.dumps(spec, separators=(",", ":"))]
    if e.get("message"):
        lines.append('chat trigger "%s"' % e["message"])
    if e.get("hp"):
        lines.append("inc trigger hp %d" % e["hp"])
    if e.get("mp"):
        lines.append("inc trigger mp %d" % e["mp"])
    if e.get("food"):
        lines.append("addconditionwithduration trigger nohunger %d" % e["food"])
    if e.get("drink"):
        lines.append("addconditionwithduration trigger nothirst %d" % e["drink"])
    lines.append('removeitem trigger "%s"' % item)
    lines.append("endscript")
    return "\n".join(lines) + "\n"


def read(path):
    try:
        with open(path, encoding="latin-1") as f:
            return f.read()
    except FileNotFoundError:
        return None


def set_key(text, key, value):
    """An item file's key set to value (added before the final '.' if missing)."""
    lines = text.replace("\r", "").split("\n")
    for i, l in enumerate(lines[:-1]):
        if l.strip().lower() == key:
            lines[i + 1] = value
            return "\n".join(lines)
    end = next((i for i, l in enumerate(lines) if l.strip() == "."), len(lines))
    lines[end:end] = [key, value]
    return "\n".join(lines)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)
    os.chdir(args[0])
    backup = "backups/potions-" + time.strftime("%Y%m%d-%H%M%S")
    changed = []

    def write(path, text):
        if read(path) == text:
            return
        changed.append(path)
        if dry:
            return
        if os.path.exists(path):
            dest = os.path.join(backup, path)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(path, dest)
        with open(path + ".new", "w", encoding="latin-1", newline="\n") as f:
            f.write(text)
        os.replace(path + ".new", path)
        if path.startswith("scripts/") and os.path.exists(path + ".dsko"):
            os.remove(path + ".dsko")

    todo = [(item, use_script(item, e), desc) for item, (e, desc) in POTIONS.items()]
    todo.append((ANTICURSE[0], ANTICURSE[1], "a potion that lifts curses"))
    for item, script, desc in todo:
        path = os.path.join("defItems", item)
        text = read(path)
        if text is None:
            print("  no item called %s; skipped" % item)
            continue
        name = item + ".use"
        write(os.path.join("scripts", name), script)
        new = set_key(text, "onuse", name)
        new = set_key(new, "uses", "1")
        if desc:
            new = set_key(new, "description", desc)
        write(path, new)
    print(("Would change" if dry else "Changed") + " %d files" % len(changed) + ("" if dry or not changed else " (backups in %s)" % backup))
    for c in changed:
        print("  " + c)


if __name__ == "__main__":
    main()
