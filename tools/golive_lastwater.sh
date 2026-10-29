#!/bin/sh
# Last Water, the oasis outpost in the southern desert
# (tools/world/cities/lastwater.mjs; HANDOVER 2026-10-29). Run from this
# machine:
#   sh tools/golive_lastwater.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Builds the bundle from live's map and props, installs it, then restarts
# the game at once (map, props, shops, signs and mobs are only read at
# start-up; no god "save" in between).
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_lastwater.sh"
  exit 1
fi
T=$(mktemp -d)
scp -q duskserver:DuskRPG/shortmap "$T/"
ssh duskserver "cd ~/DuskRPG/defProps && python3 -c 'import json; print(json.dumps({n: open(n, encoding=\"latin-1\").read() for n in [\"Villager\", \"lizardfolk\", \"Guard\", \"chair\", \"well\", \"barrel\", \"campfire\", \"bed\"]}))'" > "$T/props.json"
node tools/world/city.mjs tools/world/cities/lastwater.mjs "$T/shortmap" "$T/out" "$T/props.json"
scp -q "$T/out/bundle.json" duskserver:/tmp/lastwater.json
scp -q tools/world/install_city.py duskserver:/tmp/install_city.py
ssh duskserver 'python3 /tmp/install_city.py ~/DuskRPG /tmp/lastwater.json'
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
sleep 10
ssh root@192.168.7.28 'pct exec 303 -- journalctl -u duskserver --since -20s --no-pager' | grep -E 'Started Server|rror|xception' || true
echo "Live: Last Water installed and the game restarted."
