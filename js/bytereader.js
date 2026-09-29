// Buffered reader over the raw byte stream coming from the bridge.
//
// Mirrors the subset of java.io.DataInputStream that Dusk.java uses:
// readByte(), readLine() and readLong(). The difference is that data
// arrives in arbitrary WebSocket-sized chunks, so a read that runs past
// the end of what we have throws NeedMoreData. The caller rolls back to
// the start of the message (mark/reset) and retries when more bytes land.

export class NeedMoreData extends Error {
  constructor() {
    super('need more data');
  }
}

export class ByteReader {
  constructor() {
    this.buf = new Uint8Array(0);
    this.pos = 0;
    this.markPos = 0;
  }

  append(chunk) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    // Drop already-consumed bytes so the buffer doesn't grow forever.
    const remaining = this.buf.length - this.markPos;
    const next = new Uint8Array(remaining + bytes.length);
    next.set(this.buf.subarray(this.markPos));
    next.set(bytes, remaining);
    this.pos -= this.markPos;
    this.markPos = 0;
    this.buf = next;
  }

  mark() {
    this.markPos = this.pos;
  }

  reset() {
    this.pos = this.markPos;
  }

  available() {
    return this.buf.length - this.pos;
  }

  // Signed byte, like DataInputStream.readByte().
  readByte() {
    if (this.pos >= this.buf.length) throw new NeedMoreData();
    const b = this.buf[this.pos++];
    return b > 127 ? b - 256 : b;
  }

  // DataInputStream.readLine(): a line ends at \n, \r, or \r\n. Each byte
  // maps straight to one char (Latin-1), which matches the server's
  // writeBytes() output.
  readLine() {
    for (let i = this.pos; i < this.buf.length; i++) {
      const b = this.buf[i];
      if (b === 10 || b === 13) {
        if (b === 13) {
          // Need to see the next byte to know whether it's \r\n.
          if (i + 1 >= this.buf.length) throw new NeedMoreData();
        }
        const line = latin1(this.buf, this.pos, i);
        this.pos = i + 1;
        if (b === 13 && this.buf[this.pos] === 10) this.pos++;
        return line;
      }
    }
    throw new NeedMoreData();
  }

  // Big-endian signed 64-bit, like DataInputStream.readLong(). Returned as
  // a Number: entity IDs are nowhere near 2^53.
  readLong() {
    if (this.available() < 8) throw new NeedMoreData();
    const view = new DataView(this.buf.buffer, this.buf.byteOffset + this.pos, 8);
    this.pos += 8;
    return Number(view.getBigInt64(0, false));
  }

  readInt() {
    return parseJavaInt(this.readLine());
  }
}

function latin1(bytes, start, end) {
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

// Integer.parseInt() is strict: no surrounding whitespace, no trailing junk.
export function parseJavaInt(s) {
  if (!/^[+-]?\d+$/.test(s)) throw new ProtocolError(`expected integer, got ${JSON.stringify(s)}`);
  return parseInt(s, 10);
}

export function isJavaInt(s) {
  return /^[+-]?\d+$/.test(s);
}

export class ProtocolError extends Error {}
