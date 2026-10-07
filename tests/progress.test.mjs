import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { applyReceipts, dayKey, dayDistance, emptyDailyProgress, parseDailyProgress, prepareTimezone, settle, shiftDay, validReceipt, createProgressWriter, migrateDailyProgress, activityPoints, pointsEntryLabel } from '../src/features/progress/model.ts';
import * as legacy from '../src/features/progress/legacy-model.ts';
import { progressTransaction } from '../src/features/progress/transactions.ts';
import { withQuizReward } from '../src/features/progress/quiz-receipts.ts';
const now = date => new Date(`${date}T18:00:00Z`);
const initial = () => emptyDailyProgress(new Date('2026-01-01T00:00:00Z'), 'UTC');
const quiz = (date, id = date) => ({ id: `quiz:${id}`, kind: 'quiz', completedAt: `${date}T12:00:00Z` });
const ritual = (date, id = date) => ({ id: `ritual:${id}`, kind: 'ritual', startedAt: `${date}T06:00:00Z`, breathingAt: `${date}T06:05:00Z`, completedAt: `${date}T06:10:00Z` });
const earn = (p, date) => applyReceipts(p, [quiz(date), ritual(date)], now(date));
const roundtrip = p => { assert.deepEqual(parseDailyProgress(JSON.stringify(p), now(p.lastObserved), 'Asia/Kolkata'), p); return p; };
test('first daily goal requires both activities in either order and activates only once', () => {
  for (const events of [[quiz('2026-01-01'), ritual('2026-01-01')], [ritual('2026-01-01'), quiz('2026-01-01')]]) {
    let p = initial(); p = applyReceipts(p, [events[0]], now('2026-01-01'));
    assert.equal(p.balance, 10); assert.equal(p.activated, null); roundtrip(p);
    p = applyReceipts(p, events, now('2026-01-01'));
    assert.equal(p.balance, 20); assert.equal(p.current, 1); assert.equal(p.total, 1);
    assert.equal(p.activated, '2026-01-01'); roundtrip(p);
    assert.deepEqual(applyReceipts(p, events, now('2026-01-01')), p);
  }
});
test('no pre-activation penalties, no historical or future rewards', () => {
  let p = settle(initial(), '2026-01-20');
  assert.equal(p.ledger.length, 0); assert.equal(p.balance, 0);
  p = applyReceipts(p, [quiz('2026-01-01'), ritual('2026-01-01'), quiz('2026-01-21'), ritual('2026-01-21')], now('2026-01-20'));
  assert.equal(p.total, 0);
  p = earn(p, '2026-01-20'); assert.equal(p.balance, 20); roundtrip(p);
});
test('every missed day deducts ten after activation and today remains open', () => {
  const p = earn(initial(), '2026-01-01');
  const tomorrow = settle(p, '2026-01-02'); assert.equal(tomorrow.balance, 20); assert.equal(tomorrow.current, 1);
  const missed = settle(tomorrow, '2026-01-04'); assert.equal(missed.balance, 0); assert.equal(missed.current, 0); assert.equal(missed.best, 1);
  assert.deepEqual(missed.ledger.at(-1), { id: 'missed:2026-01-02:2026-01-03', kind: 'missed', rule: 'inactive-only', from: '2026-01-02', to: '2026-01-03', amount: -20, days: 2 });
  assert.deepEqual(settle(missed, '2026-01-04'), missed);
  const restarted = earn(missed, '2026-01-04'); assert.equal(restarted.current, 1); assert.equal(restarted.balance, 20); roundtrip(restarted);
});
test('deductions stop at zero and do not turn into a debt', () => {
  const missed = settle(earn(initial(), '2026-01-01'), '2026-02-01');
  assert.equal(missed.balance, 0); assert.equal(missed.ledger.at(-1).amount, -20); assert.equal(missed.ledger.at(-1).days, 30);
  const next = settle(missed, '2026-02-02'); assert.equal(next.balance, 0); assert.equal(next.ledger.at(-1).amount, -20); assert.equal(next.ledger.length, 3); assert.equal(next.ledger.at(-1).days, 31);
  assert.equal(earn(next, '2026-02-02').balance, 20); roundtrip(next);
});
test('milestone bonuses are one-time lifetime awards across new streaks', () => {
  let p = initial();
  for (let i = 0; i < 30; i++) p = earn(p, shiftDay('2026-01-01', i));
  assert.equal(p.balance, 740); assert.equal(p.current, 30); assert.equal(p.best, 30);
  assert.deepEqual(p.milestones, [7, 30]); roundtrip(p);
  p = settle(p, '2026-02-02');
  for (let i = 0; i < 30; i++) p = earn(p, shiftDay('2026-02-02', i));
  assert.equal(p.ledger.filter(e => e.kind === 'milestone').length, 2);
  assert.equal(p.total, 60); roundtrip(p);
});
test('partial days keep their points without deductions but different-day halves cannot combine', () => {
  let p = earn(initial(), '2026-01-01');
  p = applyReceipts(p, [quiz('2026-01-02')], now('2026-01-02'));
  p = applyReceipts(p, [ritual('2026-01-03')], now('2026-01-03'));
  assert.equal(p.balance, 40); assert.equal(p.current, 0); assert.equal(p.total, 1);
  assert.equal(p.ledger.filter(e => e.kind === 'missed').length, 0);
  p = applyReceipts(p, [quiz('2026-01-03')], now('2026-01-03')); assert.equal(p.balance, 50); assert.equal(p.current, 1); roundtrip(p);
});
test('pending receipts replay chronologically before missed-day settlement', () => {
  let p = earn(initial(), '2026-01-01');
  p = applyReceipts(p, [quiz('2026-01-03'), ritual('2026-01-02'), quiz('2026-01-02'), ritual('2026-01-03')], now('2026-01-05'));
  assert.equal(p.balance, 50); assert.equal(p.total, 3); assert.equal(p.best, 3); assert.equal(p.current, 0);
  const replayed = applyReceipts(p, [quiz('2026-01-03'), ritual('2026-01-03')], now('2026-01-05'));
  assert.deepEqual(replayed, p); roundtrip(p);
});
test('ritual must have ordered timestamps and all stages on one day', () => {
  assert.equal(validReceipt({ ...ritual('2026-01-01'), startedAt: undefined }), false);
  assert.equal(validReceipt({ ...ritual('2026-01-01'), breathingAt: '2026-01-01T15:00:00Z' }), false);
  const overnight = { ...ritual('2026-01-02'), startedAt: '2026-01-01T23:50:00Z' };
  const p = applyReceipts(initial(), [overnight, quiz('2026-01-02')], now('2026-01-02'));
  assert.equal(p.total, 0); assert.equal(p.days['2026-01-02'].ritual, false);
});
test('backward clock cannot award, deduct or reopen settled dates', () => {
  let p = earn(initial(), '2026-01-01'); p = settle(p, '2026-01-04');
  assert.deepEqual(applyReceipts(p, [quiz('2026-01-02'), ritual('2026-01-02')], now('2026-01-02')), p);
  assert.equal(earn(p, '2026-01-04').balance, 20);
});
test('calendar arithmetic handles leap days, year boundaries, fixed timezone and DST', () => {
  assert.equal(shiftDay('2028-02-28', 1), '2028-02-29'); assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(dayDistance('2028-02-28', '2028-03-01'), 2);
  assert.equal(dayKey(new Date('2026-01-01T20:00:00Z'), 'Asia/Kolkata'), '2026-01-02');
  assert.equal(dayKey(new Date('2026-03-08T07:30:00Z'), 'America/New_York'), '2026-03-08');
  assert.equal(dayKey(new Date('2026-11-01T06:30:00Z'), 'America/New_York'), '2026-11-01');
});
test('timezone follows the device before first reward, then remains fixed', () => {
  const q = { ...quiz('2026-01-01'), completedAt: '2026-01-01T23:00:00Z' };
  const r = { ...ritual('2026-01-02'), startedAt: '2026-01-02T01:00:00Z', breathingAt: '2026-01-02T01:05:00Z', completedAt: '2026-01-02T01:10:00Z' };
  let p = applyReceipts(initial(), [q], new Date('2026-01-01T23:30:00Z'));
  p = applyReceipts(p, [r], new Date('2026-01-02T02:00:00Z')); assert.equal(p.total, 0);
  p = prepareTimezone(p, 'Asia/Kolkata', new Date('2026-01-02T02:00:00Z'));
  assert.equal(p.total, 0); assert.equal(p.balance, 20); assert.equal(p.timezone, 'UTC');
  assert.equal(p.preActivation.length, 0); roundtrip(p);
  assert.deepEqual(prepareTimezone(p, 'UTC', now('2026-01-02')), p);
});
test('pre-activation timezone changes do not backfill past rewards', () => {
  const q = { ...quiz('2026-01-01'), completedAt: '2026-01-01T23:00:00Z' };
  const r = { ...ritual('2026-01-02'), startedAt: '2026-01-02T01:00:00Z', breathingAt: '2026-01-02T01:05:00Z', completedAt: '2026-01-02T01:10:00Z' };
  let p = applyReceipts(initial(), [q, r], now('2026-01-02'));
  p = prepareTimezone(p, 'Asia/Kolkata', now('2026-01-03'));
  assert.equal(p.balance, 20); assert.equal(p.activated, null); assert.equal(p.timezone, 'UTC'); roundtrip(p);
  p = earn(p, '2026-01-04'); assert.equal(p.balance, 40); roundtrip(p);
});
test('all completed quiz modes create an atomic source receipt; old results do not', () => {
  for (const mode of ['journey', 'quick', 'revision', 'together', 'turns']) {
    const previous = { active: { id: mode, mode, phase: 'feedback' }, history: [] };
    const next = { active: { id: mode, mode, phase: 'results' }, history: [{ id: mode }] };
    const recorded = withQuizReward(previous, next, '2026-01-01T12:00:00Z');
    assert.deepEqual(recorded.pendingRewards, [{ id: `quiz:${mode}`, kind: 'quiz', completedAt: '2026-01-01T12:00:00Z' }]);
    assert.equal(next.pendingRewards, undefined);
    assert.equal(withQuizReward(recorded, recorded, '2026-01-02T12:00:00Z'), recorded);
    assert.equal(withQuizReward({ ...previous, history: next.history }, next, '2026-01-02T12:00:00Z'), next);
    assert.equal(withQuizReward({ ...previous, active: null }, next, '2026-01-02T12:00:00Z'), next);
  }
});
test('large absence is represented as a range rather than one record per day', () => {
  const p = settle(earn(initial(), '2026-01-01'), '2099-01-01');
  assert.equal(p.ledger.length, 3); assert.equal(p.balance, 0); assert.ok(p.ledger[2].days > 25000); roundtrip(p);
});
test('corrupt and incompatible snapshots fail without a reset', () => {
  const p = earn(initial(), '2026-01-01');
  for (const changed of [{ ...p, version: 3 }, { ...p, balance: 500 }, { ...p, timezone: 'bad/zone' }, { ...p, days: { '2026-02-30': { quiz: true, ritual: true, rewarded: true } } }, { ...p, ledger: [...p.ledger, p.ledger[0]] }]) assert.throws(() => parseDailyProgress(JSON.stringify(changed), now('2026-01-01'), 'UTC'));
  assert.throws(() => parseDailyProgress('{bad', now('2026-01-01'), 'UTC'));
});
test('serialized persistence publishes only after success and recovers after failure', async () => {
  let saved = null, published = initial(), fail = true;
  const writer = createProgressWriter(async raw => { if (fail) throw new Error('disk'); saved = raw; });
  const operation = () => writer.run(async () => { const next = earn(published, '2026-01-01'); await writer.save(next); published = next; });
  await assert.rejects(operation()); assert.equal(published.balance, 0);
  fail = false; await Promise.all([operation(), operation()]); assert.equal(published.balance, 20); assert.equal(JSON.parse(saved).balance, 20);
});
test('source completion saves cannot interleave with settlement reads', async () => {
  const order = []; let release;
  const gate = new Promise(resolve => { release = resolve; });
  const source = progressTransaction(async () => { order.push('source-start'); await gate; order.push('source-saved'); });
  const settle = progressTransaction(async () => { order.push('settle-read'); });
  await Promise.resolve(); release(); await Promise.all([source, settle]);
  assert.deepEqual(order, ['source-start', 'source-saved', 'settle-read']);
  await assert.rejects(progressTransaction(async () => { throw new Error('failed'); }));
  assert.equal(await progressTransaction(async () => 42), 42);
});
test('native receipts exclude tests and require verified occurrence and presentation stage', async () => {
  const native = await readFile(new URL('../modules/morning-alarm/android/src/main/java/expo/modules/morningalarm/RitualRewards.kt', import.meta.url), 'utf8');
  assert.match(native, /createDeviceProtectedStorageContext/); assert.match(native, /p.getBoolean\("test", true\)/);
  assert.match(native, /p.getString\("id", null\) != id/); assert.match(native, /\["stage"\] != stage/);
  assert.match(native, /!p.contains\("breathingAt"\)/); assert.match(native, /putString\("pending", pending.toString\(\)\).commit/);
  assert.match(native, /!p.contains\("wakeAt"\)/);
  const service = await readFile(new URL('../modules/morning-alarm/android/src/main/java/expo/modules/morningalarm/AlarmService.kt', import.meta.url), 'utf8');
  assert.match(service, /AlarmStore.scheduledAt\(this\).takeIf/);
});

test('different receipt IDs cannot farm task points; single-activity profiles have no deductions', () => {
  let p = applyReceipts(initial(), [quiz('2026-01-01', 'A'), quiz('2026-01-01', 'B')], now('2026-01-01'));
  assert.equal(p.balance, 10); assert.equal(p.ledger.length, 1); assert.equal(activityPoints(p, '2026-01-01', 'quiz'), 10);
  p = settle(p, '2026-02-01'); assert.equal(p.balance, 10); assert.equal(p.current, 0); assert.equal(p.activated, null);
  p = applyReceipts(p, [ritual('2026-02-01')], now('2026-02-01'));
  assert.equal(p.balance, 20); assert.equal(p.activated, null); roundtrip(p);
});

test('mixed partial and inactive days deduct only inactive gaps and preserve best streak', () => {
  let p = earn(initial(), '2026-01-01');
  p = applyReceipts(p, [quiz('2026-01-02'), ritual('2026-01-04')], now('2026-01-04'));
  assert.equal(p.balance, 30); assert.equal(p.best, 1); assert.equal(p.current, 0);
  assert.deepEqual(p.ledger.filter(e => e.kind === 'missed').map(e => [e.from, e.to, e.amount]), [['2026-01-03', '2026-01-03', -10]]);
  p = settle(p, '2026-01-05'); assert.equal(p.balance, 30); roundtrip(p);
});

const legacyInitial = () => legacy.emptyDailyProgress(new Date('2026-01-01T00:00:00Z'), 'UTC');
const legacyEarn = (p, date) => legacy.applyReceipts(p, [quiz(date), ritual(date)], now(date));

test('migration validates old records, retains balances and legacy awards, and never backfills partials', () => {
  let old = legacyEarn(legacyInitial(), '2026-01-01');
  old = legacy.applyReceipts(old, [quiz('2026-01-02')], now('2026-01-02'));
  const raw = JSON.stringify(old);
  assert.deepEqual(parseDailyProgress(raw, now('2026-01-02'), 'UTC'), old);
  let p = migrateDailyProgress(old, [], now('2026-01-02'), 'UTC');
  assert.equal(p.version, 2); assert.equal(p.balance, 20); assert.equal(p.policyChangedAt, now('2026-01-02').toISOString());
  assert.equal(activityPoints(p, '2026-01-01', 'quiz'), 10); assert.equal(activityPoints(p, '2026-01-02', 'quiz'), 0);
  assert.equal(JSON.stringify(old), raw); roundtrip(p);
  p = applyReceipts(p, [quiz('2026-01-02', 'new')], new Date('2026-01-02T20:00:00Z'));
  assert.equal(p.balance, 20); // Receipt still predates the cutover.
  const newQuiz = { ...quiz('2026-01-02', 'after-update'), completedAt: '2026-01-02T19:00:00Z' };
  p = applyReceipts(p, [newQuiz], new Date('2026-01-02T20:00:00Z'));
  assert.equal(p.balance, 30);
  const newRitual = { ...ritual('2026-01-02'), startedAt: '2026-01-02T19:00:00Z', breathingAt: '2026-01-02T19:05:00Z', completedAt: '2026-01-02T19:10:00Z' };
  p = applyReceipts(p, [newRitual], new Date('2026-01-02T20:00:00Z'));
  assert.equal(p.balance, 40); assert.equal(p.current, 2); assert.equal(p.total, 2); roundtrip(p);
});

test('legacy daily awards cover both activities on the cutover date without duplicate payouts', () => {
  const old = legacyEarn(legacyInitial(), '2026-01-01');
  let p = migrateDailyProgress(old, [], now('2026-01-01'), 'UTC');
  const q = { ...quiz('2026-01-01', 'after-update'), completedAt: '2026-01-01T19:00:00Z' };
  p = applyReceipts(p, [q], new Date('2026-01-01T20:00:00Z'));
  assert.equal(p.balance, 20); assert.equal(p.total, 1); assert.equal(p.ledger.length, 1); roundtrip(p);
});

test('migration recovers earned pending legacy receipts and preserves old partial-day deductions', () => {
  let old = legacy.applyReceipts(legacyInitial(), [quiz('2026-01-01')], now('2026-01-01'));
  const p = migrateDailyProgress(old, [ritual('2026-01-01')], now('2026-01-02'), 'UTC');
  assert.equal(p.balance, 20); assert.equal(p.total, 1); roundtrip(p);
  old = legacy.applyReceipts(legacyEarn(legacyInitial(), '2026-01-01'), [quiz('2026-01-02')], now('2026-01-02'));
  const migrated = migrateDailyProgress(old, [], now('2026-01-03'), 'UTC');
  assert.equal(migrated.balance, 10); assert.equal(migrated.current, 0);
  assert.equal(migrated.ledger.at(-1).rule, 'legacy'); roundtrip(migrated);
  const later = settle(migrated, '2026-01-04');
  assert.equal(later.balance, 0); assert.equal(later.ledger.at(-1).rule, 'inactive-only');
  assert.equal(later.ledger.filter(e => e.kind === 'missed').length, 2); roundtrip(later);
});

test('migration refuses clock rollback and future receipts without modifying old data', () => {
  const old = legacyEarn(legacyInitial(), '2026-01-02'), raw = JSON.stringify(old);
  assert.throws(() => migrateDailyProgress(old, [], now('2026-01-01'), 'UTC'), /clock/);
  assert.throws(() => migrateDailyProgress(old, [quiz('2026-01-03')], now('2026-01-02'), 'UTC'), /clock/);
  assert.equal(JSON.stringify(old), raw);
});

test('version-2 validation rejects task farming, legacy overlap and inactive deductions on partial days', () => {
  const p = earn(initial(), '2026-01-01');
  for (const entry of [
    { ...p.ledger[0], amount: 20 },
    { ...p.ledger[0], id: 'quiz:other' },
    { id: 'daily:2026-01-01', kind: 'daily', from: '2026-01-01', to: '2026-01-01', amount: 20, days: 1 },
  ]) assert.throws(() => parseDailyProgress(JSON.stringify({ ...p, ledger: [...p.ledger, entry], balance: p.balance + entry.amount }), now('2026-01-01'), 'UTC'));
  const partial = settle(applyReceipts(p, [quiz('2026-01-02')], now('2026-01-02')), '2026-01-03');
  const deduction = { id: 'missed:2026-01-02:2026-01-02', kind: 'missed', rule: 'inactive-only', from: '2026-01-02', to: '2026-01-02', amount: -10, days: 1 };
  assert.throws(() => parseDailyProgress(JSON.stringify({ ...partial, balance: 20, ledger: [...partial.ledger, deduction] }), now('2026-01-03'), 'UTC'));
});

test('reward labels distinguish new task awards and inactive deductions from historical entries', () => {
  for (const [entry, label] of [[{ kind: 'quiz' }, 'Quiz reward'], [{ kind: 'ritual' }, 'Ritual reward'], [{ kind: 'daily' }, 'Daily reward'], [{ kind: 'missed', rule: 'legacy' }, 'Missed-day deduction'], [{ kind: 'missed', rule: 'inactive-only' }, 'Inactive-day deduction']]) assert.equal(pointsEntryLabel(entry), label);
});

test('failed migration save leaves the legacy snapshot and receipts intact for an idempotent retry', async () => {
  const old = legacy.applyReceipts(legacyInitial(), [quiz('2026-01-01')], now('2026-01-01'));
  const originalRaw = JSON.stringify(old), receipts = [ritual('2026-01-01')];
  let stored = originalRaw, acknowledged = false, fail = true;
  const writer = createProgressWriter(async raw => { if (fail) throw new Error('disk full'); stored = raw; });
  const upgrade = () => writer.run(async () => {
    const parsed = parseDailyProgress(stored, now('2026-01-02'), 'UTC');
    const next = parsed.version === 1 ? migrateDailyProgress(parsed, receipts, now('2026-01-02'), 'UTC') : applyReceipts(parsed, receipts, now('2026-01-02'));
    await writer.save(next); acknowledged = true;
  });
  await assert.rejects(upgrade(), /disk full/);
  assert.equal(stored, originalRaw); assert.equal(acknowledged, false);
  fail = false; await upgrade(); await upgrade();
  const p = JSON.parse(stored); assert.equal(p.balance, 20); assert.equal(p.ledger.length, 1); assert.equal(acknowledged, true); roundtrip(p);
});

test('timezone changes before any award rebase legacy flags without backfilling points or streaks', () => {
  const q = { ...quiz('2026-01-01'), completedAt: '2026-01-01T23:00:00Z' };
  const r = { ...ritual('2026-01-02'), startedAt: '2026-01-02T01:00:00Z', breathingAt: '2026-01-02T01:05:00Z', completedAt: '2026-01-02T01:10:00Z' };
  const old = legacy.applyReceipts(legacyInitial(), [q, r], now('2026-01-02'));
  const p = prepareTimezone(migrateDailyProgress(old, [], now('2026-01-02'), 'UTC'), 'Asia/Kolkata', now('2026-01-02'));
  assert.equal(p.balance, 0); assert.equal(p.total, 0); assert.equal(p.activated, null);
  assert.equal(p.days['2026-01-02'].quiz, true); assert.equal(p.days['2026-01-02'].ritual, true); roundtrip(p);
});

test('UI derives earned points from ledger and distinguishes activity completion from awards', async () => {
  const card = await readFile(new URL('../src/features/progress/daily-goal-card.tsx', import.meta.url), 'utf8');
  assert.match(card, /activityPoints\(p, today, ['"]quiz['"]\)/); assert.match(card, /activityPoints\(p, today, ['"]ritual['"]\)/);
  assert.doesNotMatch(card, /Daily goal complete: \+20 points\./);
  const home = await readFile(new URL('../src/app/quiz/index.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(home, /Double Lotus Coins/);
  const provider = await readFile(new URL('../src/features/progress/provider.tsx', import.meta.url), 'utf8');
  assert.match(provider, /if \(!migrating && added.length\)/);
  assert.ok(provider.indexOf('await writer.current.save(next)') < provider.indexOf('await acknowledgeRewardReceipts'));
});

test('long mixed histories remain valid through migration, partial days and inactivity', () => {
  let old = legacyInitial();
  for (let i = 0; i < 40; i++) {
    const date = shiftDay('2026-01-01', i);
    const events = i < 30 || i % 3 === 0 ? [quiz(date), ritual(date)] : i % 3 === 1 ? [quiz(date)] : [];
    old = legacy.applyReceipts(old, events, now(date));
  }
  let p = migrateDailyProgress(old, [], now('2026-02-10'), 'UTC'); roundtrip(p);
  for (let i = 0; i < 180; i++) {
    const date = shiftDay('2026-02-11', i);
    const events = i % 4 === 0 ? [quiz(date), ritual(date)] : i % 4 === 1 ? [quiz(date)] : i % 4 === 2 ? [ritual(date)] : [];
    p = applyReceipts(p, events, now(date)); roundtrip(p);
    assert.deepEqual(applyReceipts(p, events, now(date)), p);
  }
  assert.deepEqual(p.milestones, [7, 30]); assert.equal(p.best, old.best);
});
