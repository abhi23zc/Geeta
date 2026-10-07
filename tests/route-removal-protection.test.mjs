import assert from 'node:assert/strict';
import test from 'node:test';
import { createRouteRemovalProtection } from '../src/navigation/route-removal-protection.ts';

function harness() {
  let routes = [{ key: 'index-old' }], locked = true, registrations = [], prevented = 0, handled = 0;
  const guard = createRouteRemovalProtection({
    routeKey: 'index-old', getState: () => ({ routes }), shouldPrevent: () => locked,
    register: prevent => {
      // Reproduce SDK 57's exact failure condition for stale screen descriptors.
      if (prevent && routes.every(route => route.key !== 'index-old')) throw Error("Couldn't find a route with the key index-old");
      registrations.push(prevent);
    },
  });
  return { guard, registrations, replace() { routes = [{ key: 'wake-new' }]; }, unlock() { locked = false; },
    remove() { guard.beforeRemove({ preventDefault() { prevented++; } }, () => { handled++; }); },
    counts: () => ({ prevented, handled }),
  };
}
test('route replaced between render and effect cannot register a stale key', () => {
  const h = harness(); h.replace(); h.guard.refresh();
  assert.deepEqual(h.registrations, [false]); h.remove();
  assert.deepEqual(h.counts(), { prevented: 0, handled: 0 });
});
test('live locked routes retain native removal protection and callback', () => {
  const h = harness(); h.guard.refresh(); h.remove();
  assert.deepEqual(h.registrations, [true]); assert.deepEqual(h.counts(), { prevented: 1, handled: 1 });
});
test('replacement unregisters protection and stale callbacks become harmless', () => {
  const h = harness(); h.guard.refresh(); h.replace(); h.guard.refresh(); h.remove(); h.guard.dispose();
  assert.deepEqual(h.registrations, [true, false, false]);
  assert.deepEqual(h.counts(), { prevented: 0, handled: 0 });
});
test('unlock and disposal read fresh state without blocking unrelated navigation', () => {
  const h = harness(); h.guard.refresh(); h.unlock(); h.guard.refresh(); h.remove(); h.guard.dispose(); h.remove();
  assert.deepEqual(h.registrations, [true, false, false]); assert.deepEqual(h.counts(), { prevented: 0, handled: 0 });
});
