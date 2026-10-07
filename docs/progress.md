# Daily goal, streaks and points

Open Home → Progress. The same shared totals appear in Quiz and the Gita completion screen. All copy supports English, Hindi and Hinglish.

## Rules

- A completed day requires **a real alarm-led ritual AND a completed quiz round**.
- Ritual sequence: real alarm → Start my day → finish the full breathing session → Continue to Gita → Complete today’s contemplation. These stages and the alarm occurrence must be on the same progress calendar day.
- Any complete quiz mode counts; perfect answers are not required. Quiz can be completed before or after the ritual. It remains independently accessible.
- One daily reward: +20. Repeat activities do not add points.
- Tracking and deductions begin on the first fully completed day. Earlier activity is not rewarded retroactively.
- Every later missed calendar day deducts up to 10, including partial days and unscheduled alarm days. Balance stops at zero. Set a daily alarm to maintain this strict daily goal.
- Today stays open until its day ends. On a missed day the current streak resets; best streak and lifetime completed days remain.
- First 7 consecutive days: +40 bonus. First 30 consecutive days: +100 bonus. Each milestone is awarded once per local profile.
- Manual practice, opening the app, dismissing an alarm without the full flow, test alarms, tasks and night reflection do not satisfy this goal.

## Offline reliability

The independent `geeta:daily-progress-v1` AsyncStorage snapshot owns daily flags, balance, current/best streak, total completed days, milestones and a points ledger. Quiz reset and language changes do not reset it. Uninstalling/clearing app data removes this local profile; there is no cloud account or restore yet.

The device timezone follows the device before the first earned day, then freezes for the profile. Calendar arithmetic handles DST, leap days and year boundaries. The Progress screen shows that timezone. Traveling does not duplicate days. Backward dates pause changes until the date catches up. Forward clock manipulation is not securely preventable offline.

Settlement runs at load, foregrounding, before receipt processing, and within 30 seconds of a foreground date rollover. Closed-app deductions are applied on reopening, not by background jobs. Consecutive missed days are stored in a compact date range with the actual total deducted, even if deductions reached zero.

All source completion saves and reward settlement share a serialized transaction barrier. Quiz writes a receipt inside its normal durable completion snapshot; it removes it only after successful shared processing. Reset is blocked if unprocessed receipts cannot be saved. Native alarm receipts live in a separate device-protected preference store and survive ringing-state cleanup, process death and reboot. Occurrence identity, real/test status, wake acknowledgement and ordered stages are checked natively. Navigation parameters alone cannot establish eligibility.

On startup, pending receipts replay before missed days are settled. A first shared-save failure can recover from new-feature source receipts; legacy quiz histories are never backfilled. Daily flags, reward ledger and settlement cursor save together. State is published only after saving succeeds. Retry does not duplicate awards or deductions. Source acknowledgement failure leaves an idempotent receipt for retry. Invalid snapshots/outboxes are preserved and shown as an error, not silently overwritten.

## Native build requirement

Rebuild/install Android after this change; JS reload and Expo Go cannot supply the new native receipt APIs. iOS/web and older Android builds show an unavailable-goal explanation, without blocking other features. There is no fallback that treats manual practice as an actual alarm.

Reward-store failures never prevent native alarm delivery or stop/reschedule operations. If an individual stage receipt cannot save, the completion action shows a retry message. Users can leave via the existing authenticated alarm-exit flow; leaving an incomplete ritual does not earn progress.

## Verification

Automated checks: `npm run test:progress`, `npm run test:quiz`, `npm run test:language`, `npm run test:tasks`, `npm run test:content`, `npm run test:alarm-navigation`, `npm run validate:quiz`, `npx tsc --noEmit`, `npm run lint` and Android `:morning-alarm:compileDebugKotlin`.

Before release, device QA must verify:

1. A scheduled real alarm, completed breathing and Gita plus a quiz earns 20 exactly once; test alarms and manual/deep-linked practice do not.
2. Both activity orders, all quiz modes, repeated results, quiz reset and language changes.
3. Process kill after each source save, lock/unlock, reboot and recovery into the appropriate alarm stage. Interrupted breathing may need to be repeated, following the existing breathing lifecycle.
4. Midnight crossings, unscheduled days, multiple-day absence, zero balance, date rollback and travel/timezone changes.
5. 7-/30-day bonuses, preserved best streak and accurate calendar/ledger displays.
6. Large text, Hindi wrapping, narrow devices, screen readers and reduced-motion preferences.

No leaderboard, redeemable points, streak freezes, new notifications or backend sync is introduced.
