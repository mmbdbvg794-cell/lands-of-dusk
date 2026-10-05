#!/usr/bin/env python3
"""Mends the old scripts tools/server/check_scripts.py finds broken (the
2026-10-05 sweep), each of which failed when run (EOFException in the log)
or never did what it says:

  quotes    seven lines whose text never closes (or never opens), so the
            reader runs to the end of the script: closed, by hand below.
  ends      an "if" whose block finishes with "endscript" but no "end"
            before the next code: an "end" after that endscript. And an
            "if" still open at the end: closed there.
  endscript a script that stops without one: one at the end.
  mistakes  "end script" (two words) where "endscript" is meant (31,24's
            resting place never healed anyone).
  strays    walk-on files that hold only a who-may-step rule ("true", or
            28,19's "! isRace trigger new"), which as walk-on scripts just
            fail: removed (nothing they did is lost).

    python3 fix_scripts.py [game dir]          dry run: lists what it would change
    python3 fix_scripts.py [game dir] --apply  changes them (old ones in backups/scripts-*)

Scripts are read when they run: no restart needed.
"""
import os
import re
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv
os.chdir(game)

# (file, old line text, new line text), each matched exactly once.
QUOTES = [
    ("defMoveActions/181_137", 'chat trigger "Good bye fellow anarchist', 'chat trigger "Good bye fellow anarchist"'),
    ("defMoveActions/187_204", 'chat trigger you already have an excalibur"', 'chat trigger " You already have an excalibur sword"'),
    ("defMoveActions/195_206", 'chat trigger " Beware....there is hunted stuff  up ahead', 'chat trigger " Beware....there is haunted stuff up ahead"'),
    ("defMoveActions/70_23", 'if isMob trigger "Morph Octopus', 'if isMob trigger "Morph Octopus"'),
    ("commands/busy", 'order trigger concat concat " gecho " trigger name " is busy', 'order trigger concat concat " gecho " trigger name " is busy"'),
    ("scripts/baneslain_bloodsword", 'chat trigger " You equip the banslain_bloodsword', 'chat trigger " You equip the banslain_bloodsword"'),
    ("defMoveActions/7_966", 'giveitem trigger "Reward Note', 'giveitem trigger "Reward Note"'),
]
STRAYS = ["defMoveActions/267_337", "defMoveActions/269_337", "defMoveActions/303_835", "defMoveActions/476_384", "defMoveActions/28_19"]
FOLDERS = ["defMoveActions", "scripts", "commands", "defSpellGroups", "talk"]
SKIP = (".dsko", ".dlg", ".greet", ".disabled", ".zip", ".original", ".json", ".block", ".bak", ".py", ".sh", ".save", ".txt")
TOKEN = re.compile(r'"[^"]*"|\S+')


def words(line):
    return [w.lower() for w in TOKEN.findall(line)]


def mend(text):
    """The script with missing ends and endscript added; unchanged if fine.
    Works line by line on code lines (comments and blank lines kept)."""
    if text.count('"') % 2:
        return text  # a quote problem: fixed by hand, not here
    lines = text.replace("\r", "").split("\n")
    out = []
    depth = 0
    code = [i for i, l in enumerate(lines) if l.strip() and not l.strip().startswith("#") and l.strip() != "."]
    nxt = {code[k]: code[k + 1] for k in range(len(code) - 1)}
    in_string = False
    for i, line in enumerate(lines):
        out.append(line)
        if i not in code:
            continue
        # Only the code part of a line: not inside chat text that runs over
        # lines (which may well say "if").
        part = line
        if in_string:
            if line.count('"') % 2 == 0:
                continue  # still inside the text
            part = line[line.index('"') + 1:]
            in_string = False
        if part.count('"') % 2:
            part = part[:part.rindex('"')]
            in_string = True
        ws = words(part)
        depth = max(0, depth + ws.count("if") - ws.count("end"))
        if ws and ws[-1] == "endscript" and depth > 0 and i in nxt and not in_string:
            after = words(lines[nxt[i]])
            if after and after[0] not in ("end", "endscript"):
                # This block's end was forgotten: close it here, a level out.
                indent = re.match(r"\s*", line).group(0)
                indent = indent[:-1] if indent.endswith("\t") else indent[:-4] if indent.endswith("    ") else ""
                out.append(indent + "end")
                depth -= 1
    body = [w for l in out if l.strip() and not l.strip().startswith("#") for w in words(l)]
    tail = []
    if depth > 0:
        tail += ["end"] * depth
    last = [w for w in body if w != "."]
    if not last or last[-1] != "endscript" or depth > 0:
        tail.append("endscript")
    if tail:
        # Before a trailing "." (an old file terminator), if there is one.
        while out and not out[-1].strip():
            out.pop()
        dot = out and out[-1].strip() == "."
        if dot:
            out.pop()
        out += tail + (["."] if dot else []) + [""]
    new = "\n".join(out)
    return new if new != text.replace("\r", "") else text


changes = {}
for path, old, new in QUOTES:
    if not os.path.isfile(path):
        continue
    text = open(path, encoding="latin-1").read()
    if new in text:
        continue
    if text.count(old) != 1:
        sys.exit("%s: expected the line %r once" % (path, old))
    changes[path] = text.replace(old, new)

for folder in FOLDERS:
    for name in sorted(os.listdir(folder)):
        if name.endswith(SKIP) or name.startswith(".") or " " in name and folder == "defMoveActions":
            continue
        if folder == "defSpellGroups" and not name[:1].isdigit():
            continue
        path = os.path.join(folder, name)
        if not os.path.isfile(path) or path in STRAYS:
            continue
        text = changes.get(path) or open(path, encoding="latin-1").read()
        text2 = re.sub(r"(?m)^(\s*)end script\s*$", r"\1endscript", text)
        text2 = mend(text2)
        if text2 != text:
            changes[path] = text2

strays = [p for p in STRAYS if os.path.isfile(p)]
for path in sorted(changes):
    print(("change: " if apply else "would change: ") + path)
for path in strays:
    print(("remove: " if apply else "would remove: ") + path)
print("%d to change, %d to remove" % (len(changes), len(strays)))
if not apply:
    print("Dry run; add --apply to write it.")
    sys.exit(0)
keep = os.path.join("backups", "scripts-" + time.strftime("%Y%m%d-%H%M%S"))
for path in list(changes) + strays:
    dst = os.path.join(keep, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(path, dst)
    if os.path.exists(path + ".dsko"):
        os.remove(path + ".dsko")
for path, text in changes.items():
    with open(path, "w", encoding="latin-1") as f:
        f.write(text)
for path in strays:
    os.remove(path)
print("Done (old files in %s)" % keep)
