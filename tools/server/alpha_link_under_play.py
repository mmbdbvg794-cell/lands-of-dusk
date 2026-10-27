#!/usr/bin/env python3
"""The alpha application link lives under Play Now only, not in Links.

    python3 alpha_link_under_play.py <game dir> [--dry-run]

  Every page loses "Apply for the Alpha" from its Links list, and every page
  but apply.html itself gets "Closed alpha: apply for a key" under its Play
  Now button where it hasn't one yet (index and How to Play already had it;
  beta_site_links.py's line). Pages are copied to
  backups/web-alphalink-<time>/ first. Running it again changes nothing.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
WEB = os.path.join(G, "web")
keep = os.path.join(G, "backups", time.strftime("web-alphalink-%Y%m%d-%H%M%S"))
NAV = '          <li><a href="/web/apply.html">Apply for the Alpha</a></li>\n'
PLAY_AT = '        <a class="play-btn" href="/play/">Play Now</a>\n'
SUB = '        <p class="play-sub">Closed alpha: <a href="/web/apply.html">apply for a key</a></p>\n'
changed = []
for name in sorted(os.listdir(WEB)):
    if not name.endswith(".html") or name in ("index_draft.html", "cheerpj_test.html"):
        continue
    path = os.path.join(WEB, name)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    new = text.replace(NAV, "", 1)
    if name != "apply.html" and PLAY_AT in new and 'class="play-sub"' not in new:
        new = new.replace(PLAY_AT, PLAY_AT + SUB, 1)
    if new == text:
        continue
    changed.append(name)
    if not DRY:
        os.makedirs(keep, exist_ok=True)
        shutil.copy2(path, os.path.join(keep, name))
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
print(("Would change" if DRY else "Changed") + f" {len(changed)} pages: " + ", ".join(changed)
      + ("" if DRY or not changed else f" (backups in {keep})"))
