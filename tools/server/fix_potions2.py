#!/usr/bin/env python3
"""Potions named by what they do (2026-10-26), in place of colours to guess:

    minor healing potion   +25 HP          50 gp   (was minor potion; tiny
                                                     potion, +15, folds in)
    healing potion         +100 HP        300      (was x-potion, 400)
    strong healing potion  +300 HP        900      (was red potion, 1200)
    minor mana potion      +25 MP          50      (as it was)
    mana potion            +100 MP        300      (new)
    strong mana potion     +300 MP        900      (was green potion, 2000)
    rejuvenation potion    +500 HP, MP   3000      (was blue potion, 6000)

Brewed twins (worth 0 to merchants) the same way: brewed minor healing,
strong healing, strong mana and rejuvenation potion, in the recipes. The
old names go from every shop, drop, recipe, map event and sign; their item
files stay (nobody carries one now; a god can still make them). Mana
potion is sold wherever minor mana potion is. Trader Kossk's reward and
Alchemist Pell's question are talk: tools/server/fix_potions2_talk.mjs.

    python3 fix_potions2.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/potions2-<time>/ first (once). Running it
twice changes nothing the second time. Shops, drops and items are read at
start-up: restart straight after.
"""
import json, os, re, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('potions2-%Y%m%d-%H%M%S'))
changed = []


def edit(rel, fn, create=False):
    path = os.path.join(game, rel)
    if not os.path.exists(path) and not create:
        print('  missing: ', rel)
        return
    old = open(path, encoding='latin-1', newline='').read() if os.path.exists(path) else None
    new = fn(old or '')
    if new == old:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  new:     ' if old is None else '  change:  ', rel)
    if not apply:
        return
    dest = os.path.join(backup, rel)
    if old is not None and not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(path, dest)
    open(path, 'w', encoding='latin-1', newline='').write(new)
    if os.path.exists(path + '.dsko'):
        os.remove(path + '.dsko')


# name: (hp, mp, cost, message, description)
POTIONS = {
    'minor healing potion': (25, 0, 50, 'You feel better.', 'a small flask of healing potion; heals 25 health'),
    'healing potion': (100, 0, 300, 'Warmth floods through you.', 'a flask of healing potion; heals 100 health'),
    'strong healing potion': (300, 0, 900, 'Your wounds close before your eyes.', 'a large flask of strong healing potion; heals 300 health'),
    'mana potion': (0, 100, 300, 'Your mind sharpens.', 'a flask of mana potion; restores 100 mana'),
    'strong mana potion': (0, 300, 900, 'Power hums in your fingertips.', 'a large flask of strong mana potion; restores 300 mana'),
    'rejuvenation potion': (500, 500, 3000, 'You feel completely restored.', 'a flask of rejuvenation potion; heals 500 health and restores 500 mana'),
}
BREWED = ['minor healing potion', 'strong healing potion', 'strong mana potion', 'rejuvenation potion']
# Old name -> new, everywhere a name stands on its own.
RENAME = {
    'tiny potion': 'minor healing potion',
    'minor potion': 'minor healing potion',
    'x-potion': 'healing potion',
    'red potion': 'strong healing potion',
    'green potion': 'strong mana potion',
    'blue potion': 'rejuvenation potion',
    'brewed minor potion': 'brewed minor healing potion',
    'brewed red potion': 'brewed strong healing potion',
    'brewed green potion': 'brewed strong mana potion',
    'brewed blue potion': 'brewed rejuvenation potion',
}


def item_file(desc, cost, use):
    return '\n'.join(['type', 'item', 'description', desc, 'cost', str(cost), 'image', '6',
                      'onuse', use, 'uses', '1', '.', ''])


def use_script(name, hp, mp, msg):
    made = {k: v for k, v in (('hp', hp), ('mp', mp)) if v}
    lines = [f'#Made by the item maker: {json.dumps({**made, "message": msg, "gone": True}, separators=(",", ":"))}',
             f'chat trigger "{msg}"']
    lines += [f'inc trigger hp {hp}'] * bool(hp) + [f'inc trigger mp {mp}'] * bool(mp)
    return '\n'.join(lines + [f'removeitem trigger "{name}"', 'endscript', ''])


def rename_lines(s, shops=False):
    # Whole lines only (shop wares, drops), any case. In the merchants file
    # a shop keeps one of each (tiny and minor potion both become minor
    # healing potion); a shop's list ends at "end".
    out, seen = [], set()
    for line in s.split('\n'):
        key = line.strip().lower()
        new = RENAME.get(key)
        if new is not None:
            line = line.replace(line.strip(), new)
            if shops and new in seen:
                continue
        seen = set() if key == 'end' else seen | {line.strip().lower()}
        out.append(line)
    return '\n'.join(out)


def merchants(s):
    s = rename_lines(s, shops=True)
    # A mana potion after every minor mana potion.
    lines = s.split('\n')
    i = 0
    while i < len(lines):
        if lines[i].strip().lower() == 'minor mana potion':
            j = i
            while lines[j].strip() != 'end':
                j += 1
            if 'mana potion' not in [l.strip().lower() for l in lines[i:j]]:
                lines.insert(i + 1, 'mana potion')
        i += 1
    return '\n'.join(lines)


def recipes(s):
    def fix(line):
        p = line.split('|')
        if len(p) == 4 and p[0] == 'alchemy':
            p[2] = RENAME.get(p[2], p[2])
            p[3] = ', '.join(re.sub(r'^(\d+) (.+)$', lambda m: f'{m[1]} {RENAME.get(m[2], m[2])}', x.strip()) for x in p[3].split(','))
        return '|'.join(p)
    return '\n'.join(fix(l) for l in s.split('\n'))


def words(*pairs):
    def fn(s):
        for a, b in pairs:
            s = s.replace(a, b)
        return s
    return fn


print('Potions by name, in', game, '' if apply else '(dry run: add --apply)')
for name, (hp, mp, cost, msg, desc) in POTIONS.items():
    edit(f'defItems/{name}', lambda s, t=item_file(desc, cost, f'{name}.use'): t, create=True)
    edit(f'scripts/{name}.use', lambda s, t=use_script(name, hp, mp, msg): t, create=True)
for name in BREWED:
    hp, mp, _, msg, desc = POTIONS[name]
    b = f'brewed {name}'
    edit(f'defItems/{b}', lambda s, t=item_file(f'a hand-brewed {name}; worth nothing to merchants', 0, f'{b}.use'): t, create=True)
    edit(f'scripts/{b}.use', lambda s, t=use_script(b, hp, mp, msg): t, create=True)
edit('merchants', merchants)
edit('recipes', recipes)
for mob in sorted(os.listdir(os.path.join(game, 'defMobs'))):
    if not mob.endswith('.dsko') and re.search(r'^(tiny|minor|x-|red|green|blue) ?potion\s*$',
                                               open(os.path.join(game, 'defMobs', mob), encoding='latin-1').read(), re.M | re.I):
        edit(f'defMobs/{mob}', rename_lines)
edit('defMoveActions/9_948', words(('"minor potion"', '"minor healing potion"'), ('Bring me a minor potion', 'Bring me a minor healing potion')))
edit('defMoveActions/137_58', words(('"minor potion"', '"minor healing potion"'), ('"Minor Potion"', '"minor healing potion"')))
edit('defProps/store inventory list', words(('Minor Potion              50GP       Heals life 20 points', 'Minor Healing Potion   50GP       Heals life 25 points'),
                                            ('Minor Mana Potion    50GP     Heals mana 20 points', 'Minor Mana Potion      50GP       Heals mana 25 points')))
edit('defProps/Jenova', words(('holding X-Potions', 'holding healing potions')))
edit('rc/javahelp.txt', words(('brew brewed red potion      brew one', 'brew brewed strong healing potion   brew one')))
edit('quests/dw_wreck.json', words(('"red potion"', '"strong healing potion"')))
print(f'{len(set(changed))} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
