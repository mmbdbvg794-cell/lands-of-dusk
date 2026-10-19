#!/usr/bin/env python3
"""Leftovers from the third AI play-test (2026-10-19, ~/dusk-playtest):

  - the cheap bow cost 600 (3 oak logs make one, and it sold for 300): 250
  - the large bag was the small bag (both 50 gp, 4 items, 15 weight): it
    holds 8 and 30 now, for 120 gp
  - "lavendar" is "lavender": the item file, its recipe, the shops, the
    storage list (no player has any; Crafting.java gathers "lavender")
  - "training_dummy" is "training dummy" (the monster's name shows in
    fights): its defMobs file and the mobs file's entries (the city plans
    say the same; players' "kill:training_dummy" counts are left as they are)
  - the Basking Rock's food counter and Innkeeper Gesh were too far in to
    be seen from the door (the tester found the inn empty): both moved next
    to it, the counter 1676,948 -> 1679,948, Gesh 1675,950 -> 1678,947

    python3 fix_playtest3b.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes or
removes is copied to <game dir>/backups/playtest3b-<time>/ first. Running
it twice changes nothing the second time. Install with the server classes
(Crafting) and restart at once (items, monsters and shops are read at
start-up; no god "save" in between).
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest3b-%Y%m%d-%H%M%S'))
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


def set_value(key, value):
    def fn(s):
        lines = s.splitlines(keepends=True)
        for i in range(len(lines) - 1):
            if lines[i].rstrip('\r\n') == key:
                end = lines[i + 1][len(lines[i + 1].rstrip('\r\n')):]
                lines[i + 1] = f'{value}{end}'
                break
        return ''.join(lines)
    return fn


def lines_named(old, new):
    # Whole lines equal to old (a name in the mobs, merchants files).
    def fn(s):
        return ''.join(new + l[len(old):] if l.rstrip('\r\n') == old else l for l in s.splitlines(keepends=True))
    return fn


def rename(old_rel, new_rel, fn=lambda s: s):
    old, new = os.path.join(game, old_rel), os.path.join(game, new_rel)
    if not os.path.exists(old):
        print('  as it is:', old_rel, '(gone)' if os.path.exists(new) else '(missing)')
        return
    changed.append(old_rel)
    print('  rename:  ', old_rel, '->', new_rel)
    if not apply:
        return
    keep(old_rel, old)
    text = fn(open(old, encoding='latin-1', newline='').read())
    open(new, 'w', encoding='latin-1', newline='').write(text)
    os.remove(old)


print('Leftovers from play-test 3, in', game, '' if apply else '(dry run: add --apply)')
edit('defItems/cheap bow', set_value('cost', 250))
edit('defItems/large bag', lambda s: set_value('cost', 120)(set_value('maxcontain', 8)(set_value('maxweight', 30)(s))))
rename('defItems/lavendar', 'defItems/lavender', swap(('a lavendar plant', 'a lavender plant')))
edit('recipes', swap(('1 lavendar,', '1 lavender,')))
edit('merchants', lines_named('lavendar', 'lavender'))
edit('commands/items', swap(('if hascondition trigger "lavendar"\n\tchat trigger "You have a lavendar in storage."',
                             'if hascondition trigger "lavender"\n\tchat trigger "You have a lavender in storage."')))
rename('defMobs/training_dummy', 'defMobs/training dummy')
edit('mobs', lines_named('training_dummy', 'training dummy'))
edit('merchants', swap(('Merchant\n1676\n948\n', 'Merchant\n1679\n948\n')))
edit('props', swap(('Innkeeper Gesh\n1675\n950\n', 'Innkeeper Gesh\n1678\n947\n')))
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
