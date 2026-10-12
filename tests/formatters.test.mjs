import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLocaleFormatters } from '../src/i18n/formatters.ts';

test('reused formatters preserve localized numbers, dates and timezone choices', () => {
  const date = new Date('2026-10-10T00:15:00Z');
  for (const locale of ['en-IN', 'hi-IN-u-nu-latn']) {
    const format = createLocaleFormatters(locale);
    for (const number of [0, -250, 1234567, 3.25]) assert.equal(format.formatNumber(number), new Intl.NumberFormat(locale).format(number));
    for (const options of [undefined, { timeZone: 'UTC', dateStyle: 'full' }, { timeZone: 'America/Los_Angeles', weekday: 'short', day: 'numeric' }, { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric' }]) {
      assert.equal(format.formatDate(date, options), new Intl.DateTimeFormat(locale, options).format(date));
      assert.equal(format.formatDate(date, options), new Intl.DateTimeFormat(locale, options).format(date));
    }
    assert.throws(() => format.formatDate(date, { timeZone: 'invalid-zone' }), RangeError);
  }
});
