# Content delivery and offline downloads

The Android app keeps today's practice and the following six dates in private device storage. SQLite stores the date assignments and file metadata. Existing personal progress remains in its original AsyncStorage keys. Bookmarked text is copied into SQLite and does not expire with audio.

## Configure Firebase

1. Create separate development and production projects. Select the Firestore location before creating its database; use `asia-south1` and a nearby Storage location. Enable Firestore, Storage, Google sign-in, Cloud Functions, and Hosting. Functions/Storage require a billing-enabled project; configure budget alerts before launch.
2. Register a Firebase web app. Put its public configuration into `admin/.env.local` using `admin/.env.example`. Authorize the admin Hosting domain in Firebase Authentication.
3. Install with `npm install --prefix firebase/functions` and `npm install --prefix admin`. Build with `npm run build --prefix firebase/functions` and `npm run build --prefix admin`.
4. Sign in once through the admin portal to create the Firebase user. Using operator credentials (Application Default Credentials), run `npm --prefix firebase/functions run bootstrap-admin -- USER_UID`. Sign out/in to receive the admin claim. Never put operator credentials into the app or portal.
5. Deploy only after reviewing project selection: `firebase/functions/node_modules/.bin/firebase deploy --project YOUR_PROJECT`. No production deployment is performed by the implementation itself.
6. Set `EXPO_PUBLIC_CONTENT_API_URL=https://YOUR_PROJECT.web.app/api/v1/content-window` in the mobile build environment. Public Firebase content needs no mobile account. Rebuild the Android application after installing the new native dependencies.

## Publish content

Choose the first calendar date, upload each day's MP3 or AAC/M4A narration, and fill all practice fields in the editor. Asset validation computes the actual duration, size, and SHA-256 on the server. Select each date to edit its practice. Include Sanskrit and meaning timing segments, in chronological order, without overlaps. Preview the recording and use its millisecond cursor to review timings. Click **Validate and apply** after text edits.

Upload and describe all three alarm modes. These are looping musical alarm recordings, separate from Gita narration. Save drafts to resume editing later. Publication requires seven complete practices and three validated alarm assets. The publisher writes an immutable release and transactionally switches the current pointer. A conflicting publication is rejected; reload publication state before retrying. Restore selects an earlier release and creates a new publication. A failed publication leaves the previous release active.

Narration limit: 20 MiB each. Alarm limit: 10 MiB each. Release limit: 900 KB with a maximum 60 date assignments. An asset ID is its SHA-256. Published audio is immutable and publicly readable. Drafts and validation records require admin access. Uploaded recordings must be owned or licensed for distribution.

## Mobile behavior

- Home, Daily Gita, and Today resolve the same local-date practice. Gita freezes the revision for a session and pauses on background/navigation. Timings, audio and text activate together after file verification.
- The Downloads screen shows coverage, storage, refresh errors, Wi-Fi preference and clear-download controls. Missing content uses a labelled last-playable or bundled practice. A fallback completion records the actual practice ID for the current date.
- The Saved teachings screen retains text, translation, glossary and context. Choosing replay downloads an expired recording again when online. Its temporary audio is eligible for cleanup when playback is released; saved audio is outside the seven-day readiness guarantee.
- Refresh runs on startup, foreground return, date change, connectivity recovery and manual retry. Background work has a six-hour minimum interval and is scheduled by Android, not an exact clock. Force-stop/background restrictions can delay it; foreground refresh repairs coverage.
- A renewable SQLite lease serializes sync, preview and clear operations. Persisted playback pins keep active files out of cleanup. Downloads retry transient errors three times, cancel after 120 seconds, and are finalized only after size/hash verification. Completed files are reused; interrupted partial files restart.
- Cached daily files normally use at most 150 MiB; replacement staging permits up to 300 MiB and requires 50 MiB free space. A temporary alarm preview may add up to 10 MiB until cleanup. Android owns a separate selected alarm copy of at most 10 MiB.
- Android copies the selected verified alarm to device-protected storage, so playback requires neither JavaScript nor internet and can survive reboot. Replacement is deferred while ringing. Missing/corrupt/custom playback failures fall back to system alarm, then notification sound. Clear daily downloads does not remove that native copy.
- iOS/web retain the existing bundled experience; Android is the implemented download/native-alarm target.

## Verification and operations

Run `npm run test:content`, `npm run test:tasks`, `npx tsc --noEmit`, and `npm run lint`. Build backend and admin independently. Run `npm run test:firebase` for security-rule integration against local emulators. Firebase's current emulator requires Java 21 or later; do not use production resources for tests.

For full local admin/API testing use `npm run content:emulators`. Set `VITE_USE_EMULATORS=true` and use the Hosting emulator at port 5000 after building the portal. Set the mobile URL to `http://10.0.2.2:5000/api/v1/content-window` for the Android emulator. Audio delivery still validates Firebase HTTPS Storage hosts, so full audio-download device acceptance uses a development Firebase project rather than local Storage URLs.

Physical Android acceptance: install over existing user data, publish seven real practices, download them, enable airplane mode, test all consuming screens, expire/refill dates, interrupt downloads, test low disk, replay/bookmark, and clear downloads. Test custom alarm sounds with locked screen and absent JavaScript, reboot, corrupted tone fallback, gradual volume and vibration. Repeat background-restriction cases on an OEM device. Existing alarm setup documentation remains applicable.

`coverageMonitor` checks the next 14 India-calendar dates daily and writes `operations/coverage`; missing coverage within seven days logs `content_coverage_low`. Configure a Google Cloud log-based alert for that event and `content_api_failed`, plus Function error and Storage egress/budget alerts. Coverage email/SMS delivery is an operator-configured Cloud Monitoring notification channel, not a credential embedded in the repository.

The admin portal can pause new app refreshes without deleting installed content. Published asset downloads use immutable cache headers; manifest delivery uses ETags and five-minute server cache control. The API has per-instance IP refresh limiting and a ten-instance bound; these do not replace billing alerts or project-level abuse monitoring.

Before production: set project IDs/configuration, bootstrap admins, upload reviewed recordings and timings, configure monitoring contacts and budgets, and complete physical-device checks. Do not claim offline readiness for dates absent from the Downloads screen.
