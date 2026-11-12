# Give test characters the rendered-figure test kit (testfemalelf's weapons,
# torsos and leggings, plus elrond's leather leggings) and DEX/STR/INT 15.
# Run on duskserver: python3 give_testgear.py <names> [--apply]. Skips anyone
# in who.json; backs up to ~/DuskRPG/backups/<name>-testgear-<ts>.
import json, os, shutil, sys, time
os.chdir(os.path.expanduser('~/DuskRPG'))
def recs(lines):
    out = []
    for i, l in enumerate(lines):
        if l == 'item2':
            out.append((lines[i+1], lines[i:i+4]))
    return out
src = open('users/testfemalelf').read().split('\n')
el = open('users/elrond').read().split('\n')
kit = [r for r in recs(src)] + [r for r in recs(el) if r[0] == 'leather leggings']
apply = '--apply' in sys.argv
online = {p['name'].lower() for p in json.load(open('who.json'))['players']}
for name in [a for a in sys.argv[1:] if a != '--apply']:
    if name.lower() in online:
        print(name, 'ONLINE - skipped'); continue
    lines = open('users/' + name).read().split('\n')
    have = {n for n, _ in recs(lines)}
    add = [r for n, r in kit if n not in have]
    end = len(lines) - 1 - lines[::-1].index('.')
    for st in ('dext', 'stre', 'inte'):
        i = lines.index(st)
        if int(lines[i+1]) < 15:
            lines[i+1] = '15'
    new = lines[:end] + [x for r in add for x in r] + lines[end:]
    print(name, 'adds', [r[1] for r in add])
    if apply:
        d = 'backups/%s-testgear-%s' % (name, time.strftime('%Y%m%d-%H%M%S'))
        os.makedirs(d)
        for f in (name, name + '.backup'):
            shutil.copy2('users/' + f, d)
        txt = '\n'.join(new)
        for f in (name, name + '.backup'):
            open('users/' + f, 'w').write(txt)
        print('written, backup', d)
