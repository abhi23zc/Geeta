import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { createHash, randomUUID } from 'node:crypto';
import { parseImageAsset, parseAlarmImageCycle, parseAsset, parsePractice, parseAlarmCycle, validDate, MB, identifier, type AudioAsset, type PublishedPractice, type AlarmTone } from '../../shared/content';

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
  const release = { schemaVersion: 1, releaseId, publishedAt, enabled: true, locale: 'hi-IN', schedule, alarms, ...(previous?.alarmImageCycle ? { alarmImageCycle: previous.alarmImageCycle } : {}), ...(previous?.alarmCycles ? { alarmCycles: previous.alarmCycles } : {}), actor };
  if (Buffer.byteLength(JSON.stringify(release)) > 900000) throw new Error('Release is too large; reduce text and timings');
  await db.runTransaction(async transaction => {
    const ref = db.doc('delivery/current'), latest = await transaction.get(ref);
    if ((latest.data()?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
    transaction.create(db.doc(`releases/${releaseId}`), release);
    transaction.set(ref, { releaseId, enabled: latest.data()?.enabled !== false, updatedAt: publishedAt });
  });
  return { releaseId, publishedAt };
}

/** Publish one mode without requiring new teachings or replacing the other modes. */
export async function publishAlarmCycle(db: Firestore, storage: Bucket, actor: string, input: { cycle: unknown; expectedReleaseId?: string | null }) {
  const cycle = parseAlarmCycle(input.cycle);
  const current = (await db.doc('delivery/current').get()).data();
  if ((current?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
  const previous = current?.releaseId ? (await db.doc(`releases/${current.releaseId}`).get()).data() : undefined;
  cycle.revision = randomUUID();
  cycle.tracks = await Promise.all(cycle.tracks.map(async track => ({ ...track, asset: await publishValidatedAsset(db, storage, track.asset) })));
  const alarmCycles = [...(previous?.alarmCycles ?? []).filter((c: { key: string }) => c.key !== cycle.key), cycle];
  // Keep a usable single-track catalogue for older app versions and first-time installations.
  const alarms = [...(previous?.alarms ?? []).filter((a: AlarmTone) => a.key !== cycle.key), { key: cycle.key, revision: cycle.revision, title: cycle.tracks[0].title, description: 'Repeating alarm music', asset: cycle.tracks[0].asset }];
  const releaseId = randomUUID(), publishedAt = new Date().toISOString();
  const release = { schemaVersion: 1, releaseId, publishedAt, enabled: true, locale: 'hi-IN', schedule: previous?.schedule ?? {}, alarms, alarmCycles, ...(previous?.alarmImageCycle ? { alarmImageCycle: previous.alarmImageCycle } : {}), actor };
  if (Buffer.byteLength(JSON.stringify(release)) > 900000) throw new Error('Release is too large');
  await db.runTransaction(async transaction => {
    const ref = db.doc('delivery/current'), latest = await transaction.get(ref);
    if ((latest.data()?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
    transaction.create(db.doc(`releases/${releaseId}`), release);
    transaction.set(ref, { releaseId, enabled: latest.data()?.enabled !== false, updatedAt: publishedAt });
  });
  return { releaseId, publishedAt };
}

export async function validateAlarmImage(db: Firestore, storage: Bucket, actor: string, input: unknown) {
  if (typeof input !== 'string' || !input.startsWith(`alarm-images/uploads/${actor}/`) || !/^alarm-images\/uploads\/[^/]+\/[\w-]+\.(png|jpg|jpeg|webp)$/.test(input)) throw new Error('Invalid image upload owner');
  const file = storage.file(input), [meta] = await file.getMetadata();
  if (Number(meta.size) < 1 || Number(meta.size) > 10 * MB) throw new Error('Image exceeds 10 MB');
  const [buffer] = await file.download();
  if (buffer.length > 10 * MB) throw new Error('Image exceeds 10 MB');
  const { default: sharp } = await import('sharp');
  const options = { limitInputPixels: 40000000, failOn: 'warning' as const };
  const info = await sharp(buffer, options).metadata();
  if (!['png', 'jpeg', 'webp'].includes(info.format ?? '') || (info.pages ?? 1) !== 1) throw new Error('Use a static PNG, JPEG or WebP image');
  const { data, info: output } = await sharp(buffer, options).rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
  const sha256 = createHash('sha256').update(data).digest('hex'), id = `image-${sha256}`;
  const path = `published/${id}.webp`, target = storage.file(path);
  if (!(await target.exists())[0]) await target.save(data, { resumable: false, metadata: { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable' } });
  const asset = parseImageAsset({ id, url: `https://firebasestorage.googleapis.com/v0/b/${storage.name}/o/${encodeURIComponent(path)}?alt=media`, mimeType: 'image/webp', bytes: data.length, sha256, width: output.width, height: output.height });
  await db.doc(`assets/${id}`).set({ asset, path, actor, validatedAt: new Date().toISOString() });
  return asset;
}
export async function publishAlarmImages(db: Firestore, storage: Bucket, actor: string, input: { cycle: unknown; expectedReleaseId?: string | null }) {
  const cycle = parseAlarmImageCycle(input.cycle);
  const current = (await db.doc('delivery/current').get()).data();
  if ((current?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
  const previous = current?.releaseId ? (await db.doc(`releases/${current.releaseId}`).get()).data() : undefined;
  cycle.images = await Promise.all(cycle.images.map(async image => {
    if (!image) return null;
    const stored = (await db.doc(`assets/${image.id}`).get()).data();
    const verified = parseImageAsset(stored?.asset);
    if (JSON.stringify(verified) !== JSON.stringify(image) || !(await storage.file(stored!.path).exists())[0]) throw new Error('Image has not been validated');
    return verified;
  }));
  const releaseId = randomUUID(), publishedAt = new Date().toISOString();
  const release = { schemaVersion: 1, releaseId, publishedAt, enabled: true, locale: 'hi-IN', schedule: previous?.schedule ?? {}, alarms: previous?.alarms ?? [], alarmCycles: previous?.alarmCycles ?? [], alarmImageCycle: cycle, actor };
  if (Buffer.byteLength(JSON.stringify(release)) > 900000) throw new Error('Release is too large');
  await db.runTransaction(async transaction => {
    const ref = db.doc('delivery/current'), latest = await transaction.get(ref);
    if ((latest.data()?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
    transaction.create(db.doc(`releases/${releaseId}`), release);
    transaction.set(ref, { releaseId, enabled: latest.data()?.enabled !== false, updatedAt: publishedAt });
  });
  return { releaseId, publishedAt };
}
