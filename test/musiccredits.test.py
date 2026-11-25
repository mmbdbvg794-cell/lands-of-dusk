# Run with: python3 test/musiccredits.test.py
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
from music_credits import merged  # noqa: E402

people = [{"name": "A"}, {"name": "B"}]
art = [{"kind": "section", "name": "Art"}, {"name": "Q"}]
old = [{"name": "m1", "from": "music"}, {"name": "m2", "from": "music"}]
new = [{"name": "n1", "from": "music"}]
assert merged(people + old + art, new) == people + new + art, "music stays where it was"
assert merged(people + art, new) == people + art + new, "no music before: at the end"
assert merged(old + people, []) == people, "all tracks gone"
assert merged(people + old, new) == people + new
print("ok - music credits")
