# The second pass over the walk-on scripts (defMoveActions), after
# fix_move_actions.py: scripts that run off their end without an
# "endscript" (so the server logs an EOFException each time someone steps
# there, and an "if" whose condition fails never finds its way out), plus a
# few with real mistakes. Works on a folder of copies:
#   python3 finish_move_actions.py <folder of copies>
# then compile-check with TestCompile.java before copying them over the
# live ones. Writes the changed names to <folder>/../changed.txt.
import os, re, sys

d = sys.argv[1]

FIXES = {
    # The teleport target had an underscore for a space.
    "822_13": lambda t: t.replace("locXY 767_167", "locXY 767 167"),
    # Misspelt endscript.
    "944_58": lambda t: t.replace("endscipt", "endscript"),
    # A message split over three lines, with endscript on the end of it.
    "300_900": lambda t: 'chat trigger " ....What is this place...? Hmmm... it\'s awfully dark...pretty hot too... maybe I can find my way... Maybe.."\nendscript\n',
    # "w" and "goto" are player commands, not script: the closed shop
    # meant to send you back out to 373 350.
    "374_350": lambda t: 'chat trigger "Wares out of stock. Sorry, try again in a few days."\nset trigger locxy 373 350\nendscript\n',
    # Just a backslash.
    "200_903": lambda t: "endscript\n",
}

# "Who can step here" checks that ended up in this folder instead of
# defCanMoveScripts; moving them would change who can walk where, so
# they're left for a person to decide.
LEAVE = {"28_19", "267_337", "269_337", "303_835", "476_384"}


def last_line(text):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return lines[-1] if lines else ""


changed = []
for name in sorted(os.listdir(d)):
    p = os.path.join(d, name)
    if not os.path.isfile(p) or not re.fullmatch(r"\d+_\d+", name) or name in LEAVE:
        continue  # squares are named x_y (the rest are helpers and strays)
    text = open(p, "rb").read().decode("latin-1")
    if name in FIXES:
        new = FIXES[name](text)
    else:
        last = last_line(text)
        if last.replace(" ", "") in ("endscript", ".") or not last:
            continue  # ends properly ("." follows an endscript)
        new = text.rstrip("\r\n") + "\nendscript\n"
    if new != text:
        open(p, "w", encoding="latin-1", newline="").write(new)
        changed.append(name)
print(len(changed), "changed")
open(os.path.join(d, "..", "changed.txt"), "w").write("\n".join(changed) + "\n")
