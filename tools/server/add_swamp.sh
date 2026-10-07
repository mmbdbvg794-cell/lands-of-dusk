#!/bin/sh
# Adds the swamp tiles to a game directory (needs Pillow; run on duskserver):
#   rc/images/map.gif      tiles 168-173 (swamptiles.py beside this)
#   defTileScripts/168-173 mud, marsh, reeds, boardwalk walkable ("true");
#                          bog water and the swamp cypress not ("false")
#   conf/prefs tilecap     174, so the engine reads those tile scripts
# The old files go to backups/swamp-<time>/. Running it again changes nothing.
# Restart the server afterwards (tilecap and the tile scripts are read at start).
#
#   sh add_swamp.sh <game dir> [--apply]
set -eu
G=$1
HERE=$(cd "$(dirname "$0")" && pwd)
APPLY=${2:-}
tiles=$(python3 -c "from PIL import Image; print(Image.open('$G/rc/images/map.gif').size[0] // 32)")
cap=$(awk 'p { print; exit } /^tilecap/ { p = 1 }' "$G/conf/prefs" | tr -d '\r')
echo "map.gif: $tiles tiles; tilecap $cap"
if [ "$APPLY" != "--apply" ]; then
  [ "$tiles" = 168 ] && echo "would add tiles 168-173"
  [ "$cap" -lt 174 ] && echo "would raise tilecap to 174"
  echo "Dry run; add --apply."
  exit 0
fi
keep="$G/backups/swamp-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$keep/defTileScripts"
cp "$G/rc/images/map.gif" "$G/conf/prefs" "$keep/"
if [ "$tiles" = 168 ]; then
  python3 -W ignore "$HERE/swamptiles.py" "$keep/map.gif" "$G/rc/images/map.gif" "$keep/swamp-preview.png"
fi
for t in 168 169 170 171 172 173; do
  [ -f "$G/defTileScripts/$t" ] && cp "$G/defTileScripts/$t" "$keep/defTileScripts/"
  case $t in 170|171) printf 'false\n' ;; *) printf 'true\n' ;; esac > "$G/defTileScripts/$t"
  rm -f "$G/defTileScripts/$t.dsko"
done
if [ "$cap" -lt 174 ]; then
  awk 'p { print "174"; p = 0; next } /^tilecap/ { p = 1 } { print }' "$keep/prefs" > "$G/conf/prefs"
fi
echo "Done (old files in $keep). Restart the server."
