#!/usr/bin/env python3
"""Takes the dead spell files out of the game (docs/spell-rework.md, part 8).

    python3 spell_cleanup.py <game dir>            list what would go
    python3 spell_cleanup.py <game dir> --apply    move it to backups/spell-cleanup-<time>/

Run after fix_spell_mana.py (telepath's old slot is its business). Nothing
here can be cast: a spell needs a defSpells file naming a group whose list
holds it, and a script "<n> <group>" for its place. Taken out:
  - defSpells files whose spell isn't in its group's list (underscore
    copies, drain, create food/drink) and the empty "groups"
  - group scripts past the end of their group's list (4 black magic group,
    4/5 clerical group, 4 druidic group)
  - the old underscore and test/god groups, with their scripts
Refuses if a player (users/) holds one of those groups. Groups are cached
by the server: restart after.
"""
import os
import re
import shutil
import sys
import time

REAL = ["clerical group", "white magic group", "black magic group", "druidic group",
        "enchantment group", "telepathy group", "alchemy group", "summons group",
        "hells fire", "m group", "Guardian Force Group"]
DEAD = ["clerical_group", "druidic_group", "enchantment_group", "telepathy_group",
        "summon group", "white magics group", "druidic gruop", "druidic_gruop",
        "god group", "test group", "meteo", "bahamut", "death", "special group",
        "shifty group", "teleport_group", "MTH spells"]


def lines(path):
    with open(path, encoding="latin-1") as f:
        return [l.strip() for l in f.read().splitlines() if l.strip()]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    game, apply = sys.argv[1], "--apply" in sys.argv
    spells, groups = os.path.join(game, "defSpells"), os.path.join(game, "defSpellGroups")
    lists = {g: lines(os.path.join(groups, g)) for g in REAL}
    out = []
    for f in sorted(os.listdir(spells)):
        if f.endswith(".dsko"):
            continue
        body = lines(os.path.join(spells, f))
        if not body or body[0] not in lists or f not in lists[body[0]]:
            out.append(os.path.join("defSpells", f))
    for f in sorted(os.listdir(groups)):
        if f.endswith(".dsko"):
            continue
        m = re.match(r"^(\d+)[ _](.*)$", f)
        if m and m.group(2) in lists and int(m.group(1)) >= len(lists[m.group(2)]):
            out.append(os.path.join("defSpellGroups", f))
        elif f in DEAD or (m and m.group(2) in DEAD):
            out.append(os.path.join("defSpellGroups", f))
    # Nobody may hold a group that goes.
    held = []
    users = os.path.join(game, "users")
    for u in os.listdir(users):
        ls = open(os.path.join(users, u), encoding="latin-1").read().splitlines()
        held += [(u, ls[i + 1].strip()) for i in range(len(ls) - 1) if ls[i].strip() == "spell" and ls[i + 1].strip() in DEAD]
    if held:
        raise SystemExit(f"players hold groups that would go: {held}; nothing done")
    for rel in out:
        print("take out", rel)
    print(len(out), "files")
    if not apply or not out:
        return
    backup = os.path.join(game, "backups", "spell-cleanup-" + time.strftime("%Y%m%d-%H%M%S"))
    for rel in out:
        for p in (rel, rel + ".dsko"):
            src = os.path.join(game, p)
            if os.path.exists(src):
                os.makedirs(os.path.dirname(os.path.join(backup, p)), exist_ok=True)
                shutil.move(src, os.path.join(backup, p))
    print("moved to", backup)


if __name__ == "__main__":
    main()
