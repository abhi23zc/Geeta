import assert from 'node:assert/strict';
import test from 'node:test';
import { createSavedReplay } from '../src/services/saved-replay.ts';
function fixture() {
  let resolve, reject, eligible = true, releases = 0, plays = 0, prepares = 0;
  const busy = [], errors = [];
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const controller = createSavedReplay({ prepare: () => { prepares++; return pending; }, eligible: () => eligible, play: () => plays++, pause: () => {}, busy: v => busy.push(v), error: e => errors.push(e) });
  return { controller, resolve: () => resolve({ release: () => releases++ }), reject, hide: () => eligible = false, counts: () => ({ releases, plays, prepares }), busy, errors };
}
test('background, blur, pause and unmount invalidate preparation and release its pin once', async () => {
  for (const event of ['background', 'blur', 'pause', 'unmount']) {
    const f = fixture(), pending = f.controller.replay('id');
    if (event === 'unmount') f.controller.dispose(); else f.controller.invalidate();
    f.hide(); f.resolve(); await pending;
    assert.deepEqual(f.counts(), { releases: 1, plays: 0, prepares: 1 });
  }
});
test('foreground eligibility is rechecked even without an invalidation callback', async () => {
  const f = fixture(), pending = f.controller.replay('id'); f.hide(); f.resolve(); await pending;
  assert.equal(f.counts().plays, 0); assert.equal(f.counts().releases, 1);
});
test('synchronous guard prevents duplicate prepares; pause releases active recording once', async () => {
  const f = fixture(), pending = f.controller.replay('id'); await f.controller.replay('id'); f.resolve(); await pending;
  assert.deepEqual(f.counts(), { releases: 0, plays: 1, prepares: 1 });
  f.controller.invalidate(); f.controller.dispose(); assert.equal(f.counts().releases, 1);
});
test('stale errors do not alert or clear the busy state of a newer request', async () => {
  const f = fixture(), pending = f.controller.replay('old'); f.controller.invalidate(); f.reject(new Error('late')); await pending;
  assert.equal(f.errors.length, 0);
});
test('old completion cannot clear a new preparation or play its recording', async () => {
  const pending = [], busy = [], errors = [], played = [], released = [];
  const controller = createSavedReplay({
    prepare: id => new Promise((resolve, reject) => pending.push({ id, resolve, reject })),
    eligible: () => true, play: r => played.push(r.id), pause: () => {}, busy: v => busy.push(v), error: e => errors.push(e),
  });
  const old = controller.replay('old'); controller.invalidate(); const current = controller.replay('new');
  pending[0].resolve({ id: 'old', release: () => released.push('old') }); await old;
  assert.equal(busy.at(-1), true); assert.deepEqual(played, []); assert.deepEqual(released, ['old']);
  pending[1].resolve({ id: 'new', release: () => released.push('new') }); await current;
  assert.deepEqual(played, ['new']); assert.equal(busy.at(-1), false); assert.equal(errors.length, 0);
  controller.dispose(); assert.deepEqual(released, ['old', 'new']);
});
