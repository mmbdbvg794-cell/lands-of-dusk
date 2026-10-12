#!/usr/bin/env python3
"""Effects for items whose wear scripts never existed (2026-10-12 audit).

    python3 item_effects.py <game dir> [--dry-run]

Each item below names a wear script (and most an unwear script) that isn't
in scripts/, so it was plain gear. This writes them: what wearing gives,
taking it off takes back. Bonuses aren't saved with a character; the
engine runs wear scripts again when a character logs in (and when a
monster puts on its gear), so they never pile up. Items that had a wear
script but no unwear script get one, or taking them off would have kept
the bonus. Scripts say nothing in chat: they also run at every login.

God tools and test items (killsword, smek, fireball, summon demon,
lightning bolt, blade of darkness, god blade, inte booster, the cost-1
shifty set, unsmek) are left as they are.

Old files go to backups/item-effects-<time>/. Restart after (items are
read when they're made, scripts when they run; a restart is the clean
way). Running it again changes nothing.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
keep = os.path.join(G, "backups", time.strftime("item-effects-%Y%m%d-%H%M%S"))
changed = []

# effect name -> (bonuses, items using it). Bonuses are script variables:
# strengthbonus, intelligencebonus, dexteritybonus, wisdombonus,
# constitutionbonus, acbonus, dammodbonus (adds to the weapon's mod),
# hpbonus, mpbonus (max HP / MP).
EFFECTS = {
    # Bought
    "aoppower": ({"strengthbonus": 3, "dammodbonus": 40}, ["anarchy blade", "vedic blade"]),
    "chaotic": ({"strengthbonus": 2, "dexteritybonus": 2, "wisdombonus": -2}, ["chaotic amulet"]),
    "diamondwear": ({"hpbonus": 25}, ["diamond belt", "diamond collar", "diamond facemask", "diamond gauntlets",
                                       "diamond helmet", "diamond leggings", "diamond sleeves", "diamond suit",
                                       "diamond sword"]),
    "steelPMW": ({"constitutionbonus": 2, "dexteritybonus": -1}, ["steel plate mail"]),
    "thiefdagger": ({"dexteritybonus": 5}, ["thieves dagger"]),
    # Dropped
    "darkrod": ({"intelligencebonus": 5, "mpbonus": 50}, ["dark rod"]),
    "wizard": ({"intelligencebonus": 3, "mpbonus": 30}, ["wizard rod"]),
    "dran": ({"strengthbonus": 5, "dammodbonus": 60}, ["dran sword"]),
    "da": ({"constitutionbonus": 4, "hpbonus": 100}, ["dran armor"]),
    "ruby1": ({"strengthbonus": 3, "dexteritybonus": 3}, ["ruby studded dragon gloves"]),
    "sspear": ({"strengthbonus": 4, "dammodbonus": 60}, ["satans spear"]),
    # Excalibur (flan has one; the warden and the 2nd wizard wield it)
    "ExcaliburWear": ({"strengthbonus": 3, "constitutionbonus": 3, "hpbonus": 50}, ["excalibur", "excalibur+"]),
    # Worn by monsters (the puff dragon's blood suit), and their sets
    "bloodsuiton": ({"hpbonus": 15}, ["blood suit"]),
    "bbon": ({"hpbonus": 15}, ["blood belt"]),
    "bloodgloveson": ({"hpbonus": 15}, ["blood gloves"]),
    "bloodhelmeton": ({"hpbonus": 15}, ["blood helmet"]),
    "bloodleggingson": ({"hpbonus": 15}, ["blood leggings"]),
    "bloodsleeveson": ({"hpbonus": 15}, ["blood sleeves"]),
    # Shared by two old swords
    "power": ({"strengthbonus": 3, "intelligencebonus": 3}, ["energy saber", "ancient sword of einhanzer"]),
    # Nobody can get these now (no shop or drop); a god can hand them out
    "bs": ({"strengthbonus": 4, "dammodbonus": 40}, ["basterd sword"]),
    "cutlason": ({"dexteritybonus": 3, "dammodbonus": 40}, ["cutlas supreme"]),
    "dcloak": ({"strengthbonus": 3, "wisdombonus": -2, "hpbonus": 40}, ["demons cloak"]),
    "devils": ({"strengthbonus": 3, "dammodbonus": 30}, ["devilsblade"]),
    "fire": ({"dammodbonus": 30}, ["fire blade"]),
    "ice": ({"dexteritybonus": 2, "dammodbonus": 20}, ["ice blade"]),
    "celestial": ({"dexteritybonus": 5, "dammodbonus": 80}, ["celestial bow"]),
    "sr": ({"strengthbonus": 3, "mpbonus": 30}, ["soul reaver"]),
    "war soul": ({"strengthbonus": 3, "constitutionbonus": 2}, ["war soul"]),
    "gat": ({"strengthbonus": 4}, ["gatotics blade"]),
    "firebow": ({"dammodbonus": 40}, ["hell crossbow"]),
    "questwaer": ({"strengthbonus": 2, "dexteritybonus": 2}, ["quest sword"]),
    "mpb": ({"mpbonus": 60}, ["mp booster"]),
    "orkshieldW": ({"constitutionbonus": 3}, ["orkshield"]),
    "shifty": ({"constitutionbonus": 3, "hpbonus": 50}, ["shifty war plate"]),
}
# Wear script -> the unwear script name the items already use (or a new one).
UNWEAR = {"aoppower": "aoplose", "chaotic": "chaotic2", "steelPMW": "steelPMU", "thiefdagger": "thiefdaggerend",
          "darkrod": "drend", "wizard": "wizardend", "dran": "dranend", "da": "daend", "ruby1": "ruby1end",
          "ExcaliburWear": "ExcaliburUnwear", "power": "powerend", "bs": "bsend", "cutlason": "cutlasoff",
          "dcloak": "dcloakend", "devils": "devilsend", "fire": "fire2", "ice": "office", "celestial": "celestialend",
          "sr": "srend", "war soul": "war soul end", "questwaer": "questunwear", "mpb": "mpbend",
          "orkshieldW": "orkshieldU", "shifty": "shiftyend"}


def read(rel):
    try:
        with open(os.path.join(G, rel), "rb") as f:
            return f.read().decode("latin-1")
    except FileNotFoundError:
        return None


def write(rel, text):
    path = os.path.join(G, rel)
    if read(rel) == text:
        return
    changed.append(rel)
    if DRY:
        return
    if os.path.exists(path):
        os.makedirs(os.path.dirname(os.path.join(keep, rel)), exist_ok=True)
        shutil.copy2(path, os.path.join(keep, rel))
    with open(path, "wb") as f:
        f.write(text.encode("latin-1"))
    if os.path.exists(path + ".dsko"):
        os.remove(path + ".dsko")


def script(bonuses, sign):
    return "".join("inc trigger %s %d\n" % (k, sign * v) for k, v in bonuses.items()) + "endscript\n"


def set_key(text, key, value):
    """Sets an item file's key (any case) to value, adding it before the
    final "." (or at the end) if it isn't there."""
    nl = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(nl)
    for i in range(2, len(lines) - 1):
        if lines[i].strip().lower() == key:
            lines[i + 1] = value
            return nl.join(lines)
    end = len(lines)
    while end > 0 and lines[end - 1].strip() in ("", "."):
        end -= 1
    lines[end:end] = [key, value]
    return nl.join(lines)


for wear, (bonuses, items) in EFFECTS.items():
    unwear = UNWEAR.get(wear, wear + "end")
    write("scripts/" + wear, script(bonuses, 1))
    write("scripts/" + unwear, script(bonuses, -1))
    for item in items:
        rel = "defItems/" + item
        text = read(rel)
        if text is None:
            print("no item file: " + item)
            continue
        write(rel, set_key(set_key(text, "onwear", wear), "onunwear", unwear))

print(("Would change" if DRY else "Changed") + " %d files" % len(changed) + ("" if DRY or not changed else " (backups in %s)" % keep))
for c in changed:
    print("  " + c)
