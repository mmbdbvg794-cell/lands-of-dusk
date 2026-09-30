#!/bin/sh
# Builds art/painted/map.png (the Painted art style's map tiles) from the
# server's map.gif, by running tools/paintart/painter.js in headless Chrome.
#
#   sh tools/paintart/build.sh
#
# Runs on the dev machine (it needs the headless Chrome there);
# tools/deploy.sh calls it and copies the result to the server. Only the
# map is repainted so far; characters and creatures keep the original art.
set -eu
cd "$(dirname "$0")/../.."
RC=${RC:-http://192.168.4.61:8000}
CHROME=${CHROME:-$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell 2>/dev/null | tail -1)}
[ -x "$CHROME" ] || { echo "No headless Chrome found; set CHROME=..." >&2; exit 1; }

work=$(mktemp -d)
trap 'kill $server 2>/dev/null; rm -rf "$work"' EXIT
cp tools/paintart/index.html tools/paintart/painter.js "$work/"
curl -s -f -m 20 -o "$work/map.gif" "$RC/images/map.gif"

port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
(cd "$work" && exec python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1) &
server=$!
sleep 1

mkdir -p art/painted
"$CHROME" --no-sandbox --disable-gpu --virtual-time-budget=60000 --dump-dom "http://127.0.0.1:$port/index.html" 2>/dev/null |
  python3 -c '
import base64, re, sys
m = re.search(r"<pre id=\"png\">data:image/png;base64,([^<]+)</pre>", sys.stdin.read())
if not m:
    sys.exit("painter produced no image")
open("art/painted/map.png.new", "wb").write(base64.b64decode(m.group(1)))
'
mv art/painted/map.png.new art/painted/map.png
echo "painted map: $(python3 -c 'import os; print(os.path.getsize("art/painted/map.png") // 1024)') KB"
