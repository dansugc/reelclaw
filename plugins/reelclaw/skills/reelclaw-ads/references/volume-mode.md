# Volume mode: the hosted ReelClaw engine

For many variations fast. The hosted engine at `https://dansugc.com/mcp` does product research,
matches real human creator reactions from the DansUGC library, places hook overlays in the platform
green zone (TikTok Sans), adds music, and renders on DansUGC servers. **Nothing local is needed** —
no ffmpeg, Node, or keys. You supply the brief, the demo, better hooks, and the user's explicit yes
on the price. Steps 1-2 of SKILL.md (brief, demo) come first.

## Demo requirements (hosted)

At least one demo is required to render (up to 20 per batch).

- Must be `.mp4` (`video/mp4`) or `.mov` (`video/quicktime`), 1 byte–50 MB. Get the exact size
  with `wc -c < "<file>"` — `size_bytes` must match the bytes you upload.
- Prefer a 10–30 s vertical screen recording that shows the aha moment early. If you find several,
  pick the best 1–3 and say which.
- None found (or all > 50 MB)? Ask the user for a short screen recording (phone screen recording or
  QuickTime → File → New Screen Recording works). A direct public `https://…/.mp4|.mov` link also
  works via `source_url` — no local file needed.

## 1. Research the batch (free)

1. `reelclaw_create_batch` with:
   - `brief`: your brief from step 1 (10–24000 chars). Add `product_url` if there's a public
     product or App Store page (it's scraped and appended).
   - `video_count`: what the user asked for (1–60, default 10). Drives how many hooks get written.
   - `direction` (optional): tone/audience/language/angle, e.g. "Gen Z students, deadpan, English".
   - `custom_hooks` (optional, ≤30, used verbatim): only if you or the user already have final hooks.
   - `filters` (optional): `ownership` (`all` | `owned` | `not_owned`), `gender`, `niches`,
     `emotions`, `creator_ids`, `collection_ids`, `package_ids`. Call `reelclaw_options` for valid
     values. `ownership: "owned"` = only reactions the account already owns → 0 credits.
   - `reference_url` (optional, Personal Account only): a TikTok/IG ad VIDEO whose on-screen overlay
     style to copy. Then render `count` must equal the number of hooks, and if the overlay has no
     text layer chosen, the user must pick one in the dashboard editor (`dashboard_url`) first.
   - `project_id` (optional): a DansUGC team (from `list_accounts`); omit for the Personal Account.
     The batch, its reactions, and its render charges stay on that account. Before the first spend
     on a team, name the team and the amount and get a yes.
2. Call `reelclaw_advance_batch { batch_id }` until `done: true` / `stage: "ready"`. Each call runs
   up to ~45 s (product → reactions → text → ready). When not done it returns `poll_after_seconds`
   (1, or 5 while `waiting_for: "overlay"`) — wait that long and call again.
3. Review the result: `reactions` (`emotion`, `duration_seconds`, `thumbnail_url`, `preview_url`,
   `owned`, `excluded` — no creator names) and `hooks` (`id`, `text`, `format`).

## 2. Make the hooks great, then review with the user

The engine writes decent hooks. You know the product better — rewrite them. Aim for:
TikTok-native, first-person or "POV/when" voice, **under 80 characters**, specific to the pain or
the aha, emotion that matches the reaction clips, no invented claims. Full playbook and formats:
[hooks.md](hooks.md).

Show the user a compact table (# · hook · format) plus a one-line summary of the reactions
(e.g. "10 matched: 6 shocked, 4 laughing · 3 already owned"; share `preview_url`s if they want to
look). Then save with `reelclaw_update_batch { batch_id, hooks: [{ id?, text }] }` — `hooks` is the
FULL new list; include an existing `id` to edit that hook in place. The same tool can
`exclude_reaction_ids`, `include_reaction_ids`, `replace_reaction_id` (swap one for a close
alternative), and `music_links` (TikTok/IG sound links, one picked per video; `[]` = no music).
Stage must be `ready`.

Hook ↔ video math: hooks are spread across demos — with D demos, N videos use about ⌈N / D⌉
distinct hooks. With a `reference_url` overlay, exactly one hook per video.

## 3. Upload the demo(s) (after research is `ready`)

Local file:

1. `reelclaw_add_demo { batch_id, filename, size_bytes, content_type }` → `{ demo_id, upload_url,
   method: "PUT", headers, size_bytes, expires_at, curl }`.
2. Run the returned `curl` (or build it from `method`/`headers`/`upload_url`). The shape is:
   ```sh
   curl -fsS -X PUT -H "Content-Type: video/mp4" --data-binary @"./demo.mp4" "<upload_url>"
   ```
   `--data-binary` sends the exact `Content-Length`; it must equal `size_bytes`. Always quote the
   URL (it contains `&`). It expires after ~1 h — if so, call `reelclaw_add_demo` again.
3. HTTP 200 = the demo is ready. Nothing else to call. (`reelclaw_manage_demo … "complete"` only if
   a demo is stuck in `uploading` after a successful PUT; `"remove"` deletes a wrong/stuck demo.)

Public URL: `reelclaw_add_demo { batch_id, source_url }` (https `.mp4`/`.mov`, ≤ 50 MB) — the
server downloads it and marks it ready.

## 4. Quote → explicit yes → render

1. `reelclaw_quote { batch_id, count, hooks?, music_links? }` → `{ quote_id, expires_at,
   new_reactions, owned_reactions, total_credits, available_credits, sufficient_credits,
   confirmation_required: true }`. Do all edits BEFORE quoting — **any edit after a quote
   invalidates it**.
2. Show the price plainly, using the numbers from the quote (never estimate your own):
   > `<count>` videos · `<new_reactions>` new reactions (charged) · `<owned_reactions>` already
   > owned (free) · editing & rendering free
   > **Total: `<total_credits>` credits** · you have `<available_credits>` available. Render now?
3. **STOP and wait for an explicit yes** ("yes", "go", "render"). Never render on your own
   initiative, never treat silence or the original "make ads" request as consent, and never reuse an
   approval after the price or batch changed. Cheaper options: exclude new reactions, filter
   `ownership: "owned"` (new batch), or reduce `count` — then re-quote.
4. If `sufficient_credits` is false, don't render — send them to
   https://dansugc.com/dashboard/credits to top up, then re-quote.
5. `reelclaw_render { batch_id, quote_id, count, hooks?, music_links? }` with the SAME values you
   quoted. Quotes last ~14 minutes; if expired or `price_changed`, re-quote and re-confirm.

## 5. Poll, download, deliver

- Poll `reelclaw_get_batch { batch_id }` every `poll_after_seconds` (20 while rendering; never
  faster). Renders take minutes. Tell the user it's rendering and that they can watch at the
  `dashboard_url`; report progress changes (`summary`: total / ready / failed / in_progress), not
  every poll.
- Each video: `{ id, index, state, progress_percent, hook, demo_name, error, download_url? }`.
  `download_url` appears only when `state` is `ready` (signed attachment link, valid 24 h):
  ```sh
  mkdir -p "./reelclaw-output/<batch_id>"
  curl -fL -o "./reelclaw-output/<batch_id>/<nn>-<slug-of-hook>.mp4" "<download_url>"
  ```
  Download as each finishes; don't wait for the whole batch. Suggest adding `reelclaw-output/` to
  `.gitignore` (ask before editing it).
- Failed videos with `error.retryable: true`, or progress stalled for several minutes →
  `reelclaw_resume_batch { batch_id }` (no extra charge). Otherwise report `error.message`.
  `reelclaw_cancel_video { video_id }` only if the user asks (irreversible; credits released).
- Finish with a summary: saved file paths, hook per file, credits spent, anything failed, and the
  `dashboard_url`. Offer next steps: more variations of the best hooks, a new angle, another demo.


Errors: [errors.md](errors.md). Tool map: [tools.md](tools.md).
