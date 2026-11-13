# Kingshaven: the Wayfarer's Rest's door was in its south wall (1471,348), right
# against the barracks' north wall (y 349), so the inn couldn't be entered. Move
# the door to the north wall (1471,340), onto the street, wall up the old one,
# and move the inn's sign from the barracks wall (1472,349) to the street
# (1472,339). Matches tools/world/cities/capital.mjs (inn door ['n', 9]).
#
# Run on duskserver: python3 fix_wayfarer_door.py [--apply]
# The map and signs are read at start-up: restart after --apply, and no god
# "save" in between.
import os, shutil, struct, sys, time

os.chdir(os.path.expanduser('~/DuskRPG'))
apply = '--apply' in sys.argv
WALL, DOOR = 62, 23  # wooden wall, door in a north/south wall
TILES = [(1471, 340, WALL, DOOR), (1471, 348, DOOR, WALL)]  # x, y, expected now, new

data = bytearray(open('shortmap', 'rb').read())
cols, rows = struct.unpack('>ii', data[:8])
for x, y, old, new in TILES:
    at = 8 + (x * rows + y) * 2
    now = struct.unpack('>H', data[at:at + 2])[0]
    if now == new:
        print('%d,%d already %d' % (x, y, new))
        continue
    if now != old:
        sys.exit('%d,%d is %d, expected %d: not touching it' % (x, y, now, old))
    data[at:at + 2] = struct.pack('>H', new)
    print('%d,%d: %d -> %d' % (x, y, old, new))

lines = open('signs').read().split('\n')
for i in range(len(lines) - 2):
    if lines[i] == "The Wayfarer's Rest":
        if (lines[i + 1], lines[i + 2]) == ('1472', '349'):
            lines[i + 2] = '339'
            print('sign: 1472,349 -> 1472,339')
        else:
            print('sign at %s,%s, left alone' % (lines[i + 1], lines[i + 2]))
        break
else:
    sys.exit('no Wayfarer\'s Rest sign found')

if apply:
    d = 'backups/wayfarer-door-%s' % time.strftime('%Y%m%d-%H%M%S')
    os.makedirs(d)
    shutil.copy2('shortmap', d)
    shutil.copy2('signs', d)
    open('shortmap.new', 'wb').write(data)
    os.replace('shortmap.new', 'shortmap')
    open('signs', 'w').write('\n'.join(lines))
    print('written; backup', d, '- restart the server now')
else:
    print('dry run; --apply to write')
