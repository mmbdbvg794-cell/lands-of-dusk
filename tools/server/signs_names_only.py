#!/usr/bin/env python3
"""Signs say only the place's name (the user, 2026-10-29: "Just make sure
it's the name. No descriptors like that unless they are in a tutorial."):
no prices, services, who-to-see or how-to; the direction signposts go.
Warnings and story inscriptions keep their words. The city plans say the
same now.

    python3 - <game dir> [--apply] < tools/server/signs_names_only.py

Without --apply it says what it would change. The signs and signnames
files are copied to backups/signs-names-<time>/ first. A sign is only
changed if it still says what it said (changed in game since: left, and
listed). Running it again changes nothing. Signs are read at start-up:
restart after it, with no god "save" in between.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
APPLY = "--apply" in sys.argv
GONE = None
# (x, y): (the start of what it says now, what it says after, or GONE)
SIGNS = {
    # Aelindor
    (472, 1232): ("The Elder's Hall.", "The Elder's Hall"),
    (474, 1232): ("The Moon Shrine.", "The Moon Shrine"),
    (452, 1246): ("The Silver Leaf:", "The Silver Leaf"),
    (492, 1246): ("The Bank of Aelindor:", "The Bank of Aelindor"),
    (450, 1248): ("Caelum's Bows:", "Caelum's Bows"),
    (459, 1248): ("Sylwen's:", "Sylwen's Cloth and Leather"),
    (488, 1248): ("Miriel's Herbs:", "Miriel's Herbs"),
    (497, 1248): ("The Training Glade.", "The Training Glade"),
    (474, 1219): ("Aelindor, city of the elves.", "Aelindor"),
    (472, 1274): ("Aelindor, city of the elves.", "Aelindor"),
    (439, 1246): ("Aelindor, city of the elves.", "Aelindor"),
    (506, 1248): ("Aelindor, city of the elves.", "Aelindor"),
    (447, 1186): ("Aelindor Landing.", "Aelindor Landing"),
    (474, 1193): ("Aelindor Landing, west along the road", GONE),
    (468, 1210): ("The Green Wardens.", "The Green Wardens"),
    # Velkarath
    (1348, 906): ("The Palace of House Xalyth.", "The Palace of House Xalyth"),
    (1320, 910): ("The Black Lantern:", "The Black Lantern"),
    (1318, 921): ("Szinra's Alchemy:", "Szinra's Alchemy"),
    (1332, 921): ("Ryld's Blades:", "Ryld's Blades"),
    (1359, 922): ("The Bank of Velkarath:", "The Bank of Velkarath"),
    (1375, 921): ("The Pit.", "The Pit"),
    (1379, 914): ("The barracks of the city guard.", "The Barracks"),
    (1340, 941): ("The Fungus Gardens.", "The Fungus Gardens"),
    (1349, 941): ("The Night Market:", "The Night Market"),
    # Harbours, Eastreach and its frontier
    (93, 354): ("Westsea Harbour.", "Westsea Harbour"),
    (105, 214): ("South through the forest to Westsea Harbour.", GONE),
    (1688, 1305): ("Eastreach.", "Eastreach"),
    (1672, 1298): ("The Warden's Post.", "The Warden's Post"),
    (1614, 1338): ("The Eastreach lookout.", "The Old Lookout"),
    (1580, 1383): ("Old Tamsin.", "Tamsin's Cabin"),
    (36, 965): ("The Champions' Gauntlet:", "The Champions' Gauntlet"),
    # Kingshaven
    (1438, 347): ("The Grand Plaza of Kingshaven.", "The Grand Plaza"),
    (1414, 337): ("The Royal Keep of Kingshaven.", "The Royal Keep"),
    (1461, 337): ("The Cathedral of Light.", "The Cathedral of Light"),
    (1418, 347): ("Hammer and Anvil:", "Hammer and Anvil"),
    (1428, 347): ("The Iron Shell:", "The Iron Shell"),
    (1445, 347): ("The Royal Armoury:", "The Royal Armoury"),
    (1455, 347): ("The Fletcher's:", "The Fletcher's"),
    (1443, 367): ("The Bubbling Flask:", "The Bubbling Flask"),
    (1453, 367): ("Gems of the Crown:", "Gems of the Crown"),
    (1418, 367): ("Tome and Wand:", "Tome and Wand"),
    (1429, 367): ("Cobb's Provisions:", "Cobb's Provisions"),
    (1418, 359): ("Needle and Thread:", "Needle and Thread"),
    (1449, 348): ("The Royal Bank:", "The Royal Bank"),
    (1413, 380): ("The Market Square:", "The Market Square"),
    (1451, 388): ("The Crown and Anchor:", "The Crown and Anchor"),
    (1472, 349): ("The Wayfarer's Rest:", "The Wayfarer's Rest"),
    (1401, 359): ("The Gilded Griffin:", "The Gilded Griffin"),
    (1419, 347): ("The Rusty Tankard:", "The Rusty Tankard"),
    (1401, 378): ("The Drunken Dragon:", "The Drunken Dragon"),
    (1472, 360): ("The Barracks of the City Watch", "The Barracks"),
    (1455, 359): ("The Mages' Guild of Kingshaven.", "The Mages' Guild"),
    (1469, 378): ("The Warriors' Guild of Kingshaven.", "The Warriors' Guild"),
    (1409, 347): ("Lantern Row:", "Lantern Row"),
    (1439, 319): ("Kingshaven, the capital.", "Kingshaven"),
    (1434, 398): ("Kingshaven, the capital.", "Kingshaven"),
    (1387, 361): ("Kingshaven, the capital.", "Kingshaven"),
    (1486, 356): ("Kingshaven, the capital.", "Kingshaven"),
    (1459, 402): ("The Harbourmaster of Kingshaven.", "The Harbourmaster"),
    (1468, 397): ("The Salty Mermaid:", "The Salty Mermaid"),
    (1416, 403): ("The Kingshaven ferry pier.", "The Kingshaven Ferry"),
    (1504, 346): ("The King's Watch.", "The King's Watch"),
    (1517, 337): ("The Duelling Ring.", "The Duelling Ring"),
    (1435, 318): ("West along the road: the farms.", GONE),
    (1496, 357): ("North, up the lane: the Watch post.", GONE),
    (1399, 300): ("North, up the lane: the meadow.", GONE),
    (1441, 351): ("North: keep, cathedral, north gate.", GONE),
    (1433, 340): ("North: the north gate and the farms.", GONE),
    (1413, 356): ("West: the west gate and landing.", GONE),
    (1459, 360): ("East: the east gate,", GONE),
    (1438, 375): ("South: the south gate and the harbour.", GONE),
    # Bounty boards
    (1452, 352): ("Kingshaven's bounty board.", "Kingshaven Bounty Board"),
    (481, 1227): ("Aelindor's bounty board.", "Aelindor Bounty Board"),
    (1347, 907): ("Velkarath's bounty board.", "Velkarath Bounty Board"),
    (1678, 1305): ("Eastreach's bounty board.", "Eastreach Bounty Board"),
    (107, 153): ("the City of Light's bounty board.", "City of Light Bounty Board"),
    (447, 83): ("Midnight's bounty board.", "Midnight Bounty Board"),
    (538, 16): ("Southfield's bounty board.", "Southfield Bounty Board"),
    (1695, 946): ("Ssarakh's bounty board.", "Ssarakh Bounty Board"),
    # Ssarakh
    (1697, 932): ("The Hall of the Brood.", "The Hall of the Brood"),
    (1713, 937): ("The Shaman's hut.", "The Shaman's Hut"),
    (1684, 934): ("The Mire Bank.", "The Mire Bank"),
    (1684, 949): ("The Basking Rock.", "The Basking Rock"),
    (1695, 941): ("The Brood Stone of Ssarakh.", "The Brood Stone of Ssarakh"),
    (1691, 960): ("Ssarakh, the Mire City", "Ssarakh"),
    (1691, 988): ("Ssarakh harbour.", "Ssarakh Harbour"),
    (1689, 948): ("South: the harbour.", GONE),
    (1704, 940): ("East: the Shaman's hut", GONE),
    # Mines, villages, the Mage Guild
    (352, 287): ("Izaru Mine.", "Izaru Mine"),
    (527, 16): ("Southfield village.", "Southfield"),
    (1480, 191): ("Greystone Mine.", "Greystone Mine"),
    (862, 223): ("Pickwright's:", "Pickwright's Tools"),
    (873, 224): ("East: the gallery", GONE),
    (871, 241): ("Lower Workings.", "The Lower Workings"),
    (898, 252): ("The Deep Seam.", "The Deep Seam"),
    (872, 215): ("Bunkhouse.", "The Bunkhouse"),
    (47, 541): ("The Mage Guild: the Initiates' Hall", "The Initiates' Hall"),
    (47, 556): ("The Mage Guild: the Apprentices' Library", "The Apprentices' Library"),
    (47, 571): ("The Mage Guild: the Adepts' Study", "The Adepts' Study"),
    (47, 586): ("The Mage Guild: the Masters' Sanctum", "The Masters' Sanctum"),
    (47, 601): ("The Mage Guild: the Archmage's Spire", "The Archmage's Spire"),
    (768, 1532): ("Last Water.", "Last Water"),
    # The old world: only prices and service notes
    (461, 62): ("Inn pricing: 300gp per night", GONE),
    (984, 961): ("1 Room = 150 gp", GONE),
    (91, 147): ("'Step here to get help on bank commands.'", "Bank"),
    (475, 92): ("Watts can currently only make these types of armor", GONE),
    (35, 24): ("Sun-bleached and cracked: Welcome to the Gladiators Arena", "Sun-bleached and cracked: the Gladiators Arena"),
}


def read(name):
    with open(os.path.join(G, name), encoding="latin-1", newline="") as f:
        return f.read().split("\n")


def num(s):
    try:
        return int(s.strip())
    except ValueError:
        return None


signs, names = read("signs"), read("signnames")
out, gone, said, left = [], set(), [], []
seen = set()
i = 0
while i < len(signs):
    at = (num(signs[i + 1]), num(signs[i + 2])) if i + 2 < len(signs) else None
    if at in SIGNS and at not in seen:
        seen.add(at)
        was, now = SIGNS[at]
        text = signs[i]
        if now is not GONE and text == now:
            pass
        elif not text.startswith(was):
            left.append(f"{at[0]},{at[1]}: says {text[:60]!r} now, not {was!r}")
        elif now is GONE:
            gone.add(at)
            said.append(f"remove  {at[0]},{at[1]}: {text[:70]}")
            i += 3
            continue
        else:
            said.append(f"name    {at[0]},{at[1]}: {now}")
            out += [now, signs[i + 1], signs[i + 2]]
            i += 3
            continue
        out += signs[i:i + 3]
        i += 3
        continue
    out.append(signs[i])
    i += 1
for at in SIGNS:
    if at not in seen:
        left.append(f"{at[0]},{at[1]}: no sign there")
out_names = []
i = 0
while i < len(names):
    at = (num(names[i]), num(names[i + 1])) if i + 2 < len(names) else None
    if at in gone:
        said.append(f"label   {at[0]},{at[1]}: {names[i + 2]} (removed)")
        i += 3
        continue
    out_names.append(names[i])
    i += 1

for s in said:
    print(("" if APPLY else "would ") + s)
for s in left:
    print("left    " + s)
if not said:
    print("Nothing to change.")
elif APPLY:
    keep = os.path.join(G, "backups", time.strftime("signs-names-%Y%m%d-%H%M%S"))
    os.makedirs(keep, exist_ok=True)
    for name, lines in (("signs", out), ("signnames", out_names)):
        shutil.copy2(os.path.join(G, name), keep)
        with open(os.path.join(G, name), "w", encoding="latin-1", newline="") as f:
            f.write("\n".join(lines))
    print(f"{len(said)} changes; backed up in {keep}. Restart the server for it to take effect.")
else:
    print(f"{len(said)} changes. Run with --apply.")
