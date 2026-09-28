# Footage: reactions from the DansUGC library + the demo

## Reactions (studio mode)

Every DansUGC reaction is a real human creator. Pick the emotion first, then the clip.

### Emotion → hook pairing (ranked by what tends to stop the scroll)

| Emotion (`search_videos` `emotion`) | Pairs with | Example hook |
|---|---|---|
| `shocked` / `surprised` / `amazed` | a surprising reveal, number, or capability | "why did nobody tell me this app exists" |
| `sad` (crying) | relatable pain, then relief | "me after losing another evening to reels" |
| `angry` | injustice, "they don't want you to know" (keep it truthful) | "i paid for 3 apps that do less than this" |
| `laughing` / `playful` | absurd situation, self-roast | "my phone making me do pushups to open instagram" |
| `confused` / `curious` | myth-busting, "wait, how?" | "wait you can just do this??" |
| `excited` / `happy` | wins, before/after | "my screen time before this app vs after" |
| `neutral` / `confident` | deadpan understatement | "anyway i fixed my sleep" |

Valid `emotion` values (lowercase): neutral, happy, playful, confident, surprised, confused,
shocked, laughing, curious, amazed, excited, sad, angry.

### Find

```
search_videos { semantic_search: "shocked young woman staring at her phone", limit: 12 }
search_videos { emotion: "shocked", gender: "female", min_virality: 70, sort_by: "virality_score", limit: 12 }
```

Filters that help: `emotion`, `gender`, `age_range` (match the product's buyer), `location`
(Bedroom/Car/… match the hook's scene), `min_virality`, `sort_by: "virality_score"`. Each result
shows price, duration, emotion, virality, creator, and a `Preview` URL. Free to search.

Already own clips? `list_purchases { emotion: "shocked" }` (or `semantic_search`) lists them with a
download link; `get_video { video_id }` also returns one for a clip the account owns. Owned clips
are never charged again. Prefer them when they fit.

**Teams.** Clips, credits, and purchases belong to an account: the Personal Account (omit
`project_id`) or a team (`project_id` from `list_accounts`). Search, prices, ownership, and the
charge all follow the `project_id` you pass, and team-bought clips belong to the team (teammates
re-download them with `list_purchases` / `get_video` + that `project_id`). Keep one account per
conversation unless the user says otherwise; never switch on your own.

### Compare before buying (no charge)

Look at the peak moment of each candidate from its preview URL; don't render deliverables from
previews:

```sh
mkdir -p reelclaw-studio/footage/previews
ffmpeg -v error -y -i "<preview_url>" -t 5 -vf "fps=4,scale=160:-2,tile=10x2" \
  -frames:v 1 reelclaw-studio/footage/previews/<video_id>.png
```

View the sheets (Read / `view_image`). Keep clips where the expression peaks in the first 0.5-1.5 s,
the face is large and lit, the background is clean, and there is **no burned-in text** (it would
collide with your hook). Vertical clips need no cropping.

### Buy (two-step; charges credits only on the second call)

1. **Quote:** `purchase_videos { video_ids: [...], project_id? }` WITHOUT `expected_total_cents`.
   It charges nothing and returns the exact total in credits and the account that will be charged.
   Use that total; never multiply per-clip prices yourself (already-owned clips are 0 and the
   quote shows the list price and any plan discount).
2. Show it plainly in credits and STOP for an explicit yes, e.g.
   "2 clips · **22 credits** from your Personal Account (balance 245.50 credits). Buy?" or, for a
   team, "… **22 credits** from the *Acme* team's credits. Buy?". Before the first spend on a team
   in a conversation, always name the team and the amount.
3. **Buy:** after the yes, call again with the SAME `video_ids` (+ the same `project_id`) plus
   `expected_total_cents` from step 1 (hundredths of a credit, e.g. 2200 = 22 credits; or pass
   `expected_total_credits: 22`) (max 50 clips). It returns a signed `download_url` per clip,
   valid about 1 hour; already-owned clips come back under "Already Purchased", free. If it reports a
   total different from the one you showed, don't retry blindly: re-quote and re-confirm. Never construct download URLs yourself.
4. Download right away (quote the URL; it contains `&`):
   ```sh
   mkdir -p reelclaw-studio/footage
   curl -fL -o reelclaw-studio/footage/reaction-shocked-1.mp4 "<download_url>"
   ```
   Link expired? Get a fresh one from `list_purchases` / `get_video` (same `project_id`); owned
   clips are free to re-download.

### No purchase path

The user's own clips (anything they have rights to) work the same way: put them in
`reelclaw-studio/footage/`. Never pull someone else's TikTok as a reaction.

### Pick the trim (the reaction beat)

The hook segment is ≤ 3 s, so it must start just before the peak expression and cut right after
it lands. Make a 4 fps sheet of the first 6 s with timestamps:

```sh
ffmpeg -v error -y -i reelclaw-studio/footage/reaction-shocked-1.mp4 -t 6 \
  -vf "fps=4,scale=180:-2,drawtext=text='%{pts\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=8x3" \
  -frames:v 1 reelclaw-studio/footage/reaction-shocked-1-sheet.png
```

(If `drawtext` is unavailable in this ffmpeg build, drop the `drawtext=…,` part: frames are 0.25 s
apart, left to right.) Set `trim` so the peak is visible by ~0.5 s into the segment and
`reaction-secs` (≤ 3) so the cut lands just after the peak (the reaction "beat"), not in a dead
moment.

## The demo

- Source: the repo (step 2 of SKILL.md), the user, or a quick screen recording they make.
- `reaction_demo` plays the whole demo file. Aim for a 7-12 s demo so the reel is 10-15 s. The
  aha must be on screen within ~2 s of the cut. Trim (re-encode for frame accuracy):
  ```sh
  ffmpeg -v error -y -ss <start> -i demo.mp4 -t <seconds> -c:v libx264 -crf 18 -pix_fmt yuv420p \
    -g 30 -keyint_min 30 -c:a aac -movflags +faststart reelclaw-studio/footage/demo-aha.mp4
  ```
  (`-g 30` = a keyframe every second; HyperFrames seeks badly in sparse-keyframe video.)
  Speed up a slow section instead of cutting it: add `-vf "setpts=PTS/1.5" -af "atempo=1.5"`.
- Aspect: output is 9:16 with `object-fit: cover`. A portrait phone recording is ideal. A 3:4 or
  landscape recording loses its sides; check the "after cut" QA frame. Recordings with their own
  baked-in black bars keep them (cropdetect + `crop` can remove constant bars first). For desktop recordings use
  `no_yapping` with `demo-fit: contain`, or a composition edit (hyperframes-editing.md).
- No secrets on screen (API keys, emails, customer data) — check the QA contact sheet.
