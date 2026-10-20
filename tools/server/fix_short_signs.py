#!/usr/bin/env python3
"""Shorter signs (the user, 2026-10-20: directions were far too long to
read). Kingshaven's Grand Plaza sign and its five signposts, and two of
Velkarath's tunnel signs (capital.mjs SIGNPOSTS and the plaza SIGN,
velkarath.mjs say the same).

    python3 fix_short_signs.py <game dir> [--apply]

Without --apply it says what it would change. The signs file is copied to
<game dir>/backups/short-signs-<time>/ first. Running it twice changes
nothing. Signs are read at start-up: restart after it.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
SWAPS = [
    ("The Grand Plaza of Kingshaven. The keep is to the north-west, the cathedral to the north-east, and the grand plaza where the avenues cross. Shops and the bank are round the plaza, the market south-west of it, the inns and taverns all over, and the harbour through the south gate.",
     "The Grand Plaza of Kingshaven. The keep is north-west, the cathedral north-east, the harbour through the south gate."),
    ("North up the avenue: the keep, the cathedral and the north gate (the farms, and the stray hounds' meadow). East: the bounty board, the bank, and the east gate with Sergeant Wexley's Watch post outside it. South: the market, the south gate and the harbour (the ferries). West: Lantern Row and the west gate.",
     "North: keep, cathedral, north gate. East: bounty board, bank, east gate. South: market, south gate, harbour. West: Lantern Row, west gate."),
    ("North: the north gate, and the road west to the farms and the stray hounds' meadow. West along this street: the Royal Keep. East: the Cathedral of Light. South: the Grand Plaza.",
     "North: the north gate and the farms. West: the Royal Keep. East: the Cathedral. South: the Grand Plaza."),
    ("West: the west gate and the west landing. North up this street: Lantern Row. South: the Market Square and the Drunken Dragon. East: the Grand Plaza.",
     "West: the west gate and landing. North: Lantern Row. South: the Market Square. East: the Grand Plaza."),
    ("East: the east gate. Sergeant Wexley's Watch post is just outside, north of the road behind the first houses. North up this street: the Cathedral of Light. South: the Warriors' Guild. West: the Grand Plaza.",
     "East: the east gate, Sergeant Wexley's post just outside. North: the Cathedral. South: the Warriors' Guild. West: the Grand Plaza."),
    ("South: the south gate and the harbour. The ferries leave from the longest pier. West along this street: the Market Square and the Drunken Dragon. East: the Warriors' Guild. North: the Grand Plaza.",
     "South: the south gate and the harbour. West: the Market Square. East: the Warriors' Guild. North: the Grand Plaza."),
    ("The west stair: up to the surface beside Aelindor, city of the elves. Ships sail from Aelindor Landing, north of it, to Westsea Harbour and Eastreach.",
     "The west stair: up beside Aelindor, whose ships sail from Aelindor Landing."),
    ("The east stair: up into the eastern hills. Eastreach, the surface folk's new town, is a long walk east from the top.",
     "The east stair: up into the hills. Eastreach is a long walk east."),
]

path = os.path.join(game, 'signs')
old = open(path, encoding='latin-1', newline='').read()
new = old
for a, b in SWAPS:
    if a in new:
        new = new.replace(a, b); print('  change:  ', b[:60])
    elif b in new:
        print('  as it is:', b[:60])
    else:
        print('  missing: ', a[:60])
if new != old and apply:
    keep = os.path.join(game, 'backups', time.strftime('short-signs-%Y%m%d-%H%M%S'))
    os.makedirs(keep, exist_ok=True)
    shutil.copy2(path, keep)
    open(path, 'w', encoding='latin-1', newline='').write(new)
print('Applied.' if apply and new != old else 'Nothing changed.' if new == old else 'Run with --apply.')
