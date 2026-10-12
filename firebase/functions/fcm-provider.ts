import { getApp } from 'firebase-admin/app';
import { OWNER_CHANNEL, OWNER_SILENT_CHANNEL, messageFor, type Campaign, type NotificationLanguage } from '../../shared/notifications';

/** REST messages deliberately use a single HTTP attempt: SDK transport retries on
 * socket timeouts could submit the same visible alert more than once. */
export type FcmMessage = {
  token: string;
  notification: { title: string; body: string };
  data: Record<string, string>;
  android: { priority: 'HIGH'; ttl: string; restricted_package_name: string; notification: { channel_id: string; sound?: string; default_sound: boolean; tag: string } };
  expiresAt: number;
};
export type PushResult = { success: true; messageId: string } | { success: false; code: string; retryAfterMs?: number };
export type PushProvider = { send(messages: FcmMessage[]): Promise<PushResult[]> };
export function buildFcmMessage(c: Campaign, recipient: { uid: string; token: string; language: NotificationLanguage }, now = Date.now()): FcmMessage {
  const payload = { kind: 'owner-announcement', version: 1, campaignId: c.id, deliveryId: recipient.uid, destination: c.destination, sound: c.sound };
  const message: FcmMessage = {
    token: recipient.token,
    notification: messageFor(c, recipient.language),
    // SDK 57 Android exposes JSON data.body as notification.request.content.data.
    data: { body: JSON.stringify(payload), sound: c.sound ? 'default' : 'none' },
    android: { priority: 'HIGH', ttl: `${Math.max(0, Math.floor((c.expiresAt - now) / 1000))}s`, restricted_package_name: 'com.anonymous.geeta', notification: { channel_id: c.sound ? OWNER_CHANNEL : OWNER_SILENT_CHANNEL, default_sound: c.sound, ...(c.sound ? { sound: 'default' } : {}), tag: `${c.id}-${recipient.uid}` } },
    expiresAt: c.expiresAt,
  };
  if (Buffer.byteLength(JSON.stringify({ notification: message.notification, data: message.data, android: message.android })) > 4096) throw new Error('Notification payload exceeds FCM 4096-byte limit');
  return message;
}
export function fcmDisposition(code: string, attempts: number): 'pending' | 'failed' | 'unknown' | 'cancelled' {
  if (code === 'notification/expired') return 'cancelled';
  if (['QUOTA_EXCEEDED', 'UNAVAILABLE', 'INTERNAL'].includes(code)) return attempts < 5 ? 'pending' : 'failed';
  if (['UNREGISTERED', 'INVALID_ARGUMENT', 'SENDER_ID_MISMATCH', 'PERMISSION_DENIED', 'UNAUTHENTICATED', 'THIRD_PARTY_AUTH_ERROR', 'notification/credentials-unavailable'].includes(code)) return 'failed';
  return 'unknown';
}
export function retryDelay(attempts: number, retryAfterMs = 0, random = Math.random): number { return Math.max(retryAfterMs, Math.min(3600000, 60000 * 2 ** Math.max(0, attempts - 1)) + Math.floor(random() * 15000)); }
export function fcmProvider(): PushProvider {
  return createFcmProvider(async () => {
    const app = getApp(), projectId = app.options.projectId ?? process.env.GCLOUD_PROJECT;
    if (!projectId || !app.options.credential) throw new Error('Firebase server credentials unavailable');
    return { projectId, accessToken: (await app.options.credential.getAccessToken()).access_token };
  });
}
export function createFcmProvider(credentials: () => Promise<{ projectId: string; accessToken: string }>, transport: typeof fetch = fetch): PushProvider {
  return { send: async messages => {
    let projectId: string, accessToken: string;
    try { ({ projectId, accessToken } = await credentials()); }
    catch { return messages.map(() => ({ success: false, code: 'notification/credentials-unavailable' })); }
    const results: PushResult[] = new Array(messages.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(20, messages.length) }, async () => {
      while (cursor < messages.length) {
        const index = cursor++, { expiresAt, ...message } = messages[index];
        if (expiresAt <= Date.now()) { results[index] = { success: false, code: 'notification/expired' }; continue; }
        message.android.ttl = `${Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))}s`;
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await transport(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message }), signal: controller.signal });
          const body = await response.json() as { name?: string; error?: { status?: string; details?: { errorCode?: string }[] } };
          if (response.ok) results[index] = typeof body.name === 'string' && body.name ? { success: true, messageId: body.name } : { success: false, code: 'notification/unknown-response' };
          else {
            const rawCode = body.error?.details?.find(d => d.errorCode)?.errorCode ?? body.error?.status ?? 'notification/unknown-response';
            const code = rawCode === 'RESOURCE_EXHAUSTED' ? 'QUOTA_EXCEEDED' : rawCode;
            const header = response.headers.get('retry-after');
            const delay = header ? /^\d+$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header) - Date.now()) : 0;
            results[index] = { success: false, code, retryAfterMs: Number.isFinite(delay) ? delay : 0 };
          }
        } catch { results[index] = { success: false, code: 'notification/submission-unknown' }; }
        finally { clearTimeout(timer); }
      }
    }));
    return results;
  } };
}
