#!/usr/bin/env python3
"""A Discord button in the website's Server Status box, in place of the
"Join our Discord" text link in the Links list.

    python3 discord_button.py <game dir> [--dry-run]

  Every page with the sidebar's Play Now button gets a stone-and-gold
  "Discord" button (Discord's logo, Cinzel, gold edge) under it, or under
  "Closed alpha: apply for a key" where the page has that line. Like the
  link it replaces it stays hidden until discord.js fills in the invite
  from beta.conf. Pages are copied to backups/web-discord-<time>/ first.
  Running it again changes nothing.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
WEB = os.path.join(G, "web")
keep = os.path.join(G, "backups", time.strftime("web-discord-%Y%m%d-%H%M%S"))
LINK = ('          <li data-discord-item hidden><a data-discord href="#" target="_blank"'
        ' rel="noopener">Join our Discord</a></li>\n')
PLAY_AT = '        <a class="play-btn" href="/play/">Play Now</a>\n'
SUB_AT = '        <p class="play-sub">Closed alpha: <a href="/web/apply.html">apply for a key</a></p>\n'
LOGO = ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>')
BUTTON = ('        <a class="discord-btn" aria-label="Join our Discord" title="Join our Discord" data-discord'
          ' data-discord-item hidden href="#" target="_blank" rel="noopener">' + LOGO + '<span>Discord</span></a>\n')
CSS = """
  /* --- Discord button, under Play Now (discord.js fills in the link) --- */
  .discord-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    white-space: nowrap;
    margin-top: 12px;
    padding: 10px 8px;
    width: 100%;
    background: linear-gradient(#4b4c51, #2c2d31);
    border: 1px solid var(--gold);
    border-radius: 4px;
    color: var(--gold-bright);
    font-family: 'Cinzel', serif;
    font-size: 16px;
    letter-spacing: 0.04em;
    text-decoration: none;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    box-shadow: 0 3px 10px rgba(0,0,0,0.5);
    transition: transform 0.15s, filter 0.15s;
  }
  .discord-btn[hidden] { display: none; }
  .discord-btn svg { width: 22px; height: 22px; fill: currentColor; flex: none; }
  .discord-btn:hover { transform: translateY(-1px); filter: brightness(1.15); }
  .discord-btn:active { transform: translateY(1px); }
</style>"""
changed = []
for name in sorted(os.listdir(WEB)):
    if not name.endswith(".html") or name in ("index_draft.html", "cheerpj_test.html") or name.startswith("preview-"):
        continue
    path = os.path.join(WEB, name)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if 'class="discord-btn"' in text or PLAY_AT not in text or "</style>" not in text:
        continue
    at = SUB_AT if SUB_AT in text else PLAY_AT
    new = text.replace(LINK, "", 1).replace(at, at + BUTTON, 1).replace("</style>", CSS, 1)
    changed.append(name)
    if not DRY:
        os.makedirs(keep, exist_ok=True)
        shutil.copy2(path, os.path.join(keep, name))
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
print(("Would change" if DRY else "Changed") + f" {len(changed)} pages: " + ", ".join(changed)
      + ("" if DRY or not changed else f" (backups in {keep})"))
