# Tree growth cycles

The v3 progress snapshot uses the existing atomic storage key. Tree levels and streaks are independent: a completed day grows one level; each ended incomplete day loses one level and resets the streak. Partial days retain earnings; only inactive days deduct points. Levels and balances floor at zero. Level 30 closes a tree; the next saved-timezone calendar day starts the next seed with fresh bonus eligibility. Empty absences never create additional cycles.

Level 7 awards 40 points and level 30 awards 100, once per tree. Cycle-scoped milestone IDs prevent duplicates after regrowth or receipt retry. Lifetime completed days, balances, ledger, calendar and historical best streaks survive migration. Frozen v1/v2 engines recover source receipts and settle old days before importing tree state, so losses apply prospectively and migration does not celebrate or pay a new tree bonus.

Home and Progress each claim a focused visit once per app session. Background-to-active resets the session; brief inactive overlays do not. Progress and motion preferences must load first. Automatic failures consume the visit. A shared priority controller gives celebrations priority over inline recovery, screen entry and replay; alarm interruption cancels playback. Interrupted requests never resume beneath another player. Presentation acknowledgments are independent of the reward snapshot; the latest saved growth transition can recover after process death between reward storage and presentation.

Recovery crossfades exact posters: up to three adjacent levels at 700 ms each, larger losses at 900 ms, and maturity-to-seed rollover at 900 ms. Losses recovered with today's goal appear in the celebration instead. Seed entry gently reveals the seed. Reduced motion shows posters. Decoder errors and timeouts end on the exact poster; modal dismissal remains immediate.

All 30 original animations are bundled offline at 960×540, H.264, 30 fps, without audio. Levels 1–29 retain four seconds. Level 30 uses the full ten-second recap for maturity celebrations/replay and a separate two-second mature segment on ordinary visits. Videos total 23.56 MiB. The media script regenerates posters and validates dimensions, codec, frame rate, duration, audio absence and package size with FFprobe; `manifest.json` records the results.

```sh
LD_LIBRARY_PATH=/tmp/geeta-ffmpeg python3 scripts/prepare-tree-assets.py /home/zrf/Downloads/final --ffmpeg /tmp/geeta-ffmpeg/ffmpeg --ffprobe /tmp/geeta-ffmpeg/ffprobe
```

The development route `/dev/tree-preview` includes every stage, activity states, regrowth/repeat bonuses, decoder failure, reduced motion, adjacent/multiple losses, cycle rollover and focused Home/Progress session simulation. Gallery controls do not modify reward progress or real visit tracking. All product copy supports English, Hindi and Hinglish.

Verification includes progress/tree cycles, migration, replay idempotency, presentation failures, session claims, playback priority and complete media coverage, plus language/quiz/alarm-navigation regressions, TypeScript, lint, web export and Android Hermes export. Encoded middle/final frames from all 30 videos and the mature segment's opening frame were inspected.

Live device acceptance remains outstanding: the available computer-use interface exposes no browser or native UI surface. Before release, exercise real alarm-led completion and recovery, small screens, enlarged Hindi text, offline launch, background/resume, alarm interruption, reduced motion and repeated navigation on a device. Production exports verify bundling, not native decoder behavior or device layout.
