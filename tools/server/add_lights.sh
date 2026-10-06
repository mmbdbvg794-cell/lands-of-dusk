#!/bin/sh
# Adds the night-light art to a game directory (needs Pillow; run on duskserver):
#   rc/images/map.gif      tiles 160-167, torches on the other walls (torchwalls.py)
#   rc/images/sprites.gif  sprites 55-57: brazier, lamp post, campfire (lightsprites.py)
#   defTileScripts/160-167 "false": walls, nobody walks through them
#   conf/prefs tilecap     168, so the engine reads those tile scripts
# The old files go to backups/lights-<time>/. Running it again changes nothing.
# Restart the server afterwards (tilecap and the tile scripts are read at start).
#
#   sh add_lights.sh <game dir> [--apply]      (torchwalls.py and lightsprites.py beside it)
set -eu
G=$1
HERE=$(cd "$(dirname "$0")" && pwd)
APPLY=${2:-}
tiles=$(python3 -c "from PIL import Image; print(Image.open('$G/rc/images/map.gif').size[0] // 32)")
sprites=$(python3 -c "from PIL import Image; print(Image.open('$G/rc/images/sprites.gif').size[0] // 64)")
cap=$(awk 'p { print; exit } /^tilecap/ { p = 1 }' "$G/conf/prefs" | tr -d '\r')
echo "map.gif: $tiles tiles; sprites.gif: $sprites sprites; tilecap $cap"
if [ "$APPLY" != "--apply" ]; then
  [ "$tiles" = 160 ] && echo "would add tiles 160-167"
  [ "$sprites" = 55 ] && echo "would add sprites 55-57"
  [ "$cap" -lt 168 ] && echo "would raise tilecap to 168"
  echo "Dry run; add --apply."
  exit 0
fi
keep="$G/backups/lights-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$keep/defTileScripts"
cp "$G/rc/images/map.gif" "$G/rc/images/sprites.gif" "$G/conf/prefs" "$keep/"
if [ "$tiles" = 160 ]; then
  python3 "$HERE/torchwalls.py" "$keep/map.gif" "$G/rc/images/map.gif" "$keep/torches-preview.png"
fi
if [ "$sprites" = 55 ]; then
  python3 "$HERE/lightsprites.py" "$keep/sprites.gif" "$G/rc/images/sprites.gif" "$keep/lights-preview.png"
fi
for t in 160 161 162 163 164 165 166 167; do
  [ -f "$G/defTileScripts/$t" ] && cp "$G/defTileScripts/$t" "$keep/defTileScripts/"
  printf 'false\n' > "$G/defTileScripts/$t"
  rm -f "$G/defTileScripts/$t.dsko"
done
if [ "$cap" -lt 168 ]; then
  awk 'p { print "168"; p = 0; next } /^tilecap/ { p = 1 } { print }' "$keep/prefs" > "$G/conf/prefs"
fi
echo "Done (old files in $keep). Restart the server."
