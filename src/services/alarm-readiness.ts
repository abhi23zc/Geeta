export type AlarmSchedulingAccess = {
  notifications: boolean;
  exactAlarm: boolean;
  notificationChannelEnabled?: boolean;
  channelImportance?: number;
};
/** Older bridges expose importance; High importance is a presentation recommendation. */
export function alarmChannelEnabled(status: Pick<AlarmSchedulingAccess, 'notificationChannelEnabled' | 'channelImportance'>) {
  return status.notificationChannelEnabled ?? ((status.channelImportance ?? 0) > 0);
}
export function alarmSchedulingReady(status: AlarmSchedulingAccess) {
  return status.notifications && status.exactAlarm && alarmChannelEnabled(status);
}
