import { alarmGuideManufacturer } from '../../services/alarm-device.ts';
import { reliabilitySteps, type ReliabilityAccess, type ReliabilityRecord, type ReliabilityStep } from './alarm-reliability-model.ts';
export type PermissionPage = ReliabilityStep & { required: boolean };
export const requiredPermissionIds = ['notifications', 'exact'] as const;
export function isRequiredPermission(id: string) {
  return requiredPermissionIds.some(required => required === id);
}
export function permissionPages(status: ReliabilityAccess): PermissionPage[] {
  return reliabilitySteps(status, alarmGuideManufacturer(status), true).map(page => ({ ...page, required: isRequiredPermission(page.id) }));
}
export function walkthroughPages(status: ReliabilityAccess): PermissionPage[] {
  return permissionPages(status);
}
/** Forward navigation skips verified requirements; Back can still revisit every page. */
export function nextPermissionPage(pages: PermissionPage[], status: ReliabilityAccess, after = -1) {
  return pages.slice(after + 1).find(page => !page.required || !nativePageReady(page.id, status))?.id;
}
export function missingRequiredPage(pages: PermissionPage[], status: ReliabilityAccess) {
  return pages.find(page => page.required && !nativePageReady(page.id, status))?.id;
}
export function nativePageReady(id: string, status: ReliabilityAccess) {
  return ({ notifications: status.notifications, exact: status.exactAlarm, channel: status.notificationChannelReady, fullscreen: status.fullScreenIntent } as Record<string, boolean>)[id] === true;
}
export function permissionPageIds(status: ReliabilityAccess) {
  return walkthroughPages(status).map(page => page.id);
}
export function resolvePermissionPage(ids: string[], saved?: string) {
  // Older drafts paused on the removed summary or test return to the final permission
  // page so saving still requires an explicit user action.
  if (saved === 'save' || saved === 'test') return ids.at(-1) ?? ids[0];
  return saved && ids.includes(saved) ? saved : ids[0];
}
export function permissionPageReady(page: ReliabilityStep, status: ReliabilityAccess, record: ReliabilityRecord) {
  return page.native ? nativePageReady(page.id, status) : !!record.reviews[page.id];
}

/** Optional guidance never gates entry; required access must come from Android. */
export function permissionPageCanContinue(page: ReliabilityStep, status: ReliabilityAccess) {
  return !isRequiredPermission(page.id) || nativePageReady(page.id, status);
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
