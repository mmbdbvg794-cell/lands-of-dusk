#!/bin/sh
# Saelin's Armoury in Aelindor, and Caelum's Bows down to bows, with two
# new ones (tools/server/caelum_bows.py)
# (tools/world/cities/aelindorarmoury.mjs, tools/server/split_caelum.py;
# HANDOVER 2026-10-30). Run from this machine:
#   sh tools/golive_saelin.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Installs the stall, moves the wares, restarts the game at once (map,
# props, shops and signs are read at start-up; no god "save" in between).
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_saelin.sh"
  exit 1
fi
T=$(mktemp -d)
scp -q duskserver:DuskRPG/shortmap "$T/"
ssh duskserver "cd ~/DuskRPG/defProps && python3 -c 'import json; print(json.dumps({n: open(n, encoding=\"latin-1\").read() for n in [\"Elf Woman\"]}))'" > "$T/props.json"
node tools/world/city.mjs tools/world/cities/aelindorarmoury.mjs "$T/shortmap" "$T/out" "$T/props.json"
scp -q "$T/out/bundle.json" duskserver:/tmp/armoury.json
scp -q tools/world/install_city.py duskserver:/tmp/install_city.py
ssh duskserver 'python3 /tmp/install_city.py ~/DuskRPG /tmp/armoury.json'
ssh duskserver 'python3 - ~/DuskRPG --apply' < tools/server/split_caelum.py
ssh duskserver 'python3 - ~/DuskRPG --apply' < tools/server/caelum_bows.py
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
sleep 10
ssh root@192.168.7.28 'pct exec 303 -- journalctl -u duskserver --since -20s --no-pager' | grep -E 'Started Server|rror|xception' || true
sh tools/deploy.sh | tail -1
echo "Live: Saelin's Armoury open, Caelum sells bows (two new); the game restarted, the client deployed."
