#!/bin/sh
# DansUGC ReelClaw — install the `reelclaw-ads` skill for OpenAI Codex.
#
#   curl -fsSL https://raw.githubusercontent.com/dansugc/reelclaw/main/codex/install.sh | sh
#
# What it does (safe to re-run; no sudo):
#   1. Copies the skill into ~/.agents/skills/reelclaw-ads (Codex's user skills directory).
#   2. If the `codex` CLI is installed and no `dansugc` MCP server is configured, adds it:
#        codex mcp add dansugc --url https://dansugc.com/mcp
#   3. Prints next steps (OAuth login).
#
# Environment overrides:
#   REELCLAW_SKILLS_DIR  target skills dir      (default: $HOME/.agents/skills)
#   REELCLAW_REF         git ref to install     (default: main)
#   REELCLAW_SOURCE_DIR  install from a local checkout of dansugc/reelclaw instead of downloading
#   REELCLAW_SKIP_MCP=1  don't touch Codex MCP config
set -eu

SKILL_NAME="reelclaw-ads"
REF="${REELCLAW_REF:-main}"
RAW_BASE="https://raw.githubusercontent.com/dansugc/reelclaw/${REF}"
SKILL_SRC="plugins/reelclaw/skills/${SKILL_NAME}"
SKILLS_DIR="${REELCLAW_SKILLS_DIR:-${HOME}/.agents/skills}"
DEST="${SKILLS_DIR}/${SKILL_NAME}"
MCP_URL="https://dansugc.com/mcp"

# Single source of truth: the same SKILL.md the Claude Code plugin ships.
FILES="SKILL.md
references/product-brief.md
references/hooks.md
references/research.md
references/footage.md
references/volume-mode.md
references/studio-templates.md
references/qa-checklist.md
references/hyperframes-editing.md
references/publishing.md
references/errors.md
references/tools.md
references/music.md
scripts/run-generator.mjs
scripts/qa-frames.sh
agents/openai.yaml"

say() { printf '%s\n' "$*"; }
die() { printf 'reelclaw install: %s\n' "$*" >&2; exit 1; }

fetch() { # fetch <url> <dest>
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$2" "$1"
  else
    die "need curl or wget"
  fi
}

[ -n "${HOME:-}" ] || die "HOME is not set"

TMP="$(mktemp -d 2>/dev/null || mktemp -d -t reelclaw)"
trap 'rm -rf "$TMP"' EXIT INT TERM
STAGE="${TMP}/${SKILL_NAME}"

say "Installing DansUGC ReelClaw skill (${SKILL_NAME}) ..."
for f in $FILES; do
  mkdir -p "${STAGE}/$(dirname "$f")"
  if [ -n "${REELCLAW_SOURCE_DIR:-}" ]; then
    cp "${REELCLAW_SOURCE_DIR}/${SKILL_SRC}/${f}" "${STAGE}/${f}" || die "missing ${SKILL_SRC}/${f} in ${REELCLAW_SOURCE_DIR}"
  else
    fetch "${RAW_BASE}/${SKILL_SRC}/${f}" "${STAGE}/${f}" || die "download failed: ${RAW_BASE}/${SKILL_SRC}/${f}"
  fi
done

head -n 1 "${STAGE}/SKILL.md" | grep -q '^---' || die "downloaded SKILL.md looks wrong (no frontmatter)"
chmod +x "${STAGE}/scripts/"* 2>/dev/null || true

# Replace any previous install in one step (idempotent; never leaves a half-written skill).
mkdir -p "$SKILLS_DIR"
if [ -d "$DEST" ]; then
  rm -rf "${DEST}.old"
  mv "$DEST" "${DEST}.old"
fi
mv "$STAGE" "$DEST"
rm -rf "${DEST}.old"
say "  skill -> ${DEST}"

# MCP server (the skill needs the reelclaw_* tools from https://dansugc.com/mcp).
MCP_NOTE=""
if [ "${REELCLAW_SKIP_MCP:-0}" = "1" ]; then
  MCP_NOTE="skipped (REELCLAW_SKIP_MCP=1)"
elif command -v codex >/dev/null 2>&1; then
  if codex mcp get dansugc >/dev/null 2>&1; then
    MCP_NOTE="already configured"
    # MCP is OAuth-only: an old API-key setup (bearer_token_env_var) is rejected on every tool.
    if codex mcp get dansugc 2>/dev/null | grep -qi 'bearer'; then
      MCP_NOTE="already configured, but with an API key; remove bearer_token_env_var from [mcp_servers.dansugc] in ~/.codex/config.toml and log in with OAuth"
    fi
  elif codex mcp add dansugc --url "$MCP_URL" >/dev/null 2>&1; then
    MCP_NOTE="added (codex mcp add dansugc --url ${MCP_URL})"
  else
    MCP_NOTE="could not add automatically; run: codex mcp add dansugc --url ${MCP_URL}"
  fi
else
  MCP_NOTE="codex CLI not found; after installing Codex run: codex mcp add dansugc --url ${MCP_URL}"
fi
say "  mcp server dansugc: ${MCP_NOTE}"

cat <<EOF

Done. Next steps:
  1. Log in with your DansUGC account (OAuth, opens your browser; API keys don't work on MCP):
       codex mcp login dansugc
  2. Restart Codex (or start a new session) so it picks up the skill.
  3. In your project, ask:
       \$reelclaw-ads Make 10 UGC ads for this app. Use the demo in ./demo.mp4.
     or, for 1-5 polished ads edited locally (studio mode; needs Node 22+ and ffmpeg):
       \$reelclaw-ads Make 3 polished ads in studio mode with the demo in ./demo.mp4.

Needs a Growth or Scale plan; on top of it you pay as you go from DansUGC credits. Editing and
rendering are included in both modes; you pay only for reactions you don't already own (library
clips are 11 credits each, less your plan's discount) and research queries your agent runs
(0.02 credits each, only on success). Nothing renders until
you approve the quoted price.
Top up: https://dansugc.com/dashboard/credits  Docs: https://github.com/dansugc/reelclaw
EOF
