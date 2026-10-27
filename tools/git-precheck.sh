#!/usr/bin/env bash
# git-precheck.sh — run from the repo root AFTER `git init` and copying in
# .gitignore, but BEFORE `git add` / `git commit`. Changes nothing.
#
# Shows:
#   1. Every file that WOULD be committed
#   2. Every file being IGNORED (so you can spot source that got caught)
#   3. Any of the would-be-committed files that contain secret-looking text
#   4. Any large files (>5 MB)
#
# Exit code 1 if anything secret-looking is found.

set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "Not inside a git repo. Run 'git init' first."; exit 2; }

# Reports live inside .git/, which git never commits, so this script
# doesn't need to touch .gitignore or leave anything in your working tree.
REPORT_DIR="$(git rev-parse --git-dir)/precheck"
mkdir -p "$REPORT_DIR"

# 1. Files that would be committed
git ls-files --others --cached --exclude-standard > "$REPORT_DIR/will-commit.txt"
# 2. Files ignored
git ls-files --others --ignored --exclude-standard > "$REPORT_DIR/ignored.txt"

echo "=== Would be committed: $(wc -l < "$REPORT_DIR/will-commit.txt") files -> $REPORT_DIR/will-commit.txt"
echo "=== Ignored:            $(wc -l < "$REPORT_DIR/ignored.txt") files -> $REPORT_DIR/ignored.txt"
echo
echo "--- Top-level folders that would be committed (file counts) ---"
cut -d/ -f1 "$REPORT_DIR/will-commit.txt" | sort | uniq -c | sort -rn
echo
echo "--- Top-level folders being ignored (file counts) ---"
cut -d/ -f1 "$REPORT_DIR/ignored.txt" | sort | uniq -c | sort -rn
echo

# 3. Secret scan over the would-be-committed files only
PATTERNS=(
  '[MN][A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}'   # Discord bot token
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'                             # private keys
  'K00[0-9A-Za-z+/]{28,}'                                          # Backblaze B2 application key
  '(DISCORD|BOT)_?TOKEN[[:space:]]*[=:][[:space:]]*["'"'"']?[^[:space:]"'"'"']{8,}'  # token assignment with a value
  '(password|passwd|pwd|secret|api[_-]?key|access[_-]?key|auth[_-]?token)[[:space:]]*[=:][[:space:]]*["'"'"']?[^[:space:]"'"'"']{6,}'
  'account[_-]?key|application[_-]?key|b2_?key'                    # B2/rclone config keys
  'ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}'               # GitHub tokens
)

: > "$REPORT_DIR/secret-hits.txt"
for p in "${PATTERNS[@]}"; do
  tr '\n' '\0' < "$REPORT_DIR/will-commit.txt" \
    | xargs -0 -r grep -I -n -i -E -H -- "$p" 2>/dev/null >> "$REPORT_DIR/secret-hits.txt"
done
sort -u -o "$REPORT_DIR/secret-hits.txt" "$REPORT_DIR/secret-hits.txt"

HITS=$(wc -l < "$REPORT_DIR/secret-hits.txt")
if [ "$HITS" -gt 0 ]; then
  echo "!!! $HITS possible secret(s) in files that WOULD be committed:"
  # Show file:line, and mask any long token-like run so secrets aren't
  # echoed to your terminal or scrollback
  # file:line stays readable; any value after = or :, and any long
  # token-like run, is replaced so secrets don't land in scrollback
  sed -E \
    -e 's/^([^:]*:[0-9]+:)/\1\t/' \
    -e ':a' -e 's/(\t.*[=:][[:space:]]*["'"'"']?)[^[:space:]"'"'"'<]+/\1<MASKED>/' -e 'ta' \
    -e ':b' -e 's/(\t.*)[A-Za-z0-9_.+\/=-]{16,}/\1<MASKED>/' -e 'tb' \
    -e 's/^/  /' "$REPORT_DIR/secret-hits.txt" | head -50
  echo "    Full list: $REPORT_DIR/secret-hits.txt (contains real values — delete after review)"
else
  echo "OK: no secret-looking strings found in files that would be committed."
fi
echo

# 4. Large files
echo "--- Files over 5 MB that would be committed ---"
tr '\n' '\0' < "$REPORT_DIR/will-commit.txt" \
  | xargs -0 -r du -k 2>/dev/null | awk '$1 > 5120 {printf "%8.1f MB  %s\n", $1/1024, $2}' | sort -rn
echo
echo "Review both lists. Nothing has been staged or committed."

[ "$HITS" -gt 0 ] && exit 1 || exit 0
