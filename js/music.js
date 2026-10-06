// Area music: real tracks from music/manifest.json, played one at a time
// with Howler.js (a <script> tag in index.html sets window.Howl). The mood
// comes from where you are (the server never sends music: its playMusic is
// an empty stub), or from opcode 12 if a server ever does. Each mood is a
// folder of tracks; a new mood crossfades in, the same mood keeps playing,
// and a track that ends fades into another of the same mood.
//
// A mood with no tracks (or no Howler, or no manifest) hands over to the
// generated music in js/atmosphere.js through onFallback(true), so nothing
// goes silent before tracks are added.
//
// Howler runs in Web Audio mode so fades and volume work on iPhones too
// (its streaming mode ignores volume there). That decodes a whole track
// into memory (~60 MB for 3 minutes of stereo), so at most two tracks are
// ever held: the one playing and the next one (or, during a crossfade, the
// one fading out), and the next is only fetched once the current has
// played a while, so two never decode at once.

export const MOODS = ['town', 'wilderness', 'night', 'underground', 'sea', 'combat'];
export const FALLBACK_MOOD = 'wilderness'; // for opcode 12 types we don't know
export const FADE_MS = 2500; // crossfade between moods and between tracks
const PRELOAD_AFTER_S = 8; // fetch the next track once this much has played
// A loop track ("loop": true in the manifest) repeats with no gap or fade
// until it has played at least this long, then hands over to another track
// of its mood as a pass ends (or keeps going if it's the mood's only one).
export const LOOP_MIN_S = 180;

// How many passes of a loop make up its turn.
export const loopPasses = (dur) => (dur > 0 ? Math.max(1, Math.ceil(LOOP_MIN_S / dur)) : 1);
const TICK_MS = 500;

// Towns, [x0, y0, x1, y1], the boxes the night lights were placed in
// (tools/world/cities/lights-*.mjs). Velkarath is underground instead.
export const TOWNS = [
  { name: 'Kingshaven', box: [1380, 300, 1500, 410] },
  { name: 'Aelindor', box: [430, 1175, 510, 1280] },
  { name: 'Eastreach', box: [1640, 1280, 1700, 1320] },
  { name: 'City of Light', box: [30, 95, 165, 215] },
  { name: 'Midnight', box: [400, 0, 500, 105] },
  { name: 'Firetown', box: [330, 335, 500, 430] },
  { name: 'Riverside', box: [167, 50, 260, 260] },
  { name: 'North-west village', box: [0, 0, 135, 75] },
  { name: 'Frost hall', box: [245, 235, 280, 290] },
  { name: 'Westsea Harbour', box: [60, 330, 160, 400] },
  { name: 'West isle', box: [110, 860, 220, 925] },
];

export function townAt(x, y) {
  return TOWNS.find(({ box: [x0, y0, x1, y1] }) => x >= x0 && x <= x1 && y >= y0 && y <= y1) ?? null;
}

// The mood for a place: underground, then at sea (aboard a ferry, or the
// open-sea region), then in a town, then night or day in the wilds.
// light: 1 by day, 0 at night (atmosphere.js daylight()).
export function moodAt({ x, y, light = 1, underground = false, aboard = false, region = null }) {
  if (underground) return 'underground';
  if (aboard || region === 'sea') return 'sea';
  if (townAt(x, y)) return 'town';
  return light < 0.5 ? 'night' : 'wilderness';
}

// Opcode 12's type number: 0 was "normal" (the battle code plays 0 when a
// fight ends), so it means "back to the place's mood" (null); 1 was played
// when a fight starts.
export function moodForType(type) {
  if (type === 0) return null;
  if (type === 1) return 'combat';
  return FALLBACK_MOOD;
}

// The manifest's tracks grouped by mood: Map mood -> [track]. A track needs
// a file and a mood; the rest (title, author, source, license) is credits.
export function tracksByMood(manifest) {
  const by = new Map();
  for (const t of manifest?.tracks ?? []) {
    if (!t || typeof t.file !== 'string' || !t.file || typeof t.mood !== 'string' || !t.mood) continue;
    if (!by.has(t.mood)) by.set(t.mood, []);
    by.get(t.mood).push(t);
  }
  return by;
}

// A random track, not `avoid` (the one just played) when there's a choice.
export function pickTrack(list, avoid = null, rand = Math.random) {
  if (!list?.length) return null;
  const pool = list.length > 1 && avoid ? list.filter((t) => t.file !== avoid.file) : list;
  return pool[Math.floor(rand() * pool.length)] ?? pool[0];
}

export class MusicPlayer {
  // Howl/Howler: Howler.js's (null: no tracks, always the fallback).
  // base: where track files are, relative to the page.
  constructor({ Howl = null, Howler = null, base = 'music/', fadeMs = FADE_MS, onFallback = () => {}, onChange = () => {}, onTrack = () => {} } = {}) {
    this.Howl = Howl;
    this.Howler = Howler;
    this.base = base;
    this.fadeMs = fadeMs;
    this.onFallback = onFallback; // (on) generated music on or off
    this.onChange = onChange; // () something to show changed
    this.onTrack = onTrack; // (track) a different track starts (for "now playing")
    this.lastShown = null;
    this.byMood = new Map();
    this.bad = new Set(); // files that wouldn't load
    this.mood = null; // what's wanted (null: nowhere yet)
    this.on = true; // the Music switch
    this.unlocked = false; // a press or key has happened
    this.hidden = false; // the tab is hidden
    this.volume = 0.6;
    this.cur = null; // { track, howl, id }
    this.next = null; // { track, howl }, fetched ahead
    this.fading = []; // [{ howl, id, timer }] fading out
    this.fallback = false;
    this.timer = 0;
  }

  load(manifest) {
    this.byMood = tracksByMood(manifest);
    this.apply();
  }

  // Tracks for a mood, leaving out any that failed to load.
  tracks(mood) {
    return (this.byMood.get(mood) ?? []).filter((t) => !this.bad.has(t.file));
  }

  get playing() {
    return this.on && this.unlocked && !this.hidden;
  }

  setMood(mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.apply();
  }

  setOn(on) {
    this.on = on;
    this.apply();
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.apply();
  }

  // Music's own volume, 0-1, as Howler's master volume (only music uses
  // Howler), so it never disturbs a fade.
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.Howler?.volume(this.volume);
  }

  // The tab hid or came back: pause the track where it is (and drop any
  // fade-out), then carry on from there.
  setHidden(hidden) {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) {
      this.clearFading();
      if (this.cur) this.cur.howl.pause(this.cur.id);
      this.setFallback(false);
      this.stopTick();
    } else if (this.cur && this.playing && this.tracks(this.mood).includes(this.cur.track)) {
      this.cur.howl.play(this.cur.id);
      this.startTick();
      this.onChange();
    } else {
      this.apply();
    }
  }

  // Brings what's playing in line with mood, switch, unlock and tab.
  apply() {
    if (!this.playing) {
      this.fadeOut();
      this.dropNext();
      this.setFallback(false);
      this.stopTick();
      this.onChange();
      return;
    }
    const list = this.Howl ? this.tracks(this.mood) : [];
    if (!list.length) {
      this.fadeOut();
      this.dropNext();
      this.setFallback(true);
      this.onChange();
      return;
    }
    this.setFallback(false);
    if (this.cur && list.includes(this.cur.track)) return; // same mood: keep it
    const nxt = this.next && list.includes(this.next.track) ? this.next.track : pickTrack(list, this.cur?.track);
    this.crossfadeTo(nxt);
  }

  // Another track of the same mood (the debug panel's Next; also what
  // happens as a track ends).
  skip() {
    if (!this.playing || !this.cur) return;
    const list = this.tracks(this.mood);
    if (!list.length) return this.apply();
    const nxt = this.next && list.includes(this.next.track) ? this.next.track : pickTrack(list, this.cur.track);
    this.crossfadeTo(nxt);
  }

  crossfadeTo(track) {
    // A preloaded next of another track is dropped first, so no more than
    // two tracks are held through the fade.
    let howl = null;
    if (this.next?.track === track) howl = this.next.howl;
    else if (this.cur?.track === track) howl = this.cur.howl; // a mood with one track: play it again
    if (this.next && this.next.howl !== howl) this.unloadIfFree(this.next.howl, this.next);
    this.next = null;
    this.fadeOut();
    howl ??= this.makeHowl(track);
    const id = howl.play();
    howl.volume(0, id);
    howl.fade(0, 1, this.fadeMs, id);
    if (track.loop) howl.loop(true, id);
    this.cur = { track, howl, id, started: Date.now(), passes: 0, lastAt: 0 };
    this.startTick();
    if (track !== this.lastShown) { this.lastShown = track; this.onTrack(track); }
    this.onChange();
  }

  makeHowl(track) {
    const howl = new this.Howl({
      src: [this.base + track.file],
      html5: false,
      preload: true,
      volume: 0, // each play fades in from silence, even before it's loaded
      onloaderror: () => this.failed(track, howl),
      onplayerror: () => this.failed(track, howl),
      // Howler also says "end" at each pass of a loop; those carry on.
      onend: (id) => { if (!track.loop && this.cur?.howl === howl && this.cur.id === id) this.skip(); },
    });
    return howl;
  }

  failed(track, howl) {
    console.warn('Music: could not play', track.file);
    this.bad.add(track.file);
    if (this.next?.howl === howl) this.next = null;
    if (this.cur?.howl === howl) this.cur = null;
    for (const f of this.fading.filter((g) => g.howl === howl)) clearTimeout(f.timer);
    this.fading = this.fading.filter((g) => g.howl !== howl);
    howl.unload();
    this.apply();
  }

  fadeOut() {
    if (!this.cur) return;
    const { howl, id } = this.cur;
    this.cur = null;
    const f = { howl, id, timer: 0 };
    howl.fade(howl.volume(id), 0, this.fadeMs, id);
    f.timer = setTimeout(() => {
      this.fading = this.fading.filter((g) => g !== f);
      howl.stop(id);
      this.unloadIfFree(howl);
    }, this.fadeMs + 100);
    this.fading.push(f);
  }

  clearFading() {
    for (const f of this.fading.splice(0)) {
      clearTimeout(f.timer);
      f.howl.stop(f.id);
      this.unloadIfFree(f.howl);
    }
  }

  dropNext() {
    if (!this.next) return;
    const n = this.next;
    this.next = null;
    this.unloadIfFree(n.howl);
  }

  // Frees a track's decoded audio unless something still uses it.
  unloadIfFree(howl, except = null) {
    const used = (this.cur && this.cur.howl === howl) || (this.next && this.next !== except && this.next.howl === howl) || this.fading.some((f) => f.howl === howl);
    if (!used) howl.unload();
  }

  setFallback(on) {
    if (on === this.fallback) return;
    this.fallback = on;
    this.onFallback(on);
  }

  startTick() {
    if (!this.timer) this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stopTick() {
    clearInterval(this.timer);
    this.timer = 0;
  }

  // Twice a second: fetch the next track once this one has played a while,
  // and start fading into it when this one is a fade's length from its end
  // (for a loop, the end of its last pass; the fade-out runs on into the
  // start of the next pass, so there's still no gap).
  tick() {
    const c = this.cur;
    if (!c || !this.playing) return;
    if (c.howl.state() !== 'loaded') return;
    const at = Number(c.howl.seek(c.id)) || 0;
    const dur = c.howl.duration(c.id) || 0;
    if (!this.next && at >= PRELOAD_AFTER_S) {
      const t = pickTrack(this.tracks(this.mood), c.track);
      if (t) this.next = { track: t, howl: t === c.track ? c.howl : this.makeHowl(t) };
    }
    const ending = dur > 0 && dur - at <= this.fadeMs / 1000 && Date.now() - c.started > this.fadeMs;
    if (!c.track.loop) {
      if (ending) this.skip();
      return;
    }
    if (at + 1 < c.lastAt) c.passes++; // wrapped round to the start
    c.lastAt = at;
    const other = this.tracks(this.mood).some((t) => t !== c.track);
    if (ending && other && c.passes + 1 >= loopPasses(dur)) this.skip();
  }

  // For the debug panel and the "now playing" readout.
  status() {
    const s = { mood: this.mood, on: this.on, unlocked: this.unlocked, hidden: this.hidden, fallback: this.fallback, track: this.cur?.track ?? null, next: this.next?.track ?? null, held: this.held(), at: 0, duration: 0 };
    if (this.cur && this.cur.howl.state() === 'loaded') {
      s.at = Number(this.cur.howl.seek(this.cur.id)) || 0;
      s.duration = this.cur.howl.duration(this.cur.id) || 0;
    }
    return s;
  }

  // How many tracks are held in memory now.
  held() {
    const set = new Set();
    if (this.cur) set.add(this.cur.howl);
    if (this.next) set.add(this.next.howl);
    for (const f of this.fading) set.add(f.howl);
    return set.size;
  }
}

// The debug panel (#music or #music-test at the end of the address): a
// button per mood (Auto goes back to the place's mood), Next, the music
// volume and what's playing.
export function musicPanel({ player, setOverride, getOverride, setVolume }) {
  const box = document.createElement('div');
  box.id = 'music-panel';
  box.innerHTML = `<b>Music</b> <button type="button" class="hide">–</button>
    <div class="moods"></div>
    <label>Volume <input class="vol" type="range" min="0" max="100" step="5"></label>
    <button type="button" class="next">Next track</button>
    <div class="now"></div>`;
  const style = document.createElement('style');
  style.textContent = `#music-panel { position: fixed; top: 8px; left: 8px; z-index: 9999; background: rgba(10,12,20,.88); color: #dde;
      font: 12px/1.4 system-ui, sans-serif; padding: 8px 10px; border-radius: 6px; max-width: 260px }
    #music-panel .moods button, #music-panel .next { margin: 1px; padding: 1px 5px; font-size: 11px }
    #music-panel .moods button.on { background: #3b6297; color: #fff } #music-panel .now { margin-top: 4px; opacity: .85; white-space: pre-line }
    #music-panel .vol { width: 120px; vertical-align: middle } #music-panel.min > :not(b):not(.hide) { display: none }`;
  document.head.append(style);
  document.body.append(box);
  const moods = box.querySelector('.moods');
  for (const m of ['auto', ...MOODS]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m;
    b.dataset.mood = m;
    b.addEventListener('click', () => setOverride(m === 'auto' ? null : m));
    moods.append(b);
  }
  const vol = box.querySelector('.vol');
  vol.value = String(Math.round(player.volume * 100));
  vol.addEventListener('input', () => setVolume(Number(vol.value) / 100));
  box.querySelector('.next').addEventListener('click', () => player.skip());
  box.querySelector('.hide').addEventListener('click', () => box.classList.toggle('min'));
  const now = box.querySelector('.now');
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const update = () => {
    const s = player.status();
    const o = getOverride();
    for (const b of moods.children) b.classList.toggle('on', b.dataset.mood === (o ?? 'auto'));
    if (document.activeElement !== vol) vol.value = String(Math.round(player.volume * 100));
    let line;
    if (!s.on) line = 'Music is off (Settings)';
    else if (!s.unlocked) line = 'Waiting for a click or key';
    else if (s.hidden) line = 'Paused (tab hidden)';
    else if (s.fallback) line = `Generated music (no tracks for ${s.mood ?? 'nowhere'})`;
    else if (s.track) line = `${s.track.title ?? s.track.file}${s.track.author ? ' by ' + s.track.author : ''}\n${mmss(s.at)} / ${mmss(s.duration)}`;
    else line = '…';
    now.textContent = `Mood: ${s.mood ?? 'none'}${o ? ' (forced)' : ''}\n${line}\nNext: ${s.next ? s.next.title ?? s.next.file : '—'} · tracks in memory: ${s.held}`;
  };
  update();
  setInterval(update, 500);
  return { update };
}
