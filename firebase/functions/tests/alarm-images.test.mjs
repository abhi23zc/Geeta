import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { validateAlarmImage } from '../lib/firebase/functions/content-publisher.js';
function harness(buffer) {
  const docs = new Map(), files = new Map([['alarm-images/uploads/editor/test.png', buffer]]);
  const db = { doc: path => ({ set: async value => docs.set(path, value) }) };
  const storage = { name: 'demo', file: path => ({
    getMetadata: async () => [{ size: files.get(path)?.length ?? 0 }],
    download: async () => [files.get(path)], exists: async () => [files.has(path)],
    save: async data => files.set(path, data),
  }) };
  return { db, storage, files, docs };
}
test('alarm images normalize rotation, size and transparency to verified immutable WebP', async () => {
  const buffer = await sharp({ create: { width: 2400, height: 1200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
  const h = harness(buffer);
  const image = await validateAlarmImage(h.db, h.storage, 'editor', 'alarm-images/uploads/editor/test.png');
  assert.equal(image.width, 2048); assert.equal(image.height, 1024);
  const stored = h.docs.get(`assets/${image.id}`), bytes = h.files.get(stored.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), image.sha256);
  assert.equal(image.bytes, bytes.length);
  assert.equal((await sharp(bytes).metadata()).hasAlpha, true);
});
test('alarm image validation rejects other owners, invalid bytes, oversize uploads and animated images', async () => {
  const h = harness(Buffer.from('not an image'));
  await assert.rejects(validateAlarmImage(h.db, h.storage, 'other', 'alarm-images/uploads/editor/test.png'), /owner/);
  await assert.rejects(validateAlarmImage(h.db, h.storage, 'editor', 'alarm-images/uploads/editor/test.png'));
  h.files.set('alarm-images/uploads/editor/test.png', Buffer.alloc(10 * 1024 * 1024 + 1));
  await assert.rejects(validateAlarmImage(h.db, h.storage, 'editor', 'alarm-images/uploads/editor/test.png'), /10 MB/);
  const pixels = Buffer.concat([Buffer.alloc(10 * 10 * 3, 0), Buffer.alloc(10 * 10 * 3, 255)]);
  const animated = await sharp(pixels, { raw: { width: 10, height: 20, channels: 3, pageHeight: 10 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  h.files.set('alarm-images/uploads/editor/test.png', animated);
  await assert.rejects(validateAlarmImage(h.db, h.storage, 'editor', 'alarm-images/uploads/editor/test.png'), /static/);
});
