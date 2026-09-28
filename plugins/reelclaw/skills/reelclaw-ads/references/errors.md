# Error playbook

Tool errors come back as `isError: true` with JSON
`{ code, message, retryable, field?, retry_after_seconds?, next_action? }`. Read the `message` and
follow `next_action` when present — they say exactly what to do. Never loop blindly.

## General policy

- `retryable: true` → wait (`retry_after_seconds`, an HTTP `Retry-After`, or `poll_after_seconds`
  if present; otherwise 30 s) and retry the SAME call. Max 3 attempts, then tell the user and give
  the `dashboard_url`.
- `retryable: false` → don't retry unchanged. Fix the cause (below) or report it.
- Never work around a spend guard (quote, price, credits). Re-quote and re-confirm instead.

## Codes

| Code | Meaning | Recovery |
|---|---|---|
| `session_changed` (409) | The batch was edited elsewhere (dashboard tab, teammate) after you read it. | `reelclaw_get_batch`, re-apply your change on the fresh state, retry **once**. If it fails again, tell the user the batch is being edited elsewhere. |
| `insufficient_credits` (402) | Not enough credits for the new reactions in a quote (or for a clip purchase / research query). | Don't render. Send the user to https://dansugc.com/dashboard/credits. After top-up, `reelclaw_quote` again and get a fresh yes. To lower cost: exclude new reactions, filter `ownership` to owned reactions, or reduce `count`. |
| `price_changed` (409) | The batch was edited after the quote (any edit invalidates it), or ownership/pricing changed. | Re-quote, show the new price, get a fresh yes. |
| `quote_required` (400) | Render called without a valid `quote_id`. | `reelclaw_quote` → confirm → render. |
| `reactions_changed` | Some matched reactions no longer fit the filters or are unavailable. | `reelclaw_update_batch` with `replace_reaction_id` / `exclude_reaction_ids` (`reelclaw_advance_batch` is a no-op once the batch is `ready`; for a fresh selection create a new batch); review; re-quote. |
| `batch_not_ready` (400) | Research not finished, no hooks/reactions, or a demo isn't ready. | Loop `reelclaw_advance_batch` to `ready`; check every demo is `ready` (a PUT that returned 200 is ready; `reelclaw_manage_demo … complete` only for a demo stuck in `uploading`). |
| `variation_count` (400) | With a `reference_url` overlay, count must equal the number of hooks. | Make `count` = number of hooks (or add/remove hooks). |
| `overlay_processing` / `overlay_not_ready` | Reference overlay still extracting, or no text layer picked. | Keep calling `reelclaw_advance_batch` (it waits); if `reelclaw_get_overlay` says no text layer is chosen, send the user to the `dashboard_url` editor to pick one. |
| `invalid_upload` / `invalid_signature` / `upload_exists` / `upload_not_pending` | Wrong size/type, expired link, or the slot was already used. | See "Upload problems" below. |
| `too_many_demos` (409) | Max 20 demos per batch. | Remove some with `reelclaw_manage_demo … remove`. |
| `reference_*_unavailable`, `overlay_*` | The reference ad couldn't be read. | Continue without `reference_url`, or ask the user for a different public link. |
| `billing_unavailable`, `billing_settlement_failed`, `workflow_*`, `upstream_error`, `queue_error` (usually retryable) | Temporary platform issue. Nothing is lost. | Wait and retry per policy; for rendering videos, `reelclaw_resume_batch`. |
| `music_search_unavailable` / `rate_limited` (`reelclaw_trending_music`) | TikTok music search failed or is busy. Nothing was charged. | Retry once after `retry_after_seconds` (or ~30 s). Still failing: ask the user for a sound link, or render without music (`music_links: []`). |
| `account_unavailable` | The `project_id` isn't a team the user can use (research tools like `reelclaw_trending_music`). Nothing was charged. | `list_accounts`, or omit `project_id` for the Personal Account. |
| `not_found` | Wrong id, or the batch belongs to another account/project. | `reelclaw_list_batches` (pass `project_id` if it's a team project). |
| `invalid_input` | A parameter failed validation (`field` names it). | Fix that input and retry. |
| `request_failed` | Unexpected server error (logged by DansUGC). | Retry once after 30 s; then report and give the `dashboard_url`. |
| `reelclaw_login_required`, or any "no longer accepts API keys — reconnect with OAuth" error | The server was connected with a DansUGC API key. MCP is OAuth-only now; keys are for the REST API. | Remove the key setup — Claude Code: `claude mcp remove dansugc`, re-add it with no auth header: `claude mcp add --transport http dansugc https://dansugc.com/mcp` or use the plugin; Codex: delete `bearer_token_env_var` from `[mcp_servers.dansugc]` in `~/.codex/config.toml`. Then log in: Claude Code `/mcp` → `plugin:reelclaw:dansugc` (or `dansugc`) → Authenticate; Codex `codex mcp login dansugc`. Never ask the user for an API key. |
| 401 / `auth_required` | Not logged in or the token expired. | Same as above: re-run the OAuth login. |

## Upload problems (curl)

A failed PUT leaves its demo in `uploading`, which blocks rendering (`batch_not_ready`). Before
retrying, remove that slot with `reelclaw_manage_demo { batch_id, demo_id, action: "remove" }`,
then call `reelclaw_add_demo` again for a fresh one.

- `403 invalid_signature` → the signed URL expired (1 h) or was altered (always quote the URL in
  the shell — it contains `&`). Remove the slot and call `reelclaw_add_demo` again.
- `400 invalid_upload` "file size does not match" → `Content-Length` ≠ `size_bytes`. Use
  `--data-binary @file` (not `-d`, not `-F`, which change the body) and the exact byte count from
  `wc -c < file`.
- `400 invalid_upload` "file type does not match" → `Content-Type` must be exactly the
  `content_type` you declared (`video/mp4` or `video/quicktime`).
- `409 upload_exists` → this slot already received a file; `reelclaw_get_batch` to check the demo
  is ready, or request a new slot.

## Download problems

- `403 invalid_signature` on `download_url` → link expired (24 h). `reelclaw_get_batch` returns fresh ones.
- Partial file → re-run the same `curl -fsSL -o …`; range requests are supported (`curl -C -`).

## Clip purchases, research, accounts (both modes)

- **Low balance on a purchase or research query**: the user may be on a team with its own credits.
  `list_accounts`, ask which account to use (never switch on your own), re-quote with that
  `project_id`. Otherwise top up at https://dansugc.com/dashboard/credits.
- **`purchase_videos` total differs from the one the user approved** (prices or ownership changed
  between the quote and the buy): don't retry blindly; quote again (no `expected_total_cents`),
  show the new total, get a fresh yes.
- **Expired clip `download_url`** (~1 h): `list_purchases` / `get_video` (same `project_id`) give a
  fresh link; owned clips are never charged again.
- **Research query failed**: failed queries aren't charged; retry once, then move on without it.
- Studio-mode local problems (Node, npx, Chrome, render, QA): studio-templates.md → Troubleshooting.
