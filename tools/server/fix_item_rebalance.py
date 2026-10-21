#!/usr/bin/env python3
"""The item rebalance (2026-10-21; the audit and the approved proposal:
https://claude.ai/artifact/SSGysN9qi33j4robXXDdu4).

  - bows reach 3-6 squares (were 20-25) and hit softer than swords of the
    same price
  - crafted gear at least as good as shop gear of its material (bronze
    breastplate 45, steel sword 320, bronze sword 165)
  - prices follow power: armour 25 gp per point of real armour, weapons
    4 x ((power - 100) / 10)^2, +20 gp per bonus point; quest rewards and
    tools keep theirs
  - the gearneeds file: what mid (15), high (30) and top (45) tier gear
    needs (STR, bows DEX, staves INT); server/Classes.java reads it

    python3 fix_item_rebalance.py <game dir> [--apply]

Without --apply it says what it would change. Changed files are copied to
<game dir>/backups/item-rebalance-<time>/ first. Running it twice changes
nothing. Items are read at start-up (restart); gearneeds whenever it
changes.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('item-rebalance-%Y%m%d-%H%M%S'))

CHANGES = {
 "air boots": {
  "cost": 190
 },
 "ash longbow": {
  "cost": 575,
  "mod": 220,
  "range": 5
 },
 "ash staff": {
  "cost": 575
 },
 "assassin blade": {
  "cost": 245
 },
 "blade of light": {
  "cost": 3600
 },
 "blood belt": {
  "cost": 750
 },
 "blood gloves": {
  "cost": 425
 },
 "blood helmet": {
  "cost": 1325
 },
 "blood leggings": {
  "cost": 350
 },
 "blood sleeves": {
  "cost": 400
 },
 "blood suit": {
  "cost": 3500
 },
 "broad sword": {
  "cost": 65
 },
 "bronze belt": {
  "cost": 150
 },
 "bronze breastplate": {
  "cost": 450,
  "mod": 45
 },
 "bronze gloves": {
  "cost": 50
 },
 "bronze leggings": {
  "cost": 50
 },
 "bronze shield": {
  "cost": 250
 },
 "bronze sleeves": {
  "cost": 50
 },
 "bronze sword": {
  "cost": 170,
  "mod": 165
 },
 "burn blade": {
  "cost": 1155
 },
 "cheap bow": {
  "cost": 65,
  "mod": 140,
  "range": 4
 },
 "cloth shirt": {
  "cost": 100
 },
 "crystal belt": {
  "cost": 190
 },
 "crystal gloves": {
  "cost": 30
 },
 "crystal helmet": {
  "cost": 500
 },
 "crystal leggings": {
  "cost": 40
 },
 "crystal lens": {
  "cost": 25
 },
 "crystal necklace": {
  "cost": 10
 },
 "crystal sleeves": {
  "cost": 40
 },
 "crystal suit": {
  "cost": 1730
 },
 "crystal sword": {
  "cost": 400
 },
 "curved dagger": {
  "cost": 15
 },
 "cutlas": {
  "cost": 4900
 },
 "daedulus sword": {
  "cost": 10000
 },
 "dagger": {
  "cost": 5
 },
 "diamond belt": {
  "cost": 1250
 },
 "diamond collar": {
  "cost": 690
 },
 "diamond facemask": {
  "cost": 690
 },
 "diamond gauntlets": {
  "cost": 640
 },
 "diamond helmet": {
  "cost": 1750
 },
 "diamond leggings": {
  "cost": 625
 },
 "diamond sleeves": {
  "cost": 625
 },
 "diamond suit": {
  "cost": 4000
 },
 "diamond sword": {
  "cost": 10500
 },
 "elderwood bow": {
  "cost": 7055,
  "mod": 520,
  "range": 6
 },
 "elderwood staff": {
  "cost": 12100
 },
 "elven chain mail": {
  "cost": 1000
 },
 "expert sword": {
  "cost": 900
 },
 "eye of the dead": {
  "cost": 40
 },
 "fire": {
  "cost": 6400
 },
 "force field": {
  "cost": 750
 },
 "gaia skull": {
  "cost": 1000
 },
 "generic helmet": {
  "cost": 5
 },
 "generic shield": {
  "cost": 5
 },
 "generic sword": {
  "cost": 5
 },
 "generic tunic": {
  "cost": 10
 },
 "goggles": {
  "cost": 10
 },
 "gold belt": {
  "cost": 225
 },
 "gold gloves": {
  "cost": 75
 },
 "gold leggings": {
  "cost": 75
 },
 "gold sleeves": {
  "cost": 75
 },
 "heavy axe": {
  "cost": 225
 },
 "iron breastplate": {
  "cost": 500
 },
 "iron gloves": {
  "cost": 60
 },
 "iron helmet": {
  "cost": 250
 },
 "iron leggings": {
  "cost": 60
 },
 "iron shield": {
  "cost": 400
 },
 "iron sword": {
  "cost": 225
 },
 "leather belt": {
  "cost": 40
 },
 "leather gloves": {
  "cost": 25
 },
 "leather helmet": {
  "cost": 100
 },
 "leather jerkin": {
  "cost": 200
 },
 "leather leggings": {
  "cost": 10
 },
 "leather pants": {
  "cost": 25
 },
 "leather shield": {
  "cost": 150
 },
 "leather sleeves": {
  "cost": 10
 },
 "leather vest": {
  "cost": 200
 },
 "mithril breastplate": {
  "cost": 3000
 },
 "mithril gloves": {
  "cost": 150
 },
 "mithril helmet": {
  "cost": 1000
 },
 "mithril leggings": {
  "cost": 190
 },
 "mithril shield": {
  "cost": 560
 },
 "mithril sword": {
  "cost": 19600
 },
 "necklace of the dead": {
  "cost": 25
 },
 "newbie sword": {
  "cost": 15
 },
 "newbie vest": {
  "cost": 100
 },
 "nova armor": {
  "cost": 2000
 },
 "nova fists": {
  "cost": 220
 },
 "pelt": {
  "cost": 200
 },
 "pyramid studded necklace": {
  "cost": 190
 },
 "quarter staff": {
  "cost": 10
 },
 "redwood sword": {
  "cost": 625
 },
 "sash": {
  "cost": 225
 },
 "short sword": {
  "cost": 25
 },
 "silver belt": {
  "cost": 190
 },
 "silver gloves": {
  "cost": 60
 },
 "silver leggings": {
  "cost": 60
 },
 "silver sleeves": {
  "cost": 60
 },
 "spear": {
  "cost": 400
 },
 "steel gloves": {
  "cost": 90
 },
 "steel helmet": {
  "cost": 750
 },
 "steel leggings": {
  "cost": 90
 },
 "steel plate mail": {
  "cost": 890
 },
 "steel plate mail sleeves": {
  "cost": 105
 },
 "steel suit": {
  "cost": 1000
 },
 "steel sword": {
  "cost": 1935,
  "mod": 320
 },
 "vortan helmet": {
  "cost": 900
 },
 "vortan suit": {
  "cost": 2900
 },
 "vortanic blade": {
  "cost": 8100
 },
 "war axe": {
  "cost": 1600
 },
 "wizards cloak": {
  "cost": 400
 },
 "wizards gauntlets": {
  "cost": 25
 },
 "wooden crossbow": {
  "cost": 675,
  "mod": 230,
  "range": 4
 },
 "wooden dagger": {
  "cost": 5
 },
 "yew longbow": {
  "cost": 2115,
  "mod": 330,
  "range": 5
 },
 "yew staff": {
  "cost": 3135
 }
}

NEEDS = [
[
"air boots",
"STR",
30
],
[
"ash longbow",
"DEX",
15
],
[
"ash staff",
"INT",
15
],
[
"blade of light",
"STR",
30
],
[
"blood belt",
"STR",
30
],
[
"blood gloves",
"STR",
15
],
[
"blood helmet",
"STR",
45
],
[
"blood sleeves",
"STR",
15
],
[
"blood suit",
"STR",
45
],
[
"burn blade",
"STR",
15
],
[
"crystal helmet",
"STR",
15
],
[
"crystal suit",
"STR",
30
],
[
"crystal sword",
"STR",
15
],
[
"cutlas",
"STR",
30
],
[
"daedulus sword",
"STR",
30
],
[
"diamond belt",
"STR",
30
],
[
"diamond collar",
"STR",
30
],
[
"diamond facemask",
"STR",
30
],
[
"diamond gauntlets",
"STR",
30
],
[
"diamond helmet",
"STR",
45
],
[
"diamond leggings",
"STR",
15
],
[
"diamond sleeves",
"STR",
15
],
[
"diamond suit",
"STR",
45
],
[
"diamond sword",
"STR",
30
],
[
"elderwood bow",
"DEX",
30
],
[
"elderwood staff",
"INT",
30
],
[
"elven chain mail",
"STR",
15
],
[
"expert sword",
"STR",
15
],
[
"fire",
"STR",
30
],
[
"force field",
"STR",
15
],
[
"gaia skull",
"STR",
30
],
[
"gold belt",
"STR",
15
],
[
"gold gloves",
"STR",
15
],
[
"gold helmet",
"STR",
15
],
[
"gold leggings",
"STR",
15
],
[
"gold sleeves",
"STR",
15
],
[
"gold suit",
"STR",
15
],
[
"iron shield",
"STR",
15
],
[
"mithril breastplate",
"STR",
45
],
[
"mithril gloves",
"STR",
30
],
[
"mithril helmet",
"STR",
30
],
[
"mithril leggings",
"STR",
30
],
[
"mithril shield",
"STR",
30
],
[
"mithril sword",
"STR",
45
],
[
"nova armor",
"STR",
30
],
[
"nova fists",
"STR",
30
],
[
"platinum helmet",
"STR",
15
],
[
"platinum suit",
"STR",
15
],
[
"pyramid studded necklace",
"STR",
30
],
[
"redwood sword",
"STR",
15
],
[
"sash",
"STR",
15
],
[
"spear",
"DEX",
15
],
[
"steel gloves",
"STR",
15
],
[
"steel helmet",
"STR",
30
],
[
"steel leggings",
"STR",
15
],
[
"steel plate mail",
"STR",
15
],
[
"steel plate mail sleeves",
"STR",
15
],
[
"steel suit",
"STR",
15
],
[
"steel sword",
"STR",
15
],
[
"vortan helmet",
"STR",
30
],
[
"vortan suit",
"STR",
45
],
[
"vortanic blade",
"STR",
30
],
[
"war axe",
"STR",
15
],
[
"wooden crossbow",
"DEX",
15
],
[
"yew longbow",
"DEX",
15
],
[
"yew staff",
"INT",
30
]
]

changed = 0


def keep(path):
    rel = os.path.relpath(path, game)
    dest = os.path.join(backup, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(path, dest)


for name, new in sorted(CHANGES.items()):
    path = os.path.join(game, 'defItems', name)
    if not os.path.exists(path):
        print('  missing: ', name)
        continue
    raw = open(path, encoding='latin-1', newline='').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    lines = raw.split(nl)
    did = []
    for key, value in new.items():
        for i in range(len(lines) - 1):
            if lines[i].strip().lower() == key:
                if lines[i + 1].strip() != str(value):
                    did.append(f'{key} {lines[i + 1].strip()}->{value}')
                    lines[i + 1] = str(value)
                break
        else:
            print(f'  no {key}:   {name}')
    if did:
        changed += 1
        print(f'  change:   {name}: ' + ', '.join(did))
        if apply:
            keep(path)
            open(path, 'w', encoding='latin-1', newline='').write(nl.join(lines))

text = '# What stronger gear needs (fix_item_rebalance.py): item|STR, DEX or INT|points.\n' + ''.join(f'{n}|{s}|{v}\n' for n, s, v in NEEDS)
path = os.path.join(game, 'gearneeds')
old = open(path, encoding='latin-1').read() if os.path.exists(path) else None
if old != text:
    changed += 1
    print(f'  change:   gearneeds ({len(NEEDS)} items)')
    if apply:
        if old is not None:
            keep(path)
        open(path, 'w', encoding='latin-1').write(text)
print(('Changed ' if apply else 'Would change ') + f'{changed} file(s).' + ('' if apply else ' Run with --apply.'))
