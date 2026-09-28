# Writing the product brief from a repo

The brief is what the engine uses to match reactions and write hooks, and what you use to rewrite
them. A vague brief produces vague ads. A made-up brief produces ads that get the user in trouble.

## Where the truth lives (check in this order)

| Source | What to pull |
|---|---|
| `README*` (root, then `apps/*`, `packages/*` for the user-facing app) | One-line pitch, features, audience, screenshots/GIF links |
| `package.json` / `pyproject.toml` / `Cargo.toml` / `composer.json` | `name`, `description`, `homepage`, `keywords` |
| `app.json`, `app.config.{js,ts}` (Expo), `Info.plist`, `AndroidManifest.xml`, `*.xcodeproj` | Display name, bundle id, app store URL |
| `fastlane/metadata/<locale>/{name,subtitle,promotional_text,description,keywords}.txt`, `fastlane/metadata/android/<locale>/{title,short_description,full_description}.txt` | The store listing — usually the best-written copy in the repo |
| Landing pages: `app/page.*`, `app/(marketing)/**`, `pages/index.*`, `src/pages/index.*`, `index.html`, `site/`, `www/`, `landing/` | Hero headline, subhead, feature bullets, FAQ, pricing (only if public) |
| `content/`, `docs/`, `blog/`, `CHANGELOG.md`, `llms.txt`, `public/og*` | Positioning, recent features |
| Marketing site URL from `homepage` / README (fetch it if your client can browse) | Current live claims |

Use `rg -i "tagline|headline|hero|subtitle|description" --max-count 3` style searches to find copy
fast. Skip `node_modules`, build output, lockfiles, and generated files.

## The brief format

```
What: <one sentence, plain words — a 12-year-old would get it>
For: <a specific person in a specific moment>
Pain: <the one painful problem, in the user's words>
Aha: <the moment in the demo where it clicks — what's on screen>
Proof: <only real facts found: e.g. "4.8★ on the App Store (fastlane/metadata)", or "none found">
Tone: <how the product talks — playful, clinical, deadpan, hype>
```

Pass it as `brief` (you can include a short "Do not claim:" line for anything risky). Put
audience/tone/language instructions in `direction`.

### Example (a habit-tracker app)

```
What: An iPhone habit tracker that locks distracting apps until you finish today's habits.
For: College students who open TikTok "for 5 minutes" and lose the evening.
Pain: Willpower-only habit apps are easy to ignore.
Aha: Tapping Instagram and getting a "Do 10 pushups first" screen.
Proof: none found in repo.
Tone: playful, self-aware, a little savage.
Do not claim: specific user counts, "clinically proven", or pricing.
```

## Truthfulness rules

- Only state what you found or what the user told you. Cite where you found proof points when you
  show the brief.
- No invented prices, discounts, free trials, user counts, ratings, rankings, testimonials,
  endorsements, medical/financial outcomes, or "as seen on".
- If the product is pre-launch or the repo has no copy, say so and write the brief from the code's
  actual behavior (routes, screens, features) — then ask the user to confirm the audience.
- Ask at most one question at a time, with your best guess pre-filled
  ("I think this is for freelance designers — right?").
