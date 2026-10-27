#!/usr/bin/env python3
"""Classes chosen at the end of each race's tutorial, after trying them in
its training yard (server/Classes.java, tools/world/cities/classtrials.mjs).

  classes     the tutorial and yard boxes ("tutorial" and "trial" lines),
              added at the end if the file has none: no class is needed
              inside a tutorial, and classes can be tried in its yard
  the nine end stones (each tutorial's done and skipped ones): a first
              rule for anyone without a class (no hidden flag classchosen)
              that opens the class picker ("class pick") instead of
              sending them on; once they choose, the server runs the stone
              again. Each is tileactions/<x>_<y>.json (the God tab's
              editor) and defMoveActions/<x>_<y> (its script; the .dsko is
              removed so the game compiles it again). grove.mjs,
              velkarath.mjs and hatchery.mjs build the same rule
              (classGate); the human tutorial has no plan file.
  defConditions/classchosen, classtrial   the hidden flags

The trial keepers are city bundles (classtrials-<race>.mjs, install_city.py).

    python3 install_class_trials.py <game dir> [--apply]

Without --apply it says what it would change. Every file it changes is
copied to <game dir>/backups/class-trials-<time>/ first. Running it twice
changes nothing the second time. Needs the new Classes.class (installed and
restarted together); the stones work at once, the classes file is re-read
when it changes.
"""
import json, os, shutil, sys, time

game = sys.argv[1]
apply = '--apply' in sys.argv
backup = os.path.join(game, 'backups', time.strftime('class-trials-%Y%m%d-%H%M%S'))
changed = []

TUTORIAL_LINES = """
# tutorial <x1> <y1> <x2> <y2>: a race tutorial. No class is needed inside; its end stone
# asks for one. trial <x1> <y1> <x2> <y2>: a training yard, where classes can be tried.
tutorial 116 364 147 393
trial 134 375 138 383
tutorial 408 1290 473 1325
trial 450 1299 463 1313
tutorial 1268 954 1316 973
trial 1301 954 1313 966
tutorial 1846 990 1911 1025
trial 1888 999 1901 1013
"""

HUMAN = '** The old teleport stone stays silent under your feet: first, choose your calling. **'
ELF = '** The Moonstone stays dark under your feet: first, choose your calling. **'
DROW = '** The Spider Stone stays cold under your feet: first, choose your calling. **'
LIZARD = '** The Warm Stone stays cold under your feet: first, choose your calling. **'
# (square, the flag its rule needs, what it says to someone without a class)
STONES = [
    ((142, 392), 'tutorialStart6', HUMAN), ((143, 392), 'tutorialStart6', HUMAN), ((117, 373), 'skiptutorial', HUMAN),
    ((468, 1319), 'elfTut6', ELF), ((431, 1321), 'elfSkip', ELF),
    ((1316, 971), 'drowTut6', DROW), ((1284, 971), 'drowSkip', DROW),
    ((1906, 1019), 'lizTut6', LIZARD), ((1869, 1021), 'lizSkip', LIZARD),
]


def read(rel):
    try:
        with open(os.path.join(game, rel), encoding='latin-1') as f:
            return f.read()
    except FileNotFoundError:
        return None


def write(rel, old, new):
    if new == old:
        print('  as it is:', rel)
        return
    changed.append(rel)
    print('  change:  ', rel)
    if not apply:
        return
    path = os.path.join(game, rel)
    if old is not None:
        dest = os.path.join(backup, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(path, dest)
    with open(path + '.tmp', 'w', encoding='latin-1') as f:
        f.write(new)
    os.replace(path + '.tmp', path)


def gate_rule(flag, says):
    return {'when': {'kind': 'flag', 'value': flag}, 'also': {'kind': 'noflag', 'value': 'classchosen'},
            'speaker': '', 'says': says, 'effects': [{'kind': 'class', 'what': 'pick'}]}


# As js/dialogue.js toTileScript writes the rule (effects, then the line).
def gate_script(flag, says):
    return ('if and hasCondition trigger %s ! hasCondition trigger classchosen\n'
            '\torder trigger "class pick"\n'
            '\tchat trigger "%s"\n'
            '\tendscript\n'
            'end\n') % (flag, says)


print('classes:')
old = read('classes')
if old is None:
    sys.exit('  no classes file in %s' % game)
has = any(l.split()[:1] == ['tutorial'] for l in old.splitlines())
write('classes', old, old if has else old.rstrip('\n') + '\n' + TUTORIAL_LINES)

print('end stones:')
for (x, y), flag, says in STONES:
    rel = 'defMoveActions/%d_%d' % (x, y)
    script = read(rel)
    if script is None or ('if hasCondition trigger %s\n' % flag) not in script:
        sys.exit('  %s: not the stone expected (no rule for %s); nothing changed after this' % (rel, flag))
    if 'class pick' not in script:
        lines = script.split('\n')
        head = 0
        while head < len(lines) and lines[head].startswith('#'):
            head += 1
        new = '\n'.join(lines[:head]) + ('\n' if head else '') + gate_script(flag, says) + '\n'.join(lines[head:])
    else:
        new = script
    write(rel, script, new)
    if apply and new != script and os.path.exists(os.path.join(game, rel + '.dsko')):
        os.remove(os.path.join(game, rel + '.dsko'))
    jrel = 'tileactions/%d_%d.json' % (x, y)
    jold = read(jrel)
    if jold is not None:
        j = json.loads(jold)
        rules = j.get('rules', [])
        if not any(e.get('kind') == 'class' for r in rules for e in r.get('effects', [])):
            j['rules'] = [gate_rule(flag, says)] + rules
            write(jrel, jold, json.dumps(j, separators=(',', ':')))
        else:
            write(jrel, jold, jold)

print('hidden flags:')
for name in ('classchosen', 'classtrial'):
    rel = 'defConditions/' + name
    old = read(rel)
    write(rel, old, old if old is not None else 'nodisplay\n.\n')

print('%s %d file(s).%s' % ('Changed' if apply else 'Would change', len(changed), '' if apply else ' (dry run: add --apply)'))
