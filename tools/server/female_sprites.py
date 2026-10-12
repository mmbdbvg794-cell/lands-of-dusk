"""Adds the female looks to the server's players.gif (server/Sex.java):
images 8-11, made from the race images 0 (human), 1 (elf), 2 (dark elf)
and 6 (lizardman), frame by frame, in the sprites' own colours. Long hair
down to the shoulders and a skirt over the legs; the lizardfolk, with no
hair, get a chest wrap in the colour of their loincloth.

  python3 female_sprites.py <players.gif> <out.gif> [preview.png]

Always starts from the first 8 images, so running it again gives the same
sheet. Needs Pillow (on duskserver). Frames are 36x36: per image, standing
then walking facing north, south, west, east.
"""
import sys
from collections import Counter
from PIL import Image

SIZE = 36
BASES = [0, 1, 2, 6]  # -> 8, 9, 10, 11
KEEP = 8  # images before the female ones


def frames_of(im, image):
    return [im.crop(((image * 8 + f) * SIZE, 0, (image * 8 + f + 1) * SIZE, SIZE)) for f in range(8)]


def opaque(px, x, y, clear):
    return 0 <= x < SIZE and 0 <= y < SIZE and px[x, y] != clear


def rows(px, clear):
    """For each row: (first, last) opaque x, or None."""
    out = []
    for y in range(SIZE):
        xs = [x for x in range(SIZE) if px[x, y] != clear]
        out.append((xs[0], xs[-1]) if xs else None)
    return out


def common(px, clear, box):
    x0, y0, x1, y1 = box
    c = Counter(px[x, y] for x in range(max(0, x0), min(SIZE, x1)) for y in range(max(0, y0), min(SIZE, y1)) if px[x, y] != clear)
    return c.most_common(1)[0][0] if c else None


def head_box(px, clear, r):
    """The head: the first opaque rows, down to where the figure widens
    into the shoulders."""
    top = next(y for y in range(SIZE) if r[y])
    width0 = r[top][1] - r[top][0] + 1
    y = top
    widest = width0
    while y + 1 < SIZE and r[y + 1] and (r[y + 1][1] - r[y + 1][0] + 1) <= max(widest, 7) and y - top < 7:
        y += 1
        widest = max(widest, r[y][1] - r[y][0] + 1)
    xs = [x for yy in range(top, y + 1) for x in (r[yy][0], r[yy][1])]
    return top, y, min(xs), max(xs)


def legs_top(r, top):
    """Where the legs start: the first row below the middle of the figure
    with a gap between two runs, else 60% of the way down."""
    bottom = max(y for y in range(SIZE) if r[y])
    return bottom, int(top + (bottom - top) * 0.58)


def add_hair(px, clear, r, facing, hair):
    top, neck, x0, x1 = head_box(px, clear, r)
    cx = (x0 + x1) // 2
    length = 5
    if facing == 'n':
        # From behind: a curtain of hair over the neck and shoulders.
        for y in range(neck, min(SIZE, neck + length)):
            half = 2 if y < neck + length - 1 else 1
            for x in range(cx - half, cx + half + 1):
                if opaque(px, x, y, clear) or y <= neck + 1:
                    px[x, y] = hair
    elif facing == 's':
        # From the front: locks either side of the face.
        for y in range(top + 2, min(SIZE, neck + length)):
            for x in (x0 - 1, x0, x1, x1 + 1):
                if 0 <= x < SIZE and (opaque(px, x, y, clear) or y <= neck + 2):
                    px[x, y] = hair
    else:
        # From the side: hair down the back of the head (west-facing looks
        # left, so the back is on the right).
        back = [x1, x1 + 1] if facing == 'w' else [x0, x0 - 1]
        for y in range(top + 1, min(SIZE, neck + length)):
            for x in back:
                if 0 <= x < SIZE:
                    px[x, y] = hair


def add_skirt(px, clear, r, top):
    bottom, start = legs_top(r, top)
    depth = max(4, int((bottom - start) * 0.45))
    # The trousers' colour: the legs between the hips and the boots.
    colour = common(px, clear, (0, start + 2, SIZE, bottom - 2))
    if colour is None:
        return
    for i, y in enumerate(range(start, min(SIZE, start + depth))):
        span = r[y]
        if not span:
            continue
        flare = min(2, i // 3)
        for x in range(span[0] - flare, span[1] + flare + 1):
            if 0 <= x < SIZE:
                px[x, y] = colour
    # A darker hem: the boots' colour (the lowest rows).
    hem = start + depth - 1
    boots = common(px, clear, (0, bottom - 2, SIZE, bottom + 1))
    if boots is not None and hem < SIZE and r[hem]:
        flare = min(2, (depth - 1) // 3)
        for x in range(r[hem][0] - flare, r[hem][1] + flare + 1):
            if 0 <= x < SIZE and px[x, hem] != clear:
                px[x, hem] = boots


def add_wrap(px, clear, r, top, band, facing):
    bottom = max(y for y in range(SIZE) if r[y])
    # (From the front and back the crest makes the figure taller.)
    y0 = int(top + (bottom - top) * (0.30 if facing in 'ns' else 0.36))
    for y in (y0, y0 + 1):
        if r[y]:
            # Only the body, not arms held out: the middle of the row.
            x0, x1 = r[y]
            mid = (x0 + x1) // 2
            for x in range(mid - 4, mid + 5):
                if opaque(px, x, y, clear):
                    px[x, y] = band


def yellowest(px, clear, palette):
    """The loincloth: the most common yellow in the frame."""
    c = Counter()
    for x in range(SIZE):
        for y in range(SIZE):
            i = px[x, y]
            if i == clear:
                continue
            r, g, b = palette[i * 3:i * 3 + 3]
            if r > 150 and g > 150 and b < 110:
                c[i] += 1
    return c.most_common(1)[0][0] if c else None


def female(frame, base, f, clear, palette):
    fr = frame.copy()
    px = fr.load()
    r = rows(px, clear)
    if not any(r):
        return fr
    top = next(y for y in range(SIZE) if r[y])
    facing = 'nsweo'[f // 2]
    if base == 6:
        band = yellowest(px, clear, palette)
        if band is not None:
            add_wrap(px, clear, r, top, band, facing)
        return fr
    hair = common(px, clear, (0, top, SIZE, top + 3))
    add_hair(px, clear, r, facing, hair)
    add_skirt(px, clear, rows(px, clear), top)
    return fr


def main():
    src, out = sys.argv[1], sys.argv[2]
    im = Image.open(src)
    assert im.mode == 'P', im.mode
    clear = im.info.get('transparency')
    assert isinstance(clear, int), 'expected a transparent palette index'
    images = im.width // (SIZE * 8)
    assert images >= KEEP and im.height == SIZE, (im.size,)
    sheet = Image.new('P', ((KEEP + len(BASES)) * 8 * SIZE, SIZE), clear)
    sheet.putpalette(im.getpalette())
    sheet.paste(im.crop((0, 0, KEEP * 8 * SIZE, SIZE)), (0, 0))
    for i, base in enumerate(BASES):
        for f, frame in enumerate(frames_of(im, base)):
            sheet.paste(female(frame, base, f, clear, im.getpalette()), (((KEEP + i) * 8 + f) * SIZE, 0))
    sheet.save(out, transparency=clear)
    print('wrote', out, sheet.size)
    if len(sys.argv) > 3:
        # Each race, then its female look, six times as big, on magenta.
        prev = Image.new('RGBA', (8 * SIZE * 6, 2 * len(BASES) * SIZE * 6), (255, 0, 255, 255))
        sheet.info['transparency'] = clear
        rgba = sheet.convert('RGBA')
        for row, image in enumerate(x for b, i in zip(BASES, range(len(BASES))) for x in (b, KEEP + i)):
            for f in range(8):
                fr = rgba.crop(((image * 8 + f) * SIZE, 0, (image * 8 + f + 1) * SIZE, SIZE)).resize((SIZE * 6, SIZE * 6), Image.NEAREST)
                prev.paste(fr, (f * SIZE * 6, row * SIZE * 6), fr)
        prev.save(sys.argv[3])


if __name__ == '__main__':
    main()
