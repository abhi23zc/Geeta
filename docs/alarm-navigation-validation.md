# Alarm navigation startup regression

This records the earlier startup and unlock-handoff fixes. The native-primary presentation described here is superseded by [the full lock-screen ritual implementation](alarm-lockscreen-ritual.md), which preserves one React root and presents the real app ritual without requiring unlocking.

The native alarm activity previously mounted a second `main` React component alongside MainActivity. Expo Router SDK 57 keeps its imperative routing queue and navigation reference in shared module state. A second root could replace that reference while the first root still handled alarm events. Deferring `router.replace()` by one animation frame did not prevent the queue from flushing during another root's mount.

MainActivity now owns the single Expo Router root. AlarmActivity is an AppCompat native screen that presents the alarm immediately over the keyguard. Holding Start my day stops playback and opens the existing main activity at `/breathe?entry=alarm`. Android still controls unlocking. The React wake screen remains available within the main app.

On Xiaomi, restoring a killed task exposed a second issue: MainActivity received the breathing URL before JavaScript subscribed to linking events, but Android retained its previous setup intent. MainActivity now calls `setIntent()` before forwarding `onNewIntent()`, so React Native's initial URL also contains the current handoff. The `with-alarm-intents` config plugin preserves this behavior when Expo regenerates Android sources. This follows the Android initial-URL path in the installed SDK 57 Router and Linking sources; the versioned [Expo Linking documentation](https://docs.expo.dev/versions/v57.0.0/sdk/linking/) describes the initial URL API.

The in-app alarm guard mounts inside stack screens and dispatches to their own navigator. It checks current focus and the current route after the native playback read. Dismissal, backgrounding, blur, unmount, and newer checks invalidate stale results. No automatic alarm redirect enters Expo Router's global routing queue, and no animation-frame callback remains pending after unmount.

## Automated verification

- TypeScript project check: passed.
- ESLint for the changed navigation files: passed.
- Six navigation regression tests: passed (unmount, dismissal, out-of-order reads, focus changes, cold/resumed launch and duplicate prevention, native read failure).
- Android native unit tests: seven passed (five scheduling, two content-file checks).
- Android release APK build: passed, compile/target API 36 and minimum API 24.
- Intent config plugin: reproduces the generated MainActivity override and remains idempotent.

Run the navigation regression suite with `npm run test:alarm-navigation`.

## Device verification

Release testing on Xiaomi M2101K7BI, Android 13 / API 33, on 2026-10-04:

- Restored ringing state on app startup: wake screen opened without a navigation error; holding the React wake button opened the breathing flow.
- Test alarm after HOME and `am kill`: confirmed no process before delivery; AlarmReceiver restarted the process, playback started, the alarm notification appeared, and the isolated test stopped after its 30-second playback timeout.
- Foreground test alarm: native AlarmActivity appeared, holding for 1.5 seconds stopped playback and opened the breathing flow in the existing React root.
- Cold notification entry on the final release: confirmed no app process before delivery. AlarmReceiver restarted the process; tapping the notification opened native AlarmActivity. Logs recorded `hold_start`, `hold_complete`, `dismiss_complete`, and playback stop, followed by one `Running "main"`. The breathing screen appeared correctly and the native activity was destroyed. The initial run's stale setup URL is fixed.
- App-scoped ReactNativeJS and AndroidRuntime logs contained no navigation exceptions or native crash errors in these runs.
- After the final cold handoff, leaving the breathing flow returned to Home and the Today tab rendered successfully using normal Expo Router navigation.
- Saved recurring schedule remained enabled at its original time and weekdays. Only separate test alarms were scheduled; no Force stop or data clearing was used.

Xiaomi blocked the automatic activity launch while the app was closed in the unlocked-background test, despite Android full-screen permission. The notification remained usable and tapping it opened the native alarm. Manufacturer restrictions can still govern automatic presentation.

Other manufacturers and Android versions, locked-screen handoff, reboot, Doze, and permission-revocation scenarios were not re-tested for this navigation fix. Separate release device coverage remains necessary; these checks do not certify the entire app as error-free.

## Secure lock-screen dismissal follow-up

The user's locked Xiaomi run at 13:14 on 2026-10-04 exposed a gap in the unlocked smoke tests. Logs showed `hold_complete`, successful alarm stop, and native activity destruction, with the application process still alive and no crash. Android's window policy reported a secure, showing keyguard. Closing the lock-screen alarm before unlocking left the main activity hidden behind that keyguard.

The handoff now stops playback and retains the native screen while Android requests unlocking. It launches `/breathe?entry=alarm` and closes only after unlocking and a successful activity launch. Cancellation or failure retains an “Unlock to continue” retry button. Pending handoff survives activity-state restoration; a newly delivered alarm resets that state. Notification stop and test timeout finish only the native activity rather than removing the shared application task.

Android API 26+ uses [requestDismissKeyguard](https://developer.android.com/reference/android/app/KeyguardManager#requestDismissKeyguard(android.app.Activity,%20android.app.KeyguardManager.KeyguardDismissCallback)); API 24–25 uses credential confirmation or the non-secure keyguard flag. Android performs authentication; the app does not bypass a secure lock.

The updated release build and seven native unit tests passed, and the update was installed on the Xiaomi without clearing data. A separate test was scheduled and the phone was locked. At 13:24:56, logs recorded `hold_complete`, `dismiss_complete`, `morning_flow_unlock_requested`, and playback stop. At 13:24:58, `morning_flow_launched` followed unlocking; only then did native activity destruction occur. The breathing flow was visibly running at the end of the test. App-scoped logs contained no navigation exception or native crash error.

Unlock cancellation/retry, activity-state restoration, API 24–25 credential confirmation, and other manufacturers still require device coverage. The prior unlocked tests alone did not cover the secure-lock handoff.
