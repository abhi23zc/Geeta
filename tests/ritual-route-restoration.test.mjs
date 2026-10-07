import assert from 'node:assert/strict';
import test from 'node:test';
import { ritualRouteTarget } from '../src/navigation/alarm-presentation-policy.ts';
import { createRitualRouteRestoration } from '../src/navigation/ritual-route-restoration.ts';

function frames() {
  let id = 0;
  const callbacks = new Map();
  return {
    frame: callback => { callbacks.set(++id, callback); return id; },
    cancelFrame: id => callbacks.delete(id),
    flush() { const current = [...callbacks.values()]; callbacks.clear(); current.forEach(callback => callback()); },
    count: () => callbacks.size,
  };
}
function harness(stage = 'breathe') {
  let state = { active: true, locked: false, loading: true, stage }, route = 'index', focused = false, foreground = true, owned = true;
  const replacements = [], clock = frames();
  const controller = createRitualRouteRestoration({
    frame: clock.frame, cancelFrame: clock.cancelFrame,
    target: () => ritualRouteTarget(state, route),
    canNavigate: () => focused && foreground && owned,
    replace: target => { replacements.push(target); return true; },
  });
  return { controller, replacements, flush: clock.flush, count: clock.count, focus(value) { focused = value; }, foreground(value) { foreground = value; }, owned(value) { owned = value; }, state(value) { state = { ...state, ...value }; }, route(value) { route = value; } };
}
test('saved breathing/Gita restore when focus arrives after the initial blocked render', () => {
  for (const stage of ['breathe', 'gita']) {
    const h = harness(stage); h.controller.refresh(); assert.deepEqual(h.replacements, []);
    // No change to native stage, active/loading flags, or playback is needed.
    h.focus(true); h.controller.refresh(); h.flush(); assert.deepEqual(h.replacements, [stage]);
    h.controller.refresh(); h.flush(); assert.deepEqual(h.replacements, [stage]);
  }
});
test('foreground return retries a saved phase without needing a ringing alarm', () => {
  const h = harness('gita'); h.focus(true); h.foreground(false); h.controller.refresh();
  h.foreground(true); h.controller.refresh(); h.flush(); assert.deepEqual(h.replacements, ['gita']);
});
test('late events use the latest session phase and cannot redirect an ended session', () => {
  const h = harness(); h.state({ stage: 'gita' }); h.focus(true); h.controller.refresh(); h.flush();
  assert.deepEqual(h.replacements, ['gita']);
  h.state({ active: false, stage: null, loading: false }); h.controller.refresh();
  assert.deepEqual(h.replacements, ['gita']);
});
test('unowned and disposed routes cannot enqueue replacement into another host', () => {
  const h = harness(); h.focus(true); h.owned(false); h.controller.refresh(); assert.deepEqual(h.replacements, []);
  h.owned(true); h.controller.dispose(); h.controller.refresh(); assert.deepEqual(h.replacements, []);
});
test('ordinary unlocked use stays ordinary, locked use remains contained, and ended wake returns home', () => {
  const state = { active: true, locked: false, loading: false, stage: 'gita' };
  assert.equal(ritualRouteTarget(state, 'index'), null);
  assert.equal(ritualRouteTarget({ ...state, locked: true }, 'index'), 'gita');
  assert.equal(ritualRouteTarget(state, 'gita'), null);
  assert.equal(ritualRouteTarget({ ...state, active: false }, 'alarm/wake'), 'index');
  assert.equal(ritualRouteTarget({ ...state, active: false }, 'index'), null);
});
test('an unavailable navigator can retry without poisoning subsequent focus', () => {
  let attempts = 0, available = false; const clock = frames();
  const h = createRitualRouteRestoration({ frame: clock.frame, cancelFrame: clock.cancelFrame, target: () => 'breathe', canNavigate: () => true, replace: () => { attempts++; return available; } });
  h.refresh(); clock.flush(); available = true; h.refresh(); clock.flush(); h.refresh(); clock.flush(); assert.equal(attempts, 2);
  h.retry(); clock.flush(); assert.equal(attempts, 3);
});

test('initial restoration waits until parent navigator effects can handle the action', () => {
  const clock = frames(); let registered = false, replaced = false;
  const h = createRitualRouteRestoration({ frame: clock.frame, cancelFrame: clock.cancelFrame, target: () => 'breathe', canNavigate: () => true, replace: () => { replaced = registered; return true; } });
  h.refresh(); assert.equal(replaced, false); registered = true; clock.flush(); assert.equal(replaced, true);
});
test('blur/background/disposal and phase replacement cancel pending frames', () => {
  for (const action of ['blur', 'background', 'dispose', 'phase']) {
    const h = harness(); h.focus(true); h.controller.refresh(); assert.equal(h.count(), 1);
    if (action === 'blur') { h.focus(false); h.controller.invalidate(); }
    if (action === 'background') { h.foreground(false); h.controller.invalidate(); }
    if (action === 'dispose') h.controller.dispose();
    if (action === 'phase') h.state({ stage: 'gita' });
    h.flush(); assert.deepEqual(h.replacements, []);
  }
});
