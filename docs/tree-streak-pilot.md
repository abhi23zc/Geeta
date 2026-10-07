> Historical pilot notes. The complete implementation and current verification are documented in [tree-growth-cycles.md](tree-growth-cycles.md).

# Growing-tree streak pilot

The pilot extends the existing ritual theme and daily goal; it does not change any reward or alarm rule.

## Review it

Run `npm start` for the native development app, or `npm run web` for web. Open Home to see the seed/tree inside the daily-goal card. Open Progress and choose **Preview tree growth · Development**. The preview route is `/dev/tree-preview`; release builds redirect it to Home and omit its entry point.

The gallery isolates its values from actual progress. Inspect seed/reset, Days 1, 2, 3, 7, 15, 30, and 31; switch 0/2, 1/2, and 2/2 goal states. Open the completion sheet with both tasks selected. Test reduced motion, previously earned milestone bonuses, and simulated failure (use a video stage and allow five seconds for its fallback). Progress's Replay growth exercises the same playback component.

## Behavior

- Videos are bundled only for Days 1–3, 7, and 30; the other days use exact-day stills. Home always uses a still. Progress offers explicit replay when video exists and motion is allowed.
- All 30 final-frame posters and the initial seed poster are bundled, allowing correct visual progress on every day.
- At zero current streak the tree is a seed. Completing only one task never advances it. After 30 the mature tree stays while the real streak count increases.
- A newly rewarded day queues celebration after the progress save. It displays on Home or Progress after navigation settles, never over quiz play/results or an active alarm.
- Presentation acknowledgment is stored separately from rewards, scoped by profile creation time. Existing progress baselines silently. Newly recovered receipts can celebrate today; previous days cannot.
- Milestone bonus copy comes from newly added ledger entries. Repeating a seven- or thirty-day streak never fabricates another bonus.
- Presentation storage failures suppress automatic celebrations and cannot fail a reward transaction. Replay remains usable.
- Playback is muted, foreground-only, non-looping, has no native controls, and is limited to one tree player. First-frame timeout is five seconds; a stalled playback is also bounded. A poster stays visible until a frame appears and replaces video on finish/failure.
- System reduced-motion changes are observed. Sheet controls remain available throughout playback; Android Back and Close dismiss immediately.
- New product copy uses the existing English/Hindi/Hinglish catalog. The development gallery's diagnostic controls are intentionally English.

## Media

`assets/tree-streak/manifest.json` records the five encoded videos: 960×540, 30 fps, H.264, no audio. Combined videos are 4.89 MiB; posters are 1.30 MiB. Original source files remain untouched in `/home/zrf/Downloads/final`.

`scripts/prepare-tree-assets.py` regenerates the pilot with FFmpeg. The implementation used OpenH264 because the available local FFmpeg does not include x264. The registry in `src/features/progress/tree/assets.ts` is the single place to add future day videos after the UI review.

## Validation

- Eight new pure-model tests cover stages, both completion orders, daily versus milestone earnings, repeats, acknowledgment concurrency/restarts, existing baselines, stale completions, migration, storage errors, and profile separation.
- Existing progress, language, quiz, and alarm navigation/recovery suites passed.
- TypeScript and full Expo lint passed.
- Web production export and Android Hermes production export succeeded; the Android export includes exactly the five selected videos and all posters.
- Asset metadata was checked for dimensions, codec, 30 fps, duration, and absence of audio. Beginning, middle, and final encoded video frames were inspected.

Live browser/device visual QA is still required: no browser surface is available to the session's UI-control tool. A connected Android device was detected, but this change has not been installed or exercised on that device. iOS was not exercised. In particular, verify 320–430-point layouts, large Hindi text, screen-reader focus, Android texture rendering, dismiss-during-playback, background/resume, and alarm interruption before release.

This is the UI-review checkpoint. No remaining day videos were added, and no deployment or release was performed.

## UI refinement after the first device review

Home keeps the daily-goal header as its single streak label, removes the repeated tree heading/badge, and uses a clearer green completion status. Progress now leads with the tree and stage title, includes a small next-growth-milestone meter without promising another bonus, and places the points balance in a compact horizontal summary. The development link appears below the calendar and ledger. Replay has pressed, disabled, and playing states.

The celebration groups its success indicator with the label, enlarges task and reward text, separates daily earnings and newly earned bonus rows, and keeps Continue/View growth outside the scrollable content. Colors, source footage, and reward rules remain the same. Changes were guided by the user's three device screenshots; the revised layout still needs on-device visual review.
