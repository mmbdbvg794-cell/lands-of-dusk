#!/usr/bin/env python3
"""Item audit, read-only: python3 audit_items.py <game dir>. Reads defItems
the way DuskEngine.getItem does and lists what the engine misreads, missing
scripts, use scripts that remove the wrong item, drops of items that do not
exist, and owned items stuck at 0 uses."""
import os, re, sys, collections
G = sys.argv[1]
def rd(p):
    with open(p, 'rb') as f: return f.read().decode('latin-1')
TYPES = {'item','weapon','armor','food','drink','ranged','container'}
KINDS = {'arms','legs','torso','waist','neck','skull','eyes','hands'}
NUM = {'cost','durability','range','uses','mod','image','weight','size'}
STR = {'description','onuse','onwear','onunwear','onget','ondrop','kind'}
probs = collections.defaultdict(list)
items = {}
for fn in sorted(os.listdir(G+'/defItems')):
    if fn.endswith('.dsko') or fn.endswith('~'): continue
    raw = rd(G+'/defItems/'+fn)
    L = raw.replace('\r','').split('\n')
    d = {}
    if fn != fn.lower(): probs['file name has capitals (engine looks up lower case)'].append(fn)
    if not L or L[0] != 'type': probs['does not start with "type"'].append(fn); items[fn.lower()]={'bad':1}; continue
    d['type'] = L[1].lower()
    if d['type'] not in TYPES: probs['unknown type'].append('%s (%r)' % (fn, d['type']))
    i = 2; ended = False
    while i < len(L):
        k = L[i].lower()
        if L[i] == '.': ended = True; break
        if k.strip() == '': i += 1; continue
        if k in NUM:
            v = L[i+1].strip() if i+1 < len(L) else ''
            if not re.fullmatch(r'-?\d+', v): probs['bad number: item stops loading there'].append('%s: %s=%r' % (fn, k, v))
            else: d[k] = int(v)
            i += 2
        elif k in STR:
            d[k] = L[i+1] if i+1 < len(L) else ''; i += 2
        elif k in ('maxweight','maxitemsize','maxcontain'): i += 2
        else:
            probs['unknown key (engine skips a line, may misread the rest)'].append('%s: %r' % (fn, k)); i += 1
    if d['type'] in ('armor',) and (d.get('kind') or '').lower() not in KINDS: probs['armor without a valid kind'].append('%s (%r)' % (fn, d.get('kind')))
    items[fn.lower()] = d
scripts = {f.lower(): f for f in os.listdir(G+'/scripts')}
for n, d in items.items():
    for k in ('onuse','onwear','onunwear','onget','ondrop'):
        s = d.get(k)
        if s and s.lower() not in scripts: probs['%s script missing' % k].append('%s -> %s' % (n, s))
    s = d.get('onuse')
    if s and s.lower() in scripts:
        body = rd(G+'/scripts/'+scripts[s.lower()])
        rem = re.findall(r'removeitem\s+trigger\s+"?([^"\n\r]+?)"?\s*$', body, re.M | re.I)
        uses = d.get('uses', -1)
        if rem and all(r.strip().lower() != n for r in rem): probs['use script removes a different item'].append('%s: removes %s' % (n, rem))
        if not rem and uses == 1: probs['1 use, never removed (stays "used up" in the bag)'].append(n)
        if rem and uses > 1: probs['several uses but the script removes it on the first'].append('%s (uses %d)' % (n, uses))
        if not rem and uses == -1 and re.search(r'nohunger|nothirst|\bhp\b', body): probs['food/potion with unlimited uses'].append(n)
    if d.get('type') in ('weapon','armor') and d.get('mod', 0) == 0 and not d.get('onwear'): probs['weapon/armor with mod 0'].append(n)
    if 'cost' not in d and d.get('type') != 'container': probs['no cost (sells/buys for 0)'].append(n)
# references
refs = collections.defaultdict(set)
L = rd(G+'/merchants').split('\n')
for x in L:
    x = x.strip()
    if x and not re.fullmatch(r'-?\d+', x) and not x.startswith('train:') and not x.startswith('pet:') and x != '.' and x != 'end':
        refs[x.lower()].add('merchants')
for fn in os.listdir(G+'/scripts')+[('../talk/'+f) for f in os.listdir(G+'/talk')]+[('../commands/'+f) for f in os.listdir(G+'/commands')]+[('../defMoveActions/'+f) for f in os.listdir(G+'/defMoveActions')]:
    p = G+'/scripts/'+fn
    if not os.path.isfile(p) or p.endswith('.dsko'): continue
    for m in re.finditer(r'(?:giveitem|removeitem|hasitem)\s+\S+\s+"?([^"\n\r]+?)"?\s*$', rd(p), re.M | re.I):
        refs[m.group(1).strip().lower()].add('script ' + fn.split('/')[-1])
for fn in os.listdir(G+'/defMobs'):
    for m in re.finditer(r'^(?:give|drop|item)\w*\n(.+)$', rd(G+'/defMobs/'+fn).replace('\r',''), re.M):
        refs[m.group(1).strip().lower()].add('mob ' + fn)
for n, where in sorted(refs.items()):
    if n not in items and not n.startswith('$') and not n.startswith('trigger'):
        probs['named somewhere but has no defItems file'].append('%s  (%s)' % (n, ', '.join(sorted(where))[:120]))
# owned items with 0 uses
def owned(path, label):
    L = rd(path).replace('\r','').split('\n')
    for i, x in enumerate(L):
        if x in ('item2', 'storage2') or (x.endswith('2') and x[:-1] in KINDS|{'wield','arm','body','head','feet'}):
            pass
    # item2\nname\ndur\nuses
    for i in range(len(L)-3):
        if L[i] == 'item2' and L[i+3] == '0':
            n = L[i+1].lower()
            probs['owned items stuck at 0 uses'].append('%s: %s' % (label, n))
        if L[i] == 'item2' and L[i+1].lower() not in items:
            probs['owned item with no defItems file'].append('%s: %s' % (label, L[i+1]))
for u in os.listdir(G+'/users'):
    if not u.endswith('.backup'): owned(G+'/users/'+u, 'user '+u)
for k, v in sorted(probs.items()):
    print('== %s (%d)' % (k, len(v)))
    for x in v[:60]: print('   ', x)
    if len(v) > 60: print('    ...', len(v) - 60, 'more')
print('items:', len(items))
