#!/usr/bin/env node
// DansUGC ReelClaw studio mode: run a reelclaw-templates generator safely, vendor GSAP,
// render with the template's pinned HyperFrames version, then run the QA frame extraction.
//
//   node run-generator.mjs <template-dir> <params.json> [--render] [--quality standard|high|draft] [--no-qa]
//   node run-generator.mjs <template-dir> <params.json> --render-only   (after hand-editing compositions/<name>.html:
//                                          re-render + QA without regenerating, which would overwrite the edit)
//
// Why a wrapper instead of calling `node new-reel.mjs --hook "..."` directly:
//   * The public generators parse argv with indexOf/includes, so any value equal to a flag
//     (a hook of "--render", "--force-cutout", "--demo" ...) flips or shifts flags. Here every
//     value comes from JSON, is passed to the generator with execFile (no shell, so no $, `, !
//     or quote expansion) and values starting with "--" are refused.
//   * Local media is copied into <template-dir>/assets/ under a safe name (the generator puts
//     paths into HTML attributes unescaped; spaces/quotes in filenames break the composition).
//   * The generated host page loads GSAP from a CDN at render time. Offline or during a CDN blip
//     the render still exits 0 with every animation silently dropped. We vendor GSAP into
//     assets/gsap.min.js and point the host page at it.
//   * reaction_demo / no_yapping `--render` call an UNPINNED `npx hyperframes`. We render with the
//     exact version pinned in the template's package.json instead.
//
// params.json: keys are the generator's flag names without "--" (see references/studio-templates.md).
//   { "name": "pov-screen-time", "reaction": "footage/reaction-1.mp4", "demo": "demo.mp4",
//     "hook": "my screen time was 9 hours. was.", "trim": 0.4 }
//   Arrays repeat a flag ("step": ["go to claude", "paste ur script :: 4"]).
//   true adds a bare boolean flag ("flip": true); false/null omit the key.
//   "render"/"draft" are not allowed in params: use this script's --render / --quality.
// Relative local media paths resolve against the current working directory (your repo root).

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const die = (msg) => {
  console.error(`run-generator: ${msg}`);
  process.exit(1);
};

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 22) {
  die(`Node ${process.versions.node} is too old: HyperFrames needs Node >= 22 (hyperframes@0.7.x refuses to start below 22). Install Node 22+ (e.g. \`brew install node\`, \`nvm install 22\`) and re-run.`);
}

const argv = process.argv.slice(2);
const positional = [];
const opts = { render: false, renderOnly: false, quality: "standard", qa: true };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--render") opts.render = true;
  else if (a === "--render-only") opts.render = opts.renderOnly = true;
  else if (a === "--no-qa") opts.qa = false;
  else if (a === "--quality") opts.quality = argv[++i];
  else if (a.startsWith("--")) die(`unknown option ${a}`);
  else positional.push(a);
}
if (positional.length !== 2) {
  die("usage: node run-generator.mjs <template-dir> <params.json> [--render | --render-only] [--quality standard|high|draft] [--no-qa]");
}
if (!["draft", "standard", "high"].includes(opts.quality)) die("--quality must be draft, standard or high");

const tpl = resolve(positional[0]);
if (!existsSync(join(tpl, "new-reel.mjs")) || !existsSync(join(tpl, "package.json"))) {
  die(`${tpl} is not an installed reelclaw template (no new-reel.mjs / package.json). Install one with: npx --yes reelclaw-templates@latest <template> <dir>`);
}
let template = basename(tpl);
try {
  template = JSON.parse(readFileSync(join(tpl, "meta.json"), "utf8")).id || template;
} catch {}

let params;
try {
  params = JSON.parse(readFileSync(positional[1], "utf8"));
} catch (e) {
  die(`cannot read params JSON ${positional[1]}: ${e.message}`);
}
if (!params || typeof params !== "object" || Array.isArray(params)) die("params JSON must be an object");

const name = params.name;
if (typeof name !== "string" || !/^[a-z0-9-]+$/.test(name)) {
  die('params.name is required: kebab-case (a-z, 0-9, -), e.g. "pov-screen-time-v1"');
}

const MEDIA_KEYS = new Set(["reaction", "demo", "intro", "typing", "video", "music"]);
const BOOLEAN_KEYS = new Set(["flip", "force-cutout"]);
const RESERVED = new Set(["render", "draft"]);

function safeFileName(role, file) {
  const ext = extname(file).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".mp4";
  let stem = basename(file, extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "clip";
  if (stem.startsWith(`${role}-`)) stem = stem.slice(role.length + 1);
  return `${role}-${stem}${ext}`;
}

// Largest gap between video keyframes, in seconds (0 when unknown / audio-only).
function maxKeyframeGap(abs) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-skip_frame", "nokey", "-show_entries", "frame=pts_time", "-of", "csv=p=0", abs],
    { encoding: "utf8" }
  );
  if (r.status !== 0) return 0;
  const t = r.stdout.split("\n").filter((l) => l.trim() !== "").map(Number).filter(Number.isFinite);
  let gap = 0;
  for (let i = 1; i < t.length; i++) gap = Math.max(gap, t[i] - t[i - 1]);
  return gap;
}

// Copy a local media file into <tpl>/assets under a safe name; return the generator-relative path.
// Video with sparse keyframes (> 2 s apart) is re-encoded with a keyframe every second: HyperFrames
// warns that sparse keyframes cause seek failures and frozen frames (seen on real UGC clips: 6.8 s).
function stageLocal(role, value) {
  const abs = isAbsolute(value) ? value : resolve(process.cwd(), value);
  if (!existsSync(abs) || !statSync(abs).isFile()) die(`${role}: file not found: ${abs}`);
  const rel = relative(tpl, abs);
  if (rel.startsWith("assets/") && /^[A-Za-z0-9._\/-]+$/.test(rel)) return rel;
  mkdirSync(join(tpl, "assets"), { recursive: true });
  const target = join("assets", safeFileName(role, abs));
  const targetAbs = join(tpl, target);
  const marker = `${targetAbs}.src`;
  const srcId = `${abs}\n${statSync(abs).size}\n${statSync(abs).mtimeMs}`;
  if (existsSync(targetAbs) && existsSync(marker) && readFileSync(marker, "utf8") === srcId) return target;
  const gap = role === "music" ? 0 : maxKeyframeGap(abs);
  if (gap > 2) {
    console.log(`> ${role}: keyframes up to ${gap.toFixed(1)}s apart, re-encoding with 1s keyframes ...`);
    const enc = spawnSync(
      "ffmpeg",
      ["-v", "error", "-y", "-i", abs, "-map", "0:v:0", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", "30", "-g", "30", "-keyint_min", "30", "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart", targetAbs],
      { stdio: "inherit" }
    );
    if (enc.status !== 0) die(`${role}: ffmpeg re-encode failed`);
  } else {
    copyFileSync(abs, targetAbs);
  }
  writeFileSync(marker, srcId);
  return target;
}

if (opts.renderOnly) {
  if (!existsSync(join(tpl, `host-${name}.html`))) die(`--render-only: host-${name}.html not found; generate it first (run without --render-only)`);
  console.log(`> render-only: keeping your edits to compositions/${name}.html`);
} else {
  const genArgs = ["new-reel.mjs"];
  const pairs = [];
  for (const [key, raw] of Object.entries(params)) {
    if (!/^[a-z0-9-]+$/.test(key)) die(`bad key "${key}" (use the generator flag name without --)`);
    if (RESERVED.has(key)) die(`"${key}" is not allowed in params; pass --render / --quality to run-generator.mjs instead`);
    if (raw === false || raw === null || raw === undefined) continue;
    if (raw === true) {
      if (!BOOLEAN_KEYS.has(key)) die(`"${key}": true is only valid for boolean flags (${[...BOOLEAN_KEYS].join(", ")})`);
      pairs.push([key, null]);
      continue;
    }
    const values = Array.isArray(raw) ? raw : [raw];
    if (Array.isArray(raw) && key !== "step") die(`"${key}": only "step" may be a list`);
    for (const v of values) {
      if (typeof v === "number") {
        if (!Number.isFinite(v)) die(`"${key}": not a finite number`);
      } else if (typeof v !== "string") {
        die(`"${key}": values must be strings or numbers`);
      }
      let s = String(v);
      if (s.includes("\0")) die(`"${key}": contains a NUL byte`);
      if (s.startsWith("--")) {
        die(`"${key}" value starts with "--" (${JSON.stringify(s.slice(0, 40))}); the generator would read it as a flag. Rephrase it.`);
      }
      pairs.push([key, s]);
    }
  }
  // Validate everything first, then stage media (staging can re-encode, so don't start it for a
  // params file that is going to be refused anyway).
  for (const [key, value] of pairs) {
    if (value === null) {
      genArgs.push(`--${key}`);
      continue;
    }
    let s = value;
    if (MEDIA_KEYS.has(key) && !/^https?:\/\//i.test(s)) s = stageLocal(key, s);
    if (key === "steps") s = resolve(process.cwd(), s);
    genArgs.push(`--${key}`, s);
  }

  const t0 = Date.now();
  console.log(`> ${template}: generating "${name}"`);
  const gen = spawnSync(process.execPath, genArgs, { cwd: tpl, shell: false, encoding: "utf8" });
  if (gen.error) die(`could not start the generator: ${gen.error.message}`);
  // Drop the generator's own "Next: npx hyperframes render" hint: it is unpinned; this script renders.
  const genOut = `${gen.stdout || ""}${gen.stderr || ""}`.split("\n").filter((l) => l.trim() && !l.startsWith("Next:"));
  if (genOut.length) console.log(genOut.join("\n"));
  if (gen.status !== 0) die(`generator exited with ${gen.status}; fix the inputs above and re-run`);
  console.log(`> generated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// Vendor GSAP so the render never depends on the CDN.
const hostRel = `host-${name}.html`;
const hostAbs = join(tpl, hostRel);
if (!existsSync(hostAbs)) die(`generator did not write ${hostRel}`);
let host = readFileSync(hostAbs, "utf8");
const cdn = host.match(/<script src="(https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]+\/gsap\.min\.js)"><\/script>/);
const gsapLocal = join(tpl, "assets", "gsap.min.js");
if (cdn) {
  if (!existsSync(gsapLocal) || statSync(gsapLocal).size < 20000) {
    try {
      const res = await fetch(cdn[1]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length < 20000 || !/gsap/i.test(body.subarray(0, 4000).toString("utf8"))) throw new Error("unexpected response body");
      mkdirSync(join(tpl, "assets"), { recursive: true });
      writeFileSync(gsapLocal, body);
    } catch (e) {
      die(`could not vendor GSAP from ${cdn[1]} (${e.message}). Without it the render silently drops every animation (music fade, greenscreen drag). Get network once, or copy gsap.min.js 3.x into ${gsapLocal}, then re-run.`);
    }
  }
  host = host.replace(cdn[0], '<script src="assets/gsap.min.js"></script>');
  writeFileSync(hostAbs, host);
  console.log("> GSAP vendored: host page now loads assets/gsap.min.js");
}

// Key times for QA: when the hook segment ends / the next segment starts.
const num = (k, d) => (params[k] === undefined ? d : Number(params[k]));
let cut = "";
if (template === "reaction_demo") cut = String(num("reaction-secs", 3));
else if (template === "no_yapping") cut = String(num("intro-secs", 6));
else if (template === "greenscreen_reaction") {
  const moves = ["start-position", "start-x", "start-y", "start-size"].some((k) => params[k] !== undefined);
  if (moves) cut = String(num("move-at", 2));
}

const pinMatch = readFileSync(join(tpl, "package.json"), "utf8").match(/hyperframes@(\d+\.\d+\.\d+)/);
const hf = `hyperframes@${pinMatch ? pinMatch[1] : "0.7.76"}`;
const out = `renders/${name}.mp4`;
const renderCmd = ["--yes", hf, "render", "-c", hostRel, "-o", out, "--quality", opts.quality];

if (!opts.render) {
  console.log(`> generated only. Edit compositions/${name}.html if needed, then render + QA with the same command plus --render-only`);
  process.exit(0);
}

mkdirSync(join(tpl, "renders"), { recursive: true });
const logRel = `renders/${name}.render.log`;
const t1 = Date.now();
console.log(`> rendering ${out} with ${hf} (quality ${opts.quality}); full log: ${logRel}`);
// HyperFrames prints hundreds of progress/trace lines. Keep them in the log file and echo only the
// milestones, so the agent's context isn't flooded.
const r = spawnSync("npx", renderCmd, { cwd: tpl, shell: false, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
if (r.error) die(`could not start npx: ${r.error.message}`);
const log = `${r.stdout || ""}\n${r.stderr || ""}`;
writeFileSync(join(tpl, logRel), log);
if (r.status !== 0) {
  const tail = log.split("\n").filter((l) => l.trim() && !/Capturing frame|\[Render:trace\]/.test(l)).slice(-25).join("\n");
  die(`render failed (exit ${r.status}). Last lines:\n${tail}\nFull log: ${join(tpl, logRel)}`);
}
console.log(`> rendered in ${((Date.now() - t1) / 1000).toFixed(1)}s -> ${join(tpl, out)}`);

// The render exits 0 even when it silently lost something. Surface those cases.
const SIGNATURES = [
  [/Failed to download CDN script|sub_timeline_script_failure|timeline wait cut short/i, "a script (GSAP) failed to load: animations and the music fade were dropped"],
  [/Asset load failure[^\n]*resource=font|404 Not Found: [^\n]*\.(ttf|otf|woff2?)/i, "a font failed to load: captions fell back to another font"],
  [/Asset load failure(?![^\n]*resource=font)/i, "an asset failed to load (see the log): something is missing from the frame or audio"],
  [/sparse keyframes/i, "a video has sparse keyframes: expect frozen frames; re-encode it (run-generator does this for media it stages)"],
  [/PAGEERROR/i, "a script error in the composition: check your edits"],
];
const warnings = [];
for (const [re, why] of SIGNATURES) {
  const line = log.split("\n").find((l) => re.test(l));
  if (line) warnings.push(`${why}\n    ${line.trim().slice(0, 240)}`);
}
if (warnings.length) {
  console.log(`\n!! RENDER WARNINGS (the render "succeeded" but these usually mean a broken video):`);
  for (const w of warnings) console.log(`  - ${w}`);
  console.log("");
}

if (opts.qa) {
  const qaDir = join(tpl, "qa", name);
  const args = [join(HERE, "qa-frames.sh"), join(tpl, out), qaDir];
  if (cut) args.push(cut);
  const q = spawnSync("sh", args, { stdio: "inherit", shell: false });
  if (q.status !== 0) die("QA frame extraction failed");
  if (warnings.length) {
    writeFileSync(join(qaDir, "render-warnings.txt"), warnings.join("\n") + "\n");
    console.log(`render warnings saved to ${join(qaDir, "render-warnings.txt")}: fix them before delivering`);
  }
}
