import assert from 'node:assert/strict';
import test from 'node:test';
import { alarmImageIndex, parseAlarmImageCycle, parseImageAsset } from '../shared/content.ts';
const image = { id: 'image-test', url: 'https://storage.googleapis.com/demo/image.webp', mimeType: 'image/webp', bytes: 20, sha256: 'a'.repeat(64), width: 120, height: 200 };
test('seven image slots and validated immutable metadata are required', () => {
  const cycle = { revision: 'r1', startDate: '2026-10-19', images: [image, ...Array(6).fill(null)] };
  assert.deepEqual(parseAlarmImageCycle(cycle), cycle);
  for (const images of [[], Array(6).fill(null), Array(8).fill(null)]) assert.throws(() => parseAlarmImageCycle({ ...cycle, images }));
  for (const change of [{ bytes: 0 }, { width: 2049 }, { mimeType: 'image/svg+xml' }, { sha256: 'bad' }, { url: 'https://evil.test/image' }]) assert.throws(() => parseImageAsset({ ...image, ...change }));
});
test('image cycle wraps by calendar date without expiring', () => {
  const cycle = { startDate: '2026-10-19' };
  assert.equal(alarmImageIndex(cycle, '2026-10-18'), null);
  assert.equal(alarmImageIndex(cycle, '2026-10-19'), 0);
  assert.equal(alarmImageIndex(cycle, '2026-10-25'), 6);
  assert.equal(alarmImageIndex(cycle, '2026-10-26'), 0);
  assert.equal(alarmImageIndex({ startDate: '2026-12-28' }, '2027-01-04'), 0);
});
