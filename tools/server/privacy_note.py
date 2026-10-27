#!/usr/bin/env python3
"""Takes Rules & Privacy and Report a Bug off the website, with a one-line
privacy note at the foot of every page instead.

    python3 privacy_note.py <game dir> [--dry-run]

  Bugs are reported in the game (Settings > Report a bug), so the Links
  list loses its "Report a Bug" mail link, and "Rules & Privacy" with it;
  rules.html goes into the backup as rules.html.removed. Each page gets a
  small centred line under its columns: "Nothing we collect is ever sold or
  shared." (what the privacy section promised). Pages are copied to
  backups/web-noprivacy-<time>/ first. Running it again changes nothing.
"""
import os
import re
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
WEB = os.path.join(G, "web")
keep = os.path.join(G, "backups", time.strftime("web-noprivacy-%Y%m%d-%H%M%S"))
RULES = re.compile(r'\n *<li><a href="/web/rules\.html">Rules &amp; Privacy</a></li>')
BUG = re.compile(r'\n *<li><a href="mailto:duskadmins@gmail\.com" onclick="[^"]*">Report a Bug</a>'
                 r'<div style="[^"]*">Email copied: duskadmins@gmail\.com</div></li>')
NOTE = '  <p class="site-note">Nothing we collect is ever sold or shared.</p>\n'
CSS = """
  /* --- One-line privacy note at the foot of the page --- */
  .site-note {
    margin: 28px 0 0;
    text-align: center;
    font-size: 13px;
    color: var(--stone-light);
  }
</style>"""


def with_note(text):
    """The note goes just before the </div> that closes .page."""
    page = text.find('<div class="page">')
    script = text.find("\n<script>", page)
    end = text.rfind("\n</div>", page, script)
    if page < 0 or script < 0 or end < 0:
        return None
    return text[:end + 1] + NOTE + text[end + 1:]


changed = []
for name in sorted(os.listdir(WEB)):
    if not name.endswith(".html") or name in ("index_draft.html", "cheerpj_test.html", "rules.html"):
        continue
    path = os.path.join(WEB, name)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    new = BUG.sub("", RULES.sub("", text, 1), 1)
    if 'class="site-note"' not in new and "</style>" in new:
        noted = with_note(new)
        if noted is not None:
            new = noted.replace("</style>", CSS, 1)
    if new == text:
        continue
    changed.append(name)
    if not DRY:
        os.makedirs(keep, exist_ok=True)
        shutil.copy2(path, os.path.join(keep, name))
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
rules = os.path.join(WEB, "rules.html")
if os.path.exists(rules):
    changed.append("rules.html (removed)")
    if not DRY:
        os.makedirs(keep, exist_ok=True)
        shutil.move(rules, os.path.join(keep, "rules.html.removed"))
print(("Would change" if DRY else "Changed") + f" {len(changed)}: " + ", ".join(changed)
      + ("" if DRY or not changed else f" (backups in {keep})"))
