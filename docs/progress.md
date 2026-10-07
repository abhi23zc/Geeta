# Daily goal, streaks and points

Open Home → Progress. The same shared totals appear in Quiz and the Gita completion screen. All copy supports English, Hindi and Hinglish.

## Rules

- A completed day requires **a real alarm-led ritual AND a completed quiz round**.
- Ritual sequence: real alarm → Start my day → finish the full breathing session → Continue to Gita → Complete today’s contemplation. These stages and the alarm occurrence must be on the same progress calendar day.
- Any complete quiz mode counts; perfect answers are not required. Quiz can be completed before or after the ritual. It remains independently accessible.
- Quiz completion earns +10 once per profile calendar day, independently of the ritual. Ritual completion earns +10 once daily, independently of quiz. Completing both totals 20; there is no extra combined reward. Repeat activities do not add points.
- Streak tracking and deductions begin on the first fully completed day. Individual activities earn points immediately, even before streak activation; historical activity is not rewarded retroactively.
- After activation, days with neither activity deduct up to 10. Partial days keep their earned points with no deduction, but still break the streak when the day ends. Unscheduled alarm days follow the same rule. Balance stops at zero.
- Today stays open until its day ends. On a missed day the current streak resets; best streak and lifetime completed days remain.
- Tree level is independent of the consecutive streak. Both activities grow one level; every ended partial or inactive day loses one level, down to zero. First arrival at level 7 awards +40; first arrival at level 30 awards +100, once per tree. Regrowth cannot repeat that tree’s bonuses. A level-30 tree closes permanently; the next calendar day starts a new seed and resets the streak.
- Manual practice, opening the app, dismissing an alarm without the full flow, test alarms, tasks and night reflection do not satisfy this goal.

## Offline reliability

The independent `geeta:daily-progress-v1` AsyncStorage key now stores a version-3 snapshot owning tree cycles, transitions, daily flags, balance, current/best streak, total completed days, milestones and a points ledger. The key stays unchanged for atomic migration. Quiz reset and language changes do not reset it. Uninstalling/clearing app data removes this local profile; there is no cloud account or restore yet.

The device timezone follows the device before the first points award, then freezes for the profile even if the combined streak has not started. Calendar arithmetic handles DST, leap days and year boundaries. The Progress screen shows that timezone. Traveling does not duplicate days. Backward dates pause changes until the date catches up. Forward clock manipulation is not securely preventable offline.

Settlement runs at load, foregrounding, before receipt processing, and within 30 seconds of a foreground date rollover. Closed-app deductions are applied on reopening, not by background jobs. Consecutive missed days are stored in a compact date range with the actual total deducted, even if deductions reached zero.

All source completion saves and reward settlement share a serialized transaction barrier. Quiz writes a receipt inside its normal durable completion snapshot; it removes it only after successful shared processing. Reset is blocked if unprocessed receipts cannot be saved. Native alarm receipts live in a separate device-protected preference store and survive ringing-state cleanup, process death and reboot. Occurrence identity, real/test status, wake acknowledgement and ordered stages are checked natively. Navigation parameters alone cannot establish eligibility.

On startup, pending receipts replay before missed days are settled. A first shared-save failure can recover from new-feature source receipts; legacy quiz histories are never backfilled. Daily flags, reward ledger and settlement cursor save together. State is published only after saving succeeds. Retry does not duplicate awards or deductions. Source acknowledgement failure leaves an idempotent receipt for retry. Invalid snapshots/outboxes are preserved and shown as an error, not silently overwritten.

## Version-1/2 migration

The frozen legacy model validates existing snapshots and processes pending source receipts under their original rules before closing already-ended days. Version 1 first upgrades through the frozen version-2 policy. A single version-3 save preserves earned balances, combined daily entries, milestones, streaks and history; it records `policyChangedAt`. Task rewards apply only to new eligible completions at/after that timestamp. Historical partial days are not backfilled, and previous combined rewards cover both activities on that date. A current-day legacy completion flag does not claim a task reward: a newly completed activity can earn its 10 points if that date is not already paid.

Legacy deductions are marked `legacy`; new inactive-only deductions are marked `inactive-only` and are never merged across the policy boundary. UI amounts come from the ledger, independently of completion flags. Migration failures preserve the old record and source receipts for Retry. Clock rollback/future receipts block migration. Migration itself does not display a new reward celebration. Do not downgrade to an older app after migration: older clients cannot read version 3.

Version-2 receipts and ended days settle under their original policy before tree migration. The imported level is the settled streak capped at 30, with existing milestone flags carried into the first tree. Tree loss applies prospectively from upgrade day; historical tree loss is never reconstructed. Historical best streaks above 30 remain valid. An imported mature tree stays visible on upgrade day, then rolls over at the next saved-timezone midnight. Migration awards no tree bonus or celebration.

## Native build requirement

The separate-points update adds no native APIs, but devices must already have the native receipt support introduced by the original progress feature. Expo Go cannot supply it. iOS/web and older Android builds still earn quiz points; ritual points and the combined streak require native alarm support. There is no fallback that treats manual practice as an actual alarm.

Reward-store failures never prevent native alarm delivery or stop/reschedule operations. If an individual stage receipt cannot save, the completion action shows a retry message. Users can leave via the existing authenticated alarm-exit flow; leaving an incomplete ritual does not earn progress.

## Verification

Automated checks: `npm run test:progress`, `npm run test:quiz`, `npm run test:language`, `npm run test:tasks`, `npm run test:content`, `npm run test:alarm-navigation`, `npm run validate:quiz`, `npx tsc --noEmit`, `npm run lint` and Android `:morning-alarm:compileDebugKotlin`.

Before release, device QA must verify:

1. Quiz alone earns 10 and real alarm-led breathing/Gita alone earns 10, each once daily. Both advance the streak without an extra 20-point award. Test alarms and manual/deep-linked rituals do not qualify.
2. Both activity orders, all quiz modes, repeated results, quiz reset and language changes.
3. Process kill after each source save, lock/unlock, reboot and recovery into the appropriate alarm stage. Interrupted breathing may need to be repeated, following the existing breathing lifecycle.
4. Partial days retain points but break the streak; only inactive days deduct points after activation. Midnight crossings, unscheduled days, multiple-day absence, zero balance, date rollback and travel/timezone changes.
5. Per-tree level-7/30 bonuses, regrowth without duplicate awards, maturity/next-day seed rollover, preserved best streak and accurate calendar/ledger displays.
6. Large text, Hindi wrapping, narrow devices, screen readers and reduced-motion preferences.
7. Existing version-1 accounts, current-day partial/complete records, migration save failure/retry and pending-receipt recovery preserve balances without backfill or duplicate rewards.

No leaderboard, redeemable points, streak freezes, new notifications or backend sync is introduced.
