export const ONBOARDING_KEY = 'geeta:onboarding-v1';
export const ONBOARDING_STEPS = ['welcome', 'language', 'ritual', 'practice', 'alarm', 'permissions', 'ready'] as const;
export type OnboardingStep = typeof ONBOARDING_STEPS[number];
export type AlarmDraft = { time: string; days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[]; tone: string };
export type OnboardingRecord = { version: 1; step: OnboardingStep; completed: boolean; replaying: boolean; draft?: AlarmDraft; permissionPageId?: string };
export const EXISTING_INSTALL_KEYS = ['geeta:app-language-v1', 'geeta:daily-progress-v1', 'geeta:quiz-progress-v1', 'morning-ritual:alarm-settings', 'morning-ritual:gita-progress-v1', 'morning-ritual:tasks-v1'];
const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const needsIntroduction = (record: OnboardingRecord) => !record.completed || record.replaying;
export function parseOnboarding(raw: string): OnboardingRecord {
  const v = JSON.parse(raw);
  if (!v || v.version !== 1 || !ONBOARDING_STEPS.includes(v.step) || typeof v.completed !== 'boolean' || typeof v.replaying !== 'boolean') throw new Error('Invalid introduction record');
  if (v.draft && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.draft.time) || !Array.isArray(v.draft.days) || !v.draft.days.length || !v.draft.days.every((d: unknown) => weekdays.includes(d as string)) || typeof v.draft.tone !== 'string' || !v.draft.tone.trim())) throw new Error('Invalid alarm draft');
  if (v.permissionPageId !== undefined && (typeof v.permissionPageId !== 'string' || !v.permissionPageId.length)) throw new Error('Invalid permission page');
  return { ...(v.permissionPageId ? { permissionPageId: v.permissionPageId } : {}), version: 1, step: v.step === 'alarm' ? 'permissions' : v.step, completed: v.completed, replaying: v.replaying, ...(v.draft ? { draft: { time: v.draft.time, days: [...new Set<string>(v.draft.days)] as AlarmDraft['days'], tone: v.draft.tone } } : {}) };
}
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
export class OnboardingRecordError extends Error {}
/** Read the old installation before any app provider can create default records. */
export async function bootstrapOnboarding(storage: Storage, nativeConfig: () => Promise<unknown>, alarmEntry = false): Promise<OnboardingRecord> {
  const raw = await storage.getItem(ONBOARDING_KEY);
  if (raw !== null) {
    try { return parseOnboarding(raw); } catch { throw new OnboardingRecordError('Invalid introduction record'); }
  }
  const [values, config] = await Promise.all([Promise.all(EXISTING_INSTALL_KEYS.map(key => storage.getItem(key))), nativeConfig()]);
  const existing = alarmEntry || config != null || values.some(value => value !== null);
  const record: OnboardingRecord = { version: 1, step: existing ? 'ready' : 'welcome', completed: existing, replaying: false };
  await storage.setItem(ONBOARDING_KEY, JSON.stringify(record));
  return record;
}
/** Saves are serialized. Failed writes cannot publish unsaved steps or poison retries. */
export function createOnboardingWriter(storage: Storage, initial: OnboardingRecord, publish: (record: OnboardingRecord) => void) {
  let current = initial;
  let tail = Promise.resolve();
  return (change: (current: OnboardingRecord) => OnboardingRecord) => {
    const next = tail.then(async () => {
      const record = parseOnboarding(JSON.stringify(change(current)));
      await storage.setItem(ONBOARDING_KEY, JSON.stringify(record));
      current = record; publish(record); return record;
    });
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
}
export function nextIntroductionStep(step: OnboardingStep): OnboardingStep {
  if (step === 'practice' || step === 'alarm') return 'permissions';
  return ONBOARDING_STEPS[Math.min(ONBOARDING_STEPS.length - 1, ONBOARDING_STEPS.indexOf(step) + 1)];
}
export { alarmSchedulingReady as coreAlarmReady } from "../../services/alarm-readiness.ts";
/** Only app-owned routes can be deferred; alarm restoration is owned by the ritual guard. */
export function introductionRoute(record: OnboardingRecord, route: string, alarmActive: boolean, _alarmSetupEntry?: unknown): string | null {
  if (alarmActive) return null;
  if (!needsIntroduction(record)) return null;
  if (route === 'onboarding') return null;
  return 'onboarding';
}
