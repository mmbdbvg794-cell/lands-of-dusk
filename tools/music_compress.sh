#!/bin/sh
# Makes a track ready for music/: MP3 at 112 kbps stereo, its loudness
# brought to about -18 LUFS by one fixed gain for the whole track (so
# tracks play at about the same level, and a loop's end still meets its
# start), peaks kept under -1 dBTP, tags and cover art stripped, no fades,
# the sample rate left as it is. Around 1.7 MB for 2 minutes, 3.4 MB for 4.
#
#   sh tools/music_compress.sh <input file> music/<mood>/<name>.mp3
#
# Any format ffmpeg reads works as input (wav, flac, ogg, mp3...).
set -eu
[ $# -eq 2 ] || { echo "usage: sh tools/music_compress.sh <input> music/<mood>/<name>.mp3" >&2; exit 1; }
mkdir -p "$(dirname "$2")"
# Measure: integrated loudness and true peak.
m=$(ffmpeg -hide_banner -nostats -i "$1" -map 0:a:0 -af loudnorm=print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
i=$(echo "$m" | sed -n 's/.*"input_i" : "\(.*\)".*/\1/p')
tp=$(echo "$m" | sed -n 's/.*"input_tp" : "\(.*\)".*/\1/p')
gain=$(awk -v i="$i" -v tp="$tp" 'BEGIN { g = -18 - i; p = -1 - tp; if (p < g) g = p; printf "%.2f", g }')
ffmpeg -hide_banner -loglevel error -y -i "$1" -map 0:a:0 -map_metadata -1 \
  -af "volume=${gain}dB" -ac 2 -c:a libmp3lame -b:a 112k "$2"
size=$(du -k "$2" | cut -f1)
secs=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2" | cut -d. -f1)
echo "$2: ${size} KB, $((secs / 60)):$(printf %02d $((secs % 60))) (was ${i} LUFS, peak ${tp} dBTP; gain ${gain} dB)"
[ "$secs" -le 270 ] || echo "  Longer than 4.5 minutes: it takes a lot of memory on phones (about 20 MB a minute once decoded)."
