#!/bin/sh
# The Mage Guild tower's furnishing, The Circle's grove, and named trainers,
# to live: sh tools/golive_furnish.sh, then restart at once (map, props and
# merchants are read at startup; no god save in between).
set -eu
cd "$(dirname "$0")/.."
S=$(mktemp -d)
ssh duskserver 'cd ~/DuskRPG && tar cf - shortmap props mobs signs merchants' | tar xf - -C "$S"
for p in magetowerfloors circlegrove drowtemple; do
  node tools/world/city.mjs "tools/world/cities/$p.mjs" "$S/shortmap" "$S/$p"
  cp "$S/$p/bundle.json" "$S/$p.json"
done
ssh duskserver 'mkdir -p /tmp/schools'
scp -q tools/world/install_city.py "$S/magetowerfloors.json" "$S/circlegrove.json" "$S/drowtemple.json" duskserver:/tmp/schools/
ssh duskserver 'set -eu; cd ~/DuskRPG; B=backups/furnish-$(date +%Y%m%d-%H%M%S); mkdir -p $B; tar czf $B/before.tar.gz shortmap props merchants signs defMoveActions; echo "backup: ~/DuskRPG/$B/before.tar.gz"; cd /tmp/schools; python3 install_city.py ~/DuskRPG magetowerfloors.json --old-world --force | grep -E "map:|props:|shops:"; python3 install_city.py ~/DuskRPG circlegrove.json | grep -E "map:|props:|shops:"; python3 install_city.py ~/DuskRPG drowtemple.json | grep -E "shops:"; echo "DONE: restart now."'
