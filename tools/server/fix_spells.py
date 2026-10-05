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

Then, as asked after the audit:
  food and drink    keep hunger and thirst away for 45 minutes (2700 s)
  telepath          the copy of each message goes to Flan (if online), not
                    to Shifty02 and Cyril
  herbology         its recipes printed money (a 20 gp mandrake made a
                    potion that sells for 250, a mushroom a blue potion that
                    sells for 3000) and its blue recipe was missing an "end";
                    now it brews "brewed" potions that work like the shop
                    ones but merchants won't buy
  translate,        disabled for now (nothing uses translation, and nothing
  counter poison    poisons anyone)
  untrainable       spells whose group no trainer teaches are taken out
                    (moved to the backup), so nobody has or sees them

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

SPY = "flan"  # who gets a copy of telepathic messages

SPELLS["0 telepathy group"] = (
    "#Telepath: sends a telepathic message to someone.\n#\n#\n"
    "if not variableisstring param0\n"
    "\tchat caster \" You already know your thoughts.\"\n"
    "\tendscript\n"
    "end\n"
    "livingthing target player param0\n"
    "if not variableislivingthing target\n"
    "\tchat caster \" They are not in this world.\"\n"
    "\tendscript\n"
    "end\n"
    "if not variableisstring param1\n"
    "\tchat caster \" What do you wish them to know?\"\n"
    "\tendscript\n"
    "end\n"
    "chat target \"A voice echoes in your head:\"\n"
    "chat target param1\n"
    "chat caster concat name target \" knows your thoughts.\"\n"
    f"livingthing spy player \"{SPY}\"\n"
    "if variableislivingthing spy\n"
    "\tchat spy concat concat concat name caster \" spoke to \" concat name target \" saying: '\" concat param1 \"'.\"\n"
    "end\n"
    "endscript\n")

# Herbology: brewed potions (cost 0, so merchants won't buy them).
BREWED = {
    "brewed anti-curse potion": ("a hand-brewed potion that lifts curses; worth nothing to merchants", 'chat trigger "The curse lifts from you."\nremoveCondition trigger cursed\n'),
    "brewed minor potion": ("a small hand-brewed healing potion; worth nothing to merchants", 'chat trigger "You feel better."\ninc trigger hp 25\n'),
    "brewed red potion": ("a hand-brewed red potion; worth nothing to merchants", 'chat trigger "Your wounds close before your eyes."\ninc trigger hp 300\n'),
    "brewed green potion": ("a hand-brewed green potion that restores mana; worth nothing to merchants", 'chat trigger "Power hums in your fingertips."\ninc trigger mp 300\n'),
    "brewed blue potion": ("a hand-brewed blue potion that restores health and mana; worth nothing to merchants", 'chat trigger "You feel completely restored."\ninc trigger hp 500\ninc trigger mp 500\n'),
}


def brew(needs, makes, words, pad):
    """One recipe: if the caster has every herb, they become the potion."""
    out = ""
    for i, n in enumerate(needs):
        out += pad + "\t" * i + f"if hasitem caster \"{n}\"\n"
    inner = pad + "\t" * len(needs)
    out += f"{inner}chat caster \"{words}\"\n"
    for n in needs:
        out += f"{inner}removeitem caster \"{n}\"\n"
    out += f"{inner}giveitem caster \"{makes}\"\n" + fx("heal", "caster", inner) + f"{inner}endscript\n"
    for i in reversed(range(len(needs))):
        out += pad + "\t" * i + "end\n"
    return out


SPELLS["2 alchemy group"] = (
    "#Herbology: brews herbs into potions (merchants won't buy brewed ones).\n#\n#\n"
    + brew(["brewed red potion", "brewed green potion", "azeala"], "brewed blue potion", "You mix the red and green potions with azeala and make a rare blue potion.", "")
    + brew(["mandrake", "wolfsbane"], "brewed red potion", "You mix a wolfsbane and a mandrake to make a red potion.", "")
    + brew(["lavendar", "wolfsbane"], "brewed green potion", "You mix the lavendar and wolfsbane together and make a green potion.", "")
    + brew(["mandrake"], "brewed anti-curse potion", "You extract juices from a mandrake to make an anti-curse potion.", "")
    + brew(["mushroom", "water"], "brewed minor potion", "You mix the mushroom with some water and make a minor potion.", "")
    + "chat caster \"You don't have the right herbs. Mandrake: an anti-curse potion. Mandrake and wolfsbane: a red potion. Lavendar and wolfsbane: a green potion. Brewed red and green potions with azeala: a blue potion. A mushroom and water: a minor potion.\"\n"
    "endscript\n")

DISABLED = {
    "1 alchemy group": "Translate",
    "1 clerical group": "Counter Poison",
}
for _f, _name in DISABLED.items():
    SPELLS[_f] = f"#{_name}: (disabled for now)\nchat caster \"{_name} has been disabled for now.\"\nendscript\n"

# Food and drink: 45 minutes.
FOOD = {"apple": "nohunger", "sandwich": "nohunger", "water": "nothirst", "ale": "nothirst", "crisps.use": "nohunger", "packed lunch.use": "nohunger"}
FOOD_SECONDS = 2700

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
    # Brewed potions: their items and use scripts.
    for item, (desc, effect) in BREWED.items():
        write(os.path.join("defItems", item), f"type\nitem\ndescription\n{desc}\ncost\n0\nimage\n6\nonuse\n{item}.use\nuses\n1\n.\n")
        write(os.path.join("scripts", item + ".use"), effect + f'removeitem trigger "{item}"\nendscript\n')
    # Food and drink: how long they keep hunger and thirst away.
    import re
    for name, cond in FOOD.items():
        path = os.path.join("scripts", name)
        text = read(path)
        if text is None:
            continue
        new = re.sub(r"(addconditionwithduration trigger %s )\d+" % cond, lambda m: m.group(1) + str(FOOD_SECONDS), text)
        new = re.sub(r'("(?:food|drink)":)\d+', lambda m: m.group(1) + str(FOOD_SECONDS), new)
        write(path, new)
    # Spells whose group no trainer teaches: out (to the backup).
    taught = set()
    for line in (read("merchants") or "").split("\n"):
        if line.lower().startswith("train:"):
            taught.add(line[6:].strip().lower())
    for name in sorted(os.listdir("defSpells")):
        path = os.path.join("defSpells", name)
        if name.endswith(".dsko") or not os.path.isfile(path):
            continue
        group = ((read(path) or "").split("\n") + [""])[0].strip().lower()
        if group and group not in taught:
            changed.append(path + " (removed: " + group + ")")
            if not dry:
                dest = os.path.join(backup, path)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.move(path, dest)
    print(("Would change" if dry else "Changed") + " %d files" % len(changed) + ("" if dry or not changed else " (backups in %s)" % backup))
    for c in changed:
        print("  " + c)


if __name__ == "__main__":
    main()
