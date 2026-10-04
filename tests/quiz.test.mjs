import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileBank, TOPICS, validateBank } from '../src/features/quiz/bank.ts';
import { emptyProgress, startSession, submitAnswer, continueSession, revisionPool, reconcileBank, dateKey } from '../src/features/quiz/engine.ts';
import { createQuizStorage, parseProgress } from '../src/features/quiz/storage.ts';

const content = Object.fromEntries(await Promise.all(TOPICS.map(async t => [t.id, JSON.parse(await readFile(new URL(`../src/features/quiz/content/${t.id}.json`, import.meta.url), 'utf8'))])));
const bank = compileBank(content);
const now = new Date(2026, 9, 4, 12);
const random = () => 0.42;
function begin(mode = 'quick', other = {}, progress = emptyProgress()) { return { ...progress, active: startSession(bank, progress, { mode, ...other }, now, random) }; }
function finish(progress, correct = true) {
  let p = progress;
  while (p.active.phase !== 'results') {
    if (p.active.phase === 'handover') p = { ...p, active: { ...p.active, phase: 'question' } };
    const q = p.active.questions[p.active.index];
    p = submitAnswer(p, correct ? q.correct : q.options.find(o => o.id !== q.correct).id, '2026-10-04');
    p = continueSession(p, bank, '2026-10-04');
  }
  return p;
}

test('complete bilingual bank has the requested allocations, choices, lessons and cards', () => {
  assert.deepEqual(validateBank(bank), { questions: 600, lessons: 120, cards: 30, editorialPending: 600 });
  assert.equal(new Set(bank.questions.map(q => q.id)).size, 600);
  for (const t of TOPICS) {
    const questions = bank.questions.filter(q => q.topic === t.id);
    assert.equal(questions.filter(q => q.difficulty === 'easy').length, t.count * 0.5);
    assert.equal(questions.filter(q => q.difficulty === 'medium').length, t.count * 0.35);
    assert.equal(questions.filter(q => q.difficulty === 'advanced').length, t.count * 0.15);
  }
});
test('Hindi combining marks remain significant in duplicate checks', () => assert.doesNotThrow(() => validateBank(bank)));
test('validator rejects incomplete translations, duplicate prompts, invalid correct option and orphan lessons', () => {
  for (const corrupt of [b => b.questions[0].prompt.hi = '', b => b.questions[0].prompt = b.questions[1].prompt, b => b.questions[0].correct = 'unknown', b => b.lessons[0].questionIds.pop()]) {
    const copy = structuredClone(bank); corrupt(copy); assert.throws(() => validateBank(copy));
  }
});
test('quick selection filters and never repeats a question in a round', () => {
  const p = begin('quick', { topic: 'gita', difficulty: 'medium', count: 10 });
  assert.equal(p.active.questions.length, 10);
  assert.equal(new Set(p.active.questions.map(q => q.id)).size, 10);
  assert.ok(p.active.questions.every(q => q.topic === 'gita' && q.difficulty === 'medium'));
  assert.equal(parseProgress(JSON.stringify(p)).active.questions[0].correct, 'answer');
});
test('unseen questions outrank recently encountered questions', () => {
  let p = finish(begin());
  const seen = new Set(p.active.questions.map(q => q.id));
  p = { ...p, active: null };
  assert.ok(startSession(bank, p, { mode: 'quick', count: 10 }, now, random).questions.every(q => !seen.has(q.id)));
});
test('submission is idempotent and unknown choices do not score', () => {
  const p = begin(), q = p.active.questions[0];
  assert.equal(submitAnswer(p, 'invalid'), p);
  const next = submitAnswer(p, q.correct, '2026-10-04');
  assert.equal(submitAnswer(next, q.correct), next);
  assert.equal(next.questions[q.id].seen, 1);
});
test('mastery advances only across dates; wrong answers revoke mastery', () => {
  let p = begin('journey', { lesson: bank.lessons[0].id }), q = p.active.questions[0];
  p = submitAnswer(p, q.correct, '2026-10-04');
  assert.equal(p.questions[q.id].due, '2026-10-05');
  for (const day of ['2026-10-04', '2026-10-05', '2026-10-08']) {
    p = { ...p, active: { ...p.active, phase: 'question', answers: {} } };
    p = submitAnswer(p, q.correct, day);
  }
  assert.equal(p.questions[q.id].stage, 3);
  assert.equal(p.questions[q.id].mastered, true);
  assert.equal(p.questions[q.id].due, '2026-10-15');
  p = { ...p, active: { ...p.active, phase: 'question', answers: {} } };
  p = submitAnswer(p, q.options.find(o => o.id !== q.correct).id, '2026-10-09');
  assert.equal(p.questions[q.id].mastered, false);
  assert.equal(p.questions[q.id].due, '2026-10-10');
});
test('due dates handle month boundaries in local calendar', () => {
  const p = begin(), q = p.active.questions[0], next = submitAnswer(p, q.correct, '2026-12-31');
  assert.equal(next.questions[q.id].due, '2027-01-01');
  assert.equal(dateKey(new Date(2026, 0, 1)), '2026-01-01');
});
test('revision returns shorter eligible rounds and rejects empty pools', () => {
  let p = begin(), q = p.active.questions[0];
  p = submitAnswer(p, q.options.find(o => o.id !== q.correct).id, '2026-10-03');
  p.active = null;
  assert.equal(revisionPool(bank, p, 'due', '2026-10-04').length, 1);
  assert.equal(startSession(bank, p, { mode: 'revision', revision: 'wrong', count: 10 }, now, random).questions.length, 1);
  assert.throws(() => startSession(bank, emptyProgress(), { mode: 'revision' }, now, random));
});
test('2–4 family players get five unique questions each with equal difficulty allocations', () => {
  for (const count of [2, 3, 4]) {
    const p = begin('turns', { players: Array.from({ length: count }, (_, i) => `P${i}`) });
    assert.equal(new Set(p.active.questions.map(q => q.id)).size, count * 5);
    for (let i = 0; i < count; i++) {
      const mine = p.active.questions.filter((_, j) => j % count === i);
      assert.equal(mine.filter(q => q.difficulty === 'easy').length, 3);
      assert.equal(mine.filter(q => q.difficulty === 'medium').length, 2);
    }
    const done = finish(p);
    assert.deepEqual(done.history[0].playerScores, Array(count).fill(5));
    assert.deepEqual(done.questions, {});
    assert.equal(done.totals.soloRounds, 0);
    assert.equal(done.totals.familyRounds, 1);
  }
});
test('cooperative round never changes individual progress', () => {
  const p = finish(begin('together'));
  assert.equal(p.active.questions.length, 10);
  assert.deepEqual(p.questions, {});
  assert.deepEqual(p.lessons, {});
});
test('results, rewards and history are not duplicated on repeated continuation', () => {
  let p = emptyProgress();
  for (const lesson of bank.lessons.slice(0, 4)) p = finish(begin('journey', { lesson: lesson.id }, { ...p, active: null }));
  assert.deepEqual(p.cards, ['ramayana-card-1']);
  assert.equal(continueSession(p, bank), p);
  p = finish(begin('journey', { lesson: bank.lessons[0].id }, { ...p, active: null }), false);
  assert.equal(p.lessons[bank.lessons[0].id].best, 5);
  assert.deepEqual(p.cards, ['ramayana-card-1']);
});
test('round history is bounded and aggregates survive eviction', () => {
  let p = emptyProgress();
  for (let i = 0; i < 55; i++) p = finish(begin('quick', {}, { ...p, active: null }));
  assert.equal(p.history.length, 50);
  assert.equal(p.totals.soloRounds, 55);
});
test('every saved session phase restores its frozen questions and answer positions', () => {
  const p = begin(), q = p.active.questions[0];
  const feedback = submitAnswer(p, q.correct, '2026-10-04');
  for (const state of [p, feedback, continueSession(feedback, bank), finish(p), begin('turns', { players: ['A', 'B'] })]) assert.deepEqual(parseProgress(JSON.stringify(state)), state);
});
test('bank changes reset affected mastery without rewriting a frozen round', () => {
  const p = submitAnswer(begin(), 'answer', '2026-10-04'), copy = structuredClone(bank);
  copy.questions.find(q => q.id === p.active.questions[0].id).revision = 'new';
  const next = reconcileBank(p, copy);
  assert.equal(next.questions[p.active.questions[0].id], undefined);
  assert.deepEqual(next.active, p.active);
});
test('corrupt or unsupported saved data is rejected, never silently replaced', () => {
  for (const raw of ['{', '{}', JSON.stringify({ ...emptyProgress(), version: 2 }), JSON.stringify({ ...begin(), active: { ...begin().active, index: 999 } })]) assert.throws(() => parseProgress(raw));
  assert.deepEqual(parseProgress(null), emptyProgress());
});
test('storage commits remain ordered and a rejected save can be retried', async () => {
  const writes = []; let fail = true;
  const store = createQuizStorage(async raw => { if (fail) { fail = false; throw new Error('disk full'); } writes.push(JSON.parse(raw)); });
  await assert.rejects(store.commit(emptyProgress()));
  const p = begin(), answered = submitAnswer(p, 'answer');
  await Promise.all([store.commit(p), store.commit(answered)]);
  assert.equal(writes[0].active.phase, 'question');
  assert.equal(writes[1].active.phase, 'feedback');
});
test('saved data cannot skip questions, forge results or contain invalid history', () => {
  for (const change of [
    p => p.active.index = 2,
    p => p.active.acknowledged = ['missing'],
    p => p.history = [null],
    p => p.active.phase = 'results',
    p => p.active.answers.unknown = 'answer',
    p => p.active.questions[0].options[1].id = p.active.questions[0].options[0].id,
  ]) { const p = begin(); change(p); assert.throws(() => parseProgress(JSON.stringify(p))); }
});
test('moving the device calendar backwards cannot advance recall mastery', () => {
  let p = begin(), q = p.active.questions[0];
  p = submitAnswer(p, q.correct, '2026-10-04');
  p = { ...p, active: { ...p.active, phase: 'question', answers: {} } };
  p = submitAnswer(p, q.correct, '2026-10-03');
  assert.equal(p.questions[q.id].stage, 1);
  assert.equal(p.questions[q.id].lastRecall, '2026-10-04');
});
test('personal bests outlive bounded history and remain separated by round selection', () => {
  let p = finish(begin('quick', { topic: 'gita', count: 10 }));
  assert.equal(p.bests['quick:gita:any:10'], 10);
  for (let i = 0; i < 51; i++) p = finish(begin('quick', {}, { ...p, active: null }), false);
  assert.equal(p.bests['quick:gita:any:10'], 10);
  assert.equal(p.history.length, 50);
  assert.equal(p.bests['quick:all:any:5'], 0);
});
test('content correction changes revision while explicit question IDs remain stable', () => {
  const updated = structuredClone(content);
  updated.ramayana.groups[0].exEn += ' Additional context.';
  const next = compileBank(updated);
  assert.equal(next.questions[0].id, bank.questions[0].id);
  assert.notEqual(next.questions[0].revision, bank.questions[0].revision);
});
test('additive v1 migration retains existing quiz data', () => {
  const p = emptyProgress(); delete p.bests;
  assert.deepEqual(parseProgress(JSON.stringify(p)), emptyProgress());
});
