#!/usr/bin/env python3
"""Fixes from the eighth AI play-test (2026-10-22, a dark elf Ranger,
~/dusk-playtest archive/run8):

  - coming up the west stair, the tester was told the ships lie
    north-east, walked into the forest and never found the pier. A path
    now runs from the stair to it (tools/world/cities/landingpath.mjs,
    installed with install_city.py); the arrival line points along it
  - The Lost Patrol: kills before the camp is found don't count, and
    Jhaelra's reminder only asked for the camp and the signet, so the
    tester held the signet and couldn't hand it in. The reminder names all
    three, and the camp counts from 7 squares (was 4): the tester fought at
    its mouth, 7 squares off
  - Ryld's Blades sold arrows, which only the old "arrow" command uses
    (it needs an item called "bow" and the Archery skill): no bow today
    needs them. Ryld's doesn't sell them now
  - the bow's reach was never said ("within your bow's reach"): every
    ranged weapon's description says how far it reaches, from its range
  - the hunger hint said "use apple"; Velkarath sells mushrooms

Archivist Zyrith's greeting for drow is a conversation change, made by
tools/server/fix_playtest8_talk.mjs. The plans (velkarath, deeppatrol
.mjs) say the same.

    python3 fix_playtest8.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest8-<time>/ first. Running it twice
changes nothing the second time. Talk and scripts work at once (their
.dsko is removed); quests, merchants, items and tile actions are read at
start-up: restart after it (no god "save" in between).
"""
import os, re, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest8-%Y%m%d-%H%M%S'))
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
    if not os.path.exists(dest):  # the first copy is the original (a file can be edited twice)
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


# ---- the west stair's arrival line (velkarath.mjs STAIRS) ----
UP = ('Aelindor Landing and its ships lie north-east.', 'A path runs north from the stair to Aelindor Landing and its ships.')
for rel in ('defMoveActions/1269_910', 'tileactions/1269_910.json'):
    edit(rel, swap(UP))

# ---- The Lost Patrol (deeppatrol.mjs) ----
REMIND = ('Find the camp, and bring me the signet.', 'Find their camp, kill four of the duergar round it, then bring me the signet.')
for rel in ('quests/dp_lostpatrol.json', 'talk/Patrol Leader Jhaelra', 'talk/Patrol Leader Jhaelra.dlg'):
    edit(rel, swap(REMIND))
edit('quests/dp_lostpatrol.places', swap(('|1310|870|4|', '|1310|870|7|')))
edit('quests/dp_lostpatrol.json', lambda s: re.sub(r'("x":1310,"y":870,"radius":)4\b', r'\g<1>7', s))

# ---- Ryld's Blades sells no arrows (velkarath.mjs WARES.smith) ----
def ryld(s):
    nl = '\r\n' if '\r\n' in s else '\n'
    return s.replace(nl.join(['1331', '925', 'short sword', 'leather vest', 'wooden crossbow', 'dagger', 'assassin blade', 'curved dagger', 'arrow', 'leather gloves', 'end']),
                     nl.join(['1331', '925', 'short sword', 'leather vest', 'wooden crossbow', 'dagger', 'assassin blade', 'curved dagger', 'leather gloves', 'end']))
edit('merchants', ryld)

# ---- the hunger hint ----
edit('scripts/hunger', swap(('(use apple, or whatever food you carry)', '(use apple, mushroom, or whatever food you carry)')))

# ---- how far each ranged weapon reaches, in its description ----
def reach(s):
    lines = s.split('\n')
    def field(k):
        for i in range(len(lines) - 1):
            if lines[i].strip() == k:
                return i + 1
    t, d, r = field('type'), field('description'), field('range')
    if t is None or lines[t].strip() != 'ranged' or d is None or r is None:
        return s
    desc = lines[d].rstrip('\r')
    try:
        n = int(lines[r].strip())
    except ValueError:
        return s
    if desc.strip() in ('', 'null') or 'It reaches ' in desc:
        return s
    end = '\r' if lines[d].endswith('\r') else ''
    lines[d] = desc.rstrip('. ') + f'. It reaches {n} squares (a diagonal square counts as two)' + end
    return '\n'.join(lines)
for name in sorted(os.listdir(os.path.join(game, 'defItems'))):
    if not name.endswith('.dsko'):
        edit(f'defItems/{name}', reach)

print(('Changed ' if apply else 'Would change ') + f'{len(changed)} file(s).' + ('' if apply else ' Run with --apply.'))
