import type { QuizProgress } from '../quiz/types.ts';

/** Only the newly acknowledged final answer of the current round creates a receipt. */
export function withQuizReward(previous: QuizProgress, next: QuizProgress, completedAt: string): QuizProgress {
  const session = next.active;
  if (!session || session.phase !== 'results' || previous.active?.phase !== 'feedback' || previous.active.id !== session.id || previous.history.some(h => h.id === session.id) || !next.history.some(h => h.id === session.id)) return next;
  const id = `quiz:${session.id}`;
  if (next.pendingRewards?.some(r => r.id === id)) return next;
  return { ...next, pendingRewards: [...(next.pendingRewards ?? []), { id, kind: 'quiz', completedAt }] };
}
