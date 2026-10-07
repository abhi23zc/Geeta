import { parseDailyProgress as parseLegacyProgress, applyReceipts as applyLegacyReceipts, prepareTimezone as prepareLegacyTimezone } from './legacy-model.ts';
import type { DailyProgress as LegacyDailyProgress } from './legacy-model.ts';

// Keep the key: a single atomic replacement upgrades the snapshot without orphaning balances.
export const PROGRESS_KEY = 'geeta:daily-progress-v1';
export type CompletionReceipt = { id: string; kind: 'quiz' | 'ritual'; completedAt: string; startedAt?: string; breathingAt?: string };
export type ProgressDay = { quiz: boolean; ritual: boolean; rewarded: boolean };
export type PointsEntry = { id: string; kind: 'daily' | 'quiz' | 'ritual' | 'missed' | 'milestone'; from: string; to: string; amount: number; days: number; milestone?: number; rule?: 'legacy' | 'inactive-only' };
export type DailyProgress = {
  version: 2; policyChangedAt: string; createdAt: string; timezone: string; activated: string | null;
  settledThrough: string | null; lastObserved: string; balance: number;
  current: number; best: number; total: number; lastCompleted: string | null;
  milestones: number[]; days: Record<string, ProgressDay>; ledger: PointsEntry[];
  preActivation: CompletionReceipt[];
};
const formatters = new Map<string, Intl.DateTimeFormat>();
export function dayKey(now: Date, timezone: string): string {
  let formatter = formatters.get(timezone);
  if (!formatter) { formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }); formatters.set(timezone, formatter); }
  const parts = formatter.formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function shiftDay(day: string, delta: number) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
export function dayDistance(from: string, to: string) { return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000); }
export function emptyDailyProgress(now: Date, timezone: string): DailyProgress {
  return { version: 2, policyChangedAt: now.toISOString(), createdAt: now.toISOString(), timezone, activated: null, settledThrough: null, lastObserved: dayKey(now, timezone), balance: 0, current: 0, best: 0, total: 0, lastCompleted: null, milestones: [], days: {}, ledger: [], preActivation: [] };
}
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const natural = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validReceipt(v: unknown): v is CompletionReceipt {
  if (!object(v) || typeof v.id !== 'string' || !v.id || !['quiz', 'ritual'].includes(String(v.kind)) || typeof v.completedAt !== 'string' || !Number.isFinite(Date.parse(v.completedAt))) return false;
  return v.kind === 'quiz' || (typeof v.startedAt === 'string' && typeof v.breathingAt === 'string' && Number.isFinite(Date.parse(v.startedAt)) && Number.isFinite(Date.parse(v.breathingAt)) && Date.parse(v.startedAt) <= Date.parse(v.breathingAt) && Date.parse(v.breathingAt) <= Date.parse(v.completedAt));
}
export function parseDailyProgress(raw: string | null, now: Date, timezone: string): DailyProgress | LegacyDailyProgress {
  if (raw === null) return emptyDailyProgress(now, timezone);
  const p: unknown = JSON.parse(raw);
  if (object(p) && p.version === 1) return parseLegacyProgress(raw, now, timezone);
  const fail = () => { throw new Error('Saved progress could not be read. Your data has not been reset.'); };
  if (!object(p) || p.version !== 2 || typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt)) || typeof p.policyChangedAt !== 'string' || !Number.isFinite(Date.parse(p.policyChangedAt)) || Date.parse(p.policyChangedAt) < Date.parse(p.createdAt) || typeof p.timezone !== 'string' || !validDate(p.lastObserved) || ![p.activated, p.settledThrough, p.lastCompleted].every(d => d === null || validDate(d)) || ![p.balance, p.current, p.best, p.total].every(natural) || !object(p.days) || !Array.isArray(p.ledger) || !Array.isArray(p.milestones) || p.milestones.some(m => m !== 7 && m !== 30) || new Set(p.milestones).size !== p.milestones.length) return fail();
  if (p.preActivation === undefined) p.preActivation = [];
  if (!Array.isArray(p.preActivation) || !p.preActivation.every(validReceipt) || (p.activated !== null && p.preActivation.length > 0)) return fail();
  try { dayKey(now, p.timezone); } catch { return fail(); }
  const policyDate = dayKey(new Date(p.policyChangedAt), p.timezone);
  for (const [date, d] of Object.entries(p.days)) if (!validDate(date) || !object(d) || !['quiz', 'ritual', 'rewarded'].every(k => typeof d[k] === 'boolean') || (d.rewarded && !(d.quiz && d.ritual)) || (d.quiz && d.ritual && !d.rewarded && !(date < (typeof p.activated === 'string' ? p.activated : p.lastObserved)) && !(p.activated === null && p.preActivation.length > 0 && date <= policyDate))) return fail();
  const ids = new Set<string>(); let balance = 0, missedThrough: string | null = null;
  const days = p.days as Record<string, ProgressDay>;
  const dailyDates = new Set(p.ledger.filter(e => object(e) && e.kind === 'daily').map(e => e.from));
  for (const e of p.ledger) {
    if (!object(e) || typeof e.id !== 'string' || ids.has(e.id) || !['daily', 'quiz', 'ritual', 'missed', 'milestone'].includes(String(e.kind)) || !validDate(e.from) || !validDate(e.to) || e.to < e.from || e.to > p.lastObserved || !Number.isSafeInteger(e.amount) || !natural(e.days) || e.days < 1) return fail();
    if (e.kind === 'daily' && (e.id !== `daily:${e.from}` || e.from !== e.to || e.amount !== 20 || e.days !== 1 || e.from > policyDate || !days[e.from]?.rewarded)) return fail();
    if ((e.kind === 'quiz' || e.kind === 'ritual') && (e.id !== `${e.kind}:${e.from}` || e.from !== e.to || e.amount !== 10 || e.days !== 1 || e.from < policyDate || !days[e.from]?.[e.kind] || dailyDates.has(e.from))) return fail();
    if (e.kind === 'missed' && (e.id !== `missed:${e.from}:${e.to}` || e.days !== dayDistance(e.from, e.to) + 1 || e.amount !== -Math.min(balance, 10 * e.days))) return fail();
    if (e.kind === 'missed') {
      const from = e.from, to = e.to;
      if (missedThrough && from <= missedThrough) return fail();
      missedThrough = to;
      if (!p.activated || e.from <= p.activated || !p.settledThrough || e.to > p.settledThrough || !['legacy', 'inactive-only'].includes(String(e.rule))) return fail();
      if (e.rule === 'legacy' && (to >= policyDate || Object.keys(days).some(date => date >= from && date <= to && days[date].rewarded))) return fail();
      if (e.rule === 'inactive-only' && (from < policyDate || Object.keys(days).some(date => date >= from && date <= to && (days[date].quiz || days[date].ritual)))) return fail();
    }
    if (e.kind === 'milestone' && (!p.milestones.includes(e.milestone) || e.id !== `milestone:${e.milestone}` || e.amount !== (e.milestone === 7 ? 40 : 100) || e.from !== e.to || e.days !== 1)) return fail();
    balance += e.amount as number; if (balance < 0) return fail(); ids.add(e.id);
  }
  const rewarded = Object.entries(p.days).filter(([, d]) => (d as Record<string, unknown>).rewarded).map(([date]) => date).sort();
  for (const [date, d] of Object.entries(days)) {
    if (date < policyDate && d.rewarded && !ids.has(`daily:${date}`)) return fail();
    if (date > policyDate && (['quiz', 'ritual'] as const).some(kind => d[kind] && !ids.has(`${kind}:${date}`))) return fail();
  }
  if (p.preActivation.length && p.ledger.some(e => e.amount > 0)) return fail();
  if (balance !== p.balance || p.total !== rewarded.length || (p.current as number) > (p.best as number) || (p.best as number) > (p.total as number) || p.lastCompleted !== (rewarded.at(-1) ?? null) || p.activated !== (rewarded[0] ?? null) || p.milestones.some(m => !ids.has(`milestone:${m}`))) return fail();
  let best = 0, run = 0, previous: string | null = null;
  for (const date of rewarded) { run = previous === shiftDay(date, -1) ? run + 1 : 1; best = Math.max(best, run); previous = date; }
  const expectedCurrent = previous && p.settledThrough && p.settledThrough > previous ? 0 : run;
  const milestones = p.milestones;
  if (p.best !== best || p.current !== expectedCurrent || Object.keys(p.days).some(d => d > (p.lastObserved as string)) || (typeof p.settledThrough === 'string' && (typeof p.activated !== 'string' || p.settledThrough >= p.lastObserved || p.settledThrough < p.activated)) || [7, 30].some(m => milestones.includes(m) !== (best >= m))) return fail();
  return p as unknown as DailyProgress;
}

/** Recover old earned rewards and close old days before starting the new policy. No backfill. */
export function migrateDailyProgress(p: LegacyDailyProgress, receipts: CompletionReceipt[], now: Date, timezone: string): DailyProgress {
  p = parseLegacyProgress(JSON.stringify(p), now, timezone);
  if (dayKey(now, p.timezone) < p.lastObserved || now.getTime() < Date.parse(p.createdAt) || receipts.some(r => Date.parse(r.completedAt) > now.getTime())) throw new Error('Correct your clock before upgrading saved progress.');
  const recovered = applyLegacyReceipts(prepareLegacyTimezone(p, timezone, now), receipts, now);
  return { ...recovered, version: 2, policyChangedAt: now.toISOString(), ledger: recovered.ledger.map(e => e.kind === 'missed' ? { ...e, rule: 'legacy' } : e) };
}

export function activityPoints(p: DailyProgress, date: string, kind: 'quiz' | 'ritual'): number {
  return p.ledger.some(e => e.id === `daily:${date}` || e.id === `${kind}:${date}`) ? 10 : 0;
}
export function pointsEntryLabel(entry: PointsEntry) {
  if (entry.kind === 'quiz') return 'Quiz reward';
  if (entry.kind === 'ritual') return 'Ritual reward';
  if (entry.kind === 'daily') return 'Daily reward';
  if (entry.kind === 'milestone') return 'Milestone bonus';
  return entry.rule === 'legacy' ? 'Missed-day deduction' : 'Inactive-day deduction';
}
/** Settle ended days in date ranges; cost scales with recorded activities, not absence length. */
export function settle(p: DailyProgress, today: string): DailyProgress {
  if (today < p.lastObserved) return p;
  let next = { ...p, lastObserved: today };
  if (!p.activated) return next;
  const end = shiftDay(today, -1);
  let cursor = shiftDay(p.settledThrough ?? p.activated, 1);
  if (cursor > end) return next;
  const active = Object.keys(p.days).filter(d => d >= cursor && d <= end && (p.days[d].quiz || p.days[d].ritual)).sort();
  const missed = (from: string, to: string) => {
    if (from > to) return;
    const days = dayDistance(from, to) + 1, amount = next.balance === 0 ? 0 : -Math.min(next.balance, days * 10);
    const previous = next.ledger.at(-1);
    const merge = previous?.kind === 'missed' && previous.rule === 'inactive-only' && shiftDay(previous.to, 1) === from;
    const start = merge ? previous.from : from;
    next = { ...next, balance: next.balance + amount, current: 0, ledger: [...(merge ? next.ledger.slice(0, -1) : next.ledger), { id: `missed:${start}:${to}`, kind: 'missed', rule: 'inactive-only', from: start, to, days: days + (merge ? previous.days : 0), amount: amount + (merge ? previous.amount : 0) }] };
  };
  for (const date of active) {
    missed(cursor, shiftDay(date, -1));
    if (!p.days[date].rewarded) next = { ...next, current: 0 };
    cursor = shiftDay(date, 1);
  }
  missed(cursor, end);
  return { ...next, settledThrough: end };
}
export function applyReceipts(p: DailyProgress, receipts: CompletionReceipt[], now: Date): DailyProgress {
  const today = dayKey(now, p.timezone);
  if (today < p.lastObserved) return p;
  let next = p;
  for (const r of [...receipts].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))) {
    if (!validReceipt(r) || Date.parse(r.completedAt) < Date.parse(p.createdAt) || Date.parse(r.completedAt) > now.getTime()) continue;
    const date = dayKey(new Date(r.completedAt), p.timezone);
    if (date > today || date < next.lastObserved || (next.settledThrough && date <= next.settledThrough)) continue;
    if (r.kind === 'ritual' && (dayKey(new Date(r.startedAt!), p.timezone) !== date || dayKey(new Date(r.breathingAt!), p.timezone) !== date)) continue;
    next = settle(next, date);
    const d = { ...(next.days[date] ?? { quiz: false, ritual: false, rewarded: false }), [r.kind]: true };
    const id = `${r.kind}:${date}`;
    if (Date.parse(r.completedAt) >= Date.parse(next.policyChangedAt) && !next.ledger.some(e => e.id === id || e.id === `daily:${date}`)) {
      next = { ...next, balance: next.balance + 10, preActivation: [], ledger: [...next.ledger, { id, kind: r.kind, from: date, to: date, amount: 10, days: 1 }] };
    }
    if (d.quiz && d.ritual && !d.rewarded) {
      d.rewarded = true;
      const streak = next.lastCompleted === shiftDay(date, -1) ? next.current + 1 : 1;
      next = { ...next, preActivation: [], activated: next.activated ?? date, current: streak, best: Math.max(next.best, streak), total: next.total + 1, lastCompleted: date };
      for (const [milestone, amount] of [[7, 40], [30, 100]]) if (streak >= milestone && !next.milestones.includes(milestone)) next = { ...next, balance: next.balance + amount, milestones: [...next.milestones, milestone], ledger: [...next.ledger, { id: `milestone:${milestone}`, kind: 'milestone', from: date, to: date, days: 1, amount, milestone }] };
    }
    next = { ...next, days: { ...next.days, [date]: d } };
  }
  return settle(next, today);
}
export function createProgressWriter(save: (raw: string) => Promise<void>) {
  let tail: Promise<unknown> = Promise.resolve();
  return { run<T>(operation: () => Promise<T>): Promise<T> { const next = tail.then(operation); tail = next.catch(() => undefined); return next; }, save(p: DailyProgress) { return save(JSON.stringify(p)); } };
}
/** Freeze after the first award, even when the combined streak has not activated. */
export function prepareTimezone(p: DailyProgress, timezone: string, now: Date): DailyProgress {
  if (p.activated || p.ledger.some(e => e.amount > 0) || p.timezone === timezone) return p;
  const today = dayKey(now, timezone), days: Record<string, ProgressDay> = {};
  for (const r of p.preActivation) {
    const date = dayKey(new Date(r.completedAt), timezone);
    if (date > today || (r.kind === 'ritual' && (dayKey(new Date(r.startedAt!), timezone) !== date || dayKey(new Date(r.breathingAt!), timezone) !== date))) continue;
    days[date] = { ...(days[date] ?? { quiz: false, ritual: false, rewarded: false }), [r.kind]: true };
  }
  const rebased = { ...p, timezone, days, lastObserved: today };
  // Retained legacy receipts may rebase flags, never earn retroactive task points.
  return { ...rebased, preActivation: p.preActivation };
}
