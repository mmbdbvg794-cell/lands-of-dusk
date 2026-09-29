#!/usr/bin/env python3
"""Builds js/spellinfo.json for the spellbook from the server's spell files.

    python3 tools/spellinfo.py /home/flan/DuskRPG > js/spellinfo.json

How the server casts (LivingThing.castSpell):
  defSpells/<spell>          first line: the spell's group
  defSpellGroups/<group>     the group's spells, in order
  defSpellGroups/<n> <group> the script for the group's n-th spell (from 0)
You need a group skill of at least n * 100 / (spells in the group), and a
cast costs (110 - (your skill - that)) / 2 MP.

For each spell this records its group, position, the skill it needs, the
description from the script's first "#Name: text" line, and the chat
lines the script sends to the caster and the target, which the client uses
to tell that a spell landed.
"""
import json
import os
import re
import sys

CHAT = re.compile(r'^\s*chat\s+(caster|trigger|target)\s+(.*)$')


def read(path):
    try:
        with open(path, encoding="latin-1") as f:
            return f.read().splitlines()
    except OSError:
        return None


def literal_text(expr):
    """The fixed parts of a chat expression. `concat concat "a " name target "b"`
    gives "a {name} b"."""
    parts = re.findall(r'"([^"]*)"|\b(name)\s+\w+', expr)
    out = "".join(p[0] if p[0] or not p[1] else "{name}" for p in parts)
    return out.strip()


def main(root):
    spells_dir = os.path.join(root, "defSpells")
    groups_dir = os.path.join(root, "defSpellGroups")
    info = {}
    for spell in sorted(os.listdir(spells_dir)):
        if spell.endswith(".dsko"):
            continue
        lines = read(os.path.join(spells_dir, spell))
        if not lines:
            continue
        group = lines[0].strip()
        members = [l.strip() for l in (read(os.path.join(groups_dir, group)) or []) if l.strip()]
        if spell not in members:
            continue
        n = members.index(spell)
        script = read(os.path.join(groups_dir, f"{n} {group}")) or []
        desc = ""
        if script and script[0].startswith("#"):
            m = re.match(r"#\s*[^:]*:\s*(.*)", script[0])
            desc = (m.group(1) if m else script[0][1:]).strip()
        caster, target = [], []
        for line in script:
            m = CHAT.match(line)
            if not m:
                continue
            text = literal_text(m.group(2))
            if not text:
                continue
            (target if m.group(1) == "target" else caster).append(text)
        info[spell] = {
            "group": group,
            "order": n,
            "needs": n * 100 // len(members),
            "description": desc,
            "caster": sorted(set(caster)),
            "target": sorted(set(target)),
        }
    json.dump(info, sys.stdout, indent=1, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
