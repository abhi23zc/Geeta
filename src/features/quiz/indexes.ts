import type { QuizBank, QuizLesson, QuizQuestion } from './types.ts';

type BankIndex = { questions: Map<string, QuizQuestion>; lessons: Map<string, QuizLesson>; topics: Map<string, QuizQuestion[]> };
const cache = new WeakMap<QuizBank, BankIndex>();
export function bankIndex(bank: QuizBank): BankIndex {
  const existing = cache.get(bank);
  if (existing) return existing;
  const index: BankIndex = { questions: new Map(bank.questions.map(q => [q.id, q])), lessons: new Map(bank.lessons.map(l => [l.id, l])), topics: new Map() };
  for (const q of bank.questions) { const list = index.topics.get(q.topic) ?? []; list.push(q); index.topics.set(q.topic, list); }
  cache.set(bank, index);
  return index;
}
