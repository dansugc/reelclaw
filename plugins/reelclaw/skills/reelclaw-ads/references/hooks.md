# Hooks for UGC reaction + demo ads

A ReelClaw ad opens with a real creator reacting (shocked, crying, laughing, deadpan, hyped…) with
your hook on top, then the product demo. The hook is the only text most viewers read: it must make
the reaction make sense and make the viewer need the demo. Treat hook writing as the main job; the
render is the cheap part.

In volume mode the hosted engine places, sizes, and times the text (TikTok Sans, green zone). In
studio mode the template does the same, and you control position, second captions, and timing.

## Rules

- **Short.** Under 80 characters; 3-7 words per line; max 3 lines on a phone. Readable in 1 s.
- **Native, not ad-speak.** Lowercase, first person or POV/"when". "i can't believe this is free"
  beats "Discover our revolutionary solution".
- **One idea.** Pain OR aha OR curiosity, not all three.
- **Match the reaction's emotion.** Shocked → surprise/discovery. Crying → relatable pain or relief.
  Laughing → absurd situation. Deadpan → dry understatement. Frustrated/angry → problem-agitate.
- **Specific beats clever.** Numbers and moments ("i logged 12 cravings today and gave in to zero",
  "when you said 'one video' 3 hours ago") beat vague claims ("when life is hard").
- **Don't name the product.** "this app" opens a curiosity gap; the comments ask "what app??" and
  the demo answers. Brand only when the brand itself is the hook.
- **Truthful.** No claim the brief can't back (numbers, "free", "#1", results, medical/financial
  outcomes). Numbers must come from the repo, the demo on screen, or the user.
- **Vary formats** across a batch (at least 3) so the algorithm can pick a winner.

## Formats

| Format | Template | Example (habit-lock app) |
|---|---|---|
| POV | `pov: <situation the product changes>` | pov: your phone won't open tiktok until you work out |
| When / me when | `when <relatable pain moment>` | when you said "one video" 3 hours ago |
| Discovery | `why did nobody tell me <X> exists` | why did nobody tell me this app exists |
| Disbelief | `this <product type> just <surprising action>` | this app just made me do pushups to open instagram |
| Before/after | `my <metric> before this app vs after` | my screen time before this app vs after |
| Callout | `<audience> you need this` | college students you NEED this |
| Confession | `i'm embarrassed how much this helped` | i'm embarrassed how well this worked |
| Question | `is it normal to <pain>?` | is it normal to lose whole evenings to reels? |
| Us vs them | `everyone: <common advice> / me: <product way>` | everyone: just use willpower. me: |
| Stakes | `<thing> was about to <bad outcome>` | my finals were about to cook me |
| Nobody talks about | `nobody tells you <hidden truth>` | nobody tells you reels are built to never end |
| I wish | `i wish someone told me <lesson> sooner` | i wish someone told me to lock my apps sooner |

## Per template (studio mode)

- **reaction_demo**: `hook` over a ≤ 3 s reaction; the demo must pay it off within ~2 s of the cut.
  Add `hook2` as the **payoff line** over the demo ("12/12 resisted", "real creators. zero
  editing."): it rewards finishing and drives rewatches. Keep hook2 shorter than the hook.
- **no_yapping**: hook = `"[enviable, concrete outcome] but no yapping"` ("24 ugc ads for my app
  but no yapping"). Steps are 2-5 word lowercase imperatives ("describe ur app", "hit find
  matches"); the **last step is the flex** and holds to the end, so give earlier steps explicit
  `:: secs` and leave the payoff ≥ 2 s. Never add narration: the silence is the format.
- **greenscreen_reaction**: community voice, third person, like a fan post: "please tag the app
  developer bc they lowkey saved my life", "somebody find me the developer of this app".

## Rewriting the engine's hooks (volume mode)

1. Read each engine hook next to its reaction (emotion).
2. Keep the good ones. Rewrite generic ones with the brief's **pain** and **aha**.
3. Check each against the rules (length, truth, emotion match). At least 3 formats per batch.
4. Show the user the table, then save with `reelclaw_update_batch { hooks: [{ id, text }] }`.

## Anti-patterns

- "Introducing X, the all-in-one platform for…" (ad-speak, instant scroll)
- "You won't BELIEVE…" clickbait with no specifics
- Hashtags or emoji stacks in the overlay (they go in the post caption)
- Invented stats: "saves 10 hours a week" when nothing says so
- Describing the demo instead of the feeling ("App with lock screen feature")
- Walls of text: if it needs 4+ lines, it's two hooks
- Anything implying the creator is AI or a paid actor reading a script: they are real people
  reacting; keep it natural.

## Length and pacing

| Reel length | Use |
|---|---|
| 7-10 s | simple hook + one aha, highest completion |
| **10-15 s** | **default: ~3 s reaction + 7-12 s demo** |
| 15-30 s | tutorials (no_yapping), storytelling |
| 30 s+ | avoid for ads |

## Post captions (when publishing)

```
<hook line, same as the overlay>

<1-2 sentences tying the feeling to the product: truthful, no invented claims>

#niche1 #niche2 #niche3 #broad1 #fyp
```

3-8 hashtags, niche first. Same truth rules as the hook.
