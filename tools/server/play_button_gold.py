#!/usr/bin/env python3
"""The website's Play Now button in the stone-and-gold look of the Discord
button (discord_button.py), in place of the blue beveled button art.

    python3 play_button_gold.py <game dir> [--dry-run]

  Every page whose .play-btn rule is still the blockButton.jpg one gets the
  new rule: same size and lettering, a dark stone gradient, gold edge and
  gold text. On apply.html this also restyles Send Application, which shares
  the class. Pages are copied to backups/web-playgold-<time>/ first.
  Running it again changes nothing.
"""
import os
import shutil
import sys
import time

G = sys.argv[1]
DRY = "--dry-run" in sys.argv
WEB = os.path.join(G, "web")
keep = os.path.join(G, "backups", time.strftime("web-playgold-%Y%m%d-%H%M%S"))
OLD_NOTE = "  /* --- Play button, styled from the game's own beveled button art --- */\n"
NEW_NOTE = "  /* --- Play button, stone and gold like the Discord button --- */\n"
OLD = """  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 14px;
    padding: 15px 8px;
    width: 100%;
    background-image: url('/images/blockButton.jpg');
    background-size: 100% 100%;
    border: none;
    border-radius: 4px;
    color: #eaf1ff;
    font-family: 'Cinzel', serif;
    font-size: 19px;
    letter-spacing: 0.05em;
    text-decoration: none;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    box-shadow: 0 3px 10px rgba(0,0,0,0.5);
    transition: transform 0.15s, filter 0.15s;
  }
"""
NEW = """  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 14px;
    padding: 15px 8px;
    width: 100%;
    background: linear-gradient(#4b4c51, #2c2d31);
    border: 1px solid var(--gold);
    border-radius: 4px;
    color: var(--gold-bright);
    font-family: 'Cinzel', serif;
    font-size: 19px;
    letter-spacing: 0.05em;
    text-decoration: none;
    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    box-shadow: 0 3px 10px rgba(0,0,0,0.5);
    transition: transform 0.15s, filter 0.15s;
  }
"""
changed = []
for name in sorted(os.listdir(WEB)):
    if not name.endswith(".html") or name in ("index_draft.html", "cheerpj_test.html"):
        continue
    path = os.path.join(WEB, name)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if text.count(OLD) != 1:
        continue
    changed.append(name)
    if not DRY:
        os.makedirs(keep, exist_ok=True)
        shutil.copy2(path, os.path.join(keep, name))
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace(OLD, NEW).replace(OLD_NOTE, NEW_NOTE))
print(("Would change" if DRY else "Changed") + f" {len(changed)} pages: " + ", ".join(changed)
      + ("" if DRY or not changed else f" (backups in {keep})"))
