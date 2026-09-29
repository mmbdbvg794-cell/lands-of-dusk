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
"""

import asyncio
import websockets

GAME_HOST = "127.0.0.1"
GAME_PORT = 10001
BRIDGE_PORT = 8765


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
    print("New browser connection, opening TCP link to game server...")
    try:
        reader, writer = await asyncio.open_connection(GAME_HOST, GAME_PORT)
    except Exception as e:
        print(f"Could not connect to game server: {e}")
        await websocket.close()
        return

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
