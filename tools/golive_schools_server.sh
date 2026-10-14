#!/bin/sh
# The duskserver half of tools/golive_schools.sh (run by it, as flan).
set -eu
G=$HOME/DuskRPG
T=/tmp/schools
cd "$G"
B=backups/schools-golive-$(date +%Y%m%d-%H%M%S)
mkdir -p "$B"
tar czf "$B/before.tar.gz" defSpells defSpellGroups merchants classes spellcooldowns defConditions users scripts defItems defProps defMoveActions talk props signs mobs shortmap *.class storage-originals
echo "== backup: $G/$B/before.tar.gz"
echo "== build"
sh "$HOME/dusk-browser-client/server/build.sh" > /tmp/livebuild.log 2>&1 || { tail /tmp/livebuild.log; exit 1; }
grep -c "Patched spell costs" /tmp/livebuild.log
echo "== data"
python3 $T/schools_phase1.py "$G" --apply --players | tail -1
python3 $T/schools_phase2.py "$G" --apply | tail -1
python3 $T/schools_phase4.py "$G" --apply | tail -1
echo "== places"
for b in guildstubs magetower circlewood drowtemple; do python3 $T/install_city.py "$G" $T/$b.json | grep -E "map:|files:|shops:"; done
python3 $T/install_city.py "$G" $T/magetowerfloors.json --old-world | grep -E "map:|files:|shops:"
echo "== install classes"
sh "$HOME/dusk-browser-client/server/install.sh" | tail -1
echo "DONE: restart now."
