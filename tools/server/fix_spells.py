#!/usr/bin/env python3
"""Fixes the spells players can learn that didn't work, from the spell audit.

    python3 fix_spells.py <game dir> [--dry-run]

Goes with server/Conditions.java (conditions now wear off and tick): until
that is installed, timed effects still never end.

Spells (defSpellGroups/<n> <group>):
  bone shards       its block was pasted five times inside itself, so it hit
                    up to five times; now once, a little harder
  summon snakes     the same, and with no emerald it did nothing at all
  curse             the "cursed" condition did nothing; now -2 STR and DEX
                    while it lasts, and it lasts INT x 3 seconds, not INT / 5
  armor, bless      last INT x 6 seconds; casting again no longer stacks
  bless             its start and end scripts were binary junk (pieces of a
                    Mac app and a font); now +2 STR and +10 damage
  focus             the "focus" condition did nothing; now +2 INT and WIS
  regenerate        cast on someone else, it regenerated the caster; and its
                    healing never ran ("ontick" isn't a condition key); now
                    3 HP every 5 seconds for INT x 3 seconds
  tire              its script was broken (a missing "end" and a typo)
  prayer            took away "safe" (after dying) and invisibility, which
                    aren't bad effects; now curses, tiredness, poison,
                    hunger and thirst
  scan              cast at nobody, it failed; now it asks whom
  warp              sent you into solid rock at 1,1; now it takes you back
                    to where you return after dying (or the town at 17,10)

Everything it changes is copied to backups/spells-<time>/ first; running it
again changes nothing. No restart needed for the scripts themselves.
"""
import os
import shutil
import sys
import time

FX = {"heal": 110, "holy": 120, "earth": 140, "dark": 150, "arcane": 160}


def fx(kind, who, pad=""):
    """The web client's spell effect line (see js/spells.js)."""
    return (f"{pad}#Web client spell effect ({kind}) for everyone nearby: see js/spells.js\n"
            f"{pad}playsound + {FX[kind]}000000 + * {who} locx 3000 {who} locy {who} locx {who} locy\n")


def buff(spell, cond, minutes_expr, kind, you, other_you, other_them, about):
    """A spell that puts a timed condition on its target (or the caster);
    casting it again replaces it rather than stacking."""
    return (f"#{spell}: {about}\n#\n#\n"
            "if variableisstring param0 #If a target is specified\n"
            "\tlivingthing target local caster param0\n"
            "\tif variableislivingthing target\n"
            f"\t\tchat caster concat concat \"{other_you}\" name target \".\"\n"
            f"\t\tchat target concat name caster \"{other_them}\"\n"
            f"\t\tremovecondition target \"{cond}\"\n"
            f"\t\taddconditionwithduration target \"{cond}\" {minutes_expr}\n"
            + fx(kind, "target", "\t\t") +
            "\t\tendscript\n"
            "\tend\n"
            "\tchat caster \"You do not see them here.\"\n"
            "\tendscript\n"
            "end\n"
            "#Else no target is specified\n"
            f"chat caster \"{you}\"\n"
            f"removecondition caster \"{cond}\"\n"
            f"addconditionwithduration caster \"{cond}\" {minutes_expr}\n"
            + fx(kind, "caster") +
            "endscript\n")


def strike(about, low, spread, kind, you, them, emerald=None):
    """A damage spell in a fight: (low + rand * spread) x (STR + INT)."""
    def block(lo, sp, line_you, pad):
        return (f"{pad}number damage * + {lo} * rand {sp} + caster stre caster inte\n"
                f"{pad}inc enemy caster hp * -1 damage\n"
                f"{pad}inc caster damdone damage\n"
                f"{pad}chat caster concat concat concat concat \"{line_you}\" name enemy caster \" and do \" damage \" damage.\"\n"
                f"{pad}chat enemy caster concat concat \"{them}\" damage \" damage.\"\n"
                + fx(kind, "enemy caster", pad) +
                f"{pad}endscript\n")
    out = f"#{about}\n#\n#\nif isinbattle caster\n"
    if emerald:
        item, lo, sp, line = emerald
        out += f"\tif hasitem caster \"{item}\"\n" + block(lo, sp, line, "\t\t") + "\tend\n"
    out += block(low, spread, you, "\t") + "end\nchat caster \"You must be in battle to use this spell.\"\nendscript\n"
    return out


SPELLS = {
    "0 black magic group": strike("Bone Shards: bones of the dead burst into shards at your foe.", .3, .3, "earth",
                                  " Bones of the dead rise from the ground and explode into deadly sharp shards at ", " Bone shards fly at you doing "),
    "0 summons group": strike("Summon Snakes: snakes rise from the ground to attack your foe (an emerald makes them fiercer).", .3, .4, "arcane",
                              " Snakes rise from the ground and attack ", " Snakes rise from the ground and attack you doing ",
                              emerald=("emerald", .5, .6, " The Emerald you have increases the snakes attack. The snakes attack ")),
    "1 black magic group": (
        "#Curse: weakens someone (less strength and dexterity) for a while.\n#\n#\n"
        "if variableisstring param0 #If a target is specified\n"
        "\tlivingthing target local caster param0\n"
        "\tif variableislivingthing target\n"
        "\t\tif hascondition target \"reflect\"\n"
        "\t\t\tchat caster concat name target \"  has reflect.\"\n"
        "\t\t\tchat caster \" You become cursed.\"\n"
        "\t\t\tremovecondition caster \"cursed\"\n"
        "\t\t\taddconditionwithduration caster \"cursed\" * caster inte 3\n"
        + fx("dark", "caster", "\t\t\t") +
        "\t\t\tendscript\n"
        "\t\tend\n"
        "\t\tchat caster concat name target \"  is now cursed.\"\n"
        "\t\tchat target \" You become cursed.\"\n"
        "\t\tremovecondition target \"cursed\"\n"
        "\t\taddconditionwithduration target \"cursed\" * caster inte 3\n"
        + fx("dark", "target", "\t\t") +
        "\t\tendscript\n"
        "\tend\n"
        "\tchat caster \"You do not see them here.\"\n"
        "\tendscript\n"
        "end\n"
        "chat caster \"Whom do you want to curse? Cast it at someone.\"\n"
        "endscript\n"),
    "2 clerical group": buff("Armor", "armor", "* caster inte 6", "holy", "You surround yourself in a magical shield",
                             "You create a magic shield to surround ", "'s magical shield surrounds you.",
                             "Increases a target's armor class for a while"),
    "3 clerical group": buff("Bless", "bless", "* caster inte 6", "holy", "You call upon the dieties to bless you.",
                             "You call upon the dieties to bless ", " calls upon the gods to bless you.",
                             "Increases a target's strength and damage for a while"),
    "0 white magic group": buff("Focus", "focus", "* caster inte 6", "holy", "You focus your energy",
                                "You make ", " makes you focus your energy.",
                                "Sharpens a target's mind (intelligence and wisdom) for a while"),
    "2 enchantment group": buff("Regenerate", "hpregen", "* caster inte 3", "heal", "You begin to regenerate your health.",
                                "You start regenerating the health of ", " makes your health begin to regenerate.",
                                "Heals a target a little every few seconds for a while"),
    "1 telepathy group": (
        "#Tire: makes a foe drowsy, so that they may fall asleep, for a while.\n#\n#\n"
        "if variableisstring param0 #If a target is specified\n"
        "\tlivingthing target local caster param0\n"
        "\tif variableislivingthing target\n"
        "\t\tchat caster concat name target \"   is enchanted and feels the urge to sleep.\"\n"
        "\t\tchat target \" You become tired.\"\n"
        "\t\tremovecondition target \"tired\"\n"
        "\t\taddconditionwithduration target \"tired\" * caster inte 2\n"
        + fx("arcane", "target", "\t\t") +
        "\t\tendscript\n"
        "\tend\n"
        "\tchat caster \"That person is not here.\"\n"
        "\tendscript\n"
        "end\n"
        "chat caster \"If you wish to sleep you may do so on your own will.\"\n"
        "endscript\n"),
    "2 white magic group": (
        "#Prayer: lifts curses, tiredness, poison, hunger and thirst.\n"
        + fx("heal", "caster") +
        "removecondition caster cursed\n"
        "removecondition caster tired\n"
        "removecondition caster poison\n"
        "removecondition caster thirst\n"
        "removecondition caster hunger\n"
        "chat caster \" You give prayer to the gods to remove all bad effects on your body\"\n"
        "endscript\n"),
    "0 alchemy group": (
        "#Warp: takes you back to where you return after dying.\n"
        "chat caster \"You recall a place you know well... and as you open your eyes you find yourself there.\"\n"
        "if and < caster bindlocx 5 < caster bindlocy 5\n"
        "\tset caster locxy 17 10\n"
        + fx("arcane", "caster", "\t") +
        "\tendscript\n"
        "end\n"
        "set caster locxy caster bindlocx caster bindlocy\n"
        + fx("arcane", "caster") +
        "endscript\n"),
}

# Scan: only a guard in front (its own text stays as it is).
SCAN = "4 white magic group"
SCAN_GUARD = ("#Scan: shows someone's stats.\n"
              "if ! variableisstring param0\n"
              "\tchat caster \"Scan whom? Cast it at someone.\"\n"
              "\tendscript\n"
              "end\n")

CONDITIONS = {
    "cursed": "onstart\ncursestart\nonend\ncurseend\n.\n",
    "bless": "onstart\nblessstart\nonend\nblessend\n.\n",
    "focus": "onstart\nfocusstart\nonend\nfocusend\n.\n",
    "hpregen": "occurance\n5\nonoccurance\nhpregentick\nonend\nhpregenend\n.\n",
}
SCRIPTS = {
    "cursestart": "inc trigger strengthbonus -2\ninc trigger dexteritybonus -2\nendscript\n",
    "curseend": "inc trigger strengthbonus 2\ninc trigger dexteritybonus 2\nchat trigger \"The curse lifts.\"\nendscript\n",
    "blessstart": "inc trigger strengthbonus 2\ninc trigger dammodbonus 10\nendscript\n",
    "blessend": "inc trigger strengthbonus -2\ninc trigger dammodbonus -10\nchat trigger \"The blessing fades.\"\nendscript\n",
    "focusstart": "inc trigger intelligencebonus 2\ninc trigger wisdombonus 2\nendscript\n",
    "focusend": "inc trigger intelligencebonus -2\ninc trigger wisdombonus -2\nchat trigger \"Your focus fades.\"\nendscript\n",
    "hpregenend": "chat trigger \"Your regeneration fades.\"\nendscript\n",
}


def read(path):
    try:
        with open(path, "rb") as f:
            return f.read().decode("latin-1")
    except FileNotFoundError:
        return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)
    os.chdir(args[0])
    backup = "backups/spells-" + time.strftime("%Y%m%d-%H%M%S")
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
        if os.path.exists(path + ".dsko"):
            os.remove(path + ".dsko")

    for name, text in SPELLS.items():
        write(os.path.join("defSpellGroups", name), text)
    scan = read(os.path.join("defSpellGroups", SCAN))
    if scan is not None and not scan.startswith(SCAN_GUARD):
        write(os.path.join("defSpellGroups", SCAN), SCAN_GUARD + scan)
    for name, text in CONDITIONS.items():
        write(os.path.join("defConditions", name), text)
    for name, text in SCRIPTS.items():
        write(os.path.join("scripts", name), text)
    print(("Would change" if dry else "Changed") + " %d files" % len(changed) + ("" if dry or not changed else " (backups in %s)" % backup))
    for c in changed:
        print("  " + c)


if __name__ == "__main__":
    main()
