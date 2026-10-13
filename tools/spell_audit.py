"""Builds the spell and mana audit tables (docs/spell-audit-*.csv) from
what the server does today (2026-10-13). Read-only: the numbers below were
read from the live game; nothing is fetched or changed.

  python3 tools/spell_audit.py

The engine (LivingThing.castSpell, SpellGroup) charges a spell's MP as
  cost = (110 - (group skill - the spell's unlock %)) // 2
so every spell costs 55 MP the moment it unlocks, falling to 5 at best
(group 100, a spell unlocking at 0). Spell Power then gives back
cost * min(100, power) // 200 after the cast (server/Skills.java), but the
whole cost must be there first.

Dusk has no character levels: progress is experience spent at trainers.
For the level table, "level L" stands for: L points in the class's spell
school(s) (level 1 = a fresh character with the class's free starting
point), and L-1 points of MP bought at a trainer.
"""
import csv, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'docs')
TRAINCOST = 10  # exp per point (live conf)

# Classes (DuskRPG/classes): start max MP 20 + delta, MP per point bought,
# WIS 7 + bonus (no race bonus counted: human +1, elf +2, lizardman +2,
# dark elf 0), and how each spell group stands for them.
CLASSES = {
    'Fighter': dict(mp=-10, per=8, wis=0, inte=0, stre=3),
    'Mage': dict(mp=10, per=12, wis=1, inte=3, stre=0),
    'Cleric': dict(mp=5, per=11, wis=3, inte=1, stre=0),
    'Priest/Priestess': dict(mp=5, per=11, wis=3, inte=1, stre=0),
    'Ranger': dict(mp=-5, per=9, wis=0, inte=0, stre=1),
    'Paladin': dict(mp=-2, per=10, wis=2, inte=0, stre=2),
}
CORE = {
    'Fighter': [], 'Mage': ['black magic group', 'enchantment group', 'summons group', 'hells fire'],
    'Cleric': ['clerical group', 'white magic group'], 'Priest/Priestess': ['clerical group', 'white magic group'],
    'Ranger': ['druidic group'], 'Paladin': ['clerical group'],
}
BARRED = {'Mage': ['clerical group', 'white magic group']}
OPEN = ['telepathy group', 'alchemy group', 'm group']
START = {'Mage': 'black magic group', 'Cleric': 'clerical group', 'Priest/Priestess': 'clerical group', 'Ranger': 'druidic group', 'Paladin': 'clerical group'}

def tier(cls, group):
    if group in BARRED.get(cls, []): return 'barred'
    if group in CORE[cls]: return 'core'
    if group in OPEN: return 'open'
    if group == 'Guardian Force Group': return 'not taught'
    return 'cross (x2 price, max 50)'

TEACH = {
    'clerical group': "27,42 Troll's Head; 310,160 Sabin; 197,906 Spells shop",
    'white magic group': '514,7 Southfield; 1,701',
    'black magic group': '514,7 Southfield; 197,906 Spells shop',
    'druidic group': "310,160 Sabin; 133,142 City of Light; 18,36 church",
    'enchantment group': "27,42 Troll's Head; 310,160 Sabin; 197,906 Spells shop",
    'telepathy group': '18,36 church', 'alchemy group': '514,7 Southfield; 197,906 Spells shop',
    'summons group': '514,7 Southfield', 'hells fire': '64,48 (old world NW)', 'm group': '693,136 (remote)',
    'Guardian Force Group': 'nobody (gods only)',
}
# spell: (group, effect, numbers, duration, cooldown s, status)
S = 'STR+INT'
SPELLS = [
    ('mend', 'clerical group', 'Heals the caster or a target', 'HP + INT x (0.5-1.0)', '', 3, ''),
    ('counter poison', 'clerical group', 'Nothing: prints "disabled"', '-', '', '', 'does nothing'),
    ('armor', 'clerical group', 'AC buff on caster or target', 'AC +10', 'INT x 6 s', 20, ''),
    ('bless', 'clerical group', 'STR and damage buff', 'STR +2, damage +10%', 'INT x 6 s', 20, ''),
    ('focus', 'white magic group', 'INT and WIS buff', 'INT +2, WIS +2', 'INT x 6 s', 20, ''),
    ('angel strike', 'white magic group', 'Battle damage', f'({S}) x (0.4-0.8)', '', 4, ''),
    ('prayer', 'white magic group', 'Removes cursed, tired, poison, hunger, thirst', '-', '', 15, 'also cures hunger and thirst'),
    ('meditation', 'white magic group', 'Heals the caster or a target', 'HP + INT x (3.5-6.0)', '', 8, ''),
    ('scan', 'white magic group', "Shows a player's stats, AC, skills", '-', '', '', 'spell-group lines always show 0 (reads skills, groups are spells)'),
    ('holy', 'white magic group', 'Battle damage', f'({S}) x (2.6-4.5)', '', 12, 'checks a "taco" condition that does not exist'),
    ('bone shards', 'black magic group', 'Battle damage', f'({S}) x (0.3-0.6)', '', 3, ''),
    ('curse', 'black magic group', 'STR -2, DEX -2 on a target', 'STR -2, DEX -2', 'INT x 3 s', 10, 'reflect turns it on the caster'),
    ('quake', 'black magic group', 'Battle damage', f'({S}) x (0.6-1.5)', '', 6, ''),
    ('corrupt', 'black magic group', 'Drains HP and MP from a target', f'target HP and MP -3x({S}); caster HP +3x, MP +10x ({S}) out of battle (+3x in battle)', '2nd cast within 10 s: locked 20 s', 8, 'gives back far more MP than it costs; a target out of battle that drops below 0 HP is sent to 394,394'),
    ('quarter staff', 'druidic group', 'Creates a quarter staff item', '1 quarter staff', '', 5, ''),
    ('healing staff', 'druidic group', 'Uses up a quarter staff to heal', 'HP + INT x (0.5-1.5)', '', 3, ''),
    ('thorns', 'druidic group', 'Battle damage', 'INT x (0-3)', '', 3, 'damages the caster instead if the enemy has reflect'),
    ('camoflauge', 'druidic group', 'Invisibility on caster or target', 'invis', 'INT x 3 s', 30, 'same as invis'),
    ('detect invis', 'enchantment group', 'See invisible', 'detect invis', 'INT x 3 s', 10, ''),
    ('invis', 'enchantment group', 'Invisibility on caster or target', 'invis', 'INT x 3 s', 30, ''),
    ('regenerate', 'enchantment group', 'Heal over time', '+3 HP every 5 s', 'INT x 3 s', 30, ''),
    ('telepath', 'telepathy group', 'Private message to any player', '-', '', '', 'every message is also copied to the player flan'),
    ('tire', 'telepathy group', 'Target may fall asleep', 'each second: sleeps if rand(100)+7 < INT', 'INT x 2 s', 15, ''),
    ('warp', 'alchemy group', 'Teleport to bind point', '-', '', 120, ''),
    ('translate', 'alchemy group', 'Nothing: prints "disabled"', '-', '', '', 'does nothing'),
    ('herbology', 'alchemy group', 'Brews potions from herbs', 'recipes (mandrake, wolfsbane, ...)', '', '', 'overlaps the Alchemy crafting skill'),
    ('summon snakes', 'summons group', 'Battle damage', f'({S}) x (0.3-0.7); emerald (0.5-1.1)', '', 5, ''),
    ('summon bahamut', 'summons group', 'Battle damage', f'({S}) x (0.9-1.8); ruby (0.9-2.5)', '', 10, ''),
    ('summon wurm', 'summons group', 'Battle damage', f'({S}) x (1.2-2.7); topaz (1.5-3.3)', '', 15, 'suspect: the damage line and the "inc enemy" are on one line, may deal no damage'),
    ('summon leviathan', 'summons group', 'Battle damage', f'({S}) x 1.8-3.4; aquamarine 1.8-3.8', '', 20, 'suspect: same one-line bug as wurm'),
    ('summon ultima bahamut', 'summons group', 'Battle damage', f'({S}) x (7.5-15.7); uses a diamond and an amethyst, costs 100 exp', '', 120, ''),
    ('hell fire', 'hells fire', 'Battle damage', f'({S}) x (0.4-1.6)', '', '', ''),
    ('apocalypse', 'hells fire', 'Battle damage', f'({S}) x (0.8-2.0)', '', '', ''),
    ('reflect', 'm group', 'Reflect shield', 'reflect (curse and thorns check it)', '10 s', 30, ''),
    ('ifrit', 'Guardian Force Group', 'Battle damage', '0-270 flat', '', '', 'not taught'),
    ('shiva', 'Guardian Force Group', 'Battle damage', '0-360 flat', '', '', 'not taught'),
    ('leviathan', 'Guardian Force Group', 'Battle damage', '0-480 flat', '', '', 'not taught; same name as summon leviathan'),
    ('cactuar', 'Guardian Force Group', 'Battle damage', '0-570 flat', '', '', 'not taught'),
    ('diablos', 'Guardian Force Group', 'Battle damage', '0-630 flat', '', '', 'not taught'),
]
ORDER = {}
for name, g, *_ in SPELLS:
    ORDER.setdefault(g, []).append(name)

def unlock(name, g):
    i, n = ORDER[g].index(name), len(ORDER[g])
    return 0 if i == 0 else 100 * i // (n - 1)

def cost(skill, req):
    return (110 - (skill - req)) // 2

def max_mp(cls, level):
    c = CLASSES[cls]
    return 20 + c['mp'] + max(0, level - 1) * c['per']

def wis(cls):
    return 7 + CLASSES[cls]['wis']

def spells_file():
    rows = []
    for name, g, eff, nums, dur, cd, status in SPELLS:
        r = unlock(name, g)
        row = {
            'spell': name, 'group': g, 'unlock % (group skill)': r,
            'price to unlock (exp, at 10/point)': max(1, r) * TRAINCOST,
            'MP cost when unlocked': cost(r, r), 'MP cost at group 50': cost(50, r) if r <= 50 else 'n/a',
            'MP cost at group 100': cost(100, r), 'effect': eff, 'numbers': nums, 'duration': dur,
            'cooldown s (spellcooldowns; 2 s after any spell)': cd, 'taught at': TEACH[g],
        }
        for cls in CLASSES:
            t = tier(cls, g)
            if t in ('barred', 'not taught') or (t.startswith('cross') and r > 50):
                row[f'{cls}: tier / when unlocked'] = f'{t}' + (' (unlocks above the cap: unreachable)' if t.startswith('cross') and r > 50 else '')
                continue
            pool = max_mp(cls, max(1, r))
            c55 = cost(r, r)
            flags = []
            if c55 > pool: flags.append("CAN'T CAST")
            elif c55 > 0.2 * pool: flags.append('>20% of pool')
            row[f'{cls}: tier / when unlocked'] = f'{t}; {c55} MP of {pool}' + (f' [{", ".join(flags)}]' if flags else '')
        row['status'] = status
        rows.append(row)
    with open(os.path.join(OUT, 'spell-audit-spells.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader(); w.writerows(rows)
    return rows

def levels_file():
    rows = []
    for cls in CLASSES:
        groups = [g for g in ORDER if tier(cls, g) in ('core', 'open')]
        for L in (1, 5, 10, 20, 30):
            pool = max_mp(cls, L)
            w_ = wis(cls)
            for g in groups:
                skill = L if (L > 1 or g == START.get(cls)) else 0
                if skill == 0 and L == 1:
                    skill = 1  # a first point bought, to show the cost
                for name in ORDER[g]:
                    r = unlock(name, g)
                    if r > skill:
                        continue
                    c = cost(skill, r)
                    rows.append({
                        'class': cls, 'level (see notes)': L, 'max MP': pool,
                        'MP regen per 18 s tick, awake (1+WIS/2)': 1 + w_ // 2, 'asleep (3+WIS)': 3 + w_,
                        'ticks to refill, awake': -(-pool // (1 + w_ // 2)),
                        'group': g, 'group skill': skill, 'tier': tier(cls, g), 'spell': name, 'MP cost': c,
                        'casts from a full bar': pool // c, '% of pool': round(100 * c / pool),
                        'flag': "CAN'T CAST" if c > pool else ('>20% of pool' if c > 0.2 * pool else ''),
                    })
    with open(os.path.join(OUT, 'spell-audit-mp-by-level.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader(); w.writerows(rows)
    return rows

def mend_file():
    rows = []
    for cls in CLASSES:
        t = tier(cls, 'clerical group')
        for skill in (1, 10, 25, 50, 75, 100):
            if t == 'barred' or (t.startswith('cross') and skill > 50):
                continue
            pool = max_mp(cls, skill)
            inte = 7 + CLASSES[cls]['inte']
            c = cost(skill, 0)
            rows.append({'class': cls, 'tier': t, 'clerical skill': skill, 'max MP (skill-1 MP points bought)': pool, 'mend MP cost': c,
                         'casts from full': pool // c, 'heal (INT x 0.5-1.0)': f'{inte // 2}-{inte}', 'HP healed per MP (avg)': round(0.75 * inte / c, 2)})
    with open(os.path.join(OUT, 'spell-audit-mend.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader(); w.writerows(rows)
    return rows

if __name__ == '__main__':
    a, b, c = spells_file(), levels_file(), mend_file()
    print(len(a), 'spells,', len(b), 'level rows,', len(c), 'mend rows')
