#!/usr/bin/env python3
"""Links to the alpha application page (/web/apply.html) on the website.

    python3 beta_site_links.py <game dir> [--dry-run]

  Every page with the sidebar's Links list gets "Apply for the Alpha" after
  How to Play; the home and How to Play pages also get a line under their
  Play Now button: "Closed alpha: apply for a key". Every page gets discord.js,
  which fills in the invite from beta.conf; the Discord button itself is
  discord_button.py's (it replaced the "Join our Discord" text link that
  used to go here, 2026-10-27). Pages are copied to
  backups/web-beta-<time>/ first. Running it again changes nothing.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
WEB = os.path.join(G, "web")
keep = os.path.join(G, "backups", time.strftime("web-beta-%Y%m%d-%H%M%S"))
NAV_AT = '<li><a href="/web/howtoplay.html">How to Play</a></li>'
NAV = NAV_AT + '\n          <li><a href="/web/apply.html">Apply for the Alpha</a></li>'
PLAY_AT = '<a class="play-btn" href="/play/">Play Now</a>'
PLAY = PLAY_AT + '\n        <p class="play-sub">Closed alpha: <a href="/web/apply.html">apply for a key</a></p>'
SCRIPT = '<script src="/web/discord.js" defer></script>\n</body>'
changed = []
for name in sorted(os.listdir(WEB)):
    if not name.endswith(".html") or name in ("index_draft.html", "cheerpj_test.html"):
        continue
    path = os.path.join(WEB, name)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    new = text
    if NAV_AT in new and "/web/apply.html\">Apply for the Alpha" not in new:
        new = new.replace(NAV_AT, NAV, 1)
    if "/web/discord.js" not in new and "</body>" in new:
        new = new.replace("</body>", SCRIPT, 1)
    if name in ("index.html", "howtoplay.html") and PLAY_AT in new and "apply for a key" not in new:
        new = new.replace(PLAY_AT, PLAY, 1)
    if new != text:
        changed.append(name)
        if not DRY:
            os.makedirs(keep, exist_ok=True)
            shutil.copy2(path, os.path.join(keep, name))
            with open(path, "w", encoding="utf-8") as f:
                f.write(new)
print(("Would change" if DRY else "Changed") + f" {len(changed)} pages: " + ", ".join(changed)
      + ("" if DRY or not changed else f" (backups in {keep})"))
