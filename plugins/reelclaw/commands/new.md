---
description: Make UGC reaction + demo ads for this project with DansUGC ReelClaw (routes to volume or studio mode)
argument-hint: "[count] [path/to/demo.mp4 or demo URL] [creative direction]"
---

Use the `reelclaw-ads` skill to make UGC ads for the product in this repository with DansUGC ReelClaw.

Request from the user: $ARGUMENTS

How to read the request:
- A number is the video count (default 10 if none is given; max 60).
- A path ending in `.mp4`/`.mov` is the demo; an `https://` link to an `.mp4`/`.mov` is a demo `source_url`.
- Anything else is creative direction (audience, tone, language, angle).

Pick the mode with the skill's section 1: 6+ ads or "fast" → **volume mode** (hosted engine);
1-5 polished ads, specific edits, or the no-yapping / greenscreen formats → **studio mode** (local
HyperFrames, same as `/reelclaw:studio`). If unclear, ask once with your pick pre-filled.

Volume mode end to end: show the brief from the repo, find or ask for a demo, research the batch,
rewrite and review the hooks with me, upload the demo, quote the price and WAIT for my explicit yes
before rendering, then poll, download to `./reelclaw-output/<batch_id>/`, and summarize with the
dashboard link.

Studio mode end to end: follow SKILL.md section 4, including the mandatory QA loop, and deliver to
`./reelclaw-output/studio/`.
