#!/usr/bin/env python3
"""ReelClaw — Talking-Video Workflow Builder.

Builds N long-form (default 30s) UGC ads from a JSON spec:
  ElevenLabs VO (with-timestamps) + CapCut-style auto-synced captions
  + lo-fi music underlay + reaction clips + app demo cutaways.

Per concept:
  1. Generate VO via ElevenLabs /v1/text-to-speech/{voice}/with-timestamps
  2. Char alignment -> words -> 2-3 word CapCut phrases
  3. Atempo-fit VO to target duration, scale phrase timestamps by 1/tempo
  4. Build clip segments (scale + pad to 1080x1920, 30fps)
  5. Concat segments via ffmpeg concat demuxer
  6. Burn auto-captions (drawtext per phrase) + big CTA card (last N seconds)
  7. Mix VO + music with amix (normalize=0) + alimiter

Usage:
  python3 build_talking_video.py path/to/concepts.json
  ONLY="01,05,09" python3 build_talking_video.py path/to/concepts.json

The JSON spec schema is documented in references/talking-video.md.
"""
import json, os, subprocess, sys, base64, urllib.request

YELLOW = "#FFE600"
WHITE = "white"
DEFAULT_CTA_RESERVE = 4.0
DEFAULT_TARGET_DURATION = 30.0
DEFAULT_EMPHASIS = {
    "ai", "obsessed", "actually", "literally", "real", "fake",
    "broke", "cried", "shocked", "wrong", "free", "help", "pov",
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"CMD failed: {' '.join(cmd[:5])}...")
        print(f"STDERR: {r.stderr[-1500:]}")
        sys.exit(1)
    return r


def probe_dur(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path])
    return float(r.stdout.strip())


def gen_vo_ts(api_key, voice_id, text, model_id, speed, stab, sim, style, out_mp3):
    """POST to /v1/text-to-speech/{voice}/with-timestamps. Returns alignment dict."""
    body = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": stab,
            "similarity_boost": sim,
            "style": style,
            "use_speaker_boost": True,
            "speed": speed,
        },
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.load(resp)
    with open(out_mp3, "wb") as f:
        f.write(base64.b64decode(data["audio_base64"]))
    return data["alignment"]


def fit_audio(in_mp3, target_dur, out_mp3):
    """Atempo-fit audio to target_dur. Returns (raw_dur, fit_dur, tempo)."""
    d = probe_dur(in_mp3)
    tempo = d / target_dur
    if 0.5 <= tempo <= 2.0:
        af = f"atempo={tempo:.6f}"
    elif tempo < 0.5:
        af = f"atempo=0.5,atempo={tempo / 0.5:.6f}"
    else:
        af = f"atempo=2.0,atempo={tempo / 2.0:.6f}"
    run(["ffmpeg", "-y", "-i", in_mp3, "-af", af, out_mp3])
    return d, probe_dur(out_mp3), tempo


def chars_to_words(alignment):
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    words = []
    cur, cur_s, cur_e = "", None, None
    for c, s, e in zip(chars, starts, ends):
        if c.isspace():
            if cur:
                words.append({"word": cur, "start": cur_s, "end": cur_e})
                cur, cur_s = "", None
        else:
            if not cur:
                cur_s = s
            cur += c
            cur_e = e
    if cur:
        words.append({"word": cur, "start": cur_s, "end": cur_e})
    return words


def words_to_phrases(words, max_words=3, max_dur=1.1):
    """Group words into 2-3 word CapCut phrases. Break on punctuation."""
    phrases, cur = [], []
    for w in words:
        cur.append(w)
        last = w["word"][-1] if w["word"] else ""
        ends_punct = last in ".,!?;:"
        dur = cur[-1]["end"] - cur[0]["start"]
        if ends_punct or len(cur) >= max_words or dur >= max_dur:
            text = " ".join(x["word"] for x in cur).rstrip(",;:")
            phrases.append({"start": cur[0]["start"], "end": cur[-1]["end"], "text": text})
            cur = []
    if cur:
        text = " ".join(x["word"] for x in cur).rstrip(",;:")
        phrases.append({"start": cur[0]["start"], "end": cur[-1]["end"], "text": text})
    return phrases


def has_emphasis(text, emphasis_set):
    t = text.lower()
    for ch in ".,!?;:":
        t = t.replace(ch, "")
    return any(w in emphasis_set for w in t.split())


def wrap_text(text, max_chars=18):
    if len(text) <= max_chars:
        return text
    words = text.split()
    if len(words) < 2:
        return text
    target = len(text) // 2
    best_i, best_diff = 1, 10**9
    for i in range(1, len(words)):
        diff = abs(len(" ".join(words[:i])) - target)
        if diff < best_diff:
            best_diff, best_i = diff, i
    return " ".join(words[:best_i]) + "\n" + " ".join(words[best_i:])


def build_segment(src, ss, dur, out):
    vf = ("scale=w=1080:h=1920:force_original_aspect_ratio=decrease,"
          "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30")
    run(["ffmpeg", "-y", "-i", src, "-ss", str(ss), "-t", str(dur),
         "-vf", vf, "-an", "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "20", "-pix_fmt", "yuv420p", out])


def concat_segments(seg_files, out):
    listf = out + ".concat.txt"
    with open(listf, "w") as f:
        for s in seg_files:
            f.write(f"file '{s}'\n")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", out])


def resolve_extension(src_full):
    """If src doesn't exist, try swapping .mp4 <-> .mov (and case variants)."""
    if os.path.isfile(src_full):
        return src_full
    base, ext = os.path.splitext(src_full)
    for alt in [".mov", ".MOV", ".mp4", ".MP4"]:
        cand = base + alt
        if os.path.isfile(cand):
            return cand
    return src_full  # let downstream error out cleanly


def burn_captions(in_mp4, phrases, video_dur, font, cta_text, cta_reserve,
                  emphasis_set, work_dir, out_mp4):
    parts = []
    cta_start = video_dur - cta_reserve
    body = [p for p in phrases if p["start"] < cta_start]
    for p in body:
        if p["end"] > cta_start:
            p["end"] = cta_start

    for i, cap in enumerate(body):
        text = cap["text"]
        wrapped = wrap_text(text)
        tf = os.path.join(work_dir, f"cap_{i:03d}.txt")
        with open(tf, "w") as f:
            f.write(wrapped)
        col = YELLOW if has_emphasis(text, emphasis_set) else WHITE
        fs = 78 if len(text) <= 14 else 66
        end = min(cap["end"] + 0.05, cta_start)
        parts.append(
            f"drawtext=fontfile={font}:textfile={tf}:fontsize={fs}:fontcolor={col}"
            f":borderw=8:bordercolor=black:line_spacing=10:text_align=C+M"
            f":x=(w-text_w)/2:y=h*0.60"
            f":enable='between(t,{cap['start']:.3f},{end:.3f})'"
        )

    cta_tf = os.path.join(work_dir, "cta.txt")
    with open(cta_tf, "w") as f:
        f.write(cta_text)
    parts.append(
        f"drawtext=fontfile={font}:textfile={cta_tf}:fontsize=92:fontcolor={YELLOW}"
        f":borderw=10:bordercolor=black:line_spacing=12:text_align=C+M"
        f":x=(w-text_w)/2:y=h*0.65"
        f":enable='between(t,{cta_start:.3f},{video_dur:.3f})'"
    )

    vf = ",".join(parts)
    run(["ffmpeg", "-y", "-i", in_mp4, "-vf", vf,
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
         "-pix_fmt", "yuv420p", "-an", out_mp4])


def mix_with_music(captioned_v, vo_mp3, music_mp3, music_vol, target_dur, out_mp4):
    """Final mux: video + VO (full volume) + music (loudnorm + volume) + limiter."""
    run(["ffmpeg", "-y", "-i", captioned_v, "-i", vo_mp3, "-i", music_mp3,
         "-filter_complex",
         f"[1:a]volume=1.0[vo];"
         f"[2:a]atrim=0:{target_dur},asetpts=PTS-STARTPTS,volume={music_vol},"
         f"afade=t=out:st={target_dur-1.5}:d=1.5[m];"
         f"[vo][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.97[a]",
         "-map", "0:v", "-map", "[a]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-t", str(target_dur),
         "-movflags", "+faststart", out_mp4])


def build_concept(c, common, work_root, target_dur, cta_reserve, emphasis_set):
    name = c["name"]
    print(f"\n=== {name} ({c.get('voice_name', '?')}) ===")
    work = os.path.join(work_root, name)
    os.makedirs(work, exist_ok=True)

    vo_raw = os.path.join(work, "vo_raw.mp3")
    alignment = gen_vo_ts(
        common["elevenlabs_api_key"], c["voice_id"], c["vo_text"],
        common["model_id"], common["speed"],
        common["stability"], common["similarity_boost"], common["style"], vo_raw)

    vo_fit = os.path.join(work, "vo_fit.mp3")
    raw_d, fit_d, tempo = fit_audio(vo_raw, target_dur, vo_fit)
    print(f"  VO: raw={raw_d:.2f}s  fit={fit_d:.2f}s  tempo={tempo:.3f}")

    words = chars_to_words(alignment)
    phrases = words_to_phrases(words)
    for p in phrases:
        p["start"] /= tempo
        p["end"] /= tempo
    print(f"  captions: {len(words)} words -> {len(phrases)} phrases")

    seg_files = []
    for i, seg in enumerate(c["timeline"]):
        src = seg["src"]
        if not src.startswith("/"):
            if src.startswith("demos/"):
                src = os.path.join(common["demos_dir"], src[len("demos/"):])
            elif src.startswith("reactions/"):
                src = os.path.join(common["reactions_dir"], src[len("reactions/"):])
        src = resolve_extension(src)
        out_seg = os.path.join(work, f"seg_{i:02d}.mp4")
        build_segment(src, seg["in"], seg["dur"], out_seg)
        seg_files.append(out_seg)

    silent = os.path.join(work, "silent.mp4")
    concat_segments(seg_files, silent)

    captioned = os.path.join(work, "captioned.mp4")
    burn_captions(silent, phrases, target_dur, common["font"], common["cta_text"],
                  cta_reserve, emphasis_set, work, captioned)

    os.makedirs(common["out_dir"], exist_ok=True)
    out_prefix = common.get("out_prefix", "talking")
    final = os.path.join(common["out_dir"], f"{out_prefix}_{name}.mp4")
    mix_with_music(captioned, vo_fit, common["music_path"], common["music_volume"],
                   target_dur, final)
    print(f"  DONE: {final}")
    return final


def main():
    if len(sys.argv) < 2:
        print("usage: build_talking_video.py path/to/concepts.json")
        sys.exit(1)
    spec_path = os.path.abspath(sys.argv[1])  # ffmpeg concat needs absolute paths
    with open(spec_path) as f:
        spec = json.load(f)
    common = spec["common"]

    # Allow env var override of API key (don't hardcode keys in JSON)
    if not common.get("elevenlabs_api_key"):
        common["elevenlabs_api_key"] = os.environ.get("ELEVENLABS_API_KEY", "")
    if not common["elevenlabs_api_key"]:
        print("ERROR: set ELEVENLABS_API_KEY env var or common.elevenlabs_api_key in JSON")
        sys.exit(1)

    target_dur = common.get("target_duration", DEFAULT_TARGET_DURATION)
    cta_reserve = common.get("cta_reserve", DEFAULT_CTA_RESERVE)
    emphasis_set = set(w.lower() for w in common.get("emphasis_words", [])) | DEFAULT_EMPHASIS

    work_root = os.path.dirname(spec_path) + "/talking_work"
    os.makedirs(work_root, exist_ok=True)

    only = os.environ.get("ONLY")
    only_set = set(only.split(",")) if only else None

    outputs = []
    for c in spec["concepts"]:
        if only_set:
            num = c["name"].split("_")[0]
            if num not in only_set:
                continue
        try:
            outputs.append(build_concept(c, common, work_root, target_dur,
                                          cta_reserve, emphasis_set))
        except Exception as e:
            print(f"  ERROR on {c['name']}: {e}")

    print(f"\n=== {len(outputs)}/{len(spec['concepts'])} DONE ===")
    for o in outputs:
        d = probe_dur(o)
        sz = os.path.getsize(o) / 1024 / 1024
        print(f"  {os.path.basename(o)}  {d:.2f}s  {sz:.1f}MB")


if __name__ == "__main__":
    main()
