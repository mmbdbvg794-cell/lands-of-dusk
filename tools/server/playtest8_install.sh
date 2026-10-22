#!/bin/sh
# Installs the eighth play-test's fixes into a game directory, from a
# staging directory made on the machine with the repo:
#
#   <stage>/landingpath.json    node tools/world/city.mjs landingpath.mjs ...
#   <stage>/talk/               node tools/server/fix_playtest8_talk.mjs ...
#   <stage>/fix_playtest8.py, install_city.py, canon_install.sh
#                               copies of the repo's
#
# Run on duskserver:  sh <stage>/playtest8_install.sh <game dir>
#
# The map, signs, merchants, quests and items are read at startup: restart
# straight after, with no god "save" in between. Each step backs up what it
# changes; running it again changes nothing that's already in.
set -e
S=$(cd "$(dirname "$0")" && pwd)
G=$1
[ -d "$G/talk" ] && [ -f "$S/landingpath.json" ] || { echo "usage: sh playtest8_install.sh <game dir>"; exit 2; }
G=$(cd "$G" && pwd)
if [ -s "$S/talk/ORIG.sha256" ]; then
    (cd "$G" && sha256sum -c --quiet "$S/talk/ORIG.sha256") || { echo "Zyrith's conversation changed since the bundle was made: make it again"; exit 1; }
fi
python3 "$S/install_city.py" "$G" "$S/landingpath.json"
python3 "$S/fix_playtest8.py" "$G" --apply | grep -v '  as it is:'
sh "$S/canon_install.sh" "$S/talk" "$G"
echo "Play-test 8 fixes installed: restart the game now."
