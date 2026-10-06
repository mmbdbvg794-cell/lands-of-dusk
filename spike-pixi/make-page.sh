#!/bin/sh
# Makes spike-pixi/index.html from the client's own index.html, so the spike
# is always the current game plus the Pixi layer (spike-pixi/spike.js):
#   <base href="../">   the client's paths (js/, css/, art/) from up here
#   an import map       pixi.js and pixi-filters from jsDelivr (the filters
#                       import "pixi.js" by name)
#   duskSpike           lets main.js share its world (window.__dusk)
#
#   sh spike-pixi/make-page.sh      (tools/deploy.sh runs it)
set -eu
cd "$(dirname "$0")/.."
PIXI=8.22.0
FILTERS=6.1.5
python3 - "$PIXI" "$FILTERS" <<'EOF'
import sys
pixi, filters = sys.argv[1:]
page = open("index.html", encoding="utf-8").read()
head = """<head>
  <base href="../">
  <script type="importmap">{"imports": {
    "pixi.js": "https://cdn.jsdelivr.net/npm/pixi.js@%s/dist/pixi.min.mjs",
    "pixi-filters": "https://cdn.jsdelivr.net/npm/pixi-filters@%s/dist/pixi-filters.mjs"
  }}</script>
  <script>window.duskSpike = true;</script>""" % (pixi, filters)
main = '<script type="module" src="js/main.js"></script>'
for old in ("<head>", main, "<title>Dusk</title>"):
    if page.count(old) != 1:
        sys.exit("index.html has changed: can't find " + old)
page = page.replace("<head>", head, 1)
page = page.replace("<title>Dusk</title>", "<title>Dusk Pixi spike</title>", 1)
page = page.replace(main, main + '\n  <script type="module" src="spike-pixi/spike.js"></script>', 1)
# (After the doctype: anything before it puts the page in quirks mode.)
page = page.replace("<!doctype html>", "<!doctype html>\n<!-- Made by spike-pixi/make-page.sh from index.html: edit those, not this. -->", 1)
open("spike-pixi/index.html", "w", encoding="utf-8").write(page)
print("made spike-pixi/index.html (Pixi %s, pixi-filters %s)" % (pixi, filters))
EOF
