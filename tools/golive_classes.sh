#!/bin/sh
# The class system, live (2026-10-13). Run from this machine:
#   sh tools/golive_classes.sh
# Live users/, the guild doors and the web pages were backed up first in
# ~/DuskRPG/backups/classes-before-20261013-164220.
# Deploys the client, builds and installs the server classes, puts in the
# guild doors (their old compiled .dsko removed so they recompile), the
# How to Play and FAQ text and the Java client's help, then restarts the
# game at once (installed classes and no restart breaks logins).
set -eu
cd "$(dirname "$0")/.."
WEB=/tmp/claude-0/-root/0cf45038-20c5-470d-b42d-dc19aeb16e3b/scratchpad/web
sh tools/deploy.sh
ssh duskserver 'sh -s' < server/build.sh
scp -q server/content/defMoveActions/984_975 server/content/defMoveActions/987_975 server/content/defMoveActions/989_979 server/content/defMoveActions/990_975 duskserver:DuskRPG/defMoveActions/
scp -q "$WEB/faq.json" "$WEB/howtoplay.html" duskserver:DuskRPG/web/
scp -q javaclient/javahelp.txt duskserver:DuskRPG/rc/javahelp.txt
ssh duskserver 'cd ~/DuskRPG/defMoveActions && rm -f 984_975.dsko 987_975.dsko 989_979.dsko 990_975.dsko && sh ~/dusk-browser-client/server/install.sh'
ssh root@192.168.7.28 'pct exec 303 -- systemctl restart duskserver'
echo "Live: classes installed and the game restarted."
