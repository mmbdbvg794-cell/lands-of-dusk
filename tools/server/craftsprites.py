# python3 craftsprites.py <sprites.gif in> <out> <preview.png>: appends the
# mining and smithing sprites (server/Crafting.java) to the sprite sheet,
# drawn here and fitted to the sheet's own palette, as lightsprites.py does:
#   58 bronze vein, 59 iron vein, 60 coal seam, 61 mithril vein,
#   62 worked-out vein (any ore, once mined out), 63 forge, 64 anvil,
#   65 mushroom patch, 66 mandrake patch, 67 lavender patch, 68 wolfsbane
#   patch, 69 azeala bush, 70 moonpetal patch, 71 picked patch (any herb,
#   once picked bare), 72 alchemy table.
# Always starts from the first 58 sprites, so running it again gives the
# same sheet.
import math
import random
import sys
from PIL import Image, ImageDraw

KEEP = 58
src, dst, preview = sys.argv[1:4]
sheet = Image.open(src)
pal = sheet.getpalette()
n = sheet.size[0] // 64
assert n >= KEEP, f"expected at least {KEEP} sprites, found {n}"
colours = [tuple(pal[i * 3:i * 3 + 3]) for i in range(len(pal) // 3)]


def nearest(c):
    return min(range(1, len(colours)), key=lambda i: sum((a - b) ** 2 for a, b in zip(colours[i], c)))


def rock(d, rnd):
    """A mound of brown rock with darker cracks and lighter tops."""
    d.polygon([(6, 60), (10, 40), (20, 26), (34, 20), (48, 26), (56, 40), (60, 60)], fill=(112, 92, 72))
    d.polygon([(14, 42), (22, 30), (34, 24), (46, 30), (40, 36), (26, 38)], fill=(146, 124, 100))  # lit top
    d.line([(6, 60), (60, 60)], fill=(70, 56, 44), width=2)
    for _ in range(5):  # cracks
        x, y = rnd.randint(14, 50), rnd.randint(30, 54)
        d.line([(x, y), (x + rnd.randint(-6, 6), y + rnd.randint(3, 7))], fill=(74, 60, 48), width=1)


def vein(ore, glint):
    def draw():
        rnd = random.Random(str(ore))
        im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
        rock(d, rnd)
        for _ in range(9):  # lumps of ore in the rock
            x, y, r = rnd.randint(16, 48), rnd.randint(30, 54), rnd.randint(2, 4)
            d.ellipse((x - r, y - r + 1, x + r, y + r - 1), fill=ore)
            d.point((x - 1, y - 1), fill=glint)
        return im
    return draw


def worked_out():
    rnd = random.Random("worked")
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    # Lower, broken rock and rubble: nothing left to dig.
    d.polygon([(8, 60), (14, 46), (28, 40), (42, 42), (54, 50), (58, 60)], fill=(104, 86, 68))
    d.polygon([(18, 48), (28, 43), (40, 45), (34, 49)], fill=(132, 112, 92))
    for _ in range(8):
        x, y = rnd.randint(10, 56), rnd.randint(52, 60)
        d.ellipse((x - 3, y - 2, x + 3, y + 2), fill=(90, 76, 60), outline=(66, 54, 42))
    return im


def forge():
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    d.rectangle((22, 4, 36, 26), fill=(96, 90, 86))  # chimney
    d.line([(22, 10), (36, 10)], fill=(70, 66, 62)); d.line([(22, 18), (36, 18)], fill=(70, 66, 62))
    d.rectangle((8, 26, 56, 60), fill=(110, 104, 98))  # stone hearth
    for y in (34, 42, 50):
        d.line([(8, y), (56, y)], fill=(80, 76, 72))
    for y, off in ((26, 0), (34, 8), (42, 0), (50, 8)):
        for x in range(8 + off, 56, 16):
            d.line([(x, y), (x, y + 8)], fill=(80, 76, 72))
    d.rectangle((18, 36, 46, 56), fill=(40, 30, 26))  # the mouth
    d.ellipse((18, 30, 46, 42), fill=(40, 30, 26))
    d.rectangle((20, 46, 44, 56), fill=(200, 70, 20))  # coals
    d.polygon([(22, 50), (27, 38), (31, 46), (35, 36), (40, 48), (42, 50)], fill=(255, 150, 40))
    d.polygon([(27, 50), (31, 42), (35, 50)], fill=(255, 230, 140))
    return im


def anvil():
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    d.rectangle((22, 44, 42, 62), fill=(110, 76, 44))  # stump
    d.ellipse((22, 40, 42, 48), fill=(150, 108, 66))
    d.line([(26, 50), (26, 60)], fill=(84, 58, 34)); d.line([(36, 48), (36, 60)], fill=(84, 58, 34))
    d.polygon([(26, 40), (38, 40), (40, 34), (24, 34)], fill=(52, 54, 60))  # waist
    d.polygon([(6, 24), (46, 24), (52, 30), (46, 34), (14, 34), (10, 28)], fill=(66, 68, 76))  # face and horn
    d.polygon([(46, 24), (60, 26), (52, 30)], fill=(66, 68, 76))
    d.line([(10, 25), (46, 25)], fill=(150, 154, 166), width=2)  # bright working face
    return im


def ground(d, rnd):
    """A low patch of earth with grass round it."""
    d.ellipse((8, 46, 56, 62), fill=(92, 70, 46))
    for _ in range(14):
        x = rnd.randint(8, 56)
        d.line([(x, 56), (x + rnd.randint(-3, 3), 46 + rnd.randint(-4, 2))], fill=(70, 120, 40), width=1)


def herb(kind):
    def draw():
        rnd = random.Random(kind)
        im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
        ground(d, rnd)
        spots = [(18, 50), (30, 46), (42, 50), (24, 56), (38, 56), (48, 44)]
        for x, y in spots:
            if kind == "mushroom":
                d.rectangle((x - 1, y - 6, x + 1, y), fill=(230, 220, 200))
                d.pieslice((x - 6, y - 12, x + 6, y - 2), 180, 360, fill=(150, 90, 50))
                d.point((x - 2, y - 9), fill=(240, 220, 190))
            elif kind == "mandrake":
                for dx in (-5, 0, 5):
                    d.polygon([(x, y), (x + dx - 2, y - 12), (x + dx + 2, y - 12)], fill=(46, 110, 40))
                d.ellipse((x - 3, y - 2, x + 3, y + 3), fill=(170, 130, 80))
            elif kind == "lavender":
                for dx in (-3, 0, 3):
                    d.line([(x + dx, y), (x + dx, y - 14)], fill=(70, 120, 50))
                    d.rectangle((x + dx - 1, y - 18, x + dx + 1, y - 10), fill=(150, 110, 210))
            elif kind == "wolfsbane":
                d.line([(x, y), (x, y - 18)], fill=(50, 100, 40), width=2)
                for k in range(3):
                    d.ellipse((x - 3, y - 20 + k * 5, x + 3, y - 15 + k * 5), fill=(80, 70, 190))
            elif kind == "azeala":
                d.ellipse((x - 7, y - 12, x + 7, y + 1), fill=(40, 120, 40))
                for _ in range(4):
                    fx, fy = x + rnd.randint(-5, 5), y + rnd.randint(-10, -2)
                    d.ellipse((fx - 2, fy - 2, fx + 2, fy + 2), fill=(230, 60, 110))
            elif kind == "moonpetal":
                d.line([(x, y), (x, y - 12)], fill=(90, 140, 110))
                for a in range(5):
                    ang = a / 5 * math.tau
                    px, py = x + math.cos(ang) * 4, y - 14 + math.sin(ang) * 4
                    d.ellipse((px - 2, py - 2, px + 2, py + 2), fill=(200, 230, 255))
                d.point((x, y - 14), fill=(255, 255, 255))
        return im
    return draw


def picked():
    rnd = random.Random("picked")
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    ground(d, rnd)
    for x in (18, 30, 42, 26, 38):
        d.line([(x, 54), (x, 50)], fill=(110, 140, 70), width=2)  # stubs
    return im


def alchemy_table():
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    d.rectangle((8, 34, 56, 40), fill=(130, 90, 52))  # top
    d.line([(8, 34), (56, 34)], fill=(170, 124, 76))
    for x in (11, 51):
        d.rectangle((x, 40, x + 3, 60), fill=(100, 68, 38))  # legs
    d.ellipse((12, 20, 26, 34), fill=(70, 170, 80))  # round flask, green
    d.rectangle((17, 14, 21, 21), fill=(200, 220, 220))
    d.rectangle((30, 18, 38, 34), fill=(200, 50, 50))  # tall bottle, red
    d.rectangle((32, 12, 36, 18), fill=(200, 220, 220))
    d.polygon([(42, 34), (54, 34), (48, 22)], fill=(80, 100, 210))  # cone flask, blue
    d.rectangle((46, 16, 50, 23), fill=(200, 220, 220))
    return im


frames = [vein((184, 110, 52), (240, 190, 120))(), vein((168, 58, 44), (210, 210, 215))(),
          vein((10, 10, 10), (120, 120, 128))(), vein((150, 200, 240), (240, 250, 255))(), worked_out(), forge(), anvil(),
          herb("mushroom")(), herb("mandrake")(), herb("lavender")(), herb("wolfsbane")(), herb("azeala")(), herb("moonpetal")(),
          picked(), alchemy_table()]
out = Image.new("P", ((KEEP + len(frames)) * 64, 64), 0)
out.putpalette(pal)
out.paste(sheet.crop((0, 0, KEEP * 64, 64)), (0, 0))
for k, f in enumerate(frames):
    px = f.load(); t = Image.new("P", (64, 64), 0); t.putpalette(pal); tp = t.load()
    cache = {}
    for x in range(64):
        for y in range(64):
            r, g, b, a = px[x, y]
            if a > 128:
                tp[x, y] = cache.setdefault((r, g, b), nearest((r, g, b)))
    out.paste(t, ((KEEP + k) * 64, 0))
out.save(dst, transparency=0)
out.info["transparency"] = 0
pv = Image.new("RGB", (len(frames) * 136, 128), (60, 90, 50))
for k in range(len(frames)):
    fr = out.crop(((KEEP + k) * 64, 0, (KEEP + k) * 64 + 64, 64)).convert("RGBA").resize((128, 128), Image.NEAREST)
    pv.paste(fr, (k * 136, 0), fr)
pv.save(preview)
print("sprites", n, "->", out.size[0] // 64)
