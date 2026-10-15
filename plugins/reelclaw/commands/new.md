---
description: Make UGC reaction + demo ads for this project with DansUGC ReelClaw, edited and rendered locally
argument-hint: "[count] [template] [path/to/demo.mp4] [hook ideas, creative direction, edits]"
---

Use the `reelclaw` skill to make UGC ads for the product in this repository with DansUGC ReelClaw.
You edit and render every reel on this machine with the ReelClaw HyperFrames templates; the
`dansugc` MCP server only supplies clips, viral formats, trending music and research.

Request from the user: $ARGUMENTS

How to read the request:
- A number is how many ads (default 3). More than 5: plan concepts × hook variants with the
  skill's section 3 and tell me the plan before buying anything.
- A template name (`reaction_demo`, `no_yapping`, `greenscreen_reaction`) picks the format;
  otherwise use `reaction_demo` for app ads.
- A path ending in `.mp4`/`.mov` is the demo (or the background video for greenscreen).
- Anything else is creative direction, hook ideas, or specific edits (caption style/position,
  timing, trims) to apply.

Follow the skill end to end: preflight (Node >= 22, ffmpeg/ffprobe), show the product brief from
the repo, find the demo, suggest viral formats if I'm unsure, write hooks with me, pick reactions
from the DansUGC library (quote the clip price with `purchase_videos` first and WAIT for my explicit
yes before buying; owned clips are free), install one template copy per concept under
`./reelclaw-studio/`, generate + render with `scripts/run-generator.mjs`, then run the QA loop: look
at every QA frame, fix, and re-render (max 3 passes). Deliver to `./reelclaw-output/` with a short
QA summary. Editing and rendering are free and local; only clips and research queries cost credits.
