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
"""

import asyncio
import ipaddress
import os
import re
from urllib.parse import parse_qs, urlsplit

import websockets

GAME_HOST = "127.0.0.1"
GAME_PORT = 10001
BRIDGE_PORT = 8765
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


async def relay_ws_to_tcp(websocket, writer):
    """Read bytes from the browser, forward to the game server."""
    try:
        async for message in websocket:
            if isinstance(message, str):
                message = message.encode("utf-8")
            writer.write(message)
            await writer.drain()
    except Exception as e:
        print(f"[ws->tcp] connection ended: {e}")


async def handle_client(websocket):
    address = real_address(websocket)
    device = device_id(websocket)
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
    task1 = asyncio.create_task(relay_tcp_to_ws(reader, websocket))
    task2 = asyncio.create_task(relay_ws_to_tcp(websocket, writer))

    done, pending = await asyncio.wait(
        [task1, task2], return_when=asyncio.FIRST_COMPLETED
    )
    for task in pending:
        task.cancel()

    writer.close()
    print("Connection closed.")


async def main():
    print(f"Dusk bridge starting on port {BRIDGE_PORT}, relaying to {GAME_HOST}:{GAME_PORT}")
    async with websockets.serve(handle_client, "0.0.0.0", BRIDGE_PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
