#!/usr/bin/env python3
"""Puts mining and smithing (server/Crafting.java) into a Dusk game directory.

    python3 install_crafting.py <game dir> <veins.json> [--apply]

veins.json comes from tools/world/veins.mjs. Without --apply it only says
what it would do. With it, every file it changes is first copied to
backups/crafting-<time>/. Running it again changes nothing that's in.

  defItems/      mining pick, smithing hammer, coal, mithril ore, the four
                 bars, a steel sword and the mithril set (only made, never
                 sold); ore prices put in order (bronze < iron < mithril);
                 steel gloves and leggings made worth their steel
  defProps/      the four veins, a worked-out vein, forge, anvil
  recipes        what forges and anvils make (kept if it's there: a god
                 may have changed it)
  props          the veins, and a forge and an anvil in five towns
  merchants      the smiths sell picks and hammers
  rc/images/sprites.gif   sprites 58-64 (craftsprites.py, beside this file)

The server reads props, merchants and the sprites at start, and writes
props and merchants back when a god saves: install, then restart, with no
"save" in between.
"""
import json
import os
import shutil
import subprocess
import sys
import time

ITEMS = {
    "mining pick": "type\nitem\ndescription\na mining pick: stand by an ore vein and mine\ncost\n200\nimage\n10\n.\n",
    "smithing hammer": "type\nitem\ndescription\na smith's hammer, for working metal at an anvil\ncost\n200\nimage\n10\n.\n",
    "coal": "type\nitem\ndescription\na lump of coal, for making steel\ncost\n20\nimage\n6\n.\n",
    "mithril ore": "type\nitem\ndescription\nsome mithril ore, pale and cold to the touch\ncost\n160\nimage\n6\n.\n",
    "bronze bar": "type\nitem\ndescription\na bar of bronze\ncost\n40\nimage\n6\n.\n",
    "iron bar": "type\nitem\ndescription\na bar of iron\ncost\n70\nimage\n6\n.\n",
    "steel bar": "type\nitem\ndescription\na bar of steel\ncost\n150\nimage\n6\n.\n",
    "mithril bar": "type\nitem\ndescription\na bar of mithril, light as a feather and harder than steel\ncost\n500\nimage\n6\n.\n",
    "steel sword": "type\nweapon\ndescription\na well-balanced steel sword\ncost\n3000\nmod\n300\nimage\n9\ndurability\n9000\n.\n",
    "mithril sword": "type\nweapon\ndescription\na mithril sword, smith-made; its edge never dulls\ncost\n12000\nmod\n800\nimage\n9\ndurability\n30000\n.\n",
    "mithril helmet": "type\narmor\nkind\nskull\ndescription\na mithril helmet, smith-made\ncost\n6000\nmod\n200\nimage\n7\ndurability\n30000\n.\n",
    "mithril breastplate": "type\narmor\nkind\ntorso\ndescription\na mithril breastplate, smith-made\ncost\n10000\nmod\n300\nimage\n7\ndurability\n30000\n.\n",
    "mithril leggings": "type\narmor\nkind\nlegs\ndescription\nmithril leggings, smith-made\ncost\n6000\nmod\n150\nimage\n7\ndurability\n30000\n.\n",
    "mithril gloves": "type\narmor\nkind\nhands\ndescription\nmithril gloves, smith-made\ncost\n5000\nmod\n120\nimage\n7\ndurability\n30000\n.\n",
    "mithril shield": "type\narmor\nkind\narms\ndescription\na mithril shield, smith-made\ncost\n9000\nmod\n450\nimage\n7\ndurability\n30000\n.\n",
}
# Existing items: one value changed ("key": new value).
CHANGES = {
    "bronze ore": {"cost": "16"},
    "iron ore": {"cost": "30"},
    "steel gloves": {"mod": "70", "cost": "800"},
    "steel leggings": {"mod": "70", "cost": "800"},
}
PROPS = {
    "bronze vein": ("a rock face with bronze ore in it", 58),
    "iron vein": ("a rock face with iron ore in it", 59),
    "coal seam": ("a black seam of coal in the rock", 60),
    "mithril vein": ("a rock face glittering with mithril", 61),
    "worked-out vein": ("broken rock: nothing left to dig", 62),
    "forge": ("a smith's forge, hot enough to melt ore", 63),
    "anvil": ("a heavy iron anvil", 64),
}
RECIPES = """# What forges and anvils make (server/Crafting.java), one per line:
#   station|Smithing needed|result|ingredients
# An ingredient is "<how many> <item>". Saved changes count at once.
forge|0|bronze bar|2 bronze ore
forge|15|iron bar|2 iron ore
forge|35|steel bar|2 iron ore, 2 coal
forge|65|mithril bar|3 mithril ore, 2 coal
anvil|0|mining pick|2 bronze bar
anvil|0|bronze gloves|2 bronze bar
anvil|2|bronze helmet|2 bronze bar
anvil|4|bronze leggings|3 bronze bar
anvil|6|bronze sword|3 bronze bar
anvil|8|bronze shield|4 bronze bar
anvil|10|bronze breastplate|5 bronze bar
anvil|15|iron gloves|2 iron bar
anvil|17|iron helmet|2 iron bar
anvil|19|iron leggings|3 iron bar
anvil|21|iron sword|3 iron bar
anvil|23|iron shield|4 iron bar
anvil|25|iron breastplate|5 iron bar
anvil|35|steel gloves|2 steel bar
anvil|38|steel helmet|2 steel bar
anvil|41|steel leggings|3 steel bar
anvil|44|steel sword|3 steel bar
anvil|47|steel plate mail sleeves|3 steel bar
anvil|50|steel suit|5 steel bar
anvil|65|mithril gloves|2 mithril bar
anvil|68|mithril helmet|2 mithril bar
anvil|71|mithril leggings|3 mithril bar
anvil|74|mithril sword|3 mithril bar
anvil|77|mithril shield|4 mithril bar
anvil|80|mithril breastplate|5 mithril bar
"""
# A forge, an anvil and (where there's no shop already) a stall, by town.
STATIONS = [
    # Kingshaven: behind Brann the Smith's counter; his shop sells the tools.
    {"forge": (1419, 341), "anvil": (1415, 341), "sell_at": (1417, 343)},
    # Velkarath: Armsmaster Quave's hall.
    {"forge": (1292, 964), "anvil": (1294, 964), "stall": (1298, 964)},
    # The old human town, by The Armorer.
    {"forge": (123, 376), "anvil": (127, 376), "stall": (129, 379)},
    # Izaru's mine hall; the Mine Shop sells the tools.
    {"forge": (435, 78), "anvil": (437, 78), "sell_at": (440, 71)},
    # Ssarakh, in the open by the village.
    {"forge": (1681, 939), "anvil": (1683, 939), "stall": (1684, 941)},
]
TOOLS = ["mining pick", "smithing hammer"]


def read(path):
    try:
        with open(path, encoding="latin-1") as f:
            return f.read()
    except FileNotFoundError:
        return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__)
    game, veins_path = os.path.abspath(args[0]), os.path.abspath(args[1])
    apply = "--apply" in sys.argv
    here = os.path.dirname(os.path.abspath(__file__))
    with open(veins_path) as f:
        veins = json.load(f)
    os.chdir(game)
    backup = os.path.join("backups", "crafting-" + time.strftime("%Y%m%d-%H%M%S"))
    said = []

    def keep(path):
        if not apply or not os.path.exists(path):
            return
        dest = os.path.join(backup, path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if not os.path.exists(dest):
            shutil.copy2(path, dest)

    def write(path, text):
        if not apply:
            return
        keep(path)
        tmp = path + ".new"
        with open(tmp, "w", encoding="latin-1", newline="\n") as f:
            f.write(text)
        os.replace(tmp, path)

    # Items.
    new = [n for n in ITEMS if not os.path.exists(os.path.join("defItems", n))]
    for n in new:
        write(os.path.join("defItems", n), ITEMS[n])
    said.append("items: %d new (%s)" % (len(new), ", ".join(new) or "none"))
    for n, change in CHANGES.items():
        path = os.path.join("defItems", n)
        text = read(path)
        if text is None:
            said.append("  %s: missing, not changed" % n)
            continue
        lines = text.replace("\r", "").split("\n")
        changed = []
        for key, value in change.items():
            for i in range(len(lines) - 1):
                if lines[i] == key and lines[i + 1] != value:
                    changed.append("%s %s -> %s" % (key, lines[i + 1], value))
                    lines[i + 1] = value
        if changed:
            write(path, "\n".join(lines))
            if apply and os.path.exists(path + ".dsko"):
                os.remove(path + ".dsko")
        said.append("  %s: %s" % (n, "; ".join(changed) or "already so"))

    # Props.
    new = [n for n in PROPS if not os.path.exists(os.path.join("defProps", n))]
    for n in new:
        desc, image = PROPS[n]
        write(os.path.join("defProps", n), "description\n%s\nimage\n%d\n.\n" % (desc, image))
    said.append("prop kinds: %d new" % len(new))

    if read("recipes") is None:
        write("recipes", RECIPES)
        said.append("recipes: written")
    else:
        said.append("recipes: already there, kept")

    # Where things stand.
    text = read("props") or ""
    lines = text.replace("\r", "").split("\n")
    have = set()
    for i in range(0, len(lines) - 2, 3):
        if not lines[i]:
            break
        have.add((lines[i], lines[i + 1].strip(), lines[i + 2].strip()))
    want = [(v["name"], v["x"], v["y"]) for v in veins]
    for s in STATIONS:
        want += [("forge",) + s["forge"], ("anvil",) + s["anvil"]]
    add = [w for w in want if (w[0], str(w[1]), str(w[2])) not in have]
    if add:
        base = text.rstrip("\r\n \t")
        write("props", (base + "\n" if base else "") + "".join("%s\n%d\n%d\n" % w for w in add))
    said.append("props placed: %d new, %d already there" % (len(add), len(want) - len(add)))

    # Tools for sale.
    text = (read("merchants") or "").replace("\r", "")
    out, i, lines, added = [], 0, text.split("\n"), []
    sell_at = {s["sell_at"] for s in STATIONS if "sell_at" in s}
    stalls = [s["stall"] for s in STATIONS if "stall" in s]
    places = set()
    while i < len(lines):
        if lines[i] == "Merchant" and i + 2 < len(lines):
            x, y = lines[i + 1].strip(), lines[i + 2].strip()
            places.add((x, y))
            j = i + 3
            wares = []
            while j < len(lines) and lines[j] != "end":
                wares.append(lines[j])
                j += 1
            if (int(x), int(y)) in sell_at:
                for t in TOOLS:
                    if t not in wares:
                        wares.append(t)
                        added.append("%s at %s,%s" % (t, x, y))
            out += ["Merchant", lines[i + 1], lines[i + 2]] + wares + ["end"]
            i = j + 1
            continue
        out.append(lines[i])
        i += 1
    body = "\n".join(out).rstrip("\n \t")
    for (x, y) in stalls:
        if (str(x), str(y)) not in places:
            body += "\nMerchant\n%d\n%d\n%send" % (x, y, "".join(t + "\n" for t in TOOLS))
            added.append("a stall at %d,%d" % (x, y))
    if added:
        write("merchants", body + "\n")
    said.append("shops: %s" % ("; ".join(added) or "already selling"))

    # The sprites.
    sheet = os.path.join("rc", "images", "sprites.gif")
    count = int(subprocess.check_output(["python3", "-c", "from PIL import Image; print(Image.open('%s').size[0] // 64)" % sheet]).decode())
    if count == 58:
        if apply:
            keep(sheet)
            subprocess.check_call(["python3", os.path.join(here, "craftsprites.py"), os.path.join(backup, sheet), sheet, os.path.join(backup, "craft-preview.png")])
        said.append("sprites: 58 -> 65")
    else:
        said.append("sprites: %d already (58-64 are mining and smithing when there are 65)" % count)

    print("\n".join(said))
    print("Backups in %s" % backup if apply else "Dry run; add --apply.")


if __name__ == "__main__":
    main()
