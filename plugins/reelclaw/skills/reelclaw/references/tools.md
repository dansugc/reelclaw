# DansUGC MCP tool reference (library + packages + viral formats + music + research + posting)

Server: `dansugc` at `https://dansugc.com/mcp` (streamable HTTP). Auth: OAuth only — the user logs
in with their DansUGC account in the browser; any account works, no plan needed. DansUGC API keys (`dsk_…`) are for the REST API and are
rejected on MCP (`reelclaw_login_required` / "reconnect with OAuth").

**The MCP server does not edit or render videos.** It has no batch, quote or render tools. You edit
and render locally with the ReelClaw templates (SKILL.md section 4); the server supplies clips,
viral formats, trending music, research and posting.

Cost: no plan needed, pay-as-you-go from DansUGC credits. Editing and rendering are
local and free. Only reactions the account doesn't already own are charged (library clips are 11
credits each, images 8, less the plan's discount). `reelclaw_suggest_formats` and `search_videos`
are free; research queries (TikTok/Instagram search, `reelclaw_trending_music`) cost 0.02 credits
per ScrapeCreators query, only on success. All prices, quotes and balances are in credits: say "11
credits", never "$11", unless the user asks for dollars.

The authoritative input schema is the one your client shows for each tool; this page is a map.

Errors: `isError: true` with `{ code, message, retryable, field?, retry_after_seconds?, next_action? }`
— see [errors.md](errors.md).

## ReelClaw tools

| Tool | Input | Returns / notes |
|---|---|---|
| `reelclaw_suggest_formats` | `brief` (10–24000 chars, describe the product; URLs aren't scraped here), `direction?`, `niche?` (≤10 niche slugs or labels, e.g. `"edtech"`, `"Education & Study"`; skips niche detection; unknown values return the valid slugs), `project_id?` | `{ niche_source: "clef"\|"embedding"\|"explicit", niches: [{ slug, label, score, status }], formats: [{ slug, label, description, reason, score, clip_supply, niches, concepts: [{ id, title, display_name, views, outlier_multiplier, tiktok_url, thumbnail_url, clip_count }], requests: [{ id, title, concept_id, clip_count }] }], suggested_pick: { format_slugs, niche_slugs, concept_ids } \| null }`. Proven viral formats for the product, ranked by fit, virality and DansUGC clip supply. **Call first when the user is unsure what reels they want**; present 2–4 with evidence, then make the reels locally: copy the format's structure from the picked concepts (watch `tiktok_url`), choose the template and hooks, and find clips with `search_videos`. `suggested_pick` is ReelClaw's top pick. Free. Read-only. |
| `reelclaw_trending_music` | `category` (niche, e.g. "fitness app"), `country?` (default `US`), `period?` `1\|7\|30\|90\|180` days (default 7), `limit?` 1-20 (default 10), `commercial_only?`, `project_id?` | `songs: [{ rank, title, artist, duration_seconds, uses, trend: "rising"\|"popular"\|"steady", category_videos, category_video_plays, label_track, commercial_music_flag, cover_url, preview_url, music_link, example_video_url }]`, `music_links` (top 5 TikTok sound pages, for showing the user), `license_note`, `queries`, `credits_charged`, `cached`. **0.02 credits per ScrapeCreators query, 1-2 per call; cached 6 h per category + country + period (then 0 credits).** Download a song's `preview_url` and pass the file as the template's `music`. [music.md](music.md) |

## Accounts, library, research, posting

Every account-scoped tool takes an optional `project_id`: omit it for the Personal Account, pass a
team's id (from `list_accounts`) to use that team's credits, clips, and plan discounts. Never switch
accounts on your own; name the team and amount before its first spend in a conversation.

| Tool | Input | Returns / notes |
|---|---|---|
| `list_accounts` | none | Personal Account + teams the user belongs to (with `project_id`). Call it when the user mentions a team/company/teammate, or a spend fails for low personal balance. |
| `get_balance` | `project_id?` | available credits for that account |
| `search_videos` | `semantic_search?`, `search?`, `emotion?`, `gender?`, `age_range?`, `location?`, `min_virality?`, `sort_by?`, `limit?`, `page?`, `project_id?`… | library clips (real creators): price in credits, duration, emotion, virality, creator, `Preview` URL; a download link for clips the account owns. Free. |
| `get_video` | `video_id`, `project_id?` | one clip's details, price in credits, preview; download link if owned |
| `purchase_videos` | `video_ids` (1-50), `project_id?`, `expected_total_cents?` (hundredths of a credit) or `expected_total_credits?` | **Two-step.** Without `expected_total_cents`: a quote (exact total in credits, how it was built, account charged), nothing charged. With it (after the user's yes): charges and returns a signed `download_url` per clip (~1 h); owned clips come back under "Already Purchased", free. Team-bought clips belong to the team. |
| `list_purchases` | filters, `project_id?` | clips the account owns, with fresh download links |
| `search_packages` | `query?`, `creator?`, `features?`, `owned_only?`, `sort?`, `page?`, `limit?`, `project_id?` | packages: curated collections of library clips priced below buying each clip. Each result: list price in credits, estimated price with the account's discount, clip count and one-by-one value, creators, owned / available / plan-locked. Free. Prefer a package when the user wants many clips of one kind. |
| `get_package` | `package_id` or `slug`, `include_clips?`, `project_id?` | package details + its clips (watermarked previews); when owned, a signed download URL per clip (~1 h) or the package's download page |
| `purchase_packages` | `package_ids` (1-20), `project_id?`, `expected_total_cents?` or `expected_total_credits?` | **Two-step**, like `purchase_videos`: first call quotes (nothing charged), second buys after the user's yes. Owned packages are free; subscriber-exclusive packages need that plan. Returns each package's delivery page; then `get_package` for per-clip downloads. |
| `list_owned_packages` | `project_id?` | packages the account owns, with purchase date, credits paid and download links |
| `tiktok_search_videos` / `tiktok_user_videos` / `tiktok_search_users` / `instagram_search_reels` / `instagram_user_reels` / `scrapecreators_raw` | query / handle / path, `project_id?` | research data; **0.02 credits per successful query** from the selected account (research.md) |
| `check_posting_subscription` | none | posting plan status (posting needs a plan; nothing else does) |
| `list_posting_accounts` | none | connected TikTok/Instagram accounts (UUIDs) |
| `get_media_upload_url` | `content_type`, `size_bytes` | single-use PUT URL (5 min) + `public_url` |
| `create_post` | `account_ids`, `caption`, `media_urls` (from `get_media_upload_url`), `scheduled_for?`/`publish_now?`, `timezone?`, `platform_settings?` | schedules/publishes (publishing.md) |
| `list_posts` | filters | post status |

## Pricing model (what to tell users)

- No plan needed; usage is pay-as-you-go from DansUGC credits (a plan adds bonus credits and discounts).
- Editing, rendering, hook writing and QA happen on the user's machine and are **free**.
- Research queries through the MCP (TikTok/Instagram search, `reelclaw_trending_music`) cost
  **0.02 credits per ScrapeCreators query**, charged only on success. A trending-music lookup is
  1-2 queries, and a repeat within 6 hours is free (cached).
- Library clips list at **11 credits each** (images 8), less the account's plan discount (Growth
  10–15%, Scale 15–20%) or a live sale, whichever is larger. There are no volume discounts, and the
  MCP always charges current rates. Owned clips are free to reuse forever.
- The exact cost is whatever the `purchase_videos` / `purchase_packages` quote step returns — never estimate. Credits are
  topped up at https://dansugc.com/dashboard/credits.

## Download recipe (bought clips)

```sh
mkdir -p reelclaw-studio/footage
curl -fL -o reelclaw-studio/footage/reaction-shocked-1.mp4 "$DOWNLOAD_URL"
```

Signed clip links last ~1 hour; `list_purchases` / `get_video` return fresh ones.
