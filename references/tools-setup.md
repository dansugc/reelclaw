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

**Important:** You must **purchase** videos before downloading them. The `purchase_videos` tool returns download URLs after successful purchase. Always check your balance first with `get_balance`.

**Pricing:** Credit-based. Each video costs credits. Check your balance before bulk purchases.

---

## Post-Bridge — Social Media Scheduling

**What it is:** A social media scheduling API that publishes videos to TikTok, Instagram, YouTube, and more.

**Setup:**
1. Go to [post-bridge.com](https://www.post-bridge.com) and create an account
2. Connect your social media accounts (TikTok, Instagram, etc.)
3. Go to **Settings -> API** and generate an API key (starts with `pb_live_`)
4. Add the MCP server:

```bash
claude mcp add --transport http -s user post-bridge https://www.post-bridge.com/api/mcp/mcp \
  -H "Authorization: Bearer pb_live_YOUR_API_KEY_HERE"
```

5. Restart Claude Code after adding

**Available MCP Tools:**
- `mcp__post-bridge__list_social_accounts` — List connected accounts with IDs
- `mcp__post-bridge__create_post` — Create/schedule posts with media URLs
- `mcp__post-bridge__list_posts` — List scheduled/published posts
- `mcp__post-bridge__list_analytics` — View post performance analytics
- `mcp__post-bridge__update_post` — Update scheduled posts (only scheduled, not drafts)
- `mcp__post-bridge__delete_post` — Delete scheduled posts (only scheduled, not drafts)

**Key rules:**
- ONE video per ONE account — distribute unique videos across accounts
- Use `is_draft: true` for drafts, omit for scheduled posts
- Videos need **public URLs** — use tmpfiles.org for temporary hosting (use `/dl/` prefix for direct download URLs)
- Use `media_urls` parameter with public video URLs (the API downloads them)
- Drafts cannot be updated or deleted via API — only scheduled posts can

---

## ScrapeCreators — Social Media Analytics Tracking

**What it is:** A real-time social media scraping API for tracking video performance across TikTok, Instagram, YouTube, and 25+ platforms.

**Setup:**
1. Go to [scrapecreators.com](https://scrapecreators.com) and create an account
2. Get your API key from the dashboard
3. Set it as an environment variable:

```bash
export SCRAPECREATORS_API_KEY="your_key_here"
```

**API Documentation:** [docs.scrapecreators.com](https://docs.scrapecreators.com)

**Usage (REST API via curl):**
```bash
# Get TikTok video details by URL
curl -s "https://api.scrapecreators.com/v1/tiktok/video?url=VIDEO_URL" \
  -H "x-api-key: $SCRAPECREATORS_API_KEY"

# Get TikTok user profile
curl -s "https://api.scrapecreators.com/v1/tiktok/user?username=USERNAME" \
  -H "x-api-key: $SCRAPECREATORS_API_KEY"

# Search TikTok videos by keyword
curl -s "https://api.scrapecreators.com/v1/tiktok/search?query=KEYWORD" \
  -H "x-api-key: $SCRAPECREATORS_API_KEY"
```

**Pricing:** Credit-based, pay-as-you-go. Free tier available for testing.

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
