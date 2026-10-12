# Main-screen performance review — 2026-10-10

## Outcome and limits

Reviewed Home, Today, Quiz and Daily Goal, plus reading/audio, breathing, alarm setup/help, saved teachings, quiz collection/saved/history, downloads and shared chrome. Implemented concrete improvements below. No APK was assembled or installed. Source inspection, regression tests and production JS exports do not establish zero lag or post-change Android frame performance.

A connected Xiaomi M2101K7BI supplied short native frame samples of the installed app. For each main tab, navigate, allow one second to settle, reset `dumpsys gfxinfo` counters, scroll down and up (350 ms each), then read counters. Returned to Home afterward. No alarm, quiz result, task or reward data was changed. Source revision of the installed app was not verified, so these samples are baseline observations, not a before/after comparison. These samples exclude cold navigation and do not measure the JS thread independently.

| Screen | Rendered frames | Android-reported janky frames | P95 frame time | P99 frame time |
| --- | ---: | ---: | ---: | ---: |
| Home | 65 | 0 / 0.00% | 24 ms | 27 ms |
| Today | 67 | 0 / 0.00% | 18 ms | 19 ms |
| Quiz | 68 | 4 / 5.88% | 28 ms | 129 ms |
| Daily Goal | 59 | 5 / 8.47% | 133 ms | 450 ms |

Daily Goal and Quiz need longer device profiling after the updated source is installed. A two-swipe sample with zero reported dropped frames does not establish universally smooth behavior. Historical aggregate counters also included other screens and settings visits, and were not treated as per-screen results.

## Changes

- Shared decorative motion now requires screen focus, foreground state and a loaded accessibility preference. Aru WebP playback is explicitly started/stopped; mascot float/glow, diya, chakra, coin, badge and reading aura animations stop when hidden. Reanimated animations cancel on cleanup. Diya aura loops run only when the aura is displayed. Mascot decorative native animations do not hold an interaction handle that can defer list work.
- Native AppState/accessibility subscriptions are shared across tree and decorative components. Late accessibility reads cannot publish after teardown or override a newer preference event.
- Audio spectrum bars animate transforms instead of height, avoiding repeated layout work. Home tiles retain transform feedback with fixed shadows.
- Card tilt yields to vertical scroll gestures, follows pointer values directly, and resets after completion or cancellation.
- Number formatters are reused per locale. Date formatters use a bounded cache of 32 option combinations. Language, timezone and formatting outputs are preserved. This removes repeated Intl constructor work in calendar and point displays.
- Saved teaching text uses a FlatList with three initial rows, batches of three and a window of five. Quiz collection topic completion counts are calculated once per data change; saved quiz filtering uses a Set. Points history copies/reverses only the visible tail.
- Home refreshes native alarm status on focus rather than doing hidden-screen foreground refreshes. Alarm weekdays display in calendar order.

## Screen-specific audit

| Area | Findings and handling |
| --- | --- |
| Home | Clear primary ritual/quiz actions; fixed dock remains scroll-independent. Decorative work stopped offscreen; alarm status refreshes on return; weekdays ordered. |
| Today | Already uses SectionList with bounded render batches and memoized task rows. Shared mascot lifecycle fixed. Editing and task persistence retained. |
| Quiz | Existing lists use FlatList; answer options and player counts are bounded. Collection no longer scans every lesson for every row. Saved lookup avoids nested membership scans. |
| Daily Goal | Month calendar and milestone cards are bounded; point history is paginated. Reduced Intl allocations and background animation work. Tree playback already has a single-player lease, focus gating and posters. Device sample still identifies this as the largest remaining profiling target. |
| Reading/audio | Playback watchdog/checkpoints and interruption safeguards retained. Reading aura and mascot stop offscreen; decorative changes do not pause or rewrite playback state. |
| Breathing | Practice and preparation clocks already gate on focus/foreground and clean up timers. Completion checkpoints were left intact. |
| Alarm setup/help | Shared permission walkthrough, stable progress and local help cursor retained. Native verification and alarm-priority navigation retained. |
| Saved/downloads | Long saved text now virtualized. Downloads has a bounded date window. Replay cancellation and offline storage behavior retained. |

## Verification and remaining acceptance

Regression coverage includes shared subscriptions, late callback cancellation, reduce-motion/focus/foreground gating, localized formatter parity, and existing alarm/playback/progress/storage tests. Run the complete JavaScript suite, TypeScript, lint and Android/iOS/web exports. Device acceptance still requires repeat navigation, cold/warm launches, long saved lists, TalkBack/large text, low-memory devices, and longer frame/JS profiling of the updated app. No performance guarantee is claimed from the screenshot or code checks alone.

References: [React Native performance guidance](https://reactnative.dev/docs/performance), [Expo SDK 57 Image API](https://docs.expo.dev/versions/v57.0.0/sdk/image/).

Completed checks: all 26 JavaScript test files passed, TypeScript passed, lint passed, Android/iOS/web exports succeeded, and `git diff --check` passed. Native bridge/manifest files were not changed by this performance pass. The device samples above were taken before source validation; updated-build frame comparison and full real-device accessibility acceptance remain outstanding.
