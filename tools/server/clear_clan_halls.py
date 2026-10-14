#!/usr/bin/env python3
"""Empties the old clan halls so new clans can claim them.

    python3 clear_clan_halls.py <game dir> [--apply]

The halls (HAOD-AC, the two MTH halls, Aop, DD, "of the Dead"; TFAWC's
door is a tree now and its hall is gone) are found on the map: each is
the walkable ground reached from inside its door without crossing the
door, plus the walls round it and a few squares named below (plaques by
the doors, Shifty01's casino behind a teleport). In them, everything goes:
props, signs, shops, monsters, walk-on scripts (room locks for old
members, healing beds, the casino, teleports) and who-may-step rules.
What's put back:
  - every old door: a message that the hall is empty and can be claimed
  - the MTH back alleys' thieves stay, and now rob everyone (MTH is gone)
  - "of the Dead": its door square's teleport to the hall at 29,484
  - DD's hall had no door, only a teleport for DD members: it now takes
    anyone in, and a square inside leads back out

Without --apply it only lists what it would do. With it, every file it
touches is copied to backups/clan-halls-<time>/ first. The server reads
props, signs, merchants and mobs at startup and writes them back on a god
save, so: apply, then restart, with no save in between.
"""
import os
import shutil
import struct
import sys
import time
from collections import deque

CLAIM = (' This clan hall stands empty. It can be claimed by a new clan:'
         ' ask a god.')

# name: (a square inside, its doors, extra squares (x0, y0, x1, y1))
HALLS = {
    'HAOD-AC': ((97, 86), [(96, 87), (97, 87), (98, 87), (105, 82), (105, 83)],
                [(87, 70, 89, 76), (89, 81, 89, 81)]),
    'MTH (north)': ((413, 29), [(414, 29), (414, 30)], [(415, 31, 415, 31)]),
    'MTH (den)': ((138, 891), [(137, 890), (137, 891), (137, 892)], [(135, 890, 135, 892)]),
    'Aop': ((173, 131), [(172, 131), (172, 137), (10, 12)], [(168, 132, 168, 132), (168, 136, 168, 136)]),
    'DD': ((945, 55), [], []),
    'of the Dead': ((110, 193), [(109, 193)], []),
    'TFAWC': (None, [(140, 18)], []),
}

THIEF = ('if ispet trigger\nendscript\nend\n'
         'if < trigger cash 100\n'
         'chat trigger "The thieves turn out your pockets and take every coin you have."\n'
         'set trigger cash 0\nendscript\nend\n'
         'chat trigger "A thief brushes past you. You are 100 gp lighter."\n'
         'inc trigger cash -100\nendscript\n')
THIEF_SQUARES = {(125, 884), (125, 887), (127, 879), (130, 894), (131, 876), (131, 884), (132, 890),
                 (132, 892), (133, 878), (133, 885), (136, 898), (141, 894), (146, 895)}

DD_HALL = (945, 55)
DD_WAY_IN = [(100, 28), (954, 56)]
DD_WAY_OUT = (944, 58)
DD_OUTSIDE = (101, 28)

KEEP = {(112, 193): 'set trigger locxy 29 484\nendscript\n'}  # of the Dead: into the hall


def door_script():
    return 'if ispet trigger\nendscript\nend\nchat trigger "%s"\nendscript\n' % CLAIM


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    game, apply = sys.argv[1], '--apply' in sys.argv
    os.chdir(game)

    data = open('shortmap', 'rb').read()
    cols, rows = struct.unpack_from('>ii', data, 0)
    tile = lambda x, y: struct.unpack_from('>h', data, 8 + 2 * (x * rows + y))[0] if 0 <= x < cols and 0 <= y < rows else -1
    walk = set()
    for f in os.listdir('defTileScripts'):
        if f.isdigit() and open('defTileScripts/' + f, encoding='latin-1').read().strip() == 'true':
            walk.add(int(f))

    # Each hall's squares.
    squares = {}
    for name, (start, doors, extras) in HALLS.items():
        sq = set()
        if start:
            seen, q = {start}, deque([start])
            while q:
                x, y = q.popleft()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    n = (x + dx, y + dy)
                    if n in seen or n in doors or tile(*n) not in walk:
                        continue
                    seen.add(n)
                    q.append(n)
                if len(seen) > 2000:
                    sys.exit('%s: the hall leaks out (more than 2000 squares)' % name)
            sq = set(seen)
            for x, y in seen:  # and the walls round it
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        if tile(x + dx, y + dy) not in walk:
                            sq.add((x + dx, y + dy))
        for x0, y0, x1, y1 in extras:
            sq |= {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}
        sq -= set(doors)
        squares[name] = sq
    hall_of = {}
    for name, sq in squares.items():
        for s in sq:
            hall_of[s] = name
    doors = {d: name for name, (_, ds, _) in HALLS.items() for d in ds}

    stamp = time.strftime('%Y%m%d-%H%M%S')
    backup = 'backups/clan-halls-' + stamp
    said = []

    def save(path, text):
        if not apply:
            return
        if os.path.exists(path):
            dest = os.path.join(backup, path)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if not os.path.exists(dest):
                shutil.copy2(path, dest)
        with open(path, 'w', encoding='latin-1') as f:
            f.write(text)

    def remove(path):
        if not os.path.exists(path):
            return
        if apply:
            dest = os.path.join(backup, path)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.move(path, dest)

    def read(path):
        with open(path, encoding='latin-1') as f:
            return f.read().replace('\r', '')

    def num(s):
        s = s.strip()
        return int(s) if s.lstrip('-').isdigit() else None

    # Entry files: (file, lines per entry, where x and y are, what to keep).
    def entries(path, size, xi, yi, label, keep=lambda e: False):
        lines = read(path).split('\n')
        out, gone, i = [], [], 0
        while i < len(lines):
            e = lines[i:i + size]
            if len(e) == size and num(e[xi]) is not None and num(e[yi]) is not None:
                at = (num(e[xi]), num(e[yi]))
                if at in hall_of and not keep(e):
                    gone.append((hall_of[at], at, ' / '.join(l for k, l in enumerate(e) if k not in (xi, yi))))
                    i += size
                    continue
            out.append(lines[i])
            i += 1
        for h, at, what in gone:
            said.append('  %-12s %s %d,%d  %s' % (h, label, at[0], at[1], what[:70]))
        if gone:
            save(path, '\n'.join(out))
        return len(gone)

    counts = {}
    counts['props'] = entries('props', 3, 1, 2, 'prop', keep=lambda e: e[0] == 'thief')
    counts['signs'] = entries('signs', 3, 1, 2, 'sign')
    if os.path.exists('signnames'):
        counts['sign names'] = entries('signnames', 3, 0, 1, 'signname')
    counts['monsters'] = entries('mobs', 4, 2, 3, 'monster')

    # Shops: name, x, y, wares..., end.
    lines = read('merchants').split('\n')
    out, gone, i = [], 0, 0
    while i < len(lines):
        if i + 2 < len(lines) and lines[i][:1].isalpha() and lines[i] != 'end' and num(lines[i + 1]) is not None and num(lines[i + 2]) is not None:
            at = (num(lines[i + 1]), num(lines[i + 2]))
            j = i + 3
            while j < len(lines) and lines[j] != 'end':
                j += 1
            if at in hall_of:
                said.append('  %-12s shop %d,%d  %s' % (hall_of[at], at[0], at[1], ', '.join(lines[i + 3:j])[:70]))
                gone += 1
                i = j + 1
                continue
            out.extend(lines[i:j + 1])
            i = j + 1
            continue
        out.append(lines[i])
        i += 1
    if gone:
        save('merchants', '\n'.join(out))
    counts['shops'] = gone

    # Walk-on scripts and who-may-step rules.
    def script_files(x, y):
        return ['defMoveActions/%d_%d' % (x, y), 'defMoveActions/%d_%d.dsko' % (x, y),
                'tileactions/%d_%d.json' % (x, y)]

    def put(x, y, text, why):
        for p in script_files(x, y)[1:]:
            remove(p)
        save('defMoveActions/%d_%d' % (x, y), text)
        said.append('  %-12s square %d,%d  %s' % ('MTH alleys' if (x, y) in THIEF_SQUARES else hall_of.get((x, y)) or doors.get((x, y), 'DD'), x, y, why))

    acts = gone_acts = 0
    for f in sorted(os.listdir('defMoveActions')):
        p = f.split('_')
        if len(p) != 2 or not all(s.isdigit() for s in p):
            continue
        at = (int(p[0]), int(p[1]))
        if at in KEEP or at in THIEF_SQUARES or at == DD_WAY_OUT:
            continue
        if at in hall_of:
            first = read('defMoveActions/' + f).strip().split('\n')[0][:60]
            for path in script_files(*at):
                remove(path)
            said.append('  %-12s script %d,%d gone  (%s)' % (hall_of[at], at[0], at[1], first))
            gone_acts += 1
    for f in sorted(os.listdir('defCanMoveScripts')):
        p = f.split('_')
        if len(p) == 2 and all(s.isdigit() for s in p) and (int(p[0]), int(p[1])) in hall_of:
            remove('defCanMoveScripts/' + f)
            said.append('  %-12s walk rule %s gone' % (hall_of[(int(p[0]), int(p[1]))], f))
            gone_acts += 1
    for f in sorted(os.listdir('tileactions')):
        p = f.split('.')[0].split('_')
        if f.endswith('.block') and len(p) == 2 and all(s.isdigit() for s in p) and (int(p[0]), int(p[1])) in hall_of:
            remove('tileactions/' + f)
    counts['scripts and walk rules removed'] = gone_acts

    for d, name in doors.items():
        if name != 'DD':
            put(*d, door_script(), 'door: "can be claimed"')
            acts += 1
    for s in sorted(THIEF_SQUARES):
        put(*s, THIEF, 'thief: robs everyone')
        acts += 1
    for s in DD_WAY_IN:
        put(*s, 'if ispet trigger\nendscript\nend\nset trigger locxy %d %d\nchat trigger "%s"\nendscript\n' % (DD_HALL[0], DD_HALL[1], CLAIM.strip()), 'into the DD hall')
        acts += 1
    put(*DD_WAY_OUT, 'set trigger locxy %d %d\nchat trigger "You step back out into the open."\nendscript\n' % DD_OUTSIDE, 'way out of the DD hall')
    acts += 1
    signs = read('signs')  # (already without the halls' signs, once applied)
    save('signs', signs.rstrip('\n') + '\nWay out\n%d\n%d\n' % (DD_WAY_OUT[0], DD_WAY_OUT[1] - 1))
    said.append('  DD           sign %d,%d  Way out' % (DD_WAY_OUT[0], DD_WAY_OUT[1] - 1))
    counts['scripts written'] = acts

    print(('Cleared' if apply else 'Would clear') + ' the clan halls' + (' (backups in %s)' % backup if apply else ''))
    for name, sq in squares.items():
        print('  %-12s %d squares' % (name, len(sq)))
    for k, v in counts.items():
        print('  %s: %d' % (k, v))
    print('\n'.join(said))


if __name__ == '__main__':
    main()
