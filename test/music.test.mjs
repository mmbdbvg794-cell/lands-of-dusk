// Run with: node test/music.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { moodAt, moodForType, townAt, tracksByMood, pickTrack, MusicPlayer, MOODS, FALLBACK_MOOD, loopPasses, LOOP_MIN_S } from '../js/music.js';

// Where you are picks the mood.
assert.equal(townAt(1430, 350)?.name, 'Kingshaven');
assert.equal(townAt(900, 900), null);
assert.equal(moodAt({ x: 1430, y: 350 }), 'town');
assert.equal(moodAt({ x: 900, y: 900 }), 'wilderness');
assert.equal(moodAt({ x: 900, y: 900, light: 0 }), 'night');
assert.equal(moodAt({ x: 1430, y: 350, light: 0 }), 'town', 'a town at night is still a town');
assert.equal(moodAt({ x: 1300, y: 900, underground: true }), 'underground');
assert.equal(moodAt({ x: 1430, y: 350, aboard: true }), 'sea', 'a ferry at a town pier');
assert.equal(moodAt({ x: 900, y: 900, region: 'sea' }), 'sea');

// Opcode 12: 0 back to the place, 1 combat, anything else the fallback.
assert.equal(moodForType(0), null);
assert.equal(moodForType(1), 'combat');
assert.equal(moodForType(7), FALLBACK_MOOD);
assert.ok(MOODS.includes(FALLBACK_MOOD));

// The manifests: grouped by mood, bad entries left out.
const by = tracksByMood({ tracks: [{ file: 'a.mp3', mood: 'town' }, { file: 'b.mp3', mood: 'town' }, { mood: 'night' }, { file: 'c.mp3' }, null] });
assert.deepEqual([...by.keys()], ['town']);
assert.equal(by.get('town').length, 2);
assert.equal(tracksByMood(null).size, 0);
for (const name of ['manifest.json', 'manifest.test.json']) {
  const m = JSON.parse(readFileSync(new URL(`../music/${name}`, import.meta.url)));
  for (const t of m.tracks) {
    assert.ok(MOODS.includes(t.mood), `${name}: ${t.file} has an unknown mood ${t.mood}`);
    for (const k of ['file', 'title', 'author', 'source', 'license']) assert.equal(typeof t[k], 'string', `${name}: ${t.file} needs ${k}`);
    assert.ok(t.loop === undefined || typeof t.loop === 'boolean', `${name}: ${t.file} loop is true or false`);
    readFileSync(new URL(`../music/${t.file}`, import.meta.url)); // the file is there
  }
}

// pickTrack never repeats the last one when there's a choice.
const two = by.get('town');
for (let i = 0; i < 20; i++) assert.equal(pickTrack(two, two[0]).file, 'b.mp3');
assert.equal(pickTrack([two[0]], two[0]).file, 'a.mp3', 'one track: play it again');
assert.equal(pickTrack([], null), null);

// The player, with a pretend Howler.
const howls = [];
class FakeHowl {
  constructor(o) {
    this.src = o.src[0]; this.o = o; this.ids = new Map(); this.unloaded = false; this.dur = 100;
    howls.push(this);
  }
  state() { return 'loaded'; }
  play(id) { if (id) { this.ids.get(id).playing = true; return id; } const n = this.ids.size + 1; this.ids.set(n, { playing: true, vol: 1, at: 0 }); return n; }
  volume(v, id) { if (id === undefined) return this.ids.get(v)?.vol ?? 0; this.ids.get(id).vol = v; }
  fade(from, to, ms, id) { this.ids.get(id).vol = to; }
  stop(id) { this.ids.get(id).playing = false; }
  pause(id) { this.ids.get(id).playing = false; }
  seek(id) { return this.ids.get(id).at; }
  duration() { return this.dur; }
  loop(on, id) { this.ids.get(id).loop = on; }
  unload() { this.unloaded = true; for (const s of this.ids.values()) s.playing = false; }
}
const live = () => howls.filter((h) => !h.unloaded);
const playing = () => howls.flatMap((h) => [...h.ids.values()].filter((s) => s.playing).map(() => h.src));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fallbacks = [];
const p = new MusicPlayer({ Howl: FakeHowl, Howler: { volume() {} }, base: '', fadeMs: 5, onFallback: (on) => fallbacks.push(on) });
p.load({ tracks: [{ file: 't1', mood: 'town' }, { file: 't2', mood: 'town' }, { file: 'w1', mood: 'wilderness' }] });

// Nothing before a press or key.
p.setMood('town');
assert.equal(howls.length, 0);
p.unlock();
assert.equal(howls.length, 1);
assert.match(p.cur.track.file, /^t[12]$/);
const first = p.cur;

// The same mood again doesn't restart it.
p.setMood('wilderness'); p.setMood('town');
await wait(150);
assert.notEqual(p.cur, first, '(went to wilderness and back)');
const again = p.cur;
p.setMood('town');
assert.equal(p.cur, again);

// A mood with no tracks hands over to the generated music, and back.
fallbacks = [];
p.setMood('night');
assert.equal(p.cur, null);
assert.deepEqual(fallbacks, [true]);
p.setMood('town');
assert.deepEqual(fallbacks, [true, false]);
await wait(150);

// The next track is fetched only after a while, and at most two are held.
assert.equal(p.next, null);
p.cur.howl.ids.get(p.cur.id).at = 10;
p.tick();
assert.ok(p.next && p.next.track !== p.cur.track, 'next is another town track');
assert.equal(live().length, 2, JSON.stringify(howls.map((h) => [h.src, h.unloaded])));
// Changing mood drops the fetched-ahead track before the new one loads.
p.setMood('wilderness');
assert.ok(live().length <= 2, `held ${live().length}`);
await wait(150);
assert.equal(live().length, 1);
assert.deepEqual(playing(), ['w1']);

// Near the end it fades into another track (here the only one, again).
p.cur.started = 0;
p.cur.howl.ids.get(p.cur.id).at = 99.999;
const before = p.cur.id;
p.tick();
assert.notEqual(p.cur.id, before);
assert.equal(p.cur.track.file, 'w1');
await wait(150);
assert.equal(live().length, 1, 'one track playing again reuses its Howl');

// Hidden: paused, then carries on with the same sound.
const id = p.cur.id;
p.setHidden(true);
assert.deepEqual(playing(), []);
p.setHidden(false);
assert.equal(p.cur.id, id);
assert.deepEqual(playing(), ['w1']);

// A file that won't load is skipped (and the mood falls back if it was the last).
fallbacks = [];
p.cur.howl.o.onloaderror();
assert.equal(p.cur, null);
assert.deepEqual(fallbacks, [true]);

// The Music switch stops everything.
p.setMood('town');
p.setOn(false);
await wait(150);
assert.deepEqual(playing(), []);
assert.equal(live().length, 0);
assert.equal(p.timer, 0);

// No Howler (the CDN failed): always the generated music.
fallbacks = [];
const q = new MusicPlayer({ onFallback: (on) => fallbacks.push(on) });
q.load({ tracks: [{ file: 't1', mood: 'town' }] });
q.setMood('town'); q.unlock();
assert.deepEqual(fallbacks, [true]);

// Loop tracks repeat with no fade until their turn (LOOP_MIN_S) is up,
// then hand over at the end of a pass; a mood's only loop keeps going.
assert.equal(loopPasses(60), Math.ceil(LOOP_MIN_S / 60));
assert.equal(loopPasses(400), 1);
howls.length = 0;
const L = new MusicPlayer({ Howl: FakeHowl, Howler: { volume() {} }, base: '', fadeMs: 5 });
L.load({ tracks: [{ file: 'l1', mood: 'town', loop: true }, { file: 'l2', mood: 'town', loop: true }, { file: 'u1', mood: 'underground', loop: true }] });
L.setMood('underground'); L.unlock();
const s0 = () => L.cur.howl.ids.get(L.cur.id);
assert.equal(s0().loop, true);
L.cur.started = 0;
for (let pass = 0; pass < 5; pass++) { s0().at = 50; L.tick(); s0().at = 99.999; L.tick(); s0().at = 0.5; L.tick(); }
assert.equal(L.cur.track.file, 'u1', 'the only loop of its mood keeps looping');
assert.equal(L.cur.passes, 5);
L.setMood('town');
await wait(150);
const firstLoop = L.cur.track.file;
L.cur.started = 0;
const passes = loopPasses(100);
for (let pass = 0; pass < passes - 1; pass++) { s0().at = 50; L.tick(); s0().at = 99.999; L.tick(); assert.equal(L.cur.track.file, firstLoop, `pass ${pass + 1} carries on`); s0().at = 0.5; L.tick(); }
s0().at = 50; L.tick(); s0().at = 99.999; L.tick();
assert.notEqual(L.cur.track.file, firstLoop, 'hands over at the end of its last pass');
L.cur.howl.o.onend(L.cur.id);
assert.notEqual(L.cur, null, 'an end event from a loop pass is ignored');
L.setOn(false);
await wait(150);

// "Now playing": told once per different track, not when a track repeats.
howls.length = 0;
const shown = [];
const N = new MusicPlayer({ Howl: FakeHowl, Howler: { volume() {} }, base: '', fadeMs: 5, onTrack: (t) => shown.push(t.file) });
N.load({ tracks: [{ file: 'a', mood: 'town' }, { file: 'b', mood: 'night' }] });
N.setMood('town'); N.unlock();
N.cur.started = 0; N.cur.howl.ids.get(N.cur.id).at = 99.999; N.tick(); // a again
N.setMood('night');
assert.deepEqual(shown, ['a', 'b']);
N.setOn(false);
await wait(150);

console.log('music tests passed');
