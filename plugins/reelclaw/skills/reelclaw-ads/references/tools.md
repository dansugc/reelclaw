# DansUGC MCP tool reference (ReelClaw + library + research + posting)

Server: `dansugc` at `https://dansugc.com/mcp` (streamable HTTP). Auth: OAuth only — the user logs
in with their DansUGC account in the browser; no subscription needed. DansUGC API keys (`dsk_…`)
are for the REST API and are rejected on MCP (`reelclaw_login_required` / "reconnect with OAuth").

Cost: pay-as-you-go from DansUGC credits. Editing and rendering are free; only reactions the account
doesn't already own are charged (library clips from $5). ReelClaw research is free; other research
queries through the MCP (TikTok/Instagram search) cost $0.02 per ScrapeCreators query, only on
success. `reelclaw_quote` gives the exact number before anything is spent.

The authoritative input schema is the one your client shows for each tool; this page is a map.

## Shared result shape

Batch results (`create_batch`, `advance_batch`, `get_batch`, `update_batch`) share:

```
batch_id, name, stage ("product" | "reactions" | "text" | "ready" | "rendering"), project_id,
created_at, video_count, overlay_id?,
reactions: [{ id, emotion, duration_seconds, thumbnail_url, preview_url, owned, excluded }],
hooks:     [{ id, text, format }],
demos:     [{ id, name, size_bytes, status }],
music_links, suggested_music_links?, dashboard_url, next_action
```

Reactions carry no creator names. Always follow `next_action`.

Errors: `isError: true` with `{ code, message, retryable, field?, retry_after_seconds?, next_action? }`
— see [errors.md](errors.md).

## Tools

| Tool | Input | Returns / notes |
|---|---|---|
| `reelclaw_options` | `project_id?` | Filter values: niches (with counts), emotions, genders, creators, collections, purchased packages, `ownership: ["all","owned","not_owned"]`. Read-only. |
| `reelclaw_create_batch` | `brief` (10–24000 chars), `product_url?`, `video_count?` 1–60 (default 10), `direction?`, `custom_hooks?` (≤30, verbatim), `filters?` `{ ownership?, gender?, niches?, emotions?, creator_ids?, collection_ids?, package_ids? }`, `reference_url?` (TikTok/IG ad **video**; Personal Account only), `project_id?` | Batch at stage `product`. Free. |
| `reelclaw_advance_batch` | `batch_id` | Runs research ≤ ~45 s per call. Adds `done`; when not done, `poll_after_seconds` (1, or 5 with `waiting_for: "overlay"`, `overlay_id`, `overlay_state`). Call again until `done`. Free. |
| `reelclaw_get_batch` | `batch_id` | Batch + `videos: [{ id, index, state, label, progress_percent, hook, demo_name, reaction_id, favorite, duration_seconds?, error: { code, message, retryable } \| null, download_url?, download_expires_at? }]`, `summary: { total, ready, failed, canceled, in_progress }`, `poll_after_seconds: 20` while any video is non-terminal. `download_url` only when `state: "ready"`. Read-only. |
| `reelclaw_list_batches` | `project_id?`, `all?`, `cursor?` | 5 newest with video counts by default; `all: true` (+ `cursor`) pages 30 at a time. |
| `reelclaw_update_batch` | `batch_id`, `hooks?` (FULL list, `[{ id?, text }]`, 1–60), `music_links?` (≤10 TikTok/IG sound links; one picked per video; `[]` = no music), `exclude_reaction_ids?`, `include_reaction_ids?`, `replace_reaction_id?` | Updated batch. Stage must be `ready`. Invalidates any earlier quote. |
| `reelclaw_add_demo` | `batch_id` + EXACTLY one of: `{ filename, size_bytes (≤ 50 MB), content_type: "video/mp4" \| "video/quicktime" }` or `{ source_url }` (https `.mp4`/`.mov`) | Local: `{ demo_id, status: "uploading", upload_url, method: "PUT", headers: { "Content-Type" }, size_bytes, expires_at, curl }` — HTTP 200 from the PUT = ready. URL: `{ demo_id, status, demos }`, imported server-side. Stage must be `ready`. Max 20 demos. |
| `reelclaw_manage_demo` | `batch_id`, `demo_id`, `action: "complete" \| "remove"` | `complete` only for a demo stuck in `uploading` after a successful PUT; `remove` deletes one. |
| `reelclaw_quote` | `batch_id`, `count` 1–60, `hooks?`, `music_links?` | `{ quote_id, count, expires_at (~14 min), new_reactions, owned_reactions, reaction_credits, editing_credits, total_credits, available_credits, sufficient_credits, admin_exempt, confirmation_required: true }`. **Show it and get an explicit yes.** Read-only. |
| `reelclaw_render` | `batch_id`, `quote_id` (required), `count`, `hooks?`, `music_links?` — same as quoted | **Spends credits** (marked destructive). `{ stage: "rendering", count, poll_after_seconds }`. |
| `reelclaw_resume_batch` | `batch_id` | Retries retryable failed videos and restarts a stalled render. No extra charge. |
| `reelclaw_cancel_video` | `video_id` | Cancels one rendering video; irreversible; its reserved credits are released. Only on user request. |
| `reelclaw_get_overlay` | `overlay_id` | `reference_url` flow: `state` (processing/ready/failed), `duration_seconds`, `text_layer_id`, `text_layers`, detected `reaction`. If no text layer is chosen, the user must pick one in the dashboard editor before rendering. |

## Accounts, library, research, posting (both modes; studio mode relies on these)

Every account-scoped tool takes an optional `project_id`: omit it for the Personal Account, pass a
team's id (from `list_accounts`) to use that team's credits, clips, and plan discounts. Never switch
accounts on your own; name the team and amount before its first spend in a conversation.

| Tool | Input | Returns / notes |
|---|---|---|
| `list_accounts` | none | Personal Account + teams the user belongs to (with `project_id`). Call it when the user mentions a team/company/teammate, or a spend fails for low personal balance. |
| `get_balance` | `project_id?` | available credits for that account |
| `search_videos` | `semantic_search?`, `search?`, `emotion?`, `gender?`, `age_range?`, `location?`, `min_virality?`, `sort_by?`, `limit?`, `page?`, `project_id?`… | library clips (real creators): price, duration, emotion, virality, creator, `Preview` URL; a download link for clips the account owns. Free. |
| `get_video` | `video_id`, `project_id?` | one clip's details, price, preview; download link if owned |
| `purchase_videos` | `video_ids` (1-50), `project_id?`, `expected_total_cents?` | **Two-step.** Without `expected_total_cents`: a quote (exact total + account charged), nothing charged. With it (after the user's yes): charges and returns a signed `download_url` per clip (~1 h); owned clips come back under "Already Purchased", free. Team-bought clips belong to the team. |
| `list_purchases` | filters, `project_id?` | clips the account owns, with fresh download links |
| `tiktok_search_videos` / `tiktok_user_videos` / `tiktok_search_users` / `instagram_search_reels` / `instagram_user_reels` / `scrapecreators_raw` | query / handle / path, `project_id?` | research data; **$0.02 per successful query** from the selected account (research.md) |
| `check_posting_subscription` | none | posting plan status (posting needs a plan; nothing else does) |
| `list_posting_accounts` | none | connected TikTok/Instagram accounts (UUIDs) |
| `get_media_upload_url` | `content_type`, `size_bytes` | single-use PUT URL (5 min) + `public_url` |
| `create_post` | `account_ids`, `caption`, `media_urls` (from `get_media_upload_url`), `scheduled_for?`/`publish_now?`, `timezone?`, `platform_settings?` | schedules/publishes (publishing.md) |
| `list_posts` | filters | post status |

## Pricing model (what to tell users)

- No subscription: pay-as-you-go from DansUGC credits.
- Reaction matching, hook writing, editing, overlays, music, and rendering are **free**.
- Research queries run through the MCP outside ReelClaw (TikTok/Instagram search) cost **$0.02 per
  ScrapeCreators query**, charged only on success.
- For rendering, the only cost is licensing **new** reactions from the DansUGC library that the account doesn't
  already own. Owned reactions are free to reuse (`filters.ownership: "owned"` for a zero-credit batch).
- Studio mode: editing and rendering happen locally and are free; the only charges are clips bought
  with `purchase_videos` (exact total from its quote step) and research queries.
- The exact cost is whatever `reelclaw_quote` / the `purchase_videos` quote returns — never estimate. Credits are topped up at
  https://dansugc.com/dashboard/credits.

## Upload recipe

```sh
FILE="./demo.mp4"
SIZE=$(wc -c < "$FILE" | tr -d ' ')
# reelclaw_add_demo { batch_id, filename: "demo.mp4", size_bytes: <SIZE>, content_type: "video/mp4" }
curl -fsS -X PUT -H "Content-Type: video/mp4" --data-binary @"$FILE" "$UPLOAD_URL"
```

Prefer the `curl` string the tool returns; use its `headers` verbatim.

## Download recipe

```sh
OUT="./reelclaw-output/$BATCH_ID"; mkdir -p "$OUT"
curl -fL -o "$OUT/01-pov-your-phone-wont-open.mp4" "$DOWNLOAD_URL"
```

Name files `<two-digit index>-<first words of the hook, kebab-case>.mp4`.

## Batches are shared with the dashboard

A batch created here opens at `https://dansugc.com/dashboard/reelclaw?session=<batch_id>` and vice
versa — the user can switch to the web UI at any point, and you can pick up a batch they started
there (`reelclaw_list_batches` → `reelclaw_get_batch`).
