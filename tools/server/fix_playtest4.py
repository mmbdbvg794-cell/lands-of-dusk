#!/usr/bin/env python3
"""Fixes from the fourth AI play-test (2026-10-20, an elf Ranger, ~/dusk-playtest
archive/run4). The talk and tile-action files come from the city plans
(grove, hatchery, velkarath, aelindor, bounties, worldbosses .mjs) through a
trimmed bundle and install_city.py; this script does the rest:

  - the shop square was behind each tutorial provisioner's counter, on the
    far side from the way in ("stand in front of my counter" found nothing):
    the provisioner and the square swap places, in the grove (Merrin), the
    hatchery (Mossa) and under Velkarath (Nym)
  - the quarter staff and the cloth shirt were sold for 0 gp (the staff
    beats the starting dagger): 40 and 5
  - hunger and thirst lower five stats without a word: the message says so
    and what to do
  - the road north of Aelindor turns west to Aelindor Landing, the elves'
    ship to Eastreach, with nothing to say so (the tester walked on north
    into the trees): the north gate sign mentions the Landing, and a
    signpost stands at the turn
  - the lake slimer bounty sent hunters to "the lake north of the city";
    the slimers are on the lake shore east of it (the notice is from
    bounties.mjs; this is its Journal line)
  - the boss call said "the east field of the old world" (a builder's word):
    "the east field, south-east of Southfield"

    python3 fix_playtest4.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest4-<time>/ first. Running it twice
changes nothing the second time. Props, shops, signs, items and bosses are
read at start-up: restart after it (no god "save" in between).
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest4-%Y%m%d-%H%M%S'))
changed = []


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
                s = s.replace(a, b, 1)
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


def append(entry):
    # An entry at the end of the signs or signnames file.
    def fn(s):
        if entry in s:
            return s
        return s + ('' if s.endswith('\n') or not s else '\n') + entry
    return fn


# (who, where they stood, where they stand now): the shop square moves the other way.
PROVISIONERS = [('Provisioner Merrin', 457, 1316, 1318), ('Mossa', 1895, 1016, 1018), ('Provisioner Nym', 1307, 969, 971)]
GATE = 'Aelindor, city of the elves. Be welcome under the trees.'
POST = 'Aelindor Landing, west along the road: ships to Westsea Harbour and Eastreach. Aelindor is back south.'

print('Play-test 4 fixes, in', game, '' if apply else '(dry run: add --apply)')
edit('props', swap(*[(f'{n}\n{x}\n{a}\n', f'{n}\n{x}\n{b}\n') for n, x, a, b in PROVISIONERS]))
edit('merchants', swap(*[(f'Merchant\n{x}\n{b}\n', f'Merchant\n{x}\n{a}\n') for n, x, a, b in PROVISIONERS]))
edit('defItems/quarter staff', set_value('cost', 40))
edit('defItems/cloth shirt', set_value('cost', 5))
edit('scripts/thirst', swap(('"You feel thirsty."', '"You feel thirsty, and weaker for it. Drink something (use water)."')))
edit('scripts/hunger', swap(('"You feel hungry."', '"You feel hungry, and weaker for it. Eat something (use apple, or whatever food you carry)."')))
# signs holds text, x, y; signnames holds x, y, name.
edit('signs', lambda s: append(f'{POST}\n474\n1193\n')(swap((f'{GATE}\n474\n1219\n', f'{GATE} North along the road: Aelindor Landing, and the ships.\n474\n1219\n'))(s)))
edit('signnames', append('474\n1193\nAelindor Landing\n'))
edit('journal', swap(("lake slimers by the lake north of the city,", "lake slimers on the lake shore east of the city,")))
edit('worldbosses', swap(('|in the east field of the old world|', '|in the east field, south-east of Southfield|')))
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
