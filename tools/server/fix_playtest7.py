#!/usr/bin/env python3
"""Fixes from the seventh AI play-test (2026-10-21, a dark elf Ranger,
~/dusk-playtest archive/run7). The tester spent most of the hour lost in
Velkarath. Every place it looked for is reachable (checked on the map);
what it was told didn't get it there:

  - the guard said shops are "south of the main street"; the tester took
    the south street for the main one. He names them by the Fire Well now
  - nothing said where a Ranger trains (301 exp unspent): Weaponmaster Dral
    in the Pit. Zeerith, the Matron and the guard say so
  - "the north-east cavern" (cave slimes), "the north-west cavern"
    (duergar) and "the Ember Hollow" (magma slimes) gave no way in: the
    bounties, the Deep Patrol and the guard add how to get there
  - the guard's greeting as you pass, "Keep your blade sheathed in
    Velkarath.", read as a telling-off: he offers help instead
  - the stairs below were signed only "Velkarath", so the tester couldn't
    tell which stair it was; the tunnel signposts now say the stair is at
    the end of the tunnel; coming up the west stair, nothing pointed to
    Aelindor Landing (the tester walked north, away from it). The west and
    east stairs say where to go when you come up
  - Armsmaster Quave hands over gear without saying what it is

The plans (velkarath, bounties, deeppatrol .mjs) say the same.

    python3 fix_playtest7.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/playtest7-<time>/ first. Running it twice
changes nothing the second time. Talk scripts work at once (their .dsko is
removed); signs, journal, quests and tile actions are read at start-up:
restart after it (no god "save" in between).
"""
import os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('playtest7-%Y%m%d-%H%M%S'))
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
                s = s.replace(a, b)
        return s
    return fn


def both(name, *pairs):
    for rel in (f'talk/{name}', f'talk/{name}.dlg'):
        edit(rel, swap(*pairs))


# ---- the guard (velkarath.mjs GUARD) ----
PASSING = ('Keep your blade sheathed in Velkarath.', 'Walk softly, Drow. Talk to me if you are lost.')
CITY = ('The palace is north of the Fire Well, the temple beside it. Shops and the bank are south of the main street, '
        'the Black Lantern north-west, the Pit east.',
        "The palace is north of the Fire Well, the temple beside it. Ryld's Blades and Szinra's Alchemy are just west "
        "of the Well, the bank just south-east, doors on their north side. The Black Lantern is north-west; the Pit "
        "east, where Weaponmaster Dral trains you.")
CAVES = ('Bats nest in the north-west caves, the size of dogs. Go armed.',
         "Slimes in the north-east cavern, up the temple's east side. Duergar and bats in the north-west cavern, "
         "round behind the Black Lantern. Go armed.")
edit('talk/Dark Elf Guard.greet', swap(PASSING))
both('Dark Elf Guard', PASSING, CITY, CAVES)

# ---- where to train (velkarath.mjs tutorial and MATRON) ----
both('Blademistress Zeerith', ('a trainer turns it into strength and skill',
                               'Weaponmaster Dral, in the Pit east of the Fire Well, turns it into strength and skill'))
both('Matron Xalyth', ('Serve well. Hunt for the bounty board,',
                       'Serve well. Train with Weaponmaster Dral in the Pit, hunt for the bounty board,'))
both('Armsmaster Quave', ('Another blade for the House. Take these.',
                          'Another blade for the House. Take these: a cloth shirt and a wooden dagger.'))

# ---- the way to the three dens (bounties.mjs, deeppatrol.mjs) ----
NE = ('in the north-east cavern', "in the north-east cavern, up the temple's east side")
NW = ('at the mouth of the north-west cavern', 'at the mouth of the north-west cavern, round behind the Black Lantern')
EMBER = ('in the Ember Hollow', "in the Ember Hollow, south down the Pit's east side")
for rel in ('quests/bt_vk_1.json', 'talk/Cave Slime Bounty', 'talk/Cave Slime Bounty.dlg'):
    edit(rel, swap(NE))
for rel in ('quests/bt_vk_2.json', 'talk/Duergar Bounty', 'talk/Duergar Bounty.dlg'):
    edit(rel, swap(NW))
for rel in ('quests/bt_vk_3.json', 'talk/Magma Slime Bounty', 'talk/Magma Slime Bounty.dlg'):
    edit(rel, swap(EMBER))
PATROL = [
    NE,
    ('The cavern is north-east of the town.', "The cavern is north-east of the town, up the temple's east side."),
    ('The Ember Hollow, by the lava south-east.', "The Ember Hollow, by the lava south-east: south down the Pit's east side."),
]
for rel in ('quests/dp_slime.json', 'quests/dp_ember.json', 'talk/Patrol Leader Jhaelra', 'talk/Patrol Leader Jhaelra.dlg'):
    edit(rel, swap(*PATROL))
edit('journal', swap(
    ('kill 6 cave slimes in the north-east cavern,', "kill 6 cave slimes in the north-east cavern, up the temple's east side,"),
    ('kill 5 duergar soldiers at the mouth of the north-west cavern,',
     'kill 5 duergar soldiers at the mouth of the north-west cavern, round behind the Black Lantern,'),
    ('kill 4 magma slimes in the Ember Hollow,', "kill 4 magma slimes in the Ember Hollow, south down the Pit's east side,"),
    ('in the cavern north-east of Velkarath.', "in the cavern north-east of Velkarath, up the temple's east side."),
))

# ---- the stairs (velkarath.mjs STAIRS and the tunnel signposts) ----
BOTTOM = 'Velkarath, city of the Drow. Only the Drow walk here.'
STAIR_SIGNS = [
    ('1271\n911', 'The west stair: up to the surface beside Aelindor and its ships. Velkarath is east, along the tunnel.'),
    ('1341\n978', 'The south stair: up to the wild southern hills. Velkarath is north, along the tunnel.'),
    ('1420\n923', 'The east stair: up to the hills, a long walk west of Eastreach. Velkarath is west, along the tunnel.'),
]
TUNNEL = [
    ('The west stair: up beside Aelindor,', 'The west stair, at the end of this tunnel: up beside Aelindor,'),
    ('The south stair: up to the wild southern hills.\n1347', 'The south stair, at the end of this tunnel: up to the wild southern hills.\n1347'),
    ('The east stair: up into the hills.', 'The east stair, at the end of this tunnel: up into the hills.'),
]


def signs(s):
    nl = '\r\n' if '\r\n' in s else '\n'
    for at, text in STAIR_SIGNS:
        s = s.replace(BOTTOM + nl + at.replace('\n', nl), text + nl + at.replace('\n', nl))
    return swap(*[(a.replace('\n', nl), b.replace('\n', nl)) for a, b in TUNNEL])(s)


edit('signs', signs)
UP = 'You climb the long stair up into the open air.'
# The game runs defMoveActions/<x>_<y>; tileactions/ keeps the God tab's copy.
for at, more in (('1269_910', ' Aelindor Landing and its ships lie north-east.'), ('1422_922', ' Eastreach lies a long walk east.')):
    for rel in (f'defMoveActions/{at}', f'tileactions/{at}.json'):
        edit(rel, swap((UP + '"', UP + more + '"')))

print(('Changed ' if apply else 'Would change ') + f'{len(changed)} file(s).' + ('' if apply else ' Run with --apply.'))
