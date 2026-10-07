import type { DailyProgress } from '../model.ts';

export type GrowthEvent = {
  id: string; profile: string; date: string; streak: number; dailyPoints: number; bonus: number; level?: number; cycle?: number; lost?: number;
};
export const growthStage = (streak: number) => Number.isFinite(streak) ? Math.max(0, Math.min(30, Math.floor(streak))) : 0;
export function growthEvent(previous: Pick<DailyProgress, 'days' | 'ledger'>, next: DailyProgress, today: string, migrating = false): GrowthEvent | null {
  if (migrating || previous.days[today]?.rewarded || !next.days[today]?.rewarded || next.lastCompleted !== today || next.current < 1) return null;
  const old = new Set(previous.ledger.map(entry => entry.id));
  return { id: `${next.createdAt}:${today}`, profile: next.createdAt, date: today, streak: next.current, level: next.tree.level, cycle: next.tree.cycle, lost: next.tree.transition?.lost ?? 0,
    dailyPoints: next.ledger.filter(e => e.from === today && ['daily', 'quiz', 'ritual'].includes(e.kind)).reduce((n, e) => n + e.amount, 0),
    bonus: next.ledger.filter(e => e.from === today && e.kind === 'milestone' && !old.has(e.id)).reduce((n, e) => n + e.amount, 0) };
}

type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
/** Presentation state is deliberately independent of reward persistence. Fail closed on storage failure. */
export function createGrowthPresentation(storage: Storage) {
  let profile = '', acknowledged = '', disabled = false;
  let pending: GrowthEvent | null = null;
  let tail = Promise.resolve();
  const serial = <T,>(action: () => Promise<T>): Promise<T> => {
    const result = tail.then(action); tail = result.then(() => undefined, () => undefined); return result;
  };
  const key = (identity: string) => `geeta:growth-presentation-v1:${encodeURIComponent(identity)}`;
  const save = async (date: string) => {
    await storage.setItem(key(profile), JSON.stringify({ version: 1, profile, acknowledgedThrough: date }));
    acknowledged = date;
  };
  return {
    observe: (previous: Pick<DailyProgress, 'days' | 'ledger' | 'lastCompleted'> & Partial<Pick<DailyProgress, 'tree'>>, next: DailyProgress, today: string, migrating = false) => serial(async () => {
      try {
        if (profile !== next.createdAt) {
          profile = next.createdAt; pending = null; disabled = false; acknowledged = '';
          const raw = await storage.getItem(key(profile));
          if (raw) {
            const value = JSON.parse(raw);
            if (value.version !== 1 || value.profile !== profile || typeof value.acknowledgedThrough !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.acknowledgedThrough) || !Number.isFinite(Date.parse(value.acknowledgedThrough)) || new Date(value.acknowledgedThrough).toISOString().slice(0, 10) !== value.acknowledgedThrough) throw new Error('Invalid presentation marker');
            acknowledged = value.acknowledgedThrough;
          }
          // Existing history is a baseline, not a new achievement notification.
          const recoverable = !migrating && previous.tree?.transition?.kind === 'growth' && previous.tree.transition.date === today;
          if (previous.lastCompleted && previous.lastCompleted > acknowledged && !recoverable) await save(previous.lastCompleted);
        }
        if (pending?.date !== today) pending = null;
        if (disabled) return null;
        let event = growthEvent(previous, next, today, migrating);
        // A crash after the atomic reward save must not swallow its unacknowledged animation.
        if (!event && !migrating && next.tree.transition?.kind === 'growth' && next.tree.transition.date === today) {
          const baseline = { days: { ...next.days, [today]: { ...next.days[today], rewarded: false } }, ledger: next.ledger.filter(e => !(e.from === today && e.kind === 'milestone')) };
          event = growthEvent(baseline, next, today);
        }
        if (event && event.date > acknowledged) pending = event;
        return pending;
      } catch { disabled = true; pending = null; return null; }
    }),
    claim: (id: string, today: string) => serial(async () => {
      if (disabled || !pending || pending.id !== id || pending.date !== today) return null;
      const event = pending; pending = null;
      try { await save(event.date); return event; }
      catch { disabled = true; return null; }
    }),
  };
}
