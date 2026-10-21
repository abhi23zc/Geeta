# My Jaap

Implemented for Expo SDK 57. The feature is offline and free. It has four mala materials, 108 counted beads and an uncounted guru bead, pull/tap counting, undo, paused recovery, custom mantras, history, personal backgrounds, reminders, and optional daily rewards.

## Product rules

- Pull the enlarged bead downward at least 40 logical pixels and release. Reversal, sideways movement beyond 28 pixels, cancellation, and multitouch invalidate the gesture. The drag and tap recognizers are exclusive.
- The guru never counts. The display progresses from 107 to 108 to 1; session totals continue increasing.
- Counts, undo events, daily summaries and completion receipts commit before success is displayed. One operation ID commits at most once.
- Background, route blur, and alarms pause practice. Relaunch never resumes automatically. Recovery credits time only through the latest saved interaction, avoiding credit for time after a crash.
- A committed first count marks its date active. 108 counts accumulated across mantras/sessions unlock 10 points once per date. Undo corrects counts without retracting an earned milestone.
- Jaap prevents inactive-day point deductions. Tree growth still requires ritual and quiz, and incomplete days retain existing tree loss rules.
- Reminder defaults to 19:00 but is off initially. Permission is requested only on enable. Ordinary reminder scheduling respects alarm quiet windows and caps iOS to the nearest 60 requests.

## Storage and integration

Native persistence uses a separate `jaap-v1.db` SQLite database in WAL mode. Snapshot, immutable event archive, operation deduplication, and receipt updates share an exclusive transaction. Completed sessions retain daily aggregates; the active undo cache is cleared when another session starts. IndexedDB provides equivalent transactions on web, with object stores for practice, events, and operations.

Progress uses version 4 and retains the existing storage key. The frozen version-3 reader validates existing records before migration. A shared transaction barrier serializes jaap source commits with reward import and ended-day settlement. Source receipts are acknowledged only after progress saves. Historical tree state, points, and legacy migration paths are retained.

New screens live under `/jaap`. Home and Today expose the feature. The root shell hides tabs and the mini-player on jaap screens without stopping music. The local notification destination passes through onboarding and alarm guards. Frame callbacks in the existing onboarding/alarm guards are wrapped to preserve browser invocation semantics.

Dependencies: Expo ImagePicker, ImageManipulator, and KeepAwake, using the installed SDK 57 compatibility versions. The image-picker plugin disables camera and microphone permissions. Personal photos are resized, saved as local JPEGs, and never uploaded. Web uses bundled backgrounds.

## Assets

`assets/jaap/mala-materials.png` is a transparent sprite atlas generated with the built-in image generation tool, not a screen screenshot. Columns are Rudraksha, Tulsi, Sandalwood, and Crystal; rows are counting bead, guru bead, and tassel. Selection previews show three large material samples. The counter shows a moving window of seven beads on one connected thread; the logical mala remains 108 jaap. Beads translate along the curve during a pull and advance one spacing after persistence confirms the count. Paused beads keep full contrast, and the counter shows a clear paused state with explicit Resume. A soft threshold haptic and saved-count confirmation provide distinct tactile feedback. The main counter keeps daily progress and thumb controls prominent; rewards appear after completion. The completion bell is a locally synthesized short harmonic WAV.

Final image prompt:

> Use case: product-mockup. Create a production sprite atlas PNG with truly transparent background for a premium devotional mala mobile app. Exact composition: uniform FOUR columns by THREE rows, landscape 4:3 aspect ratio, twelve equal square cells, each object centered with generous transparent margin and fully contained in its own cell. No grid lines no text no labels no frames no backdrop no cast shadows outside objects. Every column represents one bead material: first column dark rich brown Rudraksha seeds with deeply grooved knobbly authentic organic seed surface; second column pale ivory matte Tulsi wooden beads with subtle grain; third column smooth honey amber Sandalwood with fine natural wood grain; fourth column clear faceted transparent Crystal with realistic reflections and delicate warm gold thread hole. Row one: one single spherical counting bead per column, front view, occupying 70 percent of each square cell. Row two: one single slightly larger matching guru bead per material with a small thread neck at bottom, occupying 75 percent. Row three: one small elegant saffron thread tassel per column, top knot and hanging threads, completely isolated and centered, occupying 75 percent height. Consistent top-left warm studio lighting across all cells, tactile photorealistic 3D renders, crisp high quality detailed edge textures and genuine transparent alpha, asset sheet only.

## Validation

- `npm run test:jaap`: model, gestures, real SQL rollback/atomicity using Node SQLite, rewards, and notification behavior.
- Existing progress, tree, language, notification, and alarm-navigation suites.
- TypeScript, targeted ESLint, and Expo web static export.
- Browser review at phone width: onboarding handoff, mala/mantra selection, counting, undo, paused recovery after reload, valid pulling, rejected short/sideways pulls, and history.

Native follow-up checks require an explicitly requested development build: physical-device gesture feel and frame rate, haptics, photo picker, screen locking, audio interruptions, scheduled reminders, TalkBack/VoiceOver, and large text. No APK or native build is produced by this change.

Cloud sync, voice counting, hardware-button counting, other round lengths, and paid gates are intentionally excluded.
