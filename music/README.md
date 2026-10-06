# Music

The client plays one track at a time, picked by the mood of where you
are (js/music.js), and crossfades when the mood changes. A mood with no
tracks plays the old generated music instead, so you can add tracks one
mood at a time.

| Mood | When |
|---|---|
| `town` | Inside a town (the boxes in `TOWNS`, js/music.js) |
| `wilderness` | Outdoors by day; also the fallback |
| `night` | Outdoors at night (the game's 2-hour clock) |
| `underground` | Velkarath and the Underdark |
| `sea` | Aboard a ferry, or out on the open sea |
| `combat` | A fight (Phase 2; for now only the test panel uses it) |

## Adding a track

1. Check the licence on the track's own page (see the checklist below).
2. Compress it into the mood's folder:

       sh tools/music_compress.sh ~/Downloads/forest-song.flac music/wilderness/forest-song.mp3

   That makes a 112 kbps stereo MP3 with the loudness evened out and the
   tags stripped (about 1.7 MB for 2 minutes, 3.4 MB for 4). It's plain
   ffmpeg, if you'd rather run it yourself:

       ffmpeg -i IN -map 0:a:0 -map_metadata -1 -af loudnorm=I=-18:TP=-1.5:LRA=11 -ar 44100 -ac 2 -c:a libmp3lame -b:a 112k OUT.mp3

   Keep tracks to 2-4 minutes. A browser holds a playing track fully
   decoded (about 20 MB a minute), up to two at once.
3. Add it to `music/manifest.json` under `tracks`:

       {
         "file": "wilderness/forest-song.mp3",
         "title": "Forest Song",
         "author": "Jane Composer",
         "source": "https://example.org/track/forest-song",
         "license": "CC BY 4.0",
         "mood": "wilderness"
       }

   `file` is relative to `music/`. `mood` must be one of the moods above.
   No code changes are needed.
4. Run `sh tools/deploy.sh`. It copies the music, and
   `tools/music_credits.py` adds every track in the manifest to the website's
   credits page (`~/DuskRPG/web/credits.json`, as "Title by Author" with
   the source link and licence). Taking a track out of the manifest takes
   it out of the credits too. No restart is needed.

`node test/music.test.mjs` (also run by deploy) checks that every track in
the manifest has all six fields, a known mood, and a file that exists.

## Testing

Add `#music` to the game's address (e.g. `/play/#music`) for the test
panel. It has a button per mood (Auto goes back to where you are), Next
track, the music volume and what's playing.

`#music-test` does the same with `music/manifest.test.json`: a 40-second
test tone per mood in `music/test/` (two for wilderness), so moods,
crossfades and track ends can be heard before any real tracks are in.

## Finding licensed tracks: checklist

For each track, on its own page:

- [ ] **The licence allows use in a game, online.** CC0, CC BY and CC BY-SA
      are fine. Avoid NC (non-commercial) if the game might ever take
      donations or money. Avoid ND if you'll trim or loop the track
      (compressing alone is fine).
- [ ] **Attribution:** note exactly how the author wants to be credited (name,
      link) and put it in `author` / `source`.
- [ ] **The uploader is the author** (not a re-upload of someone else's
      music). Look for the original page.
- [ ] **No samples or covers** of other people's music unless those are
      cleared too.
- [ ] **Save the page URL** in `source`, and keep a screenshot or saved copy
      of the licence as it read on the day you took the track.
- [ ] **It fits:** loops or ends cleanly, 2-4 minutes, not too busy to sit
      under play for an hour (quiet, steady tracks wear best).
- [ ] **The moods sound alike in loudness** after `music_compress.sh` (it
      evens them out, but check by ear in the `#music` panel).

Good places to look: OpenGameArt.org (filter by licence), Free Music
Archive (filter CC BY), incompetech.com (Kevin MacLeod, CC BY),
freepd.com (public domain), Pixabay Music (its own licence: allows games,
no attribution needed, but read it), itch.io game-music packs (check each
pack's terms).
