import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMotionEnvironmentStore, decorativeMotionAllowed } from '../src/hooks/motion-policy.ts';

test('decorative work requires foreground, focus, and a loaded motion preference', () => {
  for (const focused of [false, true]) for (const active of [false, true]) for (const reduced of [false, true]) for (const motionReady of [false, true]) {
    assert.equal(decorativeMotionAllowed(focused, { active, reduced, motionReady }), focused && active && !reduced && motionReady);
  }
});
function fixture() {
  let active = true, resolve, activeListener, reducedListener, subscriptions = 0, removals = 0;
  const store = createMotionEnvironmentStore({
    active: () => active,
    reduced: () => new Promise(done => { resolve = done; }),
    listenActive: listener => { subscriptions++; activeListener = listener; return () => removals++; },
    listenReduced: listener => { subscriptions++; reducedListener = listener; return () => removals++; },
  });
  return { store, resolve: value => resolve(value), active: value => { active = value; activeListener(value); }, reduced: value => reducedListener(value), counts: () => ({ subscriptions, removals }) };
}
test('many consumers share listeners and stable snapshots; the last release cleans up', async () => {
  const f = fixture(); let changes = 0;
  const off1 = f.store.subscribe(() => changes++), off2 = f.store.subscribe(() => changes++);
  assert.equal(f.counts().subscriptions, 2);
  f.resolve(false); await Promise.resolve();
  assert.equal(decorativeMotionAllowed(true, f.store.getSnapshot()), true);
  const before = f.store.getSnapshot(); f.active(true);
  assert.equal(f.store.getSnapshot(), before);
  f.active(false); assert.equal(decorativeMotionAllowed(true, f.store.getSnapshot()), false);
  assert.ok(changes > 0);
  off1(); assert.equal(f.counts().removals, 0);
  off2(); assert.equal(f.counts().removals, 2);
});
test('a preference event takes precedence over an older initial read', async () => {
  const f = fixture(); const off = f.store.subscribe(() => {});
  f.reduced(true); f.resolve(false); await Promise.resolve();
  assert.equal(f.store.getSnapshot().reduced, true); off();
});
test('late reads after cleanup cannot publish or enable animations', async () => {
  const f = fixture(); let changes = 0; const off = f.store.subscribe(() => changes++);
  off(); const before = f.store.getSnapshot(), count = changes;
  f.resolve(false); await Promise.resolve();
  assert.equal(f.store.getSnapshot(), before); assert.equal(changes, count);
});
