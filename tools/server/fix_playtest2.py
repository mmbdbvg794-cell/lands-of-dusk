#!/usr/bin/env python3
"""Fixes from the second AI play-test (2026-10-19, ~/dusk-playtest):

  - the ferry fare 50 -> 20 gp, in the five captains' conversations (their
    scripts and the dialogue editor's copies; tools/world/cities/ferry.mjs
    FARE is 20 too, for the next rebuild)
  - the map: the tree in front of Hilda's door (1411,299) and the two in
    front of Old Fisher Tam's (1457,413 and 1458,413) become grass, so both
    houses can be walked into
  - the "sales list" prop in every Kingshaven shop: a general line, not the
    2003 potion prices (fix_playtest.py had put those there)
  - leather gloves 104 -> 30 gp (1 point of armour)
  - the hounds' directions: Sergeant Wexley's quest (his conversation and
    quests/kw_strays.json; tools/world/cities/kingswatch.mjs says the same,
    but can't be rebuilt over the map now that its Watch Post is built),
    and the journal's old lines (the city installer only adds missing
    ones); the bounty notices are reinstalled from bounties.mjs
  - a signpost outside the north gate (1435,318) pointing to the hounds

    python3 fix_playtest2.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest2-<time>/ first; a script's compiled
.dsko is removed so the game compiles it again. Running it twice changes
nothing the second time. Restart afterwards (the map is read at start-up,
and written back by a god's "save": none in between).
"""
import os, shutil, struct, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest2-%Y%m%d-%H%M%S'))
changed = []


def keep(rel, path):
    dest = os.path.join(backup, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(path, dest)


def edit(rel, fn):
    path = os.path.join(game, rel)
    old = open(path, encoding='latin-1', newline='').read()  # line endings kept as they are
    new = fn(old)
    if new == old:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  change:  ', rel)
    if not apply:
        return
    keep(rel, path)
    open(path, 'w', encoding='latin-1', newline='').write(new)
    if os.path.exists(path + '.dsko'):
        os.remove(path + '.dsko')


def swap(*pairs):
    def fn(s):
        for a, b in pairs:
            s = s.replace(a, b)
        return s
    return fn


def set_value(s, key, value):
    lines = s.splitlines(keepends=True)
    for i in range(len(lines) - 1):
        if lines[i].rstrip('\r\n') == key:
            end = lines[i + 1][len(lines[i + 1].rstrip('\r\n')):]
            lines[i + 1] = f'{value}{end}'
            break
    return ''.join(lines)


# ---- the fare ----
CAPTAINS = ['Captain Brann', 'Captain Sskarr', 'Captain Rowan', 'Captain Hale', 'Captain Liriel']
FARE = swap(
    ('A ticket is 50 gold.', 'A ticket is 20 gold.'),
    ('if < trigger cash 50\n', 'if < trigger cash 20\n'),
    ("It's 50 gp.", "It's 20 gp."),
    ('inc trigger cash - 0 50\n', 'inc trigger cash - 0 20\n'),
    ('"value":"50"', '"value":"20"'),
    ('"amount":50', '"amount":20'),
)

# ---- the map ----
GRASS = {(1411, 299): 1, (1457, 413): 36, (1458, 413): 36}  # meadow by Hilda's, grass by Tam's
TREES = {25, 26, 64, 103}  # only a tree is turned to grass


def fix_map():
    rel = 'shortmap'
    path = os.path.join(game, rel)
    data = bytearray(open(path, 'rb').read())
    w, h = struct.unpack('>ii', data[:8])
    todo = []
    for (x, y), tile in GRASS.items():
        at = 8 + (x * h + y) * 2
        now = struct.unpack('>H', data[at:at + 2])[0]
        if now == tile:
            continue
        if now not in TREES:
            print(f'  left:     {x},{y} is tile {now}, not a tree')
            continue
        todo.append((x, y, at, now, tile))
    if not todo:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  change:  ', rel, ', '.join(f'{x},{y} {now}->{tile}' for x, y, _, now, tile in todo))
    if not apply:
        return
    keep(rel, path)
    for _, _, at, _, tile in todo:
        data[at:at + 2] = struct.pack('>H', tile)
    open(path, 'wb').write(bytes(data))


SALES = '''image
1
description
A price list. Stand at the counter, on the shopkeeper's square, to see what's for sale and what it costs
'''

HOUNDS_OLD = 'in the meadow north of the farms'
HOUNDS_NEW = "in the meadow behind Hilda's farm, out of the north gate and west along the road"
WEXLEY_OLD = "Kill 5 stray hounds in the fields north of Kingshaven's farms."
WEXLEY_NEW = "Kill 5 stray hounds in the meadow behind Hilda's farm (out of Kingshaven's north gate, then west along the road)."

WEX = swap(
    ("Go out past the farms to the north.", "Out of the north gate and west along the road: they're in the meadow behind Hilda's farm, the last farmhouse."),
    ("The hounds are still at the farms, north of the walls.", "The hounds are still in the meadow behind Hilda's farm: out of the north gate, then west along the road."),
    (WEXLEY_OLD, WEXLEY_NEW),
)

# A signpost outside the north gate (signs: text, x, y; signnames: x, y, name).
SIGN_TEXT = "West along the road: the farms. Stray hounds have been seen in the meadow behind Hilda's farm, the last farmhouse."
SIGN_AT = (1435, 318)


def add_sign(s):
    if SIGN_TEXT in s:
        return s
    return s + ('' if s.endswith('\n') else '\n') + f'{SIGN_TEXT}\n{SIGN_AT[0]}\n{SIGN_AT[1]}\n'


def add_sign_name(s):
    entry = f'{SIGN_AT[0]}\n{SIGN_AT[1]}\nSignpost\n'
    if entry in s:
        return s
    return s + ('' if s.endswith('\n') or not s else '\n') + entry


print('Fixes from play-test 2, in', game, '' if apply else '(dry run: add --apply)')
for c in CAPTAINS:
    for rel in (f'talk/{c}', f'talk/{c}.dlg'):
        edit(rel, FARE)
fix_map()
edit('defProps/sales list', lambda s: SALES)
edit('defItems/leather gloves', lambda s: set_value(s, 'cost', 30))
edit('journal', swap((HOUNDS_OLD, HOUNDS_NEW), (WEXLEY_OLD, WEXLEY_NEW)))
for rel in ('talk/Sergeant Wexley', 'talk/Sergeant Wexley.dlg', 'quests/kw_strays.json'):
    edit(rel, WEX)
edit('signs', add_sign)
edit('signnames', add_sign_name)
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
