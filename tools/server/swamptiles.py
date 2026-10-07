# python3 swamptiles.py <map.gif in> <map.gif out> <preview.png>: adds swamp
# tiles 168-173 to the tile sheet (32 x 32 each, in its own palette), for the
# lizardmen's islands (tools/world/swamp_islands.mjs, the lizardman city):
#   168 swamp mud     walkable   dark olive mud, wet patches
#   169 marsh         walkable   rank green grass, dark puddles
#   170 bog water     not        murky green water, lily pads
#   171 swamp tree    not        a weeping willow on marsh
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
    # A weeping willow: a short trunk, a low dome, curtains of strands
    # hanging nearly to the ground, over the shade they cast.
    t = marsh()
    d = ImageDraw.Draw(t)
    d.ellipse((2, 8, 30, 31), fill=(30, 46, 24))  # shade under the curtains
    d.polygon([(13, 30), (14, 12), (18, 12), (20, 30)], fill=(92, 72, 46))  # trunk
    d.line((12, 30, 9, 31), fill=(92, 72, 46), width=2)
    d.line((20, 30, 24, 31), fill=(66, 50, 32), width=2)
    d.line((17, 12, 17, 29), fill=(62, 48, 30))
    d.ellipse((4, 1, 28, 13), fill=(62, 92, 38))  # the dome
    d.ellipse((6, 2, 20, 9), fill=(88, 118, 48))
    d.ellipse((8, 2, 14, 6), fill=(126, 148, 66))
    r = random.Random(13)
    for x in range(3, 30):  # strands from the dome's rim, a gap at the trunk
        if 14 <= x <= 18 and x % 2 == 0:
            continue
        dx = abs(x - 16) / 13
        top = int(12 - 4 * (1 - dx * dx) ** 0.5) + 2
        bot = 29 - r.randint(0, 5) - (abs(x - 16) < 3) * 6
        light = (130, 152, 66) if x < 13 else ((96, 124, 50) if x < 22 else (70, 98, 40))
        dark = tuple(int(c * 0.65) for c in light)
        col = light if x % 2 else dark
        for y in range(top, bot):
            d.point((x, y), fill=col if r.random() < 0.85 else dark)
    for _ in range(16):  # leaf texture on the dome
        x, y = r.randint(6, 26), r.randint(2, 11)
        d.point((x, y), fill=r.choice([(46, 72, 30), (136, 156, 72)]))
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
