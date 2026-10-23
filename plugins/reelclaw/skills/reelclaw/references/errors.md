# Error playbook

Tool errors come back as `isError: true` with JSON
`{ code, message, retryable, field?, retry_after_seconds?, next_action? }`. Read the `message` and
follow `next_action` when present — they say exactly what to do. Never loop blindly.

## General policy

- `retryable: true` → wait (`retry_after_seconds`, an HTTP `Retry-After`, or 30 s) and retry the
  SAME call. Max 3 attempts, then tell the user.
- `retryable: false` → don't retry unchanged. Fix the cause (below) or report it.
- Never work around a spend guard (quote, price, credits). Re-quote and re-confirm instead.

## Codes

| Code | Meaning | Recovery |
|---|---|---|
| `insufficient_credits` (402) | Not enough credits for a clip purchase or a research query. Nothing was charged. | Send the user to https://dansugc.com/dashboard/credits, or check for a team account (below). To lower cost: use clips the account already owns (`list_purchases`), fewer new clips, or skip research. |
| `music_search_unavailable` / `rate_limited` (`reelclaw_trending_music`) | TikTok music search failed or is busy. Nothing was charged. | Retry once after `retry_after_seconds` (or ~30 s). Still failing: ask the user for a sound link, or render without music (no `music` param). |
| `account_unavailable` | The `project_id` isn't a team the user can use (research tools like `reelclaw_trending_music`, or `reelclaw_suggest_formats`). Nothing was charged. | `list_accounts`, or omit `project_id` for the Personal Account. |
| `reelclaw_login_required`, or any "no longer accepts API keys — reconnect with OAuth" error | The server was connected with a DansUGC API key. MCP is OAuth-only now; keys are for the REST API. | Remove the key setup — Claude Code: `claude mcp remove dansugc`, re-add it with no auth header: `claude mcp add --transport http dansugc https://dansugc.com/mcp` or use the plugin; Codex: delete `bearer_token_env_var` from `[mcp_servers.dansugc]` in `~/.codex/config.toml`. Then log in: Claude Code `/mcp` → `plugin:reelclaw:dansugc` (or `dansugc`) → Authenticate; Codex `codex mcp login dansugc`. Never ask the user for an API key. |
| 401 / `auth_required` | Not logged in or the token expired. | Same as above: re-run the OAuth login. |
| `invalid_input` | A parameter failed validation (`field` names it). For `niche`, the message lists every valid slug. | Fix that input and retry. |
| `request_failed` | Unexpected server error (logged by DansUGC). | Retry once after 30 s; then report it. |

## Removed tools

The DansUGC MCP no longer renders or edits videos. These tools were removed in ReelClaw 2.0:
`reelclaw_options`, `reelclaw_create_batch`, `reelclaw_advance_batch`, `reelclaw_get_batch`,
`reelclaw_list_batches`, `reelclaw_update_batch`, `reelclaw_add_demo`, `reelclaw_manage_demo`,
`reelclaw_quote`, `reelclaw_render`, `reelclaw_resume_batch`, `reelclaw_cancel_video`,
`reelclaw_get_overlay`.

- A "tool not found" / "unknown tool" error for one of them means an old plugin or skill is
  installed. Don't retry: make the reels locally (SKILL.md sections 1-3) and tell the user to update.
  - Claude Code (terminal): `claude plugin marketplace update dansugc` then
    `claude plugin update reelclaw@dansugc`, then restart the session. If it still loads the old
    skill: `claude plugin uninstall reelclaw@dansugc` + `claude plugin install reelclaw@dansugc`.
  - Codex plugin: `codex plugin marketplace upgrade dansugc`, then `codex plugin remove reelclaw@dansugc` +
    `codex plugin add reelclaw@dansugc`, and start a new session. Script installs: re-run
    `curl -fsSL https://raw.githubusercontent.com/dansugc/reelclaw/main/codex/install.sh | sh`.
  - Other agents: `npx skills add dansugc/reelclaw/plugins/reelclaw/skills/reelclaw -a <agent> -y`
    again, and remove any old `reelclaw-ads` skill folder.
  - Not sure which command applies: reinstall the plugin or skill from https://dansugc.com/reelclaw.
- Batches made earlier in the browser are still in the DansUGC dashboard
  (https://dansugc.com/dashboard/reelclaw); the MCP can't read them.

## Clip purchases, research, accounts

- **Low balance on a purchase or research query**: the user may be on a team with its own credits.
  `list_accounts`, ask which account to use (never switch on your own), re-quote with that
  `project_id`. Otherwise top up at https://dansugc.com/dashboard/credits.
- **`purchase_videos` total differs from the one the user approved** (prices or ownership changed
  between the quote and the buy): don't retry blindly; quote again (no `expected_total_cents`),
  show the new total, get a fresh yes.
- **Expired clip `download_url`** (~1 h): `list_purchases` / `get_video` (same `project_id`) give a
  fresh link; owned clips are never charged again.
- **Research query failed**: failed queries aren't charged; retry once, then move on without it.

## Local rendering

Editing and rendering run on this machine with the reelclaw engine in `reelclaw-studio/`; nothing
here touches DansUGC or credits. Run these inside `reelclaw-studio/`:

- `npx reelclaw doctor`: Node 22+, ffmpeg/ffprobe, yt-dlp (optional), HyperFrames, headless Chrome,
  project assets. It prints the install line for anything missing; show it to the user and wait.
- `npx reelclaw qa <name>`: canvas, duration, audio (or SILENT), black/frozen frames, music tail
  fade and the renderer's silent failures; writes `renders/qa/<name>/report.txt` and the frames to
  look at. Exit 1 = a problem to fix before delivering.
- `renders/<name>.render.log`: the full HyperFrames log of the last render (the renderer can exit 0
  while a font, GSAP or a video failed to load; `qa` surfaces those as render warnings).
- `npx reelclaw make <template> --help`: every input of a template, with defaults.

| Symptom | Fix |
|---|---|
| `npm error 404 Not Found - GET https://registry.npmjs.org/reelclaw` | `npx reelclaw` ran outside `reelclaw-studio/` (or before `add`), so npx looked on npm. `cd reelclaw-studio`; to install, use the installer from SKILL.md section 1. |
| `template "<id>" is not installed here` (its hint says `npx reelclaw@latest add`), or any `npx reelclaw@latest add` fails | From the repo root: `<installer> add <id> --dir reelclaw-studio`, with the installer from SKILL.md section 1 (the npm package may not be published yet). |
| First render is slow | One-time HyperFrames + headless Chrome download. |
| A hand edit to `reels/<name>.html` vanished | `make` with the same `--name` overwrites it. Edit, `npx reelclaw check <name>`, `npx reelclaw render <name>`. |
