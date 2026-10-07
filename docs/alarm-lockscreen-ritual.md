# Alarm ritual over the Android lock screen

Current scheduling, checkpoint recovery, audio-first completion, and Stop behaviour are described in [alarm reliability](alarm-reliability.md). Device results below are historical and do not certify the new recovery changes.

The real React wake, breathing, and Gita screens now use MainActivity, the single Expo Router host. Native alarm notifications target that activity. A native cover hides the previous page during startup or alarm restoration; it is removed only when the focused, expected ritual screen has rendered. AlarmActivity remains a native emergency fallback and never mounts another React root.

Private native presentation state in device-protected storage tracks wake/breathe/Gita independently of alarm audio. Holding Start my day stops playback, advances to breathing, and retains lock-screen window presentation. Gita completion/replay remains available. Unlocking is designed to keep the same mounted screen and progress; temporary background transitions preserve playback intent, while explicit pause remains paused. The completion screen follows the ordinary screen timeout; replay restores the awake flag. No new wake lock or permanent service is added.

Locked navigation permits only `alarm/wake`, `breathe`, and `gita`. Screen-layout gating suppresses unrelated content before it renders. Stack removal checks the destination, including back/pop/reset actions. Leaving the ritual or sharing requests Android authentication; cancellation retains the ritual. Exiting clears presentation window flags. Only native alarm delivery starts a session; an arbitrary app link cannot create one.

The config plugin reproduces MainActivity's native lifecycle hooks, retains incoming intent data, and sends warm alarm navigation through the mounted ritual guard instead of also dispatching Expo Router's linking event. This prevents duplicate navigation while retaining normal app deep links.

## Automated checks

- TypeScript: passed.
- Repository-wide ESLint: no errors or warnings after the production recheck.
- Six alarm navigation regressions and five presentation-policy/prebuild tests: passed; all seven repository test files pass.
- Native compilation, final release build, and seven native unit tests: passed.

Final APK: `android/app/build/outputs/apk/release/app-release.apk`.
SHA-256 after the production recheck: `23d444c90624587b8f33ad6ef786fa9aa7a3195cf7c97decfeb23dfdd55f22c4`.

## Device checks

Release builds of this change were checked on Xiaomi M2101K7BI / Android 13 on October 4, 2026. These results are partial device coverage, not certification of all alarm scenarios.

| Check | Result / evidence |
| --- | --- |
| Warm test delivery while securely locked | Passed. Separate test alarm delivered at 13:56:15 IST; native cover then `ritual_react_ready alarm/wake` at 13:56:15.902. Real React wake UI captured. |
| Hold Start my day while locked | Passed. Playback stopped at 13:56:21.598; real breathing screen ready at 13:56:22.192. No authentication required or activity finish. |
| Breathing through completion | Passed. Timer advanced to round 5/5 and the completion modal while keyguard remained secure and showing. |
| Continue to Gita while locked | Passed. `ritual_react_ready gita` at 13:58:45.542; secure keyguard still showing. |
| Gita completion and replay | Passed. Completion screen remained available; replay opened recitation/contemplation while locked. |
| Share authentication cancellation | Passed. Android credential presentation blocked screen capture; cancelling and closing Xiaomi's remaining lock-screen shade returned to the same Gita completion page. No share chooser appeared. |
| Cold React restoration after app update | Passed at 14:10:38 IST. New process 7307 logged one `Running "main"`, native cover at 14:10:38.043, then Gita ready at 14:10:38.932. Saved recurring alarm reconciled independently. |
| Ordinary background process termination | Recheck partially passed on the audited APK: Home then `am kill` produced no PID; the separate alarm subsequently displayed real React wake in fresh process 20102 at 14:47 IST. Hold was attempted after the test timeout, so this run does not certify the full locked transition. A timed repeat was interrupted by concurrent phone use and is not counted. No Force stop was substituted. |
| Unlock during breathing/recitation, successful exit authentication | Pending physical authentication by the device owner. Continuity code and destination policy are covered by review/automated checks, but this interaction is not claimed as device-tested. |
| Final device-protected storage safeguard | Native compilation/unit tests passed; reboot-before-first-unlock behavior remains untested. |

Other manufacturers, API 24–25 credential confirmation, permission-denial presentation, and activity recreation require additional device coverage. Android and OEM rules control automatic full-screen presentation; the alarm notification remains the entry point when automatic presentation is blocked. No Force stop or data clearing was used. Cold restoration restores the ritual stage; progress across process death is not claimed. The native alarm fallback remains available if React cannot render, while full breathing/Gita content requires React startup.

Current session-bound startup implementation and APK/device acceptance status: [2026-10-07 release validation](alarm-startup-release-validation.md).
