#!/usr/bin/env python3
"""The classic Java client gets its own website page, out of How to Play.

    python3 java_client_page.py <game dir> [--dry-run]

  How to Play loses its "Old school: the classic Java client" and Settings
  sections. The Java one becomes web/javaclient.html (How to Play's own page
  and styles, its main panel headed "Java Client"), and every page's Links
  list gets "Java Client" after How to Play. Pages are copied to
  backups/web-javapage-<time>/ first. Running it again changes nothing.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
WEB = os.path.join(G, "web")
keep = os.path.join(G, "backups", time.strftime("web-javapage-%Y%m%d-%H%M%S"))
SECTION = '        <div class="howto-section">\n'
JAVA_AT = SECTION + '          <h3>Old school: the classic Java client</h3>\n'
SETTINGS_AT = SECTION + '          <h3>Settings</h3>\n'
PANEL_END = '\n      </div>\n    </div>\n'
NAV_AT = '          <li><a href="/web/howtoplay.html">How to Play</a></li>\n'
NAV = NAV_AT + '          <li><a href="/web/javaclient.html">Java Client</a></li>\n'


def split_guide(text):
    """How to Play without the two sections, and the Java section's body."""
    java = text.index(JAVA_AT)
    settings = text.index(SETTINGS_AT, java)
    end = text.index(PANEL_END, settings)
    body = text[java + len(JAVA_AT):settings].rstrip()
    assert body.endswith("</div>"), "the Java section should end in its </div>"
    body = body[:-len("</div>")].rstrip() + "\n"
    guide = text[:java].rstrip() + "\n" + text[end:]
    return guide, body


def java_page(template, body):
    head, rest = template.split('<div class="main">', 1)
    panel = rest.index(PANEL_END)
    page = (head + '<div class="main">\n      <div class="panel">\n        <h2>Java Client</h2>\n\n'
            + SECTION + body + "        </div>" + rest[panel:])
    return page.replace("<title>The Lands of Dusk - How to Play</title>",
                        "<title>The Lands of Dusk - Java Client</title>", 1)


writes = {}
guide_path = os.path.join(WEB, "howtoplay.html")
with open(guide_path, encoding="utf-8") as f:
    guide = f.read()
if JAVA_AT in guide:
    new_guide, body = split_guide(guide)
    writes["howtoplay.html"] = new_guide
    writes["javaclient.html"] = java_page(guide, body)
for name in sorted(os.listdir(WEB)):
    if not name.endswith(".html") or name in ("index_draft.html", "cheerpj_test.html"):
        continue
    text = writes.get(name)
    if text is None:
        with open(os.path.join(WEB, name), encoding="utf-8") as f:
            text = f.read()
    if NAV_AT in text and "/web/javaclient.html" not in text:
        writes[name] = text.replace(NAV_AT, NAV, 1)
if "javaclient.html" in writes and "/web/javaclient.html" not in writes["javaclient.html"]:
    writes["javaclient.html"] = writes["javaclient.html"].replace(NAV_AT, NAV, 1)
for name, text in sorted(writes.items()):
    path = os.path.join(WEB, name)
    if not DRY:
        os.makedirs(keep, exist_ok=True)
        if os.path.exists(path):
            shutil.copy2(path, os.path.join(keep, name))
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
print(("Would write" if DRY else "Wrote") + f" {len(writes)} pages: " + ", ".join(sorted(writes))
      + ("" if DRY or not writes else f" (backups in {keep})"))
