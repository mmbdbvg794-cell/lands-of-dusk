# Put items into players' backpacks (their users/ file and .backup), for test
# characters. Each item's durability comes from its defItems file (-1 if none).
# Skips anyone online (who.json): the server writes its copy back at logout.
# Items already carried or worn are not added twice.
#
# Run on duskserver: python3 give_items.py <name>[,<name>...] "<item>" "<item>" ... [--apply]
# Backups: ~/DuskRPG/backups/<name>-items-<ts>/
import json, os, shutil, sys, time

os.chdir(os.path.expanduser('~/DuskRPG'))
args = [a for a in sys.argv[1:] if a != '--apply']
apply = '--apply' in sys.argv
if len(args) < 2:
    sys.exit(__doc__ or 'usage: give_items.py <names> <item>... [--apply]')
who, items = args[0].split(','), args[1:]

def durability(item):
    path = os.path.join('defItems', item)
    if not os.path.exists(path):
        sys.exit('no such item: %s' % item)
    lines = open(path).read().split('\n')
    return lines[lines.index('durability') + 1] if 'durability' in lines else '-1'

kit = [(i, durability(i)) for i in items]
online = {p['name'].lower() for p in json.load(open('who.json'))['players']}
for name in who:
    if name.lower() in online:
        print(name, 'ONLINE - skipped')
        continue
    lines = open('users/' + name).read().split('\n')
    have = {lines[i + 1] for i, l in enumerate(lines[:-1]) if l.endswith('2') and l[:-1].isalpha()}
    add = [(i, d) for i, d in kit if i not in have]
    end = len(lines) - 1 - lines[::-1].index('.')
    new = lines[:end] + [x for i, d in add for x in ('item2', i, d, '-1')] + lines[end:]
    print(name, 'adds', [i for i, _ in add], 'already has', sorted(have & set(items)))
    if apply and add:
        d = 'backups/%s-items-%s' % (name, time.strftime('%Y%m%d-%H%M%S'))
        os.makedirs(d)
        for f in (name, name + '.backup'):
            shutil.copy2('users/' + f, d)
        for f in (name, name + '.backup'):
            open('users/' + f, 'w').write('\n'.join(new))
        print('written, backup', d)
