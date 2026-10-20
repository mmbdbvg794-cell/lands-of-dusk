#!/usr/bin/env python3
"""Signposts in Kingshaven, from the fifth AI play-test (2026-10-20): the
avenues dead-end at the fountain and the keep, and nothing said which
street leads to which gate. capital.mjs places the same signposts.

  - one by the arrival square on the plaza (1440,352): what lies each way
  - one where each avenue meets the cross street round the plaza: north
    (keep, cathedral, north gate), west (west gate, Lantern Row, market),
    east (east gate and Wexley's post), south (south gate, harbour)
  - the Royal Keep's sign said King Aldric holds court within: Lord
    Steward Halvard governs there in Princess Elowen's name (the canon)

Each signpost stands at the corner of a crossing, off the lanes people
walk.

    python3 fix_kingshaven_signs.py <game dir> [--apply]

Without --apply it says what it would change. Changed files are copied to
<game dir>/backups/kingshaven-signs-<time>/ first. Running it twice changes
nothing. The signs are read at start-up: restart after it.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('kingshaven-signs-%Y%m%d-%H%M%S'))
changed = []

# text, x, y (capital.mjs SIGNPOSTS)
SIGNPOSTS = [
    ('North up the avenue: the keep, the cathedral and the north gate (the farms, and the stray hounds\' meadow). '
     'East: the bounty board, the bank, and the east gate with Sergeant Wexley\'s Watch post outside it. '
     'South: the market, the south gate and the harbour (the ferries). West: Lantern Row and the west gate.', 1441, 351),
    ('North: the north gate, and the road west to the farms and the stray hounds\' meadow. '
     'West along this street: the Royal Keep. East: the Cathedral of Light. South: the Grand Plaza.', 1433, 340),
    ('West: the west gate and the west landing. North up this street: Lantern Row. '
     'South: the Market Square and the Drunken Dragon. East: the Grand Plaza.', 1413, 356),
    ('East: the east gate. Sergeant Wexley\'s Watch post is just outside, north of the road behind the first houses. '
     'North up this street: the Cathedral of Light. South: the Warriors\' Guild. West: the Grand Plaza.', 1459, 360),
    ('South: the south gate and the harbour. The ferries leave from the longest pier. '
     'West along this street: the Market Square and the Drunken Dragon. East: the Warriors\' Guild. North: the Grand Plaza.', 1438, 375),
]
KEEP = ('The Royal Keep of Kingshaven. King Aldric holds court within.',
        'The Royal Keep of Kingshaven. Lord Steward Halvard governs here in Princess Elowen\'s name.')


def edit(rel, fn):
    path = os.path.join(game, rel)
    old = open(path, encoding='latin-1', newline='').read()
    new = fn(old)
    if new == old:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  change:  ', rel)
    if not apply:
        return
    dest = os.path.join(backup, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(path, dest)
    open(path, 'w', encoding='latin-1', newline='').write(new)


def append(entry):
    # An entry at the end of the signs or signnames file.
    def fn(s):
        if entry in s:
            return s
        return s + ('' if s.endswith('\n') or not s else '\n') + entry
    return fn


def signs(s):
    s = s.replace(KEEP[0], KEEP[1])
    for text, x, y in SIGNPOSTS:
        s = append(f'{text}\n{x}\n{y}\n')(s)
    return s


def signnames(s):
    for _, x, y in SIGNPOSTS:
        s = append(f'{x}\n{y}\nSignpost\n')(s)
    return s


edit('signs', signs)
edit('signnames', signnames)
print(('Changed ' if apply else 'Would change ') + f'{len(changed)} file(s).' + ('' if apply else ' Run with --apply.'))
