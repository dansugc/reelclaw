# Publishing via DansUGC Posting (only when the user asks)

Posting to TikTok/Instagram through the `dansugc` MCP needs a **DansUGC posting plan** (separate
from credits; searching/buying clips, ReelClaw, editing, and research don't need it). Never post
without the user confirming the account(s), the caption, and the time.

## 1. Check the plan and accounts

```
check_posting_subscription {}     # "No active posting plan" → send them to https://dansugc.com/dashboard/posting/subscription
list_posting_accounts {}          # account UUIDs, platform, username
```

**One unique video per account.** Never post the same MP4 to several accounts; make a hook variant
per account (studio: seconds per variant). Stagger multiple accounts by ~5 minutes.

## 2. Upload (presign → PUT, within 5 minutes)

```sh
FILE=./reelclaw-output/studio/<name>.mp4
SIZE=$(wc -c < "$FILE" | tr -d ' ')
```

```
get_media_upload_url { content_type: "video/mp4", size_bytes: <SIZE> }
# → upload_url (single-use PUT, 5 min TTL), public_url, expires_at
```

```sh
curl -fsS -X PUT -H "Content-Type: video/mp4" --data-binary @"$FILE" "<upload_url>"
```

The `Content-Type` must be exactly the one you presigned (it is signed into the URL; a mismatch is
a 403). Max 200 MB per video. Only `public_url`s from `get_media_upload_url` are accepted by
`create_post`; external links are rejected.

## 3. Post

```
create_post {
  account_ids: ["<uuid>"],
  caption: "<hook line>\n\n<1-2 truthful sentences>\n\n#niche #niche #fyp",
  media_urls: ["<public_url>"],
  scheduled_for: "2026-10-01T18:00:00Z", timezone: "America/New_York"   # or publish_now: true
}
```

Caption formula: hooks.md → "Post captions". Optional `platform_settings`, e.g.
`{ tiktok: { privacy_level: "PUBLIC_TO_EVERYONE" } }`. Organic TikTok posts often do better with a
trending sound added in the app instead of baked-in music: ask the user which they want before
rendering.

## 4. Verify

`list_posts {}` → status `draft` / `scheduled` / `published` / `failed`.

| Problem | Fix |
|---|---|
| 403 on the PUT | Content-Type mismatch or URL expired (5 min): presign again, PUT immediately |
| 400 `media_url not recognized` | the URL didn't come from `get_media_upload_url` |
| 400 media safety scan failed | the bytes don't match `video/mp4`: re-render |
| 413 | file over the cap: re-render or re-encode smaller |
| 429 | daily upload quota: retry later |
| 503 on `create_post` | scanner unreachable: retry `create_post` (the upload is fine) |
| "No active posting plan" | https://dansugc.com/dashboard/posting/subscription |
