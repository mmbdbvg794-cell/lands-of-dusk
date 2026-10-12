"""
The closed-beta gate's key store and settings, shared by dusk_bridge.py
(which enforces it) and tools/betakey (which manages keys).

Everything lives in one directory outside both web roots, by default
~/dusk-beta (DUSK_BETA_DIR overrides it, for testing):

  beta.conf        the switch and settings, read again whenever it changes:
                     BETA_GATE=off        on: a key is needed; off: as before
                     MAX_PLAYERS=25       browser players at once (0: no cap)
                     KEY_REQUEST_URL=     the "Need a key?" link on the login
  betakeys.sqlite  keys, the browser tokens they gave out, who is on now,
                   and the busiest moment of each day

Keys look like K7QM-4XWD-9TPB-2HNR: 16 characters from an alphabet without
0/O, 1/I/L. Only a SHA-256 of each is kept (and its last group, to tell
them apart), so the full key is shown once, when it's made. A key accepted
by the bridge gives the browser a token (also kept only as a hash) that it
sends instead on later visits; revoking the key stops its tokens too.

A single-use key can be accepted once (one browser then keeps its token);
an unlimited one any number of times.

Part of the browser client project (dusk-browser-client/server).
"""

import hashlib
import os
import secrets
import sqlite3
import time

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L
DIR = os.environ.get("DUSK_BETA_DIR") or os.path.expanduser("~/dusk-beta")
CONF = os.path.join(DIR, "beta.conf")
DB = os.path.join(DIR, "betakeys.sqlite")
DEFAULTS = {"BETA_GATE": "off", "MAX_PLAYERS": "25", "KEY_REQUEST_URL": ""}
CONF_TEXT = """# The closed-beta gate (dusk_bridge.py reads this again within seconds of a change).
# BETA_GATE=on needs a beta key to play in the browser; off is open, as before.
BETA_GATE=off
# Browser players at once; 0 for no cap.
MAX_PLAYERS=25
# Where the login's "Closed beta. Need a key?" link goes (empty: no link).
KEY_REQUEST_URL=
"""


def ensure_dir():
    os.makedirs(DIR, mode=0o700, exist_ok=True)
    if not os.path.exists(CONF):
        with open(CONF, "w") as f:
            f.write(CONF_TEXT)


class Settings:
    """beta.conf, read again when it changes."""

    def __init__(self):
        self.stamp = None
        self.values = dict(DEFAULTS)

    def get(self):
        try:
            stamp = os.stat(CONF).st_mtime_ns
        except OSError:
            stamp = 0
        if stamp != self.stamp:
            values = dict(DEFAULTS)
            try:
                with open(CONF) as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            values[k.strip().upper()] = v.strip()
            except OSError:
                pass
            self.values, self.stamp = values, stamp
        return self.values

    @property
    def gate_on(self):
        return self.get().get("BETA_GATE", "off").lower() in ("on", "1", "yes", "true")

    @property
    def max_players(self):
        try:
            return max(0, int(self.get().get("MAX_PLAYERS", "25")))
        except ValueError:
            return 25

    @property
    def key_url(self):
        url = self.get().get("KEY_REQUEST_URL", "")
        return url if url.startswith(("https://", "http://", "mailto:")) else ""


def normalize(key):
    """A typed key as stored: upper case, only alphabet characters (so
    dashes, spaces and lower case don't matter)."""
    return "".join(c for c in (key or "").upper() if c in ALPHABET)


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def new_key():
    raw = "".join(secrets.choice(ALPHABET) for _ in range(16))
    return "-".join(raw[i:i + 4] for i in range(0, 16, 4))


def today():
    return time.strftime("%Y-%m-%d")


def now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def connect():
    ensure_dir()
    db = sqlite3.connect(DB, timeout=10, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS keys (
            id INTEGER PRIMARY KEY,
            hash TEXT UNIQUE NOT NULL,
            tail TEXT NOT NULL,
            label TEXT NOT NULL,
            created TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            uses_left INTEGER,
            last_used TEXT,
            characters TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS tokens (
            hash TEXT PRIMARY KEY,
            key_id INTEGER NOT NULL,
            created TEXT NOT NULL,
            last_used TEXT
        );
        CREATE TABLE IF NOT EXISTS online (
            session TEXT PRIMARY KEY,
            key_id INTEGER,
            character TEXT,
            address TEXT,
            since TEXT
        );
        CREATE TABLE IF NOT EXISTS peaks (
            day TEXT PRIMARY KEY,
            peak INTEGER NOT NULL
        );
    """)
    return db


def create(db, label, single_use=False):
    key = new_key()
    norm = normalize(key)
    db.execute("INSERT INTO keys (hash, tail, label, created, uses_left) VALUES (?, ?, ?, ?, ?)",
               (digest(norm), norm[-4:], label, now(), 1 if single_use else None))
    return key


def find(db, key_or_label):
    """Keys matching a full key, its last group, or a label (any case)."""
    norm = normalize(key_or_label)
    if len(norm) == 16:
        rows = db.execute("SELECT * FROM keys WHERE hash = ?", (digest(norm),)).fetchall()
        if rows:
            return rows
    rows = db.execute("SELECT * FROM keys WHERE lower(label) = lower(?)", (key_or_label.strip(),)).fetchall()
    if rows:
        return rows
    if len(norm) == 4:
        return db.execute("SELECT * FROM keys WHERE tail = ?", (norm,)).fetchall()
    return []


def redeem(db, key):
    """A typed key -> (key row, token) or (None, reason): 'invalid',
    'revoked' or 'used' (a single-use key accepted before)."""
    norm = normalize(key)
    if len(norm) != 16:
        return None, "invalid"
    row = db.execute("SELECT * FROM keys WHERE hash = ?", (digest(norm),)).fetchone()
    if row is None:
        return None, "invalid"
    if row["status"] != "active":
        return None, "revoked"
    if row["uses_left"] is not None and row["uses_left"] <= 0:
        return None, "used"
    token = secrets.token_urlsafe(32)
    db.execute("BEGIN IMMEDIATE")
    try:
        if row["uses_left"] is not None:
            cur = db.execute("UPDATE keys SET uses_left = uses_left - 1 WHERE id = ? AND uses_left > 0", (row["id"],))
            if cur.rowcount == 0:
                db.execute("ROLLBACK")
                return None, "used"
        db.execute("INSERT INTO tokens (hash, key_id, created, last_used) VALUES (?, ?, ?, ?)",
                   (digest(token), row["id"], now(), now()))
        db.execute("UPDATE keys SET last_used = ? WHERE id = ?", (now(), row["id"]))
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    return row, token


def check_token(db, token):
    """A browser's token -> (key row, None) or (None, 'invalid'/'revoked')."""
    if not token or len(token) > 100:
        return None, "invalid"
    row = db.execute("SELECT k.* FROM tokens t JOIN keys k ON k.id = t.key_id WHERE t.hash = ?",
                     (digest(token),)).fetchone()
    if row is None:
        return None, "invalid"
    if row["status"] != "active":
        return None, "revoked"
    db.execute("UPDATE tokens SET last_used = ? WHERE hash = ?", (now(), digest(token)))
    db.execute("UPDATE keys SET last_used = ? WHERE id = ?", (now(), row["id"]))
    return row, None


def active(db, key_id):
    row = db.execute("SELECT status FROM keys WHERE id = ?", (key_id,)).fetchone()
    return row is not None and row["status"] == "active"


def note_character(db, key_id, character):
    """Remembers which characters played on a key (for list)."""
    if not key_id or not character:
        return
    row = db.execute("SELECT characters FROM keys WHERE id = ?", (key_id,)).fetchone()
    if row is None:
        return
    names = [n for n in row["characters"].split(",") if n]
    if character.lower() not in (n.lower() for n in names):
        names.append(character)
        db.execute("UPDATE keys SET characters = ? WHERE id = ?", (",".join(names[-20:]), key_id))


def set_online(db, session, key_id, character, address):
    db.execute("INSERT OR REPLACE INTO online (session, key_id, character, address, since) VALUES (?, ?, ?, ?, ?)",
               (session, key_id, character, address, now()))
    count = db.execute("SELECT COUNT(*) FROM online").fetchone()[0]
    db.execute("INSERT INTO peaks (day, peak) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET peak = max(peak, excluded.peak)",
               (today(), count))


def set_offline(db, session):
    db.execute("DELETE FROM online WHERE session = ?", (session,))
