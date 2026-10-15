#!/bin/sh
# Installs the canon cleanup bundle (tools/server/canon_cleanup.mjs, then
# merge_quests.mjs, both run locally: node isn't on duskserver) into a game
# directory. Run on duskserver:
#
#   sh canon_install.sh <bundle dir> <game dir>
#
# Backs up every file it changes or removes to <game dir>/backups/canon-<date>/
# first. The props (Halvard, the renamed NPCs) are only read at startup:
# restart straight after, with no god "save" in between. Talk scripts and
# walk-on scripts take effect at once.
#
# Making the bundle (on the machine with the repo):
#   node tools/server/canon_cleanup.mjs <copy of ~/DuskRPG> <bundle>
#   (stage = the copy with the bundle applied)
#   node tools/server/merge_quests.mjs <stage>/talk <stage>/quests <bundle>/talk \
#        "Tombkeeper Aldous" "Reeve Osric" "Foreman Dask"
set -e
B=$1
G=$2
[ -f "$B/REMOVE" ] && [ -d "$G/talk" ] || { echo "usage: sh canon_install.sh <bundle dir> <game dir>"; exit 2; }
# Absolute paths: the copying below runs from inside the bundle.
B=$(cd "$B" && pwd)
G=$(cd "$G" && pwd)
# The bundle was made from a copy of live: refuse if any file it touches
# has changed since (ORIG.sha256 = those files' sums in that copy).
if [ -f "$B/ORIG.sha256" ]; then
    (cd "$G" && sha256sum -c --quiet "$B/ORIG.sha256") || { echo "files changed since the bundle was made: make it again from a fresh copy"; exit 1; }
fi
BK="$G/backups/canon-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BK"
cd "$B"
# Back up what's there now.
{ find . -type f ! -name REMOVE ! -name ORIG.sha256 | sed 's|^\./||'; cat REMOVE; } | while IFS= read -r f; do
    [ -e "$G/$f" ] || continue
    mkdir -p "$BK/$(dirname "$f")"
    cp -p "$G/$f" "$BK/$f"
done
# Copy in the new files, then remove the old ones.
find . -type f ! -name REMOVE ! -name ORIG.sha256 | sed 's|^\./||' | while IFS= read -r f; do
    mkdir -p "$G/$(dirname "$f")"
    cp "$f" "$G/$f"
done
while IFS= read -r f; do
    [ -n "$f" ] && rm -f "$G/$f"
done < REMOVE
echo "installed $(find . -type f ! -name REMOVE ! -name ORIG.sha256 | wc -l) files, removed $(grep -c . REMOVE) (backup: $BK)"
