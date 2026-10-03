# Android alarm compatibility

Android is the supported alarm platform. Expo SDK 57 targets API 36 and supports API 24+ (Android 7). The alarm module and app enable core library desugaring so `java.time` works on API 24–25. `plugins/with-alarm-desugaring.js` preserves this configuration on prebuild.

Required: notifications, a High importance alarm channel, and exact alarm access. Full-screen access is optional; Android decides whether to display a full-screen intent. Background restriction and battery exemption are separate inspectable values. Manufacturer settings are advisory and only marked User confirmed after individual confirmation. Opening Settings never changes readiness by itself.

Enabled configurations remain saved when required access is missing. Capability checks and foreground return reconcile scheduling; boot, update, time changes, and exact-access grant use the recovery receiver. A test is scheduled 30 seconds ahead with request IDs 6111/6112, distinct from recurring IDs 6101/6102. It uses local system alarm audio, stops after 30 seconds, and does not alter the saved configuration. Regular alarms continue until stopped, as before; the partial wake lock is bounded to 10 minutes. The foreground service runs only while an alarm is active. Diagnostics keep the latest 100 local entries and are available through `getLaunchDiagnostics()`.

## Release device matrix

No brand is certified from compilation or unit tests. Record model, Android version, ROM version, APK, outcome, and diagnostic timestamps for each run.

| Brand | Required coverage | Status |
| --- | --- | --- |
| Xiaomi / Redmi / POCO | Release runtime | Pending |
| Samsung | Release runtime | Untested; hardware unavailable |
| Pixel / generic | Release runtime and API 24–25 minimum | Untested; hardware unavailable |
| Oppo / Realme / OnePlus | At least one release device | Untested; hardware unavailable |
| Vivo / iQOO | At least one release device | Untested; hardware unavailable |
| Huawei / Honor | Guidance and fallback | Untested; hardware unavailable |

## Manual acceptance checks

For each available release device:

1. Fresh install: deny notifications and exact access. Saving retains the configuration and reports Needs action without scheduling the reliable path.
2. Grant required access and return from Settings. Verify automatic recurrence recovery. Revoke each required access, return, and verify saved settings remain. Restore and verify recovery.
3. Deny Android 14+ full-screen access. Verify the alarm notification remains usable, opens the native wake screen, and Stop ends playback. Restoring access does not imply guaranteed full-screen presentation.
4. Check background restriction and battery exemption independently. Confirm each phone setting separately; reopen setup and verify confirmations persist under the appropriate profile.
5. Test known manufacturer destinations, plus ROMs where components are missing, unexported, or blocked. Verify app details or Android settings opens and the UI reports the actual fallback with manual guidance.
6. Save an enabled alarm, run the short test, stop it, and verify the saved configuration and next recurring occurrence are unchanged. Repeat with a disabled saved alarm and with no saved alarm.
7. Test locked screen, normal app closure, background process termination, battery saver, and Doze. Check receiver, playback, notification, and activity diagnostics. Do not simulate ordinary closure with `am force-stop`.
8. Test reboot (including before unlock), app update, timezone change, and manual clock change. Verify the next selected weekday at the saved local time.
9. Force stop separately: no alarm is promised until the app is reopened. No alarm is promised while the phone is powered off. Do not reboot or alter clock, Doze, or permission state on a personal phone without arranging a test session.

References: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Android alarms](https://developer.android.com/develop/background-work/services/alarms), [full-screen limits](https://source.android.com/docs/core/permissions/fsi-limits), [Doze guidance](https://developer.android.com/training/monitoring-device-state/doze-standby).
