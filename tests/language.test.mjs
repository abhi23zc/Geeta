import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createLanguageWriter, interpolate, readLanguage, LANGUAGES } from '../src/i18n/model.ts';
import { catalog, translate, translateText, setTranslationLanguage } from '../src/i18n/translations.ts';
import { quizHinglishCopy } from '../src/i18n/quiz-copy.ts';
import { compileBank, TOPICS, validateBank } from '../src/features/quiz/bank.ts';
import { emptyProgress, startSession, reconcileBank, submitAnswer, continueSession } from '../src/features/quiz/engine.ts';
import { parseProgress } from '../src/features/quiz/storage.ts';
import { taskDisplayTitle } from '../src/i18n/task-copy.ts';
import { seedTasks, parseTasksData } from '../src/state/tasks-model.ts';
const content = Object.fromEntries(await Promise.all(TOPICS.map(async t => [t.id, JSON.parse(await readFile(new URL(`../src/features/quiz/content/${t.id}.json`, import.meta.url), 'utf8'))])));
const bank = compileBank(content);
test('template display localizes without changing stored or user-authored text', () => {
  const seed = seedTasks('2026-10-04');
  const original = JSON.stringify(seed);
  assert.equal(taskDisplayTitle(seed.records[1], 'hinglish'), 'Project proposal poora karein');
  assert.equal(taskDisplayTitle(seed.records[1], 'hi'), 'परियोजना प्रस्ताव पूरा करें');
  assert.equal(JSON.stringify(seed), original);
  const user = { ...seed.records[1], templateId: undefined, title: 'Finish project proposal' };
  assert.equal(taskDisplayTitle(user, 'hi'), user.title);
  const legacy = JSON.parse(original); for (const task of legacy.records) delete task.templateId;
  const parsed = parseTasksData(JSON.stringify(legacy));
  assert.equal(taskDisplayTitle(parsed.records[1], 'hi'), parsed.records[1].title);
});
test('explicit locale copy stays reactive without depending on global language', () => {
  setTranslationLanguage('en');
  assert.equal(translateText('Home', 'hi'), 'होम');
  assert.equal(translateText('Home', 'hinglish'), 'Home');
  assert.equal(translate('Continue', undefined, 'hi'), 'आगे बढ़ें');
});
test('fresh default, legacy migration, global precedence and invalid preferences', () => {
  assert.equal(emptyProgress().settings.language, 'en');
  assert.equal(readLanguage(null, null), 'en');
  for (const language of LANGUAGES) assert.equal(readLanguage(null, JSON.stringify({ version: 1, settings: { language } })), language);
  const legacy = JSON.stringify({ version: 1, settings: { language: 'hi' } });
  assert.equal(readLanguage('"hinglish"', legacy), 'hinglish');
  for (const raw of ['"fr"', '{bad', '{}', 'null']) assert.equal(readLanguage(raw, legacy), 'en');
  assert.equal(readLanguage(null, '{bad'), 'en');
  assert.equal(readLanguage(null, JSON.stringify({ version: 2, settings: { language: 'hi' } })), 'en');
});
test('complete catalog with matching interpolation parameters and safe text fallback', () => {
  const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const key of Object.keys(catalog)) for (const language of LANGUAGES) {
    const text = translate(key, undefined, language);
    assert.ok(text.trim(), `${language}: ${key}`);
    assert.deepEqual(placeholders(text), placeholders(translate(key, undefined, 'en')), `${language}: ${key}`);
  }
  assert.equal(interpolate('{count} / {missing}', { count: 5 }), '5 / {missing}');
  assert.equal(translate('daysCount', { count: 4 }, 'hi'), '4 दिन');
  setTranslationLanguage('hi');
  assert.equal(translateText('Error: Waiting for Wi-Fi'), 'वाई-फाई की प्रतीक्षा');
  assert.equal(translateText('My own journal entry'), 'My own journal entry');
  setTranslationLanguage('en');
});
test('writes serialize, do not publish failed preferences, and recover', async () => {
  const events = [];
  const write = createLanguageWriter(async language => { events.push(`save:${language}`); if (language === 'hi') throw new Error('disk full'); }, language => events.push(`publish:${language}`));
  const first = write('hi'), second = write('hinglish'), third = write('en');
  await assert.rejects(first, /disk full/); await Promise.all([second, third]);
  assert.deepEqual(events, ['save:hi', 'save:hinglish', 'publish:hinglish', 'save:en', 'publish:en']);
});
test('600 questions and learning cards support three languages', () => {
  assert.equal(validateBank(bank).questions, 600);
  for (const item of [...bank.topics.map(t => t.title), ...bank.cards.flatMap(c => [c.title, c.body])]) for (const language of LANGUAGES) assert.ok(item[language].trim());
});
test('original revisions and distractor IDs do not change with translations', () => {
  function revision(value) { let hash = 2166136261; for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619); return `r1-${(hash >>> 0).toString(16)}`; }
  for (const topic of TOPICS) {
    let index = 0; const groups = content[topic.id].groups, all = groups.flatMap(g => g.rows);
    for (const group of groups) for (const row of group.rows) {
      const q = bank.questions.find(q => q.id === content[topic.id].ids[index]);
      assert.equal(q.revision, revision(JSON.stringify([row, group.en, group.hi, group.exEn, group.exHi])));
      const labels = [row[2]], hi = [row[3]];
      for (const other of [...group.rows.slice(index % group.rows.length), ...group.rows, ...all]) {
        if (labels.includes(other[2]) || hi.includes(other[3])) continue;
        labels.push(other[2]); hi.push(other[3]); if (labels.length === 4) break;
      }
      assert.deepEqual(q.options.map(o => o.label.en), labels, q.id);
      assert.deepEqual(q.options.map(o => o.id), ['answer', 'choice-1', 'choice-2', 'choice-3']); index++;
    }
  }
});
function legacySession() {
  const progress = emptyProgress(); progress.active = startSession(bank, progress, { mode: 'quick' }, new Date('2026-10-04T10:00:00'), () => .4);
  const legacy = JSON.parse(JSON.stringify(progress));
  for (const q of legacy.active.questions) for (const value of [q.prompt, q.explanation, q.source, q.context, ...q.options.map(o => o.label)]) delete value.hinglish;
  return legacy;
}
test('legacy session gains Hinglish without changing order or answers', () => {
  const legacy = legacySession(), updated = reconcileBank(parseProgress(JSON.stringify(legacy)), bank);
  assert.deepEqual(updated.active.questions.map(q => q.options.map(o => o.id)), legacy.active.questions.map(q => q.options.map(o => o.id)));
  assert.deepEqual(updated.active.answers, legacy.active.answers);
  for (const q of updated.active.questions) { assert.equal(q.translationUnavailable, undefined); assert.equal(q.prompt.hinglish, bank.questions.find(b => b.id === q.id).prompt.hinglish); }
});
test('changed frozen content keeps English fallback and persists availability notice', () => {
  const legacy = legacySession(); legacy.active.questions[0].revision = 'old-content';
  const migrated = reconcileBank(parseProgress(JSON.stringify(legacy)), bank);
  assert.equal(migrated.active.questions[0].prompt.hinglish, legacy.active.questions[0].prompt.en);
  assert.equal(migrated.active.questions[0].translationUnavailable, true);
  assert.equal(parseProgress(JSON.stringify(migrated)).active.questions[0].translationUnavailable, true);
});
test('invalid frozen translations rejected and Hinglish preferences round-trip', () => {
  const legacy = legacySession(); legacy.active.questions[0].prompt.hinglish = 4;
  assert.throws(() => parseProgress(JSON.stringify(legacy)), /Invalid frozen Hinglish/);
  const p = emptyProgress(); p.settings.language = 'hinglish'; assert.equal(parseProgress(JSON.stringify(p)).settings.language, 'hinglish');
});
test('switching language has no effect on scores and mastery', () => {
  let p = emptyProgress(); p.active = startSession(bank, p, { mode: 'quick' }, new Date(), () => .3);
  for (let i = 0; i < 5; i++) { p.settings.language = LANGUAGES[i % 3]; p = submitAnswer(p, p.active.questions[i].correct); p = continueSession(p, bank); }
  const restored = parseProgress(JSON.stringify(p)); assert.equal(restored.history[0].score, 5); assert.equal(restored.totals.correct, 5);
});
test('Hinglish interpolated control copy', () => {
  assert.equal(quizHinglishCopy('Question 2 of 5'), 'Question 2/5');
  assert.equal(quizHinglishCopy('Check answer'), 'Answer check karein'); assert.equal(quizHinglishCopy('unknown'), 'unknown');
});
test('native catalog covers fallback layout copy using device-protected preferences', async () => {
  const root = '../modules/morning-alarm/android/src/main/';
  const xml = await readFile(new URL(root+'res/layout/alarm_fallback.xml', import.meta.url), 'utf8');
  const kotlin = await readFile(new URL(root+'java/expo/modules/morningalarm/AlarmStrings.kt', import.meta.url), 'utf8');
  for (const match of xml.matchAll(/android:(?:text|contentDescription)="([^"]+)"/g)) {
    const text = match[1].replaceAll('&amp;', '&'); if (/[a-zA-Z]{2}/.test(text)) assert.ok(kotlin.includes(`"${text}" to Pair(`), text);
  }
  assert.ok(kotlin.includes('createDeviceProtectedStorageContext()'));
});
