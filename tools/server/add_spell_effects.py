#!/usr/bin/env python3
"""Adds web-client spell effect lines to spell scripts (see js/spells.js).

    python3 add_spell_effects.py fxkinds.json <dir with the scripts>

fxkinds.json maps a script's file name ("2 clerical group") to its
{ "spell", "kind", "code" } (code 1-6 as in FX_KINDS). Scripts are edited
in place, so run it on copies, check them with TestCompile, and only then
copy them over the live ones.

After each line that does the spell's work to someone, it adds
    playsound + <base> + * <who> locx 3000 <who> locy <who> locx <who> locy
where <who> is who the work was done to: "enemy caster" (a battle
opponent), "target" or "caster". Lines that only keep score (damdone,
exp, cash) don't count, and a run of work lines on the same person gets
one effect. Scripts that already have an effect line are left alone.
"""
import json
import os
import re
import sys

# A statement doing something to someone: the verb, then who, then what.
WORK = re.compile(r"\b(inc|set|addcondition|addconditionwithduration|removecondition)\s+(enemy\s+caster|target|caster)\s+(\S+)")
BOOKKEEPING = {"damdone", "exp", "cash", "cp"}
MARK = "#Web client spell effect"


def who_did(line):
    """Who a line does the spell's work to, preferring someone other than
    the caster when it touches several people, or None."""
    found = []
    for verb, who, what in WORK.findall(line):
        who = " ".join(who.split())
        if verb == "inc" and what in BOOKKEEPING:
            continue
        found.append(who)
    for pick in ("enemy caster", "target", "caster"):
        if pick in found:
            return pick
    return None


def fx_line(indent, code, kind, who):
    base = 100000000 + code * 10000000
    return [
        f"{indent}{MARK} ({kind}) for everyone nearby: see js/spells.js\n",
        f"{indent}playsound + {base} + * {who} locx 3000 {who} locy {who} locx {who} locy\n",
    ]


def add_effects(text, code, kind):
    lines = text.splitlines(keepends=True)
    out = []
    last_who = None  # who the current run of work lines was done to
    added = 0
    for line in lines:
        out.append(line if line.endswith("\n") else line + "\n")
        who = who_did(line)
        if who is None:
            # Anything else ends a run (chat lines don't, so a run can
            # read "do it, say so, do more").
            if not line.strip().startswith("chat"):
                last_who = None
            continue
        if who == last_who:
            continue
        indent = re.match(r"[ \t]*", line).group(0)
        out.extend(fx_line(indent, code, kind, who))
        last_who = who
        added += 1
    return "".join(out), added


def main(kinds_file, folder):
    kinds = json.load(open(kinds_file))
    for name, k in sorted(kinds.items()):
        path = os.path.join(folder, name)
        if not os.path.isfile(path):
            print(f"skip {name}: no such file")
            continue
        text = open(path, encoding="latin-1").read()
        if "playsound + 1" in text:
            print(f"skip {name}: already has an effect")
            continue
        new, added = add_effects(text, k["code"], k["kind"])
        if added:
            open(path, "w", encoding="latin-1").write(new)
        print(f"{name} ({k['spell']}, {k['kind']}): {added} effect line(s)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
