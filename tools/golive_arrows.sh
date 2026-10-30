#!/bin/sh
# Arrows and quivers removed (tools/server/remove_arrows.py; HANDOVER
# 2026-10-30). Run from this machine:
#   sh tools/golive_arrows.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Applies the script, restarts the game at once (shops are read at
# start-up; no god "save" in between), then deploys the client (help text).
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_arrows.sh"
  exit 1
fi
ssh duskserver 'python3 - ~/DuskRPG --apply' < tools/server/remove_arrows.py
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
sleep 10
ssh root@192.168.7.28 'pct exec 303 -- journalctl -u duskserver --since -20s --no-pager' | grep -E 'Started Server|rror|xception' || true
sh tools/deploy.sh | tail -1
echo "Live: arrows and quivers gone, the game restarted, the client deployed."
