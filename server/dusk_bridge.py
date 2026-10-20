"""
Dusk WebSocket <-> TCP bridge.

Lets a browser (which can only speak HTTP/WebSocket) connect to the
game server's real TCP port. This bridge is intentionally "dumb" - it
does no interpretation of the game's own protocol at all, just relays
raw bytes in both directions. All protocol intelligence lives in the
browser-side JavaScript client, same as it lives in Dusk.java today.

Setup:
  pip install websockets --break-system-packages

Run:
  python3 dusk_bridge.py

Listens for WebSocket connections on port 8765, and for each one opens
a fresh TCP connection to the real game server on 127.0.0.1:10001.

Real addresses: to the game server every connection comes from here, so
the bridge starts each one with a line it reads (server/BridgedSocket.java
in dusk-browser-client):
    #bridge <secret> <address> [<device>]
The address is the player's own, from Tailscale Funnel's X-Forwarded-For
(trusted only when the connection comes from this machine, i.e. through
the funnel), and the device is the random ID the browser client keeps
(?device=... on the WebSocket address), so gods can ban both. The secret
is in conf/bridgesecret, written by the game server each time it starts;
no file (a server without BridgedSocket) means no line, as before.

The closed alpha (betagate.py beside this file; settings and keys in
~/dusk-beta, see there). With BETA_GATE=on in ~/dusk-beta/beta.conf:
  - the browser's first WebSocket message must be a text frame
        #beta {"key": "K7QM-4XWD-9TPB-2HNR"}   or   #beta {"token": "..."}
    and nothing is relayed, nor the game's port opened, until it's good.
    The answer is a text frame "#beta {...}": ok (with the token the
    browser keeps for next time), or an error, after which the socket
    closes (codes 4400 no key, 4401 invalid, 4403 revoked, 4429 too many
    attempts, 4503 full);
  - at most MAX_PLAYERS browser players at once;
  - per real address: 10 bad keys in 10 minutes block it for 30 minutes,
    and more than 30 connections a minute are refused;
  - a player whose key is revoked is told and dropped within REVOKE_CHECK_S.
With it off, everything is as before; a #beta frame from a newer client is
answered ok and not relayed. beta.conf is read again when it changes, so
switching needs no restart (a restart does the same).
GET /status (/ws/status through the funnel) says {"gate": on/off, "keyUrl"}.
"""

import asyncio
import collections
import ipaddress
import json
import os
import re
import sys
import time
import uuid
from urllib.parse import parse_qs, urlsplit

import websockets

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import betagate  # noqa: E402

GAME_HOST = os.environ.get("DUSK_GAME_HOST", "127.0.0.1")
GAME_PORT = int(os.environ.get("DUSK_GAME_PORT", "10001"))
BRIDGE_PORT = int(os.environ.get("DUSK_BRIDGE_PORT", "8765"))
KEY_WAIT_S = 20          # for the #beta frame
BAD_LIMIT = 10           # bad keys per address...
BAD_WINDOW_S = 600       # ...in this long...
BLOCK_S = 1800           # ...block it this long
CONNECT_LIMIT = 30       # connections per address per minute (gate on)
REVOKE_CHECK_S = 20

settings = betagate.Settings()
db = betagate.connect()
db.execute("DELETE FROM online")  # nobody is on through a bridge that just started
sessions = {}            # session id -> {"ws", "key_id", "character", "address"}
bad = collections.defaultdict(collections.deque)
connects = collections.defaultdict(collections.deque)
blocked = {}             # address -> until (time.time())

MESSAGES = {
    "required": (4400, "This is a closed alpha: an alpha key is needed to play."),
    "invalid": (4401, "Invalid or revoked alpha key."),
    "used": (4401, "That alpha key has already been used."),
    "revoked": (4403, "Invalid or revoked alpha key."),
    "blocked": (4429, "Too many attempts. Try again in a while."),
    "full": (4503, "The alpha is full right now, try again in a few minutes."),
}
SECRET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conf", "bridgesecret")
DEVICE_RE = re.compile(r"^[A-Za-z0-9-]{8,64}$")


def plain_address(text):
    """The address if text is a plain IPv4 or IPv6 address, else None."""
    try:
        return str(ipaddress.ip_address(text.strip()))
    except ValueError:
        return None


def real_address(websocket):
    peer = websocket.remote_address[0] if websocket.remote_address else "127.0.0.1"
    peer = plain_address(peer) or "127.0.0.1"
    if ipaddress.ip_address(peer).is_loopback:
        # Through the funnel: the first address it forwarded for.
        forwarded = websocket.request.headers.get("X-Forwarded-For", "")
        first = plain_address(forwarded.split(",")[0]) if forwarded else None
        if first:
            return first
    return peer


def device_id(websocket):
    query = parse_qs(urlsplit(websocket.request.path).query)
    device = (query.get("device") or [""])[0]
    return device if DEVICE_RE.match(device) else ""


def read_secret():
    try:
        with open(SECRET_FILE) as f:
            secret = f.read().strip()
        return secret if re.match(r"^[0-9a-f]{16,128}$", secret) else None
    except OSError:
        return None


async def relay_tcp_to_ws(reader, websocket):
    """Read bytes from the game server, forward to the browser."""
    try:
        while True:
            data = await reader.read(4096)
            if not data:
                break
            await websocket.send(data)
    except Exception as e:
        print(f"[tcp->ws] connection ended: {e}")


async def relay_ws_to_tcp(websocket, writer, session=None, sid=None):
    """Read bytes from the browser, forward to the game server."""
    first = True
    try:
        async for message in websocket:
            if isinstance(message, str):
                if message.startswith("#beta"):
                    # A newer client asking, with the gate off: answered, not relayed.
                    await websocket.send("#beta " + json.dumps({"ok": True, "gate": False}))
                    continue
                message = message.encode("utf-8")
            if first and session is not None:
                # The first line is the character's name: noted for betakey list.
                first = False
                name = message.split(b"\n", 1)[0].decode("latin-1").strip()[:20]
                if re.match(r"^[A-Za-z0-9 _-]{1,20}$", name):
                    session["character"] = name
                    try:
                        db.execute("UPDATE online SET character = ? WHERE session = ?", (name, sid))
                        betagate.note_character(db, session["key_id"], name)
                    except Exception as e:
                        print(f"[beta] couldn't note the character: {e}")
            writer.write(message)
            await writer.drain()
    except Exception as e:
        print(f"[ws->tcp] connection ended: {e}")


def recent(times, window):
    cut = time.time() - window
    while times and times[0] < cut:
        times.popleft()
    return len(times)


def is_blocked(address):
    until = blocked.get(address)
    if until and until > time.time():
        return True
    blocked.pop(address, None)
    return False


def count_bad(address):
    bad[address].append(time.time())
    if recent(bad[address], BAD_WINDOW_S) >= BAD_LIMIT:
        blocked[address] = time.time() + BLOCK_S
        bad[address].clear()
        print(f"[beta] {address} blocked for {BLOCK_S // 60} minutes after {BAD_LIMIT} bad keys")


async def refuse(websocket, code_name):
    code, text = MESSAGES[code_name]
    try:
        await websocket.send("#beta " + json.dumps({"ok": False, "code": code_name, "message": text}))
        await websocket.close(code, text)
    except Exception:
        pass


async def beta_check(websocket, address):
    """Gate on: reads the #beta frame -> key id, or None (refused, closed)."""
    if is_blocked(address):
        await refuse(websocket, "blocked")
        return None
    connects[address].append(time.time())
    if recent(connects[address], 60) > CONNECT_LIMIT:
        await refuse(websocket, "blocked")
        return None
    try:
        first = await asyncio.wait_for(websocket.recv(), KEY_WAIT_S)
    except Exception:
        await refuse(websocket, "required")
        return None
    if not isinstance(first, str) or not first.startswith("#beta"):
        await refuse(websocket, "required")
        return None
    try:
        ask = json.loads(first[5:].strip() or "{}")
        key, token = str(ask.get("key") or ""), str(ask.get("token") or "")
    except (ValueError, AttributeError):
        key, token = "", ""
    if not key and not token:
        await refuse(websocket, "required")
        return None
    cap = settings.max_players
    if cap and len(sessions) >= cap:
        await refuse(websocket, "full")
        return None
    row, why, new_token = None, None, None
    if token:
        row, why = betagate.check_token(db, token)
    if row is None and key:
        row, result = betagate.redeem(db, key)
        if row is None:
            why = result
        else:
            new_token = result
    if row is None:
        count_bad(address)
        print(f"[beta] refused {address}: {why}")
        await refuse(websocket, why if why in MESSAGES else "invalid")
        return None
    await websocket.send("#beta " + json.dumps({"ok": True, "gate": True, "token": new_token or token}))
    print(f"[beta] {address} in on key {row['label']!r} (..{row['tail']})")
    return row["id"]


async def watch_revoked():
    """Drops players whose key was revoked (or whose key is gone)."""
    while True:
        await asyncio.sleep(REVOKE_CHECK_S)
        try:
            for sid, s in list(sessions.items()):
                if s["key_id"] and not betagate.active(db, s["key_id"]):
                    print(f"[beta] dropping {s['character'] or s['address']}: key revoked")
                    await refuse(s["ws"], "revoked")
        except Exception as e:
            print(f"[beta] revoke check failed: {e}")


def status_request(connection, request):
    """GET .../status: is the gate on, and the "Need a key?" link."""
    path = request.path.split("?", 1)[0]
    if not path.rstrip("/").endswith("/status"):
        return None
    body = json.dumps({"gate": settings.gate_on, "keyUrl": settings.key_url})
    response = connection.respond(200, body + "\n")
    response.headers["Content-Type"] = "application/json"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    return response


async def handle_client(websocket):
    address = real_address(websocket)
    device = device_id(websocket)
    key_id = None
    if settings.gate_on:
        key_id = await beta_check(websocket, address)
        if key_id is None:
            return
    print(f"New browser connection from {address}, opening TCP link to game server...")
    try:
        reader, writer = await asyncio.open_connection(GAME_HOST, GAME_PORT)
    except Exception as e:
        print(f"Could not connect to game server: {e}")
        await websocket.close()
        return

    secret = read_secret()
    if secret:
        writer.write(f"#bridge {secret} {address} {device}".rstrip().encode() + b"\n")
        await writer.drain()

    print("TCP link established, relaying...")
    sid = uuid.uuid4().hex
    session = sessions[sid] = {"ws": websocket, "key_id": key_id, "character": "", "address": address}
    try:
        betagate.set_online(db, sid, key_id, "", address)
    except Exception as e:
        print(f"[beta] couldn't note the session: {e}")
    task1 = asyncio.create_task(relay_tcp_to_ws(reader, websocket))
    task2 = asyncio.create_task(relay_ws_to_tcp(websocket, writer, session, sid))

    try:
        done, pending = await asyncio.wait(
            [task1, task2], return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    finally:
        sessions.pop(sid, None)
        try:
            betagate.set_offline(db, sid)
        except Exception:
            pass
        writer.close()
    print("Connection closed.")


async def main():
    print(f"Dusk bridge starting on port {BRIDGE_PORT}, relaying to {GAME_HOST}:{GAME_PORT}")
    print(f"Alpha gate {'ON' if settings.gate_on else 'off'} (settings in {betagate.CONF})")
    asyncio.create_task(watch_revoked())
    async with websockets.serve(handle_client, "0.0.0.0", BRIDGE_PORT, process_request=status_request):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
