import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { advanceListening, breathingEntryState, canCompleteGita, parseRitualCheckpoint, validNarration } from '../src/services/ritual-checkpoint.ts';

const breathe = { version: 1, sessionId: 'one', stage: 'breathe', elapsed: 35, preparation: 0, lifecycle: 'active' };
const verse = { id: '2-47', chapter: 2, verse: '47', sanskrit: 'text', transliteration: 'text', meaning: 'text', takeaway: 'text', context: 'text', reflectionPrompt: 'text', words: [] };
const narration = { audioSource: { uri: 'file:///private/audio' }, completionMs: 1000, segments: [{ kind: 'sanskrit', text: 'text', startMs: 0, endMs: 1000 }] };
const gita = { version: 1, sessionId: 'one', stage: 'gita', verse: { ...verse, narration }, positionMs: 500, playedThroughMs: 500, completionMs: 1000, readingAvailable: false, readingConfirmed: false, complete: false, paused: true };

test('checkpoints restore only the matching session and phase', () => {
  assert.deepEqual(parseRitualCheckpoint(JSON.stringify(breathe), 'one', 'breathe'), breathe);
  assert.equal(parseRitualCheckpoint(JSON.stringify(breathe), 'two', 'breathe'), null);
  assert.equal(parseRitualCheckpoint(JSON.stringify(breathe), 'one', 'gita'), null);
  for (const change of [{ elapsed: 71 }, { elapsed: -1 }, { elapsed: 1.5 }, { preparation: 4 }, { version: 2 }, { lifecycle: 'bad' }]) assert.equal(parseRitualCheckpoint(JSON.stringify({ ...breathe, ...change }), 'one', 'breathe'), null);
  assert.equal(parseRitualCheckpoint('{', 'one', 'breathe'), null);
  assert.equal(parseRitualCheckpoint(' '.repeat(65537), 'one', 'breathe'), null);
});
test('frozen Gita checkpoint validates content and completion evidence', () => {
  assert.deepEqual(parseRitualCheckpoint(JSON.stringify(gita), 'one', 'gita'), gita);
  for (const change of [{ positionMs: -1 }, { playedThroughMs: 1001 }, { complete: true }, { completionMs: 2000 }, { verse: { ...verse, words: [null] } }]) assert.equal(parseRitualCheckpoint(JSON.stringify({ ...gita, ...change }), 'one', 'gita'), null);
  assert.ok(parseRitualCheckpoint(JSON.stringify({ ...gita, complete: true, playedThroughMs: 1000 }), 'one', 'gita'));
  assert.ok(parseRitualCheckpoint(JSON.stringify({ ...gita, verse, completionMs: 0, readingAvailable: true, readingConfirmed: true, complete: true }), 'one', 'gita'));
});
test('invalid or unsafe narration does not block a text-only reading fallback', () => {
  assert.equal(validNarration(narration), true);
  for (const value of [undefined, { ...narration, completionMs: 0 }, { ...narration, audioSource: { uri: 'https://unverified/audio' } }, { ...narration, segments: [{ ...narration.segments[0], endMs: 2000 }] }]) assert.equal(validNarration(value), false);
});
const sample = (positionMs, now, playing = true, visible = true) => ({ positionMs, now, playing, visible });
test('continuous visible playback reaches the reviewed end and permits completion', () => {
  let through = 0, previous = sample(0, 0);
  for (let time = 100; time <= 1000; time += 100) {
    const next = sample(time, time, time !== 1000);
    through = advanceListening(through, previous, next, 1000); previous = next;
  }
  assert.equal(through, 1000);
  assert.equal(canCompleteGita(through, 1000, false), true);
  assert.equal(canCompleteGita(500, 1000, false), false);
  assert.equal(canCompleteGita(0, 0, false), false);
  assert.equal(canCompleteGita(0, 0, true), true);
});
test('seeks, background time, explicit pauses, and backwards clocks cannot add listening', () => {
  for (const [previous, next] of [
    [sample(100, 100), sample(900, 200)],
    [sample(100, 100), sample(900, 5000)],
    [sample(100, 100, false), sample(200, 200)],
    [sample(100, 100, true, false), sample(200, 200)],
    [sample(100, 100), sample(200, 200, true, false)],
    [sample(100, 100), sample(200, 0)],
    [sample(900, 900), sample(1000, 1000)],
  ]) assert.equal(advanceListening(100, previous, next, 1000), 100);
  assert.equal(advanceListening(100, null, sample(900, 900), 1000), 100);
});
test('screens and bridge retain occurrence guards, checkpoint serialization, and pending-points handling', () => {
  const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const wake = source('../src/app/alarm/wake.tsx');
  assert.match(wake, /clearTimeout\(holdTimerRef.current\)/);
  assert.match(wake, /addListener\('blur', cancelHold\)/);
  assert.match(wake, /state.sessionId !== session.current/);
  const gitaSource = source('../src/app/gita.tsx');
  assert.match(gitaSource, /setPointsPending\(!\(await refreshRewards\(\)\)\)/);
  assert.match(gitaSource, /disabled=\{!canCompleteGita/);
  const alarm = source('../src/services/alarm.ts');
  assert.match(alarm, /checkpointTail.then/);
  assert.match(alarm, /snapshot.scheduleStatus === 'scheduled'/);
  const guard = source('../src/navigation/alarm-navigation-guard.tsx');
  assert.match(guard, /ritualRouteTarget\(getAlarmPresentationState\(\), route.name\)/);
  assert.match(guard, /getAlarmPresentationState\(\).sessionId === leavingSession/);
  const native = source('../modules/morning-alarm/android/src/main/java/expo/modules/morningalarm/AlarmPresentation.kt');
  assert.match(native, /next != stage\(activity\) -> "stage"/);
  assert.match(native, /AlarmPolicy.stageAllowed/);
});

test('unfinished breathing reopens at Get Ready without using saved partial progress', () => {
  for (const checkpoint of [null, breathe, { ...breathe, elapsed: 7, lifecycle: 'paused' }, { ...breathe, elapsed: 0, preparation: 1, lifecycle: 'preparing' }]) {
    const before = checkpoint && structuredClone(checkpoint);
    assert.deepEqual(breathingEntryState(checkpoint), { lifecycle: 'preparing', elapsed: 0, preparation: 3 });
    assert.deepEqual(checkpoint, before);
  }
});
test('completed breathing keeps completion and existing Gita continuation', () => {
  assert.deepEqual(breathingEntryState({ ...breathe, elapsed: 70, lifecycle: 'complete' }), { lifecycle: 'complete', elapsed: 70, preparation: 0 });
});
