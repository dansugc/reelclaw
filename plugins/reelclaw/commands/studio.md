---
description: Make 1-5 polished UGC ads locally with HyperFrames (DansUGC ReelClaw studio mode)
argument-hint: "[what to make: count, template, demo path, hook ideas, edits]"
---

Use the `reelclaw-ads` skill in **studio mode** (SKILL.md section 4) to make polished UGC ads for
the product in this repository, rendered locally with the reelclaw HyperFrames templates.

Request from the user: $ARGUMENTS

How to read the request:
- A number is how many ads (studio mode is for 1-5; if they ask for more, suggest volume mode with
  `/reelclaw:new` or offer to make the best 5 here).
- A template name (`reaction_demo`, `no_yapping`, `greenscreen_reaction`) picks the format;
  otherwise use `reaction_demo` for app ads.
- A path ending in `.mp4`/`.mov` is the demo (or the background video for greenscreen).
- Anything else is creative direction, hook ideas, or specific edits (caption style/position,
  timing, trims) to apply.

Follow the skill end to end: preflight (Node >= 22, ffmpeg/ffprobe), show the product brief from
the repo, find the demo, write hooks with me, pick reactions from the DansUGC library (quote the
clip price with `purchase_videos` first and WAIT for my explicit yes before buying; owned clips
are free), install one template copy per reel under `./reelclaw-studio/`, generate + render with
`scripts/run-generator.mjs`, then run the QA loop: look at every QA frame, fix, and re-render (max 3
passes). Deliver to `./reelclaw-output/studio/` with a short QA summary. Editing and rendering are
included with the Growth or Scale plan; only clips and research queries cost credits.
