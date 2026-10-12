import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { onRequest } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { registerInstallation, recordOpening, previewAudience, saveCampaign, commitCampaign, testCampaign, cancelCampaign, setDispatchPause, notificationHistory, runDispatch, cleanupNotifications } from './notification-service';
import { safeId } from '../../shared/notifications';
import { fcmProvider } from './fcm-provider';
const region = 'asia-south1';
async function enqueue(id: string) { await getFunctions().taskQueue(`locations/${region}/functions/notificationDispatch`).enqueue({ campaignId: id }, { dispatchDeadlineSeconds: 120 }); }
export const notificationApi = onRequest({ region, cors: true, timeoutSeconds: 120, memory: '512MiB', maxInstances: 10 }, async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }
    if (JSON.stringify(req.body).length > 20000) { res.status(413).json({ error: 'Request too large' }); return; }
    let user; try { user = await getAuth().verifyIdToken((req.headers.authorization ?? '').replace(/^Bearer /, ''), true); } catch { res.status(401).json({ error: 'Authentication required' }); return; }
    const db = getFirestore(), input = req.body ?? {}, path = req.path.split('/').at(-1);
    if (path === 'register') { res.json(await registerInstallation(db, user.uid, input)); return; }
    if (path === 'open') { res.json(await recordOpening(db, user.uid, input.campaignId, input.deliveryId)); return; }
    if (user.admin !== true) { res.status(403).json({ error: 'Admin access required' }); return; }
    let result: unknown;
    switch (path) {
      case 'preview': result = await previewAudience(db, input.audience, input.search); break;
      case 'save': result = await saveCampaign(db, user.uid, input.id, input.campaign, input.revision); break;
      case 'send': case 'schedule': result = await commitCampaign(db, user.uid, input.id, input.revision, path === 'schedule'); break;
      case 'test': result = await testCampaign(db, user.uid, input.id, input.campaign, input.codes); break;
      case 'cancel': result = await cancelCampaign(db, user.uid, input.id); break;
      case 'pause': result = await setDispatchPause(db, user.uid, input.paused); break;
      case 'history': result = await notificationHistory(db, input.id); break;
      default: res.status(404).json({ error: 'Unknown notification endpoint' }); return;
    }
    // Scheduler is also a durable outbox: an enqueue failure must not make a committed action look unsuccessful.
    if (['send', 'test', 'cancel'].includes(path!)) try { await enqueue(safeId(input.id)); } catch { logger.warn('notification_enqueue_deferred', { campaignId: input.id }); }
    res.json(result);
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Notification operation failed' }); }
});
export const notificationDispatch = onTaskDispatched({ region, timeoutSeconds: 120, memory: '512MiB', retryConfig: { maxAttempts: 5, minBackoffSeconds: 30, maxBackoffSeconds: 3600 }, rateLimits: { maxConcurrentDispatches: 2, maxDispatchesPerSecond: 2 } }, async req => {
  const id = safeId(req.data.campaignId);
  try { await runDispatch(getFirestore(), id, fcmProvider()); }
  catch { logger.error('notification_worker_failed', { campaignId: id }); throw new Error(`Notification worker failed: ${id}`); }
});
export const notificationScheduler = onSchedule({ region, schedule: 'every 1 minutes', timeoutSeconds: 120 }, async () => {
  const db = getFirestore();
  const rows = await db.collection('notificationCampaigns').where('state', 'in', ['scheduled', 'freezing', 'sending', 'cancelled']).get();
  for (const row of rows.docs) { const c = row.data(); if (c.sendAt <= Date.now() && (!c.leaseUntil || c.leaseUntil <= Date.now()) && (c.state !== 'cancelled' || c.counts?.pending > 0 || c.counts?.submitting > 0)) { try { await enqueue(row.id); } catch { logger.warn('notification_scheduler_enqueue_failed', { campaignId: row.id }); } } }
});
export const notificationCleanup = onSchedule({ region, schedule: 'every day 03:00', timeZone: 'Asia/Kolkata', timeoutSeconds: 540 }, async () => { await cleanupNotifications(); });
