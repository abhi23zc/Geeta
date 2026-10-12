import { getFirestore, FieldValue, FieldPath, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { buildFcmMessage, fcmDisposition, retryDelay, type FcmMessage, type PushResult, type PushProvider } from './fcm-provider';
import { eligibility, exclusion, parseRegistration, parseCampaign, parseAudience, safeId, userCodes, emptyCounts, type Installation, type Campaign, type CampaignInput, type DeliveryState, type NotificationLanguage } from '../../shared/notifications';

const DAY = 86400000, LIMIT = 100000;
export type Delivery = { uid: string; code: string; token: string; language: NotificationLanguage; campaignId: string; state: DeliveryState; attempts: number; nextAttempt: number; submitted: boolean; opened: boolean; deleteAt: number; messageId?: string; error?: string; submittedAt?: number };
const campaignRef = (db: Firestore, id: string) => db.doc(`notificationCampaigns/${id}`);
const deliveries = (db: Firestore, id: string) => campaignRef(db, id).collection('recipients');
function audit(db: Firestore, tx: Transaction, actor: string, action: string, campaignId: string | null) { tx.create(db.collection('notificationAudit').doc(), { actor, action, campaignId, at: Date.now(), deleteAt: Date.now() + 90 * DAY }); }
export async function registerInstallation(db: Firestore, uid: string, input: unknown) {
  const data = parseRegistration(input), ref = db.doc(`notificationInstallations/${uid}`), code = `G-${randomBytes(8).toString('hex').toUpperCase()}`, now = Date.now();
  return db.runTransaction(async tx => {
    const prior = (await tx.get(ref)).data() as Installation | undefined;
    const tokenRef = data.token ? db.doc(`notificationTokens/${createHash('sha256').update(data.token).digest('hex')}`) : null;
    const tokenOwner = tokenRef ? (await tx.get(tokenRef)).data()?.uid as string | undefined : undefined;
    const other = tokenOwner && tokenOwner !== uid ? db.doc(`notificationInstallations/${tokenOwner}`) : null;
    const otherData = other ? (await tx.get(other)).data() : null;
    // Invalidated tokens stay invalid until the device actually obtains a different token.
    const tokenValid = !!data.token && (prior?.token !== data.token || prior.tokenValid);
    if (!prior) { const codeRef = db.doc(`notificationCodes/${code}`); if ((await tx.get(codeRef)).exists) throw new Error('Code collision; retry registration'); tx.create(codeRef, { uid }); }
    const result: Installation = { ...data, uid, code: prior?.code ?? code, tokenValid, lastActivity: now, summaryAt: data.engagement ? now : null, createdAt: prior?.createdAt ?? now };
    if (other && otherData?.token === data.token) tx.update(other, { tokenValid: false });
    if (tokenRef) tx.set(tokenRef, { uid });
    tx.set(ref, result); return { code: result.code, tokenValid };
  });
}
export async function recordOpening(db: Firestore, uid: string, campaignId: unknown, deliveryId: unknown) {
  const id = safeId(campaignId), recipient = safeId(deliveryId); if (recipient !== uid) throw new Error('Installation ownership required');
  const ref = deliveries(db, id).doc(recipient);
  await db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data() as Delivery | undefined;
    if (!d || d.uid !== uid || !d.submitted || d.deleteAt <= Date.now()) throw new Error('Delivery does not belong to installation');
    if (d.opened) return;
    tx.update(ref, { opened: true, openedAt: Date.now() }); tx.update(campaignRef(db, id), { 'counts.opened': FieldValue.increment(1) });
  });
  return { recorded: true };
}
export async function previewAudience(db: Firestore, audience: unknown, search?: unknown) {
  const a = parseAudience(audience), now = Date.now();
  const codes = typeof search === 'string' && search.trim() ? userCodes(search.trim().split(/[\s,]+/)) : a.codes;
  const snapshot = codes ? await db.collection('notificationInstallations').where('code', 'in', codes.slice(0, 30)).get() : await db.collection('notificationInstallations').limit(LIMIT + 1).get();
  const docs = [...snapshot.docs];
  if (codes && codes.length > 30) { // Firestore IN queries have a 30-value limit.
    const extra = await Promise.all(Array.from({ length: Math.ceil((codes.length - 30) / 30) }, (_, n) => db.collection('notificationInstallations').where('code', 'in', codes.slice(30 + n * 30, 60 + n * 30)).get()));
    for (const s of extra) docs.push(...s.docs);
  }
  if (docs.length > LIMIT) throw new Error('Audience exceeds safety limit; narrow by user codes');
  const excluded: Record<string, number> = {}, rows: unknown[] = []; let eligible = 0;
  for (const doc of docs) { const i = doc.data() as Installation, reason = exclusion(i, a, now); if (reason) excluded[reason] = (excluded[reason] ?? 0) + 1; else eligible++;
    if (rows.length < 100) rows.push({ code: i.code, language: i.language, timezone: i.timezone, lastActivity: i.lastActivity, summaryAt: i.summaryAt, eligible: !reason, reason }); }
  return { eligible, total: docs.length, excluded, rows, evaluatedAt: now, note: 'Engagement is the latest synced summary. Unknown summaries are excluded from engagement filters.' };
}
export async function saveCampaign(db: Firestore, actor: string, id: unknown, input: unknown, revision: unknown) {
  const cid = safeId(id), content = parseCampaign(input), ref = campaignRef(db, cid), now = Date.now();
  await db.runTransaction(async tx => {
    const old = (await tx.get(ref)).data() as Campaign | undefined;
    if (old && (old.revision !== revision || !['draft', 'scheduled'].includes(old.state))) throw new Error('Campaign changed or dispatch has begun. Reload it.');
    if (old?.state === 'scheduled' && content.sendAt <= now) throw new Error('Scheduled time must be in the future');
    const c: Campaign = { ...content, id: cid, actor, revision: (old?.revision ?? 0) + 1, state: old?.state ?? 'draft', updatedAt: now, expiresAt: content.sendAt + content.expirationHours * 3600000, deliveryProvider: 'fcm', test: false, manifestDeleted: false, counts: emptyCounts() };
    tx.set(ref, c); audit(db, tx, actor, old ? 'edit' : 'create', cid);
  });
  return { id: cid };
}
export async function commitCampaign(db: Firestore, actor: string, id: unknown, revision: unknown, schedule: boolean) {
  const cid = safeId(id), ref = campaignRef(db, cid), now = Date.now();
  await db.runTransaction(async tx => {
    const c = (await tx.get(ref)).data() as Campaign | undefined;
    if (!c) throw new Error('Campaign missing');
    if (c.state === 'scheduled' && c.revision === revision) return; // Repeated final click is idempotent.
    if (c.state !== 'draft' || c.revision !== revision) throw new Error('Campaign changed. Reload before sending.');
    if (schedule && c.sendAt <= now) throw new Error('Choose a future schedule');
    const sendAt = schedule ? c.sendAt : now;
    tx.update(ref, { state: 'scheduled', sendAt, expiresAt: sendAt + c.expirationHours * 3600000, updatedAt: now }); audit(db, tx, actor, schedule ? 'schedule' : 'send', cid);
  }); return { id: cid };
}
export async function testCampaign(db: Firestore, actor: string, id: unknown, input: unknown, codes: unknown) {
  const cid = safeId(id), c = parseCampaign(input); c.audience = { codes: userCodes(codes) }; c.sendAt = Date.now();
  await db.runTransaction(async tx => { const ref = campaignRef(db, cid); if ((await tx.get(ref)).exists) return;
    tx.create(ref, { ...c, id: cid, actor, revision: 1, state: 'scheduled', deliveryProvider: 'fcm', test: true, manifestDeleted: false, updatedAt: Date.now(), expiresAt: c.sendAt + c.expirationHours * 3600000, counts: emptyCounts() }); audit(db, tx, actor, 'test', cid); });
  return { id: cid };
}
export async function cancelCampaign(db: Firestore, actor: string, id: unknown) { const cid = safeId(id); await db.runTransaction(async tx => { const ref = campaignRef(db, cid), c = (await tx.get(ref)).data(); if (!c) throw new Error('Campaign missing'); if (['completed', 'failed', 'cancelled'].includes(c.state)) return; tx.update(ref, { state: 'cancelled', updatedAt: Date.now() }); audit(db, tx, actor, 'cancel', cid); }); return { id: cid }; }
export async function setDispatchPause(db: Firestore, actor: string, paused: unknown) { if (typeof paused !== 'boolean') throw new Error('Expected pause flag'); await db.runTransaction(async tx => { tx.set(db.doc('notificationControl/current'), { paused, updatedAt: Date.now(), actor }); audit(db, tx, actor, paused ? 'pause' : 'resume', null); }); return { paused }; }
export async function notificationHistory(db: Firestore, id?: unknown) {
  const control = (await db.doc('notificationControl/current').get()).data();
  if (id) { const cid = safeId(id), c = (await campaignRef(db, cid).get()).data(); if (!c) throw new Error('Campaign missing');
    const diagnostics = (await deliveries(db, cid).where('state', 'in', ['failed', 'unknown', 'pending']).limit(100).get()).docs.map(d => { const v = d.data(); return { code: v.code, state: v.state, attempts: v.attempts, error: v.error, nextAttempt: v.nextAttempt }; });
    return { campaign: c, diagnostics, paused: control?.paused !== false }; }
  return { campaigns: (await db.collection('notificationCampaigns').orderBy('updatedAt', 'desc').limit(100).get()).docs.map(d => d.data()), paused: control?.paused !== false };
}
/** All state/counter changes share a transaction so retries and cleanup preserve exact aggregates. */
export async function transition(db: Firestore, id: string, uid: string, patch: Partial<Delivery>, expected?: DeliveryState) {
  await db.runTransaction(async tx => { const ref = deliveries(db, id).doc(uid), old = (await tx.get(ref)).data() as Delivery | undefined; if (!old || expected && old.state !== expected) return;
    const next = { ...old, ...patch }, counters: Record<string, unknown> = {};
    if (next.state !== old.state) { counters[`counts.${old.state}`] = FieldValue.increment(-1); counters[`counts.${next.state}`] = FieldValue.increment(1); }
    if (next.submitted && !old.submitted) counters['counts.submitted'] = FieldValue.increment(1);
    tx.update(ref, patch); if (Object.keys(counters).length) tx.update(campaignRef(db, id), counters);
  });
}
async function invalidate(db: Firestore, uid: string, token: string) { await db.runTransaction(async tx => { const ref = db.doc(`notificationInstallations/${uid}`), i = (await tx.get(ref)).data(); if (i?.token === token) tx.update(ref, { tokenValid: false }); }); }
/** Immutable object creation is the freeze checkpoint; recovering workers always reuse it. */
async function freeze(db: Firestore, c: Campaign) {
  const file = getStorage().bucket().file(`notification-manifests/${c.id}.json`);
  if (!(await file.exists())[0]) {
    const snapshot = await db.collection('notificationInstallations').limit(LIMIT + 1).get(); if (snapshot.size > LIMIT) { await campaignRef(db, c.id).update({ state: 'failed', failure: 'Audience exceeds 100000 installation safety limit', updatedAt: Date.now() }); return; }
    const frozenAt = Date.now(), recipients = snapshot.docs.map(d => d.data() as Installation).filter(i => !exclusion(i, c.audience, frozenAt)).map(i => ({ uid: i.uid, code: i.code, token: i.token!, language: i.language }));
    try { await file.save(JSON.stringify({ frozenAt, recipients }), { resumable: false, contentType: 'application/json', preconditionOpts: { ifGenerationMatch: 0 } }); }
    catch (e) { if ((e as { code?: number }).code !== 412) throw e; }
  }
  const manifest = JSON.parse((await file.download())[0].toString()) as { frozenAt: number; recipients: Pick<Delivery, 'uid' | 'code' | 'token' | 'language'>[] };
  const ref = campaignRef(db, c.id);
  // Bound one worker invocation, persist progress, and recover from an interrupted transaction.
  let cursor = Number((await ref.get()).data()?.freezeCursor ?? 0);
  for (let page = 0; page < 5 && cursor < manifest.recipients.length; page++) {
    const rows = manifest.recipients.slice(cursor, cursor + 200);
    const committed = await db.runTransaction(async tx => { const latest = (await tx.get(ref)).data(); if (latest?.state !== 'freezing' || latest.freezeCursor !== cursor && (latest.freezeCursor ?? 0) !== cursor) return false;
      for (const r of rows) tx.create(deliveries(db, c.id).doc(r.uid), { ...r, campaignId: c.id, state: 'pending', attempts: 0, nextAttempt: 0, submitted: false, opened: false, deleteAt: c.expiresAt + 90 * DAY } satisfies Delivery);
      tx.update(ref, { freezeCursor: cursor + rows.length, frozenAt: manifest.frozenAt, 'counts.eligible': FieldValue.increment(rows.length), 'counts.pending': FieldValue.increment(rows.length) }); return true; });
    if (!committed) return; cursor += rows.length;
  }
  if (cursor >= manifest.recipients.length) await db.runTransaction(async tx => { const latest = (await tx.get(ref)).data(); if (latest?.state === 'freezing') tx.update(ref, { state: 'sending', updatedAt: Date.now(), manifestCount: manifest.recipients.length }); });
}

export async function runDispatch(db: Firestore, id: string, provider: PushProvider) {
  const ref = campaignRef(db, safeId(id)), owner = randomUUID(), now = Date.now();
  const claimed = await db.runTransaction(async tx => { const [s, control] = await Promise.all([tx.get(ref), tx.get(db.doc('notificationControl/current'))]), c = s.data();
    if (!c || c.sendAt > now || c.leaseUntil > now || ['draft', 'completed', 'failed'].includes(c.state) || control.data()?.paused !== false && c.state !== 'cancelled') return false;
    tx.update(ref, { leaseOwner: owner, leaseUntil: now + 180000, ...(c.state === 'scheduled' ? { state: 'freezing', updatedAt: now } : {}) }); return true; });
  if (!claimed) return;
  try {
    let c = (await ref.get()).data() as Campaign;
    if (c.deliveryProvider !== 'fcm') { await ref.update({ state: 'failed', failure: 'Recreate this campaign for direct FCM delivery', updatedAt: Date.now() }); return; }
    if (c.state === 'freezing' && c.expiresAt > Date.now()) { await freeze(db, c); c = (await ref.get()).data() as Campaign; }
    if (c.state === 'freezing' && c.expiresAt > Date.now()) return;
    // Any abandoned submission intent is ambiguous; it is never automatically resent.
    const abandoned = await deliveries(db, id).where('state', '==', 'submitting').limit(100).get();
    for (const d of abandoned.docs) await transition(db, id, d.id, { state: 'unknown', submitted: true, error: 'Worker interrupted during provider submission' }, 'submitting');
    const pendingQuery = deliveries(db, id).where('state', '==', 'pending');
    const pending = await (c.state === 'cancelled' || c.expiresAt <= Date.now() ? pendingQuery : pendingQuery.where('nextAttempt', '<=', Date.now()).orderBy('nextAttempt')).orderBy(FieldPath.documentId()).limit(100).get();
    const messages: FcmMessage[] = [], sending: Delivery[] = [];
    for (const d of pending.docs) {
      const delivery = d.data() as Delivery;
      if (delivery.nextAttempt > Date.now() && c.state !== 'cancelled' && c.expiresAt > Date.now()) continue;
      const result = await db.runTransaction(async tx => {
        const [campaign, installation, control, row] = await Promise.all([tx.get(ref), tx.get(db.doc(`notificationInstallations/${delivery.uid}`)), tx.get(db.doc('notificationControl/current')), tx.get(d.ref)]);
        const latest = campaign.data() as Campaign, i = installation.data() as Installation | undefined, current = row.data() as Delivery;
        if (current.state !== 'pending' || campaign.data()?.leaseOwner !== owner) return null;
        const reason = latest.state === 'cancelled' ? 'Campaign cancelled' : latest.expiresAt <= Date.now() ? 'Campaign expired' : !i ? 'Installation removed' : eligibility(i) ?? (i.token !== delivery.token ? 'Token changed after audience freeze' : null);
        if (!reason && control.data()?.paused !== false) return null;
        const state = reason ? 'cancelled' : 'submitting';
        tx.update(d.ref, { state, ...(reason ? { error: reason } : { submittedAt: Date.now(), attempts: current.attempts + 1 }) });
        tx.update(ref, { 'counts.pending': FieldValue.increment(-1), [`counts.${state}`]: FieldValue.increment(1) });
        return reason ? null : { ...delivery, language: i!.language, attempts: current.attempts + 1 };
      });
      if (result) {
        try { const message = buildFcmMessage(c, result); sending.push(result); messages.push(message); }
        catch { await transition(db, id, result.uid, { state: 'failed', error: 'Invalid FCM payload' }, 'submitting'); }
      }
    }
    if (messages.length) {
      // Recheck all gates immediately before crossing the provider boundary.
      const [latest, control, installations] = await Promise.all([ref.get(), db.doc('notificationControl/current').get(), db.getAll(...sending.map(d => db.doc(`notificationInstallations/${d.uid}`)))]);
      for (let n = sending.length - 1; n >= 0; n--) {
        const i = installations[n].data() as Installation | undefined;
        const reason = latest.data()?.state === 'cancelled' ? 'Campaign cancelled' : c.expiresAt <= Date.now() ? 'Campaign expired' : !i ? 'Installation removed' : eligibility(i) ?? (i.token !== sending[n].token ? 'Token changed before submission' : null);
        if (reason || control.data()?.paused !== false) {
          await transition(db, id, sending[n].uid, { state: reason ? 'cancelled' : 'pending', error: reason ?? 'Dispatch paused' }, 'submitting');
          messages.splice(n, 1); sending.splice(n, 1);
        }
      }
      if (!messages.length) return;
      let results: PushResult[];
      try { results = await provider.send(messages); }
      catch { results = sending.map(() => ({ success: false, code: 'notification/submission-unknown' })); }
      for (let n = 0; n < sending.length; n++) {
        const d = sending[n], result = results[n];
        if (!result) { await transition(db, id, d.uid, { submitted: true, state: 'unknown', error: 'Missing FCM response' }, 'submitting'); continue; }
        if (result.success) await transition(db, id, d.uid, { submitted: true, state: 'providerAccepted', messageId: result.messageId }, 'submitting');
        else {
          if (result.code === 'UNREGISTERED') await invalidate(db, d.uid, d.token);
          await transition(db, id, d.uid, { submitted: !['notification/expired', 'notification/credentials-unavailable'].includes(result.code), state: fcmDisposition(result.code, d.attempts), nextAttempt: Date.now() + retryDelay(d.attempts, result.retryAfterMs), error: result.code }, 'submitting');
        }
      }
    }
    const current = (await ref.get()).data()!;
    if (current.state === 'sending' && current.counts.pending === 0 && current.counts.submitting === 0) await ref.update({ state: 'completed', updatedAt: Date.now() });
    if (current.state === 'freezing' && c.expiresAt <= Date.now()) await ref.update({ state: 'failed', failure: 'Campaign expired before audience freeze completed', updatedAt: Date.now() });
  } finally { await db.runTransaction(async tx => { const c = (await tx.get(ref)).data(); if (c?.leaseOwner === owner) tx.update(ref, { leaseUntil: 0, leaseOwner: null }); }); }
}
export async function cleanupNotifications(db = getFirestore()) {
  // Aggregates are maintained transactionally and survive removal of detailed records.
  for (const query of [db.collectionGroup('recipients').where('deleteAt', '<=', Date.now()), db.collection('notificationAudit').where('deleteAt', '<=', Date.now())]) {
    for (let page = 0; page < 20; page++) { const rows = await query.limit(400).get(); if (rows.empty) break; const batch = db.batch(); rows.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); }
  }
  const old = await db.collection('notificationCampaigns').where('manifestDeleted', '==', false).where('expiresAt', '<=', Date.now() - 90 * DAY).limit(100).get();
  for (const c of old.docs) { await getStorage().bucket().file(`notification-manifests/${c.id}.json`).delete({ ignoreNotFound: true }); await c.ref.update({ manifestDeleted: true }); }
}
