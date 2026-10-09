# Gita screen reliability — 2026-10-09

The Gita reader owns a single playback controller and native status subscription per frozen practice session. Focus callbacks and player identity do not depend on status or tab selection. Display updates are deduplicated. Development diagnostics are bounded to 120 events per screen, containing player identity, command generation/reason, subscription execution and status/state transitions; they exclude teaching text, reflections and file URLs.

Boundary and failure handling latch their states before issuing native commands, including when native commands synchronously emit another status. Playback commands are generation guarded and require the same active ritual session, screen focus and foreground. Blur, background and unmount cancel commands and listening samples. Resume preserves position bounded by verified evidence. Alarm entry still starts automatically after the ringing phase; restored checkpoints remain paused.

Only contiguous foreground playback earns listening evidence. The 15-second foreground watchdog, playback errors, short recordings and unverifiable endings make reading available. Deliberate pauses and background time do not trigger the watchdog. Once available, reading remains available during preparation and replay. The checkbox separately confirms reading and reflection. Narration never automatically completes the ritual.

Recording retry takes a download lease, verifies file existence, bytes and SHA-256, and repairs using the frozen descriptor or an exact practice/revision match. Healthy files work offline and are reused after decoder failures. Bundled recordings use the same bundled source without network access. Repair respects connectivity, Wi-Fi preferences, temporary-file verification and storage limits. Pins release idempotently; stale preparations release their own pins. Failed repair preserves teaching text, bookmarks and listening evidence. A repaired checkpoint source is saved before replacing the player source. Schema version 1 and native completion validation are unchanged.

Replay preserves completion and verified listening evidence. Completion writes retain the existing single-flight handler and native reward transaction; completed sessions cannot submit another completion. Points refresh retries do not replay reward creation.

Cue highlighting requires complete frozen-text coverage. Sanskrit/transliteration pairing additionally requires each Sanskrit line to match its cue and both blocks to have the same line count. Unverified alignment renders complete text blocks. Manual tab selection survives playback and retry. Completed practices retain their full text and glossary. Recovery targets are at least 48 points, text wraps in the existing scroll container, and bottom padding includes system safe-area insets. New copy is available in English, Hindi and Hinglish.

## Verification

- Full JavaScript suite: 21 test files passed, including controller and expanded cache regression coverage.
- TypeScript: passed after Expo refreshed its generated route declarations. An earlier check encountered transient `/night` route declaration errors; no Night code was changed.
- Lint: passed with three existing unused-variable warnings outside the changed Gita files.
- Native debug/release unit tests: Gradle completed successfully, including completion policy checks. No APK task was run.
- Production export: Android, iOS and web succeeded. The final output is `/tmp/geeta-gita-export-final`.

The original update-depth trigger remains unconfirmed. Filtered logs from the connected Android device showed no React Native error, but the installed application does not establish validation of these source changes. On-device screenshot sequence, recovery playback, TalkBack and large-text layout verification remain pending. No APK was built, as instructed.
