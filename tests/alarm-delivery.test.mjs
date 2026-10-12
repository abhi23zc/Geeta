import test from 'node:test';
import assert from 'node:assert/strict';
import { alarmChannelEnabled, alarmSchedulingReady } from '../src/services/alarm-readiness.ts';
import { catalog, translate } from '../src/i18n/translations.ts';

test('older bridge importance determines enabled status without requiring High', () => {
  for (const importance of [1, 2, 3, 4, 5]) assert.equal(alarmSchedulingReady({ notifications: true, exactAlarm: true, channelImportance: importance }), true);
  for (const importance of [0, -1000, undefined]) assert.equal(alarmChannelEnabled({ channelImportance: importance }), false);
  assert.equal(alarmChannelEnabled({ notificationChannelEnabled: false, channelImportance: 4 }), false);
  assert.equal(alarmSchedulingReady({ notifications: false, exactAlarm: true, notificationChannelEnabled: true }), false);
  assert.equal(alarmSchedulingReady({ notifications: true, exactAlarm: false, notificationChannelEnabled: true }), false);
});
test('delivery and readiness guidance has Hindi and Hinglish copy', () => {
  for (const key of ['Turn on Morning ritual alarms. High importance or Alerting is recommended for the alarm screen.', 'Saved—needs setup', 'Alarm notifications are blocked. Enable Morning ritual alarms in Settings.', 'Automatic alarm screen available. Android may still require you to tap the notification.', 'The last alarm stopped because Android removed its notification. Review alarm settings and try a test.', 'Enable notifications, the alarm channel and precise alarms before testing.']) {
    assert.ok(catalog[key]);
    for (const language of ['hi', 'hinglish']) assert.notEqual(translate(key, undefined, language), key);
  }
});
