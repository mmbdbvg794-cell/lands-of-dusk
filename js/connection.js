// WebSocket link to dusk_bridge.py, which relays raw bytes to the game's
// TCP port. Emits one 'message' event per parsed opcode, plus 'open',
// 'close' and 'error'.

import { ByteReader } from './bytereader.js';
import { OP, parseAvailable } from './protocol.js';

export class DuskConnection extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this.reader = new ByteReader();
    this.ctx = { mapSize: 11 }; // Dusk.java's default until opcode 19 arrives.
    this.ws = null;
  }

  connect() {
    const ws = new WebSocket(this.url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => this.emit('open');
    ws.onerror = () => this.emit('error', { message: `could not reach bridge at ${this.url}` });
    ws.onclose = (e) => {
      this.ws = null;
      this.emit('close', { code: e.code, reason: e.reason });
    };
    ws.onmessage = (e) => this.onData(e.data);
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  close() {
    this.ws?.close();
  }

  // Same wire format as Dusk.send(): trimmed text plus "\n", one byte per
  // char (DataOutputStream.writeBytes keeps only the low byte).
  send(text) {
    if (!this.connected) return false;
    const line = text.trim() + '\n';
    const bytes = new Uint8Array(line.length);
    for (let i = 0; i < line.length; i++) bytes[i] = line.charCodeAt(i) & 0xff;
    this.ws.send(bytes);
    return true;
  }

  onData(data) {
    // A text frame would mean the bridge changed; handle it anyway.
    this.reader.append(typeof data === 'string' ? new TextEncoder().encode(data) : data);
    try {
      for (const msg of parseAvailable(this.reader, this.ctx)) {
        this.autoRespond(msg);
        this.emit('message', msg);
        if (msg.op === OP.DISCONNECT || msg.op === -1) {
          this.close();
          return;
        }
      }
    } catch (e) {
      // Out of sync with the server; the Java client gives up here too.
      this.emit('error', { message: `protocol error: ${e.message}` });
      this.close();
    }
  }

  // Replies the Java client sends on its own in response to certain opcodes.
  // ("playerloaded true", the answer to opcode 1, is sent by main.js once
  // the sprite sheets have loaded.)
  autoRespond(msg) {
    switch (msg.op) {
      case OP.MAP_SIZE:
        // Asks the server for the image base URL (answered with opcode 1).
        this.send('applicationimages');
        break;
      case OP.NOT_DEAD:
        this.send('notdead');
        break;
    }
  }

  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
