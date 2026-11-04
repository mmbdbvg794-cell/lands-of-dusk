#!/bin/sh
# Bounty boards in a grid (tools/server/bounty_grid.py; HANDOVER
# 2026-11-04). Run from this machine:
#   sh tools/golive_bounty_grid.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Applies the script, restarts the game at once (props and signs are read at
# start-up; no god "save" in between), then deploys the client (names).
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_bounty_grid.sh"
  exit 1
fi
ssh duskserver 'python3 - ~/DuskRPG --apply' < tools/server/bounty_grid.py
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
sleep 10
ssh root@192.168.7.28 'pct exec 303 -- journalctl -u duskserver --since -20s --no-pager' | grep -E 'Started Server|rror|xception' || true
sh tools/deploy.sh | tail -1
echo "Live: bounty boards in grids, the game restarted, the client deployed."
