import { alarmDeviceProfile } from '../../services/alarm-device.ts';

export const RELIABILITY_KEY = 'geeta:alarm-reliability-v1';
export const GUIDE_REVISION = 1;
export type Review = 'confirmed' | 'unavailable';
export type ReliabilityAccess = {
  manufacturer: string; brand?: string; sdkInt: number; notifications: boolean; exactAlarm: boolean;
  notificationChannelReady: boolean; fullScreenIntent: boolean; batteryRestricted: boolean;
};
export type ReliabilityRecord = {
  version: 1; identity: string; reviews: Record<string, Review>; dismissed: boolean; guide?: string; testRequestedAt?: number;
  test?: { rang: boolean; lockScreen: boolean };
};
export type ReliabilityStep = { id: string; label: string; guidance: string; native: boolean };
export function manufacturerIdentity(manufacturer: string) {
  const family = alarmDeviceProfile(manufacturer).id;
  return family === 'android' ? manufacturer.trim().toLowerCase() || 'android' : family;
}
export function reliabilityIdentity(status: ReliabilityAccess, guide = status.manufacturer) {
  return `${manufacturerIdentity(status.manufacturer)}:${alarmDeviceProfile(guide).id}:${status.sdkInt}:${GUIDE_REVISION}`;
}
export function freshReliability(identity: string): ReliabilityRecord {
  return { version: 1, identity, reviews: {}, dismissed: false };
}
export function parseReliability(raw: string | null, identity: string): ReliabilityRecord {
  if (raw === null) return freshReliability(identity);
  const value = JSON.parse(raw);
  if (value?.version !== 1 || typeof value.identity !== 'string' || !value.reviews || typeof value.reviews !== 'object' || Array.isArray(value.reviews) || typeof value.dismissed !== 'boolean' ||
    Object.values(value.reviews).some(v => v !== 'confirmed' && v !== 'unavailable') ||
    (value.guide !== undefined && !["android", "xiaomi", "samsung", "oppo", "realme", "oneplus", "vivo", "huawei", "honor"].includes(value.guide)) ||
    (value.testRequestedAt !== undefined && (!Number.isFinite(value.testRequestedAt) || value.testRequestedAt < 0)) ||
    (value.test !== undefined && (typeof value.test?.rang !== 'boolean' || typeof value.test?.lockScreen !== 'boolean'))) throw new Error('Invalid alarm setup record');
  if (value.identity !== identity) return freshReliability(identity);
  if (value.identity.split(':')[1] === 'xiaomi') {
    const reviews = { ...value.reviews };
    if (reviews.popup) { reviews.lockscreen ??= reviews.popup; reviews['background-popup'] ??= reviews.popup; }
    if (reviews.lockscreen && reviews['background-popup']) reviews.popup = reviews.lockscreen === 'confirmed' && reviews['background-popup'] === 'confirmed' ? 'confirmed' : 'unavailable';
    return { ...value, reviews };
  }
  return value;
}
export function reliabilitySteps(status: ReliabilityAccess, guide = status.manufacturer, includeGranted = false): ReliabilityStep[] {
  const steps: ReliabilityStep[] = [];
  if ((includeGranted || !status.notifications)) steps.push({ id: 'notifications', label: 'Allow alarm notifications', guidance: 'In Settings, turn on notifications for geeta.', native: true });
  if (status.sdkInt >= 31 && (includeGranted || !status.exactAlarm)) steps.push({ id: 'exact', label: 'Allow precise alarms', guidance: 'Allow precise alarm timing in Alarms & reminders.', native: true });
  if (status.sdkInt >= 26 && (includeGranted || !status.notificationChannelReady)) steps.push({ id: 'channel', label: 'Enable alarm notifications', guidance: 'Turn on Morning ritual alarms and choose High importance or Alerting.', native: true });
  if (status.sdkInt >= 34 && (includeGranted || !status.fullScreenIntent)) steps.push({ id: 'fullscreen', label: 'Show alarm on lock screen', guidance: 'Allow full-screen notifications for geeta.', native: true });
  const profile = alarmDeviceProfile(guide);
  const profileSteps = includeGranted && profile.id === 'xiaomi' ? [
    { id: 'lockscreen', label: 'Show on lock screen', guidance: 'In Settings → Apps → Manage apps → geeta → Other permissions, enable Show on Lock screen.' },
    { id: 'background-popup', label: 'Background pop-ups', guidance: 'In Other permissions, allow Open new windows while running in the background.' },
    ...profile.steps.filter(step => step.id !== 'popup'),
  ] : profile.steps;
  const manufacturerSteps = profile.id === 'xiaomi' ? [...profileSteps].sort((a, b) => Number(b.id === 'popup') - Number(a.id === 'popup')) : profileSteps;
  for (const step of manufacturerSteps) {
    if (!includeGranted && profile.id === 'android' && !status.batteryRestricted) continue;
    steps.push({ ...step, native: false });
  }
  return steps;
}
export function pendingReliabilityStep(steps: ReliabilityStep[], record: ReliabilityRecord) {
  return steps.find(step => step.native || !record.reviews[step.id]);
}
export function reliabilityComplete(steps: ReliabilityStep[], record: ReliabilityRecord) {
  return !pendingReliabilityStep(steps, record);
}
type Storage = { getItem?(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
const writeTails = new WeakMap<Storage, Promise<unknown>>();
/** Confirmation is published only after durable storage; failed writes never poison later retries. */
export function createReliabilityWriter(storage: Storage, initial: ReliabilityRecord, publish: (value: ReliabilityRecord) => void, eligible: () => boolean = () => true) {
  let current = initial;
  return (change: (value: ReliabilityRecord) => ReliabilityRecord) => {
    const operation = (writeTails.get(storage) ?? Promise.resolve()).then(async () => {
      if (!eligible()) throw new Error('cancelled');
      if (storage.getItem) {
        const raw = await storage.getItem(RELIABILITY_KEY);
        if (!eligible()) throw new Error('cancelled');
        if (raw !== null) {
          const stored = parseReliability(raw, current.identity);
          if (stored.identity === current.identity && JSON.parse(raw).identity === current.identity) current = stored;
        }
      }
      const next = parseReliability(JSON.stringify(change(current)), current.identity);
      await storage.setItem(RELIABILITY_KEY, JSON.stringify(next));
      current = next; if (eligible()) publish(next); return next;
    });
    writeTails.set(storage, operation.then(() => undefined, () => undefined));
    return operation;
  };
}

/** A guide override survives restart, but never follows a backup onto a different phone family. */
export function loadReliability(status: ReliabilityAccess, raw: string | null, override?: string) {
  const decoded = raw === null ? null : JSON.parse(raw);
  const savedGuide = decoded?.identity?.startsWith(`${manufacturerIdentity(status.manufacturer)}:`) ? decoded.guide : undefined;
  const guide = override ?? savedGuide ?? status.manufacturer;
  const record = parseReliability(raw, reliabilityIdentity(status, guide));
  return { ...record, guide: alarmDeviceProfile(guide).id };
}
