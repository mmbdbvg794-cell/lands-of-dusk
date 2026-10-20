#!/usr/bin/env python3
"""The human tutorial's Drill Sergeant gate (139,377; no plan file) said
"Show me you can fight first. Knock the stuffing out of that dummy." to
anyone not yet sent on, even someone already carrying the stuffing (play-test
4 found the same in the other tutorials). Now: "Report to me first."
Its talk file comes from tools/server/fix_drill_sergeant.mjs.

    python3 fix_playtest4b.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest4b-<time>/ first. Running it twice
changes nothing the second time. The .block is read at each blocked step:
no restart needed.
"""
import json, os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest4b-%Y%m%d-%H%M%S'))
OLD = 'Not so fast, recruit! Show me you can fight first. Knock the stuffing out of that dummy.'
NEW = 'Not so fast, recruit! Report to me first.'
changed = []


def write(rel, old, new):
    if new == old:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  change:  ', rel)
    if not apply:
        return
    path = os.path.join(game, rel)
    dest = os.path.join(backup, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(path, dest)
    open(path, 'w', encoding='utf-8', newline='').write(new)


print('Drill Sergeant gate, in', game, '' if apply else '(dry run: add --apply)')
for ext in ('.json', '.block'):
    rel = f'tileactions/139_377{ext}'
    old = open(os.path.join(game, rel), encoding='utf-8', newline='').read()
    new = old.replace(OLD, NEW)
    if ext == '.json':
        json.loads(new)
    write(rel, old, new)
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
