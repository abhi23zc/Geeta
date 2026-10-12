## Required and optional alarm setup

Onboarding verifies notifications and exact-alarm access. The Morning ritual alarms channel is optional guidance. Forward navigation skips requirements already granted, and returning from Settings refreshes Android access. Back can revisit earlier pages. A revoked requirement must be restored before normal completion.

Full-screen access, the alarm channel, manufacturer lock-screen/pop-up settings, auto-start, battery and vibration remain separate optional screens. They do not require review confirmations or tests. Set up later completes the introduction without granting access, changing alarm configuration or requesting notifications again. Alarm readiness is independent of introduction completion and uses only the two native requirements.

The shared walkthrough list includes vibration in navigation and progress. Existing completed records and storage keys remain valid. Capability failures offer Retry and Set up later. Screenshot examples may show the old app name; instructions refer to Aarambh.

# Onboarding permission walkthrough

Welcome → Language → Morning ritual → Daily practice → Notifications → Precise alarms (API 31+) → Alarm channel (API 26+) → Full-screen alarm access (API 34+) → Manufacturer settings → Continue. Legacy records paused at the removed save summary or test screen return to the final permission page; they do not save automatically.

Xiaomi pages are Show on lock screen → Background pop-ups → Autostart → Battery management. Every applicable permission page appears even when access is already enabled. Native grants control Next on Android permission pages; manufacturer pages allow Next without confirmation; status refresh never moves the cursor. Normal alarm setup and Alarm help continue using the shared adaptive troubleshooting controller.

`geeta:onboarding-v1` retains version 1 and adds optional `permissionPageId`. The serialized writer publishes navigation only after durable writes. Pre-cursor records and inapplicable saved IDs begin at the first applicable permission page. Back and Next persist progress; introduction replay clears the cursor while preserving alarm drafts, native grants, saved reviews and all other app stores.

Native permissions show Verified only after native reads. Manufacturer permission pages hide confirmation status and confirmation/unavailable buttons. Next does not write a review or imply a grant; these settings are optional. Existing reports remain stored. Alarm setup and Alarm help also use Next without writing a confirmation. Legacy combined Xiaomi reviews restore both individual pages; separate reviews remain independent and feed the shared combined troubleshooting review. Onboarding uses the actual brand, including Honor devices with a Huawei parent manufacturer, rather than a manual comparison guide.

Settings requests reuse the lifecycle-bound reliability controller and existing native routing/fallbacks. Both Xiaomi pages route through the existing popup shortcut, so older binaries work. Optional brand, model and Android software-version metadata are added to capability snapshots; older binaries without these fields remain supported. Native reads and review-store reads have a five-second deadline. Missing or failed reads, confirmations, progress writes and scheduling retain the draft and offer retry.

Onboarding only reviews permissions. It never opens alarm preferences or schedules a recurring alarm. Alarm time, days, and sound are configured from Home after onboarding. Permission guides accept records without a draft; older alarm-introduction records migrate directly to permissions with any draft preserved. Back from the first guide returns to Practice. Existing saved alarms remain unchanged. Incoming alarms retain navigation priority. Set up later preserves access to reading and quizzes.

Screenshot frames preserve aspect ratio, fit small viewports and safe areas, and identify inspected controls using normalized rectangles. Images use explicit dimensions with Expo Image contentFit="contain", centered directly on the page background, with height limited to min(420dp, half the viewport). Each page shows one instruction above its image. Text and controls can wrap; onboarding uses its existing scroll container and 58dp-minimum buttons. All applicable Android 13 Xiaomi pages now have matching offline screenshots. Other missing screenshots remain documented dependencies; pages retain written guidance without an unavailable placeholder. See [the coverage checklist](onboarding-screenshot-coverage.md). Complete coverage is claimed only for the Android 13 Xiaomi checklist, not all software variants or manufacturers.

## Verification (2026-10-10)

JavaScript regression coverage includes all-granted visibility, denied/granted status without cursor movement, API ordering, restart/legacy cursor handling, write failures, native verification versus confirmation/unavailability, independent Xiaomi reviews, actual-brand selection, existing alarm interruption/stale scheduling tests, offline asset existence, matching manufacturers, attribution/rights metadata and highlight bounds. PIL separately checks bundled image dimensions against metadata.

Run the full suite with `node --test tests/*.test.mjs`, TypeScript with `npx tsc --noEmit`, lint with `npm run lint`, platform exports with `npx expo export --platform all --output-dir /tmp/geeta-permission-pages-final-export`, and native checks with `./gradlew :morning-alarm:testDebugUnitTest :app:processReleaseManifest --offline`. These Gradle tasks do not assemble an APK.

Native tests: 31 passed. Release merged manifest retains notification, precise-alarm, full-screen and foreground-service declarations; external-storage and overlay permissions are absent. The complete JavaScript suite (24 files), TypeScript and lint passed. Android, iOS and web production exports succeeded at `/tmp/geeta-permission-pages-final-export`; all 24 web routes exported. `git diff --check` passed; the two unused-variable warnings in `src/app/today.tsx` predate this change.

Real-device settings return, manufacturer/ROM coverage, 200% text, TalkBack focus/read order, small-screen layouts and locked-screen alarm delivery remain acceptance dependencies. Automated exports do not verify these. Screenshot completeness is separately pending and documented per page. No APK assembly or installation is authorized or performed.

## Alarm help entry (2026-10-10)

Normal alarm setup shows one Alarm help button instead of the expanded readiness panel, embedded troubleshooting walkthrough, and test controls. `/alarm/help` uses the same `OnboardingPermissions` pages as introduction setup with a local cursor. It starts at the first applicable permission each time, keeps introduction progress unchanged, and never schedules or changes a recurring alarm. Back traverses pages; Back on the first page, Close, and final Continue return to the previous screen. Alarm setup stays mounted, preserving unsaved time/day/tone edits. Help scrolls to the top on page changes and yields to active alarms.
