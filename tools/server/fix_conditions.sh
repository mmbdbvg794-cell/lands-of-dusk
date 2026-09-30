#!/bin/sh
# Makes every condition the scripts use loadable: the server reads
# defConditions/<lowercased name> up to a "." line, and an empty or missing
# file fails the script that uses it. "." alone is a valid condition
# (permanent, displayed: the loader's defaults).
#
#   ssh duskserver 'sh -s' < tools/server/fix_conditions.sh
#
# Backs up defConditions first; safe to run again.
set -eu
cd ~/DuskRPG
mkdir -p backups
tar czf "backups/conditions-$(date +%Y%m%d-%H%M%S).tar.gz" defConditions
for f in defConditions/*; do
  case "$f" in *.dsko) continue ;; esac
  [ -f "$f" ] || continue
  if [ -z "$(tr -d '[:space:]' < "$f")" ]; then
    printf '.\n' > "$f"; rm -f "$f.dsko"; echo "filled: $f"
  fi
done
# Conditions named in scripts with no file (found 2026-09-30).
for c in meteodamage ass caster drain1 drainend focus giveitem poison reflect sin translater; do
  [ -e "defConditions/$c" ] || { printf '.\n' > "defConditions/$c"; echo "created: $c"; }
done
