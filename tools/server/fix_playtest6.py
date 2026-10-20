#!/usr/bin/env python3
"""Fixes from the sixth AI play-test (2026-10-20, a dark elf Ranger,
~/dusk-playtest archive/run6). The plans (velkarath, bounties, grove,
hatchery .mjs) say the same; this script changes the live files directly:

  - nothing in Velkarath said how to reach the surface: its three stairs
    come up beside Aelindor (west; Aelindor Landing's ships are ~100 steps
    on), in the wild southern hills (south), and in the eastern hills
    (east; Eastreach is a ~290-step walk). A sign at each tunnel, the
    guard names them, and the Matron's last line sends a new Drow out
  - the guard said "The market lies south": there's no market, and the
    tester walked into the bank. He names the real places now
  - the tutorials' last journal line began "Training done (or skipped).",
    which read like a placeholder: "Training done."
  - the bounty boards say the easiest notice is on the left (the tester
    missed the beginner one and thought there was no work for them)

    python3 fix_playtest6.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest6-<time>/ first. Running it twice
changes nothing the second time. Talk scripts work at once (their .dsko is
removed); the signs and journal are read at start-up: restart after it.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest6-%Y%m%d-%H%M%S'))
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


# ---- Velkarath (velkarath.mjs GUARD, MATRON, TUNNEL_SIGNS) ----
GUARD = ("The Matron's palace is north of the Fire Well, the temple beside it. The market lies south. "
         "The side caves are for the bold: bats nest to the north-west.",
         "The Matron's palace is north of the Fire Well, the temple beside it. South of the main street: "
         "Szinra's alchemy and Ryld's blades, and the bank to the south-east. The Black Lantern is north-west, "
         "the Pit east. Three long stairs climb to the surface, one at the end of each tunnel: the west stair "
         "comes up beside Aelindor, whose ships sail from Aelindor Landing; the east stair comes up in the hills, "
         "a long walk west of Eastreach; the south stair, in the wild southern hills. "
         "The side caves are for the bold: bats nest to the north-west.")
MATRON = ('House Xalyth remembers those who serve it. Serve well.',
          'House Xalyth remembers those who serve it. Now make yourself useful: the bounty board by the '
          'Fire Well pays hunters, and the surface folk are building a town called Eastreach, a long walk '
          'east of our east stair. Learn what they are about. Serve well.')
TUNNEL_SIGNS = [
    ('The west stair: up to the surface beside Aelindor, city of the elves. Ships sail from Aelindor Landing, '
     'north of it, to Westsea Harbour and Eastreach.', 1309, 914),
    ('The south stair: up to the wild southern hills.', 1347, 944),
    ('The east stair: up into the eastern hills. Eastreach, the surface folk\'s new town, is a long walk east '
     'from the top.', 1385, 921),
]

edit('talk/Dark Elf Guard', swap(GUARD))
edit('talk/Dark Elf Guard.dlg', swap(GUARD))
edit('talk/Matron Xalyth', swap(MATRON))
edit('talk/Matron Xalyth.dlg', swap(MATRON))

# ---- the tutorials' last journal line (velkarath, grove, hatchery .mjs; fix_arrivals.py) ----
DONE = ('Training done (or skipped). ', 'Training done. ')
edit('journal', swap(DONE))
for rel in sorted(os.listdir(os.path.join(game, 'tileactions'))):
    path = os.path.join(game, 'tileactions', rel)
    if DONE[0] in open(path, encoding='latin-1').read():
        edit(os.path.join('tileactions', rel), swap(DONE))

# ---- bounty boards (bounties.mjs) ----
BOARD = ('Three jobs, one a day per hunter: read a notice',
         'Three jobs, one a day per hunter, the easiest on the left: read a notice')


def signs(s):
    s = swap(BOARD)(s)
    for text, x, y in TUNNEL_SIGNS:
        s = append(f'{text}\n{x}\n{y}\n')(s)
    return s


def signnames(s):
    for _, x, y in TUNNEL_SIGNS:
        s = append(f'{x}\n{y}\nSignpost\n')(s)
    return s


edit('signs', signs)
edit('signnames', signnames)
print(('Changed ' if apply else 'Would change ') + f'{len(changed)} file(s).' + ('' if apply else ' Run with --apply.'))
