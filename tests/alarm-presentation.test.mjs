import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { canEndRitualOnExit, isRitualRoute, ritualRemovalAllowed } from '../src/navigation/alarm-presentation-policy.ts';
const require = createRequire(import.meta.url);
const { transformMainActivity } = require('../plugins/with-alarm-intents.js');

test('an authenticated exit clears presentation without ending a startup or locked ritual', () => {
  const state = { active: true, locked: false, loading: false, stage: 'gita' };
  assert.equal(canEndRitualOnExit(state, 'index', true), true);
  assert.equal(canEndRitualOnExit({ ...state, locked: true }, 'index', true), false);
  assert.equal(canEndRitualOnExit({ ...state, loading: true }, 'index', true), false);
  assert.equal(canEndRitualOnExit({ ...state, stage: 'wake' }, 'index', true), false);
  assert.equal(canEndRitualOnExit(state, 'index', false), false);
  assert.equal(canEndRitualOnExit(state, 'gita', true), false);
  assert.equal(canEndRitualOnExit({ ...state, active: false }, 'index', true), false);
});

test('only the three ritual file routes are available while locked', () => {
  for (const name of ['alarm/wake', 'breathe', 'gita']) assert.equal(isRitualRoute(name), true);
  for (const name of ['index', 'today', 'night', 'alarm/setup', 'downloads', 'saved', undefined]) assert.equal(isRitualRoute(name), false);
});
test('replacement and reset cannot expose an unrelated page', () => {
  const state = { index: 1, routes: [{ name: 'index' }, { name: 'breathe' }] };
  assert.equal(ritualRemovalAllowed({ type: 'REPLACE', payload: { name: 'gita' } }, state), true);
  assert.equal(ritualRemovalAllowed({ type: 'REPLACE', payload: { name: 'index' } }, state), false);
  assert.equal(ritualRemovalAllowed({ type: 'RESET', payload: { routes: [{ name: 'gita' }, { name: 'today' }] } }, state), false);
  assert.equal(ritualRemovalAllowed({ type: 'RESET', payload: { routes: [{ name: 'gita' }] } }, state), true);
});
test('hardware back and multi-pop check the actual destination', () => {
  const state = { index: 2, routes: [{ name: 'index' }, { name: 'breathe' }, { name: 'gita' }] };
  assert.equal(ritualRemovalAllowed({ type: 'GO_BACK' }, state), true);
  assert.equal(ritualRemovalAllowed({ type: 'POP', payload: { count: 2 } }, state), false);
  assert.equal(ritualRemovalAllowed({ type: 'POP_TO_TOP' }, state), false);
  assert.equal(ritualRemovalAllowed({ type: 'UNKNOWN' }, state), false);
  assert.equal(ritualRemovalAllowed({ type: 'UNKNOWN', payload: { name: 'gita' } }, state), false);
  assert.equal(ritualRemovalAllowed({ type: 'REPLACE', payload: { name: 'gita' } }, undefined), false);
});
test('prebuild adds the single-host lifecycle hooks without replacing the React delegate', () => {
  const original = 'import android.os.Bundle\nclass MainActivity : ReactActivity() {\n override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(null) }\n override fun createReactActivityDelegate() = ReactActivityDelegateWrapper()\n}';
  const result = transformMainActivity(original, 'kt');
  assert.ok(result.indexOf('setIntent(intent)') < result.indexOf('super.onNewIntent(intent)'));
  assert.ok(result.indexOf('AlarmPresentation.prepare(this, intent)', result.indexOf('override fun onCreate')) < result.indexOf('super.onCreate(null)'));
  assert.match(result, /AlarmPresentation.attach\(this\)/);
  assert.match(result, /AlarmPresentation.detach\(this\)/);
  assert.match(result, /createReactActivityDelegate\(\) = ReactActivityDelegateWrapper\(\)/);
  assert.equal(transformMainActivity(result, 'kt'), result);
  assert.throws(() => transformMainActivity(original.replace('override fun onCreate', 'override fun onResume() {}\n override fun onCreate'), 'kt'), /Review existing/);
});
