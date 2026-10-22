#!/bin/sh
# Installs Homecoming (tools/world/cities/homecoming.mjs) into a game
# directory, from a staging directory made on the machine with the repo:
#
#   <stage>/city.json           node tools/world/city.mjs homecoming.mjs ...
#   <stage>/talk/               node tools/server/homecoming_talk.mjs ...
#   <stage>/install_city.py, canon_install.sh, add_achievement.py
#                               copies of the repo's
#
# Run on duskserver:  sh <stage>/homecoming_install.sh <game dir>
#
# The map, props, mobs, items and achievements are only read at startup:
# restart straight after, with no god "save" in between. Each step backs up
# what it changes, and running it again changes nothing that's already in.
set -e
S=$(cd "$(dirname "$0")" && pwd)
G=$1
[ -d "$G/talk" ] && [ -f "$S/city.json" ] || { echo "usage: sh homecoming_install.sh <game dir>"; exit 2; }
G=$(cd "$G" && pwd)
# The talk bundle refuses on its own if live's conversations changed since
# it was made; check before anything else goes in.
if [ -s "$S/talk/ORIG.sha256" ]; then
    (cd "$G" && sha256sum -c --quiet "$S/talk/ORIG.sha256") || { echo "conversations changed since the bundle was made: make it again"; exit 1; }
fi
python3 "$S/install_city.py" "$G" "$S/city.json"
sh "$S/canon_install.sh" "$S/talk" "$G"
python3 "$S/add_achievement.py" "$G" "chaircold|The Chair Stays Cold|See Elowen home and learn who comes for the chair|flags|hc_herald_done|1" --apply
# The belt needs some strength, as the diamond belt (STR 30) but at the
# Thornward Cloak's tier (15).
if ! grep -qi '^gaol-chain belt|' "$G/gearneeds"; then
    cp -p "$G/gearneeds" "$G/backups/gearneeds-$(date +%Y%m%d-%H%M%S)"
    echo 'gaol-chain belt|STR|15' >> "$G/gearneeds"
    echo "gearneeds: gaol-chain belt added"
fi
echo "Homecoming installed: restart the game now."
