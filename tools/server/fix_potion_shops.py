#!/usr/bin/env python3
"""Potions in every town (2026-10-26): each race's home alchemist sells the
whole healing and mana ladder (minor, regular, strong); rejuvenation stays
in the big markets (Kingshaven, Ssarakh, Southfield); the old world's
towns sell minor and regular healing and mana at a food stall; Greystone
Mine the minor ones at Dagna's. Midnight is left alone (kept a mystery).

    python3 fix_potion_shops.py <game dir> [--apply]

Without --apply it says what it would change. The merchants file is copied
to <game dir>/backups/potion-shops-<time>/ first. Running it twice changes
nothing. Shops are read at start-up: restart after it.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('potion-shops-%Y%m%d-%H%M%S'))
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


LADDER = ['minor healing potion', 'healing potion', 'minor mana potion', 'mana potion']
SHOPS = [
    (487, 1252, ['healing potion', 'strong mana potion']),   # Aelindor, Miriel's Herbs
    (1317, 925, ['strong mana potion']),                     # Velkarath, Szinra's Alchemy
    (1700, 944, ['healing potion']),                         # Ssarakh's potions
    (526, 5, LADDER),                                        # Southfield
    (144, 381, LADDER),                                      # Westsea Harbour, the Quartermaster
    (110, 141, LADDER),                                      # the City of Light, a food stall
    (29, 40, LADDER),                                        # Troll's Head, a food stall
    (291, 151, LADDER),                                      # the Sabin mill town, a food stall
    (876, 204, ['minor healing potion', 'minor mana potion']),  # Greystone Mine, Dagna's Kitchen
]

print('Potions in every town, in', game, '' if apply else '(dry run: add --apply)')
for x, y, wares in SHOPS:
    edit('merchants', add_wares(x, y, wares))
print(f'{len(set(changed))} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
