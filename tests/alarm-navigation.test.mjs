import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlarmNavigation } from '../src/navigation/alarm-navigation.ts';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('an alarm read completed after unmount cannot navigate a newly mounting host', async () => {
  const pending = deferred();
  let replacements = 0;
  const guard = createAlarmNavigation(() => pending.promise, () => true, () => replacements++, assert.fail);
  const refresh = guard.refresh();
  guard.dispose();
  pending.resolve({ ringing: true });
  await refresh;
  assert.equal(replacements, 0);
});

test('a stopped alarm invalidates a ringing snapshot already in flight', async () => {
  const pending = deferred();
  let replacements = 0;
  const guard = createAlarmNavigation(() => pending.promise, () => true, () => replacements++, assert.fail);
  const refresh = guard.refresh();
  guard.invalidate();
  pending.resolve({ ringing: true });
  await refresh;
  assert.equal(replacements, 0);
});

test('newer foreground checks win when native reads resolve out of order', async () => {
  const old = deferred(), latest = deferred();
  let reads = 0, replacements = 0;
  const guard = createAlarmNavigation(() => ++reads === 1 ? old.promise : latest.promise, () => true, () => replacements++, assert.fail);
  const first = guard.refresh(), second = guard.refresh();
  latest.resolve({ ringing: false });
  await second;
  old.resolve({ ringing: true });
  await first;
  assert.equal(replacements, 0);
});

test('focus and the current wake route are rechecked after the asynchronous read', async () => {
  const pending = deferred();
  let focused = true, replacements = 0;
  const guard = createAlarmNavigation(() => pending.promise, () => focused, () => replacements++, assert.fail);
  const refresh = guard.refresh();
  focused = false;
  pending.resolve({ ringing: true });
  await refresh;
  assert.equal(replacements, 0);
});

test('cold start, resumed alarm, and ordinary launch only redirect while ringing', async () => {
  let ringing = true, wakeVisible = false, replacements = 0;
  const guard = createAlarmNavigation(async () => ({ ringing }), () => !wakeVisible, () => { replacements++; wakeVisible = true; }, assert.fail);
  await guard.refresh();
  await guard.refresh();
  assert.equal(replacements, 1);
  wakeVisible = false;
  ringing = false;
  await guard.refresh();
  assert.equal(replacements, 1);
  ringing = true;
  await guard.refresh();
  assert.equal(replacements, 2);
});

test('native failures are reported without leaving a rejected startup promise', async () => {
  const failure = new Error('native read failed');
  const errors = [];
  const guard = createAlarmNavigation(async () => { throw failure; }, () => true, assert.fail, error => errors.push(error));
  await guard.refresh();
  assert.deepEqual(errors, [failure]);
});
