#!/usr/bin/env python3
"""Lists every music track from music/manifest.json on the website's
credits page (~/DuskRPG/web/credits.json, a list of {name, role, body}
that credits.html inserts as HTML).

    python3 music_credits.py MANIFEST CREDITS [--apply]

Track entries carry "from": "music" (the page ignores it); they're
replaced each run, so a track taken out of the manifest leaves the credits
too. Everything else in the file is kept as it is. Without --apply it only
says what would change. The file isn't touched when nothing changed, and
a copy is kept as credits.json.bak when it is. tools/deploy.sh runs this
on the server with --apply after copying the client.
"""
import html
import json
import sys


def entry(t):
    title = html.escape(t.get("title") or t["file"])
    author = html.escape(t.get("author") or "unknown")
    lic = html.escape(t.get("license") or "")
    src = t.get("source") or ""
    body = []
    if src.startswith(("http://", "https://")):
        body.append('<a href="%s">%s</a>' % (html.escape(src, quote=True), html.escape(src)))
    if lic:
        body.append(lic)
    e = {"name": "%s by %s" % (title, author), "role": "Music (%s)" % html.escape(t["mood"]), "from": "music"}
    if body:
        e["body"] = " &middot; ".join(body)
    return e


def main():
    args = [a for a in sys.argv[1:] if a != "--apply"]
    apply = "--apply" in sys.argv
    if len(args) != 2:
        sys.exit(__doc__)
    manifest_path, credits_path = args
    with open(manifest_path) as f:
        tracks = [t for t in json.load(f).get("tracks", []) if t.get("file") and t.get("mood")]
    with open(credits_path) as f:
        credits = json.load(f)
    kept = [c for c in credits if c.get("from") != "music"]
    old = [c for c in credits if c.get("from") == "music"]
    new = [entry(t) for t in tracks]
    if old == new:
        print("Music credits: no change (%d tracks)." % len(new))
        return
    print("Music credits: %d tracks (was %d)." % (len(new), len(old)))
    for e in new:
        print("  %s (%s)" % (e["name"], e["role"]))
    if not apply:
        print("Dry run; add --apply to write %s." % credits_path)
        return
    with open(credits_path + ".bak", "w") as f:
        json.dump(credits, f, indent=2)
        f.write("\n")
    with open(credits_path, "w") as f:
        json.dump(kept + new, f, indent=2)
        f.write("\n")
    print("Wrote %s." % credits_path)


if __name__ == "__main__":
    main()
