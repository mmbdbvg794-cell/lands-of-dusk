#!/bin/sh
# Builds the classic Java client with the Help button (patch_mainframe.py,
# HelpFrame.java) from the jar players download now, and signs it with the
# Dusk key, into $WORK/duskclient.jar. Touches nothing players use; install
# with install.sh. Run on duskserver (needs the JDK and the keystore):
#
#   scp javaclient/* duskserver:dusk-browser-client/javaclient/
#   ssh duskserver sh dusk-browser-client/javaclient/build.sh
#
# The base is the jar from before the first Help build (kept in
# DuskRPG/for_web_page/duskclient-before-help.jar by install.sh), so
# building again never patches twice. The guide itself is
# DuskRPG/rc/javahelp.txt, read by the client when Help is pressed.
set -eu
GAME=${GAME:-$HOME/DuskRPG}
HERE=$(cd "$(dirname "$0")" && pwd)
CFR=${CFR:-$HOME/dusk-browser-client/server/cfr.jar}
WORK=${WORK:-/tmp/dusk-javaclient-build}
KEYSTORE=$GAME/for_web_page/dusk.keystore
BASE=$GAME/for_web_page/duskclient-before-help.jar
[ -f "$BASE" ] || BASE=$GAME/web/duskclient.jar
rm -rf "$WORK"
mkdir -p "$WORK/orig" "$WORK/src" "$WORK/out" "$WORK/new"
cd "$WORK/orig" && unzip -q "$BASE"
if [ -f HelpFrame.class ]; then echo "the base jar already has Help: $BASE" >&2; exit 1; fi
cd "$WORK"
java -jar "$CFR" orig/MainFrame.class --outputdir src --silent true >/dev/null
python3 "$HERE/patch_mainframe.py" src/MainFrame.java
javac --release 8 -nowarn -cp orig -d out src/MainFrame.java "$HERE/HelpFrame.java" 2>&1 | grep -v '^warning\|^Note\|^[0-9]* warning' || true
[ -f out/HelpFrame.class ] && [ -f out/MainFrame.class ] || { echo "compile failed" >&2; exit 1; }
cp orig/*.class new/
cp out/*.class new/
printf 'Manifest-Version: 1.0\nCreated-By: dusk-browser-client javaclient\n' > manifest.txt
(cd new && jar cfm ../duskclient.jar ../manifest.txt *.class)
jarsigner -keystore "$KEYSTORE" -storepass changeit duskclient.jar duskkey >/dev/null
jarsigner -verify duskclient.jar | tail -1
echo "Built $WORK/duskclient.jar (from $BASE)"
