<!-- Paste this section into your project's AGENTS.md (or ~/.codex/AGENTS.md for all projects). -->

## UGC ads with DansUGC ReelClaw

When asked for UGC ads, reaction ads, TikTok/Reels/Shorts ads, "N ads for this app", or edits to a
reel, use the `reelclaw-ads` skill (`$reelclaw-ads`) and the tools on the `dansugc` MCP server
(`https://dansugc.com/mcp`). If the skill or tools are missing, tell me to run:

```sh
codex mcp add dansugc --url https://dansugc.com/mcp && codex mcp login dansugc
curl -fsSL https://raw.githubusercontent.com/dansugc/reelclaw/main/codex/install.sh | sh
```

Two modes (the skill's section 1 picks one; ask me if unclear):
- **Volume mode**: many variations fast, rendered on DansUGC's hosted engine (`reelclaw_*` tools).
  Nothing local needed.
- **Studio mode**: 1-5 polished ads edited locally with the reelclaw HyperFrames templates
  (`npx --yes reelclaw-templates@latest …`), needs Node 22+ and ffmpeg. Render with the skill's
  `scripts/run-generator.mjs`, then look at every QA frame with `view_image` and fix before
  delivering to `./reelclaw-output/studio/`.

Rules:
- Learn the product from this repo first (README, package.json, store listing, landing copy).
  Never invent claims, prices, or results.
- The `dansugc` server uses OAuth only (log in with the DansUGC account in the browser). If a tool
  says it no longer accepts API keys or asks to reconnect with OAuth, tell me to remove any
  `bearer_token_env_var` from `[mcp_servers.dansugc]` and run `codex mcp login dansugc`. Never ask
  me for an API key.
- It needs a Growth or Scale plan; on top of that it's pay-as-you-go from DansUGC credits. Editing
  and rendering are included in both modes; only clips I don't already own cost credits (11 credits
  each, less my plan's discount) and research queries (TikTok/Instagram search) cost 0.02 credits
  each, only on success.
- Talk to me in credits ("Total: 33 credits"), never "$", unless I ask for dollars.
- If I mention a team or company, call `list_accounts` and use that team's `project_id`; never
  switch accounts on your own, and name the team and amount before its first spend.
- Always show the price and wait for my explicit "yes" before `reelclaw_render` or buying clips
  (`purchase_videos` is two-step: quote without `expected_total_cents`, buy with it after my yes).
- Keep `reelclaw-output/` and `reelclaw-studio/` out of git.
- Brand name is always "DansUGC". Creators are real humans, never AI.
