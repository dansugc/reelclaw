<!-- Paste this section into your project's AGENTS.md (or ~/.codex/AGENTS.md for all projects). -->

## UGC ads with DansUGC ReelClaw

When asked for UGC ads, reaction ads, TikTok/Reels/Shorts ads, "N ads for this app", hook
variations, or edits to a reel, use the `reelclaw` skill (`$reelclaw`) and the tools on the
`dansugc` MCP server (`https://dansugc.com/mcp`). If the skill or tools are missing, tell me to run:

```sh
codex mcp add dansugc --url https://dansugc.com/mcp && codex mcp login dansugc
curl -fsSL https://raw.githubusercontent.com/dansugc/reelclaw/main/codex/install.sh | sh
```

How it works: you edit and render every reel on this machine with the open-source reelclaw engine
in one reel project, `./reelclaw-studio/` (needs Node 22+ and ffmpeg). Set it up with the skill's
installer (`npx --yes github:danielhangan/reelclaw-templates add <template…> --dir reelclaw-studio`
until the `reelclaw` npm package is published, then `npx --yes reelclaw@latest add …`). Then read
`reelclaw-studio/.agents/skills/reelclaw-playbook/SKILL.md` and the template's skill in
`reelclaw-studio/.agents/skills/<template>/` and follow them: brief → format → hooks → footage →
music → `npx reelclaw make <template> … --draft` (renders and runs `npx reelclaw qa`) → look at every
QA frame with `view_image` and fix (max 3 passes) → `npx reelclaw batch` for variants →
`npx reelclaw render` → copy finals to `./reelclaw-output/`. Run `npx reelclaw …` inside
`reelclaw-studio/`. Templates: `reaction-demo`, `wall-of-text`, `listicle`, `no-yapping`,
`greenscreen-reaction`, `talking-head-captions`, `before-after`; my own footage works too. The
`dansugc` MCP server does not render; it supplies the clip library, viral-format suggestions,
trending music, research and posting.

Rules:
- Learn the product from this repo first (README, package.json, store listing, landing copy).
  Never invent claims, prices, or results.
- If I'm unsure what reels to make ("make viral reels for my app"), call `reelclaw_suggest_formats`
  first (free), show me 2-4 formats with their evidence (example concepts, views, clips ready), then
  copy the format I pick: template, hook style and matching clips from `search_videos`.
- The `dansugc` server uses OAuth only (log in with the DansUGC account in the browser). If a tool
  says it no longer accepts API keys or asks to reconnect with OAuth, tell me to remove any
  `bearer_token_env_var` from `[mcp_servers.dansugc]` and run `codex mcp login dansugc`. Never ask
  me for an API key.
- It works on any DansUGC account (no plan needed) and is pay-as-you-go from DansUGC credits. Editing
  and rendering are local and free; only clips I don't already own cost credits (11 credits each,
  less my plan's discount) and research queries (TikTok/Instagram search, trending music) cost 0.02
  credits each, only on success.
- Talk to me in credits ("Total: 33 credits"), never "$", unless I ask for dollars.
- If I mention a team or company, call `list_accounts` and use that team's `project_id`; never
  switch accounts on your own, and name the team and amount before its first spend.
- Always show the price and wait for my explicit "yes" before buying clips (`purchase_videos` is
  two-step: quote without `expected_total_cents`, buy with it after my yes).
- Ask before adding `reelclaw-output/` and `reelclaw-studio/` to `.gitignore`; keep them out of git.
- Brand name is always "DansUGC". Creators are real humans, never AI.
