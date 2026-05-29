# Tool Setup Guide

## DanSUGC — UGC B-Roll Reaction Library

**What it is:** A marketplace of UGC reaction videos (shocked, crying, happy, frustrated, etc.) perfect for hook clips in short-form content.

**Setup:**
1. Go to [dansugc.com](https://dansugc.com) and create an account
2. Navigate to **Developers** section in your dashboard
3. Generate an API key (starts with `dsk_`)
4. Add the MCP server to Claude Code:

```bash
claude mcp add --transport http -s user dansugc https://dansugc.com/api/mcp \
  -H "Authorization: Bearer dsk_YOUR_API_KEY_HERE"
```

5. Restart Claude Code after adding

**Available MCP Tools:**
- `mcp__dansugc__search_videos` — Search by emotion, keyword, or semantic description
- `mcp__dansugc__get_video` — Get details for a specific video by ID
- `mcp__dansugc__purchase_videos` — Purchase videos (deducts credits, returns download URLs)
- `mcp__dansugc__list_purchases` — List previously purchased videos
- `mcp__dansugc__get_balance` — Check remaining credits
- `mcp__dansugc__tiktok_search_videos` — Search TikTok videos by keyword
- `mcp__dansugc__tiktok_user_videos` — Get a TikTok user's videos
- `mcp__dansugc__tiktok_search_users` — Search for TikTok users
- `mcp__dansugc__instagram_search_reels` — Search Instagram reels
- `mcp__dansugc__instagram_user_reels` — Get an Instagram user's reels
- `mcp__dansugc__scrapecreators_raw` — Raw proxy to any ScrapCreators endpoint
- **Posting tools** (requires Posting subscription): `check_posting_subscription`, `list_posting_accounts`, `get_media_upload_url`, `create_post`, `list_posts`, `update_post`, `delete_post`, `get_posting_analytics`, `list_social_sets`, `create_social_set`

**Important:** You must **purchase** videos before downloading them. The `purchase_videos` tool returns **storage URLs** (not dansugc.com URLs) in the `download_url` field. These are the ONLY valid download URLs. **Never construct dansugc.com download URLs** — paths like `/api/broll/download` are internal browser routes that require session cookies and will fail with API keys.

**Pricing:** Credit-based. Each video costs credits. Check your balance before bulk purchases.

---

## DanSUGC Posting — TikTok & Instagram Publishing

Same `dsk_` API key and same MCP server as the B-Roll API — no extra setup. Requires an active Posting subscription (check via `mcp__dansugc__check_posting_subscription`).

**Critical:** As of this version, `create_post` only accepts `media_urls` that were issued by `get_media_upload_url`. External hosts (tmpfiles.org, Dropbox, Google Drive, S3, etc.) will be rejected with `400 media_url not recognized`. This is a security boundary, not a limitation. See [`references/posting-upload.md`](./posting-upload.md) for the full upload recipe.

**Requirements:**
- Active DanSUGC Posting subscription (separate from B-Roll credits — activate at [dansugc.com/dashboard](https://dansugc.com/dashboard))
- TikTok and/or Instagram accounts connected in your DanSUGC dashboard

**Available MCP Tools:**
- `mcp__dansugc__check_posting_subscription` — Plan + usage
- `mcp__dansugc__list_social_sets` — List account groupings
- `mcp__dansugc__create_social_set` — New account grouping
- `mcp__dansugc__list_posting_accounts` — Connected TikTok/Instagram accounts (returns UUIDs needed for `create_post`)
- `mcp__dansugc__get_media_upload_url` — **NEW** — Presigned R2 PUT URL for one video or image
- `mcp__dansugc__create_post` — Create / schedule / publish. `media_urls` MUST come from `get_media_upload_url`
- `mcp__dansugc__list_posts` — List posts by status (draft/scheduled/published/failed)
- `mcp__dansugc__update_post` — Reschedule / edit caption
- `mcp__dansugc__delete_post` — Delete a post
- `mcp__dansugc__get_posting_analytics` — Followers / engagement / top posts

**Usage (3-step publish flow):**

```
# 1. Check subscription
mcp__dansugc__check_posting_subscription()

# 2. List connected accounts (capture the UUID for each target account)
mcp__dansugc__list_posting_accounts()
# → Returns: id (UUID), platform, username, followers, total_views

# 3. Presign an upload URL for the rendered video
mcp__dansugc__get_media_upload_url(
  content_type="video/mp4",
  size_bytes=<exact bytes>
)
# → Returns: upload_url (presigned R2 PUT, 5min TTL), public_url, expires_at, max_bytes
```

```bash
# 4. PUT the file body to upload_url with the EXACT signed Content-Type
curl --fail -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary "@./out/reel-001.mp4"
```

```
# 5. Schedule the post — media_urls MUST be the public_url from step 3
mcp__dansugc__create_post(
  account_ids=["<account-uuid>"],
  caption="Hook text...\n\n#hashtag1 #hashtag2 #fyp",
  media_urls=["<public_url>"],
  scheduled_for="2026-03-25T18:00:00Z",
  timezone="America/New_York"
)

# Or publish immediately:
mcp__dansugc__create_post(
  account_ids=["<account-uuid>"],
  caption="Caption...",
  media_urls=["<public_url>"],
  publish_now=true
)

# Check post status
mcp__dansugc__list_posts()

# View analytics
mcp__dansugc__get_posting_analytics(range="30d")
```

**Key rules:**
- The caption field is `caption` (not `content`). Older skill versions used `content` — that field name no longer exists.
- ONE unique video per account — never post the same video to multiple accounts.
- Currently supports TikTok and Instagram only.
- Presigned URLs are single-use with a 5-minute TTL — PUT the bytes immediately.
- The `Content-Type` header on the PUT must match the MIME passed to `get_media_upload_url` byte-for-byte.
- Max 10 `media_urls` per post; 200 MB video / 25 MB image; default quota 1 GB / 100 files per 24h.

---

## Social Media Analytics — DanSUGC Proxy (powered by ScrapCreators)

**What it is:** Real-time social media analytics for tracking video performance across TikTok, Instagram, YouTube, and 25+ platforms. Included with your DanSUGC API key — no extra setup needed.

**Setup:** None! Analytics are proxied through DanSUGC. Uses the same MCP server you already have — no extra configuration needed.

**Pricing:** $0.02 per request, deducted from your DanSUGC balance.

**Available MCP Tools:**
- `mcp__dansugc__tiktok_search_videos` — Search TikTok videos by keyword
- `mcp__dansugc__tiktok_user_videos` — Get a TikTok user's videos
- `mcp__dansugc__tiktok_search_users` — Search for TikTok users
- `mcp__dansugc__instagram_search_reels` — Search Instagram reels
- `mcp__dansugc__instagram_user_reels` — Get an Instagram user's reels
- `mcp__dansugc__scrapecreators_raw` — Raw proxy to any ScrapCreators endpoint

**Usage (MCP tool calls):**
```
# Search TikTok videos by keyword
mcp__dansugc__tiktok_search_videos(query="KEYWORD", sort_by="relevance")

# Get a TikTok user's videos (sorted by popular)
mcp__dansugc__tiktok_user_videos(handle="USERNAME", sort_by="popular")

# Search for TikTok users
mcp__dansugc__tiktok_search_users(query="KEYWORD")

# Search Instagram reels
mcp__dansugc__instagram_search_reels(query="KEYWORD")

# Get an Instagram user's reels
mcp__dansugc__instagram_user_reels(handle="USERNAME")

# Raw proxy — use for any ScrapCreators endpoint not covered above
mcp__dansugc__scrapecreators_raw(path="v1/tiktok/video", params={"url": "VIDEO_URL"})
```

**Path mapping:** Prepend `https://app.dansugcmodels.com/api/v1/scrapecreators/` to any ScrapCreators path. All query params and request bodies are forwarded as-is. Response format is identical.

**Error codes:**
- `402` — Insufficient DanSUGC balance (tell user to top up credits)
- `403` — API key not linked to a user account
- `502` — ScrapCreators unreachable (auto-refunded, safe to retry)

---

## Gemini — Video Intelligence

**What it is:** Google's Gemini AI model used for analyzing demo screen recordings — identifying the best segments, UI transitions, and emotional moments.

**Setup:**
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create an API key
3. Set it as an environment variable:

```bash
export GEMINI_API_KEY="your_key_here"
```

**Always use model: `gemini-3.1-flash-lite-preview`** — optimized for video understanding tasks.

**Direct video upload for analysis:**
```bash
# Step 1: Upload video file
FILE_URI=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/upload/v1beta/files?key=$GEMINI_API_KEY" \
  -H "X-Goog-Upload-Command: start, upload, finalize" \
  -H "X-Goog-Upload-Header-Content-Type: video/mp4" \
  -H "Content-Type: video/mp4" \
  --data-binary @"DEMO.mp4" | python3 -c "import sys,json; print(json.load(sys.stdin)['file']['uri'])")

# Step 2: Analyze
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [{
      \"parts\": [
        {\"text\": \"YOUR ANALYSIS PROMPT HERE\"},
        {\"file_data\": {\"file_uri\": \"$FILE_URI\", \"mime_type\": \"video/mp4\"}}
      ]
    }],
    \"generationConfig\": {\"temperature\": 0.2, \"response_mime_type\": \"application/json\"}
  }"
```
