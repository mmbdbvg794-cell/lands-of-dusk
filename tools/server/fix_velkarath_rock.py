#!/usr/bin/env python3
"""Velkarath's rock as grey fieldstone. Its cave walls were tile 49, which
both art styles draw as a cobbled floor (run 7's tester took them for
street); they become 98, the old world's rock face, and the torches on them
(167, lights-velkarath.mjs) the same torch on 98 (162). Only inside the
underground block (1260-1429, 850-989): the old world's cliffs keep 49.
velkarath.mjs does the same.

    python3 fix_velkarath_rock.py <game dir> [--apply]

Without --apply it says what it would change. The map is copied to
<game dir>/backups/velkarath-rock-<time>/ first. Running it twice changes
nothing. The map is read at start-up: restart after it (no god "save" in
between).
"""
import os, shutil, struct, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('velkarath-rock-%Y%m%d-%H%M%S'))

SWAP = {49: 98, 167: 162}
path = os.path.join(game, 'shortmap')
data = bytearray(open(path, 'rb').read())
w, h = struct.unpack('>ii', data[:8])
count = {t: 0 for t in SWAP}
for x in range(1260, 1430):
    for y in range(850, 990):
        at = 8 + (x * h + y) * 2
        t = struct.unpack('>h', data[at:at + 2])[0]
        if t in SWAP:
            count[t] += 1
            data[at:at + 2] = struct.pack('>h', SWAP[t])
for t, n in count.items():
    print(f'  {n} squares of {t} -> {SWAP[t]}')
if apply and any(count.values()):
    os.makedirs(backup, exist_ok=True)
    shutil.copy2(path, os.path.join(backup, 'shortmap'))
    open(path, 'wb').write(data)
print(('Changed ' if apply else 'Would change ') + f'{sum(count.values())} square(s).' + ('' if apply or not any(count.values()) else ' Run with --apply.'))
