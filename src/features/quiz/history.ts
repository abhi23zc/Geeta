import type { Difficulty, Mode, RoundSummary } from './types.ts';

export const HISTORY_FILTERS = ['all', 'solo', 'family'] as const;
export type HistoryFilter = typeof HISTORY_FILTERS[number];
export const HISTORY_MODE_LABELS = {
  journey: 'Learning Journey', quick: 'Quick Quiz', revision: 'Revision',
  together: 'Play Together', turns: 'Take Turns',
} as const satisfies Record<Mode, string>;
const difficultyLabels = { any: 'Any difficulty', easy: 'Easy', medium: 'Medium', advanced: 'Advanced' } as const satisfies Record<Difficulty | 'any', string>;

/** Preserve completion order, including rounds with the same saved date. Never sort by ID. */
export function filterHistory(history: readonly RoundSummary[], filter: HistoryFilter): RoundSummary[] {
  return history.filter(round => {
    const family = round.mode === 'together' || round.mode === 'turns';
    return filter === 'all' || (filter === 'family' ? family : !family);
  });
}
export function historyDifficultyLabel(round: RoundSummary) {
  if (round.mode === 'turns') return 'Balanced Easy + Medium' as const;
  if (round.mode === 'journey' || round.mode === 'together') return null;
  return difficultyLabels[round.difficulty];
}
/** Saved dates are calendar labels, not UTC completion instants. Format this with timeZone: UTC. */
export function historyCalendarDate(date: string): Date { return new Date(`${date}T12:00:00Z`); }
