#!/bin/sh
# Installs the potion renames into a game directory, from a staging
# directory made on the machine with the repo:
#
#   <stage>/talk/                node tools/server/fix_potions2_talk.mjs ...
#   <stage>/fix_potions2.py, canon_install.sh   copies of the repo's
#
# Run on duskserver:  sh <stage>/potions2_install.sh <game dir>
#
# Shops, drops and items are read at startup: restart straight after, with
# no god "save" in between. Each step backs up what it changes; running it
# again changes nothing that's already in.
set -e
S=$(cd "$(dirname "$0")" && pwd)
G=$1
[ -d "$G/talk" ] && [ -d "$S/talk" ] || { echo "usage: sh potions2_install.sh <game dir>"; exit 2; }
G=$(cd "$G" && pwd)
if [ -s "$S/talk/ORIG.sha256" ]; then
    (cd "$G" && sha256sum -c --quiet "$S/talk/ORIG.sha256") || { echo "Pell's or Kossk's conversation changed since the bundle was made: make it again"; exit 1; }
fi
python3 "$S/fix_potions2.py" "$G" --apply | grep -v '  as it is:'
sh "$S/canon_install.sh" "$S/talk" "$G"
echo "Potions installed: restart the game now."
