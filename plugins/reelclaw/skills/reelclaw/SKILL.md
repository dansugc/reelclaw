---
name: reelclaw
description: Make short-form UGC video ads (TikTok, Reels, Shorts) for the product in the current repo with DansUGC ReelClaw and real human creator reactions from the DansUGC library, or with the user's own footage. You edit and render every reel locally on this machine with the reelclaw template engine (7 templates, TikTok Sans, safe-zone captions) and its reelclaw-playbook skill, and check each render frame by frame before delivering. The dansugc MCP server supplies the reaction clips, viral-format suggestions, trending music, research and posting; it does not render. Use when the user asks for UGC ads, reaction ads, TikTok/Reels ads, "make N ads for this app", ReelClaw, DansUGC videos, HyperFrames reels, "make viral reels" when the user is unsure which formats to use, hook variations of an ad, or editing or re-cutting an ad (caption style, position, timing, trims).
license: MIT
metadata:
  author: DansUGC
  version: "3.0.0"
---

# DansUGC ReelClaw: UGC ads from your repo, edited locally

You are the producer and the editor. The open-source **reelclaw** engine
([danielhangan/reelclaw-templates](https://github.com/danielhangan/reelclaw-templates)) turns inputs
into a 1080×1920 MP4 and ships the craft (brief, hooks, footage, music, QA, variants) as the
`reelclaw-playbook` skill. This skill is the DansUGC layer on top: connecting, credits, accounts,
real-creator clips, viral formats, trending music, research and posting. DansUGC reactions are
always real human creators, never AI; never claim or imply otherwise. Always write the brand as
**DansUGC** (lowercase s, capital UGC). DansUGC is optional footage: the user's own clips work too.

## 0. Connect and costs

- Tools live on the `dansugc` MCP server. Clients may prefix them
  (`mcp__plugin_reelclaw_dansugc__…` in Claude Code, `mcp__dansugc__…` when added by hand). This
  skill uses bare names: `search_videos`, `purchase_videos`, `reelclaw_suggest_formats`,
  `reelclaw_trending_music`, `tiktok_search_videos`, `get_media_upload_url`, … Map:
  [references/tools.md](references/tools.md).
- The MCP server does **not** render or edit videos. There are no batch or render tools: all editing
  and rendering happens on this machine (section 1). If a tool you expected is missing, see
  [references/errors.md](references/errors.md#removed-tools).
- No `dansugc` tools? Tell the user how to connect, then stop (or continue with their own footage if
  they prefer):
  - Claude Code: `/plugin marketplace add dansugc/reelclaw` + `/plugin install reelclaw@dansugc`
    (or `claude mcp add --transport http dansugc https://dansugc.com/mcp`), then `/mcp` → the server
    (`plugin:reelclaw:dansugc`, or `dansugc` if added by hand) → Authenticate.
  - Codex: `codex plugin marketplace add dansugc/reelclaw` + `codex plugin add reelclaw@dansugc`
    (or `codex mcp add dansugc --url https://dansugc.com/mcp`), then `codex mcp login dansugc`.
  - Any other agent: add the remote MCP server `https://dansugc.com/mcp` (no headers) and log in
    when the client prompts.
  - Auth is OAuth only (browser login with the DansUGC account). Never ask for or suggest an API
    key. If a tool says it "no longer accepts API keys — reconnect with OAuth", see
    [references/errors.md](references/errors.md).
- Cost (say it when asked, and before anything is spent): the MCP works on any DansUGC account, no
  plan needed (a plan only adds bonus credits and clip discounts). **Editing and rendering are local
  and free.** Users pay only for (a) reaction clips they don't already own (library clips are 11
  credits each, images 8, less the plan's discount; owned clips are never charged again) and (b)
  research queries through the MCP (TikTok/Instagram search, `reelclaw_trending_music`: 0.02
  credits per query, only on success). `reelclaw_suggest_formats` and `search_videos` are free.
  Top up at https://dansugc.com/dashboard/credits.
- **Talk in credits.** Every price, quote, and balance is in DansUGC credits ("11 credits per
  clip", "Total: 104.50 credits", "Balance: 245.50 credits"). Never write "$" amounts; only convert
  to dollars if the user explicitly asks, and then say the credit amount first. Totals come from
  the tools (the `purchase_videos` quote step), never from multiplying per-clip prices yourself
  (owned clips are free and the plan discount is applied for you).
- **Accounts.** A user has a Personal Account and may belong to teams (each with its own credits
  and plan discounts). When the user mentions a team, company, or teammate, or a spend fails for
  low personal balance, call `list_accounts` and pass that team's `project_id` to every account
  tool (`search_videos`, `get_video`, `purchase_videos`, `list_purchases`, `get_balance`, the
  research tools, `reelclaw_suggest_formats`, `reelclaw_trending_music`). Omit `project_id` for the
  Personal Account. Never switch accounts on your own; before the first spend on a team in a
  conversation, name the team and the amount and get an explicit yes.
- Tool results are JSON or Markdown; follow any `next_action`. Summarize; don't dump raw output.

## 1. Set up the studio (once per repo)

Work from the root of the user's product repo. All reels live in **one** reel project,
`reelclaw-studio/`; finals go to `./reelclaw-output/`.

1. **Installer** (`<installer>` below). Until the `reelclaw` npm package is published it is
   `npx --yes github:danielhangan/reelclaw-templates`; this prints the right one:
   ```sh
   npm view reelclaw repository.url 2>/dev/null | grep -q danielhangan/reelclaw-templates \
     && echo "npx --yes reelclaw@latest" || echo "npx --yes github:danielhangan/reelclaw-templates"
   ```
   Where the playbook or a template skill says `npx reelclaw@latest add`, use `<installer> add`.
2. **Create or reuse the project.** `reelclaw-studio/templates/` exists → reuse it (`ls` it to see
   the installed templates). Otherwise, or to add templates (safe to re-run; edited templates are
   kept): `<installer> add reaction-demo [<template> …] --dir reelclaw-studio`. It installs the
   templates, the engine (`npm install`), the `reelclaw-playbook` skill and runs `doctor`. Ids are
   kebab-case (`reaction_demo`-style ids still work as aliases). Offer to add `reelclaw-studio/`
   and `reelclaw-output/` to the repo's `.gitignore` (ask first).
3. **Run every `npx reelclaw …` command inside `reelclaw-studio/`** (`cd reelclaw-studio`), where
   the project's own engine lives. Media paths are relative to it (`--demo ../demo/aha.mp4`); put
   DansUGC downloads in `reelclaw-studio/footage/`. `npx reelclaw doctor` checks Node 22+ and
   ffmpeg/ffprobe (yt-dlp only for page links); if it prints an install line, show it and wait.

## 2. Follow the playbook

Read `reelclaw-studio/.claude/skills/reelclaw-playbook/SKILL.md` (Codex:
`reelclaw-studio/.agents/skills/reelclaw-playbook/SKILL.md`) and the chosen template's skill,
`reelclaw-studio/.claude/skills/<template>/SKILL.md` (Codex: `.agents/skills/<template>/`). They
aren't auto-loaded from the repo root: open them with your file tool and follow them end to end
(**brief → format → hooks → footage → music → make → QA loop → variants → deliver**). They own the
craft and the exact commands. DansUGC details: the playbook's `references/dansugc.md` (read it
before the first DansUGC tool call). Section 3 lists the DansUGC steps.

| Template | What it makes |
|---|---|
| `reaction-demo` | creator reaction + hook → hard cut → your app demo (the default for app ads) |
| `wall-of-text` | faceless POV / storytime text in TikTok's white box over b-roll |
| `listicle` | "3 apps that feel illegal to know" countdown, one clip or screenshot per item |
| `no-yapping` | silent split-screen tutorial: intro gag, typing shot over a screen recording |
| `greenscreen-reaction` | the creator cut out (local AI) talking over a video or screenshot |
| `talking-head-captions` | talking-to-camera clip with word-by-word captions, pauses cut, b-roll |
| `before-after` | transformation reveal (swipe or split) from a before and an after |

## 3. The DansUGC steps inside that workflow

1. **Brief.** From the product repo (README, `package.json`, store listing, landing copy), as the
   playbook says.
2. **Format.** User unsure ("make viral reels for my app")? `reelclaw_suggest_formats { brief }`
   (free): show 2–4 formats with their evidence and your pick pre-selected, map each to a template
   above, add it with `<installer> add <id> --dir reelclaw-studio` if missing. Skip it when the user
   already has hooks, a reference ad, or a format.
3. **Research (optional, paid).** `tiktok_search_videos` / `instagram_search_reels` cost 0.02
   credits per successful query. Before the first, say the plan and cap (default ≤ 5 queries,
   0.10 credits) and go only on a yes, or if the user already asked for research. Borrow
   structures, never text or footage.
4. **Footage.** The user's own clips first. DansUGC reactions: `search_videos` (free) → shortlist
   3–6 from preview frame sheets (peak in the first second, no burned-in text) →
   `purchase_videos { video_ids }` **without** `expected_total_cents` (a free quote: exact total +
   the account charged) → show it in credits and **stop until the user says yes** → call again with
   the same ids (+ `project_id`) and `expected_total_cents` → `curl -fL -o
   reelclaw-studio/footage/<file>.mp4 "<download_url>"` within the hour. Owned clips are free
   (`list_purchases`); many clips of one kind → `search_packages`. Then trim to the peak per the
   playbook.
5. **Music.** No sound given and not silent on purpose? `reelclaw_trending_music { category }`
   (say "about 0.02 credits" before the first call), pick one that matches the hook's energy,
   download its `preview_url` to `reelclaw-studio/footage/music-<slug>.m4a`, pass it as `--music`.
   Always relay `license_note`: ads need Commercial Music Library tracks; never call a sound
   cleared. Organic posts usually skip baked-in music (playbook).
6. **Make + QA.** In `reelclaw-studio/`: write inputs to a JSON file with your file tool (e.g.
   `props/<name>.json`; keys are camelCase input names), then
   `npx reelclaw make <template> --props props/<name>.json --name <name> --draft`. It renders
   `renders/<name>.mp4` and runs `npx reelclaw qa <name>` automatically. Open every PNG it lists
   and go through the playbook's QA checklist; fix and re-make, max 3 passes.
7. **Variants.** Concepts × hooks with `npx reelclaw batch <template> rows.json --props
   reels/<base>.json --draft` (playbook `references/variants.md`). Reuse owned clips across
   concepts; buy new clips together in one quote, and show the plan (concepts, hooks, clips and
   their quoted total) before a big run.
8. **Deliver.** `npx reelclaw render <name>` (`--quality delivery` for finals), then copy
   `reelclaw-studio/renders/<name>.mp4` to `./reelclaw-output/<name>.mp4`. Summarize per reel:
   path, hook, length, footage used, credits spent (clips + research queries), QA result (pass /
   fixed / still off). Offer more hook variants, another template, or publishing.
9. **Publish (only on request).** DansUGC Posting (`get_media_upload_url` → PUT → `create_post`,
   one unique video per account) after the user confirms account, caption and time:
   [references/publishing.md](references/publishing.md).

## 4. When things go wrong

- MCP errors (auth, credits, purchases, accounts, research, music, removed tools):
  [references/errors.md](references/errors.md).
- Local problems (in `reelclaw-studio/`): `npx reelclaw doctor`, `renders/qa/<name>/report.txt`,
  `renders/<name>.render.log`; see [references/errors.md](references/errors.md#local-rendering).

## Ground rules

- Real human creators only; never describe DansUGC reactions as AI.
- Truthful hooks and captions only: nothing the repo or user didn't back up.
- Never spend credits (clip purchases, research queries) without telling the user the cost first,
  and get an explicit yes for every purchase.
- Never deliver a render you haven't looked at frame by frame.
- Footage stays on this machine; nothing is uploaded except what the user chooses to publish. Never
  upload secrets.
- Don't dump raw JSON on the user; keep IDs out of chat unless asked.
