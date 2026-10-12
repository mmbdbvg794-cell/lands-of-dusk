#!/usr/bin/env python3
"""Serves the browser client, like `python3 -m http.server`, but tells
browsers to check for a newer copy of every file each time.

Without that, browsers guess how long a file stays fresh, so after a
deploy a page can load new HTML with an old cached script. Checking is
cheap: an unchanged file comes back as a small 304 Not Modified.

    python3 serve.py [--bind ADDRESS] [PORT]      (default port 8080)
"""
import argparse
import functools
import http.cookies
import http.server
import json
import os
import urllib.parse


# Who's online and the leaderboard: the game server writes who.json
# (server/Who.java) and leaderboard.json (server/Admin.java) in its own
# directory; the pages ask for them beside themselves.
WHO_FILE = os.environ.get("DUSK_WHO", os.path.expanduser("~/DuskRPG/who.json"))
GAME_JSON = {
    "who.json": WHO_FILE,
    "leaderboard.json": os.path.join(os.path.dirname(WHO_FILE), "leaderboard.json"),
    "profiles.json": os.path.join(os.path.dirname(WHO_FILE), "profiles.json"),
}


# The forum (forum.py): everything under .../forum/api/, with its database
# in the game directory. Made on first use, so a problem there can't stop
# the rest of the site.
FORUM = None


def forum():
    global FORUM
    if FORUM is None:
        import forum as forum_module
        FORUM = forum_module.Forum(os.environ.get("DUSK_GAME", os.path.dirname(WHO_FILE)))
    return FORUM


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def forum_request(self, method):
        url = urllib.parse.urlsplit(self.path)
        if "/forum/api/" not in url.path:
            return False
        path = url.path.split("/forum/api/", 1)[1]
        body = b""
        if method == "POST":
            n = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(min(n, 64000))
        cookies = {}
        try:
            for k, m in http.cookies.SimpleCookie(self.headers.get("Cookie", "")).items():
                cookies[k] = m.value
        except http.cookies.CookieError:
            pass
        try:
            status, data, extra = forum().handle(method, path, urllib.parse.parse_qs(url.query), body, cookies, self.headers)
        except Exception as e:  # the forum failed to start
            print("forum:", repr(e), flush=True)
            status, data, extra = 503, {"error": "The forum isn't available right now."}, []
        out = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        for k, v in extra:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(out)
        return True

    def apply_request(self, method):
        """Beta applications (apply.py), under .../apply/api/."""
        url = urllib.parse.urlsplit(self.path)
        if "/apply/api/" not in url.path:
            return False
        path = url.path.split("/apply/api/", 1)[1]
        body = b""
        if method == "POST":
            n = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(min(n, 8192)) if n <= 8192 else b"x" * 8193
        god = None
        try:
            cookies = http.cookies.SimpleCookie(self.headers.get("Cookie", ""))
            token = cookies["dusk_forum"].value if "dusk_forum" in cookies else None
            me = forum().session(token) if token else None
            god = me["name"] if me and me.get("god") else None
        except Exception:
            pass
        try:
            import apply as apply_module
            status, data = apply_module.handle(method, path, body, self.headers, self.client_address[0],
                                               self.connection.getsockname()[0], god)
        except Exception as e:
            print("apply:", type(e).__name__, flush=True)
            status, data = 503, {"error": "Applications aren't open right now."}
        out = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(out)
        return True

    def do_POST(self):
        if not self.forum_request("POST") and not self.apply_request("POST"):
            self.send_error(405)

    def do_GET(self):
        if self.forum_request("GET") or self.apply_request("GET"):
            return
        name = self.path.split("?")[0].rsplit("/", 1)[-1]
        if name in GAME_JSON:
            try:
                with open(GAME_JSON[name], "rb") as f:
                    body = f.read()
            except OSError:
                body = b'{"updated":null,"players":[]}\n'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        # The client and its pages stay out of search engines (closed beta);
        # the public home and Lore pages are served elsewhere (DuskRPG/web).
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        super().end_headers()


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("port", nargs="?", type=int, default=8080)
    ap.add_argument("--bind", default="")
    args = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=here)
    with http.server.ThreadingHTTPServer((args.bind, args.port), handler) as httpd:
        print(f"Serving {here} on {args.bind or '*'}:{args.port}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
