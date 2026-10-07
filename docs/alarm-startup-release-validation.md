# Alarm startup release validation — 2026-10-07

This report applies only to the session-bound handoff (`handoff=v2`) implemented in this worktree. Earlier phone observations do not certify this APK. Expo SDK 57's exact versioned reference was read before implementation: https://docs.expo.dev/versions/v57.0.0/.

## Automated evidence

The root Node suite passed (15 test files), TypeScript and Expo lint passed, and native debug/release unit tests passed (22 cases each, zero failures/errors/skips). The Firebase publication/security emulator suite passed with Android Studio's Java 25 runtime. Quiz structural validation passed (600 questions, 120 lessons, 30 cards); its existing 600-question editorial review gate remains pending and is outside this alarm change. Final-source Android/iOS/web exports passed (22 static routes on web). The final release Gradle build passed, including release lint checks.

The normal APK is [geeta-alarm-startup-release.apk](../dist/alarm-startup/geeta-alarm-startup-release.apk), with [checksum file](../dist/alarm-startup/geeta-alarm-startup-release.apk.sha256). Its SHA-256 is `4d1a230821e7121e7011439fea771963ba47129926316a7af30a2668aa08f4c9`; size is 166,521,380 bytes. APK v2 signature verification passed. Signing certificate SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, matching the installed phone APK. App ID is `com.anonymous.geeta`, version `1.0.0` / code 1; the release is non-debuggable. The APK contains a 5,766,412-byte Hermes JS bundle, the exact native wake animation, the existing offline Gita MP3 (matched byte-for-byte), and two fonts. Alarm sounds continue using the existing device/system or installed downloaded sound with system fallback; three new sound files are not introduced. The merged manifest marks the native fallback and Stop receiver direct-boot-aware. The normal build leaves the controlled-delay variable unset.

Commands include the complete root Node suite, TypeScript, Expo lint, native debug/release unit tests, all-platform export, release packaging, APK bundle/assets inspection, and APK signature verification. Regression cases cover duplicate loading/ready intents, stale identities, recreation, cover-before-ready publication, bounded recovery, single-flight retry preserving occurrence/phase, notification refresh policy, both layout/focus orders, lifecycle cancellation, language delays/failures/read-only provisional writes, and config-plugin idempotence.

## Phone acceptance

ADB initially returned an empty device list, then detected the Xiaomi over wireless ADB. Model is M2101K7BI, Android 13, MIUI V14.0.11.0.TKLINXM. The installed APK's signing certificate has been verified against the candidate. The user independently installed the previous corrected APK (SHA-256 `bba474bd0389894501b5d35a42089f543a605f14a73c308b78572fcac291bcab`), confirmed by hashing the installed base APK. They subsequently reported a blank launcher/resume screen. No update was installed by the agent and no app data was cleared. The user approved installation on this turn, and in-place updates succeeded, culminating in the frame-deferred restoration correction. No uninstall or data clear was performed. After user unlock, the final APK restored the saved breathing phase automatically; the previous APK does not certify this candidate.

| Scenario | Result |
| --- | --- |
| Model / ROM / Android version | M2101K7BI / MIUI V14.0.11.0.TKLINXM / Android 13 |
| React readiness within five seconds | Saved breathing: 1,485 ms after launch; 1,241 ms after ordinary background process termination. New alarm delivery still unverified. |
| Foreground/background/secure lock/screen-off delivery | Unverified |
| Offline delivery with Metro stopped | Unverified |
| Swipe-away and ordinary background process termination | Saved breathing restored after `am kill` (PID changed from 15576 to 16411); swipe-away and alarm delivery still unverified. |
| Repeated notification taps and ritual intents | Ready launcher duplicates retained the React screen without a cover; notification/ritual-intent scenarios still unverified. |
| Locked wake hold → breathing → Gita | Unverified |
| Unlock continuity / cancelled authentication | Unverified |
| Stop / timeout / checkpoint restoration / exactly-once points | Unverified |
| Language refresh without notification/activity loops | Unverified |
| Controlled recovery, late readiness, and explicit retry | Unverified |
| Reboot before first unlock / battery saver / Doze | Separately arranged; unverified |

Acceptance is incomplete until these required release-device observations are recorded. Installation as an in-place `adb install -r` update succeeded with user approval. Continue observations after user unlock, without uninstalling or clearing data. Record timings from `ritual_host_prepared`, `ritual_cover_attached`, `ritual_react_ready`, and `ritual_recovery`, plus visible screen observations and the APK hash. Investigate readiness over five seconds rather than weakening the handshake. Use the distinct diagnostic build described in [alarm reliability](alarm-reliability.md) for the recovery scenario.

The release uses the project's existing local test signing identity. It is a release-runtime APK, not a store-signed production release. Force stop, powered-off delivery, and universal OEM delivery are outside the guarantee.


## Reported render-error correction

The user supplied a debug-app screenshot showing `PreventRemoveProvider` rejecting an obsolete `index` route key from `AlarmNavigationGuard`. The guard now registers native removal prevention only after checking the live navigator at effect/event time, unregisters obsolete descriptors, and retains before-remove authentication checks for live locked routes. Regressions reproduce a route replacement between render and effect, plus replacement, unlock, cleanup, and live-route protection. TypeScript, lint, and the complete root suite pass. The corrected release artifact and packaging evidence replace the earlier candidate; installation is now approved and completed; remaining alarm-delivery acceptance scenarios still require observation.


## Reported blank-screen resume correction

The installed previous APK fingerprint matched the artifact above before replacement. During inspection, its native view hierarchy contained a React screen with an empty content wrapper. No current-process JavaScript crash was captured. Code inspection identified a restoration race consistent with the observation: the guard could render no children for a saved phase, attempt replacement before focus, and never retry on focus/foreground for breathing/Gita because the separate playback guard only handles a ringing wake alarm. This is a diagnosed code defect and a plausible explanation for the phone symptom, not an observed reproduction proving the exact persisted stage.

Restoration now uses fresh presentation state on focus, navigation state events, and foreground return; it verifies route ownership and deduplicates replacement. While restoration is blocked, translated preparation/retry controls replace the empty page. The placeholder cannot satisfy the readiness handshake or award points. Eight new regressions cover delayed focus, foreground return without ringing playback, phase/ended-session changes, obsolete/disposed routes, ordinary unlocked use, and explicit retry after an unavailable navigator. The complete 15-file root suite, TypeScript, lint, and all-platform production exports pass. Release packaging results are recorded above. Reopening after ordinary use, alarm Stop/test timeout, saved breathing/Gita, and background process termination remain to be observed on the updated phone build.


## Approved update installation

The user explicitly requested phone installation. `adb install -r` returned Success for the resume fix, followed by the final release with bounded route/focus diagnostics. The normal build has no controlled readiness delay. Native debug/release unit tests, TypeScript, lint, and the complete root suite passed again after this small diagnostic extension. The package opened through the launcher intent, but inspection found keyguard showing, AOD showing, and power wakefulness Dozing; foreground restoration therefore remains unverified. The user was asked to unlock and leave the app open; subsequent unlocked observations are recorded below. No authentication bypass, Force stop, data reset, alarm completion, or point-awarding action was performed. Native package replacement reconciliation retained the existing scheduled occurrence.


## Release-phone reproduction after unlock

The intermediate release `0a623d0eb61e75adeebdc1f3cd709c0363b8bbdd6bee1c9ff2a0022d712921c2` was confirmed installed. Once unlocked, the phone reproduced blocked restoration: diagnostics reported index focused/owned/foreground true, saved stage breathe, status loading. Initial direct dispatch had not changed the route. The explicit Try again control restored breathe, and native `ritual_react_ready` accepted readiness with cover=0 and loading=false; elapsed 35,651 ms includes time awaiting manual retry, so that intermediate build failed the five-second startup target.

The final correction defers restoration by one animation frame, rechecking the live target and route ownership after navigator effects register. Two additional regressions cover parent effect registration and pending-frame cancellation. Final-source checks and APK/phone results below supersede the intermediate artifact; other alarm acceptance scenarios remain unverified.


## Earlier installed release: observed resume results (before Get Ready preference)

The final installed base APK SHA-256 matched `629059c4035409458eb99078643256d9e967bca69df2f68ade77dcc02793831f`. On the unlocked Xiaomi, a fresh host automatically restored the saved breathing route and acknowledged readiness after 1,485 ms, with status ready/loading=false. A foreground screenshot confirmed the existing paused breathing screen, Resume/Restart controls, round 1/5, and retained elapsed 0:07/1:10; no native cover or preparation placeholder remained. No Try again tap was used on this final build.

Home/background followed by launcher reopening kept the same ready host and screen; native diagnostics recorded a ready duplicate without cover attachment. Ordinary background process termination via `am kill` removed PID 15576 (not Force stop); launcher reopening created PID 16411 and automatically restored the saved phase with accepted readiness after 1,241 ms. A second screenshot confirmed the restored paused screen. [Screenshot](../dist/alarm-startup/validation/restored-breathing.png) and [app-only diagnostics](../dist/alarm-startup/validation/resume-diagnostics.txt) are retained with the artifact.

Final-source TypeScript, lint, all 15 root test files, Android/iOS/web exports, native debug/release unit tests (22 each), release packaging, signature, JS bundle, offline MP3, wake animation, and font checks passed. Metro was not serving the phone. The phone remained network connected, so these observations are not an offline-delivery test. Full-screen locked alarm delivery, wake hold through Gita, notifications/Stop, controlled recovery, rewards, reboot, battery saver, and Doze remain unverified for this APK. The observed blank/resume path passes; full alarm acceptance remains incomplete.


## Updated preference: unfinished breathing starts fresh

The user superseded paused breathing recovery: unfinished breathing must open through Get Ready and must not show Resume or Restart controls. New mounts with partial checkpoints and returns from blur/background reset preparation to three seconds and elapsed progress to zero, starting automatically once focused and foregrounded. Completed breathing retains Continue to Gita. The Resume/Pause/Restart row and the completion modal replay button are removed. Gita recovery, occurrence identity, and reward rules are unchanged. Legacy checkpoint records remain readable; no storage migration/reset is performed. Timer callbacks check live lifecycle and preparation generation so cancelled work cannot skip the new countdown or add practice time.

TypeScript, lint, all 15 root test files (including fresh-start and completed-checkpoint regressions), release build, signature, bundled JS/offline assets checks passed. Phone observations for this updated preference follow below. Earlier paused-screen screenshots certify the prior resume correction only.


### Get Ready preference update: installed-device evidence — 2026-10-08

The installed base APK SHA-256 matched `4d1a230821e7121e7011439fea771963ba47129926316a7af30a2668aa08f4c9`. The existing app ID/signing identity was retained and installation used `adb install -r`, preserving app data. Native readiness for the saved breathing route was accepted after 1,549 ms with loading=false. All-platform production exports passed after this final-source change. Native sources were unchanged from the previously passing 22-case debug/release checks.

The three-second countdown elapsed and breathing completed automatically while artifact verification was in progress. The subsequent screenshot therefore verifies the completion screen with only Continue to Gita and no replay/Resume/Restart controls; it does not visually certify the initial countdown frame. Background/reopen at that point correctly retained completed breathing. Fresh partial-checkpoint entry is covered by the automated policy regression, and background/blur reset uses that same fresh state plus cancelled preparation generations. No practice-start, reward, or Continue control was tapped by the agent during this update's verification.

[Completion screenshot](../dist/alarm-startup/validation/breathing-complete-no-restart.png) and [readiness diagnostics](../dist/alarm-startup/validation/get-ready-diagnostics.txt) are retained. A frame-level device capture of incomplete breathing returning through Get Ready remains unverified; full locked-alarm acceptance scenarios remain unverified as listed above. Earlier paused-progress recovery observations do not describe the user's updated breathing preference.
