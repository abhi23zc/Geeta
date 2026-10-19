# Seeking and streaming reliability

Implemented against Expo SDK 57 and Media3 1.9.0. No APK was assembled or installed for this change.

## Behavior

- Seek requests retain an optimistic target until confirmed. Rapid requests coalesce, and repeated 15-second taps accumulate from the latest target. Stale progress cannot move the thumb backward during a pending seek.
- The full-player rail uses window coordinates, including touches on decorative children. Fill and thumb interpolate between 250 ms transport updates; interpolation stops during dragging, seeking, buffering, pause, and reduced motion. Android exposes buffered progress.
- Android recovery reloads the current item at the requested or last confirmed position without replacing its logical queue. Queue history, repeat, shuffle, speed, and timer remain intact. Source-resolution failures before a queue commit still retry queue installation.
- iOS/web keep the loaded player on pause/resume. Native seek commands serialize until completion, with superseded targets discarded. Pause/interruption cancels automatic resumption during retry.
- Seek confirmation and playback-progress watchdogs use a 15-second limit and show a recoverable error while retaining position. Verification failures require explicit user repair/retry; there is no new unbounded automatic retry loop.
- Android retains Media3's built-in transport retry policy. Debug logs include seek target, actual position, elapsed time, and native error code; they exclude URLs.

## Sources and storage

The bundled MP3 contains an Info header at byte 13331. Frame inspection found one 64 kbps metadata frame followed by 2457 constant 128 kbps MPEG1 Layer III audio frames. Constant-bitrate seeking is enabled only for this known bundled asset. Audio bytes, timing, and catalog checksums are unchanged. Other files retain Media3's indexed/default extractors; unseekable sources disable the rail.

HTTPS sources use a process-wide 128 MiB LRU Media3 cache, keyed by the catalog asset hash when supplied. It stores requested byte ranges. Full-song acquisition now additionally uses those ranges to create complete verified copies; see music-offline-playback.md. Cache setup failure falls back to upstream, and runtime cache errors use Media3's ignore-cache-on-error flag. Bundled and verified local files bypass streaming caching. User downloads and their integrity checks remain separate.

## Validation

- Music suite: 59 tests, including retry position retention, stale progress, rapid and already-dispatched seeks, paused seeking, retained player identity, stall recovery, and pause during source resolution.
- TypeScript and targeted ESLint checks.
- Kotlin compilation and native unit tests, including seek confirmation while buffering and at the recording end.
- Android instrumentation sources compile. The added range-cache test verifies exact partial bytes and reuse with an offline upstream; it has not run on a device.

## Device acceptance remaining

A separately authorized native build is required to load the Kotlin changes. On Xiaomi M2101K7BI, test bundled, downloaded, and remote recordings at multiple positions, repeated skip taps, rapid direction changes, paused seeking, the final second, notification controls, screen lock, and alarm/call/headset interruptions. Target immediate visual feedback and local audible seeking within 500 ms; no device latency claim is made yet.

Test remote audio under throttling, disconnection/reconnection, and warm/cold cache. Verify each production URL responds correctly to a nonzero Range request (206 with matching Content-Range and payload); production server behavior has not been verified here. Network seek latency depends on range support and connectivity. iOS/web use their platform buffering; a buffered-position value is not fabricated where expo-audio does not expose it.
