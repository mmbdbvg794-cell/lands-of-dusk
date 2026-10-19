#!/usr/bin/env python3
"""After each race's tutorial, say where to go next (play-test 3: "there's no
next step after the tutorial"). The stone that ends each tutorial says one
more line, from someone standing there, and the "Training done" journal line
says the same:

  humans      Kingshaven plaza   Sergeant Wexley's Watch post outside the
                                 east gate (his chain suits a new character),
                                 and the bounty board on the plaza
  elves       the Moonwell       Elder Faelar, north-west of the Moonwell
  dark elves  the Fire Well      Matron Xalyth, north of the Fire Well
  lizardfolk  the Brood Stone    Chieftain Hesska, north of the Brood Stone

Each stone is a tile action: tileactions/<x>_<y>.json (the God tab's
editor) and defMoveActions/<x>_<y> (the script it compiles to; its .dsko
is removed so the game compiles it again). grove.mjs, velkarath.mjs and
hatchery.mjs say the same; the human tutorial has no plan file.

    python3 fix_arrivals.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/arrivals-<time>/ first. Running it twice
changes nothing the second time. The tile scripts work at once; the journal
file is read at start-up (restart, no god "save" in between).
"""
import json, os, re, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('arrivals-%Y%m%d-%H%M%S'))
changed = []

# (the stone's words begin, the line added, the journal flag, its new text)
ARRIVALS = [
    ('You step onto the old teleport stone',
     " A passing guard nods to you: 'New in Kingshaven? Sergeant Wexley of the Watch takes on newcomers at his post outside the east gate, and the bounty board is right here on the plaza.'",
     'tutorialDone',
     "Training done (or skipped). Sergeant Wexley of the Watch takes on newcomers at his post outside Kingshaven's east gate; the bounty board is on the plaza."),
    ('You step onto the Moonstone',
     " An elf tending the well smiles at you: 'Welcome to Aelindor. Elder Faelar likes to meet everyone new to the city; his hall is north-west of the Moonwell.'",
     'elfTutDone',
     'Training done (or skipped). Elder Faelar meets everyone new to Aelindor, in his hall north-west of the Moonwell.'),
    ('You step onto the Spider Stone',
     " A guard looks you over: 'Another hatchling. Matron Xalyth sees every new one, in her palace north of the Fire Well. Do not keep her waiting.'",
     'drowTutDone',
     'Training done (or skipped). Matron Xalyth sees every new hatchling, in her palace north of the Fire Well.'),
    ('You step onto the Warm Stone',
     " A brood-guard flicks her tongue at you: 'New hatchling? Chieftain Hesska sees every one. The Hall of the Brood is just north of the Brood Stone.'",
     'lizTutDone',
     'Training done (or skipped). Chieftain Hesska sees every new hatchling, in the Hall of the Brood north of the Brood Stone.'),
]


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
    open(path, 'w', encoding='latin-1', newline='').write(new)
    if os.path.exists(path + '.dsko'):
        os.remove(path + '.dsko')


def read(rel):
    return open(os.path.join(game, rel), encoding='latin-1', newline='').read()


print('Arrival pointers, in', game, '' if apply else '(dry run: add --apply)')
for start, line, flag, text in ARRIVALS:
    words = re.compile(r'(\*\* ' + re.escape(start) + r'[^"]*?\*\*)(?!' + re.escape(line[:20]) + ')')
    found = 0
    for folder, ext in (('defMoveActions', ''), ('tileactions', '.json')):
        for name in sorted(os.listdir(os.path.join(game, folder))):
            if not name.endswith(ext) or name.endswith('.dsko') or (not ext and '.' in name):
                continue
            rel = f'{folder}/{name}'
            old = read(rel)
            if start not in old:
                continue
            found += 1
            new = words.sub(lambda m: m.group(1) + line, old)
            if ext == '.json':
                # The journal line the editor keeps for the flag.
                d = json.loads(new)
                hit = False
                for rule in d.get('rules', []):
                    for e in rule.get('effects', []):
                        if e.get('kind') == 'flag' and e.get('flag') == flag and e.get('journal') and e['journal'].get('text') != text:
                            e['journal']['text'] = text
                            hit = True
                if hit:
                    new = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
            write(rel, old, new)
    if not found:
        print('  missing: ', start)

texts = {f: t for _, _, f, t in ARRIVALS}
old = read('journal')
lines = []
for l in old.splitlines(keepends=True):
    p = l.rstrip('\r\n').split('|')
    if p[0] in texts and len(p) >= 4:
        l = '|'.join([p[0], p[1], texts[p[0]], p[3]]) + l[len(l.rstrip('\r\n')):]
    lines.append(l)
new = ''.join(lines)
write('journal', old, new)
print(f'{len(changed)} file(s) {"changed" if apply else "to change"}' + (f'; backups in {backup}' if apply and changed else ''))
