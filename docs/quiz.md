# Independent offline culture quiz

Home → Culture Quiz opens a standalone learning area. It has 600 questions in Hindi, English and Hinglish, 120 five-question lessons, quick quizzes, three revision filters, cooperative family play, 2–4-player turn-taking, saved explanations, 30 knowledge cards, personal bests and resumable rounds. Quiz remains independently accessible and is not inserted into the alarm/Gita/breathing flow. Its first completed round each day earns 10 shared progress points; additional rounds earn no extra points. Quiz and the real alarm-led ritual together advance the daily streak, without an extra combined points award.

## Data and implementation

`src/features/quiz/content/*.json` contains the authored bilingual facts and templates. The hand-authored `hinglish.ts` vocabulary adds a third language without changing bilingual revisions. Compilation builds four distinct options, source/context text, stable IDs and content revisions. The repository loads on entry to the quiz feature and caches its indexes. The web exporter produces a separate question-bank chunk; native production bundles include the content locally. Web is a preview, not a service-worker-enabled offline website.

The `QuizBankRepository` interface is the future database boundary. No Firebase changes, downloads or question API are implemented. Keep future remote validation behind this boundary and retain the bundled bank as fallback.

Quiz state uses only `geeta:quiz-progress-v1` in AsyncStorage. Every submitted answer and progression change is awaited before the UI exposes the next state. Writes are serialized and duplicate events are blocked while saving. Failed saves retain the last committed state and allow retry of the same action. Preferences and bookmarks are also committed immediately, so no debounce queue needs a background flush. Force-killing during an unfinished storage write can lose that unacknowledged action; the last successful save remains the resume point.

The active session stores frozen question snapshots and option order. History retains the latest 50 summaries; best scores and lifetime totals persist independently. Solo mastery advances after correct recalls on three different local dates. Reviews are scheduled after 1, 3 and 7 days; a wrong answer resets mastery and schedules tomorrow. Family rounds never modify solo mastery, lessons or best scores. The device's local calendar drives review scheduling; this offline feature cannot authenticate the device clock.

Reset removes only the quiz storage key after confirmation. Read/validation failures are displayed without automatically overwriting the existing record. An additive v1 migration supplies an empty best-score map when absent; unsupported versions require explicit recovery rather than destructive automatic reset.

## Quiz History

Quiz Home → Wisdom Treasury → Quiz History shows the latest 50 completed round summaries saved on this device, newest first. All / Solo / Family filters preserve completion order even when dates match. Solo includes Learning Journey, Quick Quiz and Revision; Family includes Play Together and Take Turns. Unfinished rounds appear only in Resume, not History.

Each summary shows its localized calendar date, mode, subject and score. Quick/Revision show selected difficulty; Take Turns shows its balanced Easy + Medium selection and each saved player's score out of five. Cooperative play shows only the group score. Newly unlocked knowledge-card counts appear when relevant. User-entered names remain unchanged; missing subjects have a localized fallback. English, Hindi and Hinglish are supported.

History is read-only: opening it does not start/replay a round, award points or change quiz progress. Normal provider recovery of previously earned pending rewards still applies. No question snapshots, answer review, replay, delete controls or storage migration are added. Existing summaries are used unchanged, and lifetime totals/bests survive summary eviction. Confirmed quiz reset clears history with other quiz data but leaves shared points/streaks, alarms and global language unchanged.

Automated history tests cover filtering, ordering, difficulty labels, timezone-safe dates, existing storage compatibility, translations and read-only route wiring. The existing engine tests cover the 50-summary limit and duplicate completion. Before release, check populated/empty/empty-filter states, returning from an active round, large fonts and long family names, all languages and screen-reader filter selection on a device. Load errors must show Retry rather than a false empty-history state.

## Content editing and editorial review

There are 100 Ramayana, 100 Mahabharata, 80 Gita, 100 festival, 80 deity/symbol, 80 temple/place and 60 Sanskrit questions. These are distinct facts, not translated duplicates. Difficulty allocations are initial editorial defaults (50% easy, 35% medium, 15% advanced), pending audience testing.

Each JSON row is `[English subject, Hindi subject, English answer, Hindi answer]`. Its group's prompt/explanation templates interpolate `{s}` and `{a}`. Prefer distractors of the same relation; compilation takes distinct answers from the same group before falling back to the topic. The top-level `ids` array assigns permanent IDs to the flattened rows. Move an ID with its row when reorganizing content; never reuse an ID for an unrelated question. Five sequential rows form a lesson, so preserve lesson grouping when editing existing content. Content revision hashes include the row and bilingual templates. Answer/meaning corrections reset affected mastery while active rounds keep their snapshots.

All 600 questions currently have `editorial-pending` status. Source references are leads for verification, not a claim that a scholar has approved every item. Before release, an editor must verify the answer, ambiguity, four distractors, Hindi and Hinglish wording, explanation, precise source and regional context. Refine broad references to specific sections; split a group when an individual item needs its own reference. Keep an audit record of reviewer/date/source in the release documentation, then add the reviewed question's ID to the file's `reviewedIds`. Do not mark content reviewed merely to make the release gate pass.

Research entry points used during authoring:

- [IIT Kanpur Gita Supersite](https://www.gitasupersite.iitk.ac.in/srimad?choose=1&etsiva=1&field_chapter_value=2&field_nsutra_value=47&language=ro): chapter/verse references for the Gita questions.
- [Valmiki Ramayana](https://www.valmikiramayan.net/): narrative text and translations; check individual kanda/sarga references, including Uttara Kanda traditions.
- [Cologne Digital Sanskrit Dictionaries](https://www.sanskrit-lexicon.uni-koeln.de/): Sanskrit headword verification.
- [Incredible India, Ministry of Tourism](https://www.incredibleindia.gov.in/en): regional festivals and destination profiles.

Mahabharata parva references, deity iconography and region-specific observances especially need a detailed editorial source audit. Do not infer scientific, historical or universal claims from narrative questions.

## Verification

Run `npm run validate:quiz`, `npm run test:quiz`, `npx tsc --noEmit`, and `npm run lint`. The validator checks exact totals, three-language fields, unique normalized prompts (including Devanagari combining marks), answer choices and lesson membership. `node scripts/validate-quiz.mjs --release` intentionally fails until every question is reviewed. Unit tests exercise selection, storage retry, resume, duplicate events, mastery scheduling, revisions, family scoring, rewards and bounded history. Existing task/content/alarm-navigation suites remain applicable.

Build checks: `npx expo export --platform web` and `npx expo export --platform android`. These verify bundling, not device rendering or offline release acceptance.

Physical acceptance still requires:

- Install a production build, enable airplane mode, and use every mode and all topics.
- Leave/reopen and restart during question, feedback, handover and result states; check option order and scores.
- Switch Hindi/English/Hinglish mid-round and test large system fonts, Extra Large text, narrow screens, screen readers and reduced motion.
- Trigger an alarm during a quiz and resume the saved quiz afterward.
- Test low-storage save failure and retry, rapid taps, duplicate player names and ties.
- Confirm quiz reset leaves all other app progress intact.
- Profile a lower-end Android phone; target usable quiz home within two seconds of navigation.
- Repeat relevant UI checks on iOS and web. Fresh native airplane-mode installation is the offline release criterion; the web preview has no offline refresh guarantee.

No physical-device or editorial acceptance is implied by passing the automated checks.
