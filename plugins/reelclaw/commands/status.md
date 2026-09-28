---
description: Check DansUGC ReelClaw batches and download finished videos
argument-hint: "[batch_id] (optional; defaults to recent batches)"
---

Use the `reelclaw-ads` skill to check on DansUGC ReelClaw batches.

Batch (optional): $ARGUMENTS

- If a batch id was given, call `reelclaw_get_batch` for it. Otherwise call `reelclaw_list_batches`
  and show the recent batches (name, videos, created) as a short table, then `reelclaw_get_batch`
  the most recent one (or the one the user picks) for its stage and ready/total videos.
- For every video that is ready and not yet in `./reelclaw-output/<batch_id>/`, download it with
  `curl -fsSL -o` using its signed `download_url`.
- If videos are still rendering, report progress and when to check again (`poll_after_seconds`).
  Don't poll in a tight loop — offer to keep watching instead.
- If videos failed with a retryable error, offer `reelclaw_resume_batch`.
- Do not start any new render or spend credits from this command.
- End with the saved file paths and the `dashboard_url`.
- Studio-mode reels are local, not batches: if asked about them, list `./reelclaw-output/studio/`
  and `./reelclaw-studio/*/renders/` (and any `qa/<name>/report.txt`).
