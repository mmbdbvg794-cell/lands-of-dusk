#!/bin/sh
# Builds Storage plus the patched Commands and DuskServer classes against
# the live server's classes, into $OUT (default /tmp/dusk-storage-build/out).
# Touches nothing in ~/DuskRPG; server/install.sh installs the result.
#
#   ssh duskserver 'sh -s' < server/build.sh      (after copying server/ over:
#   tools/deploy.sh does both)
#
# Needs server/Storage.java, server/patch.py and cfr.jar (the CFR 0.152
# decompiler, SHA-1 48ef4892cfe8feffddbbd0ff077735140557db74) in $SRC.
set -eu
GAME=${GAME:-$HOME/DuskRPG}
SRC=${SRC:-$HOME/dusk-browser-client/server}
WORK=${WORK:-/tmp/dusk-storage-build}
rm -rf "$WORK"
mkdir -p "$WORK/classes" "$WORK/src" "$WORK/out"
# The live classes as they are now (without any Storage from before).
cp "$GAME"/*.class "$WORK/classes/"
rm -f "$WORK/classes/Storage.class" "$WORK/classes/CaseFix.class" "$WORK/classes/FixedEngine.class" "$WORK/classes/Talk.class" "$WORK/classes/Talk\$1.class" "$WORK/classes/Props.class"
cd "$WORK"
# If Storage is installed already, decompile the originals it replaced.
if [ -f "$GAME/storage-originals/Commands.class" ]; then
  cp "$GAME/storage-originals/Commands.class" "$GAME/storage-originals/DuskServer.class" classes/
fi
java -jar "$SRC/cfr.jar" classes/Commands.class classes/DuskServer.class --outputdir src --silent true >/dev/null
python3 "$SRC/patch.py" src
cp "$SRC/Storage.java" "$SRC/CaseFix.java" "$SRC/FixedEngine.java" "$SRC/Talk.java" "$SRC/Props.java" src/
javac -nowarn -encoding UTF-8 -d out -cp classes src/Storage.java src/CaseFix.java src/FixedEngine.java src/Talk.java src/Props.java src/Commands.java src/DuskServer.java
ls out
