import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { createHash, randomUUID } from 'node:crypto';
import { parseAsset, parsePractice, validDate, MB, identifier, type AudioAsset, type PublishedPractice, type AlarmTone } from '../../shared/content';

function audioPath(id: string) { return `published/${identifier(id)}.audio`; }
export async function publishValidatedAsset(db: Firestore, storage: Bucket, input: AudioAsset): Promise<AudioAsset> {
  const doc = await db.doc(`assets/${input.id}`).get();
  if (!doc.exists) throw new Error(`Asset ${input.id} has not been validated`);
  const stored = doc.data()!;
  const verified = parseAsset(stored.asset);
  if (verified.sha256 !== input.sha256 || verified.bytes !== input.bytes || verified.durationMs !== input.durationMs) throw new Error('Asset metadata changed');
  const target = storage.file(audioPath(input.id));
  if (!(await target.exists())[0]) {
    await storage.file(stored.path).copy(target);
    await target.setMetadata({ contentType: verified.mimeType, cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: randomUUID() } });
  }
  const [meta] = await target.getMetadata();
  let token = meta.metadata?.firebaseStorageDownloadTokens;
  if (!token) { token = randomUUID(); await target.setMetadata({ contentType: verified.mimeType, cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: token } }); }
  return { ...verified, url: `https://firebasestorage.googleapis.com/v0/b/${storage.name}/o/${encodeURIComponent(target.name)}?alt=media&token=${token}` };
}

export async function validateUploadedAsset(db: Firestore, storage: Bucket, actor: string, pathInput: unknown, kind: string): Promise<AudioAsset> {
  const path = String(pathInput);
  if (!path.startsWith(`drafts/${actor}/`) || !/^drafts\/[^/]+\/[a-zA-Z0-9_-]+\.(mp3|m4a)$/.test(path)) throw new Error('Invalid draft path');
  const file = storage.file(path), [meta] = await file.getMetadata();
  const limit = kind === 'alarm' ? 10 * MB : 20 * MB;
  if (Number(meta.size) > limit || Number(meta.size) < 1) throw new Error('Audio exceeds upload limit');
  const [buffer] = await file.download();
  const { parseBuffer } = await import('music-metadata');
  const measured = await parseBuffer(buffer);
  const codec = measured.format.codec ?? '', container = measured.format.container ?? '';
  const mimeType = /mpeg/i.test(container) && /mpeg/i.test(codec) ? 'audio/mpeg' : /m4a|mp4/i.test(container) && /aac/i.test(codec) ? 'audio/mp4' : null;
  if (!mimeType || !measured.format.duration) throw new Error('Only valid MP3 or AAC/M4A recordings are supported');
  const sha256 = createHash('sha256').update(buffer).digest('hex'), id = sha256;
  // A draft URL has no download token and remains private under Storage rules.
  const asset = parseAsset({ id, sha256, bytes: buffer.length, mimeType, durationMs: Math.round(measured.format.duration * 1000), url: `https://storage.googleapis.com/${storage.name}/${encodeURIComponent(path)}` }, limit);
  const immutable = `validated/${id}.audio`;
  const destination = storage.file(immutable);
  if (!(await destination.exists())[0]) await file.copy(destination);
  await db.doc(`assets/${id}`).set({ path: immutable, asset, validatedAt: new Date().toISOString(), actor: actor });
  return asset;
}

/** Used by the admin API and authorized operator uploads. Neither changes user permissions. */
export async function publishDay(db: Firestore, storage: Bucket, actor: string, input: { date: unknown; practice: unknown; expectedReleaseId?: string | null }) {
  if (!validDate(input.date)) throw new Error('Choose a valid publication date');
  const current = await db.doc('delivery/current').get();
  if ((current.data()?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
  const previous = current.data()?.releaseId ? (await db.doc(`releases/${current.data()!.releaseId}`).get()).data() : undefined;
  const schedule: Record<string, PublishedPractice> = { ...previous?.schedule };
  const alarms: AlarmTone[] = previous?.alarms ?? [];
  const practice = parsePractice(input.practice);
  practice.narration.asset = await publishValidatedAsset(db, storage, practice.narration.asset);
  schedule[input.date] = practice;
  const keys = Object.keys(schedule).sort();
  if (keys.length > 60) for (const date of keys.slice(0, keys.length - 60)) delete schedule[date];
  if (!schedule[input.date]) throw new Error('This date is outside the retained publication schedule');
  const releaseId = randomUUID(), publishedAt = new Date().toISOString();
  const release = { schemaVersion: 1, releaseId, publishedAt, enabled: true, locale: 'hi-IN', schedule, alarms, actor };
  if (Buffer.byteLength(JSON.stringify(release)) > 900000) throw new Error('Release is too large; reduce text and timings');
  await db.runTransaction(async transaction => {
    const ref = db.doc('delivery/current'), latest = await transaction.get(ref);
    if ((latest.data()?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
    transaction.create(db.doc(`releases/${releaseId}`), release);
    transaction.set(ref, { releaseId, enabled: latest.data()?.enabled !== false, updatedAt: publishedAt });
  });
  return { releaseId, publishedAt };
}
