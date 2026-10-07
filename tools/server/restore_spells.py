#!/usr/bin/env python3
"""Spells that showed in a spellbook but answered "You don't know that
spell." when cast.

    python3 restore_spells.py <game dir> [--dry-run]

Casting (LivingThing.castSpell) opens defSpells/<name> exactly as sent (the
name of the spell, case and all) for the spell's group, then runs
defSpellGroups/<n> <group>, n being the spell's place in the group's list.
The spellbook lists a group's spells from its list, so a spell listed there
with no defSpells file can't be cast.

  Guardian Force Group  Ifrit, Shiva, Levithan, Cactuar, Diablos: their
                        scripts are there (0-4), but fix_spells.py took
                        their defSpells files out as untrainable (no trainer
                        teaches the group; only flan has it). Back in, named
                        in lower case like every other spell, and Levithan
                        spelled Leviathan.
  hells fire            a trainer teaches it (64, 48), but neither of its
                        spells had a defSpells file, and the first ("hell
                        fire") had no script at all. Now hell fire burns for
                        (0.4-1.6) x (STR + INT), and apocolypse, spelled
                        apocalypse, for (0.8-2.0) x (STR + INT), its old
                        lines ("Cyrils wrath will kills him!") rewritten.

Old files go to backups/spells-<time>/; compiled .dsko copies are removed so
the engine reads the new scripts. Running it again changes nothing.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
keep = os.path.join(G, "backups", time.strftime("spells-%Y%m%d-%H%M%S"))
changed = []


def write(rel, text):
    path = os.path.join(G, rel)
    old = open(path, errors="replace").read() if os.path.exists(path) else None
    if old == text:
        return
    changed.append(rel)
    if DRY:
        return
    if old is not None:
        os.makedirs(os.path.dirname(os.path.join(keep, rel)), exist_ok=True)
        shutil.copy2(path, os.path.join(keep, rel))
    open(path, "w").write(text)
    if os.path.exists(path + ".dsko"):
        os.remove(path + ".dsko")


# Guardian Force Group.
GF = "Guardian Force Group"
write(f"defSpellGroups/{GF}", "ifrit\nshiva\nleviathan\ncactuar\ndiablos\n")
for name in ("ifrit", "shiva", "leviathan", "cactuar", "diablos"):
    write(f"defSpells/{name}", GF + "\n")
lev = os.path.join(G, f"defSpellGroups/2 {GF}")
if os.path.exists(lev):
    write(f"defSpellGroups/2 {GF}", open(lev, errors="replace").read().replace("Levithan", "Leviathan"))

# hells fire.
HF = "hells fire"
write(f"defSpellGroups/{HF}", "hell fire\napocalypse\n")
for name in ("hell fire", "apocalypse"):
    write(f"defSpells/{name}", HF + "\n")


def burn(formula, mine, theirs):
    # The spell effect line is what js/spells.js draws (see fix_spells.py).
    return (
        "if isinbattle caster\n"
        f"\tnumber damage {formula}\n"
        "\tinc enemy caster hp * -1 damage\n"
        "\tinc caster damdone damage\n"
        f"\tchat caster concat concat concat concat \" {mine[0]}\" name enemy caster \"{mine[1]}\" damage \" damage.\"\n"
        f"\tchat enemy caster concat concat \" {theirs}\" damage \" damage.\"\n"
        "\tendscript\n"
        "end\n"
        "chat caster \"You must be in battle to use this spell.\"\n"
        "endscript\n"
    )


write(f"defSpellGroups/0 {HF}", burn("* + .4 * rand 1.2 + caster stre caster inte",
                                     ("You call up the fires of hell around ", ". They burn for "),
                                     "Hellfire rises around you, burning you for "))
write(f"defSpellGroups/1 {HF}", burn("* + .8 * rand 1.2 + caster stre caster inte",
                                     ("The sky splits and fire falls on ", ". The apocalypse does "),
                                     "Fire falls from a split sky onto you, doing "))

print(("Would change" if DRY else "Changed") + f" {len(changed)} files" + ("" if DRY or not changed else f" (old ones in {keep})"))
for c in changed:
    print("  " + c)
