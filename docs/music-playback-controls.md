# Playback and Android media controls

Implemented 2026-10-19. Following subsequent explicit user authorization, the updated debug APK was built and installed on the connected Xiaomi phone. The device results below supersede the earlier no-build status.

## Behavior

- Library and featured track actions resume the selected recording or open its player without replacing its queue. New selections start playback and open the player.
- Playlist cards open details. Their separate play buttons start available recordings and open the player; unavailable playlists cannot start. Counts distinguish available recordings from previews.
- Play All disables shuffle; Shuffle explicitly enables it. Queue selections use entry IDs so duplicate recordings remain distinct and history/order are retained.
- Full-player tabs survive track changes; Lyrics falls back to Artwork when unavailable. Recording-specific sheets and lyric positions reset.
- The full player has 15-second backward/forward controls and Stop. The mini-player has Stop/dismiss. Stop clears playback, queue and timer and removes native controls.
- Loading displays a spinner and a Cancel loading action. Buffering retains Pause. Storage failures are separate from audio Retry.
- Library search includes raga and deity.

## Android integration

The existing MusicService remains the single playback owner. Its Media3 forwarding player publishes logical queue command availability and forwards adjusted command events instead of exposing ExoPlayer's single-item queue commands. Play/Pause, Previous and Next act on the service queue. Previous restarts after three seconds, otherwise uses eligible history; Repeat All allows wrapping. Alarm and ritual ownership block external transport.

The session activity opens `geeta://library?player=1` using an explicit immutable activity intent. The route waits for session hydration, consumes the parameter, and opens the current player without starting or replacing playback. Missing sessions and priority-owned sessions are ignored.

Media metadata includes title, supplied artist/subtitle and remote artwork or the application icon. Notification and lock-screen layout remain controlled by Android. Existing foreground-service declarations and Media3 notification lifecycle are retained. Process restart restores paused playback; Stop clears media items and stops the service.

## Automated validation

- `npm run test:music`: 48 passing tests, including nine added regression cases.
- TypeScript type checking and ESLint on changed application sources.
- `:morning-alarm:compileDebugKotlin` and `:morning-alarm:testDebugUnitTest`; no assemble task.
- Added native policy coverage for Previous availability at the restart threshold, with history and Repeat All.

## Device acceptance still required

After a separately authorized native build, record device, API, build identity and results for:

- Android API 26 and 36, plus available Xiaomi hardware; notification permission granted and denied on Android 13+.
- Two playable fixture recordings: notification and lock-screen Play/Pause/Previous/Next, repeat boundaries, duplicate entries and accurate artwork/title updates.
- Notification taps when the app is open, backgrounded and restored; no position reset or unintended autoplay.
- At least 30 minutes screen-locked playback, offline transitions, Recents removal, activity recreation, process death and reboot.
- Bluetooth/headset commands, headphone disconnection, calls, alarm/ritual interruption and explicit resumption.
- Stop cleanup; loading cancellation and buffering; small screens, Hindi/English and TalkBack.

No device acceptance is claimed. The bundled catalog contains only one playable recording; do not publish fixture recordings to production. Visual redesign and new iOS/web system-control features are outside this change.

## Missing notification correction

The connected Xiaomi M2101K7BI showed MusicService running with `startForegroundCount=0` while the notification was absent. The bridge starts the service directly, without binding a MediaController, so Media3 never called `onGetSession` to register the created session. MusicService now explicitly calls `addSession` immediately after creating the session and before restoring/loading media. This attaches Media3 notification and foreground-service management on direct startup.

Added an Android instrumentation regression test that starts the service without a MediaController and checks registration. It requires an isolated test installation and has not been run on the phone; no APK was built or installed for this fix. The phone still needs a separately authorized native rebuild/install before notification behavior can be verified.

## Playback-listener forwarding correction

A subsequent phone check showed a newer app installation (11:28) and notification permission granted, but foreground startup still remained at zero. Compiled-bytecode inspection exposed a second defect: the Kotlin `Player.Listener by listener` object only implemented the explicitly overridden command callback. Java default callbacks such as `onEvents`, `onPlaybackStateChanged`, `onIsPlayingChanged`, and metadata updates remained no-ops, so Media3 could not observe playback changes.

Replaced that object with an explicit Java listener adapter that forwards all callbacks and adjusts only command availability. A JVM regression test reflects over every default Media3 callback and verifies delivery and payloads, so future added callbacks cannot silently disappear. This correction still needs a native rebuild/install and on-device notification acceptance; restarting the installed app does not load changed native classes.

## Authorized build and Xiaomi verification — 2026-10-19, 11:35–11:46 IST

- User authorized building, installing and testing the correction.
- Built `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a`; installed `android/app/build/outputs/apk/debug/app-debug.apk` with `adb install -r`, preserving app data.
- Xiaomi M2101K7BI: media notification visibly shows title, artwork, progress and controls. Service diagnostics now show `startForegroundCount=1`, `isForeground=true`, notification ID 1001 and transport category.
- Notification Pause changes to Play; Resume starts playback again. Previous restarts the recording, and a second Previous returns through history. Next changed Siya ke ram to Ram Bhajan; Previous returned to Siya ke ram. Notification title and duration updated correctly.
- Tapping the notification reopened the full player with the selected recording and its progress retained. Queue tab selection survived track transitions.
- Playback continued with the notification shade open. Playback was paused after testing.
- Evidence screenshot: `/tmp/geeta-notification-working.png`. This was a debug development-server build, not a production release. Long-duration locked-screen, Bluetooth, call/alarm interruption and other-device acceptance remain separate checks.
