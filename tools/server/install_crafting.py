#!/usr/bin/env python3
"""Puts mining, smithing, herbalism, alchemy, woodcutting and fletching
(server/Crafting.java) into a Dusk game directory.

    python3 install_crafting.py <game dir> <veins.json> <herbs.json> [--drop=<old.json> ...] [--apply]

--drop=<old.json>: veins or patches from an earlier list that the new
lists don't have are taken out (moving them all, 2026-10-13).

veins.json and herbs.json come from tools/world/veins.mjs and herbs.mjs
(the lists used live are kept beside this file). Without --apply it only says
what it would do. With it, every file it changes is first copied to
backups/crafting-<time>/. Running it again changes nothing that's in.

  defItems/      mining pick, smithing hammer, herb sickle, coal, mithril
                 ore, the four bars, a steel sword and the mithril set (only
                 made, never sold), moonpetal and the moonpetal elixir; ore
                 prices put in order (bronze < iron < mithril); steel gloves
                 and leggings made worth their steel; lavender and
                 wolfsbane cheaper (gathered now), azeala dearer (rarer)
  scripts/       moonpetal elixir.use
  defProps/      the veins and herb patches, used-up looks, forge, anvil,
                 alchemy table
  recipes        what forges, anvils and alchemy tables make: written if
                 missing, else only the recipes it lacks are added (a god's
                 changes are kept)
  props          veins, patches, and a forge and an anvil in three towns,
                 an alchemy table in four (none in the dark elves' or the
                 humans' tutorial: taken out if there)
  merchants      smiths sell picks and hammers, alchemists sickles, and the
                 stalls all three
  rc/images/sprites.gif   sprites 58-73 (craftsprites.py, beside this file)
  (woodcutting needs nothing placed: trees are map squares; workbenches
  are placed by the forges and in Caelum's bow shop)

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
    "herb sickle": "type\nitem\ndescription\na small curved sickle for cutting herbs\ncost\n150\nimage\n8\n.\n",
    "moonpetal": "type\nitem\ndescription\na moonpetal, pale and faintly glowing; it grows only far from any town\ncost\n150\nimage\n6\n.\n",
    "woodcutter's axe": "type\nitem\ndescription\na woodcutter's axe: stand by a tree and chop\ncost\n200\nimage\n10\n.\n",
    "fletching knife": "type\nitem\ndescription\na thin knife for shaping wood at a workbench\ncost\n120\nimage\n8\n.\n",
    "oak log": "type\nitem\ndescription\nan oak log\ncost\n8\nimage\n6\n.\n",
    "ash log": "type\nitem\ndescription\nan ash log, straight-grained\ncost\n20\nimage\n6\n.\n",
    "yew log": "type\nitem\ndescription\na yew log, the bowyer's wood\ncost\n45\nimage\n6\n.\n",
    "elderwood log": "type\nitem\ndescription\nan elderwood log, pale and almost humming; it grows only far from any town\ncost\n120\nimage\n6\n.\n",
    "ash staff": "type\nweapon\ndescription\na staff of ash, fletcher-made\ncost\n1200\nmod\n220\nimage\n8\ndurability\n12000\n.\n",
    "yew staff": "type\nweapon\ndescription\na staff of yew, fletcher-made\ncost\n3000\nmod\n380\nimage\n8\ndurability\n20000\n.\n",
    "elderwood staff": "type\nweapon\ndescription\na staff of elderwood, fletcher-made; it hums when it strikes\ncost\n9000\nmod\n650\nimage\n8\ndurability\n30000\n.\n",
    "ash longbow": "type\nranged\ndescription\nan ash longbow, fletcher-made\ncost\n2500\nmod\n330\nimage\n8\nrange\n20\ndurability\n100000\n.\n",
    "yew longbow": "type\nranged\ndescription\na yew longbow, fletcher-made\ncost\n6000\nmod\n520\nimage\n8\nrange\n25\ndurability\n100000\n.\n",
    "elderwood bow": "type\nranged\ndescription\nan elderwood bow, fletcher-made; the string sings\ncost\n12000\nmod\n800\nimage\n8\nrange\n25\ndurability\n100000\n.\n",
    "moonpetal elixir": "type\nitem\ndescription\na hand-brewed elixir of moonpetal: restores 1000 health and mana; worth nothing to merchants\ncost\n0\nimage\n6\nonuse\nmoonpetal elixir.use\nuses\n1\n.\n",
}
SCRIPTS = {
    "moonpetal elixir.use": 'chat trigger "Moonlight runs through your veins."\ninc trigger hp 1000\ninc trigger mp 1000\nremoveitem trigger "moonpetal elixir"\nendscript\n',
}
# Existing items: one value changed ("key": new value).
CHANGES = {
    "bronze ore": {"cost": "16"},
    "iron ore": {"cost": "30"},
    "steel gloves": {"mod": "70", "cost": "800"},
    "steel leggings": {"mod": "70", "cost": "800"},
    "lavendar": {"cost": "60"},
    "wolfsbane": {"cost": "80"},
    "azeala": {"cost": "100"},
}
PROPS = {
    "bronze vein": ("a rock face with bronze ore in it", 58),
    "iron vein": ("a rock face with iron ore in it", 59),
    "coal seam": ("a black seam of coal in the rock", 60),
    "mithril vein": ("a rock face glittering with mithril", 61),
    "worked-out vein": ("broken rock: nothing left to dig", 62),
    "forge": ("a smith's forge, hot enough to melt ore", 63),
    "anvil": ("a heavy iron anvil", 64),
    "mushroom patch": ("mushrooms, growing in the shade", 65),
    "mandrake patch": ("mandrake, its roots poking from the earth", 66),
    "lavender patch": ("a patch of sweet-smelling lavender", 67),
    "wolfsbane patch": ("tall blue wolfsbane", 68),
    "azeala bush": ("an azeala bush in flower", 69),
    "moonpetal patch": ("moonpetals, glowing faintly", 70),
    "picked patch": ("a patch of earth, picked bare", 71),
    "alchemy table": ("a table of flasks and bottles for brewing", 72),
    "workbench": ("a fletcher's workbench, shavings everywhere", 73),
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
alchemy|0|brewed minor potion|1 mushroom, 1 water
alchemy|10|brewed anti-curse potion|1 mandrake
alchemy|25|brewed red potion|1 mandrake, 1 wolfsbane
alchemy|30|brewed green potion|1 lavendar, 1 wolfsbane
alchemy|50|brewed blue potion|1 brewed red potion, 1 brewed green potion, 1 azeala
alchemy|70|moonpetal elixir|2 moonpetal, 1 brewed blue potion
anvil|0|woodcutter's axe|2 bronze bar
fletching|0|quarter staff|2 oak log
fletching|0|quiver|1 oak log
fletching|5|cheap bow|3 oak log
fletching|15|ash staff|3 ash log
fletching|20|ash longbow|4 ash log
fletching|35|yew staff|3 yew log
fletching|40|yew longbow|4 yew log
fletching|60|elderwood staff|3 elderwood log
fletching|65|elderwood bow|4 elderwood log
"""
# A forge, an anvil and (where there's no shop already) a stall, by town.
STATIONS = [
    # Kingshaven: behind Brann the Smith's counter; his shop sells the tools.
    {"forge": (1419, 341), "anvil": (1415, 341), "sell_at": (1417, 343)},
    # Izaru's mine hall; the Mine Shop sells the tools.
    {"forge": (435, 78), "anvil": (437, 78), "sell_at": (440, 71)},
    # Ssarakh, in the open by the village.
    {"forge": (1681, 939), "anvil": (1683, 939), "stall": (1684, 941)},
]
# Alchemy tables, by the alchemists; theirs is a shop that sells sickles.
TABLES = [
    {"table": (1440, 373), "sell_at": (1442, 371)},  # Kingshaven: behind Alchemist Pell's counter
    {"table": (485, 1254), "sell_at": (487, 1252)},  # Aelindor: Miriel's Herbs
    {"table": (30, 127)},  # the old world, by Herbalist Linnet
    {"table": (1680, 941)},  # Ssarakh: by the forge
]
# Taken out again (2026-10-13): Armsmaster Quave's hall is the dark elves'
# tutorial, and the square by The Armorer the humans', no place for a smithy.
DROP_PROPS = [("forge", 1292, 964), ("anvil", 1294, 964), ("alchemy table", 1296, 964),
              ("forge", 123, 376), ("anvil", 127, 376)]
DROP_STALLS = [(1298, 964), (129, 379)]
# Workbenches (fletching): by three of the forges, and in Caelum's bow
# shop in Aelindor, whose counter sells the knife and axe.
BENCHES = [
    {"bench": (1416, 341)},  # Kingshaven: behind Brann's counter
    {"bench": (439, 78)},  # Izaru's mine hall
    {"bench": (1685, 939)},  # Ssarakh, by the forge
    {"bench": (447, 1254), "sell_at": (449, 1252)},  # Aelindor: behind Caelum's counter
]
TOOLS = ["mining pick", "smithing hammer", "herb sickle", "woodcutter's axe", "fletching knife"]
SMITH_TOOLS = ["mining pick", "smithing hammer", "woodcutter's axe"]
ALCHEMY_TOOLS = ["herb sickle"]
BOWYER_TOOLS = ["fletching knife", "woodcutter's axe"]


def read(path):
    try:
        with open(path, encoding="latin-1") as f:
            return f.read()
    except FileNotFoundError:
        return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    drops = [a[len("--drop="):] for a in sys.argv[1:] if a.startswith("--drop=")]

    if len(args) != 3:
        sys.exit(__doc__)
    game, veins_path, herbs_path = os.path.abspath(args[0]), os.path.abspath(args[1]), os.path.abspath(args[2])
    apply = "--apply" in sys.argv
    here = os.path.dirname(os.path.abspath(__file__))
    with open(veins_path) as f:
        veins = json.load(f)
    with open(herbs_path) as f:
        veins += json.load(f)
    old = set()
    for d in drops:
        with open(os.path.abspath(os.path.join(os.path.dirname(veins_path), d)) if not os.path.isabs(d) else d) as f:
            old |= {(v["name"], str(v["x"]), str(v["y"])) for v in json.load(f)}
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

    new = [n for n in SCRIPTS if not os.path.exists(os.path.join("scripts", n))]
    for n in new:
        write(os.path.join("scripts", n), SCRIPTS[n])
    said.append("scripts: %d new" % len(new))

    # Props.
    new = [n for n in PROPS if not os.path.exists(os.path.join("defProps", n))]
    for n in new:
        desc, image = PROPS[n]
        write(os.path.join("defProps", n), "description\n%s\nimage\n%d\n.\n" % (desc, image))
    said.append("prop kinds: %d new" % len(new))

    have_recipes = read("recipes")
    if have_recipes is None:
        write("recipes", RECIPES)
        said.append("recipes: written")
    else:
        key = lambda line: tuple(x.strip().lower() for x in line.split("|")[0:3:2])
        known = {key(l) for l in have_recipes.splitlines() if l.strip() and not l.startswith("#") and l.count("|") == 3}
        missing = [l for l in RECIPES.splitlines() if l.strip() and not l.startswith("#") and key(l) not in known]
        if missing:
            write("recipes", have_recipes.rstrip("\n") + "\n" + "\n".join(missing) + "\n")
        said.append("recipes: %d added (%s)" % (len(missing), ", ".join(l.split("|")[2] for l in missing) or "none missing"))

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
    for t in TABLES:
        want.append(("alchemy table",) + t["table"])
    for b in BENCHES:
        want.append(("workbench",) + b["bench"])
    add = [w for w in want if (w[0], str(w[1]), str(w[2])) not in have]
    drop = {(n, str(x), str(y)) for n, x, y in DROP_PROPS}
    # Old spots the new lists no longer have.
    drop |= old - {(w[0], str(w[1]), str(w[2])) for w in want}
    gone = [t for t in have if t in drop]
    if add or gone:
        kept = []
        for i in range(0, len(lines) - 2, 3):
            if not lines[i]:
                break
            if (lines[i], lines[i + 1].strip(), lines[i + 2].strip()) not in drop:
                kept.append("%s\n%s\n%s\n" % (lines[i], lines[i + 1], lines[i + 2]))
        write("props", "".join(kept) + "".join("%s\n%d\n%d\n" % w for w in add))
    said.append("props placed: %d new, %d already there; %d taken out" % (len(add), len(want) - len(add), len(gone)))

    # Tools for sale.
    text = (read("merchants") or "").replace("\r", "")
    out, i, lines, added = [], 0, text.split("\n"), []
    # What each place sells: smiths the smith's tools, alchemists sickles,
    # and the stalls everything.
    sells = {}
    for s in STATIONS:
        if "sell_at" in s:
            sells.setdefault(s["sell_at"], []).extend(SMITH_TOOLS)
    for t in TABLES:
        if "sell_at" in t:
            sells.setdefault(t["sell_at"], []).extend(ALCHEMY_TOOLS)
    for b in BENCHES:
        if "sell_at" in b:
            sells.setdefault(b["sell_at"], []).extend(BOWYER_TOOLS)
    stalls = [tuple(s["stall"]) for s in STATIONS if "stall" in s]
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
            wanted = sells.get((int(x), int(y)), [])
            if (int(x), int(y)) in stalls:
                wanted = TOOLS
            if wanted:
                for t in wanted:
                    if t not in wares:
                        wares.append(t)
                        added.append("%s at %s,%s" % (t, x, y))
            # A stall of ours that's no longer wanted (only our tools on it).
            if (int(x), int(y)) in DROP_STALLS and all(w in TOOLS for w in wares):
                added.append("stall at %s,%s taken out" % (x, y))
                i = j + 1
                continue
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
    if count in (58, 65, 73):
        if apply:
            keep(sheet)
            subprocess.check_call(["python3", os.path.join(here, "craftsprites.py"), os.path.join(backup, sheet), sheet, os.path.join(backup, "craft-preview.png")])
        said.append("sprites: %d -> 74" % count)
    else:
        said.append("sprites: %d already (58-73 are gathering and making when there are 74)" % count)

    print("\n".join(said))
    print("Backups in %s" % backup if apply else "Dry run; add --apply.")


if __name__ == "__main__":
    main()
