# Research: real viral examples (paid, optional)

Use real posts to choose the format and borrow hook *structures* for this product. Never copy a
creator's text verbatim, and never pull someone else's video into an ad.

## Cost rule

`tiktok_search_videos`, `tiktok_user_videos`, `tiktok_search_users`, `instagram_search_reels`,
`instagram_user_reels`, and `scrapecreators_raw` each cost **0.02 credits per successful query** from
the selected account's DansUGC credits (Personal Account, or the team whose `project_id` you pass).
Before the first one, tell the user the plan, the cap, and (for a team) which team pays, e.g.:

> I'll run 4 searches (0.08 credits) to find what's working for habit apps on TikTok and Reels. OK?

Default cap 5 queries per session unless the user asked for deep research. Skip research entirely
when the user already knows the angle, has hooks, or says no. ReelClaw's own reaction matching and
hook drafting (volume mode) are free.

## What to search (in order, stop when you have enough)

1. The pain in the buyer's words: `"can't stop doomscrolling"`, `"screen time"` (not the brand).
2. The category + format: `"app that locks my phone"`, `"study app no yapping"`.
3. The emotional angle: `"<niche> relatable"`, `"<niche> pov"`.
4. An adjacent product category the user names (keyword search only).

`tiktok_search_videos { query, sort_by: "likes" }` surfaces proven posts; `sort_by: "date"` shows
what's working now. `instagram_search_reels { query }` for Reels.

## What to extract (from captions/descriptions and stats)

For the top 10-20 results by engagement:

- **Hook line**: usually the first line of the caption or the on-screen text described in it.
  Classify it: POV · When/me when · Discovery ("why did nobody tell me") · Disbelief · Before/after ·
  Callout ("<audience> you need this") · Confession · Question · Us vs them · Stakes · Statistic ·
  "Nobody talks about".
- **Format**: reaction → demo, split-screen tutorial ("no yapping"), greenscreen reaction,
  talking head, slideshow. Map to a studio template or volume mode.
- **Signals**: likes/views > 10 % and many comments = the hook triggered something. Comments asking
  "what app??" = curiosity gap worked.

## What to show the user

A short table: format · hook structure · example (paraphrased) · views/likes · link. Then 5-10 hook
drafts for *this* product using the winning structures (hooks.md), each with the reaction emotion
to pair. Keep the raw results out of the chat.

## Winners after posting (24-48 h)

If the user posts and asks how it did, pull the post's stats (`scrapecreators_raw` with the post
URL, 0.02 credits) and compare:

| Metric | Good | Great | Viral |
|---|---|---|---|
| Views | 10K+ | 100K+ | 1M+ |
| Likes / views | 5 %+ | 10 %+ | 15 %+ |
| Comments / views | 0.5 %+ | 1 %+ | 2 %+ |
| Shares / views | 0.3 %+ | 1 %+ | 3 %+ |

Replicate a winner: same hook structure and emotion, a different creator, the same demo angle,
new accounts. Iterate hooks before footage (hook variants cost seconds in studio mode).
