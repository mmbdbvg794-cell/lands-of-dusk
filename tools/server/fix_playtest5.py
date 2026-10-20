#!/usr/bin/env python3
"""Fixes from the fifth AI play-test (2026-10-20, a human Ranger, ~/dusk-playtest
archive/run5). The plans (capital, kingswatch, bounties, eastreach .mjs) say
the same; this script changes the live files directly:

  - the cathedral altar (defMoveActions/1460_329) took 25 gold from anyone
    who stepped on it, at full health too: it sits on the way up to the
    priestess, and the tester paid twice just walking through. Now it heals
    for 5 gold, and only someone hurt or short of mana
  - Sergeant Wexley's Watch post is behind the houses north of the east
    road, and nothing on the road said so (the tester searched the hamlet
    and gave up): a signpost on the road at the lane, the east gate guard
    points the way, and the arrival line and journal say where (and "her":
    Wexley is a woman)
  - "the meadow behind Hilda's farm, the last farmhouse": there is no
    Hilda's farm (a townsperson called Hilda lives in a cottage), the last
    farm is Farmer Hollin's, and the meadow is only reached by the lane
    beside it. Every text now says the lane beside Farmer Hollin's, a
    signpost stands at its foot, and Hollin mentions the hounds
  - "the long middle pier" (there are five): the longest pier, with the
    Kingshaven Ferry sign at its head
  - Eastreach's sign named two of its four ships
  - the house at 1508,350 had trees on both squares in front of its door
  - the hunting bow's description says it needs no arrows

    python3 fix_playtest5.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest5-<time>/ first. Running it twice
changes nothing the second time. Talk and tile scripts work at once (their
.dsko is removed); the signs, journal, items and map are read at start-up:
restart after it (no god "save" in between).
"""
import os, shutil, struct, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest5-%Y%m%d-%H%M%S'))
changed = []


def keep(rel, path):
    dest = os.path.join(backup, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(path, dest)


def edit(rel, fn):
    path = os.path.join(game, rel)
    if not os.path.exists(path):
        print('  missing: ', rel)
        return
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
            if b not in s:
                s = s.replace(a, b)
        return s
    return fn


def append(entry):
    # An entry at the end of the signs or signnames file.
    def fn(s):
        if entry in s:
            return s
        return s + ('' if s.endswith('\n') or not s else '\n') + entry
    return fn


# ---- the altar (capital.mjs BLESSING) ----
BLESS = '''\tif < trigger cash 5
\t\tchat trigger " A priest whispers: A blessing asks a donation of 5 gold."
\t\tendscript
\tend
\tinc trigger cash - 0 5
\tset trigger hp trigger maxhp
\tset trigger mp trigger maxmp
\tchat trigger " You kneel at the altar and give 5 gold. Warm light fills you: you are healed."
\tendscript
'''
ALTAR = f'''#The altar of the Cathedral of Light, in Kingshaven.
if < trigger hp trigger maxhp
{BLESS}end
if < trigger mp trigger maxmp
{BLESS}end
chat trigger " You stand at the altar. You are whole already: the Light asks nothing of you."
endscript
'''
MAREN = ('Kneel at the altar before me and give what you can: twenty-five gold, and the Light will heal you.',
         'Come to the altar before me hurt or weary, give five gold, and the Light will heal you.')

# ---- Sergeant Wexley ----
ARRIVAL = (("takes on newcomers at his post outside the east gate, and the bounty board",
            "takes on newcomers at her post outside the east gate, just north of the road behind the first houses, and the bounty board"),
           ("takes on newcomers at his post outside Kingshaven's east gate;",
            "takes on newcomers at her post outside Kingshaven's east gate, north of the road behind the first houses;"))
EAST_GUARD = ('the harbour through the south gate.',
              "the harbour through the south gate. Out of this gate: Sergeant Wexley's Watch post, just north of the road behind the first houses. She takes on volunteers.")
WEX_TELL = ("Tell Sergeant Wexley, at the Watch post outside the east gate, that the hounds are gone.",
            "Tell Sergeant Wexley, at the Watch post outside the east gate (north of the road, behind the first houses), that the hounds are gone.")
WATCH_SIGN = ('North, up the lane: the Watch post. Sergeant Wexley takes on volunteers.', 1496, 357)

# ---- the stray hounds ----
HOUNDS = (
    ("in the meadow behind Hilda's farm, out of the north gate and west along the road",
     "in the meadow north of the farms: out of the north gate, west along the road to Farmer Hollin's, the last farm, then up the lane beside it"),
    ("they're in the meadow behind Hilda's farm, the last farmhouse.",
     "they're in the meadow north of the farms. Go up the lane beside Farmer Hollin's, the last farm on the road, then east."),
    ("The hounds are still in the meadow behind Hilda's farm: out of the north gate, then west along the road.",
     "The hounds are still in the meadow north of the farms: out of the north gate, west along the road, and up the lane beside Farmer Hollin's."),
    ("Kill 5 stray hounds in the meadow behind Hilda's farm (out of Kingshaven's north gate, then west along the road).",
     "Kill 5 stray hounds in the meadow north of the farms (out of Kingshaven's north gate, west along the road, then up the lane beside Farmer Hollin's)."),
    ("West along the road: the farms. Stray hounds have been seen in the meadow behind Hilda's farm, the last farmhouse.",
     "West along the road: the farms. Stray hounds have been seen in the meadow north of them: up the lane beside Farmer Hollin's, the last farm."),
)
LANE_SIGN = ('North, up the lane: the meadow. Mind the stray hounds.', 1399, 300)
HOLLIN = ('complains about the price. Every year.',
          'complains about the price. Every year. And now there are stray hounds in the meadow behind us: up the lane beside my farm, then east.')

QUINT = ('The ferries call at the long middle pier: the Royal Swan from Westsea, the Gannet from Eastreach. Captain Rowan sells the tickets.',
         'The ferries call at the longest pier, west along the quay, with the Kingshaven Ferry sign at its head: the Royal Swan from Westsea, the Gannet from Eastreach. Captain Rowan sells the tickets, out at its end.')
EASTREACH = ('Eastreach. Ships sail from here to Westsea Harbour and Aelindor Landing.',
             'Eastreach. Ships sail from here to Westsea Harbour, Aelindor Landing, Kingshaven and the Mire City of Ssarakh.')
BOW = ('a light hunting bow, made for a first hunt\n', 'a light hunting bow, made for a first hunt. It needs no arrows\n')

# ---- the map: the trees in front of the door at 1511,354 become meadow ----
MEADOW = {(1511, 355): 1, (1511, 356): 1}
TREES = {25, 26, 64, 103}  # only a tree is turned to meadow


def fix_map():
    rel = 'shortmap'
    path = os.path.join(game, rel)
    data = bytearray(open(path, 'rb').read())
    w, h = struct.unpack('>ii', data[:8])
    todo = []
    for (x, y), tile in MEADOW.items():
        at = 8 + (x * h + y) * 2
        now = struct.unpack('>H', data[at:at + 2])[0]
        if now == tile:
            continue
        if now not in TREES:
            print(f'  left:     {x},{y} is tile {now}, not a tree')
            continue
        todo.append((at, tile, f'{x},{y} {now}->{tile}'))
    if not todo:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  change:  ', rel, ', '.join(t for _, _, t in todo))
    if not apply:
        return
    keep(rel, path)
    for at, tile, _ in todo:
        data[at:at + 2] = struct.pack('>H', tile)
    open(path, 'wb').write(bytes(data))


print('Play-test 5 fixes, in', game, '' if apply else '(dry run: add --apply)')
edit('defMoveActions/1460_329', lambda s: ALTAR)
for rel in ('talk/High Priestess Maren', 'talk/High Priestess Maren.dlg'):
    edit(rel, swap(MAREN))
for xy in ('117_373', '142_392', '143_392'):
    for rel in (f'defMoveActions/{xy}', f'tileactions/{xy}.json'):
        edit(rel, swap(*ARRIVAL))
for rel in ('talk/Gate Guard East', 'talk/Gate Guard East.dlg'):
    edit(rel, swap(EAST_GUARD))
for rel in ('talk/Sergeant Wexley', 'talk/Sergeant Wexley.dlg', 'quests/kw_strays.json'):
    edit(rel, swap(*HOUNDS, WEX_TELL))
for rel in ('talk/Stray Hound Bounty', 'talk/Stray Hound Bounty.dlg', 'quests/bt_kh_1.json'):
    edit(rel, swap(*HOUNDS))
edit('journal', swap(*ARRIVAL, *HOUNDS, WEX_TELL))
for rel in ('talk/Farmer Hollin', 'talk/Farmer Hollin.dlg'):
    edit(rel, swap(HOLLIN))
for rel in ('talk/Harbourmaster Quint', 'talk/Harbourmaster Quint.dlg'):
    edit(rel, swap(QUINT))
edit('defItems/hunting bow', swap(BOW))
# signs holds text, x, y; signnames holds x, y, name.
edit('signs', lambda s: append(f'{LANE_SIGN[0]}\n{LANE_SIGN[1]}\n{LANE_SIGN[2]}\n')(
    append(f'{WATCH_SIGN[0]}\n{WATCH_SIGN[1]}\n{WATCH_SIGN[2]}\n')(swap(HOUNDS[4], EASTREACH)(s))))
edit('signnames', lambda s: append(f'{LANE_SIGN[1]}\n{LANE_SIGN[2]}\nSignpost\n')(append(f'{WATCH_SIGN[1]}\n{WATCH_SIGN[2]}\nSignpost\n')(s)))
fix_map()
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
