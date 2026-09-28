# Studio templates (reelclaw-templates + HyperFrames)

Studio mode uses the public templates at `github.com/danielhangan/reelclaw-templates`, installed
with `npx --yes reelclaw-templates@latest <template> <dir>`. Each installed directory is a
self-contained HyperFrames project: `new-reel.mjs` (generator), `assets/fonts/TikTokSans-Variable.ttf`
(SIL OFL), `RULES.md` (platform rules), `CLAUDE.md`/`AGENTS.md`, `package.json` (pins
`hyperframes@0.7.76` in its scripts).

Everything here was read from the generators' source, not their READMEs. Always drive them
through `<skill-dir>/scripts/run-generator.mjs` with a params JSON (keys = flag names without
`--`); never call `node new-reel.mjs --hook "..."` yourself.

## Installer facts

- Args: `npx --yes reelclaw-templates@latest <template> [dir]`. `--list` lists templates,
  `--ref <branch|tag|commit>` pins the templates repo (it downloads the GitHub tarball at install
  time; the npm package itself is only the installer, v0.1.0). For reproducible installs, pass
  `--ref <commit>`.
- It refuses a directory that exists and isn't empty.
- Its environment check says "Node 18+". That is stale: `hyperframes@0.7.76` declares
  `engines.node >=22` and exits with "HyperFrames requires Node.js >= 22" below that. Trust the
  Node 22 check in SKILL.md.
- `--yes` matters: without it npx asks "Ok to proceed?" and a non-interactive agent shell hangs.

## Which template

| Template | Use when | Length |
|---|---|---|
| `reaction_demo` | Default for app/product ads. A creator reacts with your hook, hard cut to the demo. | reaction-secs (3) + full demo |
| `no_yapping` | "How I did X" tutorial energy: fullscreen intro with hook, then 50/50 split (creator typing on top, screen recording below) with step captions at the seam. Farms saves. | intro-secs (6) + demo |
| `greenscreen_reaction` | The demo is itself watchable (a TikTok screen recording, a flashy result). Creator is cut out of their background and sits in a corner, both audios on. | full background video |

## reaction_demo

`[reaction · reaction-secs · hook] → hard cut → [demo · full length · optional hook2]`

| Key | Default | Notes |
|---|---|---|
| `reaction` | required | local path or direct URL (`.mp4/.mov/.webm/.m4v`); page links need yt-dlp |
| `demo` | required | always plays **full length** (ffprobe duration − 0.05 s, floored to 0.1 s). There is no demo trim flag: pre-trim the file (footage.md) |
| `hook` | required | caption over the reaction; HTML-escaped by the generator |
| `hook-position` | `center` | `top` \| `center` \| `bottom` inside the safe band |
| `hook2` | none | payoff caption over the whole demo segment |
| `hook2-position` | `center` | `top` \| `center` \| `bottom` |
| `hook-size` | `58` | base px; auto-shrinks 2 px at a time to fit a 1150 px tall box, floor 26 |
| `trim` | `0` | seconds into the reaction where the hook segment starts; `trim + reaction-secs` must fit the clip |
| `reaction-secs` | `3` | hook segment length (keep ≤ 3) |
| `music` | none | file/URL; fades out over the last 0.8 s (a GSAP tween, so it needs GSAP loaded) |
| `music-volume` / `music-start` | `1` / `0` | level 0-1 / offset into the track |
| `reaction-volume` / `demo-volume` | `0` / `0` | clip audio is muted by default; sources without an audio stream are skipped |
| `name` | `reel-N` | required by run-generator; kebab-case |

Captions: TikTok Sans 700, white, 8 px black stroke (`paint-order: stroke fill`), soft shadow,
static (no entrance animation), centered in the band x 180-900, y 220-1420. Video `object-fit:
cover` (a landscape or 3:4 demo gets its sides cropped; check the QA frame after the cut).
No music and both volumes 0 → silent output (the generator warns). Fine for organic posts where a
trending sound is added in-app; for ads add `music` or a clip volume.

Trending `music`: `reelclaw_trending_music { category }` (0.02 credits per query) → `curl -fL -o
reelclaw-studio/footage/music-<slug>.m4a "<preview_url>"` → `"music": "reelclaw-studio/footage/music-<slug>.m4a"`.
Download it (the URL has no file extension and expires); a TikTok sound page link (`music_link`)
does not work here, yt-dlp can't read those. Licensing for ads: [music.md](music.md).

## no_yapping

`[intro fullscreen · intro-secs · hook] → [typing top half / demo bottom half · step captions at the seam]`

| Key | Default | Notes |
|---|---|---|
| `intro` | required | 9:16 clip (the "mouth tape" gag); loops if shorter than `intro-secs` |
| `typing` | required | creator working, shown in the top 1080×960 half (cover-cropped to its vertical middle); loops |
| `demo` | required | screen recording in the bottom half; plays full length unless `demo-secs` |
| `hook` | required | "[enviable concrete outcome] but no yapping", top of the intro (y 380) |
| `step` | none | list of captions: `"caption"`, `"caption :: 4"` (seconds, sequential) or `"caption :: 10-15"` (absolute window from reel start). Sequential steps start at the split; the **last sequential step holds to the end** (make it the payoff) |
| `steps` | none | path to a JSON file `[{"caption","secs"?} \| {"caption","at","until"}]` instead of `step` |
| `intro-secs` / `step-secs` | `6` / `3` | |
| `intro-trim` / `typing-trim` / `demo-trim` | `0` | offsets into each clip |
| `demo-secs` | full | cap the split segment |
| `demo-fit` | `cover` | `contain` shows the whole recording on white (use it for landscape/desktop recordings) |
| `hook-size` / `step-size` | `62` / `54` | hook box max 400 px tall, step box 240 px |
| `music`, `music-volume`, `music-start` | | as above |
| `intro-volume` / `typing-volume` / `demo-volume` | `0` | silent by default: the silence is the format |
| `name` | `yap-N` | |

Total = intro-secs + demo segment. Step captions sit at y 895 (straddling the seam), 120 px side
margins: slightly wider than the 180 px band on purpose, still clear of the action rail.

## greenscreen_reaction

Background video fullscreen + the reaction with its background removed (local AI matting via
`npx hyperframes@0.7.76 remove-background`), both audios on. Reel length = background length.

| Key | Default | Notes |
|---|---|---|
| `video` | required | background (screen recording / TikTok) |
| `reaction` | required | cut out and overlaid |
| `size` | `15` | cut-out width in % of 1080 px; **40 is the classic look** |
| `position` | `bottom-left` | 9 presets `top-left` … `bottom-right`, `center` |
| `margin` / `x` / `y` | `0` / – / – | inset, or exact px (overrides position) |
| `flip` | off | `true` mirrors the creator to face into the frame |
| `crop` | `auto` | `auto` crops to the subject's alpha box; `none` keeps padding |
| `hook` | none | caption, default `hook-position: top` |
| `hook-size` / `hook-start` / `hook-secs` | `58` / `0` / rest | |
| `start-position` / `start-x` / `start-y` / `start-size` | none | any of these turns on the drag-into-place move |
| `move-at` / `move-secs` / `move-ease` | `2` / `0.9` / `power2.inOut` | GSAP tween (needs GSAP loaded) |
| `secs` / `video-trim` / `overlay-start` / `reaction-trim` / `reaction-secs` | | timing |
| `video-volume` / `reaction-volume` | `1` / `1` | no `music` flag by design |
| `cutout-quality` | `balanced` | `fast` \| `balanced` \| `best` (a file-size lever, not a speed lever) |
| `force-cutout` | off | `true` redoes matting |
| `name` | `reel-N` | |

Cost: matting runs ~5 fps on Apple Silicon (a 15 s reaction ≈ 100 s) plus a one-time ~168 MB
model download; the cut-out is cached in `assets/` per reaction. Always check the QA frames for
matting artifacts (hair, motion blur, busy backgrounds). The cut-out may sit in the bottom UI zone
(native look); the hook may not.

## What the wrapper does (scripts/run-generator.mjs)

```
node <skill-dir>/scripts/run-generator.mjs <template-dir> <params.json> [--render | --render-only] [--quality standard|high|draft] [--no-qa]
```

1. Refuses Node < 22, unknown/`render`/`draft` keys, lists other than `step`, and any value that
   starts with `--`, all before touching any media.
2. Copies local media (relative paths resolve from the current directory) into
   `<template>/assets/<role>-<safe-name>.<ext>` so no odd filename reaches the HTML; re-encodes
   video whose keyframes are > 2 s apart (1 s keyframes) because HyperFrames freezes on sparse
   keyframes. Re-runs reuse the staged copy.
3. Runs `node new-reel.mjs …` with an argv array (no shell) in the template directory.
4. Downloads GSAP once to `assets/gsap.min.js` and rewrites the host page's CDN `<script>` to it.
5. `--render`: `npx --yes hyperframes@<pinned> render -c host-<name>.html -o renders/<name>.mp4
   --quality standard` (`--quality high|draft` to change; draft is barely faster, only smaller).
   The full log goes to `renders/<name>.render.log`; it prints **RENDER WARNINGS** for exit-0
   failures (GSAP/script, font, missing asset, sparse keyframes, page errors).
6. Runs `qa-frames.sh` with the cut time (reaction_demo: `reaction-secs`; no_yapping: `intro-secs`;
   greenscreen: `move-at` when moving).

Without `--render` it only generates. `--render-only` skips generation (keeps hand edits to
`compositions/<name>.html`) and renders + scans + runs QA.

## Timings (measured 2026-09-28, Apple M1 Max, Node 26, Chrome already cached)

Template install 8-13 s (downloads the ~25 MB templates tarball) · staging re-encode ~3 s per 22 s
clip · generate < 1 s · render 23-30 s for a 11-13 s reel · QA frames ~3.5 s. One-time extras on a
fresh machine: HyperFrames npm deps (~380 MB) and headless Chrome via npx. greenscreen matting
~6.5 s per second of reaction, first time per clip.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `HyperFrames requires Node.js >= 22` / run-generator refuses Node | Install Node 22+ (`brew install node`, `nvm install 22 && nvm use 22`), re-run. |
| npx hangs at "Ok to proceed?" | Add `--yes` (`npx --yes …`). |
| `… already exists and is not empty` from the installer | Use a new `<slug>` directory. |
| `--trim X + 3s exceeds reaction length` | Lower `trim` or `reaction-secs`, or pick a longer clip. |
| Generator `file not found` | Paths are relative to where you run run-generator (the repo root). |
| `could not vendor GSAP` | No network. Connect once (it is cached in `assets/`), or copy a `gsap.min.js` 3.x into `<template>/assets/`. Don't render without it: animations silently drop. |
| First render slow / downloading Chrome | One-time: HyperFrames fetches chrome-headless-shell and its npm deps (~380 MB) into the npx cache. |
| Render: `JavaScript heap out of memory` or Chrome crashes | Re-render with fewer workers: `npx --yes hyperframes@0.7.76 render -c host-<name>.html -o renders/<name>.mp4 --workers 2`. |
| Render: page navigation / player-ready timeout | Add `--browser-timeout 180` (seconds) to the render command. |
| `hyperframes check` reports `multiple_root_compositions` | Harmless: the placeholder `index.html` sits next to the generated host pages; renders target `-c host-<name>.html` explicitly. |
| Captions show in a wider generic sans | Font didn't load (run-generator warns "a font failed to load"): `assets/fonts/TikTokSans-Variable.ttf` missing or the `@font-face` URL was edited. Restore it from a fresh install; re-render. |
| Two captions on screen at once in the hook | The reaction clip has burned-in text. Pick another clip or a `trim` window without it. |
| Demo cropped at the sides | Non-portrait recording under `object-fit: cover`. Blurred-letterbox edit (hyperframes-editing.md) or `demo-fit: contain` (no_yapping). |
| Last no_yapping step flashes briefly | The last sequential step only gets what's left. Give earlier steps `:: secs` so the payoff keeps ≥ 2 s. |
| Emoji / non-Latin text look off | TikTok Sans covers Latin; other glyphs come from system fonts (boxes on Linux without emoji/CJK fonts). Keep emoji out of burned-in captions (put them in the post caption). |
| Two reels overwrote each other | Two generators ran in one directory at once. One directory per reel; run variants sequentially. |
