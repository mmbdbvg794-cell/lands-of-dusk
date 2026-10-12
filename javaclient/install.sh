#!/bin/sh
# Puts the client built by build.sh where players download it
# (DuskRPG/web/duskclient.jar, launched by web/dusk.jnlp) and the guide where
# the Help button reads it (DuskRPG/rc/javahelp.txt). The jar from before
# the first Help build is kept as for_web_page/duskclient-before-help.jar,
# and every replaced file goes to backups/javaclient-<time>/.
#
#   ssh duskserver sh dusk-browser-client/javaclient/install.sh
set -eu
GAME=${GAME:-$HOME/DuskRPG}
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-/tmp/dusk-javaclient-build}
[ -f "$WORK/duskclient.jar" ] || { echo "build first: $WORK/duskclient.jar is missing" >&2; exit 1; }
keep="$GAME/backups/javaclient-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$keep"
cp -p "$GAME/web/duskclient.jar" "$keep/"
[ -f "$GAME/rc/javahelp.txt" ] && cp -p "$GAME/rc/javahelp.txt" "$keep/"
if [ ! -f "$GAME/for_web_page/duskclient-before-help.jar" ]; then
  unzip -l "$GAME/web/duskclient.jar" | grep -q HelpFrame.class || cp -p "$GAME/web/duskclient.jar" "$GAME/for_web_page/duskclient-before-help.jar"
fi
cp "$WORK/duskclient.jar" "$GAME/web/duskclient.jar.new" && mv "$GAME/web/duskclient.jar.new" "$GAME/web/duskclient.jar"
cp "$HERE/javahelp.txt" "$GAME/rc/javahelp.txt"
echo "Installed the client and the guide; replaced files kept in $keep"
