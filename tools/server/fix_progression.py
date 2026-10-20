#!/usr/bin/env python3
"""Say how a character grows stronger (play-test 6: "I have 301 exp and
nothing happened: no level, no stat change, no message"). There are no
levels: experience is spent at trainers on stats, health, mana and the
class's skills, and nothing said so.

  - help: a "Growing stronger" line, and the fighting line says a bow
    reaches a few squares
  - each tutorial trainer, taking the dummy's stuffing, says that fights
    earn experience and a trainer turns it into strength and skill
    (Drill Sergeant, Ranger Thandril, Hunt-Master Kreeth, Blademistress
    Zeerith; the plans grove/hatchery/velkarath .mjs and fix_playtest.py's
    HELP say the same)

    python3 fix_progression.py <game dir> [--apply]

Without --apply it says what it would change. Changed files are copied to
<game dir>/backups/progression-<time>/ first. Running it twice changes
nothing. Help and talk scripts are read when used: no restart.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('progression-%Y%m%d-%H%M%S'))
changed = []


def edit(rel, fn):
    path = os.path.join(game, rel)
    if not os.path.exists(path):
        print('  missing: ', rel)
        return
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
    if os.path.exists(path + '.dsko'):
        os.remove(path + '.dsko')


def swap(*pairs):
    def fn(s):
        for a, b in pairs:
            if b not in s:
                s = s.replace(a, b)
        return s
    return fn


FIGHT = ('Fighting: stand right beside a creature, not diagonally, and attack it',
         'Fighting: stand right beside a creature, not diagonally (a bow reaches a few squares), and attack it')
GROW_AT = 'Resting: type sleep to heal faster'
GROW = ('Growing stronger: fights and quests give experience (exp). There are no levels: spend your exp at a '
        'trainer to raise your stats, health, mana and your class\'s skills. Stand on the square in front of the '
        'trainer and open the Shop tab (classic client: the Merchant button); each point costs a little more '
        'than the last.\n')


def help_text(s):
    s = swap(FIGHT)(s)
    if GROW not in s:
        s = s.replace(GROW_AT, GROW + GROW_AT, 1)
    return s


edit('help', help_text)

# (talk file, the hand-in praise, what follows it)
TRAINERS = [
    ('Drill Sergeant', "You'll do, recruit. ",
     "You'll do, recruit. Every fight earns you experience: a trainer turns it into strength and skill. "),
    ('Ranger Thandril', 'Neatly done. ',
     'Neatly done. Each fight and each task earns you experience: trainers turn it into strength and skill. '),
    ('Hunt-Master Kreeth', 'Hsss, not bad. ',
     'Hsss, not bad. Every hunt earns you experience: trainers turn it into strength and skill. '),
    ('Blademistress Zeerith', 'Clean work. ',
     'Clean work. Every kill earns you experience: a trainer turns it into strength and skill. '),
]
for name, old, new in TRAINERS:
    for rel in (f'talk/{name}', f'talk/{name}.dlg'):
        edit(rel, swap((old, new)))

print(('Changed ' if apply else 'Would change ') + f'{len(changed)} file(s).' + ('' if apply else ' Run with --apply.'))
