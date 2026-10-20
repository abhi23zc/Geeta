import { parseDailyProgress as parseLegacyProgress } from './legacy-model.ts';
import * as v2 from './v2-model.ts';
import * as v3 from './v3-model.ts';
import type { DailyProgress as LegacyDailyProgress } from './legacy-model.ts';

// Keep the key: a single atomic replacement upgrades the snapshot without orphaning balances.
export const PROGRESS_KEY = 'geeta:daily-progress-v1';
export type CompletionReceipt = { id: string; kind: 'quiz' | 'ritual' | 'jaap-active' | 'jaap'; completedAt: string; startedAt?: string; breathingAt?: string };
export type ProgressDay = { quiz: boolean; ritual: boolean; rewarded: boolean; jaap?: boolean; jaapBonus?: boolean };
export type PointsEntry = { id: string; kind: 'daily' | 'quiz' | 'ritual' | 'jaap' | 'missed' | 'milestone'; from: string; to: string; amount: number; days: number; milestone?: number; cycle?: number; rule?: 'legacy' | 'inactive-only' };
export type TreeTransition = { revision: number; kind: 'growth' | 'loss' | 'rollover'; from: number; to: number; lost: number; date: string; cycle: number };
export type TreeState = { cycle: number; level: number; started: string; completed: string | null; bonuses: number[]; completedCount: number; revision: number; transition: TreeTransition | null; policyStarted: string };
export type DailyProgress = {
  version: 4; tree: TreeState; policyChangedAt: string; createdAt: string; timezone: string; activated: string | null;
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
  return { version: 4, tree: initialTree(dayKey(now, timezone)), policyChangedAt: now.toISOString(), createdAt: now.toISOString(), timezone, activated: null, settledThrough: null, lastObserved: dayKey(now, timezone), balance: 0, current: 0, best: 0, total: 0, lastCompleted: null, milestones: [], days: {}, ledger: [], preActivation: [] };
}
function initialTree(date: string): TreeState { return { cycle: 1, level: 0, started: date, completed: null, bonuses: [], completedCount: 0, revision: 0, transition: null, policyStarted: date }; }
function transition(p: DailyProgress, kind: TreeTransition['kind'], level: number, date: string, lost = 0): DailyProgress {
  const revision = p.tree.revision + 1;
  return { ...p, tree: { ...p.tree, level, revision, transition: { revision, kind, from: p.tree.level, to: level, lost, date, cycle: p.tree.cycle } } };
}
function rollover(p: DailyProgress, date: string): DailyProgress {
  if (!p.tree.completed || date <= p.tree.completed) return p;
  const started = shiftDay(p.tree.completed, 1);
  const next = transition(p, 'rollover', 0, started);
  return { ...next, current: 0, tree: { ...next.tree, cycle: p.tree.cycle + 1, started, completed: null, bonuses: [], transition: { ...next.tree.transition!, cycle: p.tree.cycle + 1 } } };
}
function lose(p: DailyProgress, from: string, to: string): DailyProgress {
  if (from > to) return p;
  p = rollover(p, from);
  if (p.tree.completed) return p;
  from = [from, p.tree.policyStarted, p.tree.started].sort().at(-1)!;
  if (from > to) return p;
  const lost = dayDistance(from, to) + 1;
  return { ...transition(p, 'loss', Math.max(0, p.tree.level - lost), to, lost), current: 0 };
}
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const natural = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validReceipt(v: unknown): v is CompletionReceipt {
  if (!object(v) || typeof v.id !== 'string' || !v.id || !['quiz', 'ritual', 'jaap-active', 'jaap'].includes(String(v.kind)) || typeof v.completedAt !== 'string' || !Number.isFinite(Date.parse(v.completedAt))) return false;
  return v.kind !== 'ritual' || (typeof v.startedAt === 'string' && typeof v.breathingAt === 'string' && Number.isFinite(Date.parse(v.startedAt)) && Number.isFinite(Date.parse(v.breathingAt)) && Date.parse(v.startedAt) <= Date.parse(v.breathingAt) && Date.parse(v.breathingAt) <= Date.parse(v.completedAt));
}
export function parseDailyProgress(raw: string | null, now: Date, timezone: string): DailyProgress | LegacyDailyProgress | v2.DailyProgress | v3.DailyProgress {
  if (raw === null) return emptyDailyProgress(now, timezone);
  const p: unknown = JSON.parse(raw);
  if (object(p) && p.version === 1) return parseLegacyProgress(raw, now, timezone);
  if (object(p) && p.version === 2) return v2.parseDailyProgress(raw, now, timezone);
  if (object(p) && p.version === 3) return v3.parseDailyProgress(raw, now, timezone);
  const fail = () => { throw new Error('Saved progress could not be read. Your data has not been reset.'); };
  if (!object(p) || p.version !== 4 || typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt)) || typeof p.policyChangedAt !== 'string' || !Number.isFinite(Date.parse(p.policyChangedAt)) || Date.parse(p.policyChangedAt) < Date.parse(p.createdAt) || typeof p.timezone !== 'string' || !validDate(p.lastObserved) || ![p.activated, p.settledThrough, p.lastCompleted].every(d => d === null || validDate(d)) || ![p.balance, p.current, p.best, p.total].every(natural) || !object(p.days) || !Array.isArray(p.ledger) || !Array.isArray(p.milestones) || p.milestones.some(m => m !== 7 && m !== 30) || new Set(p.milestones).size !== p.milestones.length) return fail();
  if (p.preActivation === undefined) p.preActivation = [];
  if (!Array.isArray(p.preActivation) || !p.preActivation.every(validReceipt) || (p.activated !== null && p.preActivation.length > 0)) return fail();
  try { dayKey(now, p.timezone); } catch { return fail(); }
  const policyDate = dayKey(new Date(p.policyChangedAt), p.timezone);
  for (const [date, d] of Object.entries(p.days)) if (!validDate(date) || !object(d) || !['quiz', 'ritual', 'rewarded'].every(k => typeof d[k] === 'boolean') || (d.rewarded && !(d.quiz && d.ritual)) || (d.quiz && d.ritual && !d.rewarded && !(date < (typeof p.activated === 'string' ? p.activated : p.lastObserved)) && !(p.activated === null && p.preActivation.length > 0 && date <= policyDate))) return fail();
  const ids = new Set<string>(); let balance = 0, missedThrough: string | null = null;
  const days = p.days as Record<string, ProgressDay>;
  const dailyDates = new Set(p.ledger.filter(e => object(e) && e.kind === 'daily').map(e => e.from));
  for (const e of p.ledger) {
    if (!object(e) || typeof e.id !== 'string' || ids.has(e.id) || !['daily', 'quiz', 'ritual', 'jaap', 'missed', 'milestone'].includes(String(e.kind)) || !validDate(e.from) || !validDate(e.to) || e.to < e.from || e.to > p.lastObserved || !Number.isSafeInteger(e.amount) || !natural(e.days) || e.days < 1) return fail();
    if (e.kind === 'daily' && (e.id !== `daily:${e.from}` || e.from !== e.to || e.amount !== 20 || e.days !== 1 || e.from > policyDate || !days[e.from]?.rewarded)) return fail();
    if ((e.kind === 'quiz' || e.kind === 'ritual') && (e.id !== `${e.kind}:${e.from}` || e.from !== e.to || e.amount !== 10 || e.days !== 1 || e.from < policyDate || !days[e.from]?.[e.kind] || dailyDates.has(e.from))) return fail();
    if (e.kind === 'jaap' && (e.id !== `jaap:${e.from}` || e.from !== e.to || e.amount !== 10 || e.days !== 1 || !days[e.from]?.jaapBonus || !days[e.from]?.jaap)) return fail();
    if (e.kind === 'missed' && (e.id !== `missed:${e.from}:${e.to}` || e.days !== dayDistance(e.from, e.to) + 1 || e.amount !== -Math.min(balance, 10 * e.days))) return fail();
    if (e.kind === 'missed') {
      const from = e.from, to = e.to;
      if (missedThrough && from <= missedThrough) return fail();
      missedThrough = to;
      if (!p.activated || e.from <= p.activated || !p.settledThrough || e.to > p.settledThrough || !['legacy', 'inactive-only'].includes(String(e.rule))) return fail();
      if (e.rule === 'legacy' && (to >= policyDate || Object.keys(days).some(date => date >= from && date <= to && days[date].rewarded))) return fail();
      if (e.rule === 'inactive-only' && (from < policyDate || Object.keys(days).some(date => date >= from && date <= to && (days[date].quiz || days[date].ritual || days[date].jaap)))) return fail();
    }
    if (e.kind === 'milestone' && (!p.milestones.includes(e.milestone) || (![7, 30].includes(e.milestone as number)) || (e.cycle === undefined ? e.id !== `milestone:${e.milestone}` : !natural(e.cycle) || e.cycle < 1 || e.id !== `milestone:${e.cycle}:${e.milestone}`) || e.amount !== (e.milestone === 7 ? 40 : 100) || e.from !== e.to || e.days !== 1)) return fail();
    balance += e.amount as number; if (balance < 0) return fail(); ids.add(e.id);
  }
  const rewarded = Object.entries(p.days).filter(([, d]) => (d as Record<string, unknown>).rewarded).map(([date]) => date).sort();
  for (const [date, d] of Object.entries(days)) {
    if ((d.jaap !== undefined && typeof d.jaap !== 'boolean') || (d.jaapBonus !== undefined && typeof d.jaapBonus !== 'boolean') || (d.jaapBonus && !ids.has(`jaap:${date}`))) return fail();
    if (date < policyDate && d.rewarded && !ids.has(`daily:${date}`)) return fail();
    if (date > policyDate && (['quiz', 'ritual'] as const).some(kind => d[kind] && !ids.has(`${kind}:${date}`))) return fail();
  }
  if (p.preActivation.length && p.ledger.some(e => e.amount > 0)) return fail();
  if (balance !== p.balance || p.total !== rewarded.length || (p.current as number) > (p.best as number) || (p.best as number) > (p.total as number) || p.lastCompleted !== (rewarded.at(-1) ?? null) || p.activated !== (rewarded[0] ?? null) || p.milestones.some(m => !(p.ledger as PointsEntry[]).some(e => e.kind === 'milestone' && e.milestone === m))) return fail();
  let best = 0, run = 0, previous: string | null = null;
  for (const date of rewarded) { run = previous === shiftDay(date, -1) ? run + 1 : 1; best = Math.max(best, run); previous = date; }
  const expectedCurrent = previous && p.settledThrough && p.settledThrough > previous ? 0 : run;

  if ((p.best as number) > best || (p.current as number) > expectedCurrent || Object.keys(p.days).some(d => d > (p.lastObserved as string)) || (typeof p.settledThrough === 'string' && (typeof p.activated !== 'string' || p.settledThrough >= p.lastObserved || p.settledThrough < p.activated))) return fail();
  const t = p.tree;
  if (!object(t) || ![t.cycle, t.level, t.completedCount, t.revision].every(natural) || (t.cycle as number) < 1 || (t.level as number) > 30 || !validDate(t.started) || !validDate(t.policyStarted) || t.started > p.lastObserved || t.policyStarted > p.lastObserved || !(t.completed === null || validDate(t.completed)) || (t.completed !== null && (t.level !== 30 || t.completed < t.started || t.completed > p.lastObserved)) || (t.level === 30 && t.completed === null) || !Array.isArray(t.bonuses) || t.bonuses.some(m => m !== 7 && m !== 30) || new Set(t.bonuses).size !== t.bonuses.length || (p.current as number) > 30 || (t.completedCount as number) !== (t.cycle as number) - 1 + (t.completed ? 1 : 0)) return fail();
  const cycleCurrent = t.cycle === 1 ? Math.min(30, expectedCurrent) : previous && previous >= t.started ? Math.min(expectedCurrent, dayDistance(t.started, previous) + 1) : 0;
  if (p.current !== cycleCurrent || t.policyStarted > t.started) return fail();
  for (const m of [7, 30]) {
    const awarded = ids.has(`milestone:${t.cycle}:${m}`) || (t.cycle === 1 && ids.has(`milestone:${m}`));
    if (t.bonuses.includes(m) !== awarded || ((t.level as number) >= m && !awarded)) return fail();
  }
  if (p.ledger.some(e => e.cycle !== undefined && (!natural(e.cycle) || e.cycle < 1 || e.cycle > (t.cycle as number)))) return fail();
  if (t.transition !== null) {
    const x = t.transition;
    if (!object(x) || x.revision !== t.revision || x.cycle !== t.cycle || !['growth', 'loss', 'rollover'].includes(String(x.kind)) || ![x.from, x.to, x.lost].every(natural) || (x.from as number) > 30 || x.to !== t.level || !validDate(x.date) || x.date > p.lastObserved) return fail();
  } else if (t.revision !== 0) return fail();
  return p as unknown as DailyProgress;
}

/** Recover old earned rewards and close old days before starting the new policy. No backfill. */
export function migrateDailyProgress(p: LegacyDailyProgress | v2.DailyProgress | v3.DailyProgress, receipts: CompletionReceipt[], now: Date, timezone: string): DailyProgress {
  const legacyReceipts = receipts.filter((r): r is v3.CompletionReceipt => r.kind === 'quiz' || r.kind === 'ritual');
  if (p.version === 3) {
    if (dayKey(now, p.timezone) < p.lastObserved || now.getTime() < Date.parse(p.createdAt) || receipts.some(r => Date.parse(r.completedAt) > now.getTime())) throw new Error('Correct your clock before upgrading saved progress.');
    return { ...v3.parseDailyProgress(JSON.stringify(p), now, timezone) as v3.DailyProgress, version: 4 };
  }
  const old = p.version === 1 ? v2.migrateDailyProgress(p, legacyReceipts, now, timezone) : v2.parseDailyProgress(JSON.stringify(p), now, timezone);
  if (old.version !== 2) throw new Error('Invalid migration');
  if (dayKey(now, old.timezone) < old.lastObserved || now.getTime() < Date.parse(old.createdAt) || receipts.some(r => Date.parse(r.completedAt) > now.getTime())) throw new Error('Correct your clock before upgrading saved progress.');
  const recovered = v2.applyReceipts(v2.prepareTimezone(old, timezone, now), legacyReceipts, now);
  const date = dayKey(now, recovered.timezone), level = Math.min(30, recovered.current);
  return { ...recovered, version: 4, current: Math.min(30, recovered.current), tree: { ...initialTree(date), level, bonuses: [...recovered.milestones], completed: level === 30 ? date : null, completedCount: level === 30 ? 1 : 0 } };
}

export function activityPoints(p: DailyProgress, date: string, kind: 'quiz' | 'ritual'): number {
  return p.ledger.some(e => e.id === `daily:${date}` || e.id === `${kind}:${date}`) ? 10 : 0;
}
export function pointsEntryLabel(entry: PointsEntry) {
  if (entry.kind === 'quiz') return 'Quiz reward';
  if (entry.kind === 'ritual') return 'Ritual reward';
  if (entry.kind === 'jaap') return 'Jaap practice bonus';
  if (entry.kind === 'daily') return 'Daily reward';
  if (entry.kind === 'milestone') return 'Milestone bonus';
  return entry.rule === 'legacy' ? 'Missed-day deduction' : 'Inactive-day deduction';
}
/** Settle ended days in date ranges; cost scales with recorded activities, not absence length. */
export function settle(p: DailyProgress, today: string): DailyProgress {
  if (today < p.lastObserved) return p;
  let next = rollover({ ...p, lastObserved: today }, today);
  if (!p.activated) return next;
  const end = shiftDay(today, -1);
  let cursor = shiftDay(p.settledThrough ?? p.activated, 1);
  if (cursor > end) return next;
  const active = Object.keys(p.days).filter(d => d >= cursor && d <= end && (p.days[d].quiz || p.days[d].ritual || p.days[d].jaap)).sort();
  const rolledOver = p.tree.completed !== null && today > p.tree.completed;
  let losses = 0;
  const beforeLevel = next.tree.level;
  const missed = (from: string, to: string) => {
    if (from > to) return;
    losses += Math.max(0, dayDistance([from, next.tree.started, next.tree.policyStarted].sort().at(-1)!, to) + 1);
    next = lose(next, from < next.tree.started ? next.tree.started : from, to);
    const days = dayDistance(from, to) + 1, amount = next.balance === 0 ? 0 : -Math.min(next.balance, days * 10);
    const previous = next.ledger.at(-1);
    const merge = previous?.kind === 'missed' && previous.rule === 'inactive-only' && shiftDay(previous.to, 1) === from;
    const start = merge ? previous.from : from;
    next = { ...next, balance: next.balance + amount, current: 0, ledger: [...(merge ? next.ledger.slice(0, -1) : next.ledger), { id: `missed:${start}:${to}`, kind: 'missed', rule: 'inactive-only', from: start, to, days: days + (merge ? previous.days : 0), amount: amount + (merge ? previous.amount : 0) }] };
  };
  for (const date of active) {
    missed(cursor, shiftDay(date, -1));
    if (!p.days[date].rewarded) { if (date >= next.tree.started && date >= next.tree.policyStarted) losses++; next = lose(next, date, date); }
    cursor = shiftDay(date, 1);
  }
  missed(cursor, end);
  if (rolledOver && next.tree.transition) next = { ...next, tree: { ...next.tree, transition: { ...next.tree.transition, kind: 'rollover', from: 30, lost: losses } } };
  if (losses && next.tree.transition?.kind === 'loss') next = { ...next, tree: { ...next.tree, transition: { ...next.tree.transition, from: beforeLevel, lost: losses } } };
  return { ...next, settledThrough: end };
}
export function applyReceipts(p: DailyProgress, receipts: CompletionReceipt[], now: Date): DailyProgress {
  const today = dayKey(now, p.timezone);
  if (today < p.lastObserved) return p;
  let next = p, recoveredLosses = 0;
  for (const r of [...receipts].sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))) {
    if (!validReceipt(r) || Date.parse(r.completedAt) < Date.parse(p.createdAt) || Date.parse(r.completedAt) > now.getTime()) continue;
    const date = dayKey(new Date(r.completedAt), p.timezone);
    if (date > today || date < next.lastObserved || (next.settledThrough && date <= next.settledThrough)) continue;
    if (r.kind === 'ritual' && (dayKey(new Date(r.startedAt!), p.timezone) !== date || dayKey(new Date(r.breathingAt!), p.timezone) !== date)) continue;
    const beforeRevision = next.tree.revision;
    next = settle(next, date);
    if (next.tree.revision > beforeRevision) recoveredLosses += next.tree.transition?.lost ?? 0;
    const d: ProgressDay = { ...(next.days[date] ?? { quiz: false, ritual: false, rewarded: false }) };
    if (r.kind === 'jaap-active' || r.kind === 'jaap') { d.jaap = true; if (r.kind === 'jaap') d.jaapBonus = true; } else d[r.kind] = true;
    const id = `${r.kind}:${date}`;
    if (r.kind !== 'jaap-active' && Date.parse(r.completedAt) >= Date.parse(next.policyChangedAt) && !next.ledger.some(e => e.id === id || (r.kind !== 'jaap' && e.id === `daily:${date}`))) {
      next = { ...next, balance: next.balance + 10, preActivation: [], ledger: [...next.ledger, { id, kind: r.kind as 'quiz' | 'ritual' | 'jaap', from: date, to: date, amount: 10, days: 1 }] };
    }
    if (d.quiz && d.ritual && !d.rewarded) {
      d.rewarded = true;
      const streak = next.lastCompleted === shiftDay(date, -1) && next.current > 0 ? next.current + 1 : 1;
      const recoveredLoss = recoveredLosses;
      next = transition(next, 'growth', Math.min(30, next.tree.level + 1), date, recoveredLoss);
      if (next.tree.level === 30) next = { ...next, tree: { ...next.tree, completed: date, completedCount: next.tree.completedCount + 1 } };
      next = { ...next, preActivation: [], activated: next.activated ?? date, current: streak, best: Math.max(next.best, streak), total: next.total + 1, lastCompleted: date };
      for (const [milestone, amount] of [[7, 40], [30, 100]]) if (next.tree.level >= milestone && !next.tree.bonuses.includes(milestone)) next = { ...next, tree: { ...next.tree, bonuses: [...next.tree.bonuses, milestone] }, balance: next.balance + amount, milestones: [...new Set([...next.milestones, milestone])], ledger: [...next.ledger, { id: `milestone:${next.tree.cycle}:${milestone}`, cycle: next.tree.cycle, kind: 'milestone', from: date, to: date, days: 1, amount, milestone }] };
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
  if (Object.values(p.days).some(d => d.jaap) || p.activated || p.ledger.some(e => e.amount > 0) || p.timezone === timezone) return p;
  const today = dayKey(now, timezone), days: Record<string, ProgressDay> = {};
  for (const r of p.preActivation) {
    const date = dayKey(new Date(r.completedAt), timezone);
    if (date > today || (r.kind === 'ritual' && (dayKey(new Date(r.startedAt!), timezone) !== date || dayKey(new Date(r.breathingAt!), timezone) !== date))) continue;
    days[date] = { ...(days[date] ?? { quiz: false, ritual: false, rewarded: false }), [r.kind]: true };
  }
  const rebased = { ...p, timezone, days, lastObserved: today, tree: { ...p.tree, started: today, policyStarted: today } };
  // Retained legacy receipts may rebase flags, never earn retroactive task points.
  return { ...rebased, preActivation: p.preActivation };
}
