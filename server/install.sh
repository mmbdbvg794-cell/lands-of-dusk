#!/bin/sh
# Installs the storage build (server/build.sh's output) into the game, or
# takes it out again:
#
#   sh server/install.sh            install
#   sh server/install.sh uninstall  put the original classes back
#
# Run on duskserver as flan. The running server isn't touched: it loads
# its classes at start-up, so the change takes effect at the next restart
# (sudo systemctl restart duskserver). The first install keeps the
# original Commands.class and DuskServer.class in ~/DuskRPG/storage-originals
# (build.sh decompiles those, not the patched ones); every install also
# keeps a dated copy of what it replaced in ~/DuskRPG/backups.
set -eu
SRCDIR=$(cd "$(dirname "$0")" && pwd)
GAME=${GAME:-$HOME/DuskRPG}
OUT=${OUT:-/tmp/dusk-storage-build/out}
cd "$GAME"

if [ "${1:-}" = uninstall ]; then
  [ -f storage-originals/Commands.class ] || { echo "Storage isn't installed (no storage-originals)." >&2; exit 1; }
  cp storage-originals/Commands.class storage-originals/DuskServer.class .
  rm -f Storage.class CaseFix.class FixedEngine.class Talk.class Talk\$*.class Props.class BridgedSocket.class Bans.class MapStore.class Social.class Trade.class Trade\$*.class Skills.class Skills\$*.class
  # Without BridgedSocket the bridge must stop sending addresses.
  rm -f conf/bridgesecret
  echo "Original classes restored; restart the server to take effect."
  echo "(The storage file is kept; reinstalling brings the barrels and chests back.)"
  exit 0
fi

for c in Storage CaseFix FixedEngine Talk Props BridgedSocket Bans MapStore Social Trade Skills Commands DuskServer; do
  [ -f "$OUT/$c.class" ] || { echo "No $OUT/$c.class: run server/build.sh first." >&2; exit 1; }
done
if [ ! -f storage-originals/Commands.class ]; then
  mkdir -p storage-originals
  cp Commands.class DuskServer.class storage-originals/
  echo "Kept the original classes in storage-originals/"
fi
b="backups/classes-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$b"
cp Commands.class DuskServer.class "$b/"
for c in Storage CaseFix FixedEngine Talk Props BridgedSocket Bans MapStore Social Trade Skills; do [ -f $c.class ] && cp $c.class "$b/"; done
cp Talk\$*.class Trade\$*.class Skills\$*.class "$b/" 2>/dev/null || true
cp "$OUT/Storage.class" "$OUT/CaseFix.class" "$OUT/FixedEngine.class" "$OUT/Talk.class" "$OUT"/Talk\$*.class "$OUT/Props.class" "$OUT/BridgedSocket.class" "$OUT/Bans.class" "$OUT/MapStore.class" "$OUT/Social.class" "$OUT/Trade.class" "$OUT"/Trade\$*.class "$OUT/Skills.class" "$OUT"/Skills\$*.class "$OUT/Commands.class" "$OUT/DuskServer.class" .
# Game content that goes with it (talk scripts, props), only where there
# isn't a file of that name already: yours are never overwritten.
if [ -d "$SRCDIR/content" ]; then
  (cd "$SRCDIR/content" && find . -type f) | while read -r f; do
    if [ ! -e "$f" ]; then mkdir -p "$(dirname "$f")"; cp "$SRCDIR/content/$f" "$f"; echo "Added $f"; fi
  done
fi
echo "Installed; replaced classes kept in $b"
echo "Restart the server to turn storage on: sudo systemctl restart duskserver"
