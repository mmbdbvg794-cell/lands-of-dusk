#!/bin/sh
# One line to type: sh /root/dusk-browser-client/tools/spellmana_go.sh
# Deploys the client and server sources, then runs tools/golive_spellmana.sh
# on duskserver. Restart at once after it says DONE (restart 10 in game).
set -eu
cd "$(dirname "$0")/.."
sh tools/deploy.sh
ssh duskserver sh -s < tools/golive_spellmana.sh
