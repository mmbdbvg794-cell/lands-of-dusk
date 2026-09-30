# Fixes broken walk-on scripts (defMoveActions) in a folder of copies: empty
# scripts become "endscript", and a few with a missing end or endscript, or a
# command run onto one line, are rewritten to do what they were written to.
#   python3 fix_move_actions.py <folder of copies>   (then compile-check with
#   TestCompile.java before copying them over the live ones)
import os, sys
d = sys.argv[1]
FIXES = {
    "100_28": 'if isClan trigger "DD"\nset trigger locXY 945 55\nchat trigger "DD hall..."\nendscript\nend\nendscript\n',
    "954_56": 'if isClan trigger "DD"\nset trigger locXY 945 55\nchat trigger "DD Hall.."\nendscript\nend\nendscript\n',
    "888_148": 'if hasITem trigger "Forest Gem"\nset trigger locxy 618 153\naddcondition trigger fc\nchat trigger " Better head into Whirlpool Lake ruins now....."\nendscript\nend\nendscript\n',
    "703_702": 'if hasitem trigger "knight"\nset trigger locxy 650 651\nchat trigger "you have entered the Super Dragons lair."\nendscript\nend\nif ! hasitem trigger "knight"\nchat trigger "you must kill the Dragon Knight to gain entrance to Super Dragons Lair"\nendscript\nend\nendscript\n',
    "702_725": 'if ! hasitem trigger "l mud"\nset trigger locxy 702 726\nchat trigger "there is a hole, maybe if you get some mud you can fill it"\nend\nif hasitem trigger "l mud"\nchat trigger "You use the mud to fill the hole"\nendscript\nend\nendscript\n',
}
changed = []
for name in sorted(os.listdir(d)):
    p = os.path.join(d, name)
    if name.endswith(".dsko") or not os.path.isfile(p):
        continue
    raw = open(p, "rb").read()
    text = raw.decode("latin-1")
    new = None
    if name in FIXES:
        new = FIXES[name]
    elif not text.strip():
        new = "endscript\n"                           # empty: nothing happens here
    elif name == "93_77" and "endscript" not in text:
        new = text.rstrip("\n") + "\nendscript\n"     # heal, then stop
    elif name == "88_72" and not text.rstrip().endswith("endscript"):
        new = text.rstrip("\n") + "\nendscript\n"     # neither condition: stop
    elif name == "96_298":
        new = text.replace("set trigger locXY 300 900 endscript", "set trigger locXY 300 900\nendscript")
    if new is not None and new != text:
        open(p, "w", encoding="latin-1", newline="").write(new)
        changed.append(name)
print(len(changed), "changed:", " ".join(changed[:12]), "..." if len(changed) > 12 else "")
open(os.path.join(d, "..", "changed.txt"), "w").write("\n".join(changed) + "\n")
