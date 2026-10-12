import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { bootstrapOnboarding, createOnboardingWriter, coreAlarmReady, EXISTING_INSTALL_KEYS, introductionRoute, needsIntroduction, nextIntroductionStep, ONBOARDING_KEY, ONBOARDING_STEPS, OnboardingRecordError, parseOnboarding } from '../src/features/onboarding/model.ts';
import { createOnboardingScheduler } from '../src/features/onboarding/scheduling.ts';
import { DEVICE_GUIDES, deviceGuideId, GUIDE_EXAMPLES, directGuideExample, guideExampleForSetting, screenshotDimensions } from '../src/features/onboarding/guide-data.ts';
import { walkthroughPages, nextPermissionPage, missingRequiredPage, permissionPages, permissionPageIds, permissionPageReady, permissionPageCanContinue, resolvePermissionPage, accessDeadline } from '../src/features/onboarding/permission-model.ts';
import { catalog, translate } from '../src/i18n/translations.ts';
import { createRitualRouteRestoration } from '../src/navigation/ritual-route-restoration.ts';

const fresh = () => ({ version: 1, step: 'welcome', completed: false, replaying: false });
const draft = () => ({ time: '06:30', days: ['mon', 'wed'], tone: 'gita' });
function memory(entries = []) {
  const values = new Map(entries), writes = [];
  return { values, writes, getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { writes.push(key); values.set(key, value); } };
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

const access = (sdkInt = 34, manufacturer = 'Xiaomi') => ({ sdkInt, manufacturer, notifications: true, exactAlarm: true, notificationChannelEnabled: true, notificationChannelReady: true, fullScreenIntent: true, batteryRestricted: false });
test('all applicable granted pages stay present and maintain version-specific order', () => {
  for (const sdk of [25, 26, 30, 31, 33, 34, 37]) {
    const expected = ['notifications', ...(sdk >= 31 ? ['exact'] : []), ...(sdk >= 26 ? ['channel'] : []), ...(sdk >= 34 ? ['fullscreen'] : []), 'permanent', 'lockscreen', 'background-popup', 'startup', 'battery', 'vibration'];
    assert.deepEqual(permissionPageIds(access(sdk)), expected);
    assert.deepEqual(permissionPageIds({ ...access(sdk), notifications: false, exactAlarm: false, notificationChannelReady: false, fullScreenIntent: false, batteryRestricted: true }), expected);
  }
});
test('denial and grant change readiness without moving the explicit cursor', () => {
  const status = access(), reviews = { reviews: {} };
  for (const page of permissionPages(status).filter(page => page.native)) {
    const denied = { ...status, notifications: false, exactAlarm: false, notificationChannelReady: false, fullScreenIntent: false };
    assert.equal(permissionPageReady(page, denied, reviews), false);
    assert.equal(permissionPageReady(page, status, reviews), true);
    assert.equal(resolvePermissionPage(permissionPageIds(denied), page.id), page.id);
    assert.equal(resolvePermissionPage(permissionPageIds(status), page.id), page.id);
  }
});
test('legacy and inapplicable cursor records resolve to the first permission page', () => {
  const ids = permissionPageIds(access(30));
  assert.equal(resolvePermissionPage(ids), 'notifications');
  assert.equal(resolvePermissionPage(ids, 'fullscreen'), 'notifications');
  assert.equal(resolvePermissionPage(ids, 'battery'), 'battery');
});
test('confirmation and unavailability permit Next but cannot grant native access', () => {
  const status = access(), pages = permissionPages(status);
  for (const review of ['confirmed', 'unavailable']) {
    const record = { reviews: Object.fromEntries(pages.map(page => [page.id, review])) };
    for (const page of pages.filter(page => !page.native)) assert.equal(permissionPageReady(page, status, record), true);
    assert.equal(permissionPageReady(pages[0], { ...status, notifications: false }, record), false);
  }
});
test('Next and Back persist through restart without publishing a failed cursor write', async () => {
  const initial = { ...fresh(), step: 'permissions', draft: draft() };
  const storage = memory(), published = [];
  const write = createOnboardingWriter(storage, initial, record => published.push(record));
  await write(value => ({ ...value, permissionPageId: 'exact' }));
  await write(value => ({ ...value, permissionPageId: 'notifications' }));
  assert.equal((await bootstrapOnboarding(storage, async () => null)).permissionPageId, 'notifications');
  storage.setItem = async () => { throw new Error('storage'); };
  await assert.rejects(write(value => ({ ...value, permissionPageId: 'channel' })));
  assert.equal(published.at(-1).permissionPageId, 'notifications');
  assert.deepEqual(parseOnboarding(JSON.stringify(initial)), initial);
});
test('access reads time out without publishing a late result and can be retried', async () => {
  const read = deferred(), published = [];
  const attempt = accessDeadline(read.promise, 5).then(value => published.push(value));
  await assert.rejects(attempt, /access-timeout/);
  read.resolve({ notifications: true }); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(published, []);
  assert.deepEqual(await accessDeadline(Promise.resolve({ notifications: true }), 5), { notifications: true });
  await assert.rejects(accessDeadline(Promise.reject(new Error('native unavailable')), 5), /native unavailable/);
});
test('screenshots use manufacturer captures when available and fallback screenshots when missing', () => {
  // Direct captures preserve brand specificity
  assert.equal(directGuideExample('samsung', 'exact'), 'samsung-exact');
  assert.equal(directGuideExample('samsung', 'battery'), 'samsung-battery');
  assert.equal(directGuideExample('samsung', 'notifications'), null);
  assert.equal(directGuideExample('oppo', 'startup'), 'oppo-autostart');
  assert.equal(directGuideExample('oppo', 'battery'), 'oppo-battery');
  assert.equal(directGuideExample('google', 'notifications'), null);

  // Fallback screenshots provide coverage for missing screens
  for (const brand of ['google', 'pixel', 'honor', 'unknown']) {
    assert.equal(guideExampleForSetting(brand, 'notifications'), 'xiaomi-miui14-notifications');
    assert.equal(guideExampleForSetting(brand, 'exact'), 'xiaomi-miui14-exact');
    assert.equal(guideExampleForSetting(brand, 'channel'), 'xiaomi-miui14-channel');
    assert.equal(guideExampleForSetting(brand, 'fullscreen'), 'android-fullscreen');
    assert.equal(guideExampleForSetting(brand, 'startup'), 'xiaomi-miui14-startup');
    assert.equal(guideExampleForSetting(brand, 'battery'), 'xiaomi-battery');
  }

  // Brand-specific screenshots take precedence over fallbacks
  assert.equal(guideExampleForSetting('samsung', 'exact'), 'samsung-exact');
  assert.equal(guideExampleForSetting('samsung', 'battery'), 'samsung-battery');
  assert.equal(guideExampleForSetting('samsung', 'notifications'), 'xiaomi-miui14-notifications');
  assert.equal(guideExampleForSetting('samsung', 'channel'), 'xiaomi-miui14-channel');
  assert.equal(guideExampleForSetting('samsung', 'fullscreen'), 'android-fullscreen');

  assert.equal(guideExampleForSetting('oppo', 'startup'), 'oppo-autostart');
  assert.equal(guideExampleForSetting('oppo', 'battery'), 'oppo-battery');
  assert.equal(guideExampleForSetting('oppo', 'notifications'), 'xiaomi-miui14-notifications');

  assert.equal(guideExampleForSetting('realme', 'startup'), 'realme-battery');
  assert.equal(guideExampleForSetting('realme', 'battery'), 'realme-battery');

  assert.equal(guideExampleForSetting('oneplus', 'startup'), 'oneplus-battery');
  assert.equal(guideExampleForSetting('oneplus', 'battery'), 'xiaomi-battery');

  assert.equal(guideExampleForSetting('vivo', 'battery'), 'vivo-background');
  assert.equal(guideExampleForSetting('vivo', 'startup'), 'xiaomi-miui14-startup');

  assert.equal(guideExampleForSetting('huawei', 'startup'), 'huawei-autostart');
  assert.equal(guideExampleForSetting('huawei', 'battery'), 'xiaomi-battery');
});
test('portrait and landscape screenshot sizes remain contained on narrow phones and large displays', () => {
  for (const availableWidth of [160, 240, 280, 320, 600]) for (const maximumHeight of [160, 224, 260]) {
    for (const source of [{ width: 532, height: 1005 }, { width: 900, height: 762 }, { width: 600, height: 451 }]) {
      const size = screenshotDimensions(availableWidth, maximumHeight, source);
      assert.ok(size.width <= availableWidth && size.height <= maximumHeight + 1e-8);
      assert.ok(Math.abs(size.width / size.height - source.width / source.height) < 1e-8);
    }
  }
});
test('simplified permission copy and corrected silent-channel guidance exist in all three languages', () => {
  for (const key of ['Alarm setup', 'Alarm help', 'Allow alarm notifications', 'Allow precise alarms', 'Enable alarm notifications', 'Save my alarm', 'Samsung example. Your phone may look different.', 'Notifications were not allowed. You can try again or set up your alarm later.', GUIDE_EXAMPLES['android-channel'].instruction]) {
    assert.ok(key in catalog, key);
    for (const locale of ['en', 'hi', 'hinglish']) assert.ok(translate(key, {}, locale).trim());
  }
});

test('cold-start introduction replacement waits for navigator registration and later focus', () => {
  let focused = false, registered = false, callback, route = 'index';
  const replacements = [];
  const controller = createRitualRouteRestoration({
    target: () => introductionRoute(fresh(), route, false),
    canNavigate: () => focused,
    frame: next => { callback = next; return 1; }, cancelFrame: () => { callback = undefined; },
    replace: target => { assert.equal(registered, true); replacements.push(target); route = target; return true; },
  });
  controller.refresh(); assert.equal(callback, undefined);
  focused = true; controller.refresh(); assert.deepEqual(replacements, []);
  registered = true; callback();
  assert.deepEqual(replacements, ['onboarding']);
  controller.refresh(); assert.deepEqual(replacements, ['onboarding']);
  controller.dispose();
});
test('introduction recovery retries unavailable navigation and yields to an incoming alarm', () => {
  let available = false, alarm = false, callback, attempts = 0;
  const controller = createRitualRouteRestoration({
    target: () => introductionRoute(fresh(), 'index', alarm), canNavigate: () => true,
    frame: next => { callback = next; return 1; }, cancelFrame: () => { callback = undefined; },
    replace: () => { attempts++; return available; },
  });
  controller.refresh(); callback(); assert.equal(attempts, 1);
  available = true; controller.retry(); callback(); assert.equal(attempts, 2);
  controller.retry(); alarm = true; callback(); assert.equal(attempts, 2);
  controller.dispose();
});

test('a fresh installation saves its introduction before providers initialize defaults', async () => {
  const storage = memory();
  assert.deepEqual(await bootstrapOnboarding(storage, async () => null), fresh());
  assert.deepEqual(storage.writes, [ONBOARDING_KEY]);
  assert.deepEqual(await bootstrapOnboarding(storage, async () => ({ enabled: false })), fresh());
});
test('any previous app store, damaged previous app data, or native configuration preserves existing-user entry', async () => {
  for (const key of EXISTING_INSTALL_KEYS) {
    const storage = memory([[key, '{damaged data']]);
    const result = await bootstrapOnboarding(storage, async () => null);
    assert.equal(needsIntroduction(result), false);
    assert.equal(storage.values.get(key), '{damaged data');
    assert.deepEqual(storage.writes, [ONBOARDING_KEY]);
  }
  assert.equal((await bootstrapOnboarding(memory(), async () => ({ enabled: false }))).completed, true);
  assert.equal((await bootstrapOnboarding(memory(), async () => null, true)).completed, true);
});
test('saved step and draft take precedence over later default-provider writes and native configuration', async () => {
  const saved = { ...fresh(), step: 'permissions', draft: draft() };
  const storage = memory([[ONBOARDING_KEY, JSON.stringify(saved)], ...EXISTING_INSTALL_KEYS.map(key => [key, '{}'])]);
  assert.deepEqual(await bootstrapOnboarding(storage, async () => { throw new Error('native should not be read'); }), saved);
  assert.equal(storage.writes.length, 0);
});
test('unreadable stores and unknown schemas cannot become fresh-install decisions or overwrite data', async () => {
  for (const raw of ['{bad', 'null', JSON.stringify({ ...fresh(), version: 2 }), JSON.stringify({ ...fresh(), step: 'unknown' }), JSON.stringify({ ...fresh(), step: 'permissions', draft: { time: 'invalid' } })]) {
    const storage = memory([[ONBOARDING_KEY, raw]]);
    await assert.rejects(bootstrapOnboarding(storage, async () => null), OnboardingRecordError);
    assert.equal(storage.values.get(ONBOARDING_KEY), raw);
    assert.equal(storage.writes.length, 0);
  }
  const storage = memory(); storage.getItem = async () => { throw new Error('read failed'); };
  await assert.rejects(bootstrapOnboarding(storage, async () => null), /read failed/);
  assert.equal(storage.writes.length, 0);
  const nativeFailure = memory();
  await assert.rejects(bootstrapOnboarding(nativeFailure, async () => { throw new Error('native failed'); }), /native failed/);
  assert.equal(nativeFailure.writes.length, 0);
});
test('draft validation rejects invalid times, empty days, unknown days, and empty sounds', () => {
  for (const changes of [{ time: '25:30' }, { time: '6:30' }, { days: [] }, { days: ['holiday'] }, { tone: '' }]) {
    assert.throws(() => parseOnboarding(JSON.stringify({ ...fresh(), draft: { ...draft(), ...changes } })));
  }
  assert.deepEqual(parseOnboarding(JSON.stringify({ ...fresh(), draft: { ...draft(), days: ['mon', 'mon'] } })).draft.days, ['mon']);
});
test('transition writes serialize, publish only durable steps, and remain retryable after failure', async () => {
  const storage = memory(), events = []; let fail = true;
  const save = storage.setItem;
  storage.setItem = async (key, raw) => { if (fail) { fail = false; throw new Error('disk full'); } await save(key, raw); };
  const write = createOnboardingWriter(storage, fresh(), next => events.push(next));
  await assert.rejects(write(value => ({ ...value, step: 'language' })), /disk full/);
  assert.equal(events.length, 0);
  await Promise.all([write(value => ({ ...value, step: 'language' })), write(value => { assert.equal(value.step, 'language'); return { ...value, step: 'ritual' }; })]);
  assert.deepEqual(events.map(value => value.step), ['language', 'ritual']);
  assert.equal(parseOnboarding(storage.values.get(ONBOARDING_KEY)).step, 'ritual');
});
test('every introduction step yields to an alarm and alarm setup stays outside onboarding', () => {
  for (const step of ONBOARDING_STEPS) {
    const record = { ...fresh(), step, ...(step === 'permissions' ? { draft: draft() } : {}) };
    assert.equal(introductionRoute(record, 'index', true), null);
    assert.equal(introductionRoute(record, 'gita', true), null);
    assert.equal(introductionRoute(record, 'index', false), 'onboarding');
    assert.equal(introductionRoute(record, 'onboarding', false), null);
    assert.equal(introductionRoute(record, 'alarm/setup', false, 'onboarding'), 'onboarding');
  }
  assert.equal(introductionRoute({ ...fresh(), completed: true }, 'index', false), null);
  assert.equal(introductionRoute({ ...fresh(), completed: true, replaying: true }, 'index', false), 'onboarding');
});
test('replaying, skipping setup, and completion only write the introduction store', async () => {
  const saved = EXISTING_INSTALL_KEYS.map(key => [key, `keep:${key}`]);
  const storage = memory(saved), initial = { ...fresh(), completed: true, step: 'ready', draft: draft() };
  const write = createOnboardingWriter(storage, initial, () => {});
  await write(value => ({ ...value, replaying: true, step: 'welcome' }));
  await write(value => ({ ...value, step: 'ready' }));
  const final = await write(value => ({ ...value, replaying: false, completed: true }));
  assert.deepEqual(final.draft, initial.draft);
  for (const [key, value] of saved) assert.equal(storage.values.get(key), value);
  assert.ok(storage.writes.every(key => key === ONBOARDING_KEY));
});
function scheduling(overrides = {}) {
  const state = { schedules: 0, eligible: true, generation: 0 };
  const deps = {
    capabilities: async () => ({ notifications: true, exactAlarm: true, notificationChannelEnabled: true, notificationChannelReady: true }),
    snapshot: async () => ({ config: null, scheduled: false }), toneKey: value => value,
    schedule: async () => { state.schedules++; return { scheduled: true }; },
    eligible: () => state.eligible, generation: () => state.generation, ...overrides,
  };
  return { state, run: createOnboardingScheduler(deps) };
}
test('notification, exact-alarm and enabled channel are required; High importance is advisory', async () => {
  for (const key of ['notifications', 'exactAlarm', 'notificationChannelEnabled']) {
    const status = { notifications: true, exactAlarm: true, notificationChannelEnabled: true, notificationChannelReady: true, [key]: false };
    assert.equal(coreAlarmReady(status), false);
    const { state, run } = scheduling({ capabilities: async () => status });
    await assert.rejects(run(draft()), /needs-access/); assert.equal(state.schedules, 0);
  }
  const status = { notifications: true, exactAlarm: true, notificationChannelEnabled: true, notificationChannelReady: false };
  assert.equal(coreAlarmReady(status), true);
  const { state, run } = scheduling({ capabilities: async () => status });
  await run(draft());
  assert.equal(state.schedules, 1);
});
test('rapid scheduling commands share a flight and stale commands cannot schedule after background-and-return', async () => {
  const gate = deferred(), { state, run } = scheduling({ capabilities: () => gate.promise });
  const first = run(draft()), second = run(draft()); assert.equal(first, second);
  state.generation++; gate.resolve({ notifications: true, exactAlarm: true, notificationChannelEnabled: true, notificationChannelReady: true });
  await assert.rejects(first, /cancelled/); assert.equal(state.schedules, 0);
});
test('late scheduling success or failure after an alarm interruption cannot advance onboarding', async () => {
  for (const scheduled of [true, false]) {
    const gate = deferred(), { state, run } = scheduling({ schedule: () => gate.promise });
    const pending = run(draft());
    await new Promise(resolve => setImmediate(resolve));
    state.generation++; gate.resolve({ scheduled });
    await assert.rejects(pending, /cancelled/);
  }
});
test('a previously confirmed matching alarm is reused after introduction persistence fails', async () => {
  const { state, run } = scheduling({ snapshot: async () => ({ scheduled: true, config: { enabled: true, hour: 6, minute: 30, weekdays: ['wed', 'mon'], tone: { key: 'gita' } } }) });
  await run(draft()); await run(draft()); assert.equal(state.schedules, 0);
});
test('scheduling failures are retryable; a different recording or alarm revision is not silently reused', async () => {
  let attempts = 0;
  const { run } = scheduling({ snapshot: async () => ({ scheduled: true, config: { enabled: true, hour: 6, minute: 30, weekdays: ['mon', 'wed'], tone: { key: 'other' } } }), schedule: async () => ({ scheduled: ++attempts > 1 }) });
  await assert.rejects(run(draft()), /schedule-failed/); await run(draft()); assert.equal(attempts, 2);
});
test('available manufacturer assets have offline provenance; missing coverage stays explicit', async () => {
  const sources = JSON.parse(await readFile(new URL('../assets/onboarding/guides/sources.json', import.meta.url), 'utf8'));
  for (const guide of DEVICE_GUIDES) {
    for (const alias of guide.aliases) assert.equal(deviceGuideId(alias.toUpperCase()), guide.id);
    for (const name of guide.examples) {
      assert.ok(GUIDE_EXAMPLES[name]?.software);
      const source = sources.find(source => source.name === name); assert.ok(source, name);
      assert.ok(source.width > 0 && source.height > 0); assert.match(source.source, /^https:\/\//);
      assert.match(source.license, /CC-BY/);
      assert.equal(source.eligible, true);
      assert.ok(source.attribution && source.redistributionRights && source.softwareVersion && source.uiVariant);
      assert.ok(source.highlight.every(v => v >= 0 && v <= 1));
      assert.ok(source.highlight[0] + source.highlight[2] <= 1 && source.highlight[1] + source.highlight[3] <= 1);
      assert.ok(source.supportedBrands.includes(guide.aliases[0] === 'google' ? 'android' : guide.aliases[0]));
      assert.ok((await readFile(new URL(`../assets/onboarding/guides/${source.file}`, import.meta.url))).length > 1000);
    }
  }
  assert.equal(deviceGuideId('unknown'), 'android');
  for (const key of ['Meet Aru', 'Continue to permissions', 'Help your alarm ring reliably', 'Start using the app', 'App introduction']) {
    assert.ok(key in catalog); for (const locale of ['en', 'hi', 'hinglish']) assert.ok(translate(key, {}, locale).trim());
  }
});

test('native brand metadata distinguishes Honor from parent Huawei; older snapshots remain supported', () => {
  assert.deepEqual(permissionPages({ ...access(34, 'Huawei'), brand: 'honor' }).map(page => page.id), ['notifications', 'exact', 'channel', 'fullscreen', 'startup', 'battery']);
  assert.deepEqual(permissionPageIds({ ...access(), brand: undefined }), permissionPageIds(access()));
});
test('coverage checklist lists every page and only manufacturer-matched eligible screenshots', async () => {
  const coverage = JSON.parse(await readFile(new URL('../assets/onboarding/guides/coverage.json', import.meta.url), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('../assets/onboarding/guides/sources.json', import.meta.url), 'utf8'));
  for (const guide of coverage) {
    assert.deepEqual(guide.pages.map(page => page.id), permissionPages(access(guide.sdkInt, guide.manufacturer)).map(page => page.id));
    assert.equal(guide.complete, guide.pages.every(page => page.screenshot));
    for (const page of guide.pages) {
      assert.equal(page.screenshot, directGuideExample(guide.manufacturer, page.id));
      if (!page.screenshot) { assert.equal(page.state, 'capture-required'); continue; }
      const source = sources.find(source => source.name === page.screenshot);
      assert.equal(source.eligible, true);
      assert.ok(source.supportedSettings.includes(page.id));
      assert.ok(source.supportedBrands.includes(guide.manufacturer));
      assert.ok((await readFile(new URL(`../assets/onboarding/guides/${source.file}`, import.meta.url))).length);
    }
  }
  for (const name of ['android-notifications', 'android-channel']) assert.equal(sources.find(source => source.name === name).eligible, false);
  assert.equal(sources.find(source => source.name === 'android-fullscreen').eligible, true);
});

test('only mandatory alarm access gates Next, across device families', () => {
  for (const manufacturer of ['Vivo', 'Xiaomi', 'Samsung', 'Google', 'OPPO', 'Honor', 'unknown']) {
    const status = { ...access(34, manufacturer), notifications: false, exactAlarm: false,
      notificationChannelReady: false, fullScreenIntent: false, batteryRestricted: true };
    const pages = walkthroughPages(status);
    assert.deepEqual(pages.filter(page => page.required).map(page => page.id), ['notifications', 'exact']);
    for (const page of pages) assert.equal(permissionPageCanContinue(page, status), !page.required, page.id);
    for (const page of pages.filter(page => page.required)) {
      const key = { notifications: 'notifications', exact: 'exactAlarm' }[page.id];
      assert.equal(permissionPageCanContinue(page, { ...status, [key]: true }), true);
    }
  }
});
test('forward navigation skips granted requirements and retains every optional screen', () => {
  const status = access(), pages = walkthroughPages(status);
  assert.equal(nextPermissionPage(pages, status), 'channel');
  assert.equal(nextPermissionPage(pages, { ...status, exactAlarm: false }), 'exact');
  assert.equal(nextPermissionPage(pages, { ...status, notificationChannelReady: false }), 'channel');
  assert.deepEqual(permissionPageIds(status), pages.map(page => page.id));
  let after = 1;
  const visited = [];
  for (let id; (id = nextPermissionPage(pages, status, after));) {
    visited.push(id); after = pages.findIndex(page => page.id === id);
  }
  assert.deepEqual(visited, pages.filter(page => !page.required).map(page => page.id));
  assert.equal(missingRequiredPage(pages, status), undefined);
  assert.equal(missingRequiredPage(pages, { ...status, notifications: false }), 'notifications');
  assert.equal(missingRequiredPage(pages, { ...status, fullScreenIntent: false, batteryRestricted: true }), undefined);
  // Back uses the full list instead of forward skipping.
  assert.equal(resolvePermissionPage(permissionPageIds(status), 'exact'), 'exact');
});
test('Set up later persists completion without changing alarm drafts or other app data', async () => {
  const initial = { ...fresh(), step: 'permissions', permissionPageId: 'notifications', draft: draft() };
  const storage = memory([['geeta:daily-progress-v1', 'existing-progress']]);
  const write = createOnboardingWriter(storage, initial, () => {});
  await write(value => ({ ...value, completed: true, replaying: false, permissionPageId: undefined }));
  const saved = await bootstrapOnboarding(storage, async () => null);
  assert.equal(needsIntroduction(saved), false);
  assert.deepEqual(saved.draft, initial.draft);
  assert.equal(storage.values.get('geeta:daily-progress-v1'), 'existing-progress');
});

test('permission instructions are translated in every language', () => {
  const instructions = DEVICE_GUIDES.flatMap(guide => walkthroughPages(access(34, guide.aliases[0])).map(page => guideExampleForSetting(guide.aliases[0], page.id) ? GUIDE_EXAMPLES[guideExampleForSetting(guide.aliases[0], page.id)].instruction : page.guidance));
  for (const copy of instructions) {
    assert.ok(copy in catalog, copy);
    assert.notEqual(translate(copy, {}, 'hi'), copy);
    assert.ok(translate(copy, {}, 'hinglish').trim());
  }
});

test('all eligible offline screenshots fit half-height layouts with aligned highlights', async () => {
  const metadata = JSON.parse(await readFile(new URL('../assets/onboarding/guides/sources.json', import.meta.url), 'utf8'));
  for (const source of metadata.filter(item => item.eligible)) {
    for (const viewport of [{ width: 280, height: 480 }, { width: 320, height: 640 }, { width: 1024, height: 1366 }]) {
      const maxHeight = Math.min(420, viewport.height / 2);
      const size = screenshotDimensions(viewport.width - 48, maxHeight, source);
      assert.ok(size.width <= viewport.width - 48);
      assert.ok(size.height <= maxHeight + 1e-8);
      assert.ok(Math.abs(size.width / size.height - source.width / source.height) < 1e-8);
      if (source.highlight) {
        const [x, y, w, h] = source.highlight;
        assert.ok(x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1, source.name);
      }
    }
  }
});

test('every applicable Xiaomi Android 13 page bundles a genuine screenshot', async () => {
  const sources = JSON.parse(await readFile(new URL('../assets/onboarding/guides/sources.json', import.meta.url), 'utf8'));
  const imageLoader = await readFile(new URL('../src/features/onboarding/guide-images.ts', import.meta.url), 'utf8');
  for (const page of permissionPages(access(33, 'xiaomi'))) {
    const name = guideExampleForSetting('xiaomi', page.id);
    assert.ok(name, page.id);
    const metadata = sources.find(source => source.name === name);
    assert.ok(metadata.eligible);
    assert.ok(imageLoader.includes(metadata.file), metadata.file);
    if (name.startsWith('xiaomi-miui14-')) {
      const png = await readFile(new URL(`../assets/onboarding/guides/${metadata.file}`, import.meta.url));
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      assert.equal(png.readUInt32BE(16), metadata.width);
      assert.equal(png.readUInt32BE(20), metadata.height);
      assert.equal(metadata.brand, 'xiaomi');
      assert.ok(metadata.uiVariant.includes('M2101K7BI'));
    }
  }
  const component = await readFile(new URL('../src/features/onboarding/permission-guide.tsx', import.meta.url), 'utf8');
  assert.ok(!component.includes('Screenshot unavailable'));
});


test('the save summary and test screen are removed and legacy drafts resume at the final permission', () => {
  for (const manufacturer of ['Xiaomi', 'Samsung', 'Google', 'OPPO', 'Honor']) {
    const ids = permissionPageIds(access(34, manufacturer));
    assert.equal(ids.includes('save'), false);
    assert.equal(ids.includes('test'), false);
    assert.equal(resolvePermissionPage(ids, 'save'), ids.at(-1));
    assert.equal(resolvePermissionPage(ids, 'test'), ids.at(-1));
  }
});


test('Practice continues directly to permission guides without an alarm draft', async () => {
  assert.equal(nextIntroductionStep('practice'), 'permissions');
  const initial = { ...fresh(), step: 'practice' };
  const storage = memory();
  const write = createOnboardingWriter(storage, initial, () => {});
  const saved = await write(record => ({ ...record, step: nextIntroductionStep(record.step) }));
  assert.equal(saved.step, 'permissions');
  assert.equal(saved.draft, undefined);
  assert.deepEqual(await bootstrapOnboarding(storage, async () => null), saved);
  assert.equal(introductionRoute(saved, 'alarm/setup', false, 'onboarding'), 'onboarding');
});

test('legacy alarm introduction records resume guides while preserving drafts', () => {
  for (const alarmDraft of [undefined, draft()]) {
    const migrated = parseOnboarding(JSON.stringify({ ...fresh(), step: 'alarm', ...(alarmDraft ? { draft: alarmDraft } : {}) }));
    assert.equal(migrated.step, 'permissions');
    assert.deepEqual(migrated.draft, alarmDraft);
  }
});
