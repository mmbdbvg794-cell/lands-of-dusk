#!/usr/bin/env python3
"""The Bank of Velkarath's counter runs wall to wall (play-test 6). It
stopped two squares short of each side wall, and the gaps led into the
room behind it: a dead end that looked like a way through. The tester,
heading south, walked round the counter and spent ten minutes against the
back walls. The teller still answers across the counter (tellers can be
talked to from 5 squares, server/Props.java TELLER_REACH). velkarath.mjs
says the same.

    python3 fix_velkarath_bank.py <game dir> [--apply]

Without --apply it says what it would change. The map is copied to
<game dir>/backups/velkarath-bank-<time>/ first. Running it twice changes
nothing. The map is read at start-up: restart after it (no god "save" in
between).
"""
import os, shutil, struct, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('velkarath-bank-%Y%m%d-%H%M%S'))

COUNTER, FLOOR = 58, 42
GAPS = [(1353, 927), (1354, 927), (1362, 927), (1363, 927)]

path = os.path.join(game, 'shortmap')
data = bytearray(open(path, 'rb').read())
w, h = struct.unpack('>ii', data[:8])
todo = []
for x, y in GAPS:
    at = 8 + (x * h + y) * 2
    now = struct.unpack('>H', data[at:at + 2])[0]
    if now == COUNTER:
        continue
    if now != FLOOR:
        print(f'  left:     {x},{y} is tile {now}, not the bank floor')
        continue
    todo.append(at)
    print(f'  change:   {x},{y} floor -> counter')
if todo and apply:
    os.makedirs(backup, exist_ok=True)
    shutil.copy2(path, os.path.join(backup, 'shortmap'))
    for at in todo:
        data[at:at + 2] = struct.pack('>H', COUNTER)
    open(path, 'wb').write(data)
print(('Changed ' if apply else 'Would change ') + f'{len(todo)} square(s).' + ('' if apply or not todo else ' Run with --apply.'))
