# Prints what the client shows about each item (the Backpack's item
# details): {name: {type, kind, desc, cost, mod, uses, range, needs}}, from
# the server's defItems, fields only where the file has them; needs ("STR 30")
# from the gearneeds file (server/Classes.java). Run on the server:
#   python3 tools/iteminfo.py ~/DuskRPG > js/iteminfo.json
# (tools/rebuild-data.sh and tools/deploy.sh do this.)
import json, os, sys

root = sys.argv[1] if len(sys.argv) > 1 else '.'
d = os.path.join(root, 'defItems')
out = {}
KEYS = {'type': 'type', 'kind': 'kind', 'description': 'desc', 'cost': 'cost', 'mod': 'mod', 'uses': 'uses', 'range': 'range'}
NUMBERS = {'cost', 'mod', 'uses', 'range'}
for name in sorted(os.listdir(d)):
    p = os.path.join(d, name)
    if name.startswith('.') or name.endswith(('.dsko', '.sh', '.log', '.py', '.bak')) or not os.path.isfile(p):
        continue
    lines = [l.strip() for l in open(p, errors='replace').read().splitlines()]
    info = {}
    for i, key in enumerate(lines[:-1]):
        k = KEYS.get(key.lower())
        if not k or k in info:
            continue
        v = lines[i + 1]
        if k in NUMBERS:
            try:
                v = int(float(v))
            except ValueError:
                continue
        elif not v:
            continue
        info[k] = v
    if info.get('type') == 'weopon':
        info['type'] = 'weapon'
    key = name.lower().replace('_', ' ')
    # An old underscored twin (steel_helmet) never hides the spaced file the
    # game uses (steel helmet).
    if '_' in name and os.path.isfile(os.path.join(d, name.replace('_', ' '))):
        continue
    out[key] = info
g = os.path.join(root, 'gearneeds')
if os.path.exists(g):
    for line in open(g, errors='replace'):
        f = line.strip().split('|')
        if len(f) == 3 and not f[0].startswith('#') and f[0].strip().lower() in out:
            out[f[0].strip().lower()]['needs'] = f'{f[1].strip().upper()} {f[2].strip()}'
json.dump(out, sys.stdout, separators=(',', ':'), sort_keys=True)
