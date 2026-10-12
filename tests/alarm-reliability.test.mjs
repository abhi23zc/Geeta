import test from 'node:test';
import assert from 'node:assert/strict';
import { RELIABILITY_KEY, createReliabilityWriter, freshReliability, loadReliability, parseReliability, pendingReliabilityStep, reliabilityComplete, reliabilityIdentity, reliabilitySteps } from '../src/features/onboarding/alarm-reliability-model.ts';
import { catalog, translate } from '../src/i18n/translations.ts';
const access = (manufacturer = 'Xiaomi', sdkInt = 34) => ({ manufacturer, sdkInt, notifications: true, exactAlarm: true, notificationChannelReady: true, fullScreenIntent: true, batteryRestricted: false });

test('missing standard access is ordered and respects Android version boundaries', () => {
  for (const sdk of [24, 26, 30, 31, 33, 34, 36]) {
    const status = { ...access('Google', sdk), notifications: false, exactAlarm: false, notificationChannelReady: false, fullScreenIntent: false };
    assert.deepEqual(reliabilitySteps(status).map(s => s.id), ['notifications', ...(sdk >= 31 ? ['exact'] : []), ...(sdk >= 26 ? ['channel'] : []), ...(sdk >= 34 ? ['fullscreen'] : [])]);
  }
});
test('aliases have matching requirements, distinct brands retain their profiles', () => {
  for (const aliases of [['Xiaomi', ' Redmi ', 'POCO'], ['Vivo', 'iQOO']]) {
    const expected = reliabilitySteps(access(aliases[0]));
    for (const brand of aliases) assert.deepEqual(reliabilitySteps(access(brand)), expected);
  }
  assert.notEqual(reliabilityIdentity(access('OPPO')), reliabilityIdentity(access('Realme')));
  assert.notEqual(reliabilityIdentity(access('Huawei')), reliabilityIdentity(access('Honor')));
  assert.ok(reliabilitySteps(access('Redmi')).find(s => s.id === 'popup').guidance.includes('Show on Lock screen'));
});
test('generic phones do not inherit proprietary switches or require universal battery exemption', () => {
  for (const manufacturer of ['Google', 'Motorola', 'Nothing', '']) {
    assert.deepEqual(reliabilitySteps(access(manufacturer)), []);
    assert.deepEqual(reliabilitySteps({ ...access(manufacturer), batteryRestricted: true }).map(s => s.id), ['battery']);
  }
});
test('manual confirmation completes review but never verifies missing native permission', () => {
  const status = access(), record = freshReliability(reliabilityIdentity(status));
  const steps = reliabilitySteps(status);
  assert.equal(reliabilityComplete(steps, record), false);
  for (const step of steps) record.reviews[step.id] = 'confirmed';
  assert.equal(reliabilityComplete(steps, record), true);
  record.reviews.popup = 'unavailable';
  assert.equal(reliabilityComplete(steps, record), true);
  assert.equal(pendingReliabilityStep(reliabilitySteps({ ...status, fullScreenIntent: false }), record).id, 'fullscreen');
});
test('SDK, phone family, and guide revision changes invalidate review without deleting old records', () => {
  const status = access(), record = { ...freshReliability(reliabilityIdentity(status)), reviews: { popup: 'confirmed' } };
  const raw = JSON.stringify(record);
  for (const changed of [access('Samsung'), access('Xiaomi', 35)]) assert.deepEqual(loadReliability(changed, raw).reviews, {});
  assert.deepEqual(parseReliability(raw, 'new-guide-revision').reviews, {});
  assert.equal(JSON.parse(raw).reviews.popup, 'confirmed');
});
test('manual guide choice survives restart and cannot transfer to a different phone family', () => {
  const status = access('Motorola');
  const record = { ...freshReliability(reliabilityIdentity(status, 'Samsung')), guide: 'samsung', reviews: { battery: 'confirmed' } };
  assert.deepEqual(loadReliability(status, JSON.stringify(record)), record);
  assert.deepEqual(loadReliability(access('Nothing'), JSON.stringify(record)).reviews, {});
  const changed = loadReliability(access('Redmi'), JSON.stringify(record));
  assert.equal(changed.guide, 'xiaomi');
  assert.deepEqual(changed.reviews, {});
});
test('legacy confirmation data never becomes a grant; malformed new records are retryable errors', () => {
  const status = access();
  assert.deepEqual(loadReliability(status, null).reviews, {});
  for (const raw of ['{', '{"version":1}', JSON.stringify({ ...freshReliability(reliabilityIdentity(status)), reviews: { popup: true } }), JSON.stringify({ ...freshReliability(reliabilityIdentity(status)), guide: 'imaginary' })]) {
    assert.throws(() => loadReliability(status, raw));
  }
});
test('failed writes do not publish; serialized retries preserve earlier confirmations and test reports', async () => {
  const initial = freshReliability(reliabilityIdentity(access()));
  let fail = true, published = initial;
  const writes = [];
  const write = createReliabilityWriter({ setItem: async (key, raw) => { assert.equal(key, RELIABILITY_KEY); if (fail) throw new Error('storage'); writes.push(JSON.parse(raw)); } }, initial, value => { published = value; });
  await assert.rejects(write(value => ({ ...value, reviews: { popup: 'confirmed' } })));
  assert.equal(published, initial);
  fail = false;
  await Promise.all([
    write(value => ({ ...value, reviews: { ...value.reviews, popup: 'unavailable' } })),
    write(value => ({ ...value, reviews: { ...value.reviews, startup: 'confirmed' } })),
    write(value => ({ ...value, test: { rang: true, lockScreen: false }, dismissed: true })),
  ]);
  assert.deepEqual(published.reviews, { popup: 'unavailable', lockscreen: 'unavailable', 'background-popup': 'unavailable', startup: 'confirmed' });
  assert.deepEqual(published.test, { rang: true, lockScreen: false });
  assert.equal(published.dismissed, true);
  assert.equal(writes.length, 3);
});
test('new review labels have complete Hindi and Hinglish translations', () => {
  for (const key of ['Review alarm setup', 'Setting unavailable on my phone', 'Phone settings need your confirmation. The app cannot enable these switches for you.', 'Android access verified; phone settings are user reported.', 'After the test: did the alarm ring?', 'Did the alarm screen appear while locked?', 'Choose phone guide']) {
    assert.ok(catalog[key]);
    for (const language of ['hi', 'hinglish']) assert.notEqual(translate(key, undefined, language), key);
  }
});
test('queued confirmations cancel on blur/session replacement before touching storage', async () => {
  let eligible = true, release;
  const blocker = new Promise(resolve => { release = resolve; });
  let writes = 0, published = 0;
  const storage = { setItem: async () => { writes++; await blocker; } };
  const initial = freshReliability(reliabilityIdentity(access()));
  const write = createReliabilityWriter(storage, initial, () => { published++; }, () => eligible);
  const first = write(value => ({ ...value, dismissed: true }));
  await new Promise(resolve => setImmediate(resolve));
  const second = write(value => ({ ...value, reviews: { popup: 'confirmed' } }));
  eligible = false; release();
  await first;
  await assert.rejects(second, /cancelled/);
  assert.equal(writes, 1);
  assert.equal(published, 0);
});
test('two controllers serialize through the same store and preserve each other’s reviews', async () => {
  let raw = null;
  const storage = { getItem: async () => raw, setItem: async (_, value) => { raw = value; } };
  const initial = freshReliability(reliabilityIdentity(access()));
  const first = createReliabilityWriter(storage, initial, () => {});
  const second = createReliabilityWriter(storage, initial, () => {});
  await Promise.all([
    first(value => ({ ...value, reviews: { ...value.reviews, popup: 'confirmed' } })),
    second(value => ({ ...value, reviews: { ...value.reviews, startup: 'unavailable' } })),
  ]);
  assert.deepEqual(JSON.parse(raw).reviews, { popup: 'confirmed', lockscreen: 'confirmed', 'background-popup': 'confirmed', startup: 'unavailable' });
});

test('legacy combined Xiaomi review restores both pages and split reviews remain independent', () => {
  const status = access(), initial = freshReliability(reliabilityIdentity(status));
  const legacy = loadReliability(status, JSON.stringify({ ...initial, reviews: { popup: 'confirmed' } }));
  assert.equal(legacy.reviews.lockscreen, 'confirmed');
  assert.equal(legacy.reviews['background-popup'], 'confirmed');
  const single = loadReliability(status, JSON.stringify({ ...initial, reviews: { lockscreen: 'confirmed' } }));
  assert.equal(single.reviews['background-popup'], undefined);
  assert.equal(single.reviews.popup, undefined);
  const mixed = loadReliability(status, JSON.stringify({ ...initial, reviews: { lockscreen: 'confirmed', 'background-popup': 'unavailable' } }));
  assert.equal(mixed.reviews.popup, 'unavailable');
});


test('Xiaomi permanent-notification guidance stays separate from verified Android access', () => {
  for (const manufacturer of ['Xiaomi', 'Redmi', 'POCO']) {
    const step = reliabilitySteps(access(manufacturer)).find(step => step.id === 'permanent');
    assert.equal(step.native, false);
    assert.match(step.guidance, /even with notification permission enabled/);
    for (const key of [step.label, step.guidance]) for (const language of ['hi', 'hinglish']) assert.notEqual(translate(key, undefined, language), key);
  }
  assert.equal(reliabilitySteps(access('Google')).some(step => step.id === 'permanent'), false);
});
