# Tree streak design exploration

Three concept boards generated with the built-in image generation tool, using extracted frames from the user's actual videos as visual references. These are design inspiration, not implemented app screens. Full prompts are in prompts.json.

## Concept boards

- 01-home-living-goal.png: the existing Home daily-goal card gains a landscape tree scene, keeping both task actions visible. Shows early and seven-day examples.
- 02-growth-sanctuary.png: Progress gives the tree more space, followed by streak statistics, milestone rail, today's practice, calendar, and points history.
- 03-completion-celebration.png: dismissible completion sheet for Day 1 and Day 30, with a landscape animation and clear reward breakdown.

Recommendation: combine these three surfaces. Home is the daily reminder, Progress explains the journey, and the sheet celebrates an actual advance.

## Project findings

Relevant existing components:

- src/features/progress/daily-goal-card.tsx: Home and Progress already share the two-task card.
- src/app/progress.tsx: current points hero, streak metrics, milestone roadmap, calendar, and ledger.
- src/features/progress/model.ts: only both ritual and quiz on the same calendar day advance current. Each activity earns 10 points once daily. First 7-day bonus is 40; first 30-day bonus is 100. Bonuses do not repeat.
- src/features/progress/provider.tsx: existing source of current, best, total, today's flags, and reward notices.
- src/constants/ritual-theme.ts: warm ivory, peach, saffron, gold, brown ink, and green.
- package.json: Expo 57 and expo-video already installed.

Versioned Expo documentation was read before this exploration: https://docs.expo.dev/versions/v57.0.0/.

## Video findings

Reviewed metadata and late frames for all 30 clips; inspected beginning, middle, and late motion samples for Days 1, 2, 7, 15, 29, and 30.

All clips are 1920x1080 landscape H.264/yuv420p MP4 with audio tracks and opaque warm backgrounds. Days 1–29 last 4 seconds; Day 30 lasts 10 seconds. Day 30 starts again from a seed and grows through the whole journey, making it especially suitable as a milestone recap.

The tree changes from a seed/sprout to a leafy plant, then a branching tree. Camera scale and background vary across days; this is a sequence of individually rendered scenes, not a perfectly continuous animation.

Use a 16:9 rounded scene at full width. Keep text and controls outside the video so the baked-in leaves and light do not hurt readability. Preserve the full frame; portrait cropping would lose the canopy or soil. A softly tinted inset panel is more reliable than trying to blend the opaque footage seamlessly into a flat background.

References:

- references/all-30-days.jpg: late frame for every day.
- references/motion-samples.jpg: temporal samples of six stages.
- references/video-metadata.json: per-file metadata.
- references/day-01.jpg through day-30.jpg: lightweight frames for reference/poster exploration.

## Suggested animation and state behavior

| State | Visual | Action |
| --- | --- | --- |
| No completed streak yet | Seed frame from the start of Day 1 | Complete both tasks to begin |
| One of two tasks complete | Keep the last earned growth stage | Highlight the remaining task |
| Both tasks newly complete | Play the new streak day's clip once, then rest on its final frame | Show daily reward and any newly earned milestone bonus |
| Ordinary Home revisit | Still final frame for the current stage | Open Progress |
| First 7-day completion | Day 7 growth plus gold bonus treatment | Show +40 first milestone bonus |
| First 30-day completion | Day 30 full journey recap | Show +20 daily activity earnings and +100 first milestone bonus |
| Current streak above 30 | Keep the mature Day 30 tree; show the real streak number | Continue existing streak and points rules |
| Streak breaks | Return current tree to seed state | Use gentle copy, keep best streak and completed days visible |
| Reduced motion enabled | Show the earned final frame immediately | Preserve all progress and reward information |

The current-day tree must use current, not total or best, if it represents the existing consecutive streak. A permanently growing tree would need a different product rule. Optional future idea: retain milestone trees in a separate collection without changing the current streak display.

Play muted by default; the files contain audio tracks. Make the sheet dismissible during playback. Do not automatically loop growth or replay Day 30 on every Home visit. Poster-first presentation avoids a blank scene while video loads. Persist a separate last-seen celebration marker so reopening the app does not repeatedly announce an already acknowledged reward.

The source videos total roughly 97 MiB. Before integration, create mobile-sized encodes and lazy-load stages. Preserve originals. No videos were copied into the app bundle in this exploration.

## Mockup interpretation

Generated screen balances are illustrative, not calculated data. For a brand-new account with exactly 15 fully completed days and no other activity or deductions, balance would be 340 (300 daily +40 milestone), rather than the illustrative 300 shown in concept 02. At 30 consecutive complete days it would be 740. Render actual values from progress state in implementation.

Concept 01 compares two stages, rather than one day's literal before-and-after: its Day 1 incomplete screen assumes a previously earned Day 1 stage with today's next goal still pending. On the user's very first incomplete day, show a seed instead.

The generated boards approximate the original footage and UI. In implementation use the actual MP4s/posters, existing lotus points icon, translated app copy, and existing navigation. Day 15 is a visual checkpoint only; it has no additional reward.

No application source files were changed.
