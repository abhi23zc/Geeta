import assert from 'node:assert/strict';
import test from 'node:test';
import { createRitualReadiness, identityKey } from '../src/navigation/ritual-readiness.ts';
import { alarmLanguageBootstrap } from '../src/i18n/alarm-bootstrap.ts';

const identity = { sessionId: 'one', stage: 'wake', hostGeneration: 1, coverGeneration: 1 };
function harness() {
  let focused = false, active = true, current = identity, calls = [], frames = new Map(), next = 0;
  const guard = createRitualReadiness({ identity,
    eligible: () => focused && active && identityKey(current) === identityKey(identity),
    acknowledge: async value => { calls.push(value); return { accepted: true }; },
    frame: fn => { frames.set(++next, fn); return next; },
    cancelFrame: id => frames.delete(id), onError: error => { throw error; },
  });
  return { guard, calls, frames,
    focus(value) { focused = value; value ? guard.recheck() : guard.cancel(); },
    foreground(value) { active = value; value ? guard.recheck() : guard.cancel(); },
    replace(value) { current = value; guard.dispose(); },
    async flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); },
  };
}
test('layout before focus waits for one frame and deduplicates success', async () => {
  const h = harness(); h.guard.layout(320, 640); await h.flush(); assert.equal(h.calls.length, 0);
  h.focus(true); assert.equal(h.calls.length, 0); await h.flush(); assert.deepEqual(h.calls, [identity]);
  h.guard.recheck(); h.guard.layout(320, 640); await h.flush(); assert.equal(h.calls.length, 1);
});
test('focus before layout waits for a non-zero unblocked measurement', async () => {
  const h = harness(); h.focus(true); h.guard.layout(0, 640); await h.flush(); assert.equal(h.calls.length, 0);
  h.guard.layout(320, 640); await h.flush(); assert.equal(h.calls.length, 1);
});
test('blur, background, unmount, stop, and identity replacement invalidate queued frames', async () => {
  for (const cancel of [h => h.focus(false), h => h.foreground(false), h => h.guard.dispose(), h => h.guard.cancel(), h => h.replace({ ...identity, sessionId: 'two' }), h => h.replace({ ...identity, coverGeneration: 2 })]) {
    const h = harness(); h.focus(true); h.guard.layout(320, 640);
    const stale = [...h.frames.values()][0]; cancel(h); stale(); await h.flush(); assert.equal(h.calls.length, 0);
  }
});
test('foreground return and refocus recheck retained layout', async () => {
  const h = harness(); h.focus(true); h.guard.layout(320, 640); h.foreground(false); await h.flush();
  h.foreground(true); await h.flush(); assert.equal(h.calls.length, 1);
});
test('alarm bootstrap decision retains native language and excludes direct boot or ordinary launch', () => {
  const snapshot = { active: true, validRitualIntent: true, userUnlocked: true, language: 'hi' };
  const latched = alarmLanguageBootstrap(snapshot); snapshot.active = false;
  assert.deepEqual(latched, { immediate: true, language: 'hi' });
  assert.equal(alarmLanguageBootstrap(snapshot).immediate, false);
  assert.equal(alarmLanguageBootstrap({ ...snapshot, active: true, userUnlocked: false }).immediate, false);
  assert.equal(alarmLanguageBootstrap({ ...snapshot, active: true, validRitualIntent: false }).immediate, false);
});
