# Narration, shlok and alarm delivery audit

Reviewed October 10, 2026. Scope: admin editor, Firebase publication/API/rules, shared content contract, Android SQLite/file cache, refresh lifecycle, Gita/Home/Today/Saved consumers, alarm setup and native alarm audio. Existing unrelated workspace edits were preserved. No application code was changed, content published, deployment performed or APK built.

## Screenshot diagnosis

Both screenshots show matching missing coverage: October 10 is locally ready, October 11–16 are reported unpublished by the app, and October 11–23 are unscheduled in the admin. The API maps absent schedule entries to `practice: null`; the downloader converts those slots into the exact “content has not been published” messages shown.

This is evidence of missing published date assignments, not evidence that audio transfer failed for those dates. Uploading audio, applying JSON edits, saving a draft and publishing are separate actions. The admin's “Apply current editor changes before saving the draft” message means its save operation stopped before writing that draft.

The screenshot alone does not establish which seven dates were originally published, whether a previous release was restored, or whether the deployed backend matches this checkout. The public production API could not be read through the web tool in this session; no authenticated production state was inspected.

“Last refresh: Not yet” is misleading here: `lastSync` is updated only if every date and the selected alarm succeed. Partial successful downloads do not update it. Error exits also leave old progress text visible.

## Actual delivery flow

1. Admin signs in with Google. The portal checks the admin claim; backend endpoints independently verify the token and claim. Storage permits admin uploads to their own `drafts/<uid>/...` path.
2. Admin uploads narration MP3 or AAC/M4A. The server measures codec, actual duration, bytes and SHA-256, then copies it to a validated asset. Narration is limited to 20 MiB and alarms to 10 MiB during validation.
3. Shlok text is entered as practice JSON: Sanskrit, transliteration, meaning, takeaway, context, reflection prompt, glossary and timed narration segments. There is no separate shlok-file import or automatic transcription. One narration asset contains the practice's timed Sanskrit and meaning segments.
4. “Validate and apply” parses the JSON into editor state. “Save draft” stores editor state privately; it does not make content available to the app.
5. Publishing requires exactly seven practices and all three alarm modes (`gita`, `shankh`, `pranayama`). Validated assets are copied to immutable public Storage files. A Firestore transaction creates the release and switches `delivery/current`, rejecting a stale expected release ID. New publication merges date assignments from the active release and retains at most 60 dates.
6. Android requests seven dates starting at the device's local date. API metadata includes text, timings, narration assets and the three-tone catalogue. Downloaded bytes and hashes must match before a date activates in SQLite. Home, Today and Gita resolve this shared content; Gita freezes a revision for its session.
7. Only the selected alarm audio is automatically downloaded and installed. Native code verifies it again and copies it into device-protected storage. Alarm playback loops it without JavaScript or internet, falling back to system alarm sound and then notification sound when necessary.
8. Refresh runs on startup/date change, foreground return, network recovery, manual refresh and a background task with a 360-minute minimum interval. Android decides when background work runs; six hours is not an exact delivery promise. Web/iOS retain bundled practice behavior.

## Findings requiring fixes

### High: unapplied editor text can be lost on upload

`admin/src/main.tsx:37,47,60,69`

The textarea is reset whenever `practices` changes. Uploading narration changes that state, so editing shlok JSON and then uploading can silently replace the edits with the last applied object. Applying incomplete text before the first upload may be impossible because full validation requires an audio asset. Loading a draft also overwrites edits without a dirty-state check. Selection during an upload can leave the preview showing audio for another date.

Recommendation: keep a separate dirty editor buffer for each date; merge verified audio metadata into that buffer without replacing text. Guard draft loads and ensure previews are bound to the selected practice/asset.

### High: missing audio can still appear “Ready offline”

`src/services/content-cache.ts:54–64,155–158`; `src/app/downloads.tsx:18`

Recovery removes missing/corrupt asset rows but leaves their date rows. `readContent()` resolves every date even when there is no asset row, constructing an expected file URI. Downloads checks only the presence of `narration`, so an unavailable file can be reported ready; the same date can be selected as the daily practice rather than a playable fallback.

Reproduced with the existing cache harness: download seven dates, delete today's audio, disconnect, refresh. Today's narration remains listed, its asset row is absent and the error says downloaded practices remain available.

Recommendation: separate retained text from verified playable readiness. Expose missing/repair-needed state and choose fallbacks using playable assets.

### High: default practice IDs collide across weeks

`admin/src/main.tsx:18`; `src/services/content-cache.ts:69–76`; `src/state/content-store.tsx:36–39`

Every fresh editor uses `practice-1` through `practice-7`. If an admin follows those defaults for another week, unrelated shloks share IDs. Bookmarks and saved media are keyed by ID, while revision is stored only inside the payload. Saving a later practice with the same ID replaces the earlier saved text/media. Existing bookmarks can also refer to a different teaching or prevent the later version from being copied.

Reproduced by saving two practices with the same ID and different revisions/text: only the second saved record remains.

Recommendation: assign a unique identity to each distinct teaching; use revisions for edits to the same teaching. Validate identity reuse during publication and decide whether saved content retains the bookmarked revision.

### Medium: scheduled alarm does not imply selected music is ready

`src/app/alarm/setup.tsx:330–355`; `src/services/content-cache.ts:263–264,288–292`; native `ContentFiles.kt`

Setup schedules the downloaded-tone key, starts refresh without awaiting it, then reports success. Offline/Wi-Fi restrictions or a download failure can leave the new selected tone uninstalled. Native storage retains only one tone, so switching modes while offline can cause system-sound fallback. Cache readiness trusts SQLite installation settings instead of checking the exposed native installed-tone API. Installation while ringing fails and depends on a later refresh to retry.

Recommendation: show scheduling and sound readiness separately; verify native key/revision and report fallback explicitly. Keep selected-tone installation independent of incomplete daily coverage.

### Medium: publication UI cannot conveniently edit existing published content

`admin/src/main.tsx:29–34,68–73`; `firebase/functions/index.ts:88`

Loading publication state reads release IDs and coverage but does not populate practices or alarms. An admin must load their saved draft or recreate the week. Alarm-only updates and single-date corrections still require seven complete practices and all three tones. Restore replaces the active schedule with the old release's schedule, which can reintroduce missing future dates.

Recommendation: load the selected published week and current tone catalogue into the editor, retain existing verified assets, support date/tone updates and preview coverage changes before restore.

### Medium: partial refresh status is inaccurate

`src/services/content-cache.ts:294–311`

Reproduced one published date with six null slots: the date downloads, `syncing` becomes false, `lastSync` remains zero and progress retains the last download string. The screenshot's “Checking upcoming content…” is another stale progress possibility. Ordinary failures are caught inside sync, so callers' `.catch()` handlers do not receive them.

Recommendation: track last attempt, last successful metadata fetch and coverage separately; finish with an explicit partial/complete/offline/paused state and return a structured result to callers.

### Medium: timing validation does not establish text alignment

`shared/content.ts:60–84`; `src/services/gita-playback.ts` (`alignedCues`)

The contract validates ordering, boundaries and presence of Sanskrit/meaning segments. It does not require segment text to cover the submitted Sanskrit/meaning, and cannot prove spoken audio matches the text. The reader has alignment checks, but publication can still accept mismatched cue text.

Recommendation: validate normalized cue coverage where required, show alignment feedback in the editor and retain human audio review.

### Medium: bookmark removal is inconsistent across screens

`src/app/index.tsx:529`; `src/app/gita.tsx:1238–1241`; `src/app/saved.tsx:60`

Home and Gita toggle the progress bookmark off without removing the SQLite saved teaching/media. Saved performs both actions. ContentProvider only adds missing saved records and does not reconcile removals. A teaching removed from Home/Gita can remain in Saved.

Recommendation: use one bookmark operation that updates both stores, with recoverable failure handling.

### Lower priority: incomplete weeks repeatedly trigger checks

`src/services/content-cache.ts:265`; `src/state/content-store.tsx:28–32`

The one-hour early return requires seven cached dates and a ready alarm. Missing published days therefore bypass it on every automatic trigger. ETags help payload size but still cause API requests and recovery/hash work. Treat publication gaps as coverage state with a retry time while preserving forced manual refresh.

### Lower priority: alarm preview/catalogue UI is not connected

`src/services/content-cache.ts:139`; `src/app/alarm/setup.tsx`; `shared/content.ts` (`toneLabel`)

`prepareAlarmPreview` has no application caller. Setup and Home use fixed mode titles/descriptions rather than published catalogue titles. Admin audio preview is shared between narration and alarm uploads and is not reset on date changes. Provide asset-specific previews and a visible selected-tone download state.

## Existing protections worth retaining

- Backend checks admin authorization independently of the portal, and clients cannot directly write releases or delivery state.
- Codec/duration measurement and SHA-256 verification occur on the server; device downloads verify size/hash again before activation.
- Failed replacement audio leaves the previous verified date revision in place.
- SQLite leases serialize cache mutations; playback pins and ritual checkpoints protect active recordings from normal cleanup.
- Saved text survives audio expiry; saved replay repairs/downloads its retained recording metadata.
- Release pointer changes are transactional with conflict detection; native alarm copies survive daily-cache clearing.

## Validation and limits

- Passed `npm run test:content` and the Gita playback/saved replay test files.
- Passed TypeScript checks for mobile, admin and Firebase Functions using `--noEmit`.
- Passed `npm run lint`.
- Three additional temporary harness scenarios reproduced partial-status, missing-file readiness and saved-ID replacement behavior. No regression tests or implementation patches were added to the repository.
- Firebase emulator integration was not run: this environment has Java 17, while the configured Firebase tools require Java 21 or newer. Production authorization/rules and real audio round trips remain unverified in this session.
- Physical-device lock-screen, reboot, OEM background limits and real selected-tone switching were not tested.
- SDK 57 documentation was consulted: https://docs.expo.dev/versions/v57.0.0/ and its BackgroundTask/FileSystem legacy references. The existing legacy resumable downloader is a documented API; its use alone is not a defect.

## Suggested implementation order

1. Preserve editor buffers and give distinct teachings unique IDs.
2. Correct verified offline readiness and expose partial refresh results.
3. Verify native alarm installation and show selected-sound readiness/fallback.
4. Load published content for editing; support smaller updates and consistent bookmark removal.
5. Improve cue alignment, previews, automatic refresh throttling and device acceptance coverage.

For the coverage shown in the screenshots, complete, apply and publish the missing dates. With the current API that means a complete seven-date batch and all three validated alarm modes. Confirm publication coverage changed, then refresh the app. Saving a draft or re-uploading an audio file alone will not fill the schedule.
