import { alarmGuideManufacturer } from '../../services/alarm-device.ts';
import { reliabilitySteps, type ReliabilityAccess, type ReliabilityRecord, type ReliabilityStep } from './alarm-reliability-model.ts';
export function permissionPages(status: ReliabilityAccess): ReliabilityStep[] {
  return reliabilitySteps(status, alarmGuideManufacturer(status), true);
}
export function nativePageReady(id: string, status: ReliabilityAccess) {
  return ({ notifications: status.notifications, exact: status.exactAlarm, channel: status.notificationChannelReady, fullscreen: status.fullScreenIntent } as Record<string, boolean>)[id] === true;
}
export function permissionPageIds(status: ReliabilityAccess) {
  return [...permissionPages(status).map(page => page.id), 'test'];
}
export function resolvePermissionPage(ids: string[], saved?: string) {
  // Older drafts paused on the removed summary return to the final permission
  // page so saving still requires an explicit user action.
  if (saved === 'save') return ids.filter(id => id !== 'test').at(-1) ?? ids[0];
  return saved && ids.includes(saved) ? saved : ids[0];
}
export function permissionPageReady(page: ReliabilityStep, status: ReliabilityAccess, record: ReliabilityRecord) {
  return page.native ? nativePageReady(page.id, status) : !!record.reviews[page.id];
}

/** Phone-specific guidance is optional; continuing never creates a confirmation. */
export function permissionPageCanContinue(page: ReliabilityStep, status: ReliabilityAccess) {
  return !page.native || nativePageReady(page.id, status);
}

/** A late native read cannot publish after its deadline; callers also check lifecycle identity. */
export async function accessDeadline<T>(read: Promise<T>, milliseconds = 5000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([read, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('access-timeout')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
