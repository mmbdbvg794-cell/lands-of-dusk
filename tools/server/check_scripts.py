#!/usr/bin/env python3
"""Checks every game script the way the engine reads them (word by word,
quoted strings whole) for the mistakes that make one fail or do nothing:

  quote     an odd number of quotes in the whole script: one never closes,
            so the reader runs to the end and fails (EOFException). (A
            string may run over several lines: chat text often does.)
  balance   more "if"s than "end"s, or an "end" with no "if"
  noend     no "endscript" at the end (the reader runs off the end)
  item      giveitem / removeitem / hasitem / iswearing naming an item
            that doesn't exist (gives or finds nothing)
  cond      addcondition naming a condition that doesn't exist

    python3 check_scripts.py [game dir] [--list]   counts per check and
                                                   per folder; --list
                                                   names every finding
"""
import os
import re
import sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
listing = "--list" in sys.argv
os.chdir(game)

FOLDERS = ["defMoveActions", "scripts", "defSpellGroups", "commands", "conf", "defCanMoveScripts", "talk"]
SKIP = (".dsko", ".dlg", ".greet", ".disabled", ".zip", ".original", ".json", ".block", ".bak", ".py", ".sh", ".save", ".txt")
VARS = {"param0", "param1", "param2", "param3"}


def names(folder):
    return {f.lower() for f in os.listdir(folder) if not f.endswith(".dsko")}


ITEMS = names("defItems")
CONDS = names("defConditions")
TOKEN = re.compile(r'"[^"]*"|\S+')


def check(path):
    out = []
    try:
        text = open(path, encoding="latin-1").read().replace("\r", "")
    except Exception:
        return out
    body = "\n".join(l for l in text.split("\n") if l.strip() and not l.strip().startswith("#"))
    if body.count('"') % 2:
        last = body.rfind('"')
        out.append(("quote", body[last:last + 60].replace("\n", " / ")))
        return out
    words = TOKEN.findall(body)
    if not words:
        return out
    depth = 0
    for w in words:
        lw = w.lower()
        if lw == "if":
            depth += 1
        elif lw == "end":
            depth -= 1
            if depth < 0:
                out.append(("balance", "an end with no if"))
                depth = 0
    if depth > 0:
        out.append(("balance", "%d if without end" % depth))
    while words and words[-1] == ".":
        words.pop()  # an old file terminator after the script
    if not words:
        return out
    if words[-1].lower() != "endscript" and not (words[-1].lower() == "end" and any(w.lower() == "endscript" for w in words[-6:])):
        out.append(("noend", "ends with " + words[-1][:30]))
    for i, w in enumerate(words[:-2]):
        lw = w.lower()
        if lw in ("giveitem", "removeitem", "hasitem", "iswearing"):
            item = words[i + 2].strip('"').lower()
            if item and item not in ITEMS and item not in VARS and not item.startswith("param"):
                out.append(("item", "%s %s" % (lw, item)))
        elif lw in ("addcondition", "addconditionwithduration"):
            cond = words[i + 2].strip('"').lower()
            if cond and cond not in CONDS and cond not in VARS:
                out.append(("cond", "%s %s" % (lw, cond)))
    return out


totals = {}
for folder in FOLDERS:
    if not os.path.isdir(folder):
        continue
    for name in sorted(os.listdir(folder)):
        if name.endswith(SKIP) or name.startswith(".") or (folder == "defMoveActions" and " " in name):
            continue
        # A spell group's own file is its list of spells; its scripts are
        # "<level> <group>".
        if folder == "defSpellGroups" and not name[:1].isdigit():
            continue
        # Who-may-step rules and the conf tests are expressions, not scripts.
        if folder in ("defCanMoveScripts",) or (folder == "conf" and name.startswith("can")):
            continue
        path = os.path.join(folder, name)
        if not os.path.isfile(path):
            continue
        for kind, what in check(path):
            totals.setdefault((kind, folder), []).append((path, what))

for (kind, folder), found in sorted(totals.items()):
    print("%-8s %-17s %d" % (kind, folder, len(found)))
    if listing:
        for path, what in found:
            print("    %s: %s" % (path, what))
