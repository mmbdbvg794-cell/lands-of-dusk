#!/usr/bin/env python3
"""Starter kits (play-test 4: a new Ranger had nothing to show for the
class). On choosing, each class now gets a weapon and, for some, a skill,
and Classes.java names them; anyone who chose before gets the kit once at
their next login (the starter_kit flag):

  Fighter  short sword, Double Attack 10 (and Dodge 5, as before)
  Ranger   hunting bow (new: ranged, mod 120, range 3, 60 gp), Double Attack 10
  Paladin  short sword, Dodge 5
  Cleric   quarter staff
  Priest   quarter staff

This writes defItems/hunting bow and the start lines of the classes file
(Classes.java's defaults say the same). The classes file is re-read when it
changes; the kit's words and the login gift need the new Classes class
(build.sh + install.sh, then restart).

    python3 install_starter_kits.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/starter-kits-<time>/ first. Running it twice
changes nothing the second time.
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('starter-kits-%Y%m%d-%H%M%S'))
changed = []

BOW = 'type\nranged\ndescription\na light hunting bow, made for a first hunt. It needs no arrows\ncost\n60\nimage\n8\nmod\n120\ndurability\n3000\nrange\n3\n.\n'
START = {
    'fighter': 'stre 3, cons 1, maxhp 10, maxmp 8, Dodge 5, item short sword, Double Attack 10',
    'cleric': 'wisd 3, inte 1, maxhp 2, maxmp 26, divine group 1, item quarter staff',
    'priest': 'wisd 3, inte 1, maxhp 2, maxmp 26, drow group 1, item quarter staff',
    'ranger': 'dext 3, stre 1, maxhp 5, maxmp 16, item hunting bow, Double Attack 10',
    'paladin': 'stre 2, wisd 2, maxhp 7, maxmp 20, divine group 1, item short sword, Dodge 5',
}


def write(rel, new):
    path = os.path.join(game, rel)
    old = open(path, encoding='latin-1', newline='').read() if os.path.exists(path) else None
    if new == old:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  change:  ' if old is not None else '  new:     ', rel)
    if not apply:
        return
    if old is not None:
        dest = os.path.join(backup, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(path, dest)
    open(path, 'w', encoding='latin-1', newline='').write(new)
    if os.path.exists(path + '.dsko'):
        os.remove(path + '.dsko')


print('Starter kits, in', game, '' if apply else '(dry run: add --apply)')
for item in ('short sword', 'quarter staff'):
    if not os.path.exists(os.path.join(game, 'defItems', item)):
        sys.exit(f'defItems/{item} is missing')
write('defItems/hunting bow', BOW)
lines = open(os.path.join(game, 'classes'), encoding='latin-1', newline='').read().splitlines(keepends=True)
seen = set()
for i, l in enumerate(lines):
    w = l.split(None, 2)
    if len(w) == 3 and w[0] == 'start' and w[1] in START:
        lines[i] = f'start {w[1]} {START[w[1]]}' + l[len(l.rstrip(chr(13) + chr(10))):]
        seen.add(w[1])
missing = set(START) - seen
if missing:
    sys.exit('no start line for ' + ', '.join(sorted(missing)))
write('classes', ''.join(lines))
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
