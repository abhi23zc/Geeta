# Android alarm release checklist

The Morning Ritual alarm is a genuine user-configured alarm-clock feature. Before each Google Play release:

- Declare the app's exact-alarm use in Play Console. The app uses `SCHEDULE_EXACT_ALARM` and sends users to Android's **Alarms & reminders** settings when access is missing.
- Complete the foreground-service declaration for the `mediaPlayback` service type. The foreground service exists only while a user-configured alarm is audibly ringing and stops after the user completes the 1.5-second **Start my day** hold.
- Complete the full-screen-intent declaration and identify the app's alarm-clock purpose. On Android 14 and newer, users can revoke this access; the app then rings through an ongoing high-priority heads-up notification.
- Verify that the privacy policy describes local alarm configuration and that no alarm data leaves the device.

Device limitations to include in support material:

- Android does not deliver alarms while the user has force-stopped the app, or while the device is powered off.
- Some Xiaomi and other OEM builds may require **Auto-start** and **Unrestricted battery** settings if testing shows the system suppresses alarms. Do not request a blanket battery-optimization exemption.
- A consumer app cannot permanently disable Home, Power, emergency functions, or the notification shade. The alarm must keep ringing when the user leaves instead of using accessibility, overlay, or device-owner workarounds.
