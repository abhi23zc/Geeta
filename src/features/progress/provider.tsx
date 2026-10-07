import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { acknowledgeRewardReceipts, getPendingRewardReceipts, isRewardAlarmAvailable } from '@/services/alarm';
import { applyReceipts, createProgressWriter, dayKey, emptyDailyProgress, migrateDailyProgress, parseDailyProgress, prepareTimezone, PROGRESS_KEY, shiftDay, validReceipt } from './model';
import type { CompletionReceipt, DailyProgress, PointsEntry } from './model';
import { progressTransaction } from './transactions';
import { parseProgress as parseQuizProgress, QUIZ_STORAGE_KEY } from '../quiz/storage';

type ProgressContext = { progress: DailyProgress | null; ready: boolean; error: string | null; today: string; clockWarning: boolean; alarmAvailable: boolean; notice: PointsEntry[]; dismissNotice: () => void; refresh: () => Promise<boolean> };
const Context = createContext<ProgressContext | null>(null);
export function ProgressProvider({ children }: React.PropsWithChildren) {
  const [progress, setProgress] = useState<DailyProgress | null>(null), [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(''), [clockWarning, setClockWarning] = useState(false), [notice, setNotice] = useState<PointsEntry[]>([]);
  const current = useRef<DailyProgress | null>(null), mounted = useRef(true);
  const writer = useRef(createProgressWriter(raw => AsyncStorage.setItem(PROGRESS_KEY, raw)));
  const refresh = useCallback(() => progressTransaction(async () => {
    try {
      const now = new Date();
      const raw = current.current ? undefined : await AsyncStorage.getItem(PROGRESS_KEY);
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      let p = current.current ?? parseDailyProgress(raw ?? null, now, zone);
      const original = p;
      // Replay source outboxes before closing past days. A source read failure must not cause a penalty.
      const [quizRaw, nativeRaw] = await Promise.all([AsyncStorage.getItem(QUIZ_STORAGE_KEY), getPendingRewardReceipts()]);
      const pendingQuiz = parseQuizProgress(quizRaw).pendingRewards ?? [];
      const pendingNative: unknown = JSON.parse(nativeRaw);
      if (!Array.isArray(pendingQuiz) || !pendingQuiz.every(r => validReceipt(r) && r.kind === 'quiz') || !Array.isArray(pendingNative) || !pendingNative.every(r => validReceipt(r) && r.kind === 'ritual')) throw new Error('Completion receipts could not be read. Your data has not been reset.');
      const receipts: CompletionReceipt[] = [...pendingQuiz, ...pendingNative];
      // If the first shared save failed, new-feature source receipts still establish the start.
      // Existing quiz histories never enter this inbox, so this does not backfill old activity.
      if (raw === null && receipts.length) {
        const earliest = receipts.reduce((time, r) => Math.min(time, Date.parse(r.completedAt)), now.getTime());
        p = emptyDailyProgress(new Date(earliest), p.timezone);
      }
      const migrating = p.version === 1;
      const prepared = p.version === 1 ? migrateDailyProgress(p, receipts, now, zone) : prepareTimezone(p, zone, now);
      const date = dayKey(now, prepared.timezone);
      const next = migrating ? prepared : applyReceipts(prepared, receipts, now);
      if (!current.current || JSON.stringify(next) !== JSON.stringify(original)) await writer.current.save(next);
      current.current = next;
      if (mounted.current) {
        setProgress(next); setToday(date); setClockWarning(date < prepared.lastObserved || receipts.some(r => Date.parse(r.completedAt) > now.getTime())); setError(null);
        const oldIds = new Set(original.ledger.map(e => e.id));
        const added = next.ledger.filter(e => !oldIds.has(e.id)).map(e => {
          const previous = p.ledger.at(-1);
          return e.kind === 'missed' && previous?.kind === 'missed' && e.from === previous.from
            ? { ...e, from: shiftDay(previous.to, 1), amount: e.amount - previous.amount, days: e.days - previous.days } : e;
        });
        if (!migrating && added.length) setNotice(added);
      }
      if (date < prepared.lastObserved || receipts.some(r => Date.parse(r.completedAt) > now.getTime())) return false;
      await acknowledgeRewardReceipts(pendingNative.map(r => r.id));
      return true;
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Could not save progress. Please retry.');
      return false;
    }
  }), []);
  useEffect(() => {
    mounted.current = true; void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    // Date in the profile timezone, including daylight-saving, is checked while foregrounded.
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && current.current && dayKey(new Date(), current.current.timezone) !== current.current.lastObserved) void refresh();
    }, 30000);
    return () => { mounted.current = false; subscription.remove(); clearInterval(timer); };
  }, [refresh]);
  return <Context.Provider value={{ progress, ready: !!progress, error, today, clockWarning, alarmAvailable: isRewardAlarmAvailable, notice, dismissNotice: () => setNotice([]), refresh }}>{children}</Context.Provider>;
}
export function useProgress() { const value = useContext(Context); if (!value) throw new Error('ProgressProvider missing'); return value; }
