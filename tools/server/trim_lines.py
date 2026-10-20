#!/usr/bin/env python3
"""Shorter NPC lines (the user, 2026-10-20: directions and instructions were
far too long to read). Edits a COPY of the game's talk/ (argv[1]): the .dlg
files only; then tools/server/regen_talk.mjs <dir> <list> rebuilds their
scripts (every live script rebuilds exactly from its .dlg), and the pairs
are copied into talk/ (.dsko removed). The city plans say the same.
Chieftain Hesska is rebuilt from ssarakh.mjs by regen_hesska.mjs instead;
Sergeant Wexley was trimmed piece by piece as kingswatch.mjs builds him
(see the end). Prints the names changed.
"""
import json, os, re, sys
D = sys.argv[1]
changed = set()

def load(n): return json.load(open(f'{D}/{n}.dlg', encoding='latin-1'))
def save(n, d):
    open(f'{D}/{n}.dlg', 'w', encoding='latin-1').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
    changed.add(n)

def text_swap(n, pairs):
    s = open(f'{D}/{n}.dlg', encoding='latin-1').read(); o = s
    for a, b in pairs:
        a, b = json.dumps(a)[1:-1], json.dumps(b)[1:-1]
        if a not in s and b not in s: print('  NOT FOUND in', n, ':', a[:50])
        s = s.replace(a, b)
    if s != o:
        open(f'{D}/{n}.dlg', 'w', encoding='latin-1').write(s); changed.add(n)

ask = lambda label, reply: {'label': label, 'reply': reply, 'effects': []}
CITY = 'The keep is north-west, the cathedral north-east, and the Grand Plaza where the avenues cross. Shops and the bank are round the plaza.'
HARBOUR = 'Through the south gate. The ferries leave from the longest pier.'
WATCH = "Sergeant Wexley's post, just outside this gate: north of the road, behind the first houses. She takes on volunteers."
GREET = 'Welcome to Kingshaven. Need directions?'
for n, extra in [('Gate Guard North', []), ('Gate Guard West', []), ('Gate Guard South', []), ('Gate Guard East', [ask('Watch post', WATCH)])]:
    d = load(n); st = d['stages'][0]
    if st['says'] != GREET:
        bye = [a for a in st.get('answers', []) if a.get('label') == 'Farewell']
        st['says'] = GREET
        st['answers'] = [ask('City', CITY), ask('Harbour', HARBOUR if n != 'Gate Guard South' else 'Through this gate: ferries, fish and the Salty Mermaid. The ferries leave from the longest pier.')] + extra + bye
        save(n, d)

OLD_DIR = 'The keep is to the north-west, the cathedral to the north-east, and the grand plaza where the avenues cross. Shops and the bank are round the plaza, the market south-west of it, the inns and taverns all over, and the harbour through the south gate.'
NEW_DIR = 'The keep is north-west, the cathedral north-east, and the Grand Plaza where the avenues cross. The harbour is through the south gate.'
text_swap('Lord Steward Halvard', [(OLD_DIR, NEW_DIR)])

text_swap('Elf Guard', [("The Elder's hall is to the north-west of the Moonwell, the shrine to the north-east. Shops and the inn are along the avenues. The road north of this gate runs to Aelindor Landing, where the ships put in. Keep the peace and you're welcome here.",
                         "The Elder's hall is north-west of the Moonwell, the shrine north-east. The road north of this gate runs to Aelindor Landing and its ships.")])
text_swap('Harbourmaster Quint', [("Every ship that ties up here pays its due to the crown. The ferries call at the longest pier, west along the quay, with the Kingshaven Ferry sign at its head: the Royal Swan from Westsea, the Gannet from Eastreach. Captain Rowan sells the tickets, out at its end.",
                                   "Every ship here pays the crown its due. The ferries use the longest pier, west along the quay. Captain Rowan sells tickets at its end.")])

d = load('Chieftain Hesska'); st = d['stages'][4]
HG = 'Ssss. Welcome to Ssarakh, warm-blood or scale-kin. What do you seek?'
if st['says'] != HG:
    st['says'] = HG
    st['answers'] = [ask('Work', 'The bounty board on the plaza. Mind the bog pools: they keep what they take.'),
                     ask('Training', 'Shaman Ithrae, along the east street, teaches those with experience to spend.'),
                     ask('Ships', 'The Marsh Wren sails for Eastreach from the pier at the south end of the city.'),
                     ask('The sands', 'East, past the mire. Beware the Dry Ones there. They were brood once.'),
                     ask('Farewell', 'The mire keeps us.')]
    save('Chieftain Hesska', d)

text_swap('Ringmaster Corvin', [("Welcome to the Duelling Ring. Step onto the sand with someone you want to fight, and type duel and their name. When they accept, you face off on a count of three, and fight until one of you falls. Nobody dies here, and nobody loses gold or experience: you walk out as you walked in, only wiser. Type duel on its own to see your record.",
                                 "Welcome to the Duelling Ring. Step onto the sand and type duel and a name. Nobody dies or loses a thing here. Type duel alone for your record.")])
text_swap('Overseer Garrick', [("Welcome to Greystone. Bronze and iron in the east gallery, coal and more iron down in the lower workings, and if you've the arm for it, mithril in the deep seam. Dig what you like, just don't bring the roof down.",
                                "Welcome to Greystone. Bronze and iron in the east gallery, coal below, mithril in the deep seam. Just don't bring the roof down.")])

OLD_TIP = " (To talk with other players, press Enter or tap the box at the bottom, then start with ' to speak to those nearby, or ; to be heard across the land.)"
NEW_TIP = " (To chat: press Enter, then start with ' for those nearby or ; for everyone.)"
text_swap('Warden Elarion', [("Welcome, child of the Mother Tree. Aelindor will need you one day. Will you learn the ways of the wood first, or do you feel ready already?", "Welcome, child of the Mother Tree. Will you learn the ways of the wood first, or are you ready already?"), (OLD_TIP, NEW_TIP)])
text_swap('Taskmistress Vhal', [("So, the newest hatchling of Velkarath crawls out of its cell. Will you be trained, or do you think yourself ready for the city?", "So, the newest hatchling crawls out of its cell. Will you be trained, or are you ready for the city?"), (OLD_TIP, NEW_TIP)])
text_swap('Brood-Mother Ssethra', [("Out of the shell at last. The brood remembers every egg, and now it remembers you. Will you learn the ways of the mire first, or do you think yourself grown already?", "Out of the shell at last. Will you learn the ways of the mire first, or are you grown already?"), (OLD_TIP, NEW_TIP)])
text_swap('Recruiter', [(OLD_TIP, NEW_TIP)])
text_swap('Drill Sergeant', [("*takes the straw stuffing* Ha! Knocked the stuffing right out of it. You'll do, recruit. Every fight earns you experience: a trainer turns it into strength and skill. Through the east door is the Quartermaster: get yourself some supplies.",
                              "*takes the straw stuffing* Ha! You'll do, recruit. Every fight earns experience: a trainer turns it into strength. The Quartermaster's through the east door.")])
text_swap('Matron Xalyth', [("House Xalyth remembers those who serve it. Now make yourself useful: the bounty board by the Fire Well pays hunters, and the surface folk are building a town called Eastreach, a long walk east of our east stair. Learn what they are about. Serve well.",
                             "Serve well. Hunt for the bounty board, or climb the east stair and learn what the surface folk are building at Eastreach."),
                            ("A hatchling, fresh from the cells below. My House fed you and trained you; now you will show it was worth the trouble. Until the Spider Queen marks you, you are nothing in Velkarath. Will you take her mark?",
                             "A hatchling from the cells below. Until the Spider Queen marks you, you are nothing in Velkarath. Will you take her mark?")])
text_swap('Sergeant Wexley', [("Good. Out of the north gate and west along the road: they're in the meadow north of the farms. Go up the lane beside Farmer Hollin's, the last farm on the road, then east. Five of them should send the rest running.",
                               "Good. Out of the north gate, west along the road, then up the lane beside Farmer Hollin's farm. Five of them should send the rest running."),
                              ("The coast road is quiet. Pedlars are buying the Watch drinks, if you can believe it. This one is no job for a fresh recruit. Shepherds swear the dead are walking in the hidden valley in the hills north-east, round an old barrow. Two of my men went to look. One came back. Will you go?",
                               "No job for a fresh recruit, this. The dead are walking round an old barrow, in a hidden valley in the hills north-east. Two of my men went. One came back. Will you go?"),
                              ("The farmers are sleeping again. The Watch remembers its friends. Pedlars on the coast road keep coming in with empty pockets. Thieves, holed up somewhere on the wooded point south-east of the city. Find their hideout, break them, and bring back what they took.",
                               "The farmers sleep again. Now pedlars on the coast road come in with empty pockets: thieves, on the wooded point south-east of the city. Break them and bring back what they took.")])

# Bounty notices: the board's sign says one a day; the notice needn't.
for f in sorted(os.listdir(D)):
    if not f.endswith(' Bounty.dlg'): continue
    n = f[:-4]; s = open(f'{D}/{f}', encoding='latin-1').read(); o = s
    s = re.sub(r" Reward: (\d+) gold and (\d+) experience, paid at this board\.", r" Reward: \1 gold, \2 exp.", s)
    s = re.sub(r" One bounty a day from [^.]*'s board, whichever notice you pick\.", "", s)
    s = s.replace("in the meadow north of the farms: out of the north gate, west along the road to Farmer Hollin's, the last farm, then up the lane beside it", "in the meadow up the lane beside Farmer Hollin's, the last farm west of the north gate")
    if s != o:
        open(f'{D}/{f}', 'w', encoding='latin-1').write(s); changed.add(n)
print('\n'.join(sorted(changed)))
