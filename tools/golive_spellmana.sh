#!/bin/sh
# Spell and mana rework, live (docs/spell-rework.md). Run from the repo:
#   sh tools/deploy.sh && ssh duskserver sh -s < tools/golive_spellmana.sh
# (runs on duskserver as flan), then restart AT ONCE: restart 10 in game,
# no god save first. Installed classes without a restart break logins.
# Uses the tools tested on scratch, in /tmp/spellmana on duskserver.
# Backup taken before: ~/DuskRPG/backups/spellmana-live-20261013-192305.tar.gz
set -eu
G=$HOME/DuskRPG
T=/tmp/spellmana
echo "== build"
sh $HOME/dusk-browser-client/server/build.sh > /tmp/livebuild.log 2>&1 || { tail /tmp/livebuild.log; exit 1; }
ls /tmp/dusk-storage-build/out/SpellGroup.class /tmp/dusk-storage-build/out/Script.class >/dev/null
echo "== game files"
python3 $T/fix_spell_mana.py $G --apply | tail -1
python3 $T/spell_cleanup.py $G --apply | tail -1
echo "== joe and bluntman: the new start pools (only if offline)"
python3 - <<'PY'
import json, os
G = os.path.expanduser("~/DuskRPG")
online = {p["name"].lower() for p in json.load(open(G + "/who.json"))["players"]}
for name, add in (("joe", 18), ("bluntman", 22)):
    if name in online:
        print(name, "is online: skipped (do it later while they're out)")
        continue
    for f in (f"{G}/users/{name}", f"{G}/users/{name}.backup"):
        if not os.path.exists(f):
            continue
        l = open(f, encoding="latin-1").read().split("\n")
        i = next(k for k in range(len(l) - 1) if l[k] == "maxmp")
        l[i + 1] = str(int(l[i + 1]) + add)
        j = next(k for k in range(len(l) - 1) if l[k] == "mp")
        l[j + 1] = l[i + 1]
        open(f, "w", encoding="latin-1").write("\n".join(l))
        print(f, "max MP now", l[i + 1])
PY
echo "== install classes"
cd $G && sh $HOME/dusk-browser-client/server/install.sh | tail -1
echo "DONE: restart now (restart 10 in game), no god save first."
