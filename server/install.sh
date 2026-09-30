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
GAME=${GAME:-$HOME/DuskRPG}
OUT=${OUT:-/tmp/dusk-storage-build/out}
cd "$GAME"

if [ "${1:-}" = uninstall ]; then
  [ -f storage-originals/Commands.class ] || { echo "Storage isn't installed (no storage-originals)." >&2; exit 1; }
  cp storage-originals/Commands.class storage-originals/DuskServer.class .
  rm -f Storage.class CaseFix.class
  echo "Original classes restored; restart the server to take effect."
  echo "(The storage file is kept; reinstalling brings the barrels and chests back.)"
  exit 0
fi

for c in Storage CaseFix Commands DuskServer; do
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
for c in Storage CaseFix; do [ -f $c.class ] && cp $c.class "$b/"; done
cp "$OUT/Storage.class" "$OUT/CaseFix.class" "$OUT/Commands.class" "$OUT/DuskServer.class" .
echo "Installed; replaced classes kept in $b"
echo "Restart the server to turn storage on: sudo systemctl restart duskserver"
