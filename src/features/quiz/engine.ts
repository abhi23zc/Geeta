import type { QuizBank, QuizProgress, QuizQuestion, QuizSession, StartOptions } from './types.ts';
import { bankIndex } from './indexes.ts';

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function after(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}
export function emptyProgress(): QuizProgress {
  return { version: 1, settings: { language: 'en', textSize: 'standard', haptics: true }, questions: {}, saved: [], lessons: {}, cards: [], active: null, history: [], bests: {}, totals: { soloRounds: 0, familyRounds: 0, answered: 0, correct: 0 } };
}
export function shuffle<T>(input: readonly T[], random = Math.random): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function revisionPool(bank: QuizBank, progress: QuizProgress, kind: 'wrong' | 'due' | 'saved', today = dateKey()) {
  return bank.questions.filter(q => kind === 'saved' ? progress.saved.includes(q.id) : kind === 'wrong' ? !!progress.questions[q.id]?.wrong && !progress.questions[q.id]?.mastered : !!progress.questions[q.id] && progress.questions[q.id].due <= today);
}
export function startSession(bank: QuizBank, progress: QuizProgress, options: StartOptions, now = new Date(), random = Math.random): QuizSession {
  if (progress.active && progress.active.phase !== 'results') throw new Error('Resume or discard the unfinished round first.');
  const topic = options.topic ?? 'all', difficulty = options.difficulty ?? 'any';
  const index = bankIndex(bank), topicQuestions = topic === 'all' ? bank.questions : index.topics.get(topic) ?? [];
  let pool = topicQuestions.filter(q => difficulty === 'any' || q.difficulty === difficulty);
  let questions: QuizQuestion[];
  const players = options.mode === 'turns' ? (options.players ?? []).map((p, i) => p.trim().slice(0, 40) || `Player ${i + 1}`) : [];
  if (options.mode === 'journey') {
    const lesson = index.lessons.get(options.lesson ?? '');
    if (!lesson) throw new Error('Lesson unavailable.');
    questions = lesson.questionIds.map(id => index.questions.get(id)!);
  } else if (options.mode === 'turns') {
    if (players.length < 2 || players.length > 4) throw new Error('Choose two to four players.');
    const easy = shuffle(topicQuestions.filter(q => q.difficulty === 'easy'), random);
    const medium = shuffle(topicQuestions.filter(q => q.difficulty === 'medium'), random);
    if (easy.length < players.length * 3 || medium.length < players.length * 2) throw new Error('Not enough questions for this family round.');
    questions = Array.from({ length: 5 }, (_, turn) => players.map(() => (turn < 3 ? easy.pop() : medium.pop())!)).flat();
  } else {
    if (options.mode === 'revision') {
      const ids = new Set(revisionPool(bank, progress, options.revision ?? 'due', dateKey(now)).map(q => q.id));
      pool = pool.filter(q => ids.has(q.id));
    }
    const randomized = shuffle(pool, random);
    randomized.sort((a, b) => (progress.questions[a.id]?.lastSeen ?? '').localeCompare(progress.questions[b.id]?.lastSeen ?? ''));
    questions = randomized.slice(0, options.mode === 'together' ? 10 : options.count === 10 ? 10 : 5);
  }
  if (!questions.length) throw new Error('No questions match this selection.');
  return {
    id: `quiz-${now.getTime()}-${progress.totals.soloRounds + progress.totals.familyRounds}-${random().toString(36).slice(2, 10)}`, mode: options.mode, ...(options.lesson ? { lesson: options.lesson } : {}),
    topic, difficulty, questions: questions.map(q => ({
      ...q, prompt: { ...q.prompt }, explanation: { ...q.explanation }, source: { ...q.source }, context: { ...q.context },
      options: shuffle(q.options.map(o => ({ ...o, label: { ...o.label } })), random),
    })),
    index: 0, answers: {}, acknowledged: [], phase: options.mode === 'turns' ? 'handover' : 'question', players, startedAt: now.toISOString(),
  };
}
export function submitAnswer(progress: QuizProgress, option: string, today = dateKey()): QuizProgress {
  const session = progress.active;
  if (!session || session.phase !== 'question') return progress;
  const q = session.questions[session.index];
  if (!q.options.some(o => o.id === option) || session.answers[q.id]) return progress;
  const correct = option === q.correct;
  let questions = progress.questions;
  if (session.mode !== 'together' && session.mode !== 'turns') {
    const prev = questions[q.id]?.revision === q.revision ? questions[q.id] : undefined;
    let stage = prev?.stage ?? 0, lastRecall = prev?.lastRecall ?? null;
    if (!correct) stage = 0;
    else if (lastRecall === null || lastRecall < today) { stage = Math.min(stage + 1, 3); lastRecall = today; }
    const advanceDue = !correct || lastRecall !== prev?.lastRecall;
    questions = { ...questions, [q.id]: { revision: q.revision, seen: (prev?.seen ?? 0) + 1, wrong: (prev?.wrong ?? 0) + Number(!correct), lastSeen: today, stage, lastRecall, due: advanceDue ? after(today, correct ? [1, 3, 7][Math.max(0, stage - 1)] : 1) : prev!.due, mastered: stage >= 3 } };
  }
  return { ...progress, questions, active: { ...session, answers: { ...session.answers, [q.id]: option }, phase: 'feedback' } };
}
export function scoreSession(session: QuizSession) {
  return session.questions.reduce((score, q) => score + Number(session.answers[q.id] === q.correct), 0);
}
export function bestKey(session: Pick<QuizSession, 'mode' | 'topic' | 'difficulty' | 'questions'>) {
  return `${session.mode}:${session.topic}:${session.difficulty}:${session.questions.length}`;
}
export function continueSession(progress: QuizProgress, bank: QuizBank, today = dateKey()): QuizProgress {
  const s = progress.active;
  if (!s || s.phase !== 'feedback') return progress;
  if (progress.history.some(h => h.id === s.id)) return { ...progress, active: { ...s, phase: 'results' } };
  const acknowledged = [...s.acknowledged, s.questions[s.index].id];
  if (s.index + 1 < s.questions.length) return { ...progress, active: { ...s, acknowledged, index: s.index + 1, phase: s.mode === 'turns' ? 'handover' : 'question' } };
  const score = scoreSession(s);
  const lessons = { ...progress.lessons };
  if (s.mode === 'journey' && s.lesson) lessons[s.lesson] = { complete: true, best: Math.max(lessons[s.lesson]?.best ?? 0, score) };
  const cards = bank.cards.filter(c => bank.lessons.filter(l => l.topic === c.topic && lessons[l.id]?.complete).length >= c.milestone).map(c => c.id);
  const playerScores = s.players.map((_, p) => s.questions.reduce((total, q, i) => total + Number(i % s.players.length === p && s.answers[q.id] === q.correct), 0));
  const family = s.mode === 'turns' || s.mode === 'together';
  return {
    ...progress, lessons, cards: [...new Set([...progress.cards, ...cards])], bests: s.mode === 'quick' ? { ...progress.bests, [bestKey(s)]: Math.max(progress.bests[bestKey(s)] ?? 0, score) } : progress.bests, active: { ...s, acknowledged, phase: 'results' },
    history: [{ id: s.id, mode: s.mode, topic: s.topic, difficulty: s.difficulty, score, total: s.questions.length, date: today, playerScores, players: s.players, unlockedCards: cards.filter(id => !progress.cards.includes(id)) }, ...progress.history].slice(0, 50),
    totals: { soloRounds: progress.totals.soloRounds + Number(!family), familyRounds: progress.totals.familyRounds + Number(family), answered: progress.totals.answered + (family ? 0 : s.questions.length), correct: progress.totals.correct + (family ? 0 : score) },
  };
}
export function reconcileBank(progress: QuizProgress, bank: QuizBank): QuizProgress {
  const byId = bankIndex(bank).questions;
  const questions = Object.fromEntries(Object.entries(progress.questions).filter(([id, p]) => byId.get(id)?.revision === p.revision));
  const active = progress.active ? { ...progress.active, questions: progress.active.questions.map(q => {
    const current = byId.get(q.id);
    // Preserve frozen order, IDs and answers. Never substitute changed teaching content.
    if (!q.translationUnavailable) return q;
    if (!current || current.revision !== q.revision || q.options.some(o => !current.options.some(c => c.id === o.id && c.label.en === o.label.en && c.label.hi === o.label.hi))) return q;
    return { ...q, translationUnavailable: undefined,
      prompt: { ...q.prompt, hinglish: current.prompt.hinglish }, explanation: { ...q.explanation, hinglish: current.explanation.hinglish },
      source: { ...q.source, hinglish: current.source.hinglish }, context: { ...q.context, hinglish: current.context.hinglish },
      options: q.options.map(o => ({ ...o, label: { ...o.label, hinglish: current.options.find(c => c.id === o.id)!.label.hinglish } })),
    };
  }) } : null;
  return { ...progress, active, questions, saved: progress.saved.filter(id => byId.has(id)) };
}
