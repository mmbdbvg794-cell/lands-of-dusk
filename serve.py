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
import http.server
import os


# Who's online: the game server writes who.json in its own directory
# (server/Who.java); the page asks for it beside itself.
WHO_FILE = os.environ.get("DUSK_WHO", os.path.expanduser("~/DuskRPG/who.json"))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0].endswith("/who.json"):
            try:
                with open(WHO_FILE, "rb") as f:
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
