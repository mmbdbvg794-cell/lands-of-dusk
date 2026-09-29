#!/bin/sh
# Deploys the client to duskserver, where dusk-web.service serves it on
# http://192.168.4.61:8080/.
#
#   sh tools/deploy.sh
#
# 1. Rebuilds js/spellinfo.json from the server's current spell files.
# 2. Runs the tests; stops if any fail.
# 3. Copies the page's files into ~/dusk-browser-client on the server
#    (no restart needed: serve.py serves whatever is there).
# 4. Checks the page and a script come back.
#
# The server also rebuilds spellinfo.json by itself every 10 minutes (a
# cron job for flan, running tools/spellinfo.py), so spell changes made on
# the server show up without a deploy.
set -eu
cd "$(dirname "$0")/.."
HOST=duskserver
DIR=dusk-browser-client
URL=http://192.168.4.61:8080

echo "Rebuilding spell data from the server..."
ssh -o BatchMode=yes "$HOST" 'python3 - /home/flan/DuskRPG' < tools/spellinfo.py > js/spellinfo.json.new
if [ -s js/spellinfo.json.new ]; then
  mv js/spellinfo.json.new js/spellinfo.json
else
  rm -f js/spellinfo.json.new
  echo "  (couldn't rebuild it; keeping the current copy)"
fi

echo "Running tests..."
for t in test/*.test.mjs; do node "$t"; done

echo "Copying to $HOST..."
tar czf - index.html css js tools/spellinfo.py serve.py README.md |
  ssh -o BatchMode=yes "$HOST" "mkdir -p ~/$DIR && cd ~/$DIR && rm -rf css js && tar xzf -"

echo "Checking..."
for f in / js/main.js js/spellinfo.json; do
  code=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$URL/${f#/}")
  echo "  $f $code"
  [ "$code" = 200 ] || { echo "Deploy check failed for $f" >&2; exit 1; }
done
echo "Deployed to $URL/"
