#!/bin/sh
# The withered grove found from 8 squares (was 5), and the journal shows
# kills already kept for a later kill step (Quests.ahead; HANDOVER
# 2026-10-30). Run from this machine:
#   sh tools/golive_grove_radius.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Builds and installs the server classes, widens the two grove place
# steps in the live quest files, and restarts the game at once (quest
# files and classes are read at start-up).
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_grove_radius.sh"
  exit 1
fi
scp -q server/Quests.java duskserver:dusk-browser-client/server/
ssh duskserver 'sh -s' < server/build.sh | tail -1
ssh duskserver 'sh ~/dusk-browser-client/server/install.sh' | tail -1
ssh duskserver 'cd ~/DuskRPG/quests && mkdir -p ../backups/grove-radius && cp gw_grove.places gw_grove.json sg_return.places sg_return.json ../backups/grove-radius/ 2>/dev/null; sed -i "s/^\(gw_grove_1|618|1178|\)5|/\18|/" gw_grove.places; sed -i "s/^\(sg_return_1|618|1178|\)5|/\18|/" sg_return.places; sed -i "s/\"x\":618,\"y\":1178,\"radius\":5,/\"x\":618,\"y\":1178,\"radius\":8,/" gw_grove.json sg_return.json; grep -h 618 gw_grove.places sg_return.places'
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
sleep 10
ssh root@192.168.7.28 'pct exec 303 -- journalctl -u duskserver --since -20s --no-pager' | grep -E 'Started Server|rror|xception' || true
echo "Live: grove radius 8, journal shows kills kept ahead; the game restarted."
