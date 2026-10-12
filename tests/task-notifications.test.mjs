import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseOwnerPayload } from '../shared/notifications.ts';

// Exercise the actual services with native/storage boundaries replaced.
function load(path, dependencies, DateClass = Date) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: name => dependencies[name] ?? {}, Date: DateClass, setTimeout, clearTimeout, setInterval, clearInterval });
  return exports;
}

test('task reminders migrate to an audible channel and schedule through the alarm quiet period', async () => {
  const events = [], scheduled = [], channels = new Map();
  const storage = new Map([['geeta:notification-cleanup-v1', 'done'], ['geeta:notification-ids-v1', '["old-task"]']]);
  // Local noon, with the selected reminder 30 minutes before the morning alarm.
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [2026, 9, 11, 12, 0])); }
    static now() { return new FixedDate().getTime(); }
  }
  const notifications = {
    AndroidImportance: { DEFAULT: 3, HIGH: 4, LOW: 2 },
    AndroidNotificationPriority: { HIGH: 'high' },
    AndroidNotificationVisibility: { PRIVATE: 0 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    getPermissionsAsync: async () => ({ granted: true }),
    setNotificationChannelAsync: async (id, config) => { events.push('channel'); channels.set(id, config); },
    cancelScheduledNotificationAsync: async id => { events.push(`cancel:${id}`); },
    scheduleNotificationAsync: async request => { events.push('schedule'); scheduled.push(request); return `new-${scheduled.length}`; },
  };
  const service = load('../src/services/engagement-notifications.ts', {
    'expo-notifications': notifications,
    'react-native': { Platform: { OS: 'android' } },
    '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value) },
  }, FixedDate);
  await service.syncEngagementNotifications({ practiceCompleted: false, quizCompleted: false, hasSavedTeaching: false, alarmEnabled: true, alarmTime: '15:00', tasks: [
    { id: 'once', title: 'One-off', recurrence: 'once', timeMinutes: 870, reminderEnabled: true, done: false },
    { id: 'daily', title: 'Daily', recurrence: 'daily', timeMinutes: 870, reminderEnabled: true, done: false },
    { id: 'done', title: 'Completed', recurrence: 'once', timeMinutes: 870, reminderEnabled: true, done: true },
    { id: 'disabled', title: 'Disabled', recurrence: 'once', timeMinutes: 870, reminderEnabled: false, done: false },
  ] });
  assert.equal(service.TASK_CHANNEL, 'personal-tasks-v2');
  const channel = channels.get(service.TASK_CHANNEL);
  assert.equal(channel.importance, 4);
  assert.equal(channel.enableVibrate, true);
  assert.ok(channel.vibrationPattern.some(duration => duration > 0));
  assert.equal(channel.lockscreenVisibility, 0);
  assert.equal(channel.bypassDnd, false);
  assert.equal(Object.hasOwn(channel, 'sound'), false); // Native default, not a custom filename.
  assert.ok(events.indexOf('channel') < events.indexOf('schedule'));
  assert.ok(events.indexOf('cancel:old-task') < events.indexOf('schedule'));
  const tasks = scheduled.filter(request => request.content.data.kind === 'task-reminder');
  assert.equal(tasks.filter(request => request.content.title === 'One-off').length, 1);
  assert.equal(tasks.filter(request => request.content.title === 'Daily').length, 31);
  assert.equal(tasks.length, 32);
  for (const request of tasks) {
    assert.equal(request.trigger.channelId, service.TASK_CHANNEL);
    assert.equal(request.content.sound, 'default');
    assert.equal(request.content.data.url, '/today');
  }
  assert.equal(scheduled.some(request => request.content.data.url === '/quiz'), false);
  assert.equal(channels.get(service.QUIZ_CHANNEL).sound, null);
  assert.equal(JSON.parse(storage.get('geeta:notification-ids-v1')).length, scheduled.length);
});

test('foreground tasks alert without changing owner opt-out or silent practice behavior', async () => {
  let handler, enabled = true;
  load('../src/state/notification-provider.tsx', {
    'react-native': { Platform: { OS: 'android' } },
    'expo-notifications': { setNotificationHandler: value => { handler = value; }, AndroidNotificationPriority: { HIGH: 'high' } },
    '../../shared/notifications': { parseOwnerPayload },
    '@/services/owner-notifications': { ownerPresentationEnabled: () => enabled },
  });
  const present = data => handler.handleNotification({ request: { content: { data, sound: 'default' } } });
  const task = await present({ kind: 'task-reminder', url: '/today' });
  assert.equal(task.shouldPlaySound, true);
  assert.equal(task.shouldShowBanner, true);
  assert.equal(task.shouldShowList, true);
  assert.equal((await present({ url: '/gita' })).shouldPlaySound, false);
  const owner = { kind: 'owner-announcement', version: 1, campaignId: 'c', deliveryId: 'u', destination: 'today', sound: true };
  assert.equal((await present(owner)).shouldPlaySound, true);
  assert.equal((await present({ ...owner, sound: false })).shouldPlaySound, false);
  enabled = false;
  assert.equal((await present(owner)).shouldShowBanner, false);
  assert.equal((await present({ kind: 'task-reminder', url: '/today' })).shouldPlaySound, true);
  assert.equal((await present({ kind: 'owner-announcement' })).shouldShowList, false);
});
