#!/usr/bin/env python3
"""The old god and test items (left plain by fix_items.py) as god tools:
each one works for gods only (privs 3 and up, like the god commands) and
tells anyone else so. Their 2002 scripts, cleaned up:

  moo            heals HP and MP to full; kept, use it again and again
  chaos orb      the Chaos armour set and sword (the orb is used up)
  shifty box     the Shifty armour set and sword (the box is used up)
  exp            5,000 experience
  coolaexp       100,000 experience
  godexp         300,400 experience and 52,000 gold
  cyrils elixer  10,000 MP, filled
  smek p         +999,999 max HP (for testing; it stays)

Left plain: alpha (one god's old stats, lowering wisdom to 7), and beta,
dmwexp, fixup, lightning bolt and book of ramaden (no script, or one
nobody can read since translate is off).

Each item file is rewritten: cost 0 (so it can't be sold), uses -1 (a
non-god trying it doesn't use it up), "onuse godtool_<name>". Scripts go
in scripts/godtool_<name>.

    python3 god_items.py [game dir]           dry run
    python3 god_items.py [game dir] --apply   writes (old files in backups/god-items-*)

Item files are read at startup: restart after applying.
"""
import os
import shutil
import sys
import time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
game = args[0] if args else os.path.expanduser("~/DuskRPG")
apply = "--apply" in sys.argv

GUARD = 'if < trigger privs 3\n\tchat trigger "Only gods can use this."\n\tendscript\nend\n'


def kit(item, gear):
    return "".join('giveitem trigger "%s"\n' % g for g in gear) + 'removeitem trigger "%s"\nchat trigger "The %s opens: a full set is in your pack."\n' % (item, item)


ITEMS = {
    "moo": ("a god's tonic: heals HP and MP to full, and stays for next time",
            'set trigger hp trigger maxhp\nset trigger mp trigger maxmp\nchat trigger "You are healed to full."\n'),
    "chaos orb": ("a god's chaos orb: opens into the Chaos armour set and sword",
                  kit("chaos orb", ["Chaos Helmet", "Chaos Chest Plate", "Chaos Gloves", "Chaos Sleeves", "Chaos Leggings",
                                    "Chaotic Lens", "Chaotic Amulet", "Chaos Belt", "Chaos Sword"])),
    "shifty box": ("a god's shifty box: opens into the Shifty armour set and sword",
                   kit("shifty box", ["Shifty Helmet", "Shifty Suit", "Shifty Gloves", "Shifty Shield", "Shifty Leggings",
                                      "Shifty Glasses", "Shifty Necklace", "Shifty Belt", "Shifty Sword"])),
    "exp": ("a god's tonic: 5,000 experience",
            'inc trigger exp 5000\nremoveitem trigger exp\nchat trigger "You gain 5000 experience."\n'),
    "coolaexp": ("a god's tonic: 100,000 experience",
                 'inc trigger exp 100000\nremoveitem trigger coolaexp\nchat trigger "You gain 100000 experience."\n'),
    "godexp": ("a god's purse: 300,400 experience and 52,000 gold",
               'inc trigger exp 300400\ninc trigger cash 52000\nremoveitem trigger godexp\nchat trigger "You gain 300400 experience and 52000 gold."\n'),
    "cyrils elixer": ("a god's elixir: 10,000 MP",
                      'set trigger maxmp 10000\nset trigger mp trigger maxmp\nremoveitem trigger "cyrils elixer"\nchat trigger "Your mind swells: 10000 MP."\n'),
    "smek p": ("a god's draught: +999,999 max HP, for testing (it stays)",
               'inc trigger maxhp 999999\nremoveitem trigger "smek p"\nchat trigger "You feel enormous: +999999 max HP."\n'),
}


def read(path):
    with open(path, encoding="latin-1") as f:
        return f.read()


def item_file(path, description, script):
    # Keep the picture; everything else as above.
    lines = read(path).split("\n")
    image = "6"
    for i, l in enumerate(lines[:-1]):
        if l.strip() == "image":
            image = lines[i + 1].strip()
    return "type\nitem\ndescription\n%s\ncost\n0\nimage\n%s\nuses\n-1\nonuse\n%s\n.\n" % (description, image, script)


writes = []
for name, (description, body) in ITEMS.items():
    path = os.path.join(game, "defItems", name)
    if not os.path.isfile(path):
        print("missing item:", name)
        continue
    script = "godtool_" + name.replace(" ", "_")
    writes.append((path, item_file(path, description, script)))
    writes.append((os.path.join(game, "scripts", script), GUARD + body + "endscript\n"))

changed = [(p, t) for p, t in writes if not os.path.isfile(p) or read(p) != t]
for p, t in changed:
    print(("writing " if apply else "would write ") + os.path.relpath(p, game))
if not changed:
    print("nothing to do")
if apply and changed:
    backup = os.path.join(game, "backups", "god-items-" + time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(backup)
    for p, t in changed:
        if os.path.isfile(p):
            shutil.copy2(p, os.path.join(backup, os.path.basename(os.path.dirname(p)) + "_" + os.path.basename(p)))
        stale = p + ".dsko"
        if os.path.exists(stale):
            os.remove(stale)
        with open(p, "w", encoding="latin-1") as f:
            f.write(t)
    print("done; old files in", os.path.relpath(backup, game), "- restart the server")
