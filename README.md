# DansUGC ReelClaw for coding agents

Make short-form UGC ads (TikTok, Reels, Shorts) for the product you're building — from inside
Claude Code or OpenAI Codex.

Your agent reads your repo to understand the product, finds your demo video, writes TikTok-native
hooks, and pairs them with real human creator reactions from the DansUGC library. Two modes:

- **Volume mode** (hosted): the agent drives the **DansUGC ReelClaw** engine over MCP. It matches
  reactions, overlays hooks in the safe zone, adds music, and renders 6-60 vertical MP4s on DansUGC
  servers. Nothing to install locally.
- **Studio mode** (local): for 1-5 polished ads or specific edits. The agent installs a
  [reelclaw HyperFrames template](https://github.com/danielhangan/reelclaw-templates) per reel,
  buys only the clips you approve, renders on your machine (TikTok Sans, safe-zone captions), then
  **looks at the rendered frames** against a QA checklist and fixes what's off before handing you
  the file. Needs Node 22+ and ffmpeg.

No Gemini key, no API keys, no subscription: you log in once with your DansUGC account (OAuth) and
pay per clip from your credits. Editing and rendering are free in both modes.

> Every reaction is a real human creator. Never AI.

Batches are shared with the web app: anything you start here also opens at
`https://dansugc.com/dashboard/reelclaw?session=<batch_id>`.

---

## 60-second quickstart

### Claude Code

```
/plugin marketplace add dansugc/reelclaw
/plugin install reelclaw@dansugc
```

Then run `/mcp`, select **plugin:reelclaw:dansugc**, and choose **Authenticate** (browser login to
your DansUGC account). Now ask:

> Make 10 UGC ads for this app with DansUGC ReelClaw. Use the demo in ./demo.mp4.

Or use the slash commands: `/reelclaw:new 10 ./demo.mp4 gen-z, deadpan` (picks the mode),
`/reelclaw:studio 3 polished ads with ./demo.mp4, snapchat-style captions` (studio mode), and
`/reelclaw:status`.
The skill itself is `/reelclaw:reelclaw-ads` (Claude also picks it up automatically).

Shell equivalents: `claude plugin marketplace add dansugc/reelclaw` and
`claude plugin install reelclaw@dansugc`.

MCP only, no plugin (you lose the workflow skill and commands):
`claude mcp add --transport http dansugc https://dansugc.com/mcp`, then `/mcp` → **dansugc** → Authenticate.

### OpenAI Codex

Option A — plugin (skill + MCP server in one, updates with `codex plugin marketplace upgrade`):

```sh
codex plugin marketplace add dansugc/reelclaw
codex plugin add reelclaw@dansugc
codex mcp login dansugc
```

Option B — MCP server + skill via script:

```sh
codex mcp add dansugc --url https://dansugc.com/mcp
codex mcp login dansugc
curl -fsSL https://raw.githubusercontent.com/dansugc/reelclaw/main/codex/install.sh | sh
```

`install.sh` is POSIX `sh`, idempotent, needs no sudo: it copies the skill into
`~/.agents/skills/reelclaw-ads` (Codex's user skills directory: `SKILL.md`, all `references/`,
and the studio `scripts/`) and adds the `dansugc` MCP server if
it isn't configured yet. Start a new Codex session, then ask:

> $reelclaw-ads Make 10 UGC ads for this app. Use the demo in ./demo.mp4.

> $reelclaw-ads Make 3 polished ads in studio mode with the demo in ./demo.mp4.

Optional: paste [`codex/AGENTS.md`](codex/AGENTS.md) into your project's `AGENTS.md`, and see
[`codex/config.toml`](codex/config.toml) for the manual `~/.codex/config.toml` block.

### Any other MCP client (Cursor, Claude Desktop, claude.ai, …)

Add a remote (streamable HTTP) MCP server with the URL:

```
https://dansugc.com/mcp
```

and log in when prompted (OAuth). You get the `reelclaw_*` tools; for the guided workflow, point
your agent at [`plugins/reelclaw/skills/reelclaw-ads/SKILL.md`](plugins/reelclaw/skills/reelclaw-ads/SKILL.md).

### Signing in

The DansUGC MCP server uses **OAuth only**: you log in with your DansUGC account in the browser once
and your agent stays connected. No subscription is needed. DansUGC API keys (`dsk_…`) don't work on
MCP; they're for the REST API (`/api/v1`) only. If you added the server earlier with an
`Authorization` header or `bearer_token_env_var`, remove it and log in with OAuth
(see Troubleshooting).

---

## Which mode?

| | Volume mode | Studio mode |
|---|---|---|
| Use for | 6-60 variations fast, testing many hooks | 1-5 polished ads, specific edits, creative control |
| Formats | reaction + demo | `reaction_demo`, `no_yapping` (silent split-screen tutorial), `greenscreen_reaction` |
| Renders on | DansUGC servers | your machine (HyperFrames + headless Chrome via npx) |
| Needs | nothing local | Node 22+, ffmpeg/ffprobe (yt-dlp optional) |
| Control | hooks, reactions, music | trims, cut timing, caption text/position/style, layout, anything in the HTML |
| Quality check | you review the files | agent extracts frames and checks font, safe zone, hook timing, cut, audio, then re-renders (max 3 passes) |

The agent picks based on what you ask ("10 ads" → volume, "3 polished ads" or "move the caption
up" → studio) and asks once if it's unclear.

## How a run goes

1. **Brief**: the agent reads your README, `package.json`, store listing, and landing copy, and
   shows you a 5-line brief (what it is, who it's for, the painful problem, the aha moment, real
   proof). It never invents claims, prices, or results.
2. **Demo**: it finds `.mp4`/`.mov` screen recordings in the repo or asks you for one.
3. **Research (optional)**: real viral examples via TikTok/Instagram search, $0.02 per query; the
   agent says how many it plans to run first.
4. **Hooks**: lowercase, under 80 characters, specific to the pain or the aha; reviewed with you.
5. Volume mode: ReelClaw matches reactions → you see the **quote** → **nothing renders until you say
   yes** → MP4s land in `./reelclaw-output/<batch_id>/`.
6. Studio mode: the agent shortlists library reactions → quotes the clip price → **nothing is bought
   until you say yes** → it installs one template per reel in `./reelclaw-studio/`, renders, runs the
   frame-by-frame QA loop, and delivers to `./reelclaw-output/studio/`.

## What to expect (studio mode)

Measured end to end on an Apple M1 Max (Node 26, ffmpeg 7.1, `hyperframes@0.7.76`, headless Chrome
already cached), with 1080×1920 source clips and a 2160×2880 screen recording:

| Step | Time |
|---|---|
| Install a template (`npx --yes reelclaw-templates@latest reaction_demo …`, ~25 MB download) | 8-11 s |
| First `npx hyperframes@0.7.76` fetch (npm deps, one-time) | ~11 s here; longer on a cold npm cache (~380 MB) |
| First render ever on a machine (headless Chrome download, launch, GPU probe) | one-time extra: ~35 s on the DansUGC render bench (not re-measured here; Chrome was cached) |
| Stage media (re-encode clips with sparse keyframes; 22 s 1080p clip) | ~3 s per clip |
| Generate composition | < 1 s |
| Render a 13 s `reaction_demo` reel (390 frames) | 24-28 s |
| Render a 10.9 s edited reel (extra blurred video layer) | 30 s |
| Render a 10.9 s `no_yapping` reel | 23-26 s |
| QA frames + contact sheet + measurements | ~3.5 s |
| `greenscreen_reaction` background removal (first time per reaction) | ~6.5 s per second of reaction (+ ~168 MB model once) |

A 3-pass QA loop on one reel is about 2 minutes of machine time. Hook variants of an already staged
reel cost one render each.

## What it costs

No subscription. You pay as you go from your DansUGC credit balance:

- **UGC clips you buy.** Library b-roll clips start at $5. In ReelClaw you only pay for creator
  reactions you don't already own; reactions you own are reused for free.
- **Editing and rendering: free.** Reaction matching, hooks, overlays, music, and rendering cost
  nothing, whether hosted (volume) or on your machine (studio).
- **Research queries** (TikTok/Instagram search and other ScrapeCreators lookups your agent runs
  through the MCP): $0.02 per query, charged only when the query succeeds. ReelClaw's own research
  (reaction matching, hooks) is free.
- The agent always shows the exact price first and waits for an explicit yes: the render quote in
  volume mode, the clip-purchase quote in studio mode (`purchase_videos` is two-step: a free quote,
  then the buy). Team members can charge a team's credits instead of their own; the agent always
  names which account pays. Top up at https://dansugc.com/dashboard/credits.

## Privacy

- DansUGC never receives your code. The agent sends DansUGC only the product brief it wrote (you
  see it first) and the demo videos you approve.
- Demo videos are uploaded straight to DansUGC private storage through short-lived signed links
  (1 hour) and used to render your batch. Download links for finished videos are signed and expire
  after 24 hours.
- Batches belong to your DansUGC account (or the team project you choose) and show up in your
  dashboard.
- Studio mode sends DansUGC nothing but the searches and purchases: your demo, the templates, the
  renders, and the QA frames stay on your machine (`./reelclaw-studio/`, `./reelclaw-output/`).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Agent says no `reelclaw_*` tools | The MCP server isn't connected. Claude Code: `/mcp` → authenticate `plugin:reelclaw:dansugc`. Codex: `codex mcp list`, then `codex mcp login dansugc`. |
| "Needs authentication" / 401 | Log in again (same commands). |
| `reelclaw_login_required`, or "no longer accepts API keys — reconnect with OAuth" | The server was added with an API key. MCP is OAuth-only now. Claude Code: `claude mcp remove dansugc`, re-add it without `--header` (or use the plugin), then `/mcp` → Authenticate. Codex: delete `bearer_token_env_var` from `[mcp_servers.dansugc]` in `~/.codex/config.toml`, then `codex mcp login dansugc`. |
| `insufficient_credits` | Top up at https://dansugc.com/dashboard/credits, then ask the agent to re-quote. |
| Upload fails with `invalid_upload` | The file changed or the size/type didn't match. Ask the agent to add the demo again (it re-measures with `wc -c`). |
| Upload/download link `invalid_signature` | Link expired (uploads 1 h, downloads 24 h). The agent fetches a fresh one. |
| Demo over 50 MB | Trim to the 10–30 s that shows the aha moment, or re-export at a lower bitrate. |
| Codex: tool call timed out during research | The plugin sets `tool_timeout_sec = 120`; for a hand-added server put `tool_timeout_sec = 120` under `[mcp_servers.dansugc]` in `~/.codex/config.toml` (see [`codex/config.toml`](codex/config.toml)). Re-running `reelclaw_advance_batch` resumes where it stopped. |
| Codex doesn't see the skill | Start a new session. Check `~/.agents/skills/reelclaw-ads/SKILL.md` exists (Option B) or `codex plugin list` shows `reelclaw@dansugc` (Option A). |
| Studio: `HyperFrames requires Node.js >= 22` | Install Node 22+ (`brew install node` or `nvm install 22`). The template installer's "Node 18+" check is stale. |
| Studio: render "succeeded" but animations / music fade / font are wrong | The agent's wrapper prints **RENDER WARNINGS** for these silent failures (GSAP or font didn't load, sparse keyframes). It vendors GSAP locally so a CDN hiccup can't drop animations. |
| Studio: first render is slow | One-time HyperFrames + headless Chrome download via npx. |
| Something else | The batch is always visible at the `dashboard_url` the agent prints. Support: https://dansugc.com |

## What's in this repo

```
.claude-plugin/marketplace.json        Claude Code marketplace "dansugc" (Codex reads it too)
.agents/plugins/marketplace.json       Codex-native marketplace "dansugc"
plugins/reelclaw/
  .claude-plugin/plugin.json           Claude Code plugin manifest
  .codex-plugin/plugin.json            Codex plugin manifest
  .mcp.json                            dansugc → https://dansugc.com/mcp (HTTP, OAuth, 120 s tool timeout)
  skills/reelclaw-ads/                 the workflow skill (single source for both clients)
    SKILL.md                           router: shared steps, volume mode, studio mode
    references/
      product-brief.md                 reading the product from the repo, truthfully
      research.md                      paid viral research ($0.02/query) and winner thresholds
      hooks.md                         hook rules, formats, per-template voice, captions
      footage.md                       DansUGC reactions: search, compare, two-step buy, trims; demo prep
      volume-mode.md                   hosted reelclaw_* flow: create → quote → yes → render → download
      studio-templates.md              the 3 HyperFrames templates' real inputs, wrapper, troubleshooting
      qa-checklist.md                  what to look for in the QA frames + render-warning fixes
      hyperframes-editing.md           editing the generated composition (tested recipes)
      publishing.md                    DansUGC Posting: presign → PUT → create_post
      errors.md, tools.md              MCP error playbook, tool map (incl. accounts/teams)
    scripts/
      run-generator.mjs                safe params-JSON wrapper: stage media, generate, vendor GSAP,
                                       render with the pinned HyperFrames, scan the log, run QA
      qa-frames.sh                     QA frames, safe-band overlay, contact sheet, measurements
    agents/openai.yaml                 Codex UI metadata + MCP dependency
  commands/{new,studio,status}.md      Claude Code slash commands (/reelclaw:new, /reelclaw:studio, /reelclaw:status)
codex/
  install.sh                           skill + MCP installer for Codex (curl | sh)
  config.toml                          manual ~/.codex/config.toml block
  AGENTS.md                            snippet for your project's AGENTS.md
SKILL.md, references/, assets/         the original DIY ReelClaw skill (local ffmpeg pipeline)
```

The root `SKILL.md` is the older do-it-yourself ReelClaw skill that assembles reels locally with
ffmpeg and your own keys. It's unchanged and still works (its guide is in [README-diy.md](README-diy.md));
the plugin above is the hosted version and needs none of that.

Maintainers: bump `version` in both `plugins/reelclaw/.claude-plugin/plugin.json` and
`plugins/reelclaw/.codex-plugin/plugin.json` to ship an update (a set version pins users until it
changes). Validate with `claude plugin validate . && claude plugin validate ./plugins/reelclaw`.

## Verified against (2026-09-28)

Claude Code 2.1.283 and Codex CLI 0.157.0, plus:

- Claude Code — create a marketplace: https://code.claude.com/docs/en/plugin-marketplaces
- Claude Code — marketplace reference (schema, sources, reserved names): https://code.claude.com/docs/en/plugins/marketplace-reference
- Claude Code — plugin manifest reference (`plugin.json`, standard layout, `.mcp.json`): https://code.claude.com/docs/en/plugins-reference
- Claude Code — MCP (`--transport http`, `/mcp` OAuth, plugin MCP servers and tool naming): https://code.claude.com/docs/en/mcp
- Claude Code — skills (frontmatter, `$ARGUMENTS`, `/plugin:skill` namespacing, commands merged into skills): https://code.claude.com/docs/en/skills
- Agent Skills open standard (SKILL.md frontmatter limits, progressive disclosure): https://agentskills.io/specification
- Codex — MCP (`[mcp_servers.<name>]`, `url`, `codex mcp add --url`, `codex mcp login`): https://developers.openai.com/codex/mcp (→ learn.chatgpt.com/docs/extend/mcp?surface=cli)
- Codex — skills (`~/.agents/skills`, repo `.agents/skills`, `$skill` invocation, `agents/openai.yaml`): https://developers.openai.com/codex/skills (→ learn.chatgpt.com/docs/build-skills)
- Codex — plugins (`.codex-plugin/plugin.json`, marketplace at `.agents/plugins/marketplace.json` or legacy `.claude-plugin/marketplace.json`, `codex plugin marketplace add owner/repo`): https://developers.openai.com/plugins/build/plugins

- reelclaw-templates installer (`cli/bin/index.mjs`, npm `reelclaw-templates@0.1.0`, templates
  fetched from `danielhangan/reelclaw-templates@main`, `--ref` pins a commit) and the three
  `new-reel.mjs` generators; `hyperframes@0.7.76` (`engines.node >=22`, `render --help`).

Local checks run: `claude plugin validate --strict` (marketplace + plugin: passed); isolated
`claude plugin marketplace add` + `claude plugin install reelclaw@dansugc` (installed; server shows
as `plugin:reelclaw:dansugc`, "Needs authentication"); isolated `codex plugin marketplace add` +
`codex plugin add reelclaw@dansugc` (installed; `codex mcp list` shows `dansugc`, "Not logged in");
`install.sh` run twice under `dash` and `sh` (idempotent). Studio mode (1.1.0): real renders of
`reaction_demo` (3 QA passes incl. a composition edit) and `no_yapping` (2 passes) following the
skill literally, a forced GSAP-CDN failure and a forced font fallback to confirm the render-warning
scan, and flag-injection refusal in the wrapper.
