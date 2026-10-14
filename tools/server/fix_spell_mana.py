#!/usr/bin/env python3
"""The spell and mana rework (after docs/spell-audit.md), in the game files.

    python3 fix_spell_mana.py <game dir>            show what would change
    python3 fix_spell_mana.py <game dir> --apply    change it
    ... --only telepath,corrupt                     just those parts (costs,
                                                    classes, heals, telepath, corrupt)

The heals must go in with the classes and a restart, never before: until
Script is patched, "skill <group>" reads 0 and healing staff and meditation
would heal less than now, or take HP. telepath needs a restart (groups are
cached); corrupt is safe alone (no .dsko, so the next cast uses it).

Goes with server/SpellPatch.java and Skills.spellCost / scriptSkill /
regen (the classes, built and installed, then a restart): without them the
"mp" lines are ignored and "skill <group>" reads 0 in a heal.

  MP costs     defSpells/<spell> gets an "mp <n>" line after its group (the
               engine reads only the first line). Spells left without one
               keep the old (110 - (group skill - unlock %)) / 2.
  pools        classes: new start max MP, and "mpregen <class> 4" (4% of
               max MP back every 18 s out of battle, on top of 1 + WIS/2)
  heals        mend, healing staff, meditation: x (1 + (group skill -
               the spell's unlock %) / 50), so they grow with training
  telepath     removed: defSpells/telepath and its script go to the backup,
               and tire, the telepathy group's other spell, moves to its
               place ("0 telepathy group"), so it's learnt from the first point
  corrupt      rewritten: in battle only, hits the foe you fight for
               (STR+INT) x 0.8-1.4, heals you half of that, burns as much of
               the foe's MP if it has that much; no MP for the caster and no
               more sending players to 394,394

Everything it changes is copied to backups/spellmana-<time>/ first, and a
script's compiled .dsko beside it is moved there too (the engine runs the
.dsko if there is one). Running it again changes nothing.
"""
import difflib
import os
import shutil
import sys
import time

COSTS = {
    # clerical
    "mend": 5, "counter poison": 0, "armor": 12, "bless": 15,
    # white magic
    "focus": 12, "angel strike": 10, "prayer": 12, "meditation": 30, "scan": 6, "holy": 60,
    # black magic
    "bone shards": 5, "curse": 12, "quake": 18, "corrupt": 35,
    # druidic
    "quarter staff": 4, "healing staff": 6, "thorns": 10, "camoflauge": 20,
    # enchantment
    "detect invis": 6, "invis": 20, "regenerate": 15,
    # telepathy, alchemy
    "tire": 15, "warp": 10, "translate": 0, "herbology": 10,
    # summons
    "summon snakes": 10, "summon bahamut": 20, "summon wurm": 35, "summon leviathan": 45,
    "summon ultima bahamut": 80,
    # hells fire, m group
    "hell fire": 15, "apocalypse": 30, "reflect": 20,
    # Guardian Force (gods only)
    "ifrit": 60, "shiva": 65, "leviathan": 70, "cactuar": 75, "diablos": 80,
}

# classes file: "start <id> ..." maxmp, and mpregen lines after the growth block.
START_MP = {"fighter": ("-10", "8"), "mage": ("10", "30"), "cleric": ("5", "26"),
            "priest": ("5", "26"), "ranger": ("-5", "16"), "paladin": ("-2", "20")}
REGEN = ["# mpregen <id> <percent>: out of battle, every 18 s, this much of max MP comes back on top",
         "# of the server's own 1 + WIS/2 (else 4)"] + [f"mpregen {c} 4" for c in START_MP]

# Heals: (script, the old amount, the new one). The factor is
# 1 + (group skill - unlock %) / 50: x1 when the spell is new, x3 for mend
# at clerical 100.
def grow(amount, group, unlock):
    over = f'caster skill "{group}"' if unlock == 0 else f'- caster skill "{group}" {unlock}'
    return f"* {amount} + 1 / {over} 50"

HEALS = [
    ("0 clerical group", "* caster inte + 0.5 * rand 0.5", grow("* caster inte + 0.5 * rand 0.5", "clerical group", 0)),
    ("1 druidic group", "* caster inte + 0.5 rand", grow("* caster inte + 0.5 rand", "druidic group", 33)),
    ("3 white magic group", "* caster inte + 3.5 * rand 2.5", grow("* caster inte + 3.5 * rand 2.5", "white magic group", 60)),
]

CORRUPT = (
    "#Corrupt: drains the foe you fight: hurts it, heals you by half, and burns its mana.\n"
    "#\n"
    "#\n"
    "if hasCondition caster \"ruins\"\n"
    "\tchat caster \"Your magic 'drain' has been sealed off.\"\n"
    "\tendscript\n"
    "end\n"
    "if not isinbattle caster\n"
    "\tchat caster \"You can only corrupt a foe you are fighting.\"\n"
    "\tendscript\n"
    "end\n"
    "number damage * + 0.8 * rand 0.6 + caster stre caster inte\n"
    "inc enemy caster hp * -1 damage\n"
    "inc caster hp / damage 2\n"
    "inc caster damdone damage\n"
    "if > enemy caster mp damage\n"
    "\tinc enemy caster mp * -1 damage\n"
    "end\n"
    "chat caster concat concat concat concat \"You corrupt \" name enemy caster \" for \" damage \" damage.\"\n"
    "chat enemy caster concat concat concat name caster \" corrupts you for \" damage \" damage.\"\n"
    "#Web client spell effect (dark) for everyone nearby: see js/spells.js\n"
    "playsound + 150000000 + * enemy caster locx 3000 enemy caster locy enemy caster locx enemy caster locy\n"
    "endscript\n")

changes = []  # (path, old text or None, new text or None to take it out)


def read(path):
    with open(path, encoding="latin-1", newline="") as f:
        return f.read()


def plan(path, new):
    old = read(path) if os.path.exists(path) else None
    if old != new:
        changes.append((path, old, new))


def costs(game):
    for spell, mp in COSTS.items():
        p = os.path.join(game, "defSpells", spell)
        if not os.path.exists(p):
            print(f"  (no defSpells/{spell}: skipped)")
            continue
        lines = [l for l in read(p).splitlines() if l.strip()]
        lines = [lines[0]] + [l for l in lines[1:] if not l.lower().startswith("mp ")]
        plan(p, "\n".join(lines[:1] + [f"mp {mp}"] + lines[1:]) + "\n")


def classes(game):
    p = os.path.join(game, "classes")
    out = []
    for line in read(p).split("\n"):
        w = line.split()
        if len(w) > 2 and w[0] == "start" and w[1] in START_MP:
            old, new = START_MP[w[1]]
            line = line.replace(f"maxmp {old},", f"maxmp {new},").replace(f"maxmp {old}\n", f"maxmp {new}\n")
        if line.startswith("mpregen ") or line in REGEN[:2]:
            continue
        out.append(line)
    last = max(i for i, l in enumerate(out) if l.startswith("growth "))
    while last + 1 < len(out) and out[last + 1] == "" and out[last + 2:last + 3] == [""]:
        del out[last + 1]  # the blank line a previous run put before the block
    out = out[:last + 1] + [""] + REGEN + out[last + 1:]
    plan(p, "\n".join(out))


# The Spellbook's description (the script's first line).
MEND_DESC = ("#Mend: Heals someone by caster's intelligence.",
             "#Mend: Heals someone by the caster's intelligence, more with clerical skill.")


def heals(game):
    for name, old, new in HEALS:
        p = os.path.join(game, "defSpellGroups", name)
        text = read(p)
        if new not in text:
            if text.count(old) != 2:
                raise SystemExit(f"{name}: expected the heal amount twice, found {text.count(old)}")
            text = text.replace(old, new)
        if name == "0 clerical group":
            text = text.replace(MEND_DESC[0], MEND_DESC[1])
        plan(p, text)


def telepath(game):
    groups = os.path.join(game, "defSpellGroups")
    lst = os.path.join(groups, "telepathy group")
    names = [l.strip() for l in read(lst).splitlines() if l.strip()]
    if "telepath" not in names:
        return
    if names != ["telepath", "tire"]:
        raise SystemExit(f"telepathy group: expected telepath, tire; found {names}; not touched")
    plan(lst, "tire\n")
    tire = read(os.path.join(groups, "1 telepathy group"))
    if "#Tire" not in tire:
        raise SystemExit("1 telepathy group isn't tire; not touched")
    plan(os.path.join(groups, "0 telepathy group"), tire)
    changes.append((os.path.join(groups, "1 telepathy group"), tire, None))
    p = os.path.join(game, "defSpells", "telepath")
    if os.path.exists(p):
        changes.append((p, read(p), None))


def corrupt(game):
    p = os.path.join(game, "defSpellGroups", "3 black magic group")
    plan(p, CORRUPT)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    game, apply = sys.argv[1], "--apply" in sys.argv
    parts = {"costs": costs, "classes": classes, "heals": heals, "telepath": telepath, "corrupt": corrupt}
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else list(parts)
    for part in only:
        parts[part](game)
    for path, old, new in changes:
        rel = os.path.relpath(path, game)
        if new is None:
            print(f"--- a/{rel}\n(taken out: moved to the backup)")
            continue
        sys.stdout.writelines(difflib.unified_diff((old or "").splitlines(True), new.splitlines(True), "a/" + rel, "b/" + rel))
        if not new.endswith("\n"):
            print()
    print(f"{len(changes)} files to change")
    if not apply or not changes:
        return
    backup = os.path.join(game, "backups", "spellmana-" + time.strftime("%Y%m%d-%H%M%S"))
    for path, old, new in changes:
        rel = os.path.relpath(path, game)
        dest = os.path.join(backup, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if old is not None:
            shutil.copy2(path, dest)
        if os.path.exists(path + ".dsko"):
            shutil.move(path + ".dsko", dest + ".dsko")
        if new is None:
            os.remove(path)
            continue
        with open(path, "w", encoding="latin-1", newline="") as f:
            f.write(new)
    print("changed; the old files are in", backup)


if __name__ == "__main__":
    main()
