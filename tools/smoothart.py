#!/usr/bin/env python3
"""Makes the "Smooth" art style from the server's three sprite sheets.

    python3 tools/smoothart.py /home/flan/DuskRPG/rc/images art/smooth

Each frame (the sheets are strips of square frames, the side being the
image height) is redrawn on its own, so edges never borrow pixels from the
next frame:
  1. Scale4x (Scale2x twice): a pixel-art upscaler that rounds off
     staircase edges and diagonals.
  2. A blur, premultiplied so transparent edges don't darken, that takes
     the grain off the textures: stronger on the map tiles than on the
     small character sprites, which would turn to mush.
  3. An unsharp mask that brings the outlines back, so the result looks
     painted rather than blurry.
  4. A little more colour.
The settings are written to art/smooth/STYLE; sheets are redone when a
source image is newer or the settings changed, so running this often is
cheap. Needs Pillow (the server has it).
"""
import json
import os
import sys

from PIL import Image, ImageEnhance, ImageFilter

SHEETS = ["map", "players", "sprites"]
# Blur radius per sheet (in 4x pixels), sharpening strength, colour boost.
STYLE = {"version": 2, "blur": {"map": 3.0, "players": 1.6, "sprites": 2.2}, "sharpen": 140, "color": 1.25}


def scale2x(px, w, h):
    """Scale2x (EPX) on a list of RGBA tuples, row-major, w x h -> 2w x 2h."""
    out = [None] * (4 * w * h)
    ow = 2 * w
    for y in range(h):
        up = (y - 1 if y > 0 else y) * w
        row = y * w
        down = (y + 1 if y < h - 1 else y) * w
        for x in range(w):
            l = x - 1 if x > 0 else x
            r = x + 1 if x < w - 1 else x
            p = px[row + x]
            a, b, c, d = px[up + x], px[row + r], px[row + l], px[down + x]
            e0 = e1 = e2 = e3 = p
            # Only where the neighbours don't all agree, round the corner.
            if a != d and c != b:
                if c == a:
                    e0 = a
                if a == b:
                    e1 = b
                if d == c:
                    e2 = c
                if b == d:
                    e3 = d
            o = 2 * y * ow + 2 * x
            out[o], out[o + 1], out[o + ow], out[o + ow + 1] = e0, e1, e2, e3
    return out


def smooth_frame(frame, blur):
    w, h = frame.size
    # get_flattened_data replaces getdata from Pillow 12 on.
    px = list(frame.get_flattened_data() if hasattr(frame, "get_flattened_data") else frame.getdata())
    px = scale2x(scale2x(px, w, h), 2 * w, 2 * h)
    out = Image.new("RGBA", (4 * w, 4 * h))
    out.putdata(px)
    # "RGBa" is premultiplied, so blurring into transparent pixels doesn't
    # drag in their (black) colour.
    out = out.convert("RGBa").filter(ImageFilter.GaussianBlur(blur)).convert("RGBA")
    alpha = out.getchannel("A")
    rgb = out.convert("RGB").filter(ImageFilter.UnsharpMask(radius=blur * 1.2, percent=STYLE["sharpen"], threshold=2))
    rgb = ImageEnhance.Color(rgb).enhance(STYLE["color"])
    rgb.putalpha(alpha)
    return rgb


def smooth_sheet(src, dst, blur):
    sheet = Image.open(src).convert("RGBA")
    size = sheet.height
    frames = sheet.width // size
    out = Image.new("RGBA", (frames * size * 4, size * 4))
    for i in range(frames):
        frame = sheet.crop((i * size, 0, (i + 1) * size, size))
        out.paste(smooth_frame(frame, blur), (i * size * 4, 0))
    tmp = dst + ".new"
    out.save(tmp, "PNG", optimize=True)
    os.replace(tmp, dst)
    return frames, size


def main(src_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    stamp = os.path.join(out_dir, "STYLE")
    try:
        same_style = json.load(open(stamp)) == STYLE
    except (OSError, ValueError):
        same_style = False
    for name in SHEETS:
        src = os.path.join(src_dir, f"{name}.gif")
        dst = os.path.join(out_dir, f"{name}.png")
        if not os.path.exists(src):
            print(f"{name}: no {src}", file=sys.stderr)
            continue
        if same_style and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        frames, size = smooth_sheet(src, dst, STYLE["blur"][name])
        print(f"{name}: {frames} frames, {size}px -> {size * 4}px")
    with open(stamp, "w") as f:
        json.dump(STYLE, f)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
