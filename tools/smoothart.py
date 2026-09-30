#!/usr/bin/env python3
"""Makes the "Smooth" art style: the server's three sprite sheets redrawn
at 4x with Scale2x applied twice (Scale4x), a pixel-art upscaler that
rounds off staircase edges and diagonals without blurring.

    python3 tools/smoothart.py /home/flan/DuskRPG/rc/images art/smooth [soften]

Each sheet is a strip of square frames (the side is the image height), and
each frame is scaled on its own, so edges never borrow pixels from the
next frame. "soften" (default 1.0, in 4x pixels; 0 for none) then blurs
each frame a little, premultiplied so transparent edges don't darken, to
take the grain off. Output is PNG with transparency. A sheet is only
redone when its source is newer than the output, so running this often
is cheap.
Needs Pillow (the server has it).
"""
import os
import sys

from PIL import Image, ImageFilter

SHEETS = ["map", "players", "sprites"]


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


def smooth_frame(frame, soften):
    w, h = frame.size
    # get_flattened_data replaces getdata from Pillow 12 on.
    px = list(frame.get_flattened_data() if hasattr(frame, "get_flattened_data") else frame.getdata())
    px = scale2x(px, w, h)
    px = scale2x(px, 2 * w, 2 * h)
    out = Image.new("RGBA", (4 * w, 4 * h))
    out.putdata(px)
    if soften > 0:
        # "RGBa" is premultiplied, so blurring into transparent pixels
        # doesn't drag in their (black) colour.
        out = out.convert("RGBa").filter(ImageFilter.GaussianBlur(soften)).convert("RGBA")
    return out


def smooth_sheet(src, dst, soften):
    sheet = Image.open(src).convert("RGBA")
    size = sheet.height
    frames = sheet.width // size
    out = Image.new("RGBA", (frames * size * 4, size * 4))
    for i in range(frames):
        frame = sheet.crop((i * size, 0, (i + 1) * size, size))
        out.paste(smooth_frame(frame, soften), (i * size * 4, 0))
    tmp = dst + ".new"
    out.save(tmp, "PNG", optimize=True)
    os.replace(tmp, dst)
    return frames, size


def main(src_dir, out_dir, soften=1.0):
    os.makedirs(out_dir, exist_ok=True)
    for name in SHEETS:
        src = os.path.join(src_dir, f"{name}.gif")
        dst = os.path.join(out_dir, f"{name}.png")
        if not os.path.exists(src):
            print(f"{name}: no {src}", file=sys.stderr)
            continue
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        frames, size = smooth_sheet(src, dst, soften)
        print(f"{name}: {frames} frames, {size}px -> {size * 4}px")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 1.0)
