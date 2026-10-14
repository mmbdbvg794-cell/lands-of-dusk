#!/bin/sh
# Schools pass 1 (docs: HANDOVER.md, 2026-10-13 23:20 on), to live in one go:
#   sh tools/golive_schools.sh
# Builds the map bundles against live's map as it is now, deploys the client
# and server sources, then on duskserver: a fresh backup, the server build,
# the three data tools, the five bundles and the class install. Restart at
# once after it says DONE (installed classes without a restart break logins).
set -eu
cd "$(dirname "$0")/.."
S=$(mktemp -d)
ssh duskserver 'cd ~/DuskRPG && tar cf - shortmap props mobs signs merchants' | tar xf - -C "$S"
ssh duskserver 'cd ~/DuskRPG/defProps && python3 -c "import json;print(json.dumps({n:open(n,encoding=\"latin-1\").read() for n in [\"Villager Woman\",\"hermit\"]}))"' > "$S/props.json"
for p in guildstubs magetower magetowerfloors circlewood drowtemple; do
  node tools/world/city.mjs "tools/world/cities/$p.mjs" "$S/shortmap" "$S/$p" "$S/props.json"
  cp "$S/$p/bundle.json" "$S/$p.json"
done
sh tools/deploy.sh
ssh duskserver 'mkdir -p /tmp/schools'
scp -q tools/server/schools_phase1.py tools/server/schools_phase2.py tools/server/schools_phase4.py tools/world/install_city.py \
  "$S/guildstubs.json" "$S/magetower.json" "$S/magetowerfloors.json" "$S/circlewood.json" "$S/drowtemple.json" duskserver:/tmp/schools/
ssh duskserver sh -s < tools/golive_schools_server.sh
