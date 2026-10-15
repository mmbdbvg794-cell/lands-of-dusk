#!/usr/bin/env python3
"""Fixes from the first AI play-test (2026-10-15, ~/dusk-playtest):

  - stray hounds a bit weaker (strength 28 -> 26: about 40% less damage
    against the tutorial gear; 20 never got through it) and no longer a pack:
    no faction (killing one turned every hound in sight on you, so two or
    three fought you at once) and no group courage (grouprelation 0). They
    fight back when attacked, one at a time.
  - typos at the docks: "step of the boat" (and its double spaces), "go the
    the armorer"
  - the tutorial: the Armorer says to wear the gear; the Drill Sergeant
    says "right beside it, not diagonally" before the first try, and you
    hand over the straw stuffing in words
  - the "sales list" prop: one line (the engine shows only a description's
    first line, so it was just the table's header)
  - help: for today's clients, not the 2003 applet

    python3 fix_playtest.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest-<time>/ first; a script's compiled
.dsko is removed so the game compiles it again. Running it twice changes
nothing the second time. Restart afterwards (mobs and props are read at
start-up).
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest-%Y%m%d-%H%M%S'))
changed = []


def edit(rel, fn):
    path = os.path.join(game, rel)
    old = open(path, encoding='latin-1').read()
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
    open(path, 'w', encoding='latin-1').write(new)
    if os.path.exists(path + '.dsko'):
        os.remove(path + '.dsko')


def swap(*pairs):
    # Skipped once done: some new texts contain the old one.
    def fn(s):
        for a, b in pairs:
            if b not in s:
                s = s.replace(a, b)
        return s
    return fn


def hound(s):
    lines = s.split('\n')
    out, i = [], 0
    while i < len(lines):
        key = lines[i]
        if key == 'faction' and i + 1 < len(lines):
            i += 2  # no faction: no pack
            continue
        if key in ('stre', 'grouprelation') and i + 1 < len(lines):
            out += [key, {'stre': '26', 'grouprelation': '0'}[key]]
            i += 2
            continue
        out.append(key)
        i += 1
    return '\n'.join(out)


INTRO_OLD = "** You step of the boat, weary from your journey across the great sea.  You look at the docks and see guards guiding  refugees into the  building nearby.  You  figure that's where you need to go**"
INTRO_NEW = "** You step off the boat, weary from your journey across the great sea. You look at the docks and see guards guiding refugees into the building nearby. You figure that's where you need to go. **"

ARMORER_OLD = "You'll need these."
ARMORER_NEW = "You'll need these. Put them on (in your Backpack, press Wear beside each)."

SARGE_HIT_OLD = "( Stand next to mob you want to attack, click mob and click attack)"
SARGE_HIT_NEW = "(Stand right beside it, not diagonally, then click mob and click attack)"
SARGE_GIVE_OLD = "Ha! Knocked the stuffing right out of it."
SARGE_GIVE_NEW = "*takes the straw stuffing* Ha! Knocked the stuffing right out of it."

SALES = '''image
1
description
A price list: Red Potion (all your HP back) 2000 gp, Green Potion (all your MP back) 2000 gp, Blue Potion (all your HP and MP back) 6000 gp
'''

HELP = '''--Help--
Moving: the arrow keys, or click where you want to go. Typed: n, s, e, w.
Talking to people: stand beside them and type talk (in the browser, click them and choose Talk). When they ask you something, the answers are in brackets at the end, like (yes/no): type one.
Speaking to players: start a line with ' to talk to those nearby, or ; to be heard across the land.
Fighting: stand right beside a creature, not diagonally, and attack it (browser: click it and choose Attack; classic client: pick it in the Attack list).
Shops: stand on the merchant's square. The browser's Shop tab, or the classic client's Merchant button, lists what they sell and what they'd buy. Typed: buy 1 water, sell 1 water.
Gear and food: wear and use things from your Backpack (classic client: type wear or use and the name, e.g. use water). Eat when you're hungry and drink when you're thirsty.
Resting: type sleep to heal faster, and wake to get up again.
Staying quiet for 30 minutes logs you out.
For a list of commands, type "help commands".
'''

print('Fixes from the play-test, in', game, '' if apply else '(dry run: add --apply)')
edit('defMobs/stray hound', hound)
for rel in ('defMoveActions/125_366', 'tileactions/125_366.json'):
    edit(rel, swap((INTRO_OLD, INTRO_NEW)))
for rel in ('defMoveActions/125_375', 'tileactions/125_375.json'):
    edit(rel, swap(('go the the armorer', 'go to the armorer')))
for rel in ('talk/The Armorer', 'talk/The Armorer.dlg'):
    edit(rel, swap((ARMORER_OLD, ARMORER_NEW)))
for rel in ('talk/Drill Sergeant', 'talk/Drill Sergeant.dlg'):
    edit(rel, swap((SARGE_HIT_OLD, SARGE_HIT_NEW), (SARGE_GIVE_OLD, SARGE_GIVE_NEW)))
edit('defProps/sales list', lambda s: SALES)
edit('help', lambda s: HELP)
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
