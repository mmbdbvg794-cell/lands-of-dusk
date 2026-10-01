# Prints what the client shows about each item (the Backpack's item
# details): {name: {type, kind, desc, cost, mod, uses}}, from the server's
# defItems, fields only where the file has them. Run on the server:
#   python3 tools/iteminfo.py ~/DuskRPG > js/iteminfo.json
# (tools/rebuild-data.sh and tools/deploy.sh do this.)
import json, os, sys

root = sys.argv[1] if len(sys.argv) > 1 else '.'
d = os.path.join(root, 'defItems')
out = {}
KEYS = {'type': 'type', 'kind': 'kind', 'description': 'desc', 'cost': 'cost', 'mod': 'mod', 'uses': 'uses'}
NUMBERS = {'cost', 'mod', 'uses'}
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
    out[name.lower().replace('_', ' ')] = info
json.dump(out, sys.stdout, separators=(',', ':'), sort_keys=True)
