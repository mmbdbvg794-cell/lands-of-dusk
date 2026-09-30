#!/bin/sh
# Builds the Painted art style from the server's sprite sheets, by running
# tools/paintart in headless Chrome:
#   art/painted/map.png      map tiles (painter.js)
#   art/painted/players.png  characters, drawn fresh (js/figure.js)
#   art/painted/sprites.png  creatures, items and props: the most common
#                            drawn fresh (creatures.js), the rest filtered
#                            (figures.js)
#   art/painted/named.png    creatures by name, for names in a family
#   art/painted/named.json   (bestiary.js): the index from name to frame
#
#   sh tools/paintart/build.sh
#
# Runs on the dev machine (it needs the headless Chrome there);
# tools/deploy.sh calls it and copies the result to the server.
set -eu
cd "$(dirname "$0")/../.."
RC=${RC:-http://192.168.4.61:8000}
CHROME=${CHROME:-$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell 2>/dev/null | tail -1)}
[ -x "$CHROME" ] || { echo "No headless Chrome found; set CHROME=..." >&2; exit 1; }

work=$(mktemp -d)
trap 'kill $server 2>/dev/null; rm -rf "$work"' EXIT
cp tools/paintart/index.html tools/paintart/painter.js tools/paintart/figures.js js/figure.js tools/paintart/creatures.js tools/paintart/bestiary.js "$work/"
# The server's creature names, for the named sheet.
ssh -o BatchMode=yes duskserver 'cd ~/DuskRPG && python3 -c "import os, json; print(json.dumps(sorted(m for m in os.listdir(\"defMobs\") if not m.endswith(\".dsko\"))))"' > "$work/mobnames.json"
for name in map players sprites; do
  curl -s -f -m 20 -o "$work/$name.gif" "$RC/images/$name.gif"
done

port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
(cd "$work" && exec python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1) &
server=$!
sleep 1

mkdir -p art/painted
"$CHROME" --no-sandbox --disable-gpu --virtual-time-budget=180000 --dump-dom "http://127.0.0.1:$port/index.html" 2>/dev/null |
  python3 -c '
import base64, os, re, sys
page = sys.stdin.read()
for name in ("map", "players", "sprites", "named"):
    m = re.search(r"<pre id=\"%s\">data:image/png;base64,([^<]+)</pre>" % name, page)
    if not m:
        sys.exit("painter produced no %s image" % name)
    tmp = "art/painted/%s.png.new" % name
    open(tmp, "wb").write(base64.b64decode(m.group(1)))
    os.replace(tmp, "art/painted/%s.png" % name)
    print("painted %s: %d KB" % (name, os.path.getsize("art/painted/%s.png" % name) // 1024))
import html, json
m = re.search(r"<pre id=\"namedIndex\">([^<]*)</pre>", page)
index = json.loads(html.unescape(m.group(1))) if m else {}
json.dump(index, open("art/painted/named.json", "w"), sort_keys=True)
print("creatures drawn by name: %d" % len(index))
'
