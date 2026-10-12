/** Notification API contract. No private task, reflection, or teaching text belongs here. */
export const DESTINATIONS = { home: '/', today: '/today', gita: '/gita', quiz: '/quiz', progress: '/progress', saved: '/saved', downloads: '/downloads' } as const;
export type Destination = keyof typeof DESTINATIONS;
export type NotificationLanguage = 'en' | 'hi' | 'hinglish';
export const OWNER_CHANNEL = 'owner-announcements-v1';
export const OWNER_SILENT_CHANNEL = 'owner-announcements-silent-v1';
export type Engagement = { practiceDate: string | null; quizDate: string | null; streak: number; hasSaved: boolean };
export type Registration = { tokenProvider: 'fcm'; token: string | null; enabled: boolean; permission: boolean; language: NotificationLanguage; timezone: string; appVersion: string; engagement: Engagement | null };
export type Installation = Registration & { uid: string; code: string; tokenValid: boolean; lastActivity: number; summaryAt: number | null; createdAt: number };
export type Audience = { codes?: string[]; language?: NotificationLanguage; inactiveDays?: number; practiceIncomplete?: boolean; quizIncomplete?: boolean; streakMin?: number; streakMax?: number; hasSaved?: boolean };
export type Message = { title: string; body: string };
export type CampaignInput = Message & { translations: Partial<Record<NotificationLanguage, Message>>; destination: Destination; sound: boolean; expirationHours: number; audience: Audience; sendAt: number; timezone: string };
export type CampaignState = 'draft' | 'scheduled' | 'freezing' | 'sending' | 'completed' | 'cancelled' | 'failed';
export type DeliveryState = 'pending' | 'submitting' | 'providerAccepted' | 'failed' | 'unknown' | 'cancelled';
export type DeliveryCounts = Record<DeliveryState, number> & { eligible: number; submitted: number; opened: number };
export type Campaign = CampaignInput & { id: string; revision: number; actor: string; state: CampaignState; updatedAt: number; expiresAt: number; deliveryProvider?: 'fcm'; test: boolean; manifestDeleted?: boolean; counts?: DeliveryCounts; failure?: string };
export type OwnerPayload = { kind: 'owner-announcement'; version: 1; campaignId: string; deliveryId: string; destination: Destination; sound?: boolean };
export function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object'); return value as Record<string, unknown>; }
function text(v: unknown, max: number) { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`Expected text of 1–${max} characters`); return v.trim(); }
function bool(v: unknown) { if (typeof v !== 'boolean') throw new Error('Expected boolean'); return v; }
function number(v: unknown, min: number, max: number) { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error('Number outside allowed range'); return v; }
export function timezone(v: unknown) { const z = text(v, 100); try { new Intl.DateTimeFormat('en', { timeZone: z }); } catch { throw new Error('Invalid timezone'); } return z; }
function language(v: unknown): NotificationLanguage { if (v !== 'en' && v !== 'hi' && v !== 'hinglish') throw new Error('Invalid language'); return v; }
export function safeId(v: unknown) { const s = text(v, 100); if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Invalid ID'); return s; }
export function userCodes(v: unknown): string[] { if (!Array.isArray(v) || !v.length || v.length > 100) throw new Error('Choose 1–100 user codes'); return [...new Set(v.map(c => { const code = text(c, 24).toUpperCase(); if (!/^G-[A-F0-9]{16}$/.test(code)) throw new Error('Invalid app user code'); return code; }))]; }
function date(v: unknown): string | null { if (v === null) return null; const s = text(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || new Date(s).toISOString().slice(0, 10) !== s) throw new Error('Invalid date'); return s; }
export function parseRegistration(value: unknown): Registration {
  const v = record(value), e = v.engagement === null ? null : record(v.engagement);
  const token = v.token === null ? null : text(v.token, 4096);
  if (v.tokenProvider !== 'fcm' || token && !validFcmToken(token)) throw new Error('Expected a native FCM registration token');
  return { tokenProvider: 'fcm', token, enabled: bool(v.enabled), permission: bool(v.permission), language: language(v.language), timezone: timezone(v.timezone), appVersion: text(v.appVersion, 50), engagement: e ? { practiceDate: date(e.practiceDate), quizDate: date(e.quizDate), streak: number(e.streak, 0, 100000), hasSaved: bool(e.hasSaved) } : null };
}
export function parseAudience(value: unknown): Audience {
  const v = record(value), a: Audience = {};
  if (v.codes !== undefined) a.codes = userCodes(v.codes);
  if (v.language !== undefined) a.language = language(v.language);
  if (v.inactiveDays !== undefined) a.inactiveDays = number(v.inactiveDays, 1, 3650);
  for (const k of ['practiceIncomplete', 'quizIncomplete', 'hasSaved'] as const) if (v[k] !== undefined) a[k] = bool(v[k]);
  for (const k of ['streakMin', 'streakMax'] as const) if (v[k] !== undefined) a[k] = number(v[k], 0, 100000);
  if ((a.streakMin ?? 0) > (a.streakMax ?? Infinity)) throw new Error('Streak minimum exceeds maximum');
  return a;
}
export function parseCampaign(value: unknown): CampaignInput {
  const v = record(value), translations: CampaignInput['translations'] = {}, raw = record(v.translations ?? {});
  for (const key of Object.keys(raw)) { const l = language(key), m = record(raw[l]); translations[l] = { title: text(m.title, 120), body: text(m.body, 1000) }; }
  if (typeof v.destination !== 'string' || !Object.hasOwn(DESTINATIONS, v.destination)) throw new Error('Unsafe destination');
  return { title: text(v.title, 120), body: text(v.body, 1000), translations, destination: v.destination as Destination, sound: bool(v.sound), expirationHours: number(v.expirationHours, 1, 72), audience: parseAudience(v.audience), sendAt: number(v.sendAt, 0, 4102444800000), timezone: timezone(v.timezone) };
}
export function localDay(now: number, zone: string) { const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); const get = (k: string) => p.find(x => x.type === k)?.value; return `${get('year')}-${get('month')}-${get('day')}`; }
export function validFcmToken(token: unknown): token is string { return typeof token === 'string' && token.length >= 20 && token.length <= 4096 && /^[A-Za-z0-9_:.-]+$/.test(token); }
export function eligibility(i: Installation): string | null { if (i.tokenProvider !== 'fcm') return 'FCM registration required'; if (!i.enabled) return 'Opted out'; if (!i.permission) return 'Permission disabled'; if (!validFcmToken(i.token) || !i.tokenValid) return 'Missing or invalid token'; return null; }
export function exclusion(i: Installation, a: Audience, now: number): string | null {
  const reason = eligibility(i); if (reason) return reason;
  if (a.codes && !a.codes.includes(i.code)) return 'User code not selected';
  if (a.language && a.language !== i.language) return 'Language';
  if (a.inactiveDays !== undefined && now - i.lastActivity < a.inactiveDays * 86400000) return 'Recently active';
  if ((a.practiceIncomplete || a.quizIncomplete || a.streakMin !== undefined || a.streakMax !== undefined || a.hasSaved !== undefined) && !i.engagement) return 'Unknown engagement summary';
  const e = i.engagement;
  if (e) {
    const today = localDay(now, i.timezone);
    if (a.practiceIncomplete && e.practiceDate === today) return 'Practice completed today';
    if (a.quizIncomplete && e.quizDate === today) return 'Quiz completed today';
    if (a.streakMin !== undefined && e.streak < a.streakMin || a.streakMax !== undefined && e.streak > a.streakMax) return 'Streak outside range';
    if (a.hasSaved !== undefined && e.hasSaved !== a.hasSaved) return 'Saved teachings';
  }
  return null;
}
export function messageFor(c: CampaignInput, language: NotificationLanguage): Message { return c.translations[language] ?? { title: c.title, body: c.body }; }
export function parseOwnerPayload(v: unknown): OwnerPayload | null {
  try { const raw = record(v), p = typeof raw.body === 'string' && raw.kind === undefined ? record(JSON.parse(raw.body)) : raw; if (p.kind !== 'owner-announcement' || p.version !== 1 && p.version !== '1' || typeof p.destination !== 'string' || !Object.hasOwn(DESTINATIONS, p.destination)) return null;
    return { kind: 'owner-announcement', version: 1, campaignId: safeId(p.campaignId), deliveryId: safeId(p.deliveryId), destination: p.destination as Destination, ...(typeof p.sound === 'boolean' ? { sound: p.sound } : {}) }; } catch { return null; }
}
export function emptyCounts(): DeliveryCounts { return { eligible: 0, submitted: 0, pending: 0, submitting: 0, providerAccepted: 0, failed: 0, unknown: 0, cancelled: 0, opened: 0 }; }
/** Convert a wall-clock choice to UTC; reject DST gaps and ambiguous repeated times. */
export function scheduledUtc(wall: string, zone: string): number {
  timezone(zone); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall)) throw new Error('Choose date and time');
  const naive = Date.parse(`${wall}:00Z`); if (!Number.isFinite(naive)) throw new Error('Invalid date/time');
  const format = (n: number) => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(n); const get=(k:string)=>p.find(x=>x.type===k)?.value; return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`; };
  const matches: number[] = []; for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) { const n = naive + offset * 60000; if (format(n) === wall) matches.push(n); }
  if (matches.length !== 1) throw new Error('Time is invalid or ambiguous in this timezone'); return matches[0];
}
