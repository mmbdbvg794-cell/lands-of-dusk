# Prints the server's items as JSON, [{name, type, kind}], for the Painted
# items sheet (tools/paintart/items.js). Run on the server:
#   ssh duskserver 'python3 - ~/DuskRPG' < tools/paintart/itemdefs.py
import json, os, sys

root = sys.argv[1] if len(sys.argv) > 1 else '.'
items = []
d = os.path.join(root, 'defItems')
for name in sorted(os.listdir(d)):
    if name.startswith('.') or name.endswith(('.dsko', '.sh', '.log')):
        continue
    lines = [l.strip() for l in open(os.path.join(d, name), errors='replace').read().splitlines()]
    fields = {}
    for i, key in enumerate(lines[:-1]):
        if key in ('type', 'kind') and key not in fields:
            fields[key] = lines[i + 1]
    items.append({'name': name, 'type': fields.get('type', ''), 'kind': fields.get('kind', '')})
print(json.dumps(items))
