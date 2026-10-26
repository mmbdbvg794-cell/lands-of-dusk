#!/usr/bin/env python3
"""Weapon and armour inventory, read-only (the 2026-10-20 item audit):
    ssh duskserver 'python3 - DuskRPG' < tools/server/audit_gear.py > items.json
Every weapon, ranged weapon and armour piece in defItems with its numbers,
wear scripts, and where it comes from: shops (merchants), recipes, monster
drops (defMobs giveitem), quest rewards (talk .dlg give), scripts and map
events (giveitem), and how many players own one. JSON on stdout."""
import collections, json, os, re, sys
G=sys.argv[1]
rd=lambda p: open(p,'rb').read().decode('latin-1').replace('\r','')
items={}
for fn in os.listdir(G+'/defItems'):
    if fn.endswith('.dsko') or fn.endswith('~'): continue
    L=rd(G+'/defItems/'+fn).split('\n')
    if len(L)<2 or L[0]!='type': continue
    t=L[1].strip().lower()
    if t not in ('weapon','armor','ranged'): continue
    d={'type':t}; i=2
    while i<len(L) and L[i]!='.':
        k=L[i].strip().lower()
        if k in ('cost','mod','durability','range','image','uses','weight'):
            try: d[k]=int(L[i+1].strip())
            except: d[k]='BAD:'+L[i+1]
            i+=2
        elif k in ('description','kind','onwear','onunwear','onuse','onget','ondrop'):
            d[k]=L[i+1] if i+1<len(L) else ''; i+=2
        else: i+=1
    for s in ('onwear','onunwear'):
        if d.get(s):
            p=G+'/scripts/'+d[s]
            d[s+'_body']=rd(p).replace('\n',' ; ')[:200] if os.path.exists(p) else 'MISSING'
    d['src']=[]; items[fn.lower()]=d
names=set(items)
# shops
M=rd(G+'/merchants').split('\n'); i=0
while i<len(M):
    if M[i].strip()=='Merchant' and i+2<len(M):
        x,y=M[i+1].strip(),M[i+2].strip(); j=i+3
        while j<len(M) and M[j].strip()!='end':
            n=M[j].strip().lower()
            if n in names: items[n]['src'].append(f'shop@{x},{y}')
            j+=1
        i=j
    i+=1
# recipes
for line in rd(G+'/recipes').split('\n'):
    p=line.split('|')
    if len(p)>=3 and p[2].strip().lower() in names: items[p[2].strip().lower()]['src'].append(f'craft:{p[0]}@{p[1]}')
# mob drops
mobs_placed=collections.Counter()
ML=rd(G+'/mobs').split('\n')
for k in range(0,len(ML)-3):
    pass
for fn in os.listdir(G+'/defMobs'):
    if fn.endswith('.dsko'): continue
    for m in re.finditer(r'giveitem\s+\S+\s+"?([^"\n]+?)"?\s+([\d.]+)?\s*$', rd(G+'/defMobs/'+fn), re.M):
        n=m.group(1).strip().lower()
        if n in names: items[n]['src'].append(f'drop:{fn}({m.group(2) or "?"})')
# talk give effects (quest rewards)
for fn in os.listdir(G+'/talk'):
    if not fn.endswith('.dlg'): continue
    s=rd(G+'/talk/'+fn)
    for m in re.finditer(r'"kind":"give","item":"([^"]+)"', s):
        n=m.group(1).lower()
        if n in names: items[n]['src'].append('quest:'+fn[:-4])
# scripts giveitem (other)
for d0 in ('scripts','defMoveActions','defTileActionScripts'):
    if not os.path.isdir(G+'/'+d0): continue
    for fn in os.listdir(G+'/'+d0):
        if fn.endswith('.dsko'): continue
        try: s=rd(G+'/'+d0+'/'+fn)
        except: continue
        for m in re.finditer(r'giveitem\s+\S+\s+"?([^"\n]+?)"?\s*$', s, re.M):
            n=m.group(1).strip().lower()
            if n in names: items[n]['src'].append(f'{d0}:{fn}')
# owned by players
own=collections.Counter()
for fn in os.listdir(G+'/users'):
    if fn.endswith('.backup'): continue
    s=rd(G+'/users/'+fn)
    for n in set(re.findall(r'^(?:item|wield|arms|legs|torso|waist|neck|skull|eyes|hands)\d*\n([^\n]+)$', s, re.M)):
        if n.lower() in names: own[n.lower()]+=1
for n in items: items[n]['owned']=own[n]
json.dump(items, sys.stdout)
