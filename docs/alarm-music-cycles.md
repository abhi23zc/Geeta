# Persistent alarm music cycles

Admin → Alarm music cycles manages 1–14 tracks separately for Gita, Shankh and Pranayama. Set the start date, upload/preview MP3 or M4A files (up to 10 MB each), then publish that mode. Teaching publication does not change the cycles. Drafts save all three mode editors independently of teaching drafts.

Cycles advance by the phone's local calendar date, including weekdays with no alarm, and repeat without expiry. Each device keeps its current installed cycle until it has downloaded, verified and atomically committed a complete replacement. Admin does not need to upload daily. Offline devices keep their old music. Missing cycle data is not a deletion instruction. Existing single-track releases and old apps remain supported.

The optional `alarmCycles` content field carries `{ key, revision, startDate, tracks: [{ title, asset }] }`. `POST /api/admin/publish-alarm-cycle` accepts `{ cycle, expectedReleaseId }`; the server generates the published revision and preserves teachings/other modes. Legacy `alarms` remains available to older apps, with the first track as that mode's fallback. Restoring a release with cycles sends those cycle revisions again; restoring a legacy release without cycles does not erase a device's installed cycle.

Only the selected mode downloads automatically. Android stores independent verified copies in device-protected `alarm-cycles` storage; regular content download clearing does not touch them. Future cycles are staged alongside the current cycle and take effect on the local start date. Playback chooses the track at the original scheduled occurrence and freezes that choice through snooze/process recovery. Replacement installation waits until ringing and pending snooze have finished. Playback falls back to the mode's retained single track, then the system alarm/notification sound if needed.

Download preflight reserves room for both cache and native copies, a 50 MB free-space margin, and a 600 MB combined staging budget. The existing JS content cache retains its 300 MB ceiling. If storage is insufficient, the update fails safely and current native audio remains available. Superseded cycle files are reclaimed after replacement; frozen session files are retained until the session ends.

Deploy the compatible Functions backend first, then the admin build and updated Android app. No automatic production deployment or APK build is part of this change. Native device acceptance remains required after an explicitly authorized build: closed app, offline repetition, reboot before unlock, future activation, failed update, corrupt audio fallback, clear downloads, mode switch, timezone change and snooze across midnight. Gradle module unit tests compile native code without packaging an APK.

## Validation performed

Passed app TypeScript checks, focused ESLint, admin production compilation, Functions compilation, content/admin/cache tests, alarm navigation tests, and the real Firebase emulator publication flow (verified upload, 14-day cycle publication, teaching preservation, conflicts, ETag and release restoration). Android module JVM tests include 1/7/14-day repetition, future starts, calendar boundaries, skipped weekdays and DST. Cache tests cover failed/missing/corrupt updates, native install failure/repair, low storage, future-cycle fallback retention, independent modes, absent publication data and clearing downloads. No APK was packaged and no production service was deployed. Physical-device acceptance is pending.

## Production deployment — 2026-10-19

Following explicit user authorization, deployed `functions:content:contentApi` first, then Firebase Hosting, to `geeta-56cdb`. Admin: https://geeta-56cdb.web.app. Both deployment builds passed. Live verification returned HTTP 200 for the admin and content window API; the served JavaScript exactly matched the local production bundle and included the alarm-cycle editor/publication endpoint, and the API returned the new `alarmCycles` field. No content was published, no other functions/rules were deployed, and no APK was built. Installed mobile apps need the updated native client for daily cycle playback.
