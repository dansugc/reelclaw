# Talking-Video Workflow (`/talking-video`)

Long-form (20–30s) testimonial UGC ads with **ElevenLabs voiceover + CapCut-style auto-synced captions + lo-fi music + UGC reactions + app demo cutaways**. Use when the classic 15s text-only ReelClaw format is too short for your story.

## When to use this vs. the classic reel pipeline

| Use `/talking-video` when… | Use classic reel pipeline when… |
|---|---|
| You have a 75–80 word story (transformation, testimonial, problem→solution) | You have a punchy 3–7 word hook |
| You want a narrator voice driving the watch-through | You want creator face + on-screen text only |
| You want CapCut-style word-by-word captions auto-aligned to speech | You want one static text overlay for the duration |
| Target 20–30s | Target 7–15s |
| Examples: "I tried this app and it changed X" / "POV: I never had Y until Z" | Examples: "POV: when X happens to you" / "wait for it" |

The classic pipeline is documented in the main `SKILL.md` (Steps 1–6). The talking-video workflow uses a different orchestrator that integrates VO + alignment + captions + music in a single Python run.

---

## What this workflow produces

Per video (1080×1920, 30fps, AAC):
- ElevenLabs VO, atempo-fit to exact target duration (default 30.000s)
- 7-segment timeline: 3 reaction clips (0–9s) + 2 demo cutaways (9–21s) + 1 mid reaction (21–25s) + 1 CTA reaction (25–30s)
- CapCut-style captions: 2–3 word phrases, word-timestamped to actual speech, white + yellow accent words
- Big CTA card (yellow, last 4s): `APP NAME / on AppStore`
- Lo-fi music underlay, loudness-normalized to −16 LUFS, mixed at 50% with fade-out

---

## Requirements checklist (ask the user upfront)

Before producing anything, confirm with the user:

### Hard requirements
- ☐ **`ELEVENLABS_API_KEY`** environment variable (or pasted in chat — never log/print the full key)
- ☐ **App name** and exact spelling (e.g. "AiPixo", "PCOS Pal")
- ☐ **CTA text** (default: `{APP_NAME}\non AppStore`)
- ☐ **App demo videos** — at least 4–6 screen recordings showing different features. Vertical 1080×1920 strongly preferred.
- ☐ **Reaction source** — one of:
  - DanSUGC `model_id`(s) — fetch via API (admin = direct download URLs; non-admin must purchase)
  - Local folder of pre-downloaded reaction clips
- ☐ **Number of videos to produce** (10–20 is typical; one model per video for consistency)

### Soft requirements (use defaults if not specified)
- **Length** — default 30s. Shorter is harder (less time for hook + demo + CTA)
- **Voice(s)** — see "Safe Voices" below. For one-model-per-video setups, use one voice per video for character consistency
- **Music** — see "Safe Music" below. Default: lo-fi piano bed
- **Caption colors** — default white + yellow accent. Avoid red/green for FB ad compliance (looks like dramatized claims)
- **Banned phrases** — Facebook personal-attributes rule: never write "your PCOS", "your acne", etc. Use "my X" / "women with X" / "people with X" instead

---

## Pipeline stages

```
1. SCRIPT WRITING        — write 1+ VO scripts (~75–80 words for 30s)
2. VO + TIMESTAMPS       — POST /v1/text-to-speech/{voice}/with-timestamps
3. ATEMPO FIT            — stretch/compress raw VO to exact target duration
4. ALIGNMENT SCALING     — divide every char/word timestamp by the atempo tempo factor
5. PHRASE GROUPING       — chars → words → 2-3 word CapCut phrases (max 1.1s each, break on punctuation)
6. SEGMENTS              — cut each timeline entry, scale to 1080×1920, fps=30
7. CONCAT                — ffmpeg concat demuxer, no re-encode
8. CAPTION BURN          — drawtext per phrase + big CTA card, reserve last 4s for CTA
9. MUSIC MIX             — amix VO (volume=1.0) + music (loudnorm to −16 LUFS then volume=0.5) + alimiter
10. EXPORT               — H.264, AAC 192k, faststart
```

The full implementation is in `assets/talking-video/build_talking_video.py`. The orchestrator reads a JSON spec (`concepts.json`) and produces all videos in one run.

---

## Safe ElevenLabs voices (tested & working)

All voices work directly via the standard TTS endpoint — no need to add shared voices to your account first.

### Built-in library (always available)
| Name | voice_id | Best for |
|---|---|---|
| Jessica | `cgSgspJ2msm6clMCkdW9` | Playful, bright, warm — Gen-Z confessional |
| Matilda | `XrExE9yKIg1WjnnlVkGX` | Knowledgable, professional, raspy — vulnerable testimonial |
| Sarah | `EXAVITQu4vr4xnSDxMaL` | Soft, breathy — empathetic confessional |
| Aria | `9BWtsMINqrJLrRacOk9x` | Confident, radiant — results testimonial |

### Shared library (works without adding — TTS endpoint resolves)
| Name | voice_id | Best for |
|---|---|---|
| Daphne | `cR39HTrtXbjvEP4CNYFx` | Sweet, calm, friendly — soft persuasion |
| Eryn | `DXFkLCBUTmvXpp2QwZjA` | Friendly American female — clean delivery |
| Olivia | `YZHSTqsq1isdXNsFLzBw` | Smooth, charming, persuasive young American — sales energy |
| Ava | `x8syuETaTA9JYwAbE2JM` | Captivating, clear young South African — energetic UGC |

**Avoid male voices** for female-creator UGC unless you explicitly want voice/face mismatch as a creative choice.

### Voice settings that work
```json
{
  "model_id": "eleven_multilingual_v2",
  "speed": 1.05,
  "stability": 0.45,
  "similarity_boost": 0.8,
  "style": 0.5,
  "use_speaker_boost": true
}
```

---

## Safe music (tested & working)

Background music must be **loudness-normalized** before mixing or it'll be too quiet at 50% volume (the perceived loudness depends on the source's mastering, not just the gain factor).

### Recipe: pre-bake a 30s music bed

```bash
# Source: any 7–60s clip. Loop with -stream_loop, loudnorm to -16 LUFS, fade-in.
ffmpeg -y -stream_loop -1 -i "SOURCE.mp3" -t 32 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.4" \
  -c:a libmp3lame -q:a 2 "music_bed_30s.mp3"
```

### Recommended sources
| Track | Where to get | Vibe |
|---|---|---|
| **childhood — daniel & Zamaro** | TikTok lo-fi piano | Default. Mellow piano, no vocals. Works under any narration. |
| Je te laisserai des mots — Patrick Watson | TikTok emotional/transformation | More cinematic, slight French murmurs. Good for "before/after" arcs. |
| lilacs — slowed | TikTok ambient | Very quiet — needs +6dB boost vs childhood. |

Download via `yt-dlp -x --audio-format mp3 "TIKTOK_URL"`.

### Music mix in ffmpeg
```bash
# Inside the final mix step (see build script for full version)
-filter_complex "
  [0:a]volume=1.0[vo];
  [1:a]atrim=0:30,asetpts=PTS-STARTPTS,volume=0.5,afade=t=out:st=28.5:d=1.5[m];
  [vo][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.97[a]
"
```

`normalize=0` preserves VO loudness; `alimiter=limit=0.97` prevents clipping on amplitude spikes.

---

## Script writing: 5 proven hook families

These hook families are battle-tested in the AiPixo + PCOS Pal runs. Each script is ~75–82 words for a 30s VO at speed=1.05.

### Family 1 — Deception ("help I used this and...")
Pattern: creator confesses they used the app in a real high-stakes situation; nobody noticed; mild guilt + smug satisfaction.
```
[hook] "Help, I used [APP] for [HIGH STAKES SITUATION] and [SURPRISING POSITIVE OUTCOME]."
[context] "I uploaded [ONE BASIC INPUT] into [APP]."
[reveal] "It gave me [POLISHED RESULT] that looks like [EXPENSIVE ALTERNATIVE]."
[social proof] "[SOMEONE IMPORTANT] responded with [POSITIVE REACTION]."
[twist] "Nobody knew. Nobody asked."
[cta] "[APP NAME]. On the App Store."
```

### Family 2 — Identity Dream ("never had X until Z")
Pattern: aspirational quiet pride. The creator gets something they always wanted but couldn't afford/access.
```
[hook] "I never had [DESIRED THING] until [APP]."
[context] "I don't [HAVE PRIVILEGED ACCESS]. I tried this instead."
[reveal] "[APP] gave me [BEAUTIFUL RESULT]."
[emotion] "I cried a little. / I just sat with it."
[cta] "[APP NAME]. App Store."
```

### Family 3 — Social Problem ("the reason X was Y")
Pattern: specific real-life pain point first, app as the explanation/solution. Story IS the hook.
```
[hook] "The reason I [SPECIFIC PROBLEM] was [UNEXPECTED CAUSE] and I didn't know it."
[context] "I tried [USUAL FIXES]. Nothing worked."
[discovery] "Then I found [APP]."
[result] "[SPECIFIC METRIC]. [VISIBLE CHANGE]."
[cta] "[APP NAME]. App Store."
```

### Family 4 — Genuine Shock ("this isn't real / I cried")
Pattern: unfiltered reaction to result quality. Creator's face IS the proof.
```
[hook] "I uploaded [ONE THING] and this app made me [STRONG EMOTION]."
[reveal] "This is not [WHAT IT LOOKS LIKE]. I took this [HUMBLE INPUT]."
[social proof] "I showed [PERSON] and they asked [BELIEF-BREAKING QUESTION]."
[cta] "[APP NAME]. On the App Store. Go."
```

### Family 5 — Which Is Real ("can you tell?")
Pattern: engagement bait. Forces a comment. Comments do the work.
```
[hook] "Which of these is AI and which is real?"
[setup] "I showed these to [N] people and [N-1] guessed wrong."
[context] "I uploaded [INPUT] into [APP]."
[invitation] "Comment your guess."
[cta] "[APP NAME]. App Store."
```

---

## Compliance — Facebook personal attributes

Facebook ad policy bans ads that **assert the viewer has a personal attribute** (health condition, identity, etc.). For VO scripts AND captions:

| ❌ Banned phrasing | ✅ Safe replacement |
|---|---|
| `your PCOS` | `my PCOS` / `women with PCOS` |
| `your acne` | `my acne` / `if you struggle with acne` |
| `you have anxiety` | `I struggle with anxiety` / `people with anxiety` |
| `your bad photos` | `my bad photos` / `if your photos are anything like mine were` |

**Auto-audit step:** before producing, grep your VO + caption text for `your [WORD]` patterns and flag for review.

```bash
# Audit hook
grep -iE "your (pcos|acne|anxiety|depression|diabetes|fertility|...)" concepts.json
```

---

## Demo requirements

What "good demo material" looks like:

| Type | Description | Why |
|---|---|---|
| **Money shot** | The single most jaw-dropping result the app produces (e.g. a cinematic AI photo, a transformation reveal) | This is the "AHA" frame; goes in second demo slot (15–21s) |
| **Browser/UI shot** | App home or template gallery showing variety | First demo slot (9–15s); shows the app has range |
| **Scanner/input shot** | Camera/upload moment | Sets up the "they used the simplest input" framing |
| **Result animation** | Loading → reveal | Builds anticipation; great for "shock" family |

**Avoid in demos:**
- Loading screens with nothing happening (>2s)
- Settings/account/login screens
- Anything that looks broken or has placeholder data
- Landscape orientation (will get letterboxed)

**Minimum:** 4 distinct demo clips for a 20-video batch (you'll rotate them).
**Ideal:** 6–10 distinct demos = more variety, less repetition across batch.

Each demo clip should have at least 3 visually distinct seconds you can extract as a cutaway.

---

## Caption workflow (CapCut-style auto-sync)

This is the differentiator vs. the classic pipeline.

### Why hand-timed captions fail
If you write captions like `{"start": 6.5, "end": 9.0, "text": "oats SPIKED my insulin"}` and the actual VO says "oats spiked my insulin" at 5.2–8.1s, the caption will appear over the wrong word. Audiences notice instantly.

### How auto-sync works
1. Use ElevenLabs `/v1/text-to-speech/{voice}/with-timestamps` (returns audio + per-character start/end times)
2. Parse the character alignment into words (split on whitespace)
3. Group words into 2-3 word phrases (break on punctuation, max 1.1s duration per phrase)
4. When you atempo-fit the VO to a target duration (e.g. raw 33s → 30s with tempo=1.1), divide every phrase timestamp by the same tempo factor
5. Each phrase becomes a `drawtext` filter with `enable='between(t,start,end)'`

### Phrase styling rules
- **Font:** TikTok Sans Display Black, fontsize 78 (≤14 chars) or 66 (longer)
- **Color:** white default, yellow `#FFE600` if phrase contains an emphasis word
- **Position:** `x=(w-text_w)/2, y=h*0.60` (mid-lower, centered)
- **Border:** `borderw=8 bordercolor=black` for legibility on any background
- **Wrap:** if text > 18 chars, split into 2 lines at nearest space to middle (use `text_align=C+M`)
- **Emphasis words** are domain-specific — define a per-project set (e.g. `{"pcos", "insulin", "broke"}` for PCOS; `{"aipixo", "linkedin", "hinge", "paris"}` for AiPixo)

### CTA reservation
The last 4s (`t=26 → t=30` for a 30s video) is reserved for the big CTA card. Auto-captions are clipped to end at `t=26` to avoid visual conflict. The CTA renders as:
```
drawtext=fontsize=92:fontcolor=#FFE600:borderw=10:line_spacing=12:text_align=C+M:y=h*0.65
```

---

## JSON spec format

The `build_talking_video.py` script reads a `concepts.json` file with this shape:

```json
{
  "common": {
    "elevenlabs_api_key": "ENV_OR_PASTED",
    "model_id": "eleven_multilingual_v2",
    "speed": 1.05,
    "stability": 0.45,
    "similarity_boost": 0.8,
    "style": 0.5,
    "font": "/Users/.../TikTokSansDisplayBlack.ttf",
    "demos_dir": "/abs/path/to/demos",
    "reactions_dir": "/abs/path/to/reactions",
    "out_dir": "/abs/path/to/output/myapp_v1",
    "music_path": "/abs/path/to/music_bed_30s.mp3",
    "music_volume": 0.5,
    "cta_text": "MYAPP\non AppStore",
    "target_duration": 30.0,
    "emphasis_words": ["myapp", "ai", "obsessed", "free"]
  },
  "concepts": [
    {
      "name": "01_deception_linkedin",
      "voice_id": "x8syuETaTA9JYwAbE2JM",
      "voice_name": "Ava",
      "vo_text": "Help, I used AI photos for my LinkedIn... PCOS Pal — wait, MYAPP — on the App Store.",
      "timeline": [
        {"src": "reactions/folder/clip1.mp4", "in": 1.0, "dur": 3.0},
        {"src": "reactions/folder/clip2.mp4", "in": 1.0, "dur": 3.0},
        {"src": "reactions/folder/clip3.mov", "in": 0.5, "dur": 3.0},
        {"src": "demos/demo_browser.mov", "in": 1.5, "dur": 6.0},
        {"src": "demos/demo_reveal.mov", "in": 2.0, "dur": 6.0},
        {"src": "reactions/folder/clip4.mp4", "in": 2.0, "dur": 4.0},
        {"src": "reactions/folder/clip5.mp4", "in": 2.0, "dur": 5.0}
      ]
    }
  ]
}
```

Path resolution: `demos/foo.mov` → `{demos_dir}/foo.mov`. `reactions/sub/bar.mov` → `{reactions_dir}/sub/bar.mov`. Absolute paths used as-is.

A starter `concepts_template.json` lives in `assets/talking-video/`.

---

## Build commands

```bash
# Build all concepts in the spec
python3 assets/talking-video/build_talking_video.py path/to/concepts.json

# Build only a subset (comma-separated IDs matching the first underscore-segment of `name`)
ONLY="01,05,09" python3 assets/talking-video/build_talking_video.py path/to/concepts.json
```

The script logs per-concept progress and prints a duration/size table at the end. Outputs land in `common.out_dir/myapp_<name>.mp4`.

---

## Recommended order of operations

1. **Confirm requirements** with the user (use the checklist above)
2. **Preflight** (`ffmpeg`, `ffprobe`, `ELEVENLABS_API_KEY`, TikTok Sans font)
3. **Inventory** what you have:
   - List local reaction clips (or DanSUGC model_ids)
   - List demo files (`ffprobe` for duration + resolution)
   - Identify 4–6 "money shot" cutaways from demos
4. **Pre-bake the music bed** (loop + loudnorm to −16 LUFS, 30s output)
5. **Write N scripts** mapping to hook families (one per family rotated to cover variety)
6. **Build the JSON spec** with per-concept timelines
7. **Audit** for "your X" compliance issues
8. **Run the orchestrator** — first 5 only for review (`ONLY=01,05,...`)
9. **Spot-check** 3–4 frames per video (hook, demo, CTA)
10. **Produce the remaining** if first 5 look good
11. **Hand off** for client review or proceed to scheduling via DanSUGC Posting / Post-Bridge

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Captions land off-beat from VO | Using hand-coded timestamps | Switch to `/with-timestamps` endpoint and the auto-phrase grouper |
| Captions visible after CTA card appears | Body caption end > video_dur − 4s | Cap each phrase's `end` to `video_dur − CTA_RESERVE` |
| Music inaudible at "50%" | Source was −25 LUFS or quieter | Loudnorm to −16 LUFS BEFORE applying the volume gain |
| VO clips at file boundaries | atempo factor outside [0.5, 2.0] | Chain two atempo filters: `atempo=0.5,atempo=<rem>` |
| Reaction file not found | `.mp4` vs `.mov` mismatch | Add an extension auto-fix pass that swaps to whatever exists |
| Cuts feel jarring | Same clip filename but different visual content at chosen `in` | Always check the actual frames at `in` and `in+dur` — don't trust manifest descriptions blindly |
| Letterbox bars on some clips | Source is landscape, no rotation metadata | Accept the pad (face still readable) OR re-frame with `crop` filter |
| Final video length off by ±0.1s | Concat demuxer keyframe rounding | Add `-t <target_duration>` to the final mux step |
| "your X" caught in compliance audit | LLM-written script slipped through | Auto-rewrite to `my X` or `women with X`, re-audit |

---

## Outputs from past runs (proof of concept)

This workflow was developed across these batches:
- **PCOS Pal** — 10 videos, 4 models (Angelika/Franci/Emilia/Kris), 4 voices (Daphne/Eryn/Olivia/Ava)
- **AiPixo** — 20 videos, 1 model (Kris), 1 voice (Ava), 5 hook families × 4 variants each

Both used identical pipeline: ElevenLabs with-timestamps → atempo-fit → word phrase grouping → drawtext burn + CTA card → music mix.
