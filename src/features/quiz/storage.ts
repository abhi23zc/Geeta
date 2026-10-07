import { emptyProgress } from './engine.ts';
import type { QuizProgress } from './types.ts';
import { validReceipt } from '../progress/model.ts';

export const QUIZ_STORAGE_KEY = 'geeta:quiz-progress-v1';
function object(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
function natural(v: unknown) { return Number.isInteger(v) && (v as number) >= 0; }
function strings(v: unknown): v is string[] { return Array.isArray(v) && v.every(x => typeof x === 'string'); }
function date(v: unknown) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v; }
function mode(v: unknown) { return ['journey', 'quick', 'revision', 'together', 'turns'].includes(String(v)); }
function difficulty(v: unknown) { return ['any', 'easy', 'medium', 'advanced'].includes(String(v)); }
export function parseProgress(raw: string | null): QuizProgress {
  if (raw === null) return emptyProgress();
  const p = JSON.parse(raw);
  if (!object(p) || p.version !== 1 || !object(p.settings) || !['hi', 'en', 'hinglish'].includes(String(p.settings.language)) || !['standard', 'large', 'extra'].includes(String(p.settings.textSize)) || typeof p.settings.haptics !== 'boolean' || !object(p.questions) || !object(p.lessons) || !strings(p.saved) || !strings(p.cards) || !Array.isArray(p.history) || p.history.length > 50 || !object(p.totals)) throw new Error('Saved quiz data could not be read.');
  const totals = p.totals;
  if (p.pendingRewards !== undefined && (!Array.isArray(p.pendingRewards) || !p.pendingRewards.every(r => validReceipt(r) && r.kind === 'quiz'))) throw new Error('Invalid pending rewards.');
  // Early v1 snapshots had no best-score map; this additive migration preserves them.
  if (p.bests === undefined) p.bests = {};
  if (!object(p.bests) || !Object.values(p.bests).every(v => natural(v) && (v as number) <= 10)) throw new Error('Invalid personal bests.');
  if (!['soloRounds', 'familyRounds', 'answered', 'correct'].every(k => natural(totals[k]))) throw new Error('Invalid quiz totals.');
  if ((totals.correct as number) > (totals.answered as number)) throw new Error('Invalid quiz totals.');
  for (const q of Object.values(p.questions)) if (!object(q) || typeof q.revision !== 'string' || !natural(q.seen) || !natural(q.wrong) || (q.wrong as number) > (q.seen as number) || !natural(q.stage) || (q.stage as number) > 3 || !date(q.lastSeen) || !date(q.due) || !(q.lastRecall === null || date(q.lastRecall)) || q.mastered !== ((q.stage as number) >= 3)) throw new Error('Invalid question progress.');
  for (const l of Object.values(p.lessons)) if (!object(l) || typeof l.complete !== 'boolean' || !natural(l.best) || (l.best as number) > 5) throw new Error('Invalid lesson progress.');
  const historyIds = new Set();
  for (const h of p.history) {
    if (!object(h) || typeof h.id !== 'string' || historyIds.has(h.id) || !mode(h.mode) || typeof h.topic !== 'string' || !difficulty(h.difficulty) || !natural(h.score) || !natural(h.total) || (h.total as number) < 1 || (h.total as number) > 20 || (h.score as number) > (h.total as number) || !date(h.date) || !strings(h.players) || !strings(h.unlockedCards) || !Array.isArray(h.playerScores) || !h.playerScores.every(v => natural(v) && (v as number) <= 5) || h.playerScores.length !== h.players.length) throw new Error('Invalid saved result.');
    if (h.mode === 'turns' && (h.players.length < 2 || h.players.length > 4 || h.total !== h.players.length * 5 || h.playerScores.reduce((sum, v) => sum + (v as number), 0) !== h.score)) throw new Error('Invalid family scores.');
    historyIds.add(h.id);
  }
  if (p.active !== null) {
    const s = p.active;
    if (!object(s) || typeof s.id !== 'string' || !mode(s.mode) || typeof s.topic !== 'string' || !difficulty(s.difficulty) || typeof s.startedAt !== 'string' || Number.isNaN(Date.parse(s.startedAt)) || !['question', 'feedback', 'handover', 'results'].includes(String(s.phase)) || !Array.isArray(s.questions) || !s.questions.length || s.questions.length > 20 || !natural(s.index) || (s.index as number) >= s.questions.length || !object(s.answers) || !strings(s.players) || s.players.some(n => !n.trim() || n.length > 40) || !strings(s.acknowledged)) throw new Error('Invalid saved round.');
    const ids = new Set(), answers = s.answers;
    for (const q of s.questions) {
      if (!object(q) || typeof q.id !== 'string' || ids.has(q.id) || typeof q.revision !== 'string' || typeof q.topic !== 'string' || typeof q.lesson !== 'string' || !['easy', 'medium', 'advanced'].includes(String(q.difficulty)) || !['editorial-pending', 'reviewed'].includes(String(q.review)) || !object(q.prompt) || !object(q.explanation) || !object(q.source) || !object(q.context) || ![q.prompt, q.explanation, q.source, q.context].every(x => typeof x.en === 'string' && !!x.en.trim() && typeof x.hi === 'string' && !!x.hi.trim()) || !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(o => object(o) && typeof o.id === 'string' && object(o.label) && typeof o.label.en === 'string' && typeof o.label.hi === 'string') || new Set(q.options.map(o => o.id)).size !== 4 || !q.options.some(o => o.id === q.correct)) throw new Error('Invalid frozen question.');
      ids.add(q.id);
      const localized = [q.prompt, q.explanation, q.source, q.context, ...q.options.map(o => o.label)];
      if (q.translationUnavailable !== undefined && typeof q.translationUnavailable !== 'boolean') throw new Error('Invalid translation availability.');
      for (const text of localized) {
        if (text.hinglish === undefined) { text.hinglish = text.en; q.translationUnavailable = true; }
        else if (typeof text.hinglish !== 'string' || !text.hinglish.trim()) throw new Error('Invalid frozen Hinglish text.');
      }
      if (answers[q.id] !== undefined && !q.options.some(o => o.id === answers[q.id as string])) throw new Error('Invalid saved answer.');
    }
    if (s.mode === 'turns' && (s.players.length < 2 || s.players.length > 4 || s.questions.length !== s.players.length * 5)) throw new Error('Invalid family round.');
    if (s.mode !== 'turns' && (s.players.length !== 0 || s.phase === 'handover')) throw new Error('Unexpected family turn.');
    if (s.mode === 'journey' && (typeof s.lesson !== 'string' || s.questions.length !== 5)) throw new Error('Invalid lesson session.');
    if (s.mode === 'together' && s.questions.length !== 10) throw new Error('Invalid cooperative session.');
    if ((s.phase === 'feedback' || s.phase === 'results') && !answers[s.questions[s.index as number].id]) throw new Error('Missing saved answer.');
    const frozen = s.questions;
    const answeredCount = (s.index as number) + Number(s.phase === 'feedback' || s.phase === 'results');
    const acknowledgedCount = s.phase === 'results' ? frozen.length : s.index as number;
    if (Object.keys(answers).length !== answeredCount || frozen.some((q, i) => i < answeredCount && !answers[q.id]) || s.acknowledged.length !== acknowledgedCount || s.acknowledged.some((id, i) => id !== frozen[i].id) || (s.phase === 'results' && ((s.index as number) !== frozen.length - 1 || !historyIds.has(s.id)))) throw new Error('Saved round progression is inconsistent.');
  }
  return p as unknown as QuizProgress;
}
/** One commit at a time; state becomes visible only after durable storage succeeds. */
export function createQuizStorage(save: (raw: string) => Promise<void>) {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    commit(progress: QuizProgress): Promise<void> {
      const raw = JSON.stringify(progress);
      const next = tail.then(() => save(raw));
      tail = next.catch(() => undefined);
      return next;
    },
  };
}
