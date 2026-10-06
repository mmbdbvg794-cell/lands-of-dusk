# python3 lightsprites.py <sprites.gif in> <out> <preview.png>: appends three
# 64x64 light sprites to the sprite sheet (55 brazier, 56 lamp post, 57
# campfire), drawn here and fitted to the sheet's own palette.
import sys
from PIL import Image, ImageDraw
src, dst, preview = sys.argv[1:4]
sheet = Image.open(src)
pal = sheet.getpalette()
n = sheet.size[0] // 64
assert n == 55, f"expected 55 sprites, found {n}"
colours = [tuple(pal[i * 3:i * 3 + 3]) for i in range(len(pal) // 3)]
def nearest(c):
    return min(range(1, len(colours)), key=lambda i: sum((a - b) ** 2 for a, b in zip(colours[i], c)))

def flame(d, cx, base, w, h):
    # Layers of fire, widest and darkest first.
    for k, (col, s) in enumerate([((150, 40, 10), 1.0), ((230, 90, 20), 0.78), ((255, 170, 40), 0.55), ((255, 240, 150), 0.3)]):
        ww, hh = w * s, h * s
        d.polygon([(cx - ww / 2, base), (cx - ww * 0.35, base - hh * 0.55), (cx - ww * 0.1, base - hh * 0.8), (cx, base - hh),
                   (cx + ww * 0.15, base - hh * 0.7), (cx + ww * 0.38, base - hh * 0.5), (cx + ww / 2, base)], fill=col)

def brazier():
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    for x0, x1 in ((22, 18), (42, 46)):  # legs
        d.line([(x0, 40), (x1, 60)], fill=(40, 34, 30), width=3)
    d.line([(32, 40), (32, 60)], fill=(40, 34, 30), width=3)
    d.ellipse((14, 30, 50, 46), fill=(52, 44, 40))  # bowl
    d.rectangle((14, 34, 50, 38), fill=(52, 44, 40))
    d.ellipse((16, 30, 48, 38), fill=(120, 40, 16))  # coals
    d.line([(15, 39), (49, 39)], fill=(96, 84, 72), width=1)  # rim light
    flame(d, 32, 35, 28, 30)
    return im

def lamppost():
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    # Grey iron, light enough to see on dark cobbles at night.
    d.rectangle((26, 58, 38, 62), fill=(92, 88, 84))  # foot
    d.rectangle((30, 18, 34, 60), fill=(104, 100, 96))  # post
    d.line([(31, 18), (31, 58)], fill=(156, 150, 142), width=1)
    d.polygon([(22, 16), (42, 16), (38, 8), (26, 8)], fill=(78, 74, 70))  # lantern roof
    d.rectangle((24, 16, 40, 30), fill=(78, 74, 70))  # lantern frame
    d.rectangle((26, 18, 38, 28), fill=(255, 200, 90))  # glass, lit
    d.rectangle((29, 20, 35, 26), fill=(255, 244, 190))
    d.line([(32, 16), (32, 30)], fill=(78, 74, 70), width=1)
    d.rectangle((26, 30, 38, 32), fill=(78, 74, 70))
    d.polygon([(30, 8), (34, 8), (32, 4)], fill=(78, 74, 70))
    return im

def campfire():
    im = Image.new("RGBA", (64, 64)); d = ImageDraw.Draw(im)
    for i in range(8):  # ring of stones
        import math
        a = i / 8 * math.tau
        x, y = 32 + math.cos(a) * 20, 50 + math.sin(a) * 8
        d.ellipse((x - 5, y - 4, x + 5, y + 4), fill=(110, 106, 100), outline=(60, 58, 56))
    d.line([(18, 54), (46, 44)], fill=(90, 56, 30), width=5)  # logs
    d.line([(18, 44), (46, 54)], fill=(110, 70, 38), width=5)
    flame(d, 32, 50, 26, 34)
    return im

frames = [brazier(), lamppost(), campfire()]
out = Image.new("P", ((n + len(frames)) * 64, 64), 0)
out.putpalette(pal)
out.paste(sheet, (0, 0))
for k, f in enumerate(frames):
    px = f.load(); t = Image.new("P", (64, 64), 0); t.putpalette(pal); tp = t.load()
    cache = {}
    for x in range(64):
        for y in range(64):
            r, g, b, a = px[x, y]
            if a > 128:
                tp[x, y] = cache.setdefault((r, g, b), nearest((r, g, b)))
    out.paste(t, ((n + k) * 64, 0))
out.save(dst, transparency=0)
pv = Image.new("RGB", (3 * 136, 128), (60, 90, 50))
for k in range(3):
    fr = out.crop(((n + k) * 64, 0, (n + k) * 64 + 64, 64)).convert("RGBA").resize((128, 128), Image.NEAREST)
    pv.paste(fr, (k * 136, 0), fr)
pv.save(preview)
print("sprites", n, "->", out.size[0] // 64)
