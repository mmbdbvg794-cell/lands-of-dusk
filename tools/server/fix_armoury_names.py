#!/usr/bin/env python3
"""Kingshaven's two armour shops (the merchants at 1427,343 and the Royal
Armoury at 1444,343) sold items by their old file names with underscores:
"silver_helmet", "gold_leggings", "platinum_suit"... Players saw and had to
type those names. Most have a twin with a space; the belts and sleeves
don't, and the bronze helmet, gloves, leggings and suit twins (made at the
anvil, or dropped) had other stats. The user chose the shop's stats for
all of them. capital.mjs says the same.

  - any shop line in merchants naming an item with "_" uses the spaced name
  - the spaced file becomes the underscored one's (the shop's) stats: new
    for belts and sleeves; for bronze: armour 40, helmet 200 gp, gloves and
    leggings 60, suit 400, durability 2400
  - "an silver ..." descriptions become "a silver ..."

The underscored files stay (nobody holds one now, but a backup might).

    python3 fix_armoury_names.py <game dir> [--apply]

Without --apply it says what it would change. Changed files are copied to
<game dir>/backups/armoury-names-<time>/ first. Running it twice changes
nothing. Items and merchants are read at start-up: restart after it.
"""
import os, re, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('armoury-names-%Y%m%d-%H%M%S'))
items = os.path.join(game, 'defItems')
changed = []


def read(path):
    return open(path, encoding='latin-1', newline='').read()


def write(rel, text):
    path = os.path.join(game, rel)
    changed.append(rel)
    print('  change:  ' if os.path.exists(path) else '  new:     ', rel)
    if not apply:
        return
    if os.path.exists(path):
        dest = os.path.join(backup, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(path, dest)
    open(path, 'w', encoding='latin-1', newline='').write(text)


def an_fix(text):
    # "an silver helmet" -> "a silver helmet" (only before a consonant)
    return re.sub(r'(?m)^(description\r?\n)an ([^aeiouAEIOU\r\n])', r'\1a \2', text)


merchants = read(os.path.join(game, 'merchants'))
lines = merchants.split('\n')
names = sorted({l.rstrip('\r') for l in lines if '_' in l and os.path.exists(os.path.join(items, l.rstrip('\r')))})

for name in names:
    spaced = name.replace('_', ' ')
    twin = os.path.join(items, spaced)
    want = an_fix(read(os.path.join(items, name)))
    if not os.path.exists(twin) or read(twin).replace('\r', '').strip() != want.replace('\r', '').strip():
        write(os.path.join('defItems', spaced), want)

new = '\n'.join(l.replace(l.rstrip('\r'), l.rstrip('\r').replace('_', ' ')) if l.rstrip('\r') in names else l for l in lines)
if new != merchants:
    write('merchants', new)

print(('Changed ' if apply else 'Would change ') + f'{len(changed)} file(s).' + ('' if apply else ' Run with --apply.'))
