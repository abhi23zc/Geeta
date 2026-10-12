# Alarm delivery repair — 2026-10-12

Implementation is ready for release/device validation. Delivery is **not yet certified**. No APK was built or installed in this session, and no phone tests were run. Historical device/APK results in other documents do not apply to this repair.

The supplied plan incorrectly called removal reason `8` a rendering error. Android defines `8` as specific-notification app cancellation; inflation error is `4` ([Android reason constants](https://developer.android.com/reference/android/service/notification/NotificationListenerService#REASON_APP_CANCEL)). Dedicated icons remain appropriate, but the phone evidence below identifies a different cancellation path.

## Read-only Redmi diagnosis after the user reported another failure

The connected Redmi M2101K7BI runs Android 13. Installed package `com.zrf.aarambh`, version 1.0.0/code 1, is DEBUGGABLE, updated 2026-10-12 14:33:10 IST. The installed APK was copied for local inspection; SHA-256: `ef5bebb5fa6172747b46b32882deef2c08717a3476597198bec7eb4ee9699d00`. It includes the new delivery-monitor code; the earlier assumption that the phone still ran the old code was incorrect. This session did not build/install that artifact.

Notification, exact-alarm and full-screen permissions are granted. The existing alarm channel has importance 4. MIUI background/lock-screen app operations 10020/10021 are allowed. System UI records `com.zrf.aarambh_ongoing=false`.

For occurrence `1791796140000` (14:39 IST), the receiver/service ran and attempted the full-screen notification. MIUI logged `filter out ongoing notif: 0|com.zrf.aarambh|6420|null|10329`, and the events buffer recorded cancellation reason 8 at 14:39:00.264. The minimal retry was cancelled through the same path at 14:39:00.743. Playback began at 14:39:00.507; the service stopped it at 14:39:01.253 after both presence checks failed. This explains the user's brief vibration and inaudible gradual-volume startup. No wake-activity preparation was observed for this occurrence.

Inspection of the phone's installed MiuiSystemUI APK confirms `NotificationFilterController`: notifications with `FLAG_ONGOING_EVENT` are cancelled via `NotificationSettingsHelper.cancelNotification` when `canShowOngoing(package)` is false (except exempt/media cases). This is MIUI's permanent-notification preference, separate from Android notification permission and channel importance.

Immediate device remedy: enable Permanent notifications / Allow permanent notifications under Settings → Notifications & Control centre → App notifications → Aarambh. No replacement channel or notification-filter bypass is introduced. Alarm help now includes a separate translated manual review page for this switch, opens the app notification settings, and does not claim Android can verify the OEM preference. Onboarding remains skippable. Setting restoration and subsequent delivery are **not yet verified**; no setting was changed and no alarm was triggered by this diagnostic session.

## Implemented behavior

- `AlarmNotification` owns the existing `morning-ritual-native-alarm-v3` channel and one builder for initial delivery, recovery and language changes. White vector notification/Stop drawables are independent of launcher artwork, live in the autolinked native module, and have resource-shrinker keep rules. The notification ID remains `6420`. Channel recreation respects Android's saved user preferences.
- Required access: notification permission, exact alarms, and an enabled channel (importance above NONE, with an unblocked channel group). High importance, full-screen eligibility, battery and OEM settings remain recommendations. Older native responses derive channel-enabled status from importance.
- Native scheduling/test/reconciliation and JS onboarding scheduling, Save Alarm and Home use the same requirements. Missing access retains configuration and reports Saved—needs setup. The channel walkthrough remains optional and Set up later remains available. Save/Home offer blocked-channel Settings actions. Full-screen availability is advisory, separately described from scheduling, in English, Hindi and Hinglish.
- Immutable explicit activity and Stop broadcast intents carry occurrence identity. Old activity intents cannot open a newer ritual; old Stop actions cannot dismiss it. Duplicate starts are ignored even if audio loading failed. Recovery preserves the occurrence and gradual-volume start time, and does not repeat automatic screen launches.
- Presence is checked at 500 ms, 1.5 seconds and every five seconds. Missing delivery retries once using the minimal builder, with no full-screen launch. Retry state survives service/process recreation for that occurrence. Continued absence stops playback/vibration and ends the ritual, retaining recurrence and a Home failure report until a later test confirms notification presence. Unknown presence is logged separately. Presence is not proof of on-screen visibility.
- Callbacks are bound to occurrence and service generation, and cancelled on cleanup. Diagnostics include build/package/version/update time, attempts, presence, launch skip/attempt/request, actual activity focus, existing generation-bound React acknowledgement, and termination. The existing 100-event diagnostic buffer is preserved.
- The loading cover now offers native Stop alongside the existing Start my day path and recovery deadline. Existing transition/checkpoint/reward logic is retained. Legacy alarm migration cancels only recorded legacy alarm request IDs, preserving unrelated scheduled reminders.

## Verification in this session

- App TypeScript and scoped ESLint pass.
- 34 native debug unit tests pass, including enabled-channel policy, one-retry/failure decisions and stale/stopped callback rejection. Main Kotlin code and native resources compile through that task. No APK assembly task was run.
- All 14 focused alarm/onboarding/navigation/recovery/language/notification test files pass. The wider run also passed reading/playback, saved replay, cache/download contracts, quizzes, tasks and progress tests.
- Unrelated existing failure: `tests/admin-editor.test.mjs` has two failures with `TypeError: Cannot read properties of undefined (reading 'props')` at lines 25 and 32. The editor and its tests were not changed by this repair.
- Instrumentation test source compilation passes; no test APK was assembled.
- Instrumentation cases cover resource loading, full/minimal notification construction, activity/broadcast PendingIntents and native Stop/Start controls without React. Execution is pending an authorized isolated emulator/device installation. Their synthetic-session cases should run on a disposable test installation, not a personal installation with an active ritual.

## Authorized release acceptance still required

Before reproduction, identify the installed package, version/code, debug/release type, update time and APK path. Preserve diagnostic events and correlate logs by occurrence. After explicit APK-build authorization, build the release artifact, record SHA-256, and install that exact signed artifact as an update without clearing app data. Preserve package/signing identity and launcher artwork.

Capture complete logcat (including System UI/notification service/MorningAlarm), notification dumps and occurrence diagnostics before/during/after the controlled test. Record whether notification removal precedes activity preparation, and retain the actual rendering stack trace if Android supplies it. A successful startActivity request is not display evidence; use focus/React acknowledgement plus direct observation.

On the Redmi, require three consecutive successes in each of foreground, background, locked screen and ordinary process termination. For each, record notification persistence, screen display where permitted, native/React Stop, Start my day, Breathing, Gita completion and exactly one reward/next recurrence. Separately test blocked versus low-importance channel, full-screen denial, permission restoration, missing downloaded tone, delayed/failed React startup, duplicate intents, service/process recovery, stale controls and simulated notification removal. Verify a failed retry ends sound and reports the failure on Home.

Reboot/pre-unlock, battery saver/Doze, timezone/clock changes and app update require an arranged test session. Check API 24–36 on available emulators, then Pixel/Samsung/other manufacturers separately. Currently none of these hardware or emulator acceptance cases has been run for this repair. Never transfer historical hardware passes to this artifact.

Run manual app regressions for reading, quizzes, saved content, downloads/offline audio, tasks, progress and owner-push routing during and outside active rituals. Automated tests do not replace these device regressions. The repair is complete only after the selected release artifact passes Redmi acceptance and these regressions, with unavailable coverage recorded. Android still cannot promise delivery for a force-stopped app or powered-off phone, or automatic screen display when screen-launch access is denied.
