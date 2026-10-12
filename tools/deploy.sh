#!/bin/sh
# Deploys the client to duskserver, where dusk-web.service serves it on
# http://192.168.4.61:8080/.
#
#   sh tools/deploy.sh
#
# 1. Rebuilds js/spellinfo.json and js/raceinfo.json from the server's
#    current spell and race files.
# 2. Runs the tests; stops if any fail.
# 3. Copies the page's files into ~/dusk-browser-client on the server
#    (no restart needed: serve.py serves whatever is there), including the
#    Painted map tiles, which are drawn here first (tools/paintart/build.sh,
#    it needs this machine's headless Chrome), and the music; then lists
#    the music's tracks on the website's credits page (tools/music_credits.py).
# 4. Checks the page and a script come back.
#
# The server also rebuilds both by itself every 10 minutes (a cron job for
# flan, running tools/rebuild-data.sh), so spell and race changes made on
# the server show up without a deploy.
set -eu
cd "$(dirname "$0")/.."
HOST=duskserver
DIR=dusk-browser-client
URL=http://192.168.4.61:8080

echo "Rebuilding spell and race data from the server..."
for name in spellinfo raceinfo iteminfo; do
  ssh -o BatchMode=yes "$HOST" 'python3 - /home/flan/DuskRPG' < "tools/$name.py" > "js/$name.json.new"
  if [ -s "js/$name.json.new" ]; then
    mv "js/$name.json.new" "js/$name.json"
  else
    rm -f "js/$name.json.new"
    echo "  (couldn't rebuild $name.json; keeping the current copy)"
  fi
done

echo "Painting the art (map, characters, creatures)..."
sh tools/paintart/build.sh || echo "  (couldn't paint; keeping the current art/painted/map.png)"

echo "Checking every script parses..."
# The tests don't load main.js; a typo there would stop the page dead.
T=$(mktemp -d)
for f in js/*.js; do
  cp "$f" "$T/check.mjs"
  node --check "$T/check.mjs" || { echo "  $f doesn't parse"; rm -rf "$T"; exit 1; }
done
rm -rf "$T"

echo "Running tests..."
for t in test/*.test.mjs; do node "$t"; done

echo "Copying to $HOST..."
tar czf - index.html robots.txt tools/betakey who.html leaderboard.html profile.html forum.html forum.py apply.py manifest.json sw.js css js img music art/painted tools/spellinfo.py tools/music_credits.py tools/raceinfo.py tools/iteminfo.py tools/rebuild-data.sh serve.py README.md server |
  ssh -o BatchMode=yes "$HOST" "mkdir -p ~/$DIR && cd ~/$DIR && rm -rf css js music art/smooth tools/smoothart.py spike-pixi && tar xzf - && sh tools/rebuild-data.sh \$HOME/DuskRPG && python3 tools/music_credits.py music/manifest.json \$HOME/DuskRPG/web/credits.json --apply"

echo "Checking..."
for f in / js/main.js js/lighting.js js/music.js music/manifest.json forum.html js/spellinfo.json js/raceinfo.json art/painted/map.png art/painted/players.png art/painted/sprites.png art/painted/named.png art/painted/named.json art/painted/items.png art/painted/items.json art/painted/people.json; do
  code=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$URL/${f#/}")
  echo "  $f $code"
  [ "$code" = 200 ] || { echo "Deploy check failed for $f" >&2; exit 1; }
done
echo "Deployed to $URL/"
