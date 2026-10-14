#!/usr/bin/env python3
"""Schools, phase 1: the spell groups become schools, and every spell gets
its own unlock (the tier's group points) and MP cost. Data only.

    python3 schools_phase1.py <game dir> [--apply] [--players]

Needs server/SpellGroup.java, SpellPatch.java and Skills.spellUnlock (built
and installed) for the "unlock" lines to count; without them the old
100 * place / (spells - 1) stands.

  groups     arcane group, divine group, nature group, forbidden group,
             open group (see SCHOOLS). Each spell's script is copied to its
             new place ("<n> <group>"); the old groups and scripts go to the
             backup. Guardian Force is left alone. herbology and translate
             go too (the Alchemy crafting skill brews the same potions), and
             the alchemy group with them. Drow comes with its spells in
             phase 4.
  spells     defSpells/<spell>: the new group, "mp <n>", "unlock <n>".
             counter poison becomes cure poison (the script, which still
             prints "disabled", is fixed in phase 4). create food and create
             drink come back from backups/spell-cleanup-20261013-204130,
             and now make a "conjured sandwich" / "conjured ale" (cost 0, so
             merchants won't buy them; their own use scripts, since the
             sandwich's and ale's remove a "sandwich" / "ale" by name).
  scripts    mend, healing staff, meditation read their new group and
             unlock; scan lists the new groups.
  trainers   merchants: train:<old group> becomes train:<new group> (once
             per trainer).
  classes    the classes file names the new groups (core, barred, open,
             start). Who may learn what is phase 2.
  --players  users/*: points in old groups become points in the new one
             (the most of the groups that feed it), old lines out.

Everything changed or taken out is copied to backups/schools-p1-<time>/.
Running it again changes nothing.
"""
import os
import re
import shutil
import sys
import time

TIER = {1: 0, 2: 10, 3: 25, 4: 50, 5: 75}
# school: [(spell, tier, mp)], in order (the order only names the scripts).
SCHOOLS = {
    "arcane group": [
        ("bone shards", 1, 5), ("detect invis", 1, 4), ("summon snakes", 1, 6),
        ("curse", 2, 9), ("invis", 2, 10), ("reflect", 2, 10), ("scan", 2, 10),
        ("summon bahamut", 2, 14), ("tire", 2, 12),
        ("quake", 3, 26), ("regenerate", 3, 22), ("summon wurm", 3, 28),
        ("summon leviathan", 4, 50), ("summon ultima bahamut", 5, 90)],
    "forbidden group": [("apocalypse", 5, 90), ("corrupt", 5, 80), ("hell fire", 5, 75)],
    "divine group": [
        ("create drink", 1, 4), ("create food", 1, 4), ("focus", 1, 5), ("mend", 1, 5),
        ("angel strike", 2, 12), ("armor", 2, 10), ("bless", 2, 12), ("cure poison", 2, 8),
        ("prayer", 2, 10), ("meditation", 3, 24), ("holy", 5, 70)],
    "nature group": [("quarter staff", 1, 5), ("healing staff", 2, 8), ("thorns", 3, 20), ("camoflauge", 4, 38)],
    "open group": [("warp", 1, 6)],
}
OLD = ["clerical group", "white magic group", "black magic group", "druidic group", "enchantment group",
       "telepathy group", "summons group", "hells fire", "m group", "alchemy group"]
# Where each new school's points come from (for players and trainers).
FEEDS = {
    "arcane group": ["black magic group", "enchantment group", "summons group", "m group", "telepathy group"],
    "divine group": ["clerical group", "white magic group"],
    "nature group": ["druidic group"],
    "forbidden group": ["hells fire"],
    "open group": ["alchemy group"],
}
CONJURED = {"sandwich": ("create food", "a conjured sandwich; worth nothing to merchants"),
            "ale": ("create drink", "some conjured ale; worth nothing to merchants")}
RENAME = {"cure poison": "counter poison"}  # new name: old name
CLEANUP = "backups/spell-cleanup-20261013-204130"
RESTORE = {"create drink": "4 clerical group", "create food": "5 clerical group"}  # from CLEANUP
# Script edits: (script's new home spell, old text, new text)
EDITS = [
    ("mend", 'caster skill "clerical group" 50', 'caster skill "divine group" 50'),
    ("healing staff", '- caster skill "druidic group" 33 50', '- caster skill "nature group" 10 50'),
    ("meditation", '- caster skill "white magic group" 60 50', '- caster skill "divine group" 25 50'),
]
SCAN_GROUPS = ["arcane group", "divine group", "nature group", "forbidden group", "open group", "drow group"]

changes = []  # (relative path, old text or None, new text or None)


def read(game, rel):
    p = os.path.join(game, rel)
    if not os.path.exists(p):
        return None
    with open(p, encoding="latin-1", newline="") as f:
        return f.read()


def plan(game, rel, new):
    old = read(game, rel)
    changes[:] = [c for c in changes if c[0] != rel]  # the latest plan wins
    if old != new:
        changes.append((rel, old, new))


def gone(game, rel):
    if read(game, rel) is not None and not any(r == rel for r, _, _ in changes):
        changes.append((rel, read(game, rel), None))


def listed(game, group):
    t = read(game, f"defSpellGroups/{group}")
    return [l.strip() for l in t.splitlines() if l.strip()] if t is not None else None


def scan_script(text):
    """The scan script with the new schools in place of the old groups."""
    lines = text.split("\n")
    out, skip = [], False
    for i, l in enumerate(lines):
        s = l.strip()
        if re.match(r'number \w+ target skill ".* group"', s) or s.startswith('number alchemy target skill'):
            if not any(o.startswith("number arcane") for o in out):
                for g in SCAN_GROUPS:
                    out.append(f'number {g.split()[0]} target skill "{g}"')
            continue
        if re.match(r'if < 0 (clerical|druidic|enchantment|telepathy|black|white|alchemy|summons)$', s):
            skip = 2
            if not any(o.startswith("if < 0 arcane") for o in out):
                for g in SCAN_GROUPS:
                    v = g.split()[0]
                    out += [f"if < 0 {v}", f'\tchat caster concat "{g}: " {v}', "end"]
            continue
        if skip:
            skip -= 1
            continue
        out.append(l)
    return "\n".join(out)


def schools(game):
    old_lists = {g: listed(game, g) for g in OLD}
    if old_lists["clerical group"] is None:
        # Already done: the old groups are gone. Only check it's all in place.
        for g, spells in SCHOOLS.items():
            # (phase 4 adds spells after these)
            if listed(game, g)[:len(spells)] != [s for s, _, _ in spells]:
                raise SystemExit(f"{g}: not as expected; nothing done")
        return
    where = {}  # spell -> its script's text now
    for g, l in old_lists.items():
        for i, s in enumerate(l or []):
            where[s] = read(game, f"defSpellGroups/{i} {g}")
    for s, script in RESTORE.items():
        where[s] = read(game, f"{CLEANUP}/defSpellGroups/{script}")
    for new, old in RENAME.items():
        where[new] = where.pop(old)
    for g, spells in SCHOOLS.items():
        plan(game, f"defSpellGroups/{g}", "\n".join(s for s, _, _ in spells) + "\n")
        for i, (s, tier, mp) in enumerate(spells):
            text = where.get(s)
            if text is None:
                raise SystemExit(f"no script found for {s}; nothing done")
            for spell, a, b in EDITS:
                if spell == s:
                    if a not in text:
                        raise SystemExit(f"{s}: expected {a!r} in its script; nothing done")
                    text = text.replace(a, b)
            if s == "scan":
                text = scan_script(text)
            plan(game, f"defSpellGroups/{i} {g}", text)
            plan(game, f"defSpells/{s}", f"{g}\nmp {mp}\nunlock {TIER[tier]}\n")
    for new, old in RENAME.items():
        gone(game, f"defSpells/{old}")
    gone(game, "defSpells/translate")
    for g, l in old_lists.items():
        for i in range(len(l or [])):
            gone(game, f"defSpellGroups/{i} {g}")
        gone(game, f"defSpellGroups/{g}")


def herbology(game):
    """The spell and its group go (the Alchemy crafting skill brews the same
    potions); also on a game where phase 1 ran before this was decided."""
    gone(game, "defSpells/herbology")
    if listed(game, "alchemy group") is not None:
        for i in range(len(listed(game, "alchemy group"))):
            gone(game, f"defSpellGroups/{i} alchemy group")
        gone(game, "defSpellGroups/alchemy group")


def conjured(game):
    for item, (spell, desc) in CONJURED.items():
        new = f"conjured {item}"
        base = read(game, f"defItems/{item}").replace("\r\n", "\n").split("\n")
        lines, i = [], 0
        while i < len(base):
            k = base[i]
            if k in ("description", "cost", "onuse") and i + 1 < len(base):
                v = {"description": desc, "cost": "0", "onuse": new}[k]
                lines += [k, v]
                i += 2
                continue
            lines.append(k)
            i += 1
        plan(game, f"defItems/{new}", "\n".join(lines))
        use = read(game, f"scripts/{item}").replace("\r\n", "\n")
        plan(game, f"scripts/{new}", use.replace(f"removeitem trigger {item}\n", f'removeitem trigger "{new}"\n'))
        for g, spells in SCHOOLS.items():
            for i, (s, _, _) in enumerate(spells):
                if s == spell:
                    rel = f"defSpellGroups/{i} {g}"
                    text = next((t for r, _, t in changes if r == rel and t), None) or read(game, rel)
                    if text and f'giveitem caster "{item}"' in text:
                        plan(game, rel, text.replace(f'giveitem caster "{item}"', f'giveitem caster "{new}"'))


def touchups(game):
    """Texts that named the old groups, in the scripts' new homes."""
    for g, spells in SCHOOLS.items():
        for i, (s, _, _) in enumerate(spells):
            if s == "mend":
                rel = f"defSpellGroups/{i} {g}"
                text = read(game, rel)
                if text and "more with clerical skill." in text:
                    plan(game, rel, text.replace("more with clerical skill.", "more with divine skill."))


def trainers(game):
    text = read(game, "merchants")
    nl = "\r\n" if "\r\n" in text else "\n"
    to = {old: new for new, olds in FEEDS.items() for old in olds}
    out, seen = [], set()
    for line in text.split(nl):
        if line == "end":
            seen = set()
        if line.startswith("train:"):
            g = line[6:]
            if g in FEEDS:  # already a school
                if g in seen:
                    continue
                seen.add(g)
            elif g in to:
                line = "train:" + to[g]
                if to[g] in seen:
                    continue
                seen.add(to[g])
        out.append(line)
    plan(game, "merchants", nl.join(out))


def classes(game):
    """core/barred/start lines: old groups become their school. open lines:
    telepathy and m group go (their spells are Arcane now), alchemy group
    becomes open group."""
    to = {old: new for new, olds in FEEDS.items() for old in olds}
    out = []
    for line in read(game, "classes").split("\n"):
        w = line.split(" ", 2)
        if w[0] in ("core", "barred", "open") and len(w) > 1:
            head, rest = (w[0], line[5:]) if w[0] == "open" else (w[0] + " " + w[1], w[2] if len(w) > 2 else "")
            items = []
            for it in (x.strip() for x in rest.split(",")):
                if w[0] == "open" and it in ("telepathy group", "m group"):
                    continue
                items.append(to.get(it, it))
            items = [x for i, x in enumerate(items) if x and x not in items[:i]]
            line = f"{head} {', '.join(items)}"
        elif w[0] == "start":
            for old, new in to.items():
                line = line.replace(f", {old} ", f", {new} ")
        out.append(line)
    plan(game, "classes", "\n".join(out))


def online(game):
    """Who's in the game (who.json): their files are skipped, since the
    server writes its own copy back when they log out or it restarts."""
    import json
    try:
        return {p["name"].lower() for p in json.load(open(os.path.join(game, "who.json")))["players"]}
    except Exception:
        return set()


def players(game):
    here = online(game)
    for u in sorted(os.listdir(os.path.join(game, "users"))):
        if u.split(".")[0].lower() in here:
            print(f"skip  users/{u} (online: run again once they're out)")
            continue
        rel = f"users/{u}"
        ls = read(game, rel).split("\n")
        points, out, i, changed = {}, [], 0, False
        while i < len(ls):
            if ls[i] == "spell" and i + 2 < len(ls) and ls[i + 1] in FEEDS:
                points[ls[i + 1]] = max(points.get(ls[i + 1], 0), int(ls[i + 2]))
                i += 3
                continue
            if ls[i] == "spell" and i + 2 < len(ls) and ls[i + 1] in sum(FEEDS.values(), []):
                changed = True
                old, n = ls[i + 1], int(ls[i + 2])
                for new, olds in FEEDS.items():
                    if old in olds:
                        points[new] = max(points.get(new, 0), n)
                i += 3
                continue
            out.append(ls[i])
            i += 1
        if not points or not changed:
            continue
        end = len(out) - 1 - out[::-1].index(".")
        add = []
        for new, n in points.items():
            add += ["spell", new, str(n)]
        plan(game, rel, "\n".join(out[:end] + add + out[end:]))


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    game, apply = sys.argv[1], "--apply" in sys.argv
    schools(game)
    if not changes:
        touchups(game)
    herbology(game)
    conjured(game)
    trainers(game)
    classes(game)
    if "--players" in sys.argv:
        players(game)
    for rel, old, new in changes:
        if new is None:
            print(f"out   {rel}")
        elif old is None:
            print(f"new   {rel}")
        else:
            print(f"edit  {rel}")
    print(len(changes), "changes")
    if not apply or not changes:
        return
    backup = os.path.join(game, "backups", "schools-p1-" + time.strftime("%Y%m%d-%H%M%S"))
    for rel, old, new in changes:
        p, dest = os.path.join(game, rel), os.path.join(backup, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if old is not None:
            shutil.copy2(p, dest)
        if os.path.exists(p + ".dsko"):
            shutil.move(p + ".dsko", dest + ".dsko")
        if new is None:
            os.remove(p)
            continue
        with open(p, "w", encoding="latin-1", newline="") as f:
            f.write(new)
    print("done; old files in", backup)


if __name__ == "__main__":
    main()
