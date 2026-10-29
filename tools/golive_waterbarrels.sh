#!/bin/sh
# Water barrels and waterskins (tools/world/cities/waterbarrels.mjs,
# tools/server/add_waterskins.py; HANDOVER 2026-10-29). Run from this
# machine:
#   sh tools/golive_waterbarrels.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Installs the barrels and the waterskin items, adds waterskins to the
# shops that sell water, restarts the game at once (props and shops are
# only read at start-up; no god "save" in between), then deploys the
# client (the talk editor's new effects, and the waterskin icon, painted
# from live's item names).
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_waterbarrels.sh"
  exit 1
fi
T=$(mktemp -d)
scp -q duskserver:DuskRPG/shortmap "$T/"
ssh duskserver "cd ~/DuskRPG/defProps && python3 -c 'import json; print(json.dumps({n: open(n, encoding=\"latin-1\").read() for n in [\"barrel\"]}))'" > "$T/props.json"
node tools/world/city.mjs tools/world/cities/waterbarrels.mjs "$T/shortmap" "$T/out" "$T/props.json"
scp -q "$T/out/bundle.json" duskserver:/tmp/waterbarrels.json
scp -q tools/world/install_city.py duskserver:/tmp/install_city.py
ssh duskserver 'python3 /tmp/install_city.py ~/DuskRPG /tmp/waterbarrels.json --old-world'
ssh duskserver 'python3 - ~/DuskRPG --apply' < tools/server/add_waterskins.py
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
sleep 10
ssh root@192.168.7.28 'pct exec 303 -- journalctl -u duskserver --since -20s --no-pager' | grep -E 'Started Server|rror|xception' || true
sh tools/deploy.sh | tail -1
echo "Live: water barrels and waterskins installed, the game restarted, the client deployed."
