#!/bin/sh
# Makes a track ready for music/: MP3 at 112 kbps stereo, 44.1 kHz,
# loudness evened out (so tracks play at about the same level), tags and
# cover art stripped. Around 1.7 MB for 2 minutes, 3.4 MB for 4.
#
#   sh tools/music_compress.sh <input file> music/<mood>/<name>.mp3
#
# Any format ffmpeg reads works as input (wav, flac, ogg, mp3...).
set -eu
[ $# -eq 2 ] || { echo "usage: sh tools/music_compress.sh <input> music/<mood>/<name>.mp3" >&2; exit 1; }
mkdir -p "$(dirname "$2")"
ffmpeg -hide_banner -loglevel error -y -i "$1" -map 0:a:0 -map_metadata -1 \
  -af loudnorm=I=-18:TP=-1.5:LRA=11 -ar 44100 -ac 2 -c:a libmp3lame -b:a 112k "$2"
size=$(du -k "$2" | cut -f1)
secs=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2" | cut -d. -f1)
echo "$2: ${size} KB, $((secs / 60)):$(printf %02d $((secs % 60)))"
[ "$secs" -le 270 ] || echo "  Longer than 4.5 minutes: it takes a lot of memory on phones (about 20 MB a minute once decoded)."
