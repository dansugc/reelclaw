#!/bin/sh
# DansUGC ReelClaw studio mode: QA frames + measurements for a rendered reel.
#
#   sh qa-frames.sh <video.mp4> <out-dir> [cut-seconds]
#
# cut-seconds = when the hook segment ends and the next one starts (reaction_demo: reaction-secs,
# default 3; no_yapping: intro-secs, default 6). Omit it if the reel has no hard cut.
#
# Writes into <out-dir>:
#   f-0.0s.png f-0.5s.png f-1.0s.png  first second (scroll-stop + hook readable in 1s)
#   f-hook-end.png f-after-cut.png    0.2s before / 0.5s after the cut
#   f-last.png                        last frame
#   font-check.png                    full-resolution crop of the caption band at 1.0s
#   contact-sheet.png                 2 frames per second, in time order
#   report.txt                        resolution, fps, duration, audio level, black frames, freezes
# The PNG frames carry a thin green box = the cross-platform text safe band
# (x 180-900, y 220-1420 on 1080x1920). Every caption must sit inside it.
set -eu

[ $# -ge 2 ] || { echo "usage: sh qa-frames.sh <video.mp4> <out-dir> [cut-seconds]" >&2; exit 2; }
IN=$1
OUT=$2
CUT=${3:-}
command -v ffmpeg >/dev/null 2>&1 || { echo "qa-frames: ffmpeg not found" >&2; exit 1; }
command -v ffprobe >/dev/null 2>&1 || { echo "qa-frames: ffprobe not found" >&2; exit 1; }
[ -f "$IN" ] || { echo "qa-frames: no such file: $IN" >&2; exit 1; }
mkdir -p "$OUT"

probe() { ffprobe -v error "$@" -of default=nw=1:nk=1 "$IN" | head -n 1; }
W=$(probe -select_streams v:0 -show_entries stream=width)
H=$(probe -select_streams v:0 -show_entries stream=height)
FPS=$(probe -select_streams v:0 -show_entries stream=r_frame_rate)
DUR=$(probe -show_entries format=duration)
ACODEC=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of default=nw=1:nk=1 "$IN" | head -n 1 || true)

# Safe band scaled to the actual frame size (the reference canvas is 1080x1920).
BOX="drawbox=x=iw*180/1080:y=ih*220/1920:w=iw*720/1080:h=ih*1200/1920:color=lime@0.9:t=3"
LAST=$(awk -v d="$DUR" 'BEGIN { t = d - 0.1; if (t < 0) t = 0; printf "%.2f", t }')

grab() { # grab <time> <file>
  ffmpeg -v error -y -ss "$1" -i "$IN" -frames:v 1 -vf "$BOX,scale=540:-2" "$OUT/$2"
}
grab 0 f-0.0s.png
grab 0.5 f-0.5s.png
grab 1.0 f-1.0s.png
if [ -n "$CUT" ]; then
  HE=$(awk -v c="$CUT" 'BEGIN { t = c - 0.2; if (t < 0) t = 0; printf "%.2f", t }')
  AC=$(awk -v c="$CUT" -v d="$DUR" 'BEGIN { t = c + 0.5; if (t > d - 0.1) t = d - 0.1; printf "%.2f", t }')
  grab "$HE" f-hook-end.png
  grab "$AC" f-after-cut.png
fi
grab "$LAST" f-last.png

# Full-resolution caption band (use it to confirm the font is TikTok Sans, not a fallback).
ffmpeg -v error -y -ss 1.0 -i "$IN" -frames:v 1 \
  -vf "crop=iw*720/1080:ih*1200/1920:iw*180/1080:ih*220/1920" "$OUT/font-check.png"

# Contact sheet: 2 fps, 8 columns.
N=$(awk -v d="$DUR" 'BEGIN { n = int(d * 2 + 0.999); if (n < 1) n = 1; print n }')
ROWS=$(( (N + 7) / 8 ))
ffmpeg -v error -y -i "$IN" -vf "fps=2,$BOX,scale=216:-2,tile=8x${ROWS}:padding=4:color=white" \
  -frames:v 1 "$OUT/contact-sheet.png"

# Measurements.
BLACK=$(ffmpeg -hide_banner -nostats -i "$IN" -vf "blackdetect=d=0.1:pix_th=0.10" -an -f null - 2>&1 \
  | grep -o 'black_start:[0-9.]* black_end:[0-9.]*' | tr '\n' ' ' || true)
FREEZE=$(ffmpeg -hide_banner -nostats -i "$IN" -vf "freezedetect=n=-60dB:d=2" -an -f null - 2>&1 \
  | grep -o 'freeze_start: [0-9.]*\|freeze_end: [0-9.]*' | tr '\n' ' ' || true)
if [ -n "$ACODEC" ]; then
  VOL=$(ffmpeg -hide_banner -nostats -i "$IN" -af volumedetect -vn -f null - 2>&1 \
    | grep -o 'mean_volume: [-0-9.]* dB\|max_volume: [-0-9.]* dB' | tr '\n' ' ' || true)
  MEAN=$(printf '%s' "$VOL" | sed -n 's/.*mean_volume: \([-0-9.]*\) dB.*/\1/p')
  if [ -n "$MEAN" ] && awk -v m="$MEAN" 'BEGIN { exit !(m < -50) }'; then
    VOL="$VOL (SILENT: no music and clip volumes 0? fine only for organic posts with an in-app sound)"
  fi
  TAILSTART=$(awk -v d="$DUR" 'BEGIN { t = d - 0.5; if (t < 0) t = 0; printf "%.2f", t }')
  TAIL=$(ffmpeg -hide_banner -nostats -ss "$TAILSTART" -i "$IN" -af volumedetect -vn -f null - 2>&1 \
    | sed -n 's/.*mean_volume: \([-0-9.]*\) dB.*/\1/p' | head -n 1)
  [ -n "$TAIL" ] && VOL="$VOL | last 0.5s: ${TAIL} dB (a music fade reads ~8+ dB below the mean)"
else
  VOL="NO AUDIO STREAM"
fi

{
  echo "file:        $IN"
  echo "resolution:  ${W}x${H}   (expect 1080x1920)"
  echo "fps:         $FPS   (expect 30/1)"
  echo "duration:    ${DUR}s"
  echo "audio:       ${ACODEC:-none}  ${VOL}"
  echo "black:       ${BLACK:-none}"
  echo "freezes:     ${FREEZE:-none}  (>2s frozen; fine for a static screen, wrong if footage ran out)"
  echo "cut:         ${CUT:-n/a}"
  echo
  echo "View these images now, then check them against references/qa-checklist.md:"
  for f in f-0.0s.png f-0.5s.png f-1.0s.png f-hook-end.png f-after-cut.png f-last.png font-check.png contact-sheet.png; do
    [ -f "$OUT/$f" ] && echo "  $OUT/$f"
  done
} | tee "$OUT/report.txt"
