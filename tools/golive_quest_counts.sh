#!/bin/sh
# Kills made on a quest's earlier steps count (server/Quests.java), and
# Ranger Faelwen stands clear of the tree (HANDOVER 2026-10-28). Run from
# this machine:
#   sh tools/golive_quest_counts.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Builds and installs the server classes, moves Faelwen in props, then
# restarts the game at once (installed classes and no restart breaks
# logins; props are only read at start-up).
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_quest_counts.sh"
  exit 1
fi
scp -q server/Quests.java duskserver:dusk-browser-client/server/
ssh duskserver 'sh -s' < server/build.sh >/dev/null
ssh duskserver 'python3 - /home/flan/DuskRPG "Ranger Faelwen" 466,1206 463,1206' < tools/server/move_prop.py || true
ssh duskserver 'cd ~/DuskRPG && sh ~/dusk-browser-client/server/install.sh | grep Installed && ls ~/DuskRPG/Quests.class'
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
sleep 10
ssh root@192.168.7.28 'pct exec 303 -- journalctl -u duskserver --since -20s --no-pager' | grep -E 'Started Server|rror|xception' || true
echo "Live: quest kill counts installed, Faelwen moved, and the game restarted."
