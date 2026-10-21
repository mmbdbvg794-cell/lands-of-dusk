#!/usr/bin/env python3
"""Keeps only a city bundle's map squares inside the given boxes, for
adding to a town that a later plan has changed (Velkarath: a full rebuild
would take out lights-velkarath.mjs's wall torches). Everything else in the
bundle (props, shops, signs, files) is kept; install_city.py adds only
what isn't there yet.

    python3 bundle_only.py <bundle.json> <out.json> x0,y0,x1,y1 [...]

Boxes are map coordinates, corners included.
"""
import json, sys

src, out, *boxes = sys.argv[1:]
boxes = [tuple(map(int, b.split(','))) for b in boxes]
b = json.load(open(src))
before = len(b['tiles'])
b['tiles'] = [t for t in b['tiles'] if any(x0 <= t[0] <= x1 and y0 <= t[1] <= y1 for x0, y0, x1, y1 in boxes)]
json.dump(b, open(out, 'w'))
print(f"{len(b['tiles'])} of {before} squares kept")
