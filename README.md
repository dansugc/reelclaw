# DansUGC ReelClaw for coding agents

Make short-form UGC ads (TikTok, Reels, Shorts) for the product you're building — from inside
Claude Code, OpenAI Codex, or any agent that speaks MCP.

Your agent reads your repo to understand the product, finds your demo video, writes TikTok-native
hooks, and pairs them with real human creator reactions from the DansUGC library (or your own
footage). Then it **edits and renders every reel on your machine** with the open-source
[reelclaw engine](https://github.com/danielhangan/reelclaw-templates) (7 viral templates, TikTok
Sans, safe-zone captions), **looks at the rendered frames** with `reelclaw qa` and a QA checklist,
and fixes what's off before handing you the file. You can ask for any edit in plain words: "move
the caption up", "cut on her reaction", "box-style captions", "5 more hook variants".

> **ReelClaw 3.0: built on the reelclaw engine.** The plugin no longer carries its own copy of the
> craft. Each repo gets one reel project, `./reelclaw-studio/`, set up by the reelclaw installer:
> 7 templates, content-cached media, `reelclaw make` / `qa` / `batch` / `render`, and the
> `reelclaw-playbook` skill (brief, hooks, footage, music, QA checklist, variants). This plugin is
> the DansUGC layer on top: sign-in, credits and teams, real-creator clips, viral formats,
> trending music, research and posting. Coming from 2.x? See [Upgrading from 2.x](#upgrading-from-2x).

No Gemini key, no API keys: you log in once with your DansUGC account (OAuth). Any DansUGC
account works, no plan needed; you pay per clip from your credits. Editing and rendering are local and
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

Updating (terminal): `claude plugin marketplace update dansugc`, then
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
`~/.agents/skills/reelclaw` (Codex's user skills directory: `SKILL.md`, `references/`,
`agents/openai.yaml`), replacing the folder so files from older versions don't linger, removes a
retired `~/.agents/skills/reelclaw-ads`, and adds the `dansugc` MCP server if it isn't configured
yet. Start a new Codex session, then ask:

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
and your agent stays connected. Any DansUGC account can connect, with or without a plan. DansUGC API keys (`dsk_…`) don't work on MCP; they're for the REST API
(`/api/v1`) only. If you added the server earlier with an `Authorization` header or
`bearer_token_env_var`, remove it and log in with OAuth (see Troubleshooting).

---

## How a run goes

1. **Studio**: from your repo, the agent sets up (or reuses) one reel project,
   `./reelclaw-studio/`, with the reelclaw installer: the templates it needs, the engine, and the
   `reelclaw-playbook` skill. It asks before adding `reelclaw-studio/` and `reelclaw-output/` to
   your `.gitignore`.
2. **Brief**: it reads your README, `package.json`, store listing, and landing copy, and shows you
   a short brief (what it is, who it's for, the painful problem, the aha moment, real proof). It
   never invents claims, prices, or results.
3. **Formats (free)**: unsure what to make? It asks DansUGC which formats went viral in your niche
   (with example TikToks and views) and maps your pick to a template.
4. **Research (optional)**: real viral examples via TikTok/Instagram search, 0.02 credits per
   query; the agent says how many it plans to run first.
5. **Hooks**: lowercase, under 80 characters, specific to the pain or the aha; reviewed with you.
6. **Footage**: your own clips, or DansUGC reactions: it shortlists library clips → quotes the
   price → **nothing is bought until you say yes** (clips you already own are free).
7. **Music**: trending sounds for your niche (0.02 credits per lookup), with the licensing note for
   ads; or silent, to add a sound in the app.
8. **Make + QA**: `reelclaw make … --draft` renders locally and runs `reelclaw qa`; the agent looks
   at every frame it lists (hook timing, safe zone, font, the cut, audio) and fixes what's off (max
   3 passes). Hook variants run as one `reelclaw batch`.
9. **Deliver**: finals in `./reelclaw-output/`. Ask for more hook variants, another template, any
   edit, or publishing through DansUGC Posting.

| Template | What it makes |
|---|---|
| `reaction-demo` | creator reaction + hook → hard cut → your app demo (the default for app ads) |
| `wall-of-text` | faceless POV / storytime text in TikTok's white box over b-roll |
| `listicle` | "3 apps that feel illegal to know" countdown, one clip or screenshot per item |
| `no-yapping` | silent split-screen tutorial: intro gag, typing shot over a screen recording |
| `greenscreen-reaction` | the creator cut out (local AI) talking over a video or screenshot |
| `talking-head-captions` | talking-to-camera clip with word-by-word captions, pauses cut, b-roll |
| `before-after` | transformation reveal (swipe or split) from a before and an after |

Every reel is a plain HyperFrames composition (`reelclaw-studio/reels/<name>.html`), so anything
the template flags don't cover (caption style, exact position, a second caption) the agent edits
directly and re-renders.

## What to expect

Measured on an Apple M1 Max (Node 26, ffmpeg 7.1, `hyperframes@0.8.181`, headless Chrome already
cached), 2026-10-23:

| Step | Time |
|---|---|
| Set up `reelclaw-studio/` from GitHub (`npx --yes github:danielhangan/reelclaw-templates add reaction-demo --dir reelclaw-studio`, incl. `npm install` and `doctor`; warm npm cache) | ~12 s |
| `npx reelclaw make reaction-demo … --draft --workers 2` for a 10.9 s reel (stage 2 clips, generate, render, QA) | 18-22 s |
| `npx reelclaw render <name> --quality delivery --workers 2` (same reel) | ~19 s |

The first `add` from GitHub downloads the engine and its dependencies, and the first render ever
downloads headless Chrome: allow a few minutes once. Hook variants reuse the cached media and cost
one render each. (The 2.x timings for the per-concept template copies no longer apply.)

## What it costs

The DansUGC MCP works on any DansUGC account, no plan needed. You pay as you go from your DansUGC
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
| Agent tries `reelclaw_create_batch` / `reelclaw_render` and gets "tool not found" | An old (1.x) plugin or skill is installed. Those hosted tools were removed in 2.0. Update (see the quickstart) and delete any old `reelclaw-ads` skill folder. |
| "Needs authentication" / 401 | Log in again (same commands). |
| `reelclaw_login_required`, or "no longer accepts API keys — reconnect with OAuth" | The server was added with an API key. MCP is OAuth-only. Claude Code: `claude mcp remove dansugc`, re-add it without `--header` (or use the plugin), then `/mcp` → Authenticate. Codex: delete `bearer_token_env_var` from `[mcp_servers.dansugc]` in `~/.codex/config.toml`, then `codex mcp login dansugc`. |
| `insufficient_credits` | Top up at https://dansugc.com/dashboard/credits, then ask the agent to re-quote. |
| Codex doesn't see the skill | Start a new session. Check `~/.agents/skills/reelclaw/SKILL.md` exists (Option B) or `codex plugin list` shows `reelclaw@dansugc` (Option A). |
| Node, ffmpeg or Chrome problems | In `reelclaw-studio/`: `npx reelclaw doctor` prints what's missing and the install line (Node 22+ is required). |
| Render "succeeded" but animations / font / audio look wrong | `npx reelclaw qa <name>` in `reelclaw-studio/` lists render warnings, black/frozen frames and silent audio; the full log is `renders/<name>.render.log`. |
| `npm error 404 … registry.npmjs.org/reelclaw` | `npx reelclaw` ran outside `reelclaw-studio/`. Run it inside that folder. Until the npm package is published, set up with `npx --yes github:danielhangan/reelclaw-templates add <template> --dir reelclaw-studio`. |
| First render is slow | One-time HyperFrames + headless Chrome download. |
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
    SKILL.md                           connect + costs + accounts, set up reelclaw-studio/, follow the
                                       playbook, the DansUGC steps (formats, clips, music, research), deliver
    references/
      tools.md                         MCP tool map (inputs, results, prices, accounts/teams, packages)
      errors.md                        MCP error playbook (incl. removed tools) + local rendering pointers
      publishing.md                    DansUGC Posting: presign → PUT → create_post, error fixes
    agents/openai.yaml                 Codex UI metadata + MCP dependency
  commands/new.md                      Claude Code slash command /reelclaw:new
codex/
  install.sh                           skill + MCP installer for Codex (curl | sh)
  config.toml                          manual ~/.codex/config.toml block
  AGENTS.md                            snippet for your project's AGENTS.md
```

What the agent installs into your repo (from
[danielhangan/reelclaw-templates](https://github.com/danielhangan/reelclaw-templates)):

```
reelclaw-studio/
  templates/<id>/                      the templates you use (template.mjs, SKILL.md, README.md)
  .claude/skills/reelclaw-playbook/    the producer playbook (Codex: .agents/skills/…), incl.
                                       references/dansugc.md with every DansUGC rule
  .claude/skills/<id>/                 each template's skill (Codex: .agents/skills/<id>/)
  footage/  props/                     your clips, DansUGC downloads, input files
  reels/  renders/  renders/qa/        compositions, MP4s, QA frames + reports
reelclaw-output/                       delivered finals
```

Maintainers: bump `version` in both `plugins/reelclaw/.claude-plugin/plugin.json` and
`plugins/reelclaw/.codex-plugin/plugin.json` to ship an update (a set version pins users until it
changes). Validate with `claude plugin validate . && claude plugin validate ./plugins/reelclaw`.

## Upgrading from 2.x

- Update the plugin (Claude Code: `claude plugin marketplace update dansugc` +
  `claude plugin update reelclaw@dansugc`; Codex plugin: `codex plugin marketplace upgrade dansugc`;
  script installs: re-run `install.sh`, which removes the old `references/` and `scripts/` files).
- 2.x made one template copy per concept (`reelclaw-studio/<template>-<slug>/`) and drove it with
  the plugin's own generator wrapper and QA script. 3.0 uses one reel project for every reel:
  `reelclaw-studio/` holds the templates, cached media, `reels/` and `renders/`. Old per-concept
  folders can stay next to it (or be deleted once you've kept the MP4s you want); clips in
  `reelclaw-studio/footage/` are reused as they are, and owned DansUGC clips are never charged
  again.
- Template ids are kebab-case now (`reaction-demo`, `no-yapping`, `greenscreen-reaction`); the old
  snake_case ids still work as aliases. Four templates are new: `wall-of-text`, `listicle`,
  `talking-head-captions`, `before-after`.
- Renders use HyperFrames 0.8 (pinned by the engine), and QA is `reelclaw qa` (timeline-aware
  frames + report) instead of the plugin's frame script.
- Nothing changes on the DansUGC side: same sign-in, credits, prices, tools and two-step purchases.

## Verified against (2026-10-23)

Claude Code 2.1.283 and Codex CLI 0.162.1, plus:

- Claude Code — create a marketplace: https://code.claude.com/docs/en/plugin-marketplaces
- Claude Code — marketplace reference (schema, sources, reserved names): https://code.claude.com/docs/en/plugins/marketplace-reference
- Claude Code — plugin manifest reference (`plugin.json`, standard layout, `.mcp.json`): https://code.claude.com/docs/en/plugins-reference
- Claude Code — MCP (`--transport http`, `/mcp` OAuth, plugin MCP servers and tool naming): https://code.claude.com/docs/en/mcp
- Claude Code — skills (frontmatter, `$ARGUMENTS`, `/plugin:skill` namespacing, commands merged into skills): https://code.claude.com/docs/en/skills
- Agent Skills open standard (SKILL.md frontmatter limits, progressive disclosure): https://agentskills.io/specification
- Codex — MCP (`[mcp_servers.<name>]`, `url`, `codex mcp add --url`, `codex mcp login`): https://developers.openai.com/codex/mcp (→ learn.chatgpt.com/docs/extend/mcp?surface=cli)
- Codex — skills (`~/.agents/skills`, repo `.agents/skills`, `$skill` invocation, `agents/openai.yaml`): https://developers.openai.com/codex/skills (→ learn.chatgpt.com/docs/build-skills)
- Codex — plugins (`.codex-plugin/plugin.json`, marketplace at `.agents/plugins/marketplace.json` or legacy `.claude-plugin/marketplace.json`, `codex plugin marketplace add owner/repo`): https://developers.openai.com/plugins/build/plugins
- reelclaw engine (`danielhangan/reelclaw-templates`: `reelclaw add | make | qa | batch | render |
  doctor`, the `reelclaw-playbook` skill, `hyperframes@0.8.181`, Node 22+).

Local checks run for 3.0: `claude plugin validate` on the marketplace and the plugin; `install.sh`
run twice into a scratch skills dir (the second time over planted stale 2.x files and a
`reelclaw-ads` folder, which it removed); and the skill's flow in two scratch product repos (the
real GitHub installer, and a local checkout): `add reaction-demo --dir reelclaw-studio`, the
playbook present in `.claude/skills/` and `.agents/skills/`, then
`npx reelclaw make reaction-demo --props props/<name>.json --draft --workers 2` inside
`reelclaw-studio/` (rendered, `reelclaw qa` ran), `batch --dry-run`, a delivery-quality `render`,
and the copy to `reelclaw-output/`.
