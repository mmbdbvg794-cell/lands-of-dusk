#!/usr/bin/env python3
"""Existing characters whose names hold a word from conf/badwords, matched
as server/Words.java matches new names (any listed word, anywhere in the
name, look-alikes and repeated letters undone). Read-only: it only lists.

    ssh duskserver 'python3 - /home/flan/DuskRPG' < tools/server/badword_names.py
"""
import os
import re
import sys
import unicodedata

G = sys.argv[1]
LEET = str.maketrans("01!|34@5$7+89", "oiiieaassttbg")
words = []
with open(os.path.join(G, "conf", "badwords"), encoding="utf-8", errors="replace") as f:
    for line in f:
        line = line.strip().lower()
        if line and not line.startswith("#"):
            word = re.sub(r"[^a-z]", "", line)
            if word:
                words.append((word, re.compile("".join(c + "+" for c in word))))


def forms(name):
    plain = "".join(c for c in unicodedata.normalize("NFD", name.lower()) if unicodedata.category(c) != "Mn")
    return (re.sub(r"[^a-z]", "", plain.translate(LEET)), re.sub(r"[^a-z]", "", plain))


users = os.path.join(G, "users")
hits = []
for name in sorted(os.listdir(users)):
    if "." in name:
        continue
    found = sorted({w for w, p in words for form in forms(name) if p.search(form)})
    if found:
        hits.append(f"{name}: {', '.join(found)}")
print(f"{len(words)} listed words; {len(hits)} of the existing names match" + (":" if hits else "."))
for h in hits:
    print("  " + h)
