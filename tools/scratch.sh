#!/bin/sh
# The scratch server: a copy of the live game in ~/dusktest on duskserver,
# game port 10011, bridge 8767, resources 8011, for testing before live.
# It lives in the home directory so a reboot doesn't wipe it (it used to be
# /tmp/dusktest). Run it on duskserver:
#
#   ssh duskserver 'sh -s setup' < tools/scratch.sh   copy live's game files over it (keeps scratch's users)
#   ssh duskserver 'sh -s start' < tools/scratch.sh   start the game and the bridge
#   ssh duskserver 'sh -s stop'  < tools/scratch.sh   stop both
#   ssh duskserver 'sh -s status' < tools/scratch.sh
#
# Live's players are never copied: scratch has its own users/ (test
# characters egate, hgate). Run stop before setup.
LIVE=$HOME/DuskRPG
DIR=$HOME/dusktest

pids() {
    # The java and bridge processes whose working directory is the scratch dir.
    for p in $(pgrep -f '[D]uskServer') $(pgrep -f '[d]usk_bridge'); do
        [ "$(readlink /proc/$p/cwd)" = "$DIR" ] && echo $p
    done
}

case "$1" in
setup)
    [ -n "$(pids)" ] && { echo "scratch is running: stop it first"; exit 1; }
    mkdir -p "$DIR/users"
    rsync -a --delete --exclude /users --exclude /backups --exclude /logs \
        --exclude '/*.zip' --exclude '/*.log' --exclude /who.json \
        "$LIVE/" "$DIR/"
    mkdir -p "$DIR/logs" "$DIR/backups"
    [ -f "$DIR/users/default" ] || cp "$LIVE/users/default" "$DIR/users/"
    # Own ports: game 10011, resources 8011 (from the rc addresses).
    awk 'skip { skip = 0; next }
         $0 ~ /^port\r?$/ { print; print "10011"; skip = 1; next }
         $0 ~ /^rcaddress(tailscale)?\r?$/ { print; print "http://127.0.0.1:8011/"; skip = 1; next }
         { print }' "$LIVE/conf/prefs" > "$DIR/conf/prefs"
    sed -i 's/^GAME_PORT = 10001$/GAME_PORT = 10011/; s/^BRIDGE_PORT = 8765$/BRIDGE_PORT = 8767/' "$DIR/dusk_bridge.py"
    grep -q '^GAME_PORT = 10011$' "$DIR/dusk_bridge.py" && grep -q '^BRIDGE_PORT = 8767$' "$DIR/dusk_bridge.py" \
        || { echo "bridge ports not changed: check dusk_bridge.py"; exit 1; }
    grep -A1 -x 'port' "$DIR/conf/prefs" | grep -q 10011 || { echo "prefs port not changed"; exit 1; }
    echo "scratch copied from live into $DIR"
    ;;
start)
    [ -n "$(pids)" ] && { echo "already running: $(pids)"; exit 0; }
    cd "$DIR" || exit 1
    nohup java DuskServer > srv.log 2>&1 &
    nohup python3 -u dusk_bridge.py > bridge.log 2>&1 &
    sleep 8
    grep -m1 "Started Server" srv.log && echo "pids: $(pids)"
    ;;
stop)
    for p in $(pids); do kill "$p"; done
    sleep 2
    [ -z "$(pids)" ] && echo stopped || echo "still running: $(pids)"
    ;;
status)
    p=$(pids)
    [ -n "$p" ] && ps -o pid,rss,etime,cmd -p "$(echo $p | tr ' ' ,)" || echo "not running"
    ;;
*)
    echo "usage: sh -s setup|start|stop|status < tools/scratch.sh"
    ;;
esac
