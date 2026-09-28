# Music: pick a trending sound when the user has none

Most users don't know which sound to put under their ads. Don't ask them to go find one: look up
what's trending in their category with `reelclaw_trending_music` and propose it.

## The tool

```
reelclaw_trending_music { category, country?, period?, limit?, commercial_only?, project_id? }
```

- `category`: the niche, not the brand ("fitness app", "skincare routine", "study tips",
  "budgeting"). A short brief works; it's cut to ≤ 4 search words (`search_query` in the result).
- `country`: 2-letter code, default `US`. `period`: days of videos to look at, `1 | 7 | 30 | 90 | 180`
  (default 7; widen to 30 if few songs come back). `limit`: 1-20 (default 10).
- **Cost:** 0.02 credits per ScrapeCreators query, 1-2 queries per lookup (0.02-0.04 credits),
  charged only on success. The same category + country + period is cached for 6 hours, so repeating
  it costs 0 credits (`cached: true`, `credits_charged: 0`). Say the cost once before the first call
  ("a trending-music lookup costs about 0.02 credits"). Pass `project_id` to bill a team, same as
  every other research tool.
- Result: `songs: [{ rank, title, artist, duration_seconds, uses, trend, category_videos,
  category_video_plays, label_track, commercial_music_flag, cover_url, preview_url, music_link,
  example_video_url }]`, `music_links` (the top 5, ready to pass on), `trend_basis`,
  `license_note`, `queries`, `credits_charged`, `cached`, `next_action`.

How it ranks: it searches recent TikTok videos about the category and scores the sounds they use by
TikTok-wide uses (`uses`), freshness, and plays in the category. `trend` is an estimate: `rising` =
sound ≤ 60 days old with ≥ 1,000 uses, `popular` = ≥ 50,000 uses, `steady` = the rest. Sounds used
by fewer than 100 videos (one-off voiceovers) are dropped. TikTok's own chart (rank changes) isn't
available, so don't claim "#1 on TikTok".

## Choosing

1. **Match the hook's energy.** Shocked / hype / "wait what" reactions → punchy, upbeat, fast
   tempo. Relatable / emotional / "POV: you finally…" → mellow, lo-fi, nostalgic. Funny → meme
   sounds. Listen via `preview_url` or `example_video_url` if unsure.
2. **Prefer `rising`**, then `popular`. A rising sound in the niche beats a huge generic one.
3. **Length ≥ the reel.** `duration_seconds` is TikTok's clip of the song (often 30-60 s); skip
   anything shorter than the reel (~10-20 s for reaction ads).
4. **Give variety:** pass 3-5 links; ReelClaw picks one at random per video, which doubles as a
   sound test.
5. Tell the user what you picked in one line each (title · artist · trend) and why.

## Volume mode

When a batch reaches `ready` with no music (`music_links: []` and nothing suggested; the
`next_action` says so) and the user hasn't asked for silent videos:

1. `reelclaw_trending_music { category, project_id? }` (same account as the batch).
2. `reelclaw_update_batch { batch_id, music_links: <its music_links> }`, **before** `reelclaw_quote`
   (an edit after a quote invalidates it). Or pass the same list to both `reelclaw_quote` and
   `reelclaw_render`.

The server never looks music up on its own; it's always your call, so the cost stays visible.
Skip it when the batch has a `reference_url` overlay (it reuses the reference's soundtrack) or the
user already gave links.

## Studio mode

Templates take `music` as a local file or a direct audio URL. Use the song's `preview_url`:

```sh
curl -fL -o reelclaw-studio/footage/music-<slug>.m4a "<preview_url>"
ffprobe -v error -show_entries format=duration -of csv=p=0 reelclaw-studio/footage/music-<slug>.m4a
```

Then set `"music": "reelclaw-studio/footage/music-<slug>.m4a"` in the params file (add
`"music-start"` to skip an intro). `preview_url` is TikTok's AAC clip of the sound (`.m4a`,
usually 30-60 s); its URL has no file extension, so download it rather than passing the URL (the
generator would treat it as a page link). Links are signed CDN URLs that can expire: download right
away; if the download returns 403, pick another song or run the lookup again later.

Don't pass `music_link` (a TikTok sound page) to a studio template: yt-dlp can't read TikTok sound
pages (its extractor is marked broken, "No working app info is available"). Page links only work in
volume mode, where the ReelClaw server resolves them.

## Licensing: organic vs ads

Always relay `license_note`. In short:

- **Organic posts from personal/creator accounts:** trending sounds are fine; that's how TikTok and
  Reels content normally works. TikTok **business** accounts are limited to the Commercial Music
  Library even for organic posts, so treat them like ads.
- **Paid ads** (TikTok Spark/business ads, Meta ads, anything boosted): only Commercial Music
  Library tracks. `commercial_only: true` keeps label tracks that TikTok's metadata flags as
  commercial music (`commercial_music_flag`). That is a hint, not a license: the user must confirm
  the exact track in TikTok Ads Manager (or, for TikTok photo posts, the DansUGC Posting music
  picker, which lists the account's Commercial Music Library). DansUGC doesn't clear music rights.
  Never tell the user a sound is "cleared for ads".
- Unsure, or no commercial tracks came back? Render the ad versions without music
  (`music_links: []`) and add a Commercial Music Library track in Ads Manager.
