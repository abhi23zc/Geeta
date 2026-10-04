# App languages

Open **Home → Language** or **Culture Quiz → Settings** to select English, हिंदी, or Hinglish. The same offline preference applies to the app and quiz. It also appears directly in the quiz player; switching does not restart the round.

## Persistence and compatibility

- New installations default to English. If no app preference exists, a valid v1 quiz language is migrated. The dedicated `geeta:app-language-v1` key takes precedence thereafter.
- Preference writes are serialized. Failed writes leave the current choice unchanged. Storage hydration finishes before normal screens mount; a read/migration failure provides Retry rather than overwriting existing data.
- Quiz reset only clears quiz data. Question IDs, original bilingual content revisions and option IDs are unchanged. Old active snapshots gain Hinglish only if their revisions and options match; otherwise their original English snapshot remains available with a notice.
- New starter tasks have presentation-only template IDs. Editing a starter task clears its template marker. Legacy and user-authored titles, player names and journal text are not translated or inferred from their wording.
- Native Android alarms use a separate device-protected preference and explicit `AlarmStrings` catalog. Synchronization runs at startup, on selection and on foregrounding, without changing alarm configuration or scheduling. Sync failures are shown in the language picker and can be retried.

## Content and authoring

`src/i18n/translations.ts` contains app-owned Hindi and natural Hinglish copy, typed keys and interpolation templates. React components use context-bound translators, making language an explicit dependency for React Compiler memoization. Unknown system error details fall back to their original text.

Quiz English/Hindi facts remain in the existing JSON files. `src/features/quiz/hinglish.ts` adds hand-authored mixed-language templates and vocabulary, retaining established Latin spellings for proper names and places. The bank remains lazy-loaded. All 600 questions, 120 lessons and 30 cards support all three languages; editorial review remains pending.

Sanskrit, published teaching text, recordings and narration-synchronized meanings remain in their available language. This does not add multilingual recordings or change the current `hi-IN` content API/cache contract. Language selection is independent of device locale; Hindi dates use Hindi names with Latin digits, while Hinglish uses English date formatting. Existing AM/PM choices are retained.

## Verification

Run `npm run test:language`, `npm run validate:quiz`, `npm run test:quiz`, the existing task/content/alarm-navigation suites, `npx tsc --noEmit` and `npm run lint`. Export all platforms and compile `:morning-alarm:compileDebugKotlin` before release.

**Rebuild/install the Android development or release app** to include the native bridge and alarm strings. Expo Go or a JavaScript reload cannot update native alarm code.

Manual release checklist (not replaced by automated tests):

- Switch each language on every screen, including an open intention editor and an active/resumed/family quiz. Check that in-progress text, choices and scores remain unchanged.
- Relaunch offline; verify new-install English, existing quiz migration, language persistence and quiz-reset isolation.
- Check 320-point screens, maximum system text size, quiz Extra Large text, Hindi glyphs, wrapping, screen-reader labels and all language-radio states.
- On a rebuilt Android app, check alarms in each language with JavaScript stopped and after reboot before unlock. Confirm native cover, notification, hold-to-dismiss and volume-key feedback, without altering the alarm schedule.
- Verify cached/downloaded text and audio remain intact and clearly retain their source language.

No interactive browser was available in this workspace for visual QA; device/layout and reboot acceptance checks must still be completed.
