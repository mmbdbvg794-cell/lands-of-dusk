#!/bin/sh
# Classes chosen at the end of the race tutorials, tried in their training
# yards (HANDOVER 2026-10-27). Run from this machine:
#   sh tools/golive_class_trials.sh
# Stops if anyone but gods is online (ANYWAY=1 to go on regardless).
# Deploys the client (and server sources), builds and installs the server
# classes, builds the four trial keepers' bundles from live's map and
# props and installs them, puts the class gate on the nine end stones and
# the tutorial boxes in the classes file (install_class_trials.py), then
# restarts the game at once: installed classes and no restart breaks
# logins, and the old server never sets classchosen, so its stones would
# hold everyone back.
set -eu
cd "$(dirname "$0")/.."
online=$(ssh duskserver "python3 -c 'import json; print(\" \".join(p[\"name\"] for p in json.load(open(\"DuskRPG/who.json\"))[\"players\"] if not p.get(\"god\")))'")
if [ -n "$online" ] && [ "${ANYWAY:-}" != 1 ]; then
  echo "Online now: $online. Try later, or ANYWAY=1 sh tools/golive_class_trials.sh"
  exit 1
fi
sh tools/deploy.sh
ssh duskserver 'sh -s' < server/build.sh
T=$(mktemp -d)
scp -q duskserver:DuskRPG/shortmap "$T/"
ssh duskserver "cd ~/DuskRPG/defProps && python3 -c 'import json; print(json.dumps({n: open(n, encoding=\"latin-1\").read() for n in [\"Guard\", \"Elf\", \"Dark Elf Man\", \"lizardfolk\"]}))'" > "$T/props.json"
for r in human elf darkelf lizardman; do
  node tools/world/city.mjs "tools/world/cities/classtrials-$r.mjs" "$T/shortmap" "$T/$r" "$T/props.json"
  scp -q "$T/$r/bundle.json" "duskserver:/tmp/classtrials-$r.json"
done
scp -q tools/world/install_city.py duskserver:/tmp/install_city.py
ssh duskserver 'sh ~/dusk-browser-client/server/install.sh && ls ~/DuskRPG/Classes.class'
ssh duskserver 'python3 - ~/DuskRPG --apply' < tools/server/install_class_trials.py
for r in human elf darkelf lizardman; do
  ssh duskserver "python3 /tmp/install_city.py ~/DuskRPG /tmp/classtrials-$r.json"
done
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
echo "Live: class trials installed and the game restarted."
