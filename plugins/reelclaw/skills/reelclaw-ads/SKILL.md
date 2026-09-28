---
name: reelclaw-ads
description: Make short-form UGC video ads (TikTok, Reels, Shorts) for the product in the current repo with DansUGC ReelClaw and real human creator reactions from the DansUGC library. Two modes. Volume mode drives the hosted ReelClaw engine over the dansugc MCP server (reelclaw_* tools) for many variations fast. Studio mode edits 1-5 polished ads locally with HyperFrames templates (TikTok Sans, safe-zone captions) and a mandatory look-at-the-frames QA loop, for creative control and specific edits. Use when the user asks for UGC ads, reaction ads, TikTok/Reels ads, "make N ads for this app", ReelClaw, DansUGC videos, HyperFrames reels, editing or re-cutting an ad (caption style, position, timing), or checking/downloading ReelClaw batches.
license: MIT
metadata:
  author: DansUGC
  version: "1.2.0"
---

# DansUGC ReelClaw: UGC ads from your repo

You are the producer. Each ad = a real creator's reaction clip (the hook, with your text on top)
cut into the product demo. DansUGC reactions are always real human creators, never AI; never claim
or imply otherwise. Always write the brand as **DansUGC** (lowercase s, capital UGC).

`<skill-dir>` below means the directory that contains this SKILL.md (Claude Code prints it when the
skill loads; a Codex script install puts it at `~/.agents/skills/reelclaw-ads`).

## 0. Connect and costs

- Tools live on the `dansugc` MCP server. Clients may prefix them
  (`mcp__plugin_reelclaw_dansugc__…` in Claude Code, `mcp__dansugc__…` when added by hand). This
  skill uses bare names: `reelclaw_*` (volume mode), `search_videos`, `purchase_videos`,
  `tiktok_search_videos`, `get_media_upload_url`, … (both modes). Map: [references/tools.md](references/tools.md).
- No `dansugc` tools? Tell the user how to connect, then stop:
  - Claude Code: `/plugin marketplace add dansugc/reelclaw` + `/plugin install reelclaw@dansugc`
    (or `claude mcp add --transport http dansugc https://dansugc.com/mcp`), then `/mcp` → the server
    (`plugin:reelclaw:dansugc`, or `dansugc` if added by hand) → Authenticate.
  - Codex: `codex plugin marketplace add dansugc/reelclaw` + `codex plugin add reelclaw@dansugc`
    (or `codex mcp add dansugc --url https://dansugc.com/mcp`), then `codex mcp login dansugc`.
  - Auth is OAuth only (browser login with the DansUGC account). Never ask for or suggest an API
    key. If a tool says it "no longer accepts API keys — reconnect with OAuth", see
    [references/errors.md](references/errors.md).
- Cost (say it when asked, and before anything is spent): needs a Growth or Scale plan (team
  members use their team owner's plan); if a tool returns `reelclaw_plan_required`, relay the message
  and the upgrade link and stop. On top of the plan, usage comes from DansUGC credits. **Editing and
  rendering are included in both modes.** Users pay only for (a) reaction clips they don't already
  own (library clips are 11 credits each, images 8, less the plan's discount; owned clips are never
  charged again) and (b) research queries through the MCP (TikTok/Instagram search, 0.02 credits
  per query, only on success). Top up at https://dansugc.com/dashboard/credits.
- **Talk in credits.** Every price, quote, and balance is in DansUGC credits ("11 credits per
  clip", "Total: 104.50 credits", "Balance: 245.50 credits"). Never write "$" amounts; only convert
  to dollars if the user explicitly asks, and then say the credit amount first. Quote totals come
  from the tools (`purchase_videos` quote step, `reelclaw_quote`), never from multiplying per-clip
  prices yourself (owned clips are free and the plan discount is applied for you).
- **Accounts.** A user has a Personal Account and may belong to teams (each with its own credits
  and plan discounts). When the user mentions a team, company, or teammate, or a spend fails for
  low personal balance, call `list_accounts` and pass that team's `project_id` to every account
  tool (`search_videos`, `get_video`, `purchase_videos`, `list_purchases`, `get_balance`, the
  research tools, `reelclaw_create_batch` / `reelclaw_list_batches` / `reelclaw_options`). Omit
  `project_id` for the Personal Account. A ReelClaw batch stays on the account it was created on.
  Never switch accounts on your own; before the first spend on a team in a conversation, name the
  team and the amount and get an explicit yes.
- Tool results are JSON or Markdown; follow any `next_action`. Summarize; don't dump raw output.

## 1. Pick the mode

| | **Volume mode** (hosted) | **Studio mode** (local HyperFrames) |
|---|---|---|
| Best for | 6-60 variations fast, testing many hooks | 1-5 polished ads, specific edits, creative control |
| Rendering | DansUGC servers (`reelclaw_*` tools) | This machine (`npx reelclaw-templates` + HyperFrames) |
| Needs locally | nothing | Node >= 22, ffmpeg/ffprobe (installed below) |
| Creative control | hooks, reactions, music | everything: trims, timing, caption style/position, layout |
| You look at the result | optional | **mandatory QA loop on real frames** |

Default: the user asks for a number ≥ 6, "a batch", or speed → Volume. The user asks for 1-5, "polished",
"high quality", a specific edit ("move the caption up", "cut on her reaction", "snapchat-style
text"), a format the engine doesn't do (no-yapping tutorial, greenscreen), or wants to use their own
footage → Studio. Unsure → ask ONE question with your pick pre-filled ("I'll make 3 polished ads
locally (studio mode). OK, or do you want 10+ quick variations from the hosted engine?").

## 2. Shared steps (both modes)

1. **Understand the product from the repo, truthfully.** Read `README*`, `package.json`, store
   listing (`fastlane/metadata/**`), landing copy, `llms.txt`, before asking anything. Show a 4-6 line
   brief: what it is, who it's for, the one painful problem, the aha moment on screen, proof you
   actually found. Never invent features, prices, results, testimonials. At most one question, with
   your best guess pre-filled. Details: [references/product-brief.md](references/product-brief.md).
2. **Find the demo.** A 10-30 s screen recording that shows the aha early:
   ```sh
   find . -type f \( -iname '*.mp4' -o -iname '*.mov' \) -not -path '*/node_modules/*' \
     -not -path '*/.git/*' -not -path '*/reelclaw-output/*' -not -path '*/reelclaw-studio/*' 2>/dev/null | head -20
   ```
   None? Ask for one (phone screen recording, or QuickTime → File → New Screen Recording).
3. **Research real viral examples (optional, paid).** `tiktok_search_videos` /
   `instagram_search_reels` cost 0.02 credits per successful query. Before the first query say how
   many you plan (default ≤ 5, 0.10 credits) and proceed only if the user agrees or already asked
   for research.
   Use it to pick the format and steal hook *structures*, never text verbatim.
   How: [references/research.md](references/research.md).
4. **Write the hooks.** Lowercase, first person or POV/"when", under 80 characters, specific to
   the pain or the aha, emotion matching the reaction, no invented claims, "this app" instead of the
   brand name. Vary formats. Show the user a table (# · hook · format · reaction emotion).
   Playbook: [references/hooks.md](references/hooks.md).
5. **Choose reactions** from the DansUGC library (real creators). Volume: the engine matches them;
   you review. Studio: you search, compare previews, and buy only after the user confirms the
   price. How: [references/footage.md](references/footage.md).
6. **Music.** If the user gave no sound and didn't ask for silent videos, don't make them hunt for
   one: `reelclaw_trending_music { category }` returns trending TikTok sounds for the niche
   (0.02 credits per query, 1-2 per lookup, cached 6 h for free repeats; say it before the first
   call). Pick 3-5 that match the hook's energy (prefer `rising`, length ≥ the reel). Volume: pass
   its `music_links` to `reelclaw_update_batch` before quoting. Studio: download a song's
   `preview_url` and use it as `music`. Ads: relay `license_note` (paid ads and TikTok business
   accounts need Commercial Music Library tracks; never say a sound is cleared). How:
   [references/music.md](references/music.md).

## 3. Volume mode (hosted engine)

Full procedure (create → advance → hooks → demo upload → quote → render → download):
[references/volume-mode.md](references/volume-mode.md). Read it before the first `reelclaw_*` call.
Non-negotiables:

- `reelclaw_create_batch` → loop `reelclaw_advance_batch` until `done` → rewrite hooks with
  `reelclaw_update_batch` (no music yet? `reelclaw_trending_music` → its `music_links` in the same
  update) → `reelclaw_add_demo` + `curl -X PUT --data-binary` → `reelclaw_quote`.
- **Show the quote and STOP for an explicit yes** before `reelclaw_render`. Never treat the original
  request or silence as consent; any edit after a quote invalidates it (re-quote, re-confirm).
- Poll `reelclaw_get_batch` every `poll_after_seconds`; download each ready video to
  `./reelclaw-output/<batch_id>/`; finish with paths, hooks, credits spent, `dashboard_url`.

## 4. Studio mode (local HyperFrames)

Templates: `reaction_demo` (reaction + hook → hard cut → demo; the default for app ads),
`no_yapping` (silent split-screen tutorial), `greenscreen_reaction` (creator cut out over a video).
Inputs, flags, and when to use each: [references/studio-templates.md](references/studio-templates.md).

**a. Preflight** (every session):
```sh
node --version                                   # must be v22+; HyperFrames refuses to start on older Node
ffmpeg -version | head -n 1 && ffprobe -version | head -n 1
yt-dlp --version                                 # optional: only for TikTok/IG/YouTube page links as inputs
```
Missing → offer to install (`brew install node ffmpeg`, `nvm install 22`, `sudo apt install ffmpeg`)
and wait. Can't install → offer Volume mode. First render also fetches HyperFrames and a headless
Chrome through npx (one-time, a few minutes).

**b. Install one template copy per reel** (templates are not concurrency-safe):
```sh
mkdir -p reelclaw-studio
npx --yes reelclaw-templates@latest reaction_demo reelclaw-studio/reaction_demo-<slug>
```
`<slug>` = short kebab-case concept name. The installer refuses a non-empty directory (pick a new
slug). Hook variants of the same reel can run one after another in the same directory with
different `name`s; never run two generators or renders in one directory at the same time. Offer to
add `reelclaw-studio/` and `reelclaw-output/` to `.gitignore` (ask first).

**c. Footage.** Reactions: `search_videos` (free) → shortlist 3-6 with price, duration, emotion,
preview → `purchase_videos` WITHOUT `expected_total_cents` (a free quote: exact total + the account
charged) → show it, wait for an explicit yes → `purchase_videos` again with the same ids +
`expected_total_cents` (charges; owned clips are free) → `curl -fL -o
reelclaw-studio/footage/<file>.mp4 "<download_url>"` within the hour. Skip clips with burned-in
text. Choose the reaction's `trim` from a frame sheet so the peak expression lands in the first
second. Demo: pre-trim it so the aha is on screen within ~2 s of the cut.
Details, commands, and the no-purchase path: [references/footage.md](references/footage.md).

**d. Write the params file** with your file-writing tool (not `echo`; JSON-escape the text). Keys
are the template's flag names without `--` (exact list per template in studio-templates.md):
```json
{
  "name": "pov-screen-time-v1",
  "reaction": "reelclaw-studio/footage/reaction-shocked-1.mp4",
  "trim": 0.4,
  "demo": "demo/aha.mp4",
  "hook": "pov: your phone won't open tiktok until you've walked 2k steps",
  "hook-position": "top"
}
```
Save it as `reelclaw-studio/<template>-<slug>/params-<name>.json`. Never put user text into a
shell command line: the wrapper passes it to the generator without a shell and refuses values
starting with `--` (the generators would read them as flags).

**e. Generate + render + QA frames** (run from the repo root):
```sh
node <skill-dir>/scripts/run-generator.mjs reelclaw-studio/reaction_demo-<slug> \
  reelclaw-studio/reaction_demo-<slug>/params-pov-screen-time-v1.json --render
```
The wrapper copies media into the template's `assets/`, runs `new-reel.mjs`, vendors GSAP locally
(a CDN hiccup otherwise drops every animation while the render still "succeeds"), renders with the
template's pinned HyperFrames version, then runs `scripts/qa-frames.sh`. Output:
`renders/<name>.mp4` + `qa/<name>/` (frames, contact sheet, `report.txt`); the full HyperFrames log
is in `renders/<name>.render.log`. HyperFrames exits 0 even when GSAP, a font, or a video failed to
load: if the wrapper prints **RENDER WARNINGS**, fix them before anything else. A 10-15 s reel
renders in roughly 25-30 s on a recent laptop.

**f. QA loop (mandatory, max 3 passes).** Open and look at every PNG listed in `report.txt`
(Claude Code: the Read tool on the `.png`; Codex: `view_image`). Check each item in
[references/qa-checklist.md](references/qa-checklist.md): TikTok Sans actually rendered (not a
fallback font), every caption inside the green safe box, hook readable within 1 s, reaction ≤ 3 s
and cut right after its peak, demo shows the aha within ~2 s of the cut, no black or frozen frames,
audio present (or silent on purpose), duration on target, 1080×1920. Fix (params, trims, footage,
or a composition edit), re-render (params change: step e again; composition edit: add
`--render-only` instead of `--render`, since regenerating overwrites hand edits), look again. Never deliver a render you haven't looked at.
After 3 passes, deliver the best one and list what's still off.

**g. Custom edits beyond the flags** (caption style, exact position, a pop-in, a second caption, a
different demo fit): edit the generated `compositions/<name>.html`, then re-render with
`run-generator.mjs … --render-only`, following [references/hyperframes-editing.md](references/hyperframes-editing.md). If the
HyperFrames skills are installed (`hyperframes`, `hyperframes-core`, …), load them for bigger
custom compositions; this skill does not require them.

**h. Deliver.** Copy finals to `./reelclaw-output/studio/<name>.mp4`; summarize path, hook, length,
footage used, credits spent (clips + research queries), and the QA result (pass / fixed / still
off). Offer: more hook variants (one render each; media is already staged), another template, or
publishing. Publishing via DansUGC Posting
(`get_media_upload_url` → PUT → `create_post`, one unique video per account) only on request and
after the user confirms account + caption: [references/publishing.md](references/publishing.md).

## 5. When things go wrong

- MCP errors (`reelclaw_*`, auth, credits, uploads): [references/errors.md](references/errors.md).
- Studio (Node, npx, Chrome, generator, render, QA failures):
  [references/studio-templates.md](references/studio-templates.md#troubleshooting).

## Ground rules

- Real human creators only; never describe DansUGC reactions as AI.
- Truthful hooks and captions only: nothing the repo or user didn't back up.
- Never spend credits (render quote, clip purchase, research queries) without telling the user the
  cost first and getting a yes for purchases and renders.
- Never deliver a studio render you haven't looked at frame by frame.
- Demo uploads (volume mode) go to DansUGC private storage; only upload what the user is fine
  sharing. Studio mode keeps footage on this machine. Never upload secrets.
- Don't dump raw JSON on the user; keep IDs out of chat unless asked.
