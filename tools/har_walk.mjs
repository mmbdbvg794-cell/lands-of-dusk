// Walks the WebSocket traffic in a HAR capture against our protocol parser.
//
//   node tools/har_walk.mjs harcapture.har [--trace] [--json out.json]
//
// For every WebSocket in the HAR, the server->client frames are decoded (in
// order) and joined into one raw byte stream, just as the bridge would hand
// it to js/protocol.js. The stream is then walked message by message with
// our real parseMessage(), so a failure here means our parser (and the
// reference table it follows) disagrees with the capture.
//
// For each opcode it reports how many messages parsed cleanly and which ones
// didn't. Opcodes js/protocol.js doesn't parse get their raw lines
// dumped, grouped by "shape" (INT / TEXT / '.' / '--EOF--' per line), to help
// work out their format.
//
// Limits: after an unknown opcode there's no length field, so the walker
// guesses where the next message starts (the first line start whose byte is
// an opcode we can parse cleanly, or an unparsed one in 33-39). Treat unknown-opcode payloads
// as a best guess, and check them against the frame boundaries it prints.

import fs from 'node:fs';
import { ByteReader, NeedMoreData, ProtocolError } from '../js/bytereader.js';
import { parseMessage, opName, isKnownOp } from '../js/protocol.js';

// The friend's modified server is known to send 33-39 (see the reference).
const isCandidateUnknown = (b) => b >= 33 && b <= 39;

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const trace = args.includes('--trace');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
if (!file) {
  console.error('usage: node tools/har_walk.mjs <capture.har> [--trace] [--json out.json]');
  process.exit(2);
}

const har = JSON.parse(fs.readFileSync(file, 'utf8'));
const sockets = (har.log?.entries ?? []).filter((e) => Array.isArray(e._webSocketMessages));
if (sockets.length === 0) {
  console.error('No WebSocket entries (_webSocketMessages) found in this HAR.');
  process.exit(1);
}

const report = [];
for (const entry of sockets) report.push(walkSocket(entry));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));

// ---------------------------------------------------------------------------

function decodeFrame(m) {
  // Chrome/Firefox: opcode 2 = binary (always base64 in HAR), 1 = text (raw).
  // Some exporters leave out the opcode, so fall back to a strict base64 test.
  const looksB64 = /^[A-Za-z0-9+/]*={0,2}$/.test(m.data) && m.data.length % 4 === 0;
  if (m.opcode === 2 || (m.opcode === undefined && looksB64)) {
    return { bytes: new Uint8Array(Buffer.from(m.data, 'base64')), kind: 'binary' };
  }
  // A text frame. The server's bytes are Latin-1, so map chars back 1:1 when
  // possible; anything wider can only have been UTF-8.
  const latin = [...m.data].every((c) => c.charCodeAt(0) <= 0xff);
  return {
    bytes: new Uint8Array(Buffer.from(m.data, latin ? 'latin1' : 'utf8')),
    kind: latin ? 'text' : 'text-utf8',
  };
}

function walkSocket(entry) {
  const url = entry.request?.url ?? '(unknown url)';
  const msgs = entry._webSocketMessages;
  const recv = msgs.filter((m) => m.type === 'receive');
  const sent = msgs.filter((m) => m.type === 'send');

  console.log(`\n=== WebSocket ${url}`);
  console.log(`    ${recv.length} frames received, ${sent.length} sent`);

  // Join the received frames into one stream, remembering where each began.
  const frameKinds = {};
  const frameStarts = new Set();
  const chunks = [];
  let total = 0;
  for (const m of recv) {
    const { bytes, kind } = decodeFrame(m);
    frameKinds[kind] = (frameKinds[kind] ?? 0) + 1;
    frameStarts.add(total);
    chunks.push(bytes);
    total += bytes.length;
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  console.log(`    frame kinds: ${JSON.stringify(frameKinds)}; stream is ${total} bytes`);

  const stats = new Map(); // op -> { count, clean, problems[], samples[] , shapes }
  const stat = (op) => {
    if (!stats.has(op)) stats.set(op, { count: 0, clean: 0, problems: [], samples: [], shapes: new Map() });
    return stats.get(op);
  };

  const ctx = { mapSize: 11 };
  let pos = 0;
  let atFrameStart = 0;
  let messages = 0;

  while (pos < buf.length) {
    const op = signed(buf[pos]);
    if (frameStarts.has(pos)) atFrameStart++;
    messages++;

    if (isKnownOp(op)) {
      const res = tryParse(buf, pos, ctx);
      const s = stat(op);
      s.count++;
      if (res.ok && plausibleStart(buf, res.end)) {
        s.clean++;
        if (s.samples.length < 3) s.samples.push(res.msg);
        if (op === 19) ctx.mapSize = res.msg.size;
        if (trace) console.log(`  @${pos} ${op} ${opName(op)} ${short(res.msg)}`);
        pos = res.end;
        continue;
      }
      // Our parser disagrees with the bytes: record the evidence, then resync.
      const why = res.ok
        ? `parsed, but it's followed by ${JSON.stringify(preview(buf, res.end, 40))} instead of a new opcode (payload longer than documented?)`
        : res.error;
      const next = resync(buf, pos + 1, ctx);
      s.problems.push({ offset: pos, why, raw: preview(buf, pos, Math.min(next - pos, 300)) });
      if (trace) console.log(`  @${pos} ${op} ${opName(op)} !! ${why}`);
      pos = next;
      continue;
    }

    // Opcode we don't know: take the bytes up to the next plausible message.
    const next = resync(buf, pos + 1, ctx);
    const lines = splitLines(buf, pos + 1, next);
    const s = stat(op);
    s.count++;
    const shape = lines.map(lineShape).join(' ');
    s.shapes.set(shape, (s.shapes.get(shape) ?? 0) + 1);
    if (s.samples.length < 5) s.samples.push({ offset: pos, frameStart: frameStarts.has(pos), lines });
    if (trace) console.log(`  @${pos} ${op} UNKNOWN ${JSON.stringify(lines).slice(0, 200)}`);
    pos = next;
  }

  printSummary(stats);
  console.log(
    `\n    ${atFrameStart}/${messages} messages began exactly at a frame boundary` +
      (atFrameStart === messages && messages === recv.length
        ? ' (one message per frame, so the boundaries above are reliable)'
        : ''),
  );
  printSent(sent);

  return {
    url,
    frames: { received: recv.length, sent: sent.length, kinds: frameKinds },
    streamBytes: total,
    opcodes: Object.fromEntries(
      [...stats].map(([op, s]) => [op, { ...s, shapes: Object.fromEntries(s.shapes) }]),
    ),
  };
}

function tryParse(buf, pos, ctx) {
  const r = new ByteReader();
  r.append(buf.subarray(pos));
  try {
    const msg = parseMessage(r, { ...ctx });
    return { ok: true, msg, end: pos + r.pos };
  } catch (e) {
    if (e instanceof NeedMoreData) return { ok: false, error: 'ran off the end of the capture mid-message' };
    if (e instanceof ProtocolError) return { ok: false, error: e.message };
    throw e;
  }
}

// Could a new message start here? The end of the stream is fine too.
function plausibleStart(buf, pos) {
  if (pos >= buf.length) return true;
  const b = buf[pos];
  return b <= 39 || b === 0xff;
}

// Find the next line start that looks like a real message: a known opcode
// that parses cleanly and is itself followed by a plausible start, or 33-39.
function resync(buf, from, ctx) {
  for (let i = from; i < buf.length; i++) {
    const prev = buf[i - 1];
    if (prev !== 10 && prev !== 13) continue;
    if (prev === 13 && buf[i] === 10) continue; // middle of \r\n
    const b = buf[i];
    if (isCandidateUnknown(b) && !isKnownOp(b)) return i;
    if (isKnownOp(b) || b === 0xff) {
      const res = tryParse(buf, i, ctx);
      if (res.ok && plausibleStart(buf, res.end)) return i;
    }
  }
  return buf.length;
}

function splitLines(buf, start, end) {
  const out = [];
  let s = start;
  for (let i = start; i < end; i++) {
    if (buf[i] === 10 || buf[i] === 13) {
      out.push(latin1(buf, s, i));
      if (buf[i] === 13 && buf[i + 1] === 10) i++;
      s = i + 1;
    }
  }
  if (s < end) out.push(latin1(buf, s, end) + '⟨no newline⟩');
  return out;
}

function lineShape(l) {
  if (/^[+-]?\d+$/.test(l)) return 'INT';
  if (l === '.') return "'.'";
  if (l === '--EOF--') return 'EOF';
  if (l === 'true' || l === 'false') return 'BOOL';
  if (l === '') return 'EMPTY';
  return 'TEXT';
}

function printSummary(stats) {
  const ops = [...stats.keys()].sort((a, b) => a - b);
  console.log('\n    op  name              seen  clean  problems');
  for (const op of ops) {
    const s = stats.get(op);
    const known = isKnownOp(op);
    const name = known ? opName(op) : 'NOT IN REFERENCE';
    const flag = !known ? '  <-- new' : s.problems.length ? '  <-- mismatch' : '';
    console.log(
      `    ${String(op).padStart(3)} ${name.padEnd(17)} ${String(s.count).padStart(5)} ${String(known ? s.clean : '-').padStart(6)} ${String(known ? s.problems.length : '-').padStart(9)}${flag}`,
    );
  }

  for (const op of ops) {
    const s = stats.get(op);
    if (s.problems.length === 0) continue;
    console.log(`\n--- opcode ${op} (${opName(op)}): ${s.problems.length} of ${s.count} didn't match the documented format`);
    for (const p of s.problems.slice(0, 5)) {
      console.log(`    @${p.offset}: ${p.why}`);
      console.log(`      raw: ${JSON.stringify(p.raw)}`);
    }
  }

  for (const op of ops) {
    if (isKnownOp(op)) continue;
    const s = stats.get(op);
    console.log(`\n--- opcode ${op}: NOT IN REFERENCE, seen ${s.count}x (payload boundaries are a guess)`);
    console.log('    payload shapes (line types, count):');
    for (const [shape, n] of [...s.shapes].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      console.log(`      ${String(n).padStart(4)}x  ${shape.length > 150 ? shape.slice(0, 150) + ' …' : shape || '(no payload)'}`);
    }
    for (const smp of s.samples.slice(0, 3)) {
      const lines = smp.lines.length > 12 ? [...smp.lines.slice(0, 12), `… ${smp.lines.length - 12} more lines`] : smp.lines;
      console.log(`    sample @${smp.offset}${smp.frameStart ? ' (frame start)' : ''}: ${JSON.stringify(lines)}`);
    }
  }
}

function printSent(sent) {
  if (sent.length === 0) return;
  const counts = new Map();
  for (const m of sent) {
    const text = latin1(decodeFrame(m).bytes, 0, decodeFrame(m).bytes.length);
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      // Group by command word, but keep whole lines for short one-offs.
      const key = line.split(' ')[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  console.log('\n    client -> server commands (first word, count):');
  const list = [...counts].sort((a, b) => b[1] - a[1]);
  console.log('      ' + list.map(([k, n]) => `${k}×${n}`).join('  '));
}

function signed(b) {
  return b > 127 ? b - 256 : b;
}

function latin1(bytes, start, end) {
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function preview(buf, pos, n) {
  return latin1(buf, pos, Math.min(buf.length, pos + n));
}

function short(msg) {
  const s = JSON.stringify(msg);
  return s.length > 160 ? s.slice(0, 160) + '…' : s;
}
