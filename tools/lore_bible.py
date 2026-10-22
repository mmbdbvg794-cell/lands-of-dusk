import json, glob, os, re, sys

D = sys.argv[1]           # pulled game data (quests/, talk/, classes, worldbosses)
REPO = sys.argv[2]        # dusk-browser-client
OUT = sys.argv[3]
# sys.argv[4] (optional): a staged build's quests dir, for chains not live yet
CITIES = os.path.join(REPO, 'tools/world/cities')
o = []
w = o.append

def header_comment(path):
    lines = []
    for ln in open(path):
        s = ln.rstrip('\n')
        if s.startswith('import'):
            continue
        if s.startswith('//'):
            lines.append(s[2:].strip() if not s[2:3] == ' ' else s[3:])
        elif lines and s.strip() == '':
            if lines[-1] != '':
                lines.append('')
        elif lines:
            break
    return '\n'.join(lines).strip()

CHAINS = [
    ('dw', 'The Dawnward (main story, part 1)', 'dawnward.mjs'),
    ('ft', 'The Firetown Expedition (main story, part 2)', 'firetown.mjs'),
    ('er', 'The Eastreach Frontier', 'frontier.mjs'),
    ('kw', "The King's Watch (Kingshaven)", 'kingswatch.mjs'),
    ('gw', 'The Green Wardens (Aelindor)', 'greenwardens.mjs'),
    ('sg', 'The Grey Beneath (the southern gate)', 'greybeneath.mjs'),
    ('dp', 'The Deep Patrol (Velkarath)', 'deeppatrol.mjs'),
    ('zl', 'The Zilen Legacy (City of Light)', 'zilen.mjs'),
    ('iz', 'The Izaru Deeps (Midnight)', 'izaru.mjs'),
    ('fr', 'The Frozen Reach (east field village)', 'frozenreach.mjs'),
    ('gs', 'The Old Drift (Greystone Mine)', 'greystone.mjs'),
]
quests = {}
for f in glob.glob(os.path.join(D, 'quests/*.json')):
    q = json.load(open(f))
    quests[q['id']] = q
# Optional: a staged build's quests dir (built, not installed on live yet),
# used for a chain that has no quests on live.
staged = {}
for f in glob.glob(os.path.join(sys.argv[4], '*.json')) if len(sys.argv) > 4 else []:
    q = json.load(open(f))
    staged[q['id']] = q

def order(ids):
    ids = set(ids); out = []
    while ids:
        ready = sorted(i for i in ids if quests[i].get('requires') not in ids)
        out += ready; ids -= set(ready)
    return out

def step_text(s):
    k = s['kind']
    if k == 'kill':
        return f"Kill {s.get('count')} × {s.get('mob')}" + (f" ({s.get('what')})" if s.get('what') else '')
    if k == 'place':
        t = f"Go to {s.get('what')} ({s.get('x')},{s.get('y')})"
        if s.get('arrive'): t += f" — on arrival: \"{s['arrive']}\""
        return t
    if k == 'bring':
        return f"Bring {s.get('item')} to {s.get('npc')}" + (" (taken)" if s.get('take') else '')
    if k == 'talk':
        return f"Talk to {s.get('npc')}"
    return k

def quest_md(q, lvl='####'):
    w(f"{lvl} {q['title']}  `{q['id']}`")
    meta = [f"Giver: **{q.get('giver')}**"]
    if q.get('requires'): meta.append(f"needs `{q['requires']}`")
    if q.get('repeatable'): meta.append('repeatable')
    w(' · '.join(meta) + '\n')
    of = q.get('offer', {})
    if of.get('says'): w(f"- **Offer:** \"{of['says']}\"")
    if of.get('accept'): w(f"  - *{of['accept']}* → \"{of.get('acceptReply','')}\"")
    if of.get('decline'): w(f"  - *{of['decline']}* → \"{of.get('declineReply','')}\"")
    if q.get('notYet'): w(f"- **Not yet:** \"{q['notYet']}\"")
    if q.get('reminder'): w(f"- **Reminder:** \"{q['reminder']}\"")
    w('- **Steps:**')
    for i, s in enumerate(q.get('steps', []), 1):
        w(f"  {i}. {step_text(s)}" + (f" — journal: \"{s['journal']}\"" if s.get('journal') else ''))
        if s.get('says') or s.get('reply'):
            w(f"     - {s.get('npc','')}: \"{s.get('says','')}\" / *{s.get('answer','')}* → \"{s.get('reply','')}\"")
    r = q.get('reward', {})
    rw = []
    if r.get('gold'): rw.append(f"{r['gold']} gold")
    if r.get('exp'): rw.append(f"{r['exp']} exp")
    if r.get('items'): rw.append(', '.join(r['items']))
    w(f"- **Reward:** {'; '.join(rw) or 'none'}" + (f" — \"{r['says']}\"" if r.get('says') else ''))
    if q.get('after'): w(f"- **After:** \"{q['after']}\"")
    w('')

# ---------------------------------------------------------------- doc
w('# Dusk — World Bible & Lore Compendium')
w('')
w('_Generated 2026-10-21 from the live server (quests, NPC dialogue) and the build repo (city plans, LORE.md). '
  'This is everything that exists in the game so far. Use it to plan new lore and write build prompts for Claude Code._')
w('')
w('## 0. How to use this document (for Claude on the web)')
w('''
You are helping flan (the game's owner and god) design lore and content for **Dusk**, an old Java
tile-based online RPG (DuskRPG) that has been revived with a browser client and a lot of new content.
A separate Claude Code agent with server access builds everything. Your job: help flan invent and
refine story, then write **build prompts** for that agent.

**Rules of the canon**
- Section 1 (Canon) is authoritative. New content must fit it or explicitly change it.
- Players learn the story in pieces, from each people's own point of view; NPCs can be biased or wrong.
- Keep the tone: plain, grounded, a little melancholy. Short NPC lines (1-3 sentences). No modern words.

**What the engine can do (keep ideas buildable)**
- Quests are made of steps: **talk** (to an NPC, with one answer), **bring** (an item to an NPC),
  **kill** (N of a named monster), **place** (reach a map spot). Quests can require earlier quests,
  be repeatable with a cooldown, and reward gold, exp and items. Accepting can give items/flags.
- NPCs talk with menus of answers; lines can depend on flags/quests, be random, or show once.
- Flags (hidden conditions) track story state per player. Lore pieces set `lore_*` flags and a journal "Tale".
- New monsters (stats, drops, image family), new items (description; scripted on use/while worn),
  new NPCs, new buildings/areas dug into the map, signs, walk-on scripts (teleports, messages).
- World bosses rise on a timer; bounty boards give daily kill quests; achievements exist.
- Story state is **per player** (closing the rift happens in each player\'s own story, not globally).
- **NPCs can be shown or hidden per player by flag** (since 2026-10-21): an NPC appears only to
  players with a flag, or only to those without it. The **same NPC can stand in two places** (since
  2026-10-22), each with its own look, description and rule: Elowen in her Firetown cell for players
  who haven't finished The Firetown Expedition, and in Kingshaven for those who have. Both share one
  conversation, which branches on the player's flags.
- An NPC's lines can change after **later** quests, not just their own ("She lived. I keep saying it...").
- Finishing a quest can set extra flags (a lore tale, a story state) besides its own.
- Walk-on squares can check flags and items (even "carrying three of X"), take and give items, set
  flags and teleport: good for digging something up, or setting stones round a crack.
- **Monsters are the same for everyone** (not per player yet): a story fight's monster is visible to,
  and fightable by, anyone nearby, and respawns. Per-player monsters would need engine work.
- Hard limits: no cutscenes, no voice, no branching world state shared by everyone, no new races
  without big work. Monster "level" is ignored; strength comes from HP/str/dex.

**Status of this copy**: generated from the live server. **The Grey Beneath** (sg_, the southern
gate's first chain) is built and tested but **not installed on live yet**: its quests are printed in
section 3 from the staged build, and where the canon says it is "in game", read "once installed".

**A good build prompt for Claude Code contains**
1. The goal and which canon it extends (quote the relevant lines from this doc).
2. Each NPC: name, where (town/area, or "pick a spot near X"), personality, what they say.
3. Each quest: id prefix, title, giver, prerequisite, steps (talk/bring/kill/place), rewards, the lines.
4. New monsters/items: names, rough difficulty (e.g. "for a fresh character" / "finale, ~300 HP"), drops.
5. New lore pieces (flag names `lore_<key>`) if any, and updates to LORE.md.
6. "Test on scratch end to end, then give me the install commands."
''')

w('## 1. Canon (LORE.md — the authoritative story)\n')
lore = open(os.path.join(REPO, 'LORE.md')).read()
lore = re.sub(r'^# .*\n', '', lore, count=1)
lore = re.sub(r'^## ', '### ', lore, flags=re.M)
w(lore.strip() + '\n')

w('## 2. The world: places, peoples, classes\n')
w('''### Geography (map coordinates are x,y)
- **The old world (west):** the kingdom of Zilen. City of Light (capital, ~104,153; King Zilen's graveyard 42,111),
  Midnight (walled desert town, the Midnight Pub, Izaru Mine Shop ~441,82), Riverside, the north-west village,
  the east field and its village (Southfield ~530,14), the Frozen Reach (676-810 x 215-365), Westsea Harbour
  (ferry pier), Firetown (island castle in the southern sea; the rift; "hell"), the toxic swamp (1-21 x 64-105),
  the far-south enclave (Fire Orb vault, Champions' Gauntlet), the sealed fairy glade (Fairy King).
  Mostly solid forest and rock with roads, linked by walk-on teleports. A dying land, dying by emptying,
  not burning: most people sailed east; those left are stubborn, poor or old.
- **The new lands (east, across the sea):**
  - *North continent:* **Kingshaven** (human capital, built from the refugee ships, ~1388-1485 x 320-397;
    plaza, keep with the empty throne (Lord Steward Halvard governs beside it), Lantern Row houses to rent, harbour, Watch post at the east gate,
    Duelling Ring to the north-east), **Greystone Mine** (in the mountains ~200 steps north; working mine; quest chain *The Old Drift*, duergar in the Grey Delve below).
  - *South continent:* **Aelindor** (elven city in a ring of old oaks, the Moonwell; ~425-510 x 1175-1280),
    the Grove of Waking (elf tutorial), The Circle's wood and grove (druids, standing stones, ~705,1218).
  - *Underdark (beneath):* **Velkarath** (drow outpost, Temple of the Spider Queen, the Fire Well, Ember Hollow).
  - *East continent:* **Eastreach** (ferry port, Warden's Post, frontier camps; the dunes of the Sand Kings
    and Kraghul to the north), the Mage Guild tower on the isle off Eastreach (five floors).
  - *Mid continent* between north and east (wild).
  - *The lizardman isles:* **Ssarakh**, the Mire City (Brood Stone in the plaza), the Hatching Pools (tutorial),
    the Dawnward wreck on the east shore, swamp creatures.
- Ferries link the ports (Kingshaven, Westsea, Eastreach, Aelindor, Ssarakh...). Weather differs by region.

### Races and starts
- **Humans:** refugees still in the old world; tutorial "From Refugee to Soldier..." at Westsea Harbour (waiting for a berth east, enlist, train), and the teleport stone puts them aboard one of the last ships, which lands at Kingshaven.
- **Elves:** Aelindor; tutorial Grove of Waking "From Seedling to Sentinel...".
- **Dark elves (drow):** Velkarath; tutorial under Taskmistress Vhal.
- **Lizardfolk:** Ssarakh; tutorial Hatching Pools "From Hatchling to Brood-Guard...".
- Characters choose male/female.
''')
w('### Classes (live `classes` file)')
for ln in open(os.path.join(D, 'classes')):
    if ln.startswith(('class ', 'blurb ', 'races ')):
        w('- `' + ln.strip() + '`')
w('''
Guilds/schools: Mage Guild (tower off Eastreach; arcane), The Circle (druids/rangers; nature),
Drow Priesthood (Spider Queen), the Hidden Order (forbidden lore; tier-5 — **not built**: invitation and
tier-5 quests are open design space; flags `forbidden_lore`, `archmage_quest`, `archdruid_quest`).
Clans: player clans can claim the old clan halls in the old world. Crafting: mining, smithing, herbalism,
alchemy, woodcutting, fletching.
''')

w('## 3. Quest chains (full text, from the live server)\n')
for pre, name, mjs in CHAINS:
    w(f'### {name}\n')
    p = os.path.join(CITIES, mjs)
    if os.path.exists(p):
        w('```\n' + header_comment(p) + '\n```\n')
    mine = [i for i in quests if i.startswith(pre + '_')]
    if not mine and staged:
        mine = [i for i in staged if i.startswith(pre + '_')]
        if mine:
            w('_**Not installed on live yet**: built and tested on the scratch server; the text below is the staged build._\n')
            quests.update({i: staged[i] for i in mine})
    for qid in order(mine):
        quest_md(quests[qid])

w('### Bounty boards (repeatable daily kill quests)\n')
w('```\n' + header_comment(os.path.join(CITIES, 'bounties.mjs')) + '\n```\n')
w('| id | poster | giver/board | kill | reward |')
w('|---|---|---|---|---|')
for qid in sorted(i for i in quests if i.startswith('bt_')):
    q = quests[qid]; k = [s for s in q['steps'] if s['kind'] == 'kill']
    kk = f"{k[0]['count']} × {k[0]['mob']}" if k else ''
    r = q.get('reward', {})
    w(f"| {qid} | {q['title']} | {q.get('giver')} | {kk} | {r.get('gold',0)}g / {r.get('exp',0)}xp |")
w('')
other = [i for i in quests if i.split('_')[0] not in [c[0] for c in CHAINS] + ['bt']]
for qid in order(other):
    quest_md(quests[qid])

w('### Script-based quests and places (not in the quest system)\n')
for mjs in ['swamp.mjs', 'fireorb.mjs', 'gauntlet.mjs', 'grove.mjs', 'hatchery.mjs', 'velkarath.mjs',
            'aelindor.mjs', 'capital.mjs', 'eastreach.mjs', 'ssarakh.mjs', 'westsea.mjs',
            'circlewood.mjs', 'circlegrove.mjs', 'magetower.mjs', 'magetowerfloors.mjs', 'drowtemple.mjs',
            'arena.mjs', 'swampmobs.mjs', 'worldbosses.mjs', 'achievements.mjs', 'guildstubs.mjs']:
    p = os.path.join(CITIES, mjs)
    if os.path.exists(p):
        w(f'#### {mjs}\n```\n' + header_comment(p) + '\n```\n')

w('## 4. World bosses (live `worldbosses` file)\n')
for ln in open(os.path.join(D, 'worldbosses')):
    if ln.startswith('boss '):
        n, x, y, where, trophy, rares, ch = ln[5:].strip().split('|')
        w(f'- **{n}** — {where} ({x},{y}); trophy: {trophy}; rare: {rares}')
w('- Every ~3 h (±1 h) one rises for 60 min. Rewards 300 gold, 800 exp, trophy, 25% rare.\n')

w('## 5. NPCs and their everyday dialogue\n')
w('_Non-quest conversation of every scripted NPC, and what each says once its quests are done (quest lines are in section 3); a player gets the first stage that fits. '
  'Bounty posters omitted. Format: greeting, then *answer* → reply._\n')

def render_node(says, answers, ind, seen):
    if says: w(f'{ind}- "{says}"')
    # Answers already shown for this NPC aren't repeated; say so, or a
    # stage that shares them reads as having none.
    repeats = [a.get('label') for a in answers if (a.get('label'), a.get('reply')) in seen]
    if repeats: w(f'{ind}  - _(also: {", ".join(f"*{r}*" for r in repeats)}, as above)_')
    for a in answers:
        key = (a.get('label'), a.get('reply'))
        if key in seen: continue
        seen.add(key)
        flags = [e['flag'] for e in a.get('effects', []) if e.get('kind') == 'flag' and e.get('flag', '').startswith('lore_')]
        tag = f" `[{', '.join(flags)}]`" if flags else ''
        w(f'{ind}  - *{a.get("label")}* → "{a.get("reply","")}"{tag}')
        n = a.get('next')
        if n and (n.get('says') or n.get('answers')):
            render_node(n.get('says'), n.get('answers', []), ind + '    ', seen)

def cond(wh):
    k = wh.get('kind'); v = wh.get('value')
    return {'always': '', 'flag': f'if flag {v}', 'noflag': f'if not flag {v}'}.get(k, f'{k} {v}')

names = sorted(os.path.basename(f)[:-4] for f in glob.glob(os.path.join(D, 'talk/*.dlg')))
for n in names:
    if n.endswith('Bounty'): continue
    d = json.load(open(os.path.join(D, 'talk', n + '.dlg')))
    # Its own stages, and what it says once each of its quests is done
    # (a finished chain's NPC can talk differently: Old Bryn after the drum).
    done = lambda s: s.get('when', {}).get('kind') == 'flag' and str(s['when'].get('value', '')).endswith('_done')
    stages = [s for s in d.get('stages', []) if not s.get('quest') or done(s)]
    if not stages: continue
    w(f'### {n}')
    seen = set()
    for s in stages:
        c = cond(s.get('when', {}))
        if c: w(f'- _({c})_')
        render_node(s.get('says'), s.get('answers', []), '' if not c else '  ', seen)
    if d.get('shouts'):
        w('- Shouts: ' + ' / '.join(f'"{x if isinstance(x,str) else x.get("says", x)}"' for x in d['shouts']))
    w('')

# raw-script NPCs (no .dlg)
raw = sorted(f for f in glob.glob(os.path.join(D, 'talk/*')) if '.' not in os.path.basename(f) and os.path.basename(f) not in names)
if raw:
    w('### Older hand-written NPC scripts (lines only)\n')
    for f in raw:
        lines = re.findall(r'says: (.*?)"', open(f, errors='replace').read())
        lines = list(dict.fromkeys(lines))
        if not lines: continue
        w(f'**{os.path.basename(f)}**')
        for l in lines[:25]: w(f'- "{l}"')
        w('')

w('## 6. Open threads and hooks (not built yet)\n')
w('''- **Elowen at home** (decision N, built as Homecoming; decision R): she lives with Old Wenna off Kingshaven's plaza and will not sit on the throne; Halvard keeps governing and she keeps him honest. Her uncle's Grey Herald brought his first threat, signed "M." (she signs "E.": she learned it from him). **When he "comes himself"** is open.
- **Kraghul and the Ashen Horde** in the dunes above Eastreach; the Dry Ones (Sand Kings) serve him. Since the Firetown rift shut they are stranded on this side and want a gate opened; the pact with Morvane is broken (decision L).
- **Morvane, the Skeleton King**, still risen (east field world boss). He wants the crown and the chair (decision K; the chair is in game since Homecoming's letter, the crown's power over the dead is still secret): the crown of Zilen commands the kingdom's dead, and Kingshaven's empty throne would give him the living. He wants the gates kept shut, now that the Horde is his rival. Idea: Morvane's journal pages as boss drops.
- The other **six gates** (seven in all; only Firetown's opened). The Brood Stone is the last whole warden stone.
- The **grey blight** is a second gate wearing thin, under the withered grove far east of Aelindor (decision P; partly in game since The Grey Beneath: Ithrae names the heartstones warden stone, and Faelith admits it isn't the wind). Kraghul's Dry Ones dig at its root-crack; three heartstones pin it, but it is **held, not shut**.
- **How near the southern gate is to breaking**, now it is pinned. A true seal needs whole warden stone, and the only whole one left is the Brood Stone in Ssarakh ("and it stays"). **Kraghul knows someone stands in his way.**
- **The Spider Queen** (decision O; hinted to drow only, in A Strand Pulled Thin): the Weaver of the seals, a first-age power whose web binds the seven gates; the Drow serve her vigil, and her mark on every drow's palm is their "duty". A hook for the Drow Priesthood's quests.
- The ember, stone and frost **wyrms** that woke when the gate opened. They are young to dragonkind:
  **elder dragons** exist elsewhere (future endgame; where, and what they make of the young wyrms, is open).
- **What happened to King Aldric**: he stayed in the old world and is gone, dead or missing. Deliberately undecided (decision M): build nothing that answers it.
- **Morvane's crown** (decision K): his agent paid the robber boss to fetch it (SECRET: players only get
  Aldous's hint, "Someone paid for this one"; never name Morvane for it in game).
- **What Morvane will try next for the crown**, still on King Zilen's brow in the City of Light. **Which gate Kraghul goes after** (the southern one, decision P).
- **Guild invitation quests**: Mage Guild, The Circle; the Hidden Order and tier-5 quests (forbidden lore, archmage, archdruid).
- **The duergar**: they killed Jhaelra's patrol near Velkarath and dug up under Greystone Mine (Thrumgar's Grey Delve). Where they come from, whether the Delve's tunnels reach Velkarath's caverns, and why they came back, twenty years after their digging brought the Old Drift down, are open.
- **Old-world signposting**: Midnight/Izaru reachable only via Westsea and a tree hole; nothing points players there.
- Rogue class (later). Owned ships (on hold). The Fairy King's sealed glade.
- Old unfinished items: crystal box, nova package, bloody book (expensive shop items with no use).
''')

w('## 7. Waiting on flan\'s decisions\n')
w('''**Kept as they are:** Southfield's sign ("Visitors welcome; wolves not."; a village still lived in, flan's call 2026-10-21). By decision F: the King's Watch sign and Sergeant Wexley, the Royal Guard, Minstrel
Fenwick, the Royal Teller, the Harbourmaster and the Shipwright ("the crown").

**How quest lines join up** (checked 2026-10-21 on Greystone): when a giver has a next quest, the
last quest's "after" line is said first and the next offer straight after it, in one speech ("The carts
run again. Those crawlers came from somewhere..."). Reminders and "after" lines are followed by the NPC's
everyday greeting. So keep "after" lines short, and don't let a later offer repeat them.
''')

open(OUT, 'w').write('\n'.join(o) + '\n')
print(len(o), 'lines')
