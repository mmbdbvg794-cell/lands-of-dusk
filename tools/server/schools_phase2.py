#!/usr/bin/env python3
"""Schools, phase 2: who may learn which school, in the classes file.

    python3 schools_phase2.py <game dir> [--apply]

Goes with server/Classes.java (school, tier5, refuse, hidden) and
SpellPatch "engine" (trainers' lists). Run after schools_phase1.py.

  hidden mage      nobody starts as a Mage; existing Mages load as before
                   (and join the Mage Guild at login)
  school lines     arcane: Fighter/Ranger (and old Mages) in the Mage Guild;
                   forbidden: those, with forbidden_lore, archmage_quest and
                   75 arcane points (Archmage); divine: Cleric, Paladin up to
                   49 (tiers 1-3); drow: Priest/Priestess; nature: Ranger in
                   The Circle; open: everyone. No school is cross-class.
  tier5            arcane past 74 needs archmage_quest, nature archdruid_quest
  core/barred      the schools come out of these lists (the school lines rule)
  start            Rangers start with no school (The Circle must take them),
                   Priests with none until the Drow school exists (phase 4)
  the Guild door   defMoveActions/984_975 (the Mage Guild hall) lets in Mages
                   and anyone with guild_mage (server/content's copy)

The old files are copied to backups/schools-p2-<time>/ first. Running
it again changes nothing.
"""
import os
import shutil
import sys
import time

SCHOOLS = ["arcane group", "divine group", "nature group", "forbidden group", "open group", "drow group"]
MAGE = "+guild_mage"
ARCHMAGE = "+guild_mage+forbidden_lore+archmage_quest+arcane group>=75"
BLOCK = [
    "# school <group>: <class>[:<most points>][+<flag>][+<group> >= <points>], ...",
    "# Who may learn a spell school; anyone it doesn't name can't, and trainers don't show",
    "# it to them. \"all\" is every class. Flags are hidden conditions (guild_mage, ...).",
    f"school arcane group: fighter{MAGE}, ranger{MAGE}, mage{MAGE}",
    f"school forbidden group: fighter{ARCHMAGE}, ranger{ARCHMAGE}, mage{ARCHMAGE}",
    "school divine group: cleric, paladin:49",
    "school drow group: priest",
    "school nature group: ranger+guild_circle",
    "school open group: all",
    "# tier5 <group>: <flag>: points past 74 need that flag too (the tier 5 quest).",
    "tier5 arcane group: archmage_quest",
    "tier5 nature group: archdruid_quest",
    "# refuse <group>: <text>: what a trainer says to someone the school is closed to.",
    "refuse arcane group: The Mage Guild teaches its arts only to its own members.",
    "refuse forbidden group: That is not taught here.",
    "refuse divine group: The Temple teaches its prayers only to Clerics and Paladins.",
    "refuse drow group: Only the priesthood of the Spider Queen learns these rites.",
    "refuse nature group: Only those The Circle has taken in may learn its ways.",
    "# hidden <class>: nobody can choose it any more; those who have it keep it.",
    "hidden mage",
    "# guild <group>: <guild> | <rank at tier 1> | ... | <tier 5>. Members are those the school",
    "# is open to; the rank is the highest tier their points reach (0/10/25/50/75; tier 5 also",
    "# needs the tier5 flag). Titles are placeholders.",
    "guild arcane group: Mage Guild | Initiate | Apprentice | Adept | Master | Archmage",
    "guild nature group: The Circle | Seedling | Sapling | Warden | Elder | Archdruid",
    "guild divine group: The Temple | Acolyte | Deacon | Priest | High Priest | Hierophant",
    "guild drow group: Drow Priesthood | Novice | Handmaiden | Shadow Weaver | Matron's Hand | High Priestess",
    "guild forbidden group: Hidden Order | Seeker | Whisperer | Initiate of the Veil | Keeper | Dark Mage",
]


DOOR = "defMoveActions/984_975"
# The same as server/content/defMoveActions/984_975.
DOOR_TEXT = "#The Mage Guild's door: only Mages and those the Guild has invited (guild_mage) may go in (server/Classes.java).\nif > trigger privs 2\nendscript\nend\nif ! isPlayer trigger\nendscript\nend\nif hasCondition trigger \"class_mage\"\nendscript\nend\nif hasCondition trigger \"guild_mage\"\nendscript\nend\nchat trigger \"Only mages and those the Mage Guild has invited may enter.\"\ninc trigger locy 1\nendscript\n"


def door(game, apply, backup):
    """The hall door: Mages and invited members (guild_mage)."""
    new = DOOR_TEXT
    path = os.path.join(game, DOOR)
    old = open(path, encoding="latin-1").read()
    if old == new:
        return False
    print(f"edit  {DOOR} (lets in guild_mage too)")
    if apply:
        os.makedirs(os.path.join(backup, "defMoveActions"), exist_ok=True)
        shutil.copy2(path, os.path.join(backup, DOOR))
        if os.path.exists(path + ".dsko"):
            shutil.move(path + ".dsko", os.path.join(backup, DOOR + ".dsko"))
        with open(path, "w", encoding="latin-1") as f:
            f.write(new)
    return True


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    game, apply = sys.argv[1], "--apply" in sys.argv
    path = os.path.join(game, "classes")
    old = open(path, encoding="utf-8").read()
    out = []
    for line in old.split("\n"):
        if line in BLOCK or line.startswith(("school ", "tier5 ", "refuse ", "hidden ", "guild ")):
            continue
        w = line.split(" ", 2)
        if w[0] in ("core", "barred", "open") and len(w) > 1:
            head, rest = (w[0], line[5:]) if w[0] == "open" else (w[0] + " " + w[1], w[2] if len(w) > 2 else "")
            items = [x.strip() for x in rest.split(",") if x.strip() and x.strip().lower() not in SCHOOLS]
            line = f"{head} {', '.join(items)}"
        elif w[0] == "start" and len(w) > 2 and w[1] in ("ranger", "priest"):
            parts = [p.strip() for p in w[2].split(",") if not any(p.strip().startswith(g + " ") for g in SCHOOLS)]
            line = f"start {w[1]} {', '.join(parts)}"
        out.append(line)
    while out and out[-1] == "":
        out.pop()
    new = "\n".join(out) + "\n\n" + "\n".join(BLOCK) + "\n"
    backup = os.path.join(game, "backups", "schools-p2-" + time.strftime("%Y%m%d-%H%M%S"))
    door_changed = door(game, apply, backup)
    if new == old:
        print("classes: no change" if door_changed else "0 changes")
        return
    import difflib
    sys.stdout.writelines(difflib.unified_diff(old.splitlines(True), new.splitlines(True), "a/classes", "b/classes"))
    if not apply:
        return
    os.makedirs(backup, exist_ok=True)
    shutil.copy2(path, backup)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new)
    print("done; old classes file in", backup)


if __name__ == "__main__":
    main()
