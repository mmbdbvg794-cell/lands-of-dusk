#!/usr/bin/env python3
"""Puts a town built by tools/world/city.mjs into a Dusk game directory.

    python3 install_city.py <game dir> <bundle.json> [--dry-run] [--force] [--old-world]

What it changes, after copying each file it touches to
backups/city-<name>-<time>/:
  shortmap        the town's squares
  props, merchants, signs, signnames, mobs (and dropMobs: monsters taken out)
                  the town's entries, added at the end (an entry already
                  there, at the same place, is left alone); props the plan
                  drops (moved since an earlier install) are taken out
  defProps/, talk/ ...  the town's new files; one that's already there and
                  different (a god may have changed it) is kept unless
                  --force
  journal         quest journal lines for flags it doesn't have yet
  other files     single values the plan sets (a race's start point)
  defConditions/  a hidden condition for each quest flag

The server reads all of these when it starts, and writes the map and the
entry files back when a god saves, so: install, then restart, with no
"save" in between. Running it again changes nothing that's already in.
"""
import json
import os
import shutil
import struct
import sys
import time


def read(path):
    try:
        with open(path, encoding="latin-1") as f:
            return f.read()
    except FileNotFoundError:
        return None


def entries_text(existing, block):
    # The server stops reading at the first empty line, so no blank lines
    # before what's added.
    base = (existing or "").rstrip("\r\n \t")
    return (base + "\n" if base else "") + block


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    if len(args) != 2:
        sys.exit(__doc__)
    game, bundle_path = args
    with open(bundle_path, encoding="utf-8") as f:
        b = json.load(f)
    os.chdir(game)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    backup = os.path.join("backups", "city-%s-%s" % (b["name"].lower().replace(" ", "-"), stamp))
    said = []

    def keep(path):
        if dry or not os.path.exists(path):
            return
        dest = os.path.join(backup, path)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if not os.path.exists(dest):
            shutil.copy2(path, dest)

    def write(path, text):
        if dry:
            return
        keep(path)
        d = os.path.dirname(path)
        if d:
            os.makedirs(d, exist_ok=True)
        tmp = path + ".new"
        with open(tmp, "w", encoding="latin-1", newline="\n") as f:
            f.write(text)
        os.replace(tmp, path)

    # ---- the map ----
    with open("shortmap", "rb") as f:
        cols, rows = struct.unpack(">ii", f.read(8))
    changed = 0
    with open("shortmap", "rb") as f:
        data = bytearray(f.read())
    for x, y, t in b["tiles"]:
        if not (0 <= x < cols and 0 <= y < rows):
            sys.exit("square %d,%d is off the %dx%d map" % (x, y, cols, rows))
        if x < 1000 and y < 1000 and not (b.get("oldWorld") and "--old-world" in sys.argv):
            sys.exit("square %d,%d is in the old world; not touching it (a plan that may, run with --old-world)" % (x, y))
        at = 8 + (x * rows + y) * 2
        if struct.unpack(">H", data[at:at + 2])[0] != t:
            data[at:at + 2] = struct.pack(">H", t)
            changed += 1
    if changed and not dry:
        keep("shortmap")
        tmp = "shortmap.new"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, "shortmap")
    said.append("map: %d squares changed" % changed)

    # ---- entries ----
    def triples(text):
        lines = (text or "").replace("\r", "").split("\n")
        out = set()
        for i in range(0, len(lines) - 2, 3):
            out.add((lines[i], lines[i + 1].strip(), lines[i + 2].strip()))
        return out

    text = read("props")
    drop = {(p["name"], str(p["x"]), str(p["y"])) for p in b.get("dropProps", [])}
    if drop:
        lines = (text or "").replace("\r", "").split("\n")
        kept, gone = [], 0
        i = 0
        while i < len(lines):
            if i + 2 < len(lines) and (lines[i], lines[i + 1].strip(), lines[i + 2].strip()) in drop:
                gone += 1
                i += 3
                continue
            kept.append(lines[i])
            i += 1
        if gone:
            text = "\n".join(kept)
            write("props", text)
        said.append("props: %d taken away" % gone)
    have = triples(text)
    add = [p for p in b["props"] if (p["name"], str(p["x"]), str(p["y"])) not in have]
    if add:
        write("props", entries_text(text, "".join("%s\n%d\n%d\n" % (p["name"], p["x"], p["y"]) for p in add)))
    said.append("props: %d added, %d already there" % (len(add), len(b["props"]) - len(add)))

    text = read("merchants") or ""
    lines = text.replace("\r", "").split("\n")
    # Each shop: its name (any word, "Merchant" by default), x, y, wares, end.
    places = {}
    for i in range(len(lines) - 2):
        if lines[i][:1].isalpha() and lines[i] != "end" and lines[i + 1].strip().isdigit() and lines[i + 2].strip().isdigit():
            places[(lines[i + 1].strip(), lines[i + 2].strip())] = i
    add = [m for m in b["merchants"] if (str(m["x"]), str(m["y"])) not in places]
    renamed = 0
    for m in b["merchants"]:
        i = places.get((str(m["x"]), str(m["y"])))
        if i is not None and m.get("name") and lines[i] != m["name"]:
            lines[i] = m["name"]
            renamed += 1
    if renamed:
        text = "\n".join(lines)
        write("merchants", text)
    if add:
        write("merchants", entries_text(text, "".join("%s\n%d\n%d\n%send\n" % (m.get("name") or "Merchant", m["x"], m["y"], "".join(w + "\n" for w in m["wares"])) for m in add)))
    said.append("shops: %d added, %d already there, %d renamed" % (len(add), len(b["merchants"]) - len(add), renamed))

    text = read("signs")
    have = {(x, y) for _, x, y in triples(text)}
    add = [s for s in b["signs"] if (str(s["x"]), str(s["y"])) not in have]
    if add:
        write("signs", entries_text(text, "".join("%s\n%d\n%d\n" % (s["text"], s["x"], s["y"]) for s in add)))
        named = [s for s in add if s.get("name")]
        if named:
            write("signnames", entries_text(read("signnames"), "".join("%d\n%d\n%s\n" % (s["x"], s["y"], s["name"]) for s in named)))
    said.append("signs: %d added, %d already there" % (len(add), len(b["signs"]) - len(add)))

    text = read("mobs") or ""
    # Monsters an earlier install (or the old spawns) put somewhere that
    # has changed: taken out, entry by entry (name, level, x, y).
    dropm = {(m["name"], str(m["level"]), str(m["x"]), str(m["y"])) for m in b.get("dropMobs", [])}
    if dropm:
        lines = text.replace("\r", "").split("\n")
        kept, gone, i = [], 0, 0
        while i < len(lines):
            if i + 3 < len(lines) and (lines[i], lines[i + 1].strip(), lines[i + 2].strip(), lines[i + 3].strip()) in dropm:
                gone += 1
                i += 4
                continue
            kept.append(lines[i])
            i += 1
        if gone:
            text = "\n".join(kept)
            write("mobs", text)
        said.append("monsters: %d taken away" % gone)
    add = [m for m in b["mobs"] if "%s\n%d\n%d\n%d\n" % (m["name"], m["level"], m["x"], m["y"]) not in text.replace("\r", "")]
    if add:
        write("mobs", entries_text(text, "".join("%s\n%d\n%d\n%d\n" % (m["name"], m["level"], m["x"], m["y"]) for m in add)))
    said.append("monsters: %d added, %d already there" % (len(add), len(b["mobs"]) - len(add)))

    # ---- files ----
    new = same = kept = 0
    for path, content in sorted(b["files"].items()):
        if ".." in path.split("/") or path.startswith("/"):
            sys.exit("bad file path " + path)
        old = read(path)
        if old == content:
            same += 1
        elif old is not None and not force:
            kept += 1
            said.append("  kept %s (already there and different; --force replaces it)" % path)
        else:
            write(path, content)
            new += 1
            # A script's compiled copy beside it would be run instead.
            if old is not None and os.path.exists(path + ".dsko") and not dry:
                os.remove(path + ".dsko")
    for c in b.get("copies", []):
        if os.path.exists(c["to"]) and not force:
            continue
        src = read(c["from"])
        if src is None:
            said.append("  can't copy %s: it isn't there" % c["from"])
            continue
        for a, z in c.get("replace", []):
            src = src.replace(a, z)
        write(c["to"], src)
        new += 1
    said.append("files: %d written, %d unchanged, %d kept" % (new, same, kept))

    # ---- values in the game's own files ----
    for v in b.get("sets", []):
        text = read(v["file"])
        if text is None:
            said.append("  can't set %s in %s: it isn't there" % (v["key"], v["file"]))
            continue
        lines = text.split("\n")
        for i in range(len(lines) - 1):
            if lines[i].strip() == v["key"]:
                if lines[i + 1].strip() != v["value"]:
                    lines[i + 1] = v["value"]
                    write(v["file"], "\n".join(lines))
                    said.append("set %s %s = %s" % (v["file"], v["key"], v["value"]))
                break
        else:
            said.append("  can't set %s in %s: no such key" % (v["key"], v["file"]))

    # ---- journal and flags ----
    text = read("journal") or ""
    flags = {l.split("|", 1)[0].lower() for l in text.splitlines() if "|" in l}
    add = [j for j in b["journal"] if j["flag"].lower() not in flags]
    if add:
        clean = lambda s: s.replace("|", "/").replace("\n", " ")
        write("journal", entries_text(text, "".join("%s|%s|%s|%s\n" % (j["flag"], clean(j["title"]), clean(j["text"]), "1" if j["done"] else "0") for j in add)))
    said.append("journal: %d lines added" % len(add))
    made = 0
    for flag in b["conditions"]:
        # The game looks conditions up in lower case.
        path = os.path.join("defConditions", flag.lower())
        if not os.path.exists(path):
            write(path, "nodisplay\n.\n")
            made += 1
    said.append("flags: %d made" % made)

    print(("Would install " if dry else "Installed ") + b["name"] + (" (backups in %s)" % backup if not dry and os.path.isdir(backup) else ""))
    for s in said:
        print("  " + s)


if __name__ == "__main__":
    main()
