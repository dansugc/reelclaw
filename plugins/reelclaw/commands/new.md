---
description: Make UGC reaction + demo ads (or any of the 7 reelclaw formats) for this project with DansUGC ReelClaw, edited and rendered locally
argument-hint: "[count] [template] [path/to/demo.mp4] [hook ideas, creative direction, edits]"
---

Use the `reelclaw` skill to make short-form ads for the product in this repository with DansUGC
ReelClaw. You edit and render every reel on this machine with the reelclaw engine in one reel
project, `./reelclaw-studio/`; the `dansugc` MCP server only supplies clips, viral formats, trending
music, research and posting.

Request from the user: $ARGUMENTS

How to read the request:
- A number is how many ads (default 3). More than 5: plan concepts × hook variants (the playbook's
  variants guide) and tell me the plan, including any clip quote, before buying or rendering.
- A template id picks the format: `reaction-demo`, `wall-of-text`, `listicle`, `no-yapping`,
  `greenscreen-reaction`, `talking-head-captions`, `before-after` (snake_case aliases like
  `reaction_demo` also work). Otherwise use `reaction-demo` for app ads, or suggest formats if I'm
  unsure.
- A path ending in `.mp4`/`.mov` is the demo (or the background video for `greenscreen-reaction`).
- Anything else is creative direction, hook ideas, or specific edits (caption style/position,
  timing, trims) to apply.

Follow the skill end to end: set up or reuse `./reelclaw-studio/` with the skill's installer
(`<installer> add <template…> --dir reelclaw-studio`; ask before touching `.gitignore`), run
`npx reelclaw doctor` inside it, then load the installed `reelclaw-playbook` skill and the
template's SKILL.md and follow them: brief from the repo, demo, viral formats if I'm unsure, hooks
with me, footage (my own clips, or DansUGC reactions: quote with `purchase_videos` first and WAIT
for my explicit yes before buying; owned clips are free), music, then
`npx reelclaw make <template> --props … --draft` (renders and runs `npx reelclaw qa`), look at every
QA frame, fix and re-make (max 3 passes), `npx reelclaw batch` for hook variants, and
`npx reelclaw render` for finals. Deliver to `./reelclaw-output/` with a short QA summary and the
credits spent. Editing and rendering are free and local; only clips and research queries cost
credits.
