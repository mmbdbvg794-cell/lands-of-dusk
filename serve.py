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


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
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
