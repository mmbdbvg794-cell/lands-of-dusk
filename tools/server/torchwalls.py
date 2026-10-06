# python3 torchwalls.py <map.gif in> <map.gif out> <preview.png>: adds torch-on-wall tiles
# 160-167 (the torch of tile 24, cut from its wall, tile 11) to the tile sheet.
import sys
from PIL import Image
NEW = [(160, 59), (161, 58), (162, 98), (163, 97), (164, 60), (165, 62), (166, 101), (167, 49)]
src, dst, preview = sys.argv[1:4]
m = Image.open(src)
pal, info = m.getpalette(), dict(m.info)
n = m.size[0] // 32
assert n == 160, f"expected 160 tiles, found {n}"
tile = lambda i: m.crop((i * 32, 0, i * 32 + 32, 32))
a, b = tile(24).load(), tile(11).load()
rgb = tile(24).convert("RGB").load()
def keep(x, y):
    r, g, bl = rgb[x, y]
    warm = r - bl > 40 and r > 70            # flame, brass bracket, glow on the wood
    handle = 12 <= x <= 18 and y >= 24 and r + g + bl < 150   # the dark handle below
    return warm or handle
torch = [(x, y, a[x, y]) for x in range(32) for y in range(10, 32) if a[x, y] != b[x, y] and keep(x, y)]
out = Image.new("P", ((n + len(NEW)) * 32, 32))
out.putpalette(pal)
out.paste(m, (0, 0))
for new, base in NEW:
    t = tile(base).copy()
    p = t.load()
    for x, y, c in torch: p[x, y] = c
    out.paste(t, (new * 32, 0))
out.save(dst, **{k: v for k, v in info.items() if k in ("transparency", "background")})
pv = Image.new("RGB", (len(NEW) * 2 * 136, 128), (255, 0, 255))
for i, (new, base) in enumerate(NEW):
    pv.paste(tile(base).convert("RGB").resize((128, 128), Image.NEAREST), (i * 272, 0))
    pv.paste(out.crop((new * 32, 0, new * 32 + 32, 32)).convert("RGB").resize((128, 128), Image.NEAREST), (i * 272 + 136, 0))
pv.save(preview)
print("tiles", n, "->", out.size[0] // 32)
