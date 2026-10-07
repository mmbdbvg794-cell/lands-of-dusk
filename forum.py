"""The Dusk forum: boards, topics and posts, kept in SQLite beside the game
(forum.sqlite in the game directory), with the game's own logins: a player
signs in with their character's name and password (checked against the
users file as the server does: SHA-256 of salt + password). Gods (privs 2
and up) moderate: pin, lock, move and delete; only they start topics in
Announcements.

serve.py hands every request under .../forum/api/ to Forum.handle. The page
is forum.html (js/forum.js). Writes need the X-Forum header (so another site
can't post with a player's cookie) and a signed-in player.

    GET  boards                         the board index
    GET  board/<id>?page=N              a board's topics (pinned first)
    GET  topic/<id>?page=N              a topic's posts, with their authors
    GET  me                             who's signed in
    POST login {name, password} | logout
    POST topic {board, title, body}     a new topic
    POST reply {topic, body}
    POST edit {post, body}              your own post (gods: any)
    POST delete {post}                  your own post (gods: any; a topic's
                                        first post takes the topic with it)
    POST mod {topic, action, board?}    gods: pin, unpin, lock, unlock, move
"""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
import time

TOPICS_PER_PAGE = 25
POSTS_PER_PAGE = 20
MAX_TITLE, MAX_BODY = 100, 8000
POST_GAP = 15  # seconds between posts (gods don't wait)
SESSION_DAYS = 30
LOCKOUT_TRIES, LOCKOUT_SECS = 5, 300
GOD = 2

BOARDS = [
    ("announcements", "Announcements", "News from the gods: updates, events and what's new in the world.", 1),
    ("general", "General Discussion", "Anything about Dusk.", 0),
    ("quests", "Quests & Lore", "Quest help, stories, maps and secrets of the world.", 0),
    ("trading", "Trading Post", "Buying, selling and swapping.", 0),
    ("help", "Help & Bug Reports", "Stuck, confused, or found something broken? Ask here.", 0),
    ("tavern", "The Tavern", "Off-topic: everything else.", 0),
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS boards (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, description TEXT, sort INTEGER, gods_only INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS topics (id INTEGER PRIMARY KEY, board_id INTEGER, title TEXT, author TEXT, created INTEGER,
    last_at INTEGER, last_by TEXT, replies INTEGER DEFAULT 0, pinned INTEGER DEFAULT 0, locked INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, topic_id INTEGER, author TEXT, body TEXT, created INTEGER, edited INTEGER);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, name TEXT, created INTEGER);
CREATE INDEX IF NOT EXISTS posts_topic ON posts (topic_id, id);
CREATE INDEX IF NOT EXISTS topics_board ON topics (board_id, pinned, last_at);
CREATE INDEX IF NOT EXISTS posts_author ON posts (author);
"""


class Forum:
    def __init__(self, game_dir):
        self.game = game_dir
        self.db_path = os.path.join(game_dir, "forum.sqlite")
        self.lock = threading.Lock()
        self.fails = {}  # name -> [count, until]
        self.last_post = {}  # name -> time
        with self.db() as db:
            db.executescript(SCHEMA)
            for i, (slug, title, desc, gods) in enumerate(BOARDS):
                db.execute("INSERT OR IGNORE INTO boards (slug, title, description, sort, gods_only) VALUES (?, ?, ?, ?, ?)", (slug, title, desc, i, gods))

    def db(self):
        db = sqlite3.connect(self.db_path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA journal_mode=WAL")
        return db

    # ---- the game's players ----

    def user_file(self, name):
        if not re.fullmatch(r"[A-Za-z0-9_ -]{1,30}", name or ""):
            return None
        users = os.path.join(self.game, "users")
        try:
            for f in os.listdir(users):
                if f.lower() == name.lower() and "." not in f:
                    return os.path.join(users, f)
        except OSError:
            pass
        return None

    def read_user(self, path):
        """{name, password, privs, race, title} from a users file."""
        out = {"name": os.path.basename(path), "password": "", "privs": 0, "race": "", "title": ""}
        try:
            with open(path, encoding="latin-1") as f:
                lines = f.read().split("\n")
        except OSError:
            return None
        if lines:
            out["password"] = lines[0].strip()
        for i in range(1, len(lines) - 1):
            k, v = lines[i].strip(), lines[i + 1].strip()
            if k == "privs" and v.lstrip("-").isdigit():
                out["privs"] = int(v)
            elif k == "race" and not out["race"]:
                out["race"] = v
            elif k == "title" and not out["title"]:
                out["title"] = "" if v == "null" else v
        return out

    def banned(self, name):
        try:
            with open(os.path.join(self.game, "conf", "banned"), encoding="latin-1") as f:
                return any(l.strip().lower() == name.lower() for l in f)
        except OSError:
            return False

    @staticmethod
    def check_password(given, stored):
        if stored.startswith("HASH$"):
            parts = stored[5:].split("$", 1)
            if len(parts) != 2:
                return False
            salt, want = parts
            return secrets.compare_digest(hashlib.sha256((salt + given).encode("utf-8")).hexdigest(), want)
        return bool(stored) and secrets.compare_digest(given, stored)

    # ---- requests ----

    def handle(self, method, path, query, body, cookies, headers):
        """-> (status, dict, extra headers)."""
        try:
            me = self.session(cookies.get("dusk_forum"))
            parts = [p for p in path.split("/") if p]
            if method == "GET":
                if parts == ["boards"]:
                    return 200, self.boards(), []
                if len(parts) == 2 and parts[0] == "board" and parts[1].isdigit():
                    return (*self.board(int(parts[1]), page(query)), [])
                if len(parts) == 2 and parts[0] == "topic" and parts[1].isdigit():
                    return (*self.topic(int(parts[1]), page(query)), [])
                if parts == ["me"]:
                    return 200, {"me": me}, []
                return 404, {"error": "No such page."}, []
            if method != "POST":
                return 405, {"error": "Not allowed."}, []
            if headers.get("X-Forum") != "1":
                return 403, {"error": "Missing header."}, []
            try:
                data = json.loads(body or b"{}")
            except ValueError:
                return 400, {"error": "That wasn't understood."}, []
            if parts == ["login"]:
                return self.login(str(data.get("name", "")).strip(), str(data.get("password", "")))
            if parts == ["logout"]:
                if cookies.get("dusk_forum"):
                    with self.db() as db:
                        db.execute("DELETE FROM sessions WHERE token = ?", (cookies["dusk_forum"],))
                return 200, {"ok": True}, [("Set-Cookie", "dusk_forum=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")]
            if not me:
                return 401, {"error": "Sign in with your character first."}, []
            if parts == ["topic"]:
                return (*self.new_topic(me, data), [])
            if parts == ["reply"]:
                return (*self.reply(me, data), [])
            if parts == ["edit"]:
                return (*self.edit(me, data), [])
            if parts == ["delete"]:
                return (*self.delete(me, data), [])
            if parts == ["mod"]:
                return (*self.mod(me, data), [])
            return 404, {"error": "No such action."}, []
        except Exception as e:  # never a stack trace to the browser
            print("forum error:", repr(e), flush=True)
            return 500, {"error": "Something went wrong."}, []

    def session(self, token):
        if not token:
            return None
        with self.db() as db:
            row = db.execute("SELECT name, created FROM sessions WHERE token = ?", (token,)).fetchone()
        if not row or time.time() - row["created"] > SESSION_DAYS * 86400:
            return None
        path = self.user_file(row["name"])
        u = self.read_user(path) if path else None
        if not u or self.banned(u["name"]):
            return None
        return {"name": u["name"], "privs": u["privs"], "god": u["privs"] >= GOD}

    def login(self, name, password):
        key = name.lower()
        now = time.time()
        with self.lock:
            f = self.fails.get(key)
            if f and f[1] > now:
                return 429, {"error": "Too many tries. Wait a few minutes."}, []
        path = self.user_file(name)
        u = self.read_user(path) if path else None
        if not u or not self.check_password(password, u["password"]):
            with self.lock:
                f = self.fails.setdefault(key, [0, 0])
                f[0] += 1
                if f[0] >= LOCKOUT_TRIES:
                    self.fails[key] = [0, now + LOCKOUT_SECS]
            return 401, {"error": "That name and password don't match a character."}, []
        if self.banned(u["name"]):
            return 403, {"error": "That character is banned."}, []
        with self.lock:
            self.fails.pop(key, None)
        token = secrets.token_urlsafe(32)
        with self.db() as db:
            db.execute("INSERT INTO sessions (token, name, created) VALUES (?, ?, ?)", (token, u["name"], int(now)))
            db.execute("DELETE FROM sessions WHERE created < ?", (int(now) - SESSION_DAYS * 86400,))
        cookie = f"dusk_forum={token}; Path=/; Max-Age={SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax"
        return 200, {"me": {"name": u["name"], "privs": u["privs"], "god": u["privs"] >= GOD}}, [("Set-Cookie", cookie)]

    # ---- reading ----

    def boards(self):
        with self.db() as db:
            rows = db.execute("""SELECT b.*, (SELECT COUNT(*) FROM topics t WHERE t.board_id = b.id) topics,
                (SELECT COUNT(*) FROM posts p JOIN topics t ON p.topic_id = t.id WHERE t.board_id = b.id) posts
                FROM boards b ORDER BY sort""").fetchall()
            out = []
            for b in rows:
                last = db.execute("SELECT id, title, last_at, last_by FROM topics WHERE board_id = ? ORDER BY last_at DESC LIMIT 1", (b["id"],)).fetchone()
                out.append({"id": b["id"], "title": b["title"], "description": b["description"], "godsOnly": bool(b["gods_only"]),
                            "topics": b["topics"], "posts": b["posts"], "last": dict(last) if last else None})
        return {"boards": out}

    def board(self, board_id, pg):
        with self.db() as db:
            b = db.execute("SELECT * FROM boards WHERE id = ?", (board_id,)).fetchone()
            if not b:
                return 404, {"error": "No such board."}
            total = db.execute("SELECT COUNT(*) FROM topics WHERE board_id = ?", (board_id,)).fetchone()[0]
            pages = max(1, -(-total // TOPICS_PER_PAGE))
            pg = min(pg, pages)
            rows = db.execute("SELECT * FROM topics WHERE board_id = ? ORDER BY pinned DESC, last_at DESC LIMIT ? OFFSET ?",
                              (board_id, TOPICS_PER_PAGE, (pg - 1) * TOPICS_PER_PAGE)).fetchall()
            boards = db.execute("SELECT id, title FROM boards ORDER BY sort").fetchall()
        return 200, {"board": {"id": b["id"], "title": b["title"], "description": b["description"], "godsOnly": bool(b["gods_only"])},
                     "topics": [dict(r) for r in rows], "page": pg, "pages": pages, "boards": [dict(r) for r in boards]}

    def topic(self, topic_id, pg):
        with self.db() as db:
            t = db.execute("SELECT t.*, b.title board_title FROM topics t JOIN boards b ON b.id = t.board_id WHERE t.id = ?", (topic_id,)).fetchone()
            if not t:
                return 404, {"error": "No such topic."}
            total = db.execute("SELECT COUNT(*) FROM posts WHERE topic_id = ?", (topic_id,)).fetchone()[0]
            pages = max(1, -(-total // POSTS_PER_PAGE))
            pg = min(pg, pages)
            rows = db.execute("SELECT * FROM posts WHERE topic_id = ? ORDER BY id LIMIT ? OFFSET ?",
                              (topic_id, POSTS_PER_PAGE, (pg - 1) * POSTS_PER_PAGE)).fetchall()
            first = db.execute("SELECT MIN(id) FROM posts WHERE topic_id = ?", (topic_id,)).fetchone()[0]
            authors = {}
            for r in rows:
                a = r["author"]
                if a in authors:
                    continue
                n = db.execute("SELECT COUNT(*) FROM posts WHERE author = ?", (a,)).fetchone()[0]
                path = self.user_file(a)
                u = self.read_user(path) if path else None
                authors[a] = {"posts": n, "race": (u or {}).get("race", ""), "title": (u or {}).get("title", ""), "god": bool(u and u["privs"] >= GOD)}
        return 200, {"topic": dict(t), "posts": [dict(r) | {"first": r["id"] == first} for r in rows], "page": pg, "pages": pages, "authors": authors}

    # ---- writing ----

    def wait(self, me):
        if me["god"]:
            return None
        now = time.time()
        with self.lock:
            last = self.last_post.get(me["name"].lower(), 0)
            if now - last < POST_GAP:
                return f"Wait {int(POST_GAP - (now - last)) + 1} more seconds before posting again."
            self.last_post[me["name"].lower()] = now
        return None

    @staticmethod
    def clean_body(data):
        body = str(data.get("body", "")).replace("\r", "").strip()
        if not body:
            return None, "Write something first."
        if len(body) > MAX_BODY:
            return None, f"That's too long ({MAX_BODY} characters at most)."
        return body, None

    def new_topic(self, me, data):
        title = re.sub(r"\s+", " ", str(data.get("title", ""))).strip()
        if not title:
            return 400, {"error": "Give the topic a title."}
        if len(title) > MAX_TITLE:
            return 400, {"error": f"The title is too long ({MAX_TITLE} characters at most)."}
        body, err = self.clean_body(data)
        if err:
            return 400, {"error": err}
        with self.db() as db:
            b = db.execute("SELECT * FROM boards WHERE id = ?", (int(data.get("board", 0) or 0),)).fetchone()
            if not b:
                return 404, {"error": "No such board."}
            if b["gods_only"] and not me["god"]:
                return 403, {"error": "Only the gods start topics here."}
        msg = self.wait(me)
        if msg:
            return 429, {"error": msg}
        now = int(time.time())
        with self.db() as db:
            cur = db.execute("INSERT INTO topics (board_id, title, author, created, last_at, last_by) VALUES (?, ?, ?, ?, ?, ?)", (b["id"], title, me["name"], now, now, me["name"]))
            tid = cur.lastrowid
            db.execute("INSERT INTO posts (topic_id, author, body, created) VALUES (?, ?, ?, ?)", (tid, me["name"], body, now))
        return 200, {"topic": tid}

    def reply(self, me, data):
        body, err = self.clean_body(data)
        if err:
            return 400, {"error": err}
        with self.db() as db:
            t = db.execute("SELECT * FROM topics WHERE id = ?", (int(data.get("topic", 0) or 0),)).fetchone()
            if not t:
                return 404, {"error": "No such topic."}
            if t["locked"] and not me["god"]:
                return 403, {"error": "This topic is locked."}
        msg = self.wait(me)
        if msg:
            return 429, {"error": msg}
        now = int(time.time())
        with self.db() as db:
            cur = db.execute("INSERT INTO posts (topic_id, author, body, created) VALUES (?, ?, ?, ?)", (t["id"], me["name"], body, now))
            db.execute("UPDATE topics SET replies = replies + 1, last_at = ?, last_by = ? WHERE id = ?", (now, me["name"], t["id"]))
            n = db.execute("SELECT COUNT(*) FROM posts WHERE topic_id = ?", (t["id"],)).fetchone()[0]
        return 200, {"post": cur.lastrowid, "page": max(1, -(-n // POSTS_PER_PAGE))}

    def own_post(self, me, post_id):
        with self.db() as db:
            p = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not p:
            return None, (404, {"error": "No such post."})
        if p["author"].lower() != me["name"].lower() and not me["god"]:
            return None, (403, {"error": "That isn't your post."})
        return p, None

    def edit(self, me, data):
        p, err = self.own_post(me, int(data.get("post", 0) or 0))
        if err:
            return err
        body, err = self.clean_body(data)
        if err:
            return 400, {"error": err}
        with self.db() as db:
            db.execute("UPDATE posts SET body = ?, edited = ? WHERE id = ?", (body, int(time.time()), p["id"]))
        return 200, {"ok": True}

    def delete(self, me, data):
        p, err = self.own_post(me, int(data.get("post", 0) or 0))
        if err:
            return err
        with self.db() as db:
            first = db.execute("SELECT MIN(id) FROM posts WHERE topic_id = ?", (p["topic_id"],)).fetchone()[0]
            if first == p["id"]:
                db.execute("DELETE FROM posts WHERE topic_id = ?", (p["topic_id"],))
                db.execute("DELETE FROM topics WHERE id = ?", (p["topic_id"],))
                return 200, {"topicGone": True}
            db.execute("DELETE FROM posts WHERE id = ?", (p["id"],))
            last = db.execute("SELECT author, created FROM posts WHERE topic_id = ? ORDER BY id DESC LIMIT 1", (p["topic_id"],)).fetchone()
            db.execute("UPDATE topics SET replies = MAX(0, replies - 1), last_at = ?, last_by = ? WHERE id = ?", (last["created"], last["author"], p["topic_id"]))
        return 200, {"ok": True}

    def mod(self, me, data):
        if not me["god"]:
            return 403, {"error": "Only the gods can do that."}
        tid = int(data.get("topic", 0) or 0)
        action = str(data.get("action", ""))
        sets = {"pin": "pinned = 1", "unpin": "pinned = 0", "lock": "locked = 1", "unlock": "locked = 0"}
        with self.db() as db:
            if not db.execute("SELECT 1 FROM topics WHERE id = ?", (tid,)).fetchone():
                return 404, {"error": "No such topic."}
            if action in sets:
                db.execute(f"UPDATE topics SET {sets[action]} WHERE id = ?", (tid,))
            elif action == "move":
                bid = int(data.get("board", 0) or 0)
                if not db.execute("SELECT 1 FROM boards WHERE id = ?", (bid,)).fetchone():
                    return 404, {"error": "No such board."}
                db.execute("UPDATE topics SET board_id = ? WHERE id = ?", (bid, tid))
            else:
                return 400, {"error": "Unknown action."}
        return 200, {"ok": True}


def page(query):
    try:
        return max(1, int(query.get("page", ["1"])[0]))
    except (ValueError, TypeError):
        return 1
