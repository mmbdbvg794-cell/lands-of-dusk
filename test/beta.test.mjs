// Run with: node test/beta.test.mjs
// The closed-beta handshake in js/connection.js, against a fake WebSocket.
import assert from 'node:assert/strict';

const sockets = [];
globalThis.WebSocket = class {
  static OPEN = 1;
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    sockets.push(this);
  }
  send(d) {
    this.sent.push(d);
  }
  close() {}
  open() {
    this.readyState = 1;
    this.onopen();
  }
};
const { DuskConnection } = await import('../js/connection.js');

// No gate: open at once, nothing extra sent.
let c = new DuskConnection('ws://x');
let events = [];
c.addEventListener('open', () => events.push('open'));
c.connect();
sockets.at(-1).open();
assert.deepEqual(events, ['open']);
assert.deepEqual(sockets.at(-1).sent, []);

// Gate: the key goes first as text; 'open' waits for the bridge's ok.
c = new DuskConnection('ws://x', { key: 'K7QM-4XWD-9TPB-2HNR' });
events = [];
c.addEventListener('open', () => events.push('open'));
c.addEventListener('beta', (e) => events.push(e.detail));
c.connect();
let ws = sockets.at(-1);
ws.open();
assert.deepEqual(events, []);
assert.equal(ws.sent[0], '#beta {"key":"K7QM-4XWD-9TPB-2HNR"}');
ws.onmessage({ data: '#beta {"ok": true, "gate": true, "token": "abc"}' });
assert.deepEqual(events, [{ ok: true, gate: true, token: 'abc' }, 'open']);
// A later notice is an event, never game data.
ws.onmessage({ data: '#beta {"ok": false, "code": "revoked"}' });
assert.deepEqual(events.at(-1), { ok: false, code: 'revoked' });
assert.equal(events.filter((e) => e === 'open').length, 1);

// Refused: no 'open'.
c = new DuskConnection('ws://x', { token: 't' });
events = [];
c.addEventListener('open', () => events.push('open'));
c.addEventListener('beta', (e) => events.push(e.detail.code));
c.connect();
ws = sockets.at(-1);
ws.open();
ws.onmessage({ data: '#beta {"ok": false, "code": "full", "message": "The beta is full right now, try again in a few minutes."}' });
assert.deepEqual(events, ['full']);

console.log('beta tests passed');
