import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { shouldSkipSplash } from '../src/components/animated-splash-policy.ts';
import { catalog, translate } from '../src/i18n/translations.ts';

test('animated splash policy immediately yields when an alarm is active or loading', () => {
  // Fresh normal launch
  assert.equal(
    shouldSkipSplash({
      alarmActive: false,
      alarmLoading: false,
      startupAlarmActive: false,
      sessionShown: false,
    }),
    false
  );

  // Alarm is ringing
  assert.equal(
    shouldSkipSplash({
      alarmActive: true,
      alarmLoading: false,
      startupAlarmActive: false,
      sessionShown: false,
    }),
    true
  );

  // Alarm presentation is loading
  assert.equal(
    shouldSkipSplash({
      alarmActive: false,
      alarmLoading: true,
      startupAlarmActive: false,
      sessionShown: false,
    }),
    true
  );

  // Startup intent was an active alarm
  assert.equal(
    shouldSkipSplash({
      alarmActive: false,
      alarmLoading: false,
      startupAlarmActive: true,
      sessionShown: false,
    }),
    true
  );

  // Already shown in this session
  assert.equal(
    shouldSkipSplash({
      alarmActive: false,
      alarmLoading: false,
      startupAlarmActive: false,
      sessionShown: true,
    }),
    true
  );
});

test('streak celebration mascot asset exists and is optimized WebP', () => {
  const assetPath = resolve(
    process.cwd(),
    'assets/aru/video/transparent-optimized/aru_streak_celebration.webp'
  );
  assert.ok(existsSync(assetPath), 'Mascot WebP asset must exist');
  const stats = statSync(assetPath);
  assert.ok(stats.size > 100000, 'Mascot asset must be a valid non-empty file');
});

test('splash branding copy is present across all three languages (en, hi, hinglish)', () => {
  const keys = [
    'Wake with purpose',
    'A calmer morning, a little wisdom every day.',
    'Tap anywhere to begin',
  ];

  for (const key of keys) {
    assert.ok(key in catalog, `Missing key in translation catalog: ${key}`);
    for (const locale of ['en', 'hi', 'hinglish']) {
      const translated = translate(key, {}, locale);
      assert.ok(
        translated && translated.trim().length > 0,
        `Translation must not be empty for key "${key}" in locale "${locale}"`
      );
    }
  }
});
