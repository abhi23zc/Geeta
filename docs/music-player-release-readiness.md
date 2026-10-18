# Music player and catalog release readiness

Prepared for review on 2026-10-18. Following explicit user authorization, the music API, Storage rules, and admin Hosting were deployed to `geeta-56cdb`. No music catalog release was published and no APK was built. Android device acceptance is still required before production readiness can be claimed.

## Production deployment record

- Admin: https://geeta-56cdb.web.app — sign in with the existing verified admin account, then select **Music**.
- Deployed successfully with `firebase/functions/node_modules/.bin/firebase deploy --project geeta-56cdb --only functions:content:musicApi,storage,hosting --non-interactive`.
- Admin and functions builds passed immediately before deployment. Live checks confirmed HTTP 200 for the admin page and its JavaScript bundle, with the Music workspace included.
- `POST /api/music/admin/load` without authentication returns HTTP 403 (`Verified admin access required`).
- `GET /api/music/catalog` returns HTTP 503 (`No music release published`) until an administrator reviews and publishes the first catalog. The app retains its bundled/last valid catalog during this state.
- App catalog base URL for a future authorized native build: `https://geeta-56cdb.web.app/api/music`. No app build or OTA update was performed.

## Delivered behavior

- The shipped Gita 10.20 Hindi recording is available. Its measured duration is **58,968 ms**, size **956,975 bytes**, and SHA-256 is `112fc03d8659c4f349be4ff5decd6a608d4d4e08fa8995a016ab28da9df488d5`. The narrator is unidentified; the app makes no performer claim and supplies no unverified timed lyrics.
- Other seed titles retain their stable IDs and appear as **Coming soon**, without audio, credits, durations, or lyrics. Playlists exclude unavailable recordings and report exclusions; entirely unavailable playlists have disabled playback controls.
- Android uses `MusicPlaybackModule` and `MusicService` inside the existing local Expo module. The service owns one Media3 1.9.0 ExoPlayer and media session, queue traversal/history, speed, repeat/shuffle, native sleep timing, focus/noisy-audio handling, and notification/headset commands. Local files are hashed on a worker before native playback. The bundled Gita source is also packaged as an Android asset so suspended JavaScript is unnecessary for bundled queue transitions.
- Queue entries have separate identities. Source requests and native item listeners have generations. Native queue replacement also requires the interruption epoch obtained before source resolution, preventing an expired timer, Pause, Stop, or alarm from being followed by a stale Play.
- Alarms acquire music ownership before native alarm sound starts. Ritual routes pause music and suppress overlays. External transport commands are rejected while higher-priority audio owns the session. Resumption is explicit.
- Minute timers use monotonic time and count while paused. End-of-track pauses before repeat/advance. Same-process service/activity recreation retains a timer; a new process/reboot restores paused and cancels timers. Explicit Stop clears the queue and removes the service controls.
- iOS/web playback uses the Expo Audio adapter. Their sleep timers depend on a running JavaScript runtime, as stated in the player. iOS has a streaming CryptoKit file-verification module; it needs a native iOS rebuild and has not been compiled on this Linux host. Web streams audio and atomically caches catalogs with AsyncStorage; downloaded music management is mobile-only.
- Mobile music cache, download registry, transfer metadata, and reservations use a separate SQLite database. Files are stored by checksum, verified before promotion, and checked before playback. There is one transfer at a time, shared duplicate requests, a separate **1 GiB** music budget, Wi-Fi-only by default, foreground/network-policy pausing, and explicit resume. Existing daily-content/alarm budgets are unchanged.
- Active and pending audio files are pinned. Clear removes removable files and reports retained active files. Legacy size-only downloads are never trusted or played; original legacy files/preferences remain available for recovery. Invalid preference data is copied to timestamped recovery keys.
- Favorites, history and sessions use serialized versioned persistence; actions during hydration are merged. Library subscriptions do not rerender for each progress update. The player has loading/error/retry states, responsive scrolling, image fallbacks, accessible drag/adjustable seeking, nested Back handling, and English/Hindi controls.

## Catalog and admin

`shared/music.ts` defines the schema independently of daily practices and alarm tones. Available tracks require one known bundled source or a verified immutable upload; previews cannot carry playable sources or recording claims. English metadata is required, Hindi is optional with an explicit unavailable-translation declaration. Timed lyrics must be ordered and fit the measured recording. Playlist references, identifiers, text bounds, asset sizes, checksums, and conflicting immutable descriptors are validated.

The Music workspace supports English title and recording-credit fields, publishing-rights confirmation, MP3/M4A upload progress/cancellation, preview of the verified object, server drafts, complete-catalog review, publication, history, and restoration. The complete JSON editor exposes Hindi metadata, optional HTTPS artwork, availability, timed lyric segments, and ordered playlist `trackIds`. Uploading a replacement generates a revision; keep stable track IDs.

The dedicated `musicApi` function uses `asia-south1`, 1 GiB memory, one concurrent request per instance, a 540-second timeout, and at most three instances. Upload validation streams at most 200 MiB into temporary storage, hashes incrementally, skips embedded covers, parses actual MP3/AAC audio, rejects video and recordings over three hours, and copies the exact Storage generation into a write-once validation object. Publication verifies asset descriptors and switches the current release pointer in a Firestore transaction using `expectedReleaseId`. Conflicts return HTTP 409. Restore creates a new release with the actor and source release recorded. Published assets are retained.

| Purpose | Path |
| --- | --- |
| Public catalog + ETag | `GET /api/music/catalog` |
| Load server draft/current/history | `POST /api/music/admin/load` |
| Save validated server draft | `POST /api/music/admin/draft` |
| Validate uploaded object | `POST /api/music/admin/validate-asset` |
| Publish full catalog | `POST /api/music/admin/publish` |
| Restore as a new publication | `POST /api/music/admin/restore` |
| Private operator upload | `music/uploads/{uid}/{uuid}.mp3` or `.m4a` |
| Immutable validation object | `music/validated/{assetId}.audio` |
| Public immutable audio | `music/published/{assetId}.audio` |

Every admin API operation checks a non-revoked Firebase token with `admin === true`. Storage rules separately enforce upload ownership, allowed MIME declarations, the 200 MiB cap, and no overwrite. Client writes to music release/control/asset/draft documents are denied. The server validates the actual audio independently of declared MIME.

App refresh runs at startup and foreground and is throttled to five minutes; explicit Refresh bypasses that throttle. Invalid/network responses retain the last complete valid release. An explicit disabled release is cached and respected. Active recording revisions remain pinned; subsequent queue entries receive the new catalog revisions.

## Validation

Commands used (none assemble an APK):

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
npm run test:music
npm --prefix admin run build
npm --prefix firebase/functions run build
node node_modules/expo/bin/cli export --platform web
cd android
./gradlew :morning-alarm:compileDebugKotlin :morning-alarm:testDebugUnitTest --console=plain
```

Firebase emulator validation requires Java 21+ on `PATH`, not only `JAVA_HOME`. This host used Android Studio's Java 25 runtime:

```sh
env PATH="/opt/android-studio/jbr/bin:$PATH" JAVA_HOME=/opt/android-studio/jbr \
  firebase/functions/node_modules/.bin/firebase emulators:exec \
  --project demo-geeta --only auth,firestore,storage,functions \
  'npm --prefix firebase/functions test'
```

Music Node tests execute named assertions with `--test-isolation=none` (31 passing at the time of this report). They cover source races, timer/ownership cancellation, duplicate entries, repeat/shuffle boundaries, failed-source retry, stale status, revision updates, progress subscription stability, download verification/quarantine, duplicate transfers, reservations, disk failure, Wi-Fi/background/cancellation policy, pinned-file deletion, hydration, write recovery, malformed/offline catalogs, explicit disable, and refresh throttling. The download tests exercise actual SQLite statements and temporary files with mocked platform transfer/bridge APIs.

The full Firebase emulator suite passed **13 named tests**, including six music subtests: authorization, actual-format/owner verification, draft/lyric validation, publication after upload mutation, publication conflicts, ETags/disable, and audited restore. Security tests confirm music namespace isolation and overwrite denial. The emulator ran the installed Node 24 host despite the functions' Node 22 deployment target; repeat on Node 22 in CI before deployment.

A separate **64-test** regression run passed for alarm navigation/presentation, Gita playback, language/content contracts, ritual readiness, and saved replay. Android JVM XML reports confirm **50 passing assertions across ten suites**, including the six named `MusicPolicyTest` assertions alongside the existing alarm tests. Web export passes after separating mobile SQLite from the web dependency graph. Admin build emits the existing Firebase bundle-size advisory. Repository-wide ESLint also reports pre-existing test-expression/generated-file warnings; music sources have no lint errors.

Automated tests do not replace decoder, audio-focus, battery-management, real networking, accessibility-service, or OEM validation. Real 200 MiB/three-hour boundary recordings and large-file throughput should be included in staged integration testing. Swift/iOS compilation and UI/device testing remain unverified here.

## Operator deployment instructions

1. Review the source and passing checks. Complete the device gate below before treating this as production-ready. Keep existing admin Firebase configuration and verified admin claims; no new ordinary-user privileges are needed.
2. Configure `EXPO_PUBLIC_MUSIC_API_URL=https://YOUR_PROJECT.web.app/api/music` using `.env.example`. The app appends `/catalog`. Leave it unset to use the bundled catalog. Configure the same Firebase project/bucket in the admin environment. Configure bucket CORS for the approved admin/web app origins if verified browser previews require it.
3. Build the functions TypeScript and admin static assets using the commands above. Review the dedicated `musicApi` runtime limits and the `firebase.json` hosting rewrite (the music rewrite precedes the general content rewrite).
4. Deploy the `musicApi` function in the existing `content` codebase, the reviewed Storage rules, and admin Hosting only when authorized. The installed CLI supports `firebase/functions/node_modules/.bin/firebase deploy --project YOUR_PROJECT --only functions:content:musicApi,storage,hosting` for this configuration. The initial deployment to `geeta-56cdb` is recorded above. Do not publish a music release through the daily-content API.
5. Open Music as a verified admin, load the current pointer, save/review a draft, and publish. Verify the public catalog/ETag and a real verified audio preview. A first-launch app retains the bundled seed until a complete valid release is available. Do not delete published assets during this release.
6. Android requires a new native build containing `MusicPlaybackModule`; an OTA JavaScript update alone is insufficient. iOS also needs its new `MusicFilesModule`. Build authorization has **not** been given in this task.

## Later Android acceptance gate

Record device/API/build identity, pass/fail, timing measurements, and logs for each case after the user instructs a build:

- At least 30 minutes screen-locked playback, multiple queue transitions and duplicate entries, including offline bundled/downloaded audio.
- Minute timer expiry within two seconds with JavaScript suspended, including buffering; paused countdown and end-of-track versus repeat/advance.
- Notification, lock-screen, headset, Bluetooth, call/focus loss, and headphone disconnection. No automatic resumption after interruption.
- Alarm arrival with the full player and each sheet open: alarm unobscured, music paused at its position, external Play blocked during the ritual, music still paused afterward.
- Wi-Fi changes, backgrounding, partial-transfer resume, cancellation, checksum/disk failures, capacity rejection, active-file deletion/Clear, and explicit server disable.
- Recents dismissal while playing, activity recreation, service recreation, process death, and reboot. Never auto-start after process restart/reboot; cancel old-process timers.
- TalkBack adjustable seeking and selected/disabled labels, nested Android Back, reduced motion, Hindi/English, small screens and large font scales, artwork errors, lyrics following/manual scrolling.
- Android API 26 and API 36 emulators plus available Pixel and Samsung/Xiaomi hardware. **All of this device coverage is currently unavailable/unexecuted**; record any unavailable hardware explicitly rather than claiming coverage.
