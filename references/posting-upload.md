# DanSUGC Posting — Secure Media Upload

As of this version of the API, `create_post` only accepts `media_urls` that were issued by `mcp__dansugc__get_media_upload_url`. External hosts (tmpfiles.org, Dropbox, Google Drive, S3, etc.) are rejected with `400 media_url not recognized`. This is a security boundary, not a limitation.

Use this 3-step recipe every time you publish a locally-rendered reel.

---

## The 3-Step Recipe

Assume the rendered reel is at `./out/reel-001.mp4`.

```bash
# 1. Get the exact byte size of the file
SIZE=$(stat -f%z ./out/reel-001.mp4)   # macOS
# SIZE=$(stat -c%s ./out/reel-001.mp4) # Linux
```

```
# 2. Ask DanSUGC for a presigned R2 PUT URL
mcp__dansugc__get_media_upload_url(
  content_type="video/mp4",
  size_bytes=<SIZE>
)
# → captures: upload_url, public_url, expires_at, max_bytes, content_type, kind
```

```bash
# 3. PUT the file body to upload_url with the EXACT signed Content-Type
curl --fail -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary "@./out/reel-001.mp4"
# Content-Type is signed into the URL. A different header → R2 rejects with 403.
```

```
# 4. Create the post using public_url
mcp__dansugc__create_post(
  account_ids=["<account-uuid-from-list_posting_accounts>"],
  caption="Hook text\n\n#fyp #ugc",
  media_urls=["<public_url>"],
  scheduled_for="2026-03-25T18:00:00Z",
  timezone="America/New_York"
)
```

**Pitfall:** The MIME passed to `get_media_upload_url` and the `Content-Type` header on PUT must match byte-for-byte. `video/mp4` and `video/MP4` are not equivalent for R2 signature verification.

---

## Tool Signatures

### `mcp__dansugc__get_media_upload_url`

```
mcp__dansugc__get_media_upload_url(
  content_type: "video/mp4" | "video/quicktime" | "video/webm"
              | "image/jpeg" | "image/png" | "image/webp",
  size_bytes: <int>   # exact bytes of the file
)
```

Returns:

```json
{
  "upload_url":   "<presigned R2 PUT URL — single-use, 5 minute TTL>",
  "public_url":   "<pass this to create_post media_urls>",
  "expires_at":   "<ISO 8601>",
  "max_bytes":    "<int — 200 MB video, 25 MB image>",
  "content_type": "<echo of request>",
  "kind":         "video" | "image"
}
```

### `mcp__dansugc__create_post`

```
mcp__dansugc__create_post(
  account_ids:       [<UUIDs from list_posting_accounts>],   # required
  caption:           "<post text + hashtags>",
  media_urls:        [<public_url from get_media_upload_url>],  # max 10
  publish_now:       false,
  scheduled_for:     "2026-03-25T18:00:00Z",     # ISO 8601
  timezone:          "America/New_York",          # IANA
  platform_settings: {                            # optional, per-platform
    tiktok: { privacy_level: "PUBLIC_TO_EVERYONE", allow_comment: true }
  }
)
```

The caption field is `caption` (not `content`). Older skill versions used `content` — that field name no longer exists.

---

## Constraints

| Constraint | Value |
|---|---|
| Allowed video MIMEs | `video/mp4`, `video/quicktime`, `video/webm` |
| Allowed image MIMEs | `image/jpeg`, `image/png`, `image/webp` |
| Max video size | 200 MB |
| Max image size | 25 MB |
| Presigned URL TTL | 5 minutes — PUT immediately after issuing |
| Per-key daily quota | 1 GB / 100 files (rolling 24h, default) |
| Content-Type header on PUT | MUST exactly match the `content_type` from the presign call |
| Max `media_urls` per post | 10 |

---

## Failure Modes

| Status | Meaning | What to do |
|---|---|---|
| `400 media_url not recognized` | The URL wasn't issued by our presign endpoint | Redo step 2 — call `get_media_upload_url` first; never construct URLs yourself |
| `400 media_url failed media safety scan` | Magic-byte sniff didn't match the MIME, or VirusTotal flagged the file hash | Re-render the file with the correct codec/container; ensure MIME matches actual bytes |
| `403` on the PUT request | `Content-Type` header didn't match the signed MIME, or URL expired | Issue a new presign and PUT immediately with the exact signed MIME |
| `413` on the PUT request | File exceeds the size cap | Re-encode at a lower bitrate (200 MB video / 25 MB image max) |
| `429` | Daily quota exceeded | Wait — the quota is a 24h rolling window; retry tomorrow |
| `503` on `create_post` | Scanner couldn't reach the file | Retry the `create_post` call (the upload itself is fine) |

---

## End-to-End Example (bash + MCP)

```bash
FILE=./out/reel-001.mp4
SIZE=$(stat -f%z "$FILE")   # macOS

# Step 1 — presign (MCP call)
# mcp__dansugc__get_media_upload_url(content_type="video/mp4", size_bytes=$SIZE)
# capture UPLOAD_URL and PUBLIC_URL from the response

# Step 2 — PUT the bytes within 5 minutes
curl --fail -X PUT "$UPLOAD_URL" \
  -H "Content-Type: video/mp4" \
  --data-binary "@$FILE"

# Step 3 — create the post (MCP call)
# mcp__dansugc__create_post(
#   account_ids=["<uuid>"],
#   caption="Hook text\n\n#fyp #ugc",
#   media_urls=["$PUBLIC_URL"],
#   scheduled_for="2026-03-25T18:00:00Z",
#   timezone="America/New_York"
# )
```

---

## Authoritative References

When in doubt, fetch one of these — they are the source of truth:

- `https://dansugc.com/llms.txt` — concise tool list + endpoint table
- `https://dansugc.com/llms-full.txt` — full reference including the secure upload workflow and Example 6 (locally-generated video → R2 → post)
- `https://dansugc.com/docs/posting` — focused upload + security docs (also serves markdown via `Accept: text/markdown`)
- `https://dansugc.com/docs` — interactive OpenAPI explorer (Scalar UI)
