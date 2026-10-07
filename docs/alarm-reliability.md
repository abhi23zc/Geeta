# Alarm reliability and ritual recovery

This implementation keeps the existing single React host, Android alarm module, three awakening sounds, and Wake → Breathing → Gita flow. Existing alarm configuration, quiz history, language preferences, and shared points storage are not reset. The runtime rules use Expo SDK 57.

## Scheduling and delivery

Native configuration and reconciliation are serialized with the scheduler. Device-protected scheduling metadata records the configuration revision and next occurrence only after Android accepts `setAlarmClock`. Home reads one native snapshot and distinguishes disabled, missing access, failed, unknown, and successfully scheduled states. A successful record is evidence of scheduling, not certification of future delivery on every ROM.

An unchanged future occurrence is reused. Boot, update, timezone/time changes, and exact-access grant force re-registration. Required access remains notifications, a High importance channel, and exact alarms. Full-screen access and manufacturer settings remain separate. The system's upcoming-alarm affordance opens setup, not a fabricated wake session.

Test alarms keep separate identifiers, use system audio, expire after 30 seconds, and never award ritual points or change recurring configuration. Regular downloaded sound falls back to system audio. Stop requests, service-start revisions, hold timers, and test timeouts are occurrence-bound; stale work cannot dismiss a newer alarm. Notification Stop and test timeout end the wake session and clear lock-screen window flags. Home remains behind the normal keyguard if the phone is locked.

## Checkpoints and completion

An additive device-protected session record identifies the delivered occurrence. Separate version-1 checkpoints store breathing preparation/elapsed progress and a frozen Gita content snapshot, listening position/evidence, reading confirmation, and completion. Writes are serialized and validated against the active session and stage, bounded to 64 KiB, and saved every five seconds plus lifecycle/transition boundaries. Sudden process death can lose the latest few seconds; background time never adds progress. Unfinished breathing returns to the full three-second Get Ready countdown at zero elapsed time after reopening, blur, or backgrounding, and starts automatically. Breathing Resume/Pause/Restart controls are removed, including the completion modal replay control, per the user’s updated preference. Completed breathing still offers Continue to Gita. Restored incomplete Gita remains paused until Resume is selected.

An older active presentation receives a session ID on launch without fabricating progress. Missing/corrupt checkpoints restart the recorded phase without resetting alarm or points data. A corrupt-record warning can be acknowledged with retry. An active frozen recording is protected from ordinary cache cleanup and clear downloads; it becomes eligible for cleanup once the session ends.

Native stage transitions cannot skip breathing or regress from Gita to breathing. The loading cover resumes the current stage. Hold timers are cancelled on release, blur, background, lost window focus, unmount, Stop, and occurrence replacement.

Gita completion is enabled after contiguous foreground playback reaches the reviewed narration boundary. Seeking, restored position alone, pauses, and background gaps do not certify listening. Missing/invalid narration offers explicit reading confirmation. Load/playback errors or 15 seconds without loading/playback progress expose Retry and a reading fallback. The checkbox requires the user to confirm reading and reflection; neither a fallback nor audio ending automatically completes the practice.

The completion handler persists evidence before creating a native reward receipt. A failed shared-points refresh shows “Practice completed; points pending” with retry. Source receipts survive failure and existing daily deduplication prevents repeat awards. Ritual +10, quiz +10, combined streaks, deduction rules, and milestones are unchanged. The existing same-calendar-day ritual eligibility rule remains in effect across midnight.

All recovery, playback, completion, and pending-points messages have English, Hindi, and Hinglish copy. This is offline/local recovery, not cross-device sync or proof against a modified application.

## Verification and device acceptance

Run `npm run test:alarm-navigation`, `node --test tests/*.test.mjs`, `npx tsc --noEmit`, `npm run lint`, native `:morning-alarm:testDebugUnitTest`, all-platform Expo export, and `:app:assembleRelease`. Native policy tests cover scheduling reuse, stale stops, phase order, completion evidence, and system test sound selection. Content-cache tests cover interrupted-session recording retention. Config-plugin tests verify MainActivity transformation idempotence.

Automated checks do not replace release device acceptance. For the newly changed runtime, mark the following pending until observed and recorded with model, Android/ROM, APK hash, diagnostics, and result:

- Foreground/background/locked delivery and ordinary background process termination (not Force stop).
- Holding Start my day, breathing through completion, full narration, reading fallback, replay, and reward retry.
- Notification Stop and test timeout while React wake is visible; newer alarm delivery during a pending hold/stop.
- Process death during preparation, breathing, paused narration, playback, and Gita completion, then restoration.
- Exact/notification/channel access revoked and restored, full-screen access denied, audio missing or damaged.
- Unlock continuity, cancelled exit/share authentication, large text and screen reader behaviour.
- Arranged reboot-before-unlock, clock/timezone, Doze and battery-saver tests; API 24–25 and other manufacturers.

Historical device checks in the older validation documents do not certify these changes. No alarm is promised while powered off or force-stopped. Store publication still requires production signing; the local release configuration uses the existing test key.

## Session-bound React startup handoff (v2)

`AlarmPresentation` owns transient `loading`, `ready`, `recovery`, and `inactive` states on Android's main thread. Readiness is never saved in preferences. Each acknowledgment binds the saved occurrence/session and expected stage to a host generation and cover generation. Host recreation and real phase changes invalidate readiness. A ready duplicate keeps React visible; a loading/recovery duplicate keeps the same cover and deadline. The native cover is removed before publishing `ready` and `loading=false`. Route-only legacy readiness methods provide diagnostics and cannot remove it.

The synchronous `getAlarmStartupState()` bridge reads an immutable presentation snapshot, valid ritual-entry flag, user-unlock availability, and device-protected language. It does not wait on Android's UI thread. `AlarmNavigationGuard` is the sole acknowledgment owner: unblocked content must have non-zero layout, a focused route, foreground app state, and a current matching identity. One animation frame rechecks these conditions. Blur, background, Stop, replacement, and unmount cancel pending work. Successful acknowledgment is deduplicated; no readiness polling or competing deep-link dispatch is added. Wake layout diagnostics remain diagnostic only.

Initial notification delivery can include the automatic full-screen intent. Genuine content/language updates retain the explicit notification tap and occurrence-bound Stop action but omit automatic full-screen launch. An already-saved, unchanged native language causes no preference write, cover refresh, or notification post. Pending genuine notification refreshes are coalesced. Playback, recurrence, phase, and test timeout are untouched.

A valid alarm entry mounts the existing navigator immediately with native language, while normal preferences and stores hydrate asynchronously. The decision is latched for the provider lifetime. Successful hydration updates language without remounting navigation. Provisional choices cannot write preferences. Existing preferences are never rewritten by the provisional choice; failed reads retain usable alarm content and expose a language retry after the ritual ends. Ordinary startup retains its migration/retry gate.

One monotonic ten-second loading deadline keeps the native cover visible if React fails to acknowledge. Recovery explains the failure and shows a translated, minimum 48-dp Try again button; native hold dismissal and notification Stop remain usable. Late valid readiness succeeds normally. Retry is single-flight and user initiated, recreating the React activity (or opening it from native fallback) with the same saved session and phase. It does not restart sound, schedule an occurrence, advance a phase, or call reward completion. Existing checkpoint rules apply; unfinished breathing now starts fresh through Get Ready per the user’s updated preference, while Gita keeps its paused recovery.

Before first unlock, delivery explicitly chooses the direct-boot-aware native `AlarmActivity`, with device-protected presentation/language only. React storage hydration is not mounted there. After the device has been unlocked, explicit Continue opens the saved phase. No forced unlock or automatic ritual dismissal is added.

Local diagnostics retain at most 100 entries. They include `handoff=v2`, app version/debug flag, host/cover decisions, readiness acceptance/rejection, monotonic loading duration, deadline/retry, notification purpose, and unchanged-language skips. They exclude content, reflections, answers, and storage dumps.

For controlled release recovery testing, build a **separate diagnostic APK** with `EXPO_PUBLIC_ALARM_STARTUP_DELAY_MS=15000`. This build-time, bounded (maximum 20 seconds) readiness gate uses one monotonic timer per JS runtime and never changes navigation or completion rules. Verify recovery at ten seconds, late acknowledgment, and an explicit retry. Reinstall the normal APK afterward; record both hashes. The delivered normal APK must have this variable unset. A runtime reused by activity recreation has already consumed the delay; a genuinely restarted runtime gets a new delay. This tests the safety-cover deadline, not every possible JavaScript crash.


Route removal protection also checks live navigator membership at effect/event time. Native-stack can briefly retain an outgoing screen descriptor after replacement; registering its obsolete key causes SDK 57's “Couldn't find a route with the key” error. Obsolete and preloaded descriptors are not registered. Live locked routes still register with the native-stack prevention context and retain the existing before-remove authentication/ritual-destination checks. State changes and cleanup unregister protection; render-time route membership is not treated as authoritative.


Saved-phase route restoration rechecks live presentation state on route focus, navigation state events, and foreground return. It does not depend on alarm playback still ringing: saved breathing/Gita phases can restore after the sound has stopped. A focus event arriving after the initial render can therefore finish restoration without a new native presentation event. Dispatch waits one animation frame for parent navigator effects to register and rechecks the current target, focus, and ownership before acting. Blur, backgrounding, unmount, and phase/session replacement cancel pending frames. Only focused routes still owned by the navigator can dispatch; successful dispatches are deduplicated, and blur/background/disposal invalidate pending work. Blocked content shows a translated preparation message and a minimum 48-dp route retry control rather than an empty page. This placeholder cannot acknowledge ritual readiness, dismiss playback, advance phases, or award points.

Bounded `ritual_navigation` diagnostics record only recognized route names, focused-route membership, foreground/focus flags, and native stage/status/loading. Reports are deduplicated and capped per controller, with the existing 100-entry native log limit.
