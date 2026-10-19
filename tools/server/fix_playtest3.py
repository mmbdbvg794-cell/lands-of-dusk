#!/usr/bin/env python3
"""Fixes from the third AI play-test (2026-10-19, ~/dusk-playtest, a
lizardman fighter):

  - Ssarakh: two signposts on the plaza (south to the harbour and the
    Marsh Wren, east to the Shaman's hut), and Chieftain Hesska names the
    bounty board, the Shaman and the pier (ssarakh.mjs says the same)
  - the bog slime bounty says where: east and north-east of the city, past
    the Shaman's hut (its notice, the quest and the journal; bounties.mjs)
  - the leather jerkin's armour 10 -> 20 (it was the free cloth shirt's)
  - the level-2 bounty notices in every town: "not for a beginner", not
    "not for someone fresh off the boat" (bounties.mjs)
  - the Hatching Pools: Brood-Mother Ssethra's "come and speak with me
    first" says where she is (hatchery.mjs)
  - the swamp's tier 1 and 2 creatures (bog slime, mire lizard, bog
    crawler, swamp serpent) no longer gang up: grouprelation 0 and no
    faction, as the stray hounds (swampmobs.mjs)
  - the green blob: INT 11 -> 1, WIS 12 -> 2, which only raised its points
    (cp) and so its gold (half its points): 34 gp -> about 24

    python3 fix_playtest3.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest3-<time>/ first; a script's compiled
.dsko is removed so the game compiles it again. Running it twice changes
nothing the second time. Restart afterwards (signs and tile actions are
read at start-up; no god "save" in between).
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest3-%Y%m%d-%H%M%S'))
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


def drop_key(key):
    def fn(s):
        lines = s.splitlines(keepends=True)
        for i in range(len(lines) - 1):
            if lines[i].rstrip('\r\n') == key:
                del lines[i:i + 2]
                break
        return ''.join(lines)
    return fn


def both(*fns):
    def fn(s):
        for f in fns:
            s = f(s)
        return s
    return fn


def files_with(text, under):
    out = []
    for d in under:
        for name in sorted(os.listdir(os.path.join(game, d))):
            rel = f'{d}/{name}'
            if name.endswith('.dsko') or not os.path.isfile(os.path.join(game, rel)):
                continue
            if text in open(os.path.join(game, rel), encoding='latin-1').read():
                out.append(rel)
    return out


# ---- Ssarakh: where to go next ----
HESSKA_OLD = 'Mind the bog pools; they keep what they take. And if you go east'
HESSKA_NEW = ("Mind the bog pools; they keep what they take. Hunters take work from the bounty board on the plaza. "
              "Shaman Ithrae, along the east street, teaches those with experience to spend. "
              "And the Marsh Wren sails from the pier at the south end of the city, for Eastreach. If you go east")
SIGNS = [
    ("South: the harbour. The Marsh Wren sails from the pier to Eastreach; tickets from Captain Sskarr.", 1689, 948),
    ("East: the Shaman's hut, for training, and the marsh where the bog slimes are.", 1704, 940),
]


def add_signs(s):
    for text, x, y in SIGNS:
        if text not in s:
            s += ('' if s.endswith('\n') else '\n') + f'{text}\n{x}\n{y}\n'
    return s


def add_sign_names(s):
    for _, x, y in SIGNS:
        entry = f'{x}\n{y}\nSignpost\n'
        if entry not in s:
            s += ('' if s.endswith('\n') or not s else '\n') + entry
    return s


# ---- the bog slimes ----
SLIMES = swap(('in the marsh round the city', "in the marsh east and north-east of the city, past the Shaman's hut"))

# ---- the level-2 bounties ----
BEGINNER = swap(('not for someone fresh off the boat', 'not for a beginner'))

# ---- the Brood-Mother: where she is (her square is 1869,1002) ----
MOTHER = 'Not that way yet, hatchling. Come and speak with me first.'
GAPS = {
    '1869_1014': 'Not that way yet, hatchling. Come and speak with me first: I am by the pools, to the north.',
    '1876_1007': 'Not that way yet, hatchling. Come and speak with me first: I am by the pools, to the north-west.',
}

# ---- the swamp's packs ----
PACKS = ['bog slime', 'mire lizard', 'bog crawler', 'swamp serpent']


print('Fixes from play-test 3, in', game, '' if apply else '(dry run: add --apply)')
for rel in ('talk/Chieftain Hesska', 'talk/Chieftain Hesska.dlg'):
    edit(rel, swap((HESSKA_OLD, HESSKA_NEW)))
edit('signs', add_signs)
edit('signnames', add_sign_names)
for rel in ('quests/bt_ss_1.json', 'talk/Bog Slime Bounty', 'talk/Bog Slime Bounty.dlg', 'journal'):
    edit(rel, SLIMES)
edit('defItems/leather jerkin', set_value('mod', 20))
for rel in files_with('not for someone fresh off the boat', ['talk', 'quests']):
    edit(rel, BEGINNER)
for at, words in GAPS.items():
    for ext in ('.json', '.block'):
        edit(f'tileactions/{at}{ext}', swap((MOTHER, words)))
for m in PACKS:
    edit(f'defMobs/{m}', both(set_value('grouprelation', 0), drop_key('faction')))
edit('defMobs/green blob', both(set_value('inte', 1), set_value('wisd', 2)))
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
