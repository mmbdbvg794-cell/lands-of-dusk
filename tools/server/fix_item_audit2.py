#!/usr/bin/env python3
"""The second item audit's fixes (2026-10-26):

  - a medium-tier armour set sold in each race's home town, priced 25 gp
    per real armour point like the Royal Armoury, gated like gold (15):
      Aelindor, Caelum's (beside the elven chain mail): leafsilver helm,
        belt, sleeves, leggings, gloves; DEX 15
      Velkarath, the Night Market: shadowsteel cuirass, helm, belt,
        sleeves, leggings, gloves; DEX 15
      Ssarakh, the leather shop: swampscale hauberk, helm, belt, sleeves,
        leggings, gloves; STR 15
    and the elven chain mail needs DEX 15 now, not STR (elves have no STR
    bonus; it's the elves' own set)
  - the ash staff (INT 15) in a shop for casters: Tome and Wand
    (Kingshaven), Caelum's, Ryld's Blades, Ssarakh's weapon shop
  - tiny potion 50 -> 25 gp (minor potion heals more for 50), red potion
    2000 -> 1200, mushroom 20 -> 10 (the same as an apple)
  - the set boxes cost what their pieces do: crystal box 2565, bloody book
    6815, nova package 3410 (were 250000, 500000, 310000)

    python3 fix_item_audit2.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/item-audit2-<time>/ first. Running it twice
changes nothing the second time. Shops are read at start-up: restart after
it. Prices are read whenever a shop list is built; gearneeds when it changes.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('item-audit2-%Y%m%d-%H%M%S'))
changed = []


def edit(rel, fn, create=False):
    path = os.path.join(game, rel)
    if not os.path.exists(path) and not create:
        print('  missing: ', rel)
        return
    old = open(path, encoding='latin-1', newline='').read() if os.path.exists(path) else None
    new = fn(old or '')
    if new == old:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  new:     ' if old is None else '  change:  ', rel)
    if not apply:
        return
    dest = os.path.join(backup, rel)
    if old is not None and not os.path.exists(dest):  # the first copy only (merchants changes seven times)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(path, dest)
    open(path, 'w', encoding='latin-1', newline='').write(new)


def set_value(key, value):
    def fn(s):
        lines = s.splitlines(keepends=True)
        for i in range(len(lines) - 1):
            if lines[i].rstrip('\r\n').lower() == key:
                end = lines[i + 1][len(lines[i + 1].rstrip('\r\n')):]
                lines[i + 1] = f'{value}{end}'
                break
        return ''.join(lines)
    return fn


def add_wares(x, y, wares):
    # Wares go in before the "end" of the shop standing at x,y.
    def fn(s):
        lines = s.split('\n')
        for i in range(1, len(lines) - 1):
            if lines[i].strip() == str(x) and lines[i + 1].strip() == str(y):
                j = i + 2
                while lines[j].strip() != 'end':
                    j += 1
                have = {l.strip().lower() for l in lines[i + 2:j]}
                lines[j:j] = [w for w in wares if w not in have]
                return '\n'.join(lines)
        print(f'  NO SHOP at {x},{y}')
        return s
    return fn


def needs(entries):
    # gearneeds lines "item|STAT|n": replace an item's line, or add it.
    def fn(s):
        lines = s.rstrip('\n').split('\n')
        for name, stat, n in entries:
            line = f'{name}|{stat}|{n}'
            at = [i for i, l in enumerate(lines) if l.split('|')[0] == name]
            if at:
                lines[at[0]] = line
            else:
                lines.append(line)
        return '\n'.join(lines) + '\n'
    return fn


def item(desc, kind, mod, cost):
    # The same fields, order and CRLF endings as the gold set's files.
    return '\r\n'.join(['type', 'armor', 'kind', kind, 'description', desc, 'cost', str(cost),
                        'mod', str(mod), 'image', '7', 'durability', '3600', '.', ''])


# Medium tier: torso 80, the rest 60; cost 25 gp per real point (torso
# 0.4, skull 0.2, waist 0.15, the rest 0.05).
PIECES = [('torso', 80, 800), ('skull', 60, 300), ('waist', 60, 225), ('arms', 60, 75), ('legs', 60, 75), ('hands', 60, 75)]
SETS = {
    'leafsilver': ('DEX', 449, 1252, {
        'skull': ('leafsilver helm', 'an elven helm of leafsilver, light as a leaf'),
        'waist': ('leafsilver belt', 'a belt of leafsilver links'),
        'arms': ('leafsilver sleeves', 'sleeves of fine leafsilver mail'),
        'legs': ('leafsilver leggings', 'leggings of fine leafsilver mail'),
        'hands': ('leafsilver gloves', 'gloves backed with leafsilver'),
    }),
    'shadowsteel': ('DEX', 1352, 943, {
        'torso': ('shadowsteel cuirass', 'a cuirass of dark drow steel, quiet when you move'),
        'skull': ('shadowsteel helm', 'a close helm of dark drow steel'),
        'waist': ('shadowsteel belt', 'a belt of dark drow steel plates'),
        'arms': ('shadowsteel sleeves', 'sleeves of dark drow steel'),
        'legs': ('shadowsteel leggings', 'leggings of dark drow steel'),
        'hands': ('shadowsteel gloves', 'gloves of dark drow steel'),
    }),
    'swampscale': ('STR', 1700, 938, {
        'torso': ('swampscale hauberk', 'a hauberk of hard marsh scales, sewn on thick hide'),
        'skull': ('swampscale helm', 'a helm of overlapping marsh scales'),
        'waist': ('swampscale belt', 'a hide belt set with marsh scales'),
        'arms': ('swampscale sleeves', 'sleeves of marsh scales on hide'),
        'legs': ('swampscale leggings', 'leggings of marsh scales on hide'),
        'hands': ('swampscale gloves', 'scaled gloves of marsh hide'),
    }),
}
STAFF_SHOPS = [(1417, 371), (449, 1252), (1331, 925), (1690, 944)]
PRICES = {'tiny potion': 25, 'red potion': 1200, 'mushroom': 10,
          'crystal box': 2565, 'bloody book': 6815, 'nova package': 3410}

print('Item audit 2 fixes, in', game, '' if apply else '(dry run: add --apply)')
gear = []
for (stat, x, y, pieces) in SETS.values():
    names = []
    for kind, mod, cost in PIECES:
        if kind not in pieces:
            continue
        name, desc = pieces[kind]
        edit(f'defItems/{name}', lambda s, t=item(desc, kind, mod, cost): t, create=True)
        names.append(name)
        gear.append((name, stat, 15))
    edit('merchants', add_wares(x, y, names))
gear.append(('elven chain mail', 'DEX', 15))
edit('gearneeds', needs(gear))
for x, y in STAFF_SHOPS:
    edit('merchants', add_wares(x, y, ['ash staff']))
for name, cost in PRICES.items():
    edit(f'defItems/{name}', set_value('cost', cost))
print(f'{len(set(changed))} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
