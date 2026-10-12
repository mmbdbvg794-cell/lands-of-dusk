# python3 craftsprites.py <sprites.gif in> <out> <preview.png>: appends the
# mining and smithing sprites (server/Crafting.java) to the sprite sheet,
# drawn here and fitted to the sheet's own palette, as lightsprites.py does:
#   58 bronze vein, 59 iron vein, 60 coal seam, 61 mithril vein,
#   62 worked-out vein (any ore, once mined out), 63 forge, 64 anvil.
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


frames = [vein((184, 110, 52), (240, 190, 120))(), vein((168, 58, 44), (210, 210, 215))(),
          vein((10, 10, 10), (120, 120, 128))(), vein((150, 200, 240), (240, 250, 255))(), worked_out(), forge(), anvil()]
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
