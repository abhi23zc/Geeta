import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const PRACTICE_CHANNEL = 'daily-practice-v1';
export const QUIZ_CHANNEL = 'daily-quiz-v1';
// A new ID migrates installations whose original task channel was silent.
export const TASK_CHANNEL = 'personal-tasks-v2';
export const PROGRESS_CHANNEL = 'progress-reminders-v1';
const IDS_KEY = 'geeta:notification-ids-v1';
const LAST_OPEN_KEY = 'geeta:last-opened-v1';
const CLEANUP_KEY = 'geeta:notification-cleanup-v1';

export type ReminderTask = { id: string; title: string; timeMinutes?: number; recurrence: 'daily' | 'once'; done: boolean; reminderEnabled?: boolean };
export type NotificationSnapshot = { practiceCompleted: boolean; quizCompleted: boolean; hasSavedTeaching: boolean; tasks: ReminderTask[]; alarmEnabled: boolean; alarmTime: string };

let listeners = new Set<() => void>();
let synchronization: Promise<void> = Promise.resolve();
export function notificationScheduleChanged() { listeners.forEach(listener => listener()); }
export function onNotificationScheduleChanged(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }

function dateAt(days: number, minutes: number) {
  const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + days);
  date.setMinutes(minutes); return date;
}
function inAlarmQuietWindow(date: Date, alarmEnabled: boolean, alarmTime: string) {
  if (!alarmEnabled) return false;
  const [hour, minute] = alarmTime.split(':').map(Number);
  const alarm = new Date(date); alarm.setHours(hour || 0, minute || 0, 0, 0);
  return date.getTime() >= alarm.getTime() - 60 * 60_000 && date.getTime() <= alarm.getTime() + 90 * 60_000;
}
function notification(title: string, body: string, url: string, channelId: string) {
  const task = channelId === TASK_CHANNEL;
  return { title, body, data: { url, ...(task ? { kind: 'task-reminder' } : {}) }, ...(task ? { sound: 'default' as const, priority: Notifications.AndroidNotificationPriority.HIGH } : {}), ...(Platform.OS === 'android' ? { channelId } : {}) };
}

export async function configureEngagementNotifications() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(PRACTICE_CHANNEL, { name: 'Daily practice', importance: Notifications.AndroidImportance.DEFAULT, sound: null }),
    Notifications.setNotificationChannelAsync(QUIZ_CHANNEL, { name: 'Daily quiz', importance: Notifications.AndroidImportance.DEFAULT, sound: null }),
    // Omitting sound selects Android's default. SDK 57 treats the string
    // "default" as a custom channel sound filename.
    Notifications.setNotificationChannelAsync(TASK_CHANNEL, { name: 'Task reminders', importance: Notifications.AndroidImportance.HIGH, enableVibrate: true, vibrationPattern: [0, 250, 150, 250], lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE, bypassDnd: false }),
    Notifications.setNotificationChannelAsync(PROGRESS_CHANNEL, { name: 'Progress reminders', importance: Notifications.AndroidImportance.LOW, sound: null }),
  ]);
}

export async function requestEngagementNotificationPermission() {
  if (Platform.OS === 'web') return false;
  await configureEngagementNotifications();
  const current = await Notifications.getPermissionsAsync();
  return current.granted || (await Notifications.requestPermissionsAsync()).granted;
}

async function replace(entries: { date: Date; content: Notifications.NotificationContentInput & { channelId?: string } }[]) {
  // Earlier development builds could overlap their first sync and leave orphaned
  // Expo requests. The native morning alarm is not an Expo scheduled request.
  if ((await AsyncStorage.getItem(CLEANUP_KEY)) !== 'done') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(CLEANUP_KEY, 'done');
  }
  const old = JSON.parse((await AsyncStorage.getItem(IDS_KEY)) ?? '[]') as string[];
  await Promise.all(old.map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  const now = Date.now();
  const ids: string[] = [];
  for (const entry of entries) {
    if (entry.date.getTime() <= now) continue;
    const { channelId, ...content } = entry.content;
    ids.push(await Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: entry.date, channelId } }));
  }
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

/** Rebuild every ordinary reminder; alarm notifications are never included in this registry. */
export function syncEngagementNotifications(snapshot: NotificationSnapshot) {
  const next = synchronization.catch(() => undefined).then(() => syncEngagementNotificationsNow(snapshot));
  synchronization = next;
  return next;
}

async function syncEngagementNotificationsNow(snapshot: NotificationSnapshot) {
  if (Platform.OS === 'web') return;
  await AsyncStorage.setItem(LAST_OPEN_KEY, new Date().toISOString());
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await configureEngagementNotifications();
  const entries: { date: Date; content: Notifications.NotificationContentInput & { channelId?: string } }[] = [];
  for (let day = 0; day < 31; day++) {
    const today = day === 0;
    const practiceAt = dateAt(day, 8 * 60);
    const quizAt = dateAt(day, 15 * 60);
    const streakAt = dateAt(day, 20 * 60 + 45);
    const completed = today && snapshot.practiceCompleted;
    if (!completed && !inAlarmQuietWindow(practiceAt, snapshot.alarmEnabled, snapshot.alarmTime)) entries.push({ date: practiceAt, content: notification('Today’s Gita reflection is ready', 'A quiet moment with today’s teaching awaits.', '/gita', PRACTICE_CHANNEL) });
    if (!(today && snapshot.quizCompleted) && !inAlarmQuietWindow(quizAt, snapshot.alarmEnabled, snapshot.alarmTime)) entries.push({ date: quizAt, content: notification('A short quiz is ready', 'Take a few moments to continue your learning.', '/quiz', QUIZ_CHANNEL) });
    if (!completed && !inAlarmQuietWindow(streakAt, snapshot.alarmEnabled, snapshot.alarmTime)) entries.push({ date: streakAt, content: notification('Today’s practice can keep your sadhana moving', 'Return when you are ready.', '/gita', PROGRESS_CHANNEL) });
    for (const task of snapshot.tasks) {
      if (!task.reminderEnabled || task.done || task.timeMinutes === undefined || (task.recurrence === 'once' && day > 0)) continue;
      const at = dateAt(day, task.timeMinutes);
      entries.push({ date: at, content: notification(task.title, 'Your intention is ready for attention.', '/today', TASK_CHANNEL) });
    }
    if (snapshot.hasSavedTeaching && dateAt(day, 18 * 60 + 30).getDay() === 1) entries.push({ date: dateAt(day, 18 * 60 + 30), content: notification('Return to a saved teaching', 'A teaching you saved is waiting for a quiet revisit.', '/saved', PROGRESS_CHANNEL) });
  }
  // These are deliberately pre-scheduled so they still arrive if the app is not opened.
  for (const days of [3, 6, 9, 12, 16, 21, 28]) entries.push({ date: dateAt(days, 18 * 60 + 30), content: notification('Your daily practice is here', 'Whenever you are ready, return to your quiet moment.', '/', PROGRESS_CHANNEL) });
  await replace(entries);
}
