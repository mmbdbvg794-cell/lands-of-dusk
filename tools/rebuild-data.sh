#!/bin/sh
# Rebuilds the client's game data from the server's files, in place:
#   js/spellinfo.json  (tools/spellinfo.py, from defSpells / defSpellGroups)
#   js/raceinfo.json   (tools/raceinfo.py, from defRaces)
# A file is only replaced when it changed, and never with an empty one.
#
# On duskserver, flan's crontab runs this every 10 minutes from
# ~/dusk-browser-client, so spell and race changes reach players without
# a deploy:
#   */10 * * * * cd $HOME/dusk-browser-client && sh tools/rebuild-data.sh $HOME/DuskRPG
set -u
cd "$(dirname "$0")/.."
GAME=${1:-$HOME/DuskRPG}

for name in spellinfo raceinfo; do
  out=js/$name.json
  if python3 "tools/$name.py" "$GAME" > "$out.new" 2>/dev/null && [ -s "$out.new" ]; then
    cmp -s "$out.new" "$out" || mv "$out.new" "$out"
  fi
  rm -f "$out.new"
done
