import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { createHash, randomUUID } from 'node:crypto';
import { publishDay, publishValidatedAsset, validateUploadedAsset } from './content-publisher';
import { parseAlarm, parsePractice, dateWindow, validDate, MB, identifier, type AudioAsset, type ContentWindow, type PublishedPractice, type AlarmTone } from '../../shared/content';

initializeApp();
const db = getFirestore(), bucket = () => getStorage().bucket();
type Release = { schemaVersion: 1; releaseId: string; publishedAt: string; enabled: boolean; locale: 'hi-IN'; schedule: Record<string, PublishedPractice>; alarms: AlarmTone[]; actor: string };
const etag = (value: unknown) => `"${createHash('sha256').update(JSON.stringify(value)).digest('hex')}"`;
const requestCounts = new Map<string, { since: number; count: number }>();
async function admin(token: string | undefined) {
  const decoded = await getAuth().verifyIdToken((token ?? '').replace(/^Bearer /, ''), true);
  if (decoded.admin !== true) throw new Error('Admin access required');
  return decoded;
}
const publishAsset = (input: AudioAsset) => publishValidatedAsset(db, bucket(), input);
export const contentApi = onRequest({ region: 'asia-south1', cors: true, memory: '512MiB', timeoutSeconds: 120, maxInstances: 10 }, async (req, res) => {
  try {
    if (req.path.endsWith('/content-window') && req.method === 'GET') {
      const ip = createHash('sha256').update(req.ip ?? 'unknown').digest('hex');
      if (requestCounts.size > 10000) for (const [key, value] of requestCounts) if (Date.now()-value.since > 60000) requestCounts.delete(key);
      const requests = requestCounts.get(ip);
      if (requests && Date.now()-requests.since < 60000) { requests.count++; if(requests.count > 60) { res.set('Retry-After','60').status(429).json({ error:'Refresh rate exceeded' }); return; } }
      else requestCounts.set(ip,{since:Date.now(),count:1});
      const start = req.query.start;
      if (!validDate(start) || req.query.days !== '7' || req.query.locale !== 'hi-IN') { res.status(400).json({ error: 'Expected start date, days=7 and locale=hi-IN' }); return; }
      const control = (await db.doc('delivery/current').get()).data();
      const release = control?.releaseId ? (await db.doc(`releases/${control.releaseId}`).get()).data() as Release | undefined : undefined;
      const response: ContentWindow = { schemaVersion: 1, releaseId: release?.releaseId ?? 'empty', publishedAt: release?.publishedAt ?? new Date(0).toISOString(), enabled: control?.enabled !== false, locale: 'hi-IN', days: dateWindow(start).map(date => ({ date, practice: release?.schedule[date] ?? null })), alarms: release?.alarms ?? [] };
      const tag = etag(response); res.set('ETag', tag).set('Cache-Control', 'public,max-age=300');
      if (req.headers['if-none-match'] === tag) { res.status(304).end(); return; }
      res.json(response); return;
    }
    let user;
    try { user = await admin(req.headers.authorization); } catch { res.status(403).json({ error: 'Admin access required' }); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
    if (JSON.stringify(req.body).length > 2 * MB) { res.status(413).json({ error: 'Request too large' }); return; }
    const input = req.body;
    if (req.path.endsWith('/admin/validate-asset')) {
      const asset = await validateUploadedAsset(db, bucket(), user.uid, input.path, input.kind);
      res.json(asset); return;
    }
    if (req.path.endsWith('/admin/publish-day')) {
      res.json(await publishDay(db, bucket(), user.uid, input)); return;
    }
    if (req.path.endsWith('/admin/publish') || req.path.endsWith('/admin/restore')) {
      let schedule: Record<string, PublishedPractice> = {}, alarms: AlarmTone[] = [];
      if (req.path.endsWith('/admin/restore')) {
        const previous = (await db.doc(`releases/${identifier(input.restoreId)}`).get()).data() as Release | undefined;
        if (!previous) throw new Error('Release does not exist');
        schedule = previous.schedule; alarms = previous.alarms;
      } else {
        if (!validDate(input.start) || !Array.isArray(input.practices) || input.practices.length !== 7 || !Array.isArray(input.alarms) || input.alarms.length !== 3) throw new Error('Seven practices and all three alarm modes are required');
        const current = await db.doc('delivery/current').get();
        if ((current.data()?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
        if (current.data()?.releaseId) {
          const previous = (await db.doc(`releases/${current.data()!.releaseId}`).get()).data() as Release;
          schedule = { ...previous.schedule }; alarms = previous.alarms;
        }
        const dates = dateWindow(input.start);
        const practices = input.practices;
        for (let i = 0; i < dates.length; i++) {
          const practice = parsePractice(practices[i]);
          practice.narration.asset = await publishAsset(practice.narration.asset);
          schedule[dates[i]] = practice;
        }
        {
          alarms = await Promise.all(input.alarms.map(async (value: unknown) => { const a = parseAlarm(value); a.asset = await publishAsset(a.asset); return a; }));
          if (new Set(alarms.map(a => a.key)).size !== 3) throw new Error('Duplicate alarm mode');
        }
      }
      // Bound release size without deleting immutable historical releases.
      const keys = Object.keys(schedule).sort(); if (keys.length > 60) for (const date of keys.slice(0, keys.length - 60)) delete schedule[date];
      const releaseId = randomUUID(), publishedAt = new Date().toISOString();
      const release: Release = { schemaVersion: 1, releaseId, publishedAt, enabled: true, locale: 'hi-IN', schedule, alarms, actor: user.uid };
      if (Buffer.byteLength(JSON.stringify(release)) > 900000) throw new Error('Release is too large; reduce text and timings');
      await db.runTransaction(async transaction => {
        const ref = db.doc('delivery/current'), current = await transaction.get(ref);
        if ((current.data()?.releaseId ?? null) !== (input.expectedReleaseId ?? null)) throw new Error('Another admin published first. Reload before publishing.');
        transaction.create(db.doc(`releases/${releaseId}`), release);
        transaction.set(ref, { releaseId, enabled: current.data()?.enabled !== false, updatedAt: publishedAt });
      });
      res.json({ releaseId, publishedAt }); return;
    }
    if (req.path.endsWith('/admin/delivery')) {
      if (typeof input.enabled !== 'boolean') throw new Error('Expected enabled flag');
      await db.doc('delivery/current').set({ enabled: input.enabled }, { merge: true });
      res.json({ enabled: input.enabled }); return;
    }
    res.status(404).json({ error: 'Unknown endpoint' });
  } catch (error) {
    logger.error('content_api_failed', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Content operation failed' });
  }
});

export const coverageMonitor = onSchedule({ schedule: '0 9 * * *', timeZone: 'Asia/Kolkata', region: 'asia-south1' }, async () => {
  const current = (await db.doc('delivery/current').get()).data();
  const release = current?.releaseId ? (await db.doc(`releases/${current.releaseId}`).get()).data() as Release | undefined : undefined;
  const start = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const missing = dateWindow(start, 14).filter(date => !release?.schedule[date]);
  await db.doc('operations/coverage').set({ checkedAt: new Date().toISOString(), start, missing });
  if (missing.some(date => dateWindow(start).includes(date))) logger.error('content_coverage_low', { missing });
});

export { notificationApi, notificationDispatch, notificationScheduler, notificationCleanup } from './notifications';
export { privacyPolicy } from './privacy';

export { musicApi } from './music';
