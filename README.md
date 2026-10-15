# DansUGC ReelClaw for coding agents

Make short-form UGC ads (TikTok, Reels, Shorts) for the product you're building — from inside
Claude Code, OpenAI Codex, or any agent that speaks MCP.

Your agent reads your repo to understand the product, finds your demo video, writes TikTok-native
hooks, and pairs them with real human creator reactions from the DansUGC library. Then it **edits
and renders every reel on your machine** with the
[ReelClaw HyperFrames templates](https://github.com/danielhangan/reelclaw-templates) (TikTok Sans,
safe-zone captions), **looks at the rendered frames** against a QA checklist, and fixes what's off
before handing you the file. You can ask for any edit in plain words: "move the caption up",
"cut on her reaction", "snapchat-style text", "5 more hook variants".

> **ReelClaw 2.0: one skill, local editing.** The DansUGC MCP server no longer renders videos
> (the hosted batch/render tools are gone). It supplies the clip library, viral-format suggestions,
> trending music, research and posting; your agent does the editing. The old do-it-yourself skill
> (root `SKILL.md`, `README-diy.md`, `references/`, `assets/`) is retired too: there is only one
> ReelClaw skill now, `reelclaw`. If you installed `reelclaw-ads` before, reinstall (below).

No Gemini key, no API keys: you log in once with your DansUGC account (OAuth). Needs a Growth or
Scale plan; on top of it you pay per clip from your credits. Editing and rendering are local and
free. Needs Node 22+ and ffmpeg.

> Every reaction is a real human creator. Never AI.

---

## 60-second quickstart

You need two things: the **`dansugc` MCP server** (`https://dansugc.com/mcp`, OAuth) and the
**`reelclaw` skill**. The Claude Code and Codex plugins bundle both.

### Claude Code

```
/plugin marketplace add dansugc/reelclaw
/plugin install reelclaw@dansugc
```

Then run `/mcp`, select **plugin:reelclaw:dansugc**, and choose **Authenticate** (browser login to
your DansUGC account). Now ask:

> Make 3 UGC ads for this app with DansUGC ReelClaw. Use the demo in ./demo.mp4.

Or use the slash command: `/reelclaw:new 3 ./demo.mp4 gen-z, deadpan, snapchat-style captions`.
The skill itself is `/reelclaw:reelclaw` (Claude also picks it up automatically).

Shell equivalents: `claude plugin marketplace add dansugc/reelclaw` and
`claude plugin install reelclaw@dansugc`.

Updating from 1.x (terminal): `claude plugin marketplace update dansugc`, then
`claude plugin update reelclaw@dansugc`, then restart Claude Code.

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
`~/.agents/skills/reelclaw` (Codex's user skills directory: `SKILL.md`, all `references/`, and the
`scripts/`), removes a retired `~/.agents/skills/reelclaw-ads`, and adds the `dansugc` MCP server
if it isn't configured yet. Start a new Codex session, then ask:

> $reelclaw Make 3 UGC ads for this app. Use the demo in ./demo.mp4.

Optional: paste [`codex/AGENTS.md`](codex/AGENTS.md) into your project's `AGENTS.md`, and see
[`codex/config.toml`](codex/config.toml) for the manual `~/.codex/config.toml` block.

### Any other agent (Cursor, OpenCode, Gemini CLI, Kimi Code, VS Code, Zed, …)

1. Add a remote (streamable HTTP) MCP server named `dansugc` with the URL `https://dansugc.com/mcp`
   (no headers) and log in when prompted (OAuth).
2. Install the skill with the open [`skills`](https://github.com/vercel-labs/skills) CLI:

   ```sh
   npx skills add dansugc/reelclaw/plugins/reelclaw/skills/reelclaw -a <agent> -y
   ```

   (`<agent>` is the skills CLI id, e.g. `cursor`, `opencode`, `gemini-cli`; add `-g` for every
   project.) Clients that upload skills by hand (claude.ai, Claude Desktop): upload the
   [`plugins/reelclaw/skills/reelclaw`](plugins/reelclaw/skills/reelclaw) folder.

### Signing in

The DansUGC MCP server uses **OAuth only**: you log in with your DansUGC account in the browser once
and your agent stays connected. Your account needs a Growth or Scale plan (team members use their
team owner's plan). DansUGC API keys (`dsk_…`) don't work on MCP; they're for the REST API
(`/api/v1`) only. If you added the server earlier with an `Authorization` header or
`bearer_token_env_var`, remove it and log in with OAuth (see Troubleshooting).

---

## How a run goes

1. **Brief**: the agent reads your README, `package.json`, store listing, and landing copy, and
   shows you a 5-line brief (what it is, who it's for, the painful problem, the aha moment, real
   proof). It never invents claims, prices, or results.
2. **Demo**: it finds `.mp4`/`.mov` screen recordings in the repo or asks you for one.
3. **Formats (free)**: unsure what to make? It asks DansUGC which formats went viral in your niche
   (with example TikToks and views) and you pick.
4. **Research (optional)**: real viral examples via TikTok/Instagram search, 0.02 credits per
   query; the agent says how many it plans to run first.
5. **Hooks**: lowercase, under 80 characters, specific to the pain or the aha; reviewed with you.
6. **Footage**: it shortlists library reactions → quotes the clip price → **nothing is bought until
   you say yes** (clips you already own are free).
7. **Edit + render + QA**: one template per concept in `./reelclaw-studio/`, rendered locally, then
   a frame-by-frame QA loop (font, safe zone, hook timing, the cut, audio; max 3 passes).
8. **Deliver**: finals in `./reelclaw-output/`. Ask for more hook variants, another template, any
   edit, or publishing through DansUGC Posting.

| Template | What it is |
|---|---|
| `reaction_demo` | reaction + hook → hard cut → your demo (the default for app ads) |
| `no_yapping` | silent split-screen tutorial |
| `greenscreen_reaction` | the creator cut out over a screenshot, post, or clip |

Anything the template flags don't cover (caption style, exact position, a second caption, a pop-in)
the agent edits directly in the generated HyperFrames HTML.

## What to expect

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

The DansUGC MCP needs a Growth or Scale plan. On top of it, you pay as you go from your DansUGC
credit balance:

- **Editing and rendering: free.** They run on your machine.
- **UGC clips you buy.** Library clips are 11 credits each (images 8), less your plan's discount
  (no volume discounts; always current rates). Clips you already own are reused for free.
- **Research queries** (TikTok/Instagram search, trending music): 0.02 credits per query, charged
  only when the query succeeds. Viral-format suggestions and library search are free.
- Prices, quotes, and balances are in DansUGC credits; the agent talks in credits and only
  converts to dollars if you ask.
- The agent always shows the exact clip price first and waits for an explicit yes
  (`purchase_videos` is two-step: a free quote, then the buy). Team members can charge a team's
  credits instead of their own; the agent always names which account pays. Top up at
  https://dansugc.com/dashboard/credits.

## Privacy

- DansUGC never receives your code, your demo, or your renders. The agent sends DansUGC only search
  queries, the short product description used for format suggestions, and the purchases you
  approve. Everything else stays on your machine (`./reelclaw-studio/`, `./reelclaw-output/`).
- Publishing through DansUGC Posting uploads only the video you choose to post.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Agent says no `dansugc` tools | The MCP server isn't connected. Claude Code: `/mcp` → authenticate `plugin:reelclaw:dansugc`. Codex: `codex mcp list`, then `codex mcp login dansugc`. |
| Agent tries `reelclaw_create_batch` / `reelclaw_render` and gets "tool not found" | An old (1.x) plugin or skill is installed. Those hosted tools were removed in 2.0. Reinstall (see the quickstart) and delete any old `reelclaw-ads` skill folder. |
| "Needs authentication" / 401 | Log in again (same commands). |
| `reelclaw_plan_required` | The account (or its team owner) needs a Growth or Scale plan: https://dansugc.com/dashboard/credits |
| `reelclaw_login_required`, or "no longer accepts API keys — reconnect with OAuth" | The server was added with an API key. MCP is OAuth-only. Claude Code: `claude mcp remove dansugc`, re-add it without `--header` (or use the plugin), then `/mcp` → Authenticate. Codex: delete `bearer_token_env_var` from `[mcp_servers.dansugc]` in `~/.codex/config.toml`, then `codex mcp login dansugc`. |
| `insufficient_credits` | Top up at https://dansugc.com/dashboard/credits, then ask the agent to re-quote. |
| Codex doesn't see the skill | Start a new session. Check `~/.agents/skills/reelclaw/SKILL.md` exists (Option B) or `codex plugin list` shows `reelclaw@dansugc` (Option A). |
| `HyperFrames requires Node.js >= 22` | Install Node 22+ (`brew install node` or `nvm install 22`). The template installer's "Node 18+" check is stale. |
| Render "succeeded" but animations / music fade / font are wrong | The agent's wrapper prints **RENDER WARNINGS** for these silent failures (GSAP or font didn't load, sparse keyframes). It vendors GSAP locally so a CDN hiccup can't drop animations. |
| First render is slow | One-time HyperFrames + headless Chrome download via npx. |
| Something else | Support: https://dansugc.com |

## What's in this repo

```
.claude-plugin/marketplace.json        Claude Code marketplace "dansugc" (Codex reads it too)
.agents/plugins/marketplace.json       Codex-native marketplace "dansugc"
plugins/reelclaw/
  .claude-plugin/plugin.json           Claude Code plugin manifest
  .codex-plugin/plugin.json            Codex plugin manifest
  .mcp.json                            dansugc → https://dansugc.com/mcp (HTTP, OAuth, 120 s tool timeout)
  skills/reelclaw/                     THE ReelClaw skill (single source for every agent)
    SKILL.md                           connect + costs, plan, many variations, edit/render/QA, deliver
    references/
      product-brief.md                 reading the product from the repo, truthfully
      research.md                      paid viral research (0.02 credits/query) and winner thresholds
      hooks.md                         hook rules, formats, per-template voice, captions
      footage.md                       DansUGC reactions: search, compare, two-step buy, trims; demo prep
      music.md                         trending sounds for the niche + licensing (organic vs ads)
      templates.md                     the 3 HyperFrames templates' real inputs, wrapper, troubleshooting
      qa-checklist.md                  what to look for in the QA frames + render-warning fixes
      hyperframes-editing.md           editing the generated composition (tested recipes)
      publishing.md                    DansUGC Posting: presign → PUT → create_post
      errors.md, tools.md              MCP error playbook (incl. removed tools), tool map (incl. accounts/teams)
    scripts/
      run-generator.mjs                safe params-JSON wrapper: stage media, generate, vendor GSAP,
                                       render with the pinned HyperFrames, scan the log, run QA
      qa-frames.sh                     QA frames, safe-band overlay, contact sheet, measurements
    agents/openai.yaml                 Codex UI metadata + MCP dependency
  commands/new.md                      Claude Code slash command /reelclaw:new
codex/
  install.sh                           skill + MCP installer for Codex (curl | sh)
  config.toml                          manual ~/.codex/config.toml block
  AGENTS.md                            snippet for your project's AGENTS.md
```

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
`install.sh` run twice under `dash` and `sh` (idempotent). Local editing (1.1.0, then called studio mode): real renders of
`reaction_demo` (3 QA passes incl. a composition edit) and `no_yapping` (2 passes) following the
skill literally, a forced GSAP-CDN failure and a forced font fallback to confirm the render-warning
scan, and flag-injection refusal in the wrapper.
