# python3 swamptiles.py <map.gif in> <map.gif out> <preview.png>: adds swamp
# tiles 168-173 to the tile sheet (32 x 32 each, in its own palette), for the
# lizardmen's islands (tools/world/swamp_islands.mjs, the lizardman city):
#   168 swamp mud     walkable   dark olive mud, wet patches
#   169 marsh         walkable   rank green grass, dark puddles
#   170 bog water     not        murky green water, lily pads
#   171 swamp tree    not        a mossy cypress on marsh
#   172 reeds         walkable   tall reeds on marsh
#   173 boardwalk     walkable   planks over the bog
import random
import sys
from PIL import Image, ImageDraw

FIRST = 168
src, dst, preview = sys.argv[1:4]
m = Image.open(src)
pal, info = m.getpalette(), dict(m.info)
n = m.size[0] // 32
assert n == FIRST, f"expected {FIRST} tiles, found {n}"


def noisy(base, spread, seed, size=32):
    r = random.Random(seed)
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            v = r.randint(-spread, spread)
            px[x, y] = tuple(max(0, min(255, c + v)) for c in base)
    return img


def blotches(img, colour, count, rmin, rmax, seed):
    r = random.Random(seed)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = r.randint(-4, 35), r.randint(-4, 35)
        rx, ry = r.randint(rmin, rmax), r.randint(max(1, rmin - 1), rmax)
        for dx in (-32, 0, 32):  # wrap so tiles join
            for dy in (-32, 0, 32):
                d.ellipse((x + dx - rx, y + dy - ry, x + dx + rx, y + dy + ry), fill=colour)
    return img


def mud():
    t = noisy((74, 62, 34), 10, 1)
    blotches(t, (58, 50, 28), 6, 3, 6, 2)
    blotches(t, (52, 58, 40), 3, 2, 4, 3)  # wet patches
    blotches(t, (86, 74, 42), 5, 1, 2, 4)
    return t


def marsh():
    t = noisy((56, 84, 38), 12, 5)
    blotches(t, (46, 66, 42), 2, 2, 3, 6)  # puddles
    d = ImageDraw.Draw(t)
    r = random.Random(7)
    for _ in range(14):  # grass blades
        x, y = r.randint(0, 31), r.randint(2, 31)
        d.line((x, y, x + r.randint(-1, 1), y - r.randint(2, 4)), fill=(88, 118, 48))
    return t


def bog():
    t = noisy((34, 50, 34), 6, 9)
    blotches(t, (28, 42, 30), 4, 3, 6, 10)
    d = ImageDraw.Draw(t)
    r = random.Random(11)
    for _ in range(3):  # lily pads
        x, y = r.randint(3, 28), r.randint(3, 28)
        d.ellipse((x - 3, y - 2, x + 3, y + 2), fill=(70, 112, 44))
        d.line((x, y, x + 3, y - 1), fill=(34, 50, 34))
    for _ in range(6):  # glints
        x, y = r.randint(0, 31), r.randint(0, 31)
        d.point((x, y), fill=(92, 112, 86))
    return t


def tree():
    t = marsh()
    d = ImageDraw.Draw(t)
    d.polygon([(13, 31), (15, 14), (17, 14), (20, 31)], fill=(62, 46, 30))  # trunk, flared
    d.line((12, 31, 9, 29), fill=(62, 46, 30), width=2)
    d.line((21, 31, 24, 29), fill=(62, 46, 30), width=2)
    for cx, cy, rr, col in [(16, 9, 9, (40, 64, 34)), (10, 12, 6, (34, 56, 30)), (22, 12, 6, (34, 56, 30)), (16, 6, 6, (52, 80, 40))]:
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=col)
    r = random.Random(13)
    for _ in range(8):  # hanging moss
        x = r.randint(8, 24)
        d.line((x, 12, x, 12 + r.randint(4, 9)), fill=(96, 112, 70))
    return t


def reeds():
    t = marsh()
    d = ImageDraw.Draw(t)
    r = random.Random(17)
    for _ in range(26):
        x, y = r.randint(1, 30), r.randint(12, 31)
        h = r.randint(8, 16)
        d.line((x, y, x + r.randint(-2, 2), y - h), fill=r.choice([(110, 128, 60), (92, 112, 50), (128, 136, 70)]))
        if r.random() < 0.3:
            d.ellipse((x - 1, y - h - 3, x + 1, y - h + 1), fill=(92, 62, 34))  # bulrush head
    return t


def boardwalk():
    t = bog()
    d = ImageDraw.Draw(t)
    for i, y in enumerate(range(0, 32, 8)):
        shade = (120, 92, 56) if i % 2 else (108, 82, 48)
        d.rectangle((2, y + 1, 29, y + 6), fill=shade)
        d.line((2, y + 6, 29, y + 6), fill=(70, 52, 30))
        for x in (5, 26):
            d.point((x, y + 3), fill=(50, 40, 30))  # nails
    d.line((1, 0, 1, 31), fill=(80, 60, 36), width=2)
    d.line((30, 0, 30, 31), fill=(80, 60, 36), width=2)
    return t


NEW = [mud(), marsh(), bog(), tree(), reeds(), boardwalk()]
# The sheet's palette has spare slots (it uses 122 of 128, a GIF may have
# 256): the new tiles' own colours go after the old ones, so nothing that
# was there changes and the swamp keeps its greens.
old = pal[:len(pal) // 3 * 3]
strip = Image.new("RGB", (32 * len(NEW), 32))
for i, t in enumerate(NEW):
    strip.paste(t, (i * 32, 0))
room = 256 - len(old) // 3
own = strip.quantize(colors=min(64, room), method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
extra = own.getpalette()[:min(64, room) * 3]
full = old + extra
pal_img = Image.new("P", (1, 1))
pal_img.putpalette(full + [0] * (768 - len(full)))
out = Image.new("P", ((n + len(NEW)) * 32, 32))
out.putpalette(full + [0] * (768 - len(full)))
out.paste(m, (0, 0))
for i, t in enumerate(NEW):
    out.paste(t.quantize(palette=pal_img, dither=Image.Dither.NONE), ((n + i) * 32, 0))
out.save(dst, **{k: v for k, v in info.items() if k in ("transparency", "background")})
pv = Image.new("RGB", (len(NEW) * 136, 136), (40, 40, 40))
for i in range(len(NEW)):
    tile = out.crop(((n + i) * 32, 0, (n + i) * 32 + 32, 32)).convert("RGB")
    # a 2x2 block, enlarged, so the edges can be seen joining
    block = Image.new("RGB", (64, 64))
    for bx in (0, 32):
        for by in (0, 32):
            block.paste(tile, (bx, by))
    pv.paste(block.resize((128, 128), Image.NEAREST), (i * 136 + 4, 4))
pv.save(preview)
print(f"map.gif: {n} -> {n + len(NEW)} tiles; preview {preview}")
