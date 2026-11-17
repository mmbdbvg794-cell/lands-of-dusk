# Rubble mobs were the old way to mine (kill rubble, maybe get bronze ore). Take every
# rubble spawn out of the mobs file and put an ore vein prop on each square that had
# one (one per square, skipping squares that already have a prop): mostly bronze and
# iron, some coal, a little mithril, chosen from the square so a rerun gives the same.
# The rubble definition (defMobs/rubble) is moved into the backup so it can't be placed.
#
# Run on duskserver: python3 rubble_to_veins.py [--apply]
# mobs and props are read at start-up: restart after --apply, no god "<s" in between.
import os, shutil, sys, time, zlib

os.chdir(os.path.expanduser('~/DuskRPG'))
apply = '--apply' in sys.argv
MIX = [('bronze vein', 45), ('iron vein', 30), ('coal seam', 17), ('mithril vein', 8)]

def vein(x, y):
    r = zlib.crc32(b'%d,%d' % (x, y)) % 100
    for name, share in MIX:
        if r < share:
            return name
        r -= share

mobs = open('mobs').read().split('\n')
keep, squares = [], []
i = 0
while i < len(mobs):
    if i + 3 < len(mobs) and mobs[i] == 'rubble':
        sq = (int(mobs[i + 2]), int(mobs[i + 3]))
        if sq not in squares:
            squares.append(sq)
        i += 4
    else:
        keep.append(mobs[i])
        i += 1
props = open('props').read().split('\n')
taken = {(props[j + 1], props[j + 2]) for j in range(0, len(props) - 2, 3)}
add, counts = [], {}
for x, y in squares:
    if (str(x), str(y)) in taken:
        continue
    v = vein(x, y)
    counts[v] = counts.get(v, 0) + 1
    add += [v, str(x), str(y)]
for v, _ in MIX:
    assert os.path.exists('defProps/' + v), v
print('rubble spawns removed: %d (on %d squares)' % ((len(mobs) - len(keep)) // 4, len(squares)))
print('veins added: %d %s' % (len(add) // 3, counts))
if not apply:
    sys.exit('dry run; --apply to write')
d = 'backups/rubble-to-veins-%s' % time.strftime('%Y%m%d-%H%M%S')
os.makedirs(d)
for f in ('mobs', 'props', 'defMobs/rubble'):
    shutil.copy2(f, d)
# props ends with an empty line after the last record: insert before it
end = len(props)
while end and props[end - 1] == '':
    end -= 1
open('mobs.new', 'w').write('\n'.join(keep))
open('props.new', 'w').write('\n'.join(props[:end] + add + props[end:]))
os.replace('mobs.new', 'mobs')
os.replace('props.new', 'props')
os.remove('defMobs/rubble')
print('written; backup', d, '- restart the server now')
