# Codebase review — 9 October 2026

## Implementation follow-up

The reliability implementation now addresses findings 2, 3, 6, and 8 and preserves Home's command errors across snapshot refreshes. Gita and the alarm settings mirror block writes after failed hydration; explicit corruption recovery verifies a backup before replacement. Native alarm configuration remains authoritative and usable independently of damaged JS storage. Wake and native fallback share an idempotent, session-bound Start my day operation, with failure-injection tests for retries after dismissal. Saved replay invalidates pending preparation on pause, blur, background, removal, and disposal. Wake has semantic, screen-reader, and keyboard activation; Wake/Breathing permit scrolling at large text or small heights.

The subsequent time-picker request adds continuous hour/minute wheels, animated selection, bounded haptics, reverse rollover, noon/midnight period changes, adjustable accessibility controls, and a Save guard during movement. Night findings 1, 4, and 5 remain excluded at the user's request. Quiz editorial finding 7 remains deferred per the implementation plan; structural validation does not certify the bank's factual accuracy.

See [alarm reliability](alarm-reliability.md) for implementation checks and pending physical-device acceptance. The findings below describe the original reviewed source and retain its historical line references.

## Assessment and scope

Geeta is an Android-first morning-practice app with Expo Router screens, a custom Kotlin alarm module, offline teaching downloads, a local quiz engine, and a shared points/tree-growth system. A separate React/Vite admin app publishes content through Firebase Functions.

The alarm has substantial reliability engineering: exact alarm-clock scheduling, native sound independent of JavaScript, configuration revisions, occurrence-bound stop requests, device-protected storage, a native startup cover, phase restoration, and durable reward receipts. The most significant issues found are disconnected Night controls, unsafe storage-error handling, and a partially committed Wake transition.

The original review covered the working tree, including existing uncommitted screen changes. It was source inspection plus the checks listed below, not a visual acceptance test or proof of delivery on a phone. The implementation follow-up above was added afterward.

Read the required [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). The declared Expo 57, React Native 0.86, and React 19.2.3 families match its version table. This alone does not certify every package or native build.

## Prioritized findings

### 1. High — Night's alarm switch does not control the alarm

Evidence: `src/app/night.tsx:49` initializes a separate `alarmOn` state to true. The switch at line 235 only calls `setAlarmOn`.

Turning it off does not call native cancellation, change `alarmEnabled`, or update the native configuration. Turning it on does not schedule anything. It also starts visually enabled when the actual alarm is disabled.

**Effect:** a user can believe tomorrow's alarm is disabled while it remains scheduled, or enabled while it will not ring.

**Recommended change:** reuse the native snapshot and scheduling/cancellation behavior used by Home, including pending state and error reporting. Display actual required-access status.

### 2. High — Gita hydration failures can overwrite saved progress

Evidence: `src/state/gita-store.tsx:91–102` catches storage/JSON errors, then sets `ready=true`. The persistence effect subsequently writes the initially empty progress object.

**Failure path:** a transient storage read failure or malformed record is treated as successful empty hydration. A later successful write replaces bookmarks, reflections, and breathing dates. This is a source-confirmed failure path; no device storage failure was injected during this review.

`RitualProvider` uses the same pattern at `src/state/ritual-store.tsx:51–84`. Its effect can overwrite the JS settings mirror after failed hydration. A malformed JS JSON record also prevents the native configuration lookup from being reached. Native alarm preferences themselves are separate and are not erased by that JS write.

**Recommended change:** distinguish successful empty reads from failed reads; block writes until hydration succeeds; preserve malformed data for explicit recovery. Use TasksProvider's load/save error handling and serialized writer as a reference.

### 3. High under failure conditions — Wake dismissal cannot retry a failed phase save

Evidence: `src/app/alarm/wake.tsx:143–144` first dismisses playback, then advances to Breathing. Native `dismissRitualOccurrence` at `MorningAlarmModule.kt:109–111` requires the alarm still to be ringing.

**Failure path:** dismissal succeeds, then the activity becomes unavailable or the Breathing-stage preference commit fails. Wake resets its button and offers retry, but another dismissal is rejected because ringing is already false. The saved stage remains Wake. The route guard follows that saved stage and does not repair it.

**Effect:** sound has stopped, but the React Start my day action can no longer continue the ritual through its normal retry path. This is a code-path finding, not a reproduced phone failure.

**Recommended change:** make dismissal plus stage advancement one recoverable native operation, or allow an idempotent same-session retry to advance an already-dismissed Wake occurrence. Add a failure-injection test between the two operations.

### 4. Medium — Night claims persistence that it does not implement

Evidence: journal, mood, and completion are local `useState` values in `src/app/night.tsx:44–49`. The journal displays “Saved locally” at line 181. Reflection is held in RitualProvider memory and is excluded from its persisted settings.

**Effect:** these entries disappear on restart; component-local values also disappear on remount. Reflection uses `value={reflection || defaultJoyText}` at line 133, so deleting all text immediately restores the sample text.

**Recommended change:** store dated reflection/journal/mood records with a real save state and retry. Use sample text as a placeholder, and allow empty input. Connect the completion button to the saved record.

### 5. Medium — Night displays incorrect alarm time and recurrence expectations

Evidence: `src/app/night.tsx:222–225` prints the stored 24-hour value alongside hardcoded “AM”. It labels the alarm “TOMORROW'S WAKE-UP” without checking selected weekdays or the next native occurrence.

**Example:** a stored 18:30 alarm displays “18:30 AM”. A weekdays-only alarm can be presented as tomorrow's wake-up on a day when tomorrow is not selected.

**Recommended change:** share a time formatter and use the scheduled timestamp, selected days, and readiness snapshot.

### 6. Medium — Saved replay can start after the app backgrounds

Evidence: `src/app/saved.tsx` pauses on AppState changes, but `replay()` only checks `mounted.current` after asynchronous recording preparation, then calls `player.play()`.

**Failure path:** the user requests a recording, backgrounds the app while preparation/download is pending, and preparation finishes afterward. The background listener has already paused the player; the continuation can issue a new play command because backgrounding does not clear `mounted.current`.

**Recommended change:** use a command generation, focused-route check, and current foreground check after every asynchronous boundary. Release the recording pin when the command is invalidated. Gita's command-generation approach is a useful reference. Actual background playback depends on audio mode and OS behavior; the stale play command is the confirmed issue.

### 7. Medium — Quiz review claims conflict with the content's review status

`npm run validate:quiz` reports **600 questions, 120 lessons, 30 cards, and 600 editorial-pending questions**. `docs/quiz.md` explicitly documents the pending review gate. However, `src/app/quiz/settings.tsx` says question citations and contexts are reviewed for accuracy.

**Recommended change:** make the screen copy reflect current editorial status and complete the documented review process before treating the bank as approved. Structural validation verifies completeness and consistency, not factual accuracy.

### 8. Accessibility verification gap — hold dismissal has no explicit accessible action

`src/app/alarm/wake.tsx:337–344` labels the Start my day control as a button but implements it through `onPressIn`/`onPressOut`, with no `onPress` or `onAccessibilityAction`. Native fallback dismissal similarly uses a touch listener.

This does not establish that all screen readers fail, but the primary dismissal path needs TalkBack, switch-access, and keyboard testing. Add an accessible equivalent that invokes the same session-guarded completion operation. Also verify large text on Wake and Breathing, whose main layouts intentionally do not scroll.

## Alarm flow

1. **Setup:** `alarm/setup.tsx` selects one time, weekdays, and one of three tone keys. `services/alarm.ts` requests notification access and passes configuration to the native module. This is a single recurring alarm, not a collection of independent alarms.
2. **Persistence:** AlarmStore commits configuration to device-protected SharedPreferences and increments its revision. JS RitualProvider maintains a UI/legacy settings mirror; native configuration is the scheduling authority.
3. **Scheduling:** AlarmScheduler calculates the next selected local weekday/time and registers it with `AlarmManager.setAlarmClock`. Required readiness is exact-alarm access, notification permission, and a High-importance alarm channel. Full-screen access is advisory rather than a scheduling requirement.
4. **Reconciliation:** boot, locked boot, package replacement, time/timezone changes, and exact-access grants trigger forced rescheduling. Foreground entry also reconciles. Schedule metadata records success, missing access, failure, or disabled status; Home reads a combined native snapshot.
5. **Delivery:** AlarmReceiver rejects disabled/stale revisions, starts the foreground service, and schedules the next regular occurrence. Test requests use different PendingIntent identifiers.
6. **Sound:** AlarmService loops a verified installed tone or falls back to the system alarm/notification sound. It uses alarm audio attributes, optional vibration, a five-minute gradual-volume ramp, and a ten-minute partial wake lock. Volume is player gain; the code does not explicitly raise the device alarm-stream volume. All sound sources failing produces a silent playback diagnostic.
7. **Presentation:** AlarmPresentation controls lock-screen window flags and a native cover around the single React host. Readiness binds session, stage, host generation, and cover generation. A ten-second loading deadline exposes recovery. Before first unlock, the direct-boot-aware native fallback is used.
8. **Dismissal:** a 1.5-second hold stops playback and proceeds to Breathing. Notification Stop ends the ritual. There is no implemented snooze flow. A test is scheduled 30 seconds ahead and has a 30-second ringing timeout; it does not award ritual points.
9. **Breathing:** three seconds of preparation followed by five 4–4–6 rounds, totaling 70 seconds. Unfinished breathing restarts after blur/background/reopening; completed breathing remains complete. Native policy prevents skipping to Gita before the saved elapsed time reaches 70.
10. **Gita:** the screen freezes its teaching revision, protects its audio from ordinary cleanup, and saves playback/evidence checkpoints. Foreground contiguous playback or explicit reading confirmation enables completion. Restored incomplete playback starts paused; stalled audio exposes a reading fallback.
11. **Rewards:** native stage receipts enter a durable outbox. ProgressProvider imports them through serialized transactions and acknowledges them after saving shared progress. Test rituals are excluded; daily deduplication prevents repeated ritual awards.

### Alarm strengths and practical limits

Revision checks, occurrence-bound stops, serialized scheduling, independent alarm audio copies, and generation-bound readiness are strong defenses against stale work. The React route guard restores saved Breathing/Gita phases even after sound stops and protects locked ritual navigation.

Successful scheduling is not proof of eventual OEM delivery. Current-source device acceptance should cover locked/unlocked delivery, background process death, reboot before unlock, Doze, permission revocation, sound damage, notification Stop, and process death between ritual operations. Existing validation documents record historical checks; they should not be treated as fresh acceptance of the modified working tree.

Alarms are implemented only for Android native builds. iOS, web, and Expo Go do not have an equivalent native alarm here. Selected musical modes require successful tone installation; scheduling can succeed before that download completes, in which case system sound is the intended fallback.

## Every screen

| Route | Function and state | Review observation |
| --- | --- | --- |
| `/` | Daily teaching, bookmark, daily goal, native alarm status and toggle | Uses native scheduling evidence; better integrated than Night. Its toggle catch sets an error then calls a refresh that can clear that error immediately. |
| `/alarm/setup` | Time wheel, weekdays, three tones, permissions, OEM guidance, test | Required and advisory access are separated; saved configuration can remain enabled while waiting for access. |
| `/alarm/wake` | Active sound status, teaching snippet, hold dismissal | Session guards and hold cancellation exist; partial-transition recovery and accessible activation need attention. |
| `/breathe` | Guided preparation and five breathing rounds | Focus-aware timer and checkpointed completion; unfinished sessions deliberately restart. |
| `/gita` | Timed narration, Sanskrit/meaning/glossary, bookmark, share, completion | Frozen content, listening evidence, fallback and pending-points handling are substantive; completion still needs device failure testing. |
| `/today` | Create/edit/archive intentions; timed/anytime, daily/once tasks | Durable serialized task snapshots, date rollover, retry/reset handling. Task times organize the list and do not schedule reminders, as the UI explains. |
| `/night` | Task review, gratitude, journal, mood, dawn preparation | Task completion is real and shared with Today. Journaling, mood, sleep completion, and its alarm switch are incomplete integrations. |
| `/progress` | Points, daily goal, tree level/cycle, milestones, calendar, ledger | Shared receipt-based progress rather than cosmetic counters. Loading/error handling is partly delegated to DailyGoalCard. |
| `/saved` | Bookmarked teaching text and recording replay | Re-downloads expired recordings and pins active files; asynchronous replay requires stronger lifecycle checks. |
| `/downloads` | Offline availability, storage use, Wi-Fi preference, refresh/clear | Android cache controls; clearing protects active ritual recordings and preserves the separately installed alarm sound. Web uses stubs; iOS lacks the native verification bridge. |
| `/language` | English, Hindi, Hinglish preference | Persisted global setting also synchronized to native alarm copy. Published narration remains in its supplied language. |
| `/quiz` | Quiz hub, resume, pathways, stats and daily goal | Scoped QuizProvider supplies saved sessions and bank; feature UI contains loading/error recovery. |
| `/quiz/setup` | Topic/difficulty/count and due/wrong/saved revision selection | Eligible pool determines available questions; empty revision pools are rejected by the engine. |
| `/quiz/play` | Questions, selection, feedback, sources, saves, handover, results | Durable answer commits, leave confirmation, and duplicate-submission protection; alarm presentation bypasses the normal quiz exit prompt. |
| `/quiz/journey` | Topic filters and lesson progression | 120 lessons, five questions per lesson, backed by engine progress. |
| `/quiz/family` | Together mode or 2–4 alternating players | Same-phone play; family scores stay separate from individual mastery. |
| `/quiz/collection` | Locked/unlocked knowledge cards | 30 cards backed by lesson-completion unlock rules. |
| `/quiz/saved` | Saved question explanations and removal | Separate from saved daily teachings; quiz persistence owns these records. |
| `/quiz/history` | Recent rounds with solo/family filters and score summaries | Read-only, bounded to the latest 50 summaries; lifetime totals persist separately. |
| `/quiz/settings` | Global language, quiz text size, haptics, reset | Reset is quiz-scoped. Editorial-review copy is inaccurate. |
| `/dev/tree-preview` | Growth, recovery, motion and celebration previews | Development-only rendering; production redirects Home. |

`_layout.tsx` composes language, progress/tree, ritual, tasks, Gita, and content providers around the root stack. Quiz has a nested provider/stack. The dock appears on Home, Today, Quiz hub, and Night, and is suppressed during an active alarm presentation.

## Content, admin, and maintainability

- **Offline content:** SQLite tracks teaching text, assets, saved media, leases, transfer states and playback pins. Downloads have host/schema/size/hash validation, bounded retries and temporary-file finalization. Alarm installation creates a separately verified device-protected copy.
- **Publishing:** Firebase verifies revoked-token status and the admin claim, inspects actual audio metadata, creates immutable assets/releases, and uses an expected-release transaction to reject concurrent publication conflicts. Firestore/Storage rules restrict administrative writes. Public published audio is intentional.
- **Admin screen:** sign-in, coverage, seven-day editor, audio upload/preview, save/load draft, alarm music, publish/restore and refresh pause. It shares contract validators with the client. Deployment and emulator behavior were not exercised in this review.
- **API limit:** the request counter is per running Functions instance. Treat it as local throttling, not a global rate limit across instances.
- **Progress:** receipt outboxes and serialized transactions are a better persistence model than the older Ritual/Gita stores. Tree growth, daily points, streaks, milestones and deductions have extensive model tests.
- **UI:** the largest screen files mix layout, animation, persistence and orchestration: Gita is about 1,960 lines; alarm setup 1,639; Breathing 1,348; Today 1,246. Extract lifecycle/orchestration hooks and shared time/alarm controls where behavior is duplicated.
- **Assets/docs:** mascot WebP assets, original videos, backups and design references coexist. Review bundled asset size using an actual production export before deleting anything. README is still the Expo starter README and does not explain native alarm builds, Firebase setup or release checks.
- **Signing:** generated `android/app/build.gradle:118` assigns the debug signing configuration to release. Historical release documentation confirms this is a local test identity; production distribution needs its own signing setup.

## Verification performed

| Check | Result |
| --- | --- |
| `node --test tests/*.test.mjs` | Passed: 17 test-file entries, zero failures |
| Root `tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| Admin `tsc --noEmit -p admin/tsconfig.json` | Passed |
| Functions `tsc --noEmit -p firebase/functions/tsconfig.json` | Passed |
| `npm run validate:quiz` | Structural validation passed; all 600 editorial reviews pending |

Some tests exercise pure state models; others assert source-code patterns. Neither type validates complete Android service/activity behavior or visual accessibility. Native Gradle tests, new APK builds, Expo exports, Firebase emulator tests and physical-device tests were not run during this review.

## Suggested order of work

1. Connect Night to the real alarm state and commands.
2. Prevent failed hydration from overwriting Gita/ritual data.
3. Make Wake dismissal/phase advancement recoverable and idempotent.
4. Persist Night records and correct time/recurrence display.
5. Harden saved replay lifecycle and verify accessible dismissal/large-text layouts.
6. Correct editorial claims, complete content review, and perform current-source device acceptance before release.
