#!/usr/bin/env python3
"""Schools, phase 4: the new spells, the Drow school, and the spell fixes.

    python3 schools_phase4.py <game dir> [--apply]

Run after schools_phase1.py and schools_phase2.py. Every new script copies
an existing spell's shape (bone shards for damage, mend for heals, armor
for a buff, curse/tire for a curse on someone, regenerate for a heal over
time) and keeps to its tier's numbers.

  new spells    arcane: arc bolt, knit flesh, ward, lightning
                divine: smite, lay on hands, restoration
                nature: barkskin, entangle, call wolf, call bear,
                        spirit of the grove (on the caster only)
                drow (a new school): glimmerfire, gloom mend, shadow cloak
                        (only in the Underdark), venom touch, web, life
                        drain, summon spider, dark tide
  conditions    ward, barkskin, glimmerfire, venom, webbed, entangled,
                grovespirit (defConditions + scripts/<name>start|end|tick)
  fixes         cure poison works (poison and venom); prayer also lifts
                venom; holy without the "taco" check (and it now says so
                out of battle); summon wurm / leviathan written out one
                statement a line; thorns and curse fizzle against reflect
                instead of hitting the caster; reflect says so (its line
                named "trigger", which a spell hasn't); the god-only
                "leviathan" is renamed "great leviathan"
  cooldowns     spellcooldowns lines for the new spells
  classes       new Priests and Priestesses start with drow group 1

Not built (reported instead): haste, turn undead, shadow step, spider swarm.
Everything it changes is copied to backups/schools-p4-<time>/ first.
Running it again changes nothing.
"""
import os
import shutil
import sys
import time

TIER = {1: 0, 2: 10, 3: 25, 4: 50, 5: 75}
FX = {"heal": 110, "holy": 120, "earth": 140, "dark": 150, "arcane": 160}
SI = "+ caster stre caster inte"


def fx(kind, who, pad="\t"):
    return (f"{pad}#Web client spell effect ({kind}) for everyone nearby: see js/spells.js\n"
            f"{pad}playsound + {FX[kind]}000000 + * {who} locx 3000 {who} locy {who} locx {who} locy\n")


def battle(title, desc, dmg, kind, says, hears, extra=""):
    """A battle spell at the foe you fight (bone shards' shape)."""
    return (f"#{title}: {desc}\n#\n#\n"
            "if ! isinbattle caster\n"
            "\tchat caster \"You must be in battle to use this spell.\"\n"
            "\tendscript\n"
            "end\n"
            f"number damage {dmg}\n"
            "inc enemy caster hp * -1 damage\n"
            "inc caster damdone damage\n"
            f"{extra}"
            f"chat caster concat concat concat concat \"{says[0]}\" name enemy caster \"{says[1]}\" damage \" damage.\"\n"
            f"chat enemy caster concat concat \"{hears}\" damage \" damage.\"\n"
            + fx(kind, "enemy caster", "") +
            "endscript\n")


def heal(title, desc, amount, self_says, to_target, target_feels, target=True, self_ok=True, extra=""):
    """A heal on the caster or someone named (mend's shape)."""
    out = f"#{title}: {desc}\n#\n#\n"
    if target:
        out += ("if variableisstring param0\n"
                "\tlivingthing target local caster param0\n"
                "\tif variableislivingthing target\n"
                f"\t\tchat caster concat concat \"{to_target}\" name target \".\"\n"
                f"\t\tchat target \"{target_feels}\"\n"
                f"\t\tinc target hp {amount}\n"
                + "".join(f"\t\t{l.replace('WHO', 'target')}\n" for l in extra.splitlines() if l)
                + fx("heal", "target", "\t\t") +
                "\t\tendscript\n"
                "\tend\n"
                "\tchat caster \"You do not see them here.\"\n"
                "\tendscript\n"
                "end\n")
    if not self_ok:
        return out + f"chat caster \"Whom do you want to heal? Cast it at someone.\"\nendscript\n"
    return (out + f"chat caster \"{self_says}\"\n"
            f"inc caster hp {amount}\n"
            + "".join(f"{l.replace('WHO', 'caster')}\n" for l in extra.splitlines() if l)
            + fx("heal", "caster", "") + "endscript\n")


def buff(title, desc, cond, duration, self_says, to_target, target_feels, kind="holy"):
    """A lasting effect on the caster or someone named (armor's shape)."""
    return (f"#{title}: {desc}\n#\n#\n"
            "if variableisstring param0\n"
            "\tlivingthing target local caster param0\n"
            "\tif variableislivingthing target\n"
            f"\t\tchat caster concat concat \"{to_target}\" name target \".\"\n"
            f"\t\tchat target \"{target_feels}\"\n"
            f"\t\tremovecondition target \"{cond}\"\n"
            f"\t\taddconditionwithduration target \"{cond}\" {duration}\n"
            + fx(kind, "target", "\t\t") +
            "\t\tendscript\n"
            "\tend\n"
            "\tchat caster \"You do not see them here.\"\n"
            "\tendscript\n"
            "end\n"
            f"chat caster \"{self_says}\"\n"
            f"removecondition caster \"{cond}\"\n"
            f"addconditionwithduration caster \"{cond}\" {duration}\n"
            + fx(kind, "caster", "") + "endscript\n")


def hex_(title, desc, cond, duration, lands, feels, ask, kind="dark"):
    """A lasting effect on someone named, which reflect turns aside (curse's shape)."""
    return (f"#{title}: {desc}\n#\n#\n"
            "if variableisstring param0\n"
            "\tlivingthing target local caster param0\n"
            "\tif variableislivingthing target\n"
            "\t\tif hascondition target \"reflect\"\n"
            "\t\t\tchat caster concat name target \"'s reflection turns the spell aside.\"\n"
            "\t\t\tendscript\n"
            "\t\tend\n"
            f"\t\tchat caster concat name target \"{lands}\"\n"
            f"\t\tchat target \"{feels}\"\n"
            f"\t\tremovecondition target \"{cond}\"\n"
            f"\t\taddconditionwithduration target \"{cond}\" {duration}\n"
            + fx(kind, "target", "\t\t") +
            "\t\tendscript\n"
            "\tend\n"
            "\tchat caster \"You do not see them here.\"\n"
            "\tendscript\n"
            "end\n"
            f"chat caster \"{ask}\"\n"
            "endscript\n")


def grows(amount, group, unlock):
    """x (1 + (group points - unlock) / 50), as the stabilize step's heals."""
    over = f'caster skill "{group}"' if unlock == 0 else f'- caster skill "{group}" {unlock}'
    return f"* {amount} + 1 / {over} 50"


DROW_DARK = "or or < caster locx 1260 > caster locx 1429 or < caster locy 850 > caster locy 989"

# school -> [(spell, tier, mp, script)]
NEW = {
    "arcane group": [
        ("arc bolt", 1, 5, battle("Arc Bolt", "a bolt of raw arcane force at your foe; steady, and stronger with intelligence.",
                                  "* caster inte + 0.6 * rand 0.3", "arcane", ("A bolt of arcane force strikes ", " for "), "An arcane bolt strikes you for ")),
        ("knit flesh", 2, 10, heal("Knit Flesh", "the Mage Guild's small heal, on yourself only.", "* caster inte + 0.5 * rand 0.5",
                                   "Arcane threads knit your wounds closed.", "", "", target=False)),
        ("ward", 2, 12, buff("Ward", "an arcane ward: armour class +8 for a while.", "ward", "* caster inte 6",
                             "An arcane ward shimmers around you.", "You raise an arcane ward around ", "An arcane ward shimmers around you.", "arcane")),
        ("lightning", 3, 26, battle("Lightning", "a bolt of lightning at your foe.", f"* + 1.0 * rand 1.0 {SI}", "arcane",
                                    ("Lightning cracks down on ", " for "), "Lightning strikes you for ")),
    ],
    "divine group": [
        ("smite", 2, 9, battle("Smite", "holy force strikes your foe.", f"* + 0.6 * rand 0.4 {SI}", "holy",
                               ("You smite ", " for "), "Holy force smites you for ")),
        ("lay on hands", 3, 28, heal("Lay on Hands", "a large heal laid on someone else; more with divine skill.",
                                     grows("* caster inte + 4 * rand 3", "divine group", 25), "", "You lay your hands on ",
                                     "Warm light pours into your wounds.", self_ok=False)),
        ("restoration", 4, 38, heal("Restoration", "a great heal that also lifts curses and tiredness; more with divine skill.",
                                    grows("* caster inte + 5 * rand 3", "divine group", 50), "Light restores you, body and mind.",
                                    "You restore ", "Light restores you, body and mind.",
                                    extra="removecondition WHO cursed\nremovecondition WHO tired")),
    ],
    "nature group": [
        ("barkskin", 2, 10, buff("Barkskin", "skin as hard as bark: armour class +8 for a while.", "barkskin", "* caster inte 6",
                                 "Your skin hardens like bark.", "You harden the skin of ", "Your skin hardens like bark.", "earth")),
        ("entangle", 2, 9, hex_("Entangle", "roots hold someone fast for a few seconds.", "entangled", "6",
                                " is held fast by roots.", "Roots burst from the ground and hold you fast.",
                                "Whom do you want to entangle? Cast it at someone.", "earth")),
        ("call wolf", 3, 26, battle("Call Wolf", "a wolf answers your call and attacks your foe.", f"* + 1.2 * rand 1.2 {SI}", "earth",
                                    ("A wolf answers your call and savages ", " for "), "A wolf savages you for ")),
        ("call bear", 4, 48, battle("Call Bear", "a great bear answers your call and attacks your foe.", f"* + 1.8 * rand 1.6 {SI}", "earth",
                                    ("A great bear answers your call and mauls ", " for "), "A great bear mauls you for ")),
        ("spirit of the grove", 5, 70, (
            "#Spirit of the Grove: the grove's spirit heals you a little every few seconds for a long while.\n#\n#\n"
            "chat caster \"The spirit of the grove settles over you.\"\n"
            "removecondition caster \"grovespirit\"\n"
            "addconditionwithduration caster \"grovespirit\" * caster inte 6\n"
            + fx("heal", "caster", "") + "endscript\n")),
    ],
    "drow group": [
        ("glimmerfire", 1, 5, hex_("Glimmerfire", "outlines someone in pale fire: armour class -3 for a while.", "glimmerfire", "* caster inte 3",
                                   " is outlined in pale fire.", "Pale fire outlines you.",
                                   "Whom do you want to outline? Cast it at someone.", "dark")),
        ("gloom mend", 1, 5, heal("Gloom Mend", "the Spider Queen's mend: heals someone by the caster's intelligence, more with drow skill.",
                                  grows("* caster inte + 0.5 * rand 0.5", "drow group", 0), "Shadows knit your wounds.",
                                  "You knit the wounds of ", "Shadows knit your wounds.")),
        ("shadow cloak", 2, 10, (
            "#Shadow Cloak: wraps you in shadow (invisible for a while), only in the dark of the Underdark.\n#\n#\n"
            f"if {DROW_DARK}\n"
            "\tchat caster \"It is too bright here for shadows to hold you.\"\n"
            "\tendscript\n"
            "end\n"
            "chat caster \"The shadows wrap around you.\"\n"
            "removecondition caster \"invis\"\n"
            "addconditionwithduration caster \"invis\" * caster inte 3\n"
            + fx("dark", "caster", "") + "endscript\n")),
        ("venom touch", 2, 12, hex_("Venom Touch", "spider venom: someone loses a little health every few seconds for a while.", "venom",
                                    "* caster inte 3", " is poisoned.", "Venom burns in your veins.",
                                    "Whom do you want to poison? Cast it at someone.", "dark")),
        ("web", 2, 9, hex_("Web", "a web holds someone fast for a few seconds.", "webbed", "6",
                           " is caught in a web.", "A sticky web holds you fast.",
                           "Whom do you want to catch in a web? Cast it at someone.", "dark")),
        ("life drain", 3, 26, battle("Life Drain", "drains your foe's life; you heal half the damage.", f"* + 0.6 * rand 0.6 {SI}", "dark",
                                     ("You drain the life of ", " for "), "Your life is drained for ",
                                     extra="inc caster hp / damage 2\n")),
        ("summon spider", 3, 28, battle("Summon Spider", "a giant spider rises from the dark and attacks your foe.", f"* + 1.2 * rand 1.5 {SI}", "dark",
                                        ("A giant spider rises from the dark and bites ", " for "), "A giant spider bites you for ")),
        ("dark tide", 5, 80, battle("Dark Tide", "a tide of darkness: heavy damage, and it burns your foe's mana.", f"* + 2.6 * rand 1.9 {SI}", "dark",
                                    ("A tide of darkness engulfs ", " for "), "A tide of darkness engulfs you for ",
                                    extra="if > enemy caster mp damage\n\tinc enemy caster mp * -1 damage\nend\n")),
    ],
}

# condition -> (definition, {script name: text})
CONDITIONS = {
    "ward": ("onstart\nwardstart\nonend\nwardend\n.\n",
             {"wardstart": "inc trigger acbonus 8\nendscript\n", "wardend": "inc trigger acbonus -8\nchat trigger \"Your ward fades.\"\nendscript\n"}),
    "barkskin": ("onstart\nbarkskinstart\nonend\nbarkskinend\n.\n",
                 {"barkskinstart": "inc trigger acbonus 8\nendscript\n", "barkskinend": "inc trigger acbonus -8\nchat trigger \"Your skin softens again.\"\nendscript\n"}),
    "glimmerfire": ("onstart\nglimmerfirestart\nonend\nglimmerfireend\n.\n",
                    {"glimmerfirestart": "inc trigger acbonus -3\nendscript\n", "glimmerfireend": "inc trigger acbonus 3\nchat trigger \"The pale fire fades.\"\nendscript\n"}),
    "venom": ("occurance\n3\nonoccurance\nvenomtick\nonend\nvenomend\n.\n",
              {"venomtick": "if > trigger hp 3\n\tinc trigger hp -3\nend\nendscript\n", "venomend": "chat trigger \"The venom has run its course.\"\nendscript\n"}),
    "webbed": ("occurance\n1\nonoccurance\nwebbedtick\nonend\nwebbedend\n.\n",
               {"webbedtick": "order trigger \"sleep\"\nendscript\n", "webbedend": "chat trigger \"You tear free of the web.\"\nendscript\n"}),
    "entangled": ("occurance\n1\nonoccurance\nentangledtick\nonend\nentangledend\n.\n",
                  {"entangledtick": "order trigger \"sleep\"\nendscript\n", "entangledend": "chat trigger \"The roots let you go.\"\nendscript\n"}),
    "grovespirit": ("occurance\n5\nonoccurance\ngrovespirittick\nonend\ngrovespiritend\n.\n",
                    {"grovespirittick": "inc trigger hp 8\nendscript\n", "grovespiritend": "chat trigger \"The spirit of the grove leaves you.\"\nendscript\n"}),
}

COOLDOWNS = {
    "arc bolt": 3, "knit flesh": 3, "ward": 20, "lightning": 8,
    "smite": 4, "lay on hands": 10, "restoration": 20, "cure poison": 10,
    "barkskin": 20, "entangle": 15, "call wolf": 15, "call bear": 20, "spirit of the grove": 60,
    "glimmerfire": 10, "gloom mend": 3, "shadow cloak": 30, "venom touch": 10, "web": 15,
    "life drain": 8, "summon spider": 15, "dark tide": 30,
}

# Rewrites of existing spells: spell -> script
FIXED = {
    "cure poison": (
        "#Cure Poison: lifts poison and venom from someone.\n#\n#\n"
        "if variableisstring param0\n"
        "\tlivingthing target local caster param0\n"
        "\tif variableislivingthing target\n"
        "\t\tremovecondition target poison\n"
        "\t\tremovecondition target venom\n"
        "\t\tchat caster concat concat \"You draw the poison out of \" name target \".\"\n"
        "\t\tchat target \"The poison leaves your body.\"\n"
        + fx("heal", "target", "\t\t") +
        "\t\tendscript\n"
        "\tend\n"
        "\tchat caster \"You do not see them here.\"\n"
        "\tendscript\n"
        "end\n"
        "removecondition caster poison\n"
        "removecondition caster venom\n"
        "chat caster \"You draw the poison out of your body.\"\n"
        + fx("heal", "caster", "") + "endscript\n"),
    "holy": battle("Holy", "holy fire on your foe.", f"* + 2.6 * rand 1.9 {SI}", "holy",
                   ("Holy fire burns ", " for "), "Holy fire burns you for "),
    "summon wurm": (
        "#Summon Wurm: a giant wurm attacks your foe (a topaz makes it fiercer).\n#\n#\n"
        "if ! isinbattle caster\n"
        "\tchat caster \"You must be in battle to summon this creature.\"\n"
        "\tendscript\n"
        "end\n"
        "if hasitem caster \"topaz\"\n"
        f"\tnumber damage * + 1.5 * rand 1.8 {SI}\n"
        "\tinc enemy caster hp * -1 damage\n"
        "\tinc caster damdone damage\n"
        "\tchat caster concat concat concat concat \"The topaz you carry makes the Wurm fiercer. It attacks \" name enemy caster \" for \" damage \" damage.\"\n"
        "\tchat enemy caster concat concat \"A giant Wurm attacks you for \" damage \" damage.\"\n"
        + fx("arcane", "enemy caster", "\t") + "\tendscript\n"
        "end\n"
        f"number damage * + 1.2 * rand 1.5 {SI}\n"
        "inc enemy caster hp * -1 damage\n"
        "inc caster damdone damage\n"
        "chat caster concat concat concat concat \"You summon a giant Wurm. It attacks \" name enemy caster \" for \" damage \" damage.\"\n"
        "chat enemy caster concat concat \"A giant Wurm attacks you for \" damage \" damage.\"\n"
        + fx("arcane", "enemy caster", "") + "endscript\n"),
    "summon leviathan": (
        "#Summon Leviathan: the great sea serpent attacks your foe (an aquamarine makes it fiercer).\n#\n#\n"
        "if ! isinbattle caster\n"
        "\tchat caster \"You must be in battle to summon this creature.\"\n"
        "\tendscript\n"
        "end\n"
        "if hasitem caster \"aquamarine\"\n"
        f"\tnumber damage * + 1.8 * rand 2.0 {SI}\n"
        "\tinc enemy caster hp * -1 damage\n"
        "\tinc caster damdone damage\n"
        "\tchat caster concat concat concat concat \"The aquamarine you carry makes Leviathan fiercer. It attacks \" name enemy caster \" for \" damage \" damage.\"\n"
        "\tchat enemy caster concat concat \"The sea serpent Leviathan attacks you for \" damage \" damage.\"\n"
        + fx("arcane", "enemy caster", "\t") + "\tendscript\n"
        "end\n"
        f"number damage * + 1.8 * rand 1.6 {SI}\n"
        "inc enemy caster hp * -1 damage\n"
        "inc caster damdone damage\n"
        "chat caster concat concat concat concat \"You summon the great sea serpent Leviathan. It attacks \" name enemy caster \" for \" damage \" damage.\"\n"
        "chat enemy caster concat concat \"The sea serpent Leviathan attacks you for \" damage \" damage.\"\n"
        + fx("arcane", "enemy caster", "") + "endscript\n"),
}
# Text swaps in existing scripts: spell -> [(old, new)]
SWAPS = {
    "prayer": [("removecondition caster poison\n", "removecondition caster poison\nremovecondition caster venom\n")],
    # "trigger" doesn't exist in a spell, so the line failed (and logged an error).
    "reflect": [('chat trigger " Reflect shield"', 'chat caster "A reflecting shield surrounds you."')],
    "thorns": [(
        "if hasCondition enemy caster \"reflect\"\n"
        "number damage * caster inte * 3 rand\n"
        "\tinc caster hp * -1 damage\n"
        "\t#Web client spell effect (arcane) for everyone nearby: see js/spells.js\n"
        "\tplaysound + 160000000 + * caster locx 3000 caster locy caster locx caster locy\n"
        "\tinc caster damdone damage\n"
        "\tchat caster concat concat concat concat \"The spell bounces off of him due to Reflect and damages  you for \" damage \" damage.\"\n"
        "\tchat enemy caster concat concat \" The spell bounces off of you and damages \" name enemy caster \" .\"\n"
        "\tendscript\n"
        "end\n",
        "if hasCondition enemy caster \"reflect\"\n"
        "\tchat caster concat name enemy caster \"'s reflection withers your thorns.\"\n"
        "\tendscript\n"
        "end\n")],
    "curse": [(
        "\t\tif hascondition target \"reflect\"\n"
        "\t\t\tchat caster concat name target \"  has reflect.\"\n"
        "\t\t\tchat caster \" You become cursed.\"\n"
        "\t\t\tremovecondition caster \"cursed\"\n"
        "\t\t\taddconditionwithduration caster \"cursed\" * caster inte 3\n"
        "\t\t\t#Web client spell effect (dark) for everyone nearby: see js/spells.js\n"
        "\t\t\tplaysound + 150000000 + * caster locx 3000 caster locy caster locx caster locy\n"
        "\t\t\tendscript\n"
        "\t\tend\n",
        "\t\tif hascondition target \"reflect\"\n"
        "\t\t\tchat caster concat name target \"'s reflection turns the curse aside.\"\n"
        "\t\t\tendscript\n"
        "\t\tend\n")],
}
RENAME_GF = ("leviathan", "great leviathan")

changes = []  # (relative path, old text or None, new text or None)


def read(game, rel):
    p = os.path.join(game, rel)
    if not os.path.exists(p):
        return None
    with open(p, encoding="latin-1", newline="") as f:
        return f.read()


def plan(game, rel, new):
    changes[:] = [c for c in changes if c[0] != rel]
    old = read(game, rel)
    if old != new:
        changes.append((rel, old, new))


def gone(game, rel):
    if read(game, rel) is not None and not any(r == rel for r, _, _ in changes):
        changes.append((rel, read(game, rel), None))


def listed(game, group):
    t = read(game, f"defSpellGroups/{group}")
    return [l.strip() for l in t.replace("\r", "").split("\n") if l.strip()] if t is not None else []


def where(game, spell):
    """(group, its script's path) for a spell already in a group."""
    first = (read(game, f"defSpells/{spell}") or "").replace("\r", "").split("\n")[0].strip()
    names = listed(game, first)
    if spell not in names:
        raise SystemExit(f"{spell} isn't in {first!r}; nothing done")
    return first, f"defSpellGroups/{names.index(spell)} {first}"


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    game, apply = sys.argv[1], "--apply" in sys.argv
    for g in ("arcane group", "divine group", "nature group"):
        if not listed(game, g):
            raise SystemExit(f"no {g}: run schools_phase1.py first")
    # New spells, appended to their school (the order only names scripts).
    for g, spells in NEW.items():
        names = listed(game, g)
        for s, tier, mp, script in spells:
            if s not in names:
                names.append(s)
            plan(game, f"defSpellGroups/{names.index(s)} {g}", script)
            plan(game, f"defSpells/{s}", f"{g}\nmp {mp}\nunlock {TIER[tier]}\n")
        plan(game, f"defSpellGroups/{g}", "\n".join(names) + "\n")
    for cond, (defn, scripts) in CONDITIONS.items():
        plan(game, f"defConditions/{cond}", defn)
        for name, text in scripts.items():
            plan(game, f"scripts/{name}", text)
    for s, text in FIXED.items():
        plan(game, where(game, s)[1], text)
    for s, swaps in SWAPS.items():
        rel = where(game, s)[1]
        text = read(game, rel).replace("\r\n", "\n")
        for a, b in swaps:
            if b in text:
                continue
            if a not in text:
                raise SystemExit(f"{s}: the text to change isn't there; nothing done")
            text = text.replace(a, b)
        plan(game, rel, text)
    # The god-only leviathan's new name (its script stays where it is).
    old, new = RENAME_GF
    gf = listed(game, "Guardian Force Group")
    if old in gf:
        gf[gf.index(old)] = new
        plan(game, "defSpellGroups/Guardian Force Group", "\n".join(gf) + "\n")
        plan(game, f"defSpells/{new}", read(game, f"defSpells/{old}"))
        gone(game, f"defSpells/{old}")
    # Cooldowns.
    cd = read(game, "spellcooldowns") or ""
    have = {l.split("|")[0].strip() for l in cd.splitlines() if "|" in l}
    add = [f"{s}|{n}" for s, n in COOLDOWNS.items() if s not in have]
    if add:
        plan(game, "spellcooldowns", cd.rstrip("\n") + "\n#Schools (phase 4)\n" + "\n".join(add) + "\n")
    # New Priests start in the Drow school.
    cl = read(game, "classes")
    lines = cl.split("\n")
    for i, l in enumerate(lines):
        if l.startswith("start priest ") and "drow group" not in l:
            lines[i] = l.rstrip() + ", drow group 1"
    plan(game, "classes", "\n".join(lines))

    for rel, o, n in changes:
        print(("out   " if n is None else "new   " if o is None else "edit  ") + rel)
    print(len(changes), "changes")
    if not apply or not changes:
        return
    backup = os.path.join(game, "backups", "schools-p4-" + time.strftime("%Y%m%d-%H%M%S"))
    for rel, o, n in changes:
        p, dest = os.path.join(game, rel), os.path.join(backup, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if o is not None:
            shutil.copy2(p, dest)
        if os.path.exists(p + ".dsko"):
            shutil.move(p + ".dsko", dest + ".dsko")
        if n is None:
            os.remove(p)
            continue
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="latin-1", newline="") as f:
            f.write(n)
    print("done; old files in", backup)


if __name__ == "__main__":
    main()
