"""Alpha applications: the website's apply page (site/apply.html, served as
/web/apply.html) posts here, and gods review them in the game's admin page
or with tools/betakey. Kept in ~/dusk-beta/betakeys.sqlite (server/
betagate.py), outside every web root.

serve.py hands every request under .../apply/api/ to handle():

    GET  info                             {discord}: the invite from beta.conf
    POST submit {name?, contact, device, why?, website}   an application
    GET  admin/list                       gods: applications, newest first
    POST admin/approve {id}               gods: makes its key, shown once
    POST admin/reject {id}                gods

Guards: posts need the X-Apply header and, when the browser sends one, an
Origin from this site (so another site can't post); "website" is a
honeypot (people never see it, so it must come back empty); lengths are
capped; 3 applications an hour per real address (the funnel's
X-Forwarded-For, trusted only from this machine, as the bridge does), and
only a hash of the address is kept. Text is stored plain, with < and >
taken out, and never sent back to the applicant. Contact details only
appear to signed-in gods (the forum's login) and in betakey on duskserver;
nothing about an application goes in a URL or a log line.
"""
import ipaddress
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "server"))
import betagate  # noqa: E402

MAX_BODY = 4096
LIMITS = {"name": 20, "contact": 100, "why": 500}
LABELS = {"name": "The character name", "contact": "The email or Discord name", "why": "Your answer to \"why\""}
PER_HOUR = 3
ORIGINS = {
    "https://duskserver.tailaee0f2.ts.net",
    "http://192.168.4.61:8080",
    "http://192.168.4.61:8000",
} | set(filter(None, os.environ.get("DUSK_APPLY_ORIGINS", "").split()))  # testing
CONTACT_RE = re.compile(r"^(?:[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}|[A-Za-z0-9_.]{2,32}(?:#\d{4})?)$")

_settings = betagate.Settings()


def clean(text, limit):
    """-> plain text without control characters or angle brackets, or None
    when it's longer than the limit."""
    text = str(text or "").replace("\r\n", "\n")
    if len(text) > limit:
        return None
    text = re.sub(r"<[^<>]*>", "", text)
    text = "".join(c for c in text if c == "\n" or (ord(c) >= 32 and c not in "<>"))
    return text.strip()


def real_address(peer, local, headers):
    """The applicant's address: the funnel's X-Forwarded-For when the
    request comes from this machine (the funnel), else the peer's own."""
    try:
        p = ipaddress.ip_address(peer)
    except ValueError:
        return peer
    if p.is_loopback or peer == local:
        first = (headers.get("X-Forwarded-For") or "").split(",")[0].strip()
        try:
            return str(ipaddress.ip_address(first))
        except ValueError:
            pass
    return peer


def same_site(headers):
    if headers.get("X-Apply") != "1":
        return False
    origin = headers.get("Origin")
    return origin is None or origin in ORIGINS


def handle(method, path, body, headers, peer, local, god):
    """-> (status, dict). god: the signed-in forum user if a god, else None."""
    try:
        parts = [p for p in path.split("/") if p]
        db = betagate.connect()
        try:
            if parts == ["info"] and method == "GET":
                return 200, {"discord": _settings.discord_url}
            if parts == ["submit"]:
                if method != "POST":
                    return 405, {"error": "Not allowed."}
                return submit(db, body, headers, real_address(peer, local, headers))
            if parts[:1] == ["admin"]:
                if not god:
                    return 401, {"error": "Sign in as a god first."}
                if parts == ["admin", "list"] and method == "GET":
                    rows = betagate.applications(db)
                    waiting = sum(1 for r in rows if r["status"] == "waiting")
                    return 200, {"waiting": waiting, "applications": [
                        {k: r[k] for k in ("id", "created", "name", "contact", "device", "why", "status", "decided", "key_tail")}
                        for r in reversed(rows)]}
                if method != "POST" or not same_site(headers):
                    return 403, {"error": "Not allowed."}
                try:
                    app_id = int(json.loads(body or b"{}").get("id"))
                except (ValueError, TypeError, AttributeError):
                    return 400, {"error": "Which application?"}
                if parts == ["admin", "approve"]:
                    row, key = betagate.approve(db, app_id)
                    if row is None:
                        return 404, {"error": "No such application."}
                    if key is None:
                        return 409, {"error": f"Application {app_id} was already {row['status']}."}
                    print(f"apply: {god} approved application {app_id}", flush=True)
                    return 200, {"id": app_id, "key": key, "contact": row["contact"], "label": f"#{row['id']} {row['name'] or row['contact']}"[:60]}
                if parts == ["admin", "reject"]:
                    row, done = betagate.reject(db, app_id)
                    if row is None:
                        return 404, {"error": "No such application."}
                    if not done:
                        return 409, {"error": f"Application {app_id} was already {row['status']}."}
                    print(f"apply: {god} rejected application {app_id}", flush=True)
                    return 200, {"id": app_id, "status": "rejected"}
            return 404, {"error": "No such page."}
        finally:
            db.close()
    except Exception as e:  # never a stack trace (or anyone's details) to the browser
        print("apply error:", type(e).__name__, flush=True)
        return 500, {"error": "Something went wrong. Please try again later."}


def submit(db, body, headers, address):
    if not same_site(headers):
        return 403, {"error": "Please use the form on the Dusk website."}
    if len(body or b"") > MAX_BODY:
        return 413, {"error": "That's too long."}
    try:
        data = json.loads(body or b"{}")
        if not isinstance(data, dict):
            raise ValueError
    except ValueError:
        return 400, {"error": "That wasn't understood."}
    if str(data.get("website") or ""):
        # The honeypot: only a robot fills a field nobody can see.
        return 400, {"error": "Your application couldn't be sent."}
    fields = {}
    for k, limit in LIMITS.items():
        v = clean(data.get(k), limit)
        if v is None:
            return 400, {"error": f"{LABELS[k]} is too long (at most {limit} characters)."}
        fields[k] = v
    if not fields["contact"]:
        return 400, {"error": "Please give an email address or Discord name, so we can send your key."}
    if not CONTACT_RE.match(fields["contact"]):
        return 400, {"error": "That doesn't look like an email address or a Discord name."}
    if fields["name"] and not re.match(r"^[A-Za-z][A-Za-z0-9 ]{0,19}$", fields["name"]):
        return 400, {"error": "Character names use letters, numbers and spaces, starting with a letter."}
    device = str(data.get("device") or "").lower()
    if device not in betagate.DEVICES:
        return 400, {"error": "Please pick the device you'll play on."}
    if betagate.recent_applications(db, address) >= PER_HOUR:
        return 429, {"error": "We've had a few applications from your connection in the last hour. Please try again later."}
    betagate.add_application(db, fields["name"], fields["contact"], device, fields["why"], address)
    print("apply: a new application", flush=True)
    return 200, {"ok": True, "discord": _settings.discord_url}
