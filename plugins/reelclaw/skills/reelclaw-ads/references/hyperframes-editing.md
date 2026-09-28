# Editing a generated reel (HyperFrames primer)

Use this when the user wants something the template flags can't do: exact caption position, a
different caption style, a pop-in, a second caption at a specific moment, a different demo fit.
Everything here is plain HTML/CSS plus one paused GSAP timeline.

## The two files the generator writes

```
<template-dir>/
  host-<name>.html            wrapper page: loads GSAP (assets/gsap.min.js after run-generator),
                              1080x1920, embeds the reel via data-composition-src. Rarely edited.
  compositions/<name>.html    THE REEL: <template> with <style>, the timed elements, and a <script>
                              that sizes captions and registers the timeline. Edit this one.
  assets/                     staged media, fonts/TikTokSans-Variable.ttf, gsap.min.js
  renders/<name>.mp4          output
```

Inside `compositions/<name>.html` (reaction_demo; the other templates follow the same pattern):

```html
<template>
  <style>
    @font-face { font-family: "TikTok Sans"; src: url("assets/fonts/TikTokSans-Variable.ttf") ...; font-weight: 300 900; }
    #root { ... 1080x1920 ... }
    .fill { position: absolute; inset: 0; object-fit: cover; }          /* both videos */
    .hook-clip  { position: absolute; inset: 0; left: 180px; right: 180px;
                  padding-top: 220px; padding-bottom: 500px;            /* = the safe band */
                  display: flex; flex-direction: column; justify-content: flex-start|center|flex-end; }
    .hook2-clip { ...same, for the demo caption... }
    .hook { font-family: "TikTok Sans", sans-serif; font-weight: 700; font-size: 58px;
            color: #fff; -webkit-text-stroke: 8px #000; paint-order: stroke fill; ... }
  </style>
  <div id="root" data-composition-id="<name>" data-duration="<total>">
    <video id="<name>-react" class="fill" src="assets/..." data-start="0" data-duration="3" data-media-start="<trim>" muted playsinline>
    <video id="<name>-demo"  class="fill" src="assets/..." data-start="3" data-duration="<demo>" muted playsinline>
    <div id="<name>-hook"  class="clip hook-clip"  data-start="0" data-duration="3"><div id="<name>-hook-wrap" class="hook-wrap"><span class="hook">…</span></div></div>
    <div id="<name>-hook2" class="clip hook2-clip" data-start="3" data-duration="<demo>">…</div>
    <audio id="<name>-music" src="assets/..." data-start="0" data-duration="<total>" data-volume="0.7">
  </div>
  <script>
    /* fitHook(): shrinks .hook 2px at a time until the wrap is <= 1150px tall (floor 26px) */
    const tl = gsap.timeline({ paused: true });
    tl.to("#<name>-music", { volume: 0, duration: 0.8 }, <total - 0.8>);   /* music fade */
    window.__timelines["<name>"] = tl;
  </script>
</template>
```

Timing lives in `data-start` / `data-duration` (seconds from the reel start) and
`data-media-start` (offset into the source file). Layering is CSS order / `z-index`;
`data-track-index` is only a lane in HyperFrames Studio and does not affect the render. no_yapping
uses `.hook-cap` / `.step-cap` / `.cap-wrap` (+ `.typing-top`, `.demo-bottom`); greenscreen uses
`.hook-clip` / `.hook-wrap` plus a GSAP `gsap.set`/`tl.to` for the drag.

## The edit loop

1. Generate once without rendering (or reuse the last run):
   `node <skill-dir>/scripts/run-generator.mjs <template-dir> <params.json>`
2. Edit `compositions/<name>.html` with your file-edit tool (small, exact replacements).
3. Render + QA without regenerating (regenerating overwrites your edits):
   `node <skill-dir>/scripts/run-generator.mjs <template-dir> <params.json> --render-only`
4. Look at the QA frames (qa-checklist.md). Repeat.

To keep the edited version and still try flag changes, save the edits under a new name first:
copy the composition to `compositions/<name>-edit.html`, change every `<name>` id inside it to
`<name>-edit` (the `data-composition-id`, element ids, the `fitHook` ids and the
`window.__timelines["…"]` key), copy the host page to `host-<name>-edit.html` pointing at it, and
render that host with `--render-only` using a params file whose `name` is `<name>-edit`.

## Recipes (reaction_demo; position, pill, snapchat bar, letterbox, extra caption and pop-in were rendered and checked)

**Font size is set by script, not CSS.** `fitHook()` writes `font-size` as an inline style
(starting from the `hook-size` flag, default 58), so a CSS `font-size` on `.hook` is silently
ignored. To change one caption's size, give `fitHook` a base size:
```js
function fitHook(wrapId, base = 58) {   // was: function fitHook(wrapId) {
  ...
  let size = base;                        // was: let size = 58;
fitHook("<name>-hook2-wrap", 42);        // in fitAll()
```
(no_yapping's sizing function is `fit(wrapId, base, maxH)` and already takes a base; greenscreen's
`fitHook()` takes no arguments and sizes its single hook from `hook-size`: use that flag.)

Keep all text inside x 180-900, y 220-1420 (the green box in QA frames). Keep captions static
unless the user asks for motion (house rule: a caption is fully visible on its first frame).

**Exact caption position.** Pin the hook's top edge at y = 300:
```css
.hook-clip { justify-content: flex-start; padding-top: 300px; }
```
(`hook-position` covers top/center/bottom; use this only for exact placement.)

**Snapchat-style bar** (the hosted engine's `snapchat` caption style: full-width black bar at 55%,
medium weight, no stroke, 42 px). Append inside `<style>` (scoped to hook2 here), and set the size
with `fitHook("<name>-hook2-wrap", 42)` as above:
```css
.hook2-clip { left: 0; right: 0; }
.hook2-clip .hook-wrap { width: 100%; background: rgba(0,0,0,0.55); padding: 30px; }
.hook2-clip .hook { font-weight: 500; -webkit-text-stroke: 0; text-shadow: 2px 2px 0 rgba(0,0,0,0.5); }
```
Full-width bars break the 180 px side margins on purpose (a bar reads as one block); keep the
*text* inside the band.

**TikTok "text with background" pill** (white box, black text; scoped to the first hook here):
```css
.hook-clip .hook { color: #000; -webkit-text-stroke: 0; text-shadow: none; background: #fff;
        padding: 6px 16px; border-radius: 14px; line-height: 1.55;
        -webkit-box-decoration-break: clone; box-decoration-break: clone; }
```

**Heavier / bigger text.** Prefer the `hook-size` flag. For weight: `.hook { font-weight: 800; }`
(TikTok Sans is variable, 300-900).

**Letterboxed demo on a blurred copy** (a landscape or 3:4 recording shows whole instead of
cropped). Add a blurred copy of the demo *before* the demo `<video>` in the markup, with the same
timing, and switch the demo to `contain`:
```html
<video id="<name>-demo-bg" class="fill demo-bg" src="<same src as the demo>"
  data-start="<demo data-start>" data-duration="<demo data-duration>" data-track-index="1" muted playsinline></video>
```
```css
.demo-bg { filter: blur(40px) brightness(0.55); transform: scale(1.2); }
#<name>-demo { object-fit: contain; }
```

**A caption at a specific moment** (e.g. "wait for it" from 5.0 to 6.5 s): copy the hook2 block,
give it new ids (`<name>-hook3`, `<name>-hook3-wrap`), an extra class, and its own timing, then
add `fitHook("<name>-hook3-wrap");` inside `fitAll()` so it auto-sizes. It inherits hook2's
position, so move it or it will sit on top of hook2:
```html
<div id="<name>-hook3" class="clip hook2-clip hook3-clip" data-start="5" data-duration="1.5">
  <div id="<name>-hook3-wrap" class="hook-wrap"><span class="hook">wait for it</span></div>
</div>
```
```css
.hook3-clip { justify-content: center; }
```

**A pop-in on a later caption** (only if asked; never on the first caption at t=0). Add inside the
script, before `window.__timelines[...] = tl;`, at that caption's `data-start`:
```js
tl.from("#<name>-hook3-wrap", { scale: 0.85, opacity: 0, duration: 0.18, ease: "back.out(2)" }, 5);
```
Tweens must be on the registered timeline (seek-safe); no `setTimeout`, `Date.now()`,
`Math.random()`, or CSS animations, which don't render deterministically.

**Change the cut.** The reaction's `data-duration`, the hook's `data-duration`, the demo's and
hook2's `data-start` must all move together, and `data-duration` on `#root` (and on the host page's
root + wrapper div) must equal the new total. Easier: change `reaction-secs` / `trim` in params and
regenerate.

## Fonts

TikTok Sans ships with every template (`assets/fonts/`, SIL OFL). Never rely on a system font. If
you write a composition from scratch, copy `assets/fonts/TikTokSans-Variable.ttf` into it and
declare it with `@font-face` (as above) and `font-family: "TikTok Sans", sans-serif`. A missing or
misspelled font file does not fail the render: run-generator reports `a font failed to load`, and
the QA font check shows a wider, looser fallback. Machines with TikTok Sans installed system-wide
can mask a broken `@font-face`; the log check still catches the missing file.

## Rules that keep renders correct

- Always render the **host page** (`host-<name>.html`), never `compositions/<name>.html` directly.
- One paused GSAP timeline, registered at `window.__timelines["<name>"]`; ids must match.
- Videos stay `muted playsinline`; sound comes from separate `<audio>` elements (`data-volume` 0-1).
- `npx --yes hyperframes@0.7.76 check` in the template dir lints your edit. It always reports one
  `multiple_root_compositions` error (placeholder `index.html` next to host pages); ignore that one.
- If the HyperFrames skills are installed (`hyperframes`, `hyperframes-core`,
  `hyperframes-animation`), load them for anything bigger than these recipes.
