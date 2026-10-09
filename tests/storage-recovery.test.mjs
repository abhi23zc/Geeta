import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecoverableStore } from '../src/state/storage-recovery.ts';
import { EMPTY_GITA, parseGitaProgress, salvageGitaProgress, parseAlarmSettings, salvageAlarmSettings, DEFAULT_ALARM } from '../src/state/persisted-models.ts';
const key = 'progress';
function fixture(raw) {
  const values = new Map(raw === undefined ? [] : [[key, raw]]), writes = [];
  let failRead = false, failWrite = false, badBackup = false;
  const storage = {
    async getItem(k) { if (failRead) throw new Error('read'); if (badBackup && k !== key) return 'bad'; return values.get(k) ?? null; },
    async setItem(k, v) { if (failWrite) throw new Error('write'); writes.push([k, v]); values.set(k, v); },
  };
  const store = createRecoverableStore(storage, key, EMPTY_GITA, parseGitaProgress, salvageGitaProgress);
  return { store, values, writes, failRead: v => failRead = v, failWrite: v => failWrite = v, badBackup: v => badBackup = v };
}
test('failed reads and pre-hydration mutations never write empty defaults', async () => {
  const f = fixture(JSON.stringify({ ...EMPTY_GITA, bookmarks: ['2-47'] }));
  f.failRead(true);
  assert.equal(f.store.update(() => EMPTY_GITA), false);
  await f.store.load(); await f.store.flush();
  assert.equal(f.store.snapshot().ready, false); assert.equal(f.writes.length, 0);
  f.failRead(false); await f.store.load();
  assert.deepEqual(f.store.snapshot().data.bookmarks, ['2-47']); assert.equal(f.writes.length, 0);
});
test('missing record hydrates without writing until a mutation', async () => {
  const f = fixture(); await f.store.load(); assert.equal(f.store.snapshot().ready, true); assert.equal(f.writes.length, 0);
  f.store.update(p => ({ ...p, bookmarks: ['one'] })); await f.store.flush(); assert.equal(f.writes.length, 1);
});
test('corruption is preserved until explicit backup-verified recovery salvages valid entries', async () => {
  const raw = JSON.stringify({ bookmarks: ['good', null], reflections: { '2026-10-09': { verseId: 'v', text: 'keep' }, bad: null }, breathingCompletedDates: ['2026-10-09', 'bad'] });
  const f = fixture(raw); await f.store.load(); assert.equal(f.store.snapshot().corrupt, true); assert.equal(f.writes.length, 0);
  await f.store.recover();
  assert.equal(f.writes[0][1], raw); assert.match(f.writes[0][0], /:recovery:/);
  assert.deepEqual(f.store.snapshot().data, { bookmarks: ['good'], reflections: { '2026-10-09': { verseId: 'v', text: 'keep' } }, breathingCompletedDates: ['2026-10-09'] });
});
test('backup write failure and verification failure prevent primary replacement', async () => {
  for (const failure of ['write', 'verify']) {
    const f = fixture('{bad'); await f.store.load();
    if (failure === 'write') f.failWrite(true); else f.badBackup(true);
    await f.store.recover(); assert.equal(f.values.get(key), '{bad'); assert.equal(f.store.snapshot().ready, false);
  }
});
test('failed save retries latest snapshot without overwriting it with an older one', async () => {
  const f = fixture(); await f.store.load(); f.failWrite(true);
  f.store.update(p => ({ ...p, bookmarks: ['first'] })); await f.store.flush();
  assert.equal(f.store.snapshot().saveError, true);
  f.store.update(p => ({ ...p, bookmarks: ['latest'] })); f.failWrite(false); await f.store.retrySave();
  assert.equal(f.store.snapshot().saveError, false); assert.deepEqual(JSON.parse(f.values.get(key)).bookmarks, ['latest']);
});
test('alarm validation rejects damaged fields while explicit recovery preserves valid settings', () => {
  const raw = JSON.stringify({ alarmTime: '18:30', alarmTone: 'Gentle Shankh & Chants', alarmDays: ['mon', 'bad'], alarmEnabled: true });
  assert.throws(() => parseAlarmSettings(raw));
  assert.deepEqual(salvageAlarmSettings(raw), { alarmTime: '18:30', alarmTone: 'Gentle Shankh & Chants', alarmDays: ['mon'], alarmEnabled: true });
  assert.equal(parseAlarmSettings('{}').alarmEnabled, false);
});
test('alarm recovery writes native authority rather than damaged mirror defaults', async () => {
  const values = new Map([['alarm', '{bad']]), writes = [];
  const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { values.set(k, v); writes.push([k, v]); } };
  const store = createRecoverableStore(storage, 'alarm', DEFAULT_ALARM, parseAlarmSettings, salvageAlarmSettings);
  const authority = { alarmTime: '18:30', alarmTone: 'Gentle Shankh & Chants', alarmDays: ['fri'], alarmEnabled: true };
  await store.load(); await store.recover(() => authority);
  assert.equal(writes[0][1], '{bad'); assert.deepEqual(JSON.parse(values.get('alarm')), authority);
});
test('compatible old partial progress loads without resetting present fields', () => {
  assert.deepEqual(parseGitaProgress('{"bookmarks":["v"]}'), { ...EMPTY_GITA, bookmarks: ['v'] });
  assert.throws(() => parseGitaProgress('{"reflections":{"2026-10-09":null}}'));
});
