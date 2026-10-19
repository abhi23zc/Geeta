import assert from 'node:assert/strict';
import test from 'node:test';
import { formatWakeClock, wakeHeading, showScheduledAlarm } from '../src/features/alarm/wake-presentation.ts';
import { createLocaleFormatters } from '../src/i18n/formatters.ts';

const local = (hour, minute = 0) => new Date(2026, 9, 19, hour, minute);
test('heading changes at every local period boundary', () => {
  for (const [hour, minute, expected] of [
    [0, 0, 'Peaceful Night'], [3, 59, 'Peaceful Night'], [4, 0, 'Sacred Dawn'],
    [5, 59, 'Sacred Dawn'], [6, 0, 'Morning Awakening'], [11, 59, 'Morning Awakening'],
    [12, 0, 'Afternoon Pause'], [16, 59, 'Afternoon Pause'], [17, 0, 'Evening Reflection'],
    [20, 59, 'Evening Reflection'], [21, 0, 'Peaceful Night'], [23, 59, 'Peaceful Night'],
  ]) assert.equal(wakeHeading(local(hour, minute)), expected);
});
test('12-hour display handles midnight, noon and minutes', () => {
  assert.deepEqual(formatWakeClock(local(0)), { time: '12:00', meridiem: 'AM' });
  assert.deepEqual(formatWakeClock(local(12)), { time: '12:00', meridiem: 'PM' });
  assert.deepEqual(formatWakeClock(local(23, 59)), { time: '11:59', meridiem: 'PM' });
});
test('original occurrence appears at exactly sixty seconds, also after snooze', () => {
  const at = local(6, 30).getTime();
  for (const offset of [-1, 0, 59_999]) assert.equal(showScheduledAlarm(at + offset, at), false);
  for (const offset of [60_000, 300_000]) assert.equal(showScheduledAlarm(at + offset, at), true);
  for (const missing of [undefined, 0, -1, NaN, Infinity]) assert.equal(showScheduledAlarm(at + 300_000, missing), false);
});
test('localized date rolls over and explicit timezone bypasses stale cached zones', () => {
  for (const locale of ['en-IN', 'hi-IN-u-nu-latn']) {
    const { formatDate } = createLocaleFormatters(locale);
    const instant = new Date('2026-10-19T23:59:00Z');
    const options = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' };
    assert.notEqual(formatDate(instant, options), formatDate(new Date(instant.getTime() + 60_000), options));
    assert.notEqual(formatDate(instant, options), formatDate(instant, { ...options, timeZone: 'Asia/Kolkata' }));
  }
});

test('all three languages provide headings and scheduled-time interpolation', async () => {
  const { translate } = await import('../src/i18n/translations.ts');
  for (const language of ['en', 'hi', 'hinglish']) {
    for (const hour of [4, 6, 12, 17, 21]) {
      const label = translate(wakeHeading(local(hour)), undefined, language);
      assert.ok(label.length > 0);
      if (language !== 'en') assert.notEqual(label, wakeHeading(local(hour)));
    }
    const scheduled = translate('Alarm set for {time}', { time: '6:30 AM' }, language);
    assert.ok(scheduled.includes('6:30 AM'));
    assert.ok(!scheduled.includes('{time}'));
  }
});
