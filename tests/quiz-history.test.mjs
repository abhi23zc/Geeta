import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterHistory, HISTORY_MODE_LABELS, historyCalendarDate, historyDifficultyLabel } from '../src/features/quiz/history.ts';
import { emptyProgress } from '../src/features/quiz/engine.ts';
import { parseProgress } from '../src/features/quiz/storage.ts';
import { catalog, translate } from '../src/i18n/translations.ts';

const rounds = ['turns', 'quick', 'journey', 'together', 'revision'].map((mode, index) => ({
  id: `round-${5 - index}`, mode, topic: index ? 'all' : 'retired-topic', difficulty: 'any',
  score: mode === 'turns' ? 7 : 3, total: mode === 'turns' ? 10 : 5,
  date: '2026-10-07', players: mode === 'turns' ? ['दादी', 'My Family'] : [],
  playerScores: mode === 'turns' ? [4, 3] : [], unlockedCards: [],
}));

test('filters partition every mode without sorting same-day rounds or mutating summaries', () => {
  const frozen = rounds.map(round => Object.freeze({ ...round }));
  Object.freeze(frozen);
  assert.deepEqual(filterHistory(frozen, 'all'), rounds);
  assert.deepEqual(filterHistory(frozen, 'solo').map(r => r.mode), ['quick', 'journey', 'revision']);
  assert.deepEqual(filterHistory(frozen, 'family').map(r => r.mode), ['turns', 'together']);
  assert.deepEqual(filterHistory([], 'all'), []);
  assert.deepEqual(filterHistory([rounds[1]], 'family'), []);
  assert.notEqual(filterHistory(frozen, 'all'), frozen);
});

test('difficulty describes selection rules rather than suggesting journey or cooperative filters', () => {
  for (const mode of ['journey', 'together']) assert.equal(historyDifficultyLabel({ mode, difficulty: 'advanced' }), null);
  assert.equal(historyDifficultyLabel(rounds[0]), 'Balanced Easy + Medium');
  for (const mode of ['quick', 'revision']) {
    for (const [difficulty, label] of Object.entries({ any: 'Any difficulty', easy: 'Easy', medium: 'Medium', advanced: 'Advanced' })) {
      assert.equal(historyDifficultyLabel({ mode, difficulty }), label);
    }
  }
});

test('saved calendar dates do not shift with the device timezone or translated locale', () => {
  const date = historyCalendarDate('2026-01-01');
  assert.equal(date.toISOString(), '2026-01-01T12:00:00.000Z');
  const originalZone = process.env.TZ;
  try {
    for (const zone of ['Pacific/Kiritimati', 'Etc/GMT+12', 'Asia/Kolkata']) {
      process.env.TZ = zone;
      for (const locale of ['en-IN', 'hi-IN']) {
        const parts = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', numberingSystem: 'latn' }).formatToParts(date);
        assert.equal(parts.find(p => p.type === 'year').value, '2026');
        assert.equal(parts.find(p => p.type === 'month').value, '1');
        assert.equal(parts.find(p => p.type === 'day').value, '1');
      }
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone;
  }
});

test('existing summary-only storage remains compatible and presentation leaves all progress untouched', () => {
  const progress = { ...emptyProgress(), history: rounds };
  const raw = JSON.stringify(progress), parsed = parseProgress(raw);
  for (const filter of ['all', 'solo', 'family']) for (const round of filterHistory(parsed.history, filter)) {
    historyDifficultyLabel(round); historyCalendarDate(round.date);
  }
  assert.equal(JSON.stringify(parsed), raw);
  assert.deepEqual(parsed.history[0].players, ['दादी', 'My Family']);
  assert.equal(parsed.history[0].topic, 'retired-topic');
  assert.deepEqual(emptyProgress().history, []);
});

test('all history labels and score templates have authored Hindi and Hinglish copy', () => {
  const labels = [...Object.values(HISTORY_MODE_LABELS), 'Quiz History', 'All rounds', 'Solo rounds', 'Family rounds', 'All Subjects', 'Subject unavailable', 'Balanced Easy + Medium', '{score} of {total} correct', 'Knowledge cards unlocked: {count}', 'No completed rounds yet', 'No rounds match this filter'];
  for (const key of labels) {
    assert.ok(catalog[key], key);
    for (const language of ['en', 'hi', 'hinglish']) {
      const text = translate(key, { score: 4, total: 5, count: 2 }, language);
      assert.ok(text.trim()); assert.doesNotMatch(text, /\{\w+\}/);
    }
  }
});

test('history route is virtualized and read-only with an explicit Quiz Home back fallback', async () => {
  const screen = await readFile(new URL('../src/app/quiz/history.tsx', import.meta.url), 'utf8');
  assert.match(screen, /<FlatList/);
  assert.match(screen, /scroll=\{false\}/);
  assert.match(screen, /router\.canGoBack\(\)/);
  assert.match(screen, /router\.replace\('\/quiz'\)/);
  assert.match(screen, /accessibilityState=\{\{ selected:/);
  assert.doesNotMatch(screen, /\b(commit|startSession|submitAnswer|continueSession|useProgress|ScrollView)\b/);
  const home = await readFile(new URL('../src/app/quiz/index.tsx', import.meta.url), 'utf8');
  assert.match(home, /router\.push\('\/quiz\/history'\)/);
  const ui = await readFile(new URL('../src/features/quiz/ui.tsx', import.meta.url), 'utf8');
  assert.match(ui, /bank && progress \? \(\s*children/);
  assert.match(ui, /label=\{t\('Retry'/);
  const provider = await readFile(new URL('../src/features/quiz/provider.tsx', import.meta.url), 'utf8');
  assert.match(provider, /AsyncStorage\.removeItem\(QUIZ_STORAGE_KEY\)/);
  assert.doesNotMatch(provider, /AsyncStorage\.(?:clear|multiRemove)\(/);
});
