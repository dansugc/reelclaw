# Studio QA checklist (mandatory before delivering)

`run-generator.mjs --render` runs `scripts/qa-frames.sh` for you. By hand:

```sh
sh <skill-dir>/scripts/qa-frames.sh <template-dir>/renders/<name>.mp4 <template-dir>/qa/<name> <cut-seconds>
```

It writes `f-0.0s.png f-0.5s.png f-1.0s.png f-hook-end.png f-after-cut.png f-last.png`
(540×960, thin green box = the text safe band), `font-check.png` (full-res caption band at 1 s),
`contact-sheet.png` (2 frames/s), and `report.txt` (resolution, fps, duration, audio level, black
frames, freezes). If the render log had silent-failure signatures, `render-warnings.txt` is there too.

**Look at every image.** Claude Code: open each `.png` with the Read tool. Codex: `view_image` on
each path. Do not judge from `report.txt` alone, and never deliver a render you haven't looked at.

## Checklist

| # | Check | Where | Pass when | Typical fix |
|---|---|---|---|---|
| 1 | No render warnings | run-generator output, `render-warnings.txt` | none | see "Render warnings" below |
| 2 | Canvas | `report.txt` | 1080x1920, 30/1 | only a custom edit can break this; re-check `data-width/height` |
| 3 | Duration on target | `report.txt` | 10-15 s for reaction_demo (≤ 30-40 s no_yapping) | trim the demo (footage.md), lower `reaction-secs`/`intro-secs`, `demo-secs` |
| 4 | TikTok Sans rendered | `font-check.png` | compact letters, tall x-height, tight spacing, the same letterforms TikTok uses for its own captions | a fallback font (Helvetica/Arial/DejaVu) is wider and looser, and lines break earlier: restore `assets/fonts/TikTokSans-Variable.ttf` / the `@font-face` |
| 5 | Every caption inside the safe box | all frames | no letter crosses the green box (x 180-900, y 220-1420); a snapchat-style bar may span the width, its text may not | `hook-position`, shorter text, `hook-size`/`step-size` down, or exact CSS position (hyperframes-editing.md) |
| 6 | Hook readable within 1 s | `f-0.5s`, `f-1.0s` | fully on screen at 0.0 s, ≤ 3 lines, ≤ ~80 chars, high contrast | shorten the hook; move it off busy areas; captions are static by design |
| 7 | Nothing competes with the hook | `f-0.0s` … `f-hook-end` | no burned-in text, watermark, or UI in the reaction footage | pick another clip, or a `trim` window without text; move the hook away from it |
| 8 | Scroll-stop first frame | `f-0.0s` | a face with a strong expression, large in frame, already mid-reaction | adjust `trim` so frame 0 is already expressive (footage.md trim sheet) |
| 9 | Reaction ≤ 3 s, cut on its beat | `f-hook-end`, contact sheet | peak expression visible before the cut; cut lands right after it, not in a dead moment or mid-blink | `trim`, `reaction-secs` (≤ 3) |
| 10 | Demo shows the aha within ~2 s of the cut | `f-after-cut`, next 4 sheet frames | the product doing the thing is on screen; not a blank page, loading, or a login | pre-trim the demo to start at the aha (footage.md) |
| 11 | Demo readable | `f-after-cut`, `f-last` | key UI not cropped off the sides | portrait recording; or `demo-fit: contain` (no_yapping) / blurred-letterbox edit (reaction_demo) |
| 12 | Captions over the demo don't hide the aha | sheet | hook2 / steps sit over empty areas | `hook2-position`, shorter steps |
| 13 | Payoff lands | `f-last`, sheet | final caption (hook2 / last step) on screen ≥ 1.5 s | give earlier steps explicit `:: secs` so the last one keeps ≥ 1.5 s |
| 14 | No black / frozen frames | `report.txt`, sheet | `black: none`; freezes only where the screen is genuinely static | a clip ran out: longer source, lower durations; sparse keyframes are re-encoded by run-generator |
| 15 | Audio | `report.txt` | music or clip audio present, not `SILENT`, unless the user chose silent for an organic post (trending sound added in-app) | `music` (+ `music-volume` 0.6-0.8), `reaction-volume`/`demo-volume` |
| 16 | Music ends cleanly | `report.txt` audio line ("last 0.5s") | with `music`: the last 0.5 s is ~8+ dB below the mean (the 0.8 s fade ran; it needs GSAP) | a GSAP warning → re-run run-generator; `music` shorter than the reel ends early → earlier `music-start` or a longer track |
| 17 | Nothing private on screen | sheet | no API keys, emails, customer data, notifications | re-record or trim the demo |
| 18 | Truthful | all text | every claim is backed by the repo/user (numbers, "free", results) | rewrite the hook/caption |

Report the result to the user as a short list: pass / fixed / still off.

## Render warnings (render exits 0 but the video is broken)

run-generator scans the HyperFrames log (`renders/<name>.render.log`) for these:

| Warning | Meaning | Fix |
|---|---|---|
| a script (GSAP) failed to load | every animation and the music fade dropped | re-run run-generator (it vendors `assets/gsap.min.js`); check your edit didn't restore the CDN `<script>` |
| a font failed to load | captions in a fallback font (can be masked on machines with TikTok Sans installed) | fix the `@font-face` path; the file is `assets/fonts/TikTokSans-Variable.ttf` |
| an asset failed to load | a video/audio/image is missing from the frame or mix | fix the `src` path; paths are relative to the template dir |
| sparse keyframes | seeks land on old frames: frozen or stuttering video | run-generator re-encodes media it stages; for media you placed by hand, re-encode with `-g 30 -keyint_min 30` |
| script error | your composition edit throws | undo the last edit; check ids and the `window.__timelines` key |

## Loop rules

- Max 3 render passes per reel. Each pass: change one or two things, re-render, look again.
- Params changes → re-run run-generator with `--render`. Composition edits → `--render-only`
  (regenerating overwrites hand edits).
- After 3 passes, deliver the best render and tell the user exactly what's still off and why (e.g.
  "the reaction clip has burned-in text; a different clip would fix it").
