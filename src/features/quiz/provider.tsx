import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { reconcileBank } from './engine';
import { createQuizStorage, parseProgress, QUIZ_STORAGE_KEY } from './storage';
import type { QuizBank, QuizProgress } from './types';
import { useLanguage } from '@/i18n/provider';
import { useProgress } from '@/features/progress/provider';
import { progressTransaction } from '@/features/progress/transactions';
import { withQuizReward } from '@/features/progress/quiz-receipts';

type ContextValue = { bank: QuizBank | null; progress: QuizProgress | null; busy: boolean; error: string | null; retry: () => void; commit: (update: (p: QuizProgress) => QuizProgress) => Promise<boolean>; reset: () => Promise<void> };
const Context = createContext<ContextValue | null>(null);
export function QuizProvider({ children }: React.PropsWithChildren) {
  const { language } = useLanguage();
  const { refresh: refreshRewards } = useProgress();
  const [bank, setBank] = useState<QuizBank | null>(null), [progress, setProgress] = useState<QuizProgress | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const current = useRef<QuizProgress | null>(null), locked = useRef(false), mounted = useRef(true);
  const storage = useRef(createQuizStorage(raw => AsyncStorage.setItem(QUIZ_STORAGE_KEY, raw)));
  const load = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const { bundledRepository } = await import('./bank');
      const [nextBank, raw] = await Promise.all([bundledRepository.load(), AsyncStorage.getItem(QUIZ_STORAGE_KEY)]);
      const next = reconcileBank(parseProgress(raw), nextBank);
      if (next.pendingRewards?.length && await refreshRewards()) {
        next.pendingRewards = [];
        await storage.current.commit(next);
      }
      if (mounted.current) { current.current = next; setBank(nextBank); setProgress(next); setError(null); }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Unable to load quiz.'); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }, [refreshRewards]);
  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => { void load(); }, 0);
    const listener = AppState.addEventListener('change', state => { if (state === 'active' && !current.current) void load(); });
    return () => { mounted.current = false; clearTimeout(timer); listener.remove(); };
  }, [load]);
  const commit = useCallback(async (update: (p: QuizProgress) => QuizProgress) => {
    if (locked.current || !current.current) return false;
    locked.current = true; setBusy(true);
    try {
      const updated = update({ ...current.current, settings: { ...current.current.settings, language } });
      let next = bank ? reconcileBank(updated, bank) : updated;
      await progressTransaction(async () => {
        next = withQuizReward(current.current!, next, new Date().toISOString());
        await storage.current.commit(next);
      });
      current.current = next;
      if (next.pendingRewards?.length && await refreshRewards()) {
        const acknowledged = { ...next, pendingRewards: [] };
        // The original outbox remains durable if cleanup fails; reward replay is idempotent.
        try { await storage.current.commit(acknowledged); current.current = acknowledged; } catch { /* retry on next load/commit */ }
      }
      if (mounted.current) { setProgress(current.current); setError(null); }
      return true;
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Could not save. Please try again.'); return false; }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }, [bank, language, refreshRewards]);
  const reset = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    if (current.current?.pendingRewards?.length && !(await refreshRewards())) {
      locked.current = false; setBusy(false); setError('Save pending daily progress before resetting quiz.'); return;
    }
    try { await AsyncStorage.removeItem(QUIZ_STORAGE_KEY); current.current = null; setProgress(null); setError(null); }
    catch { setError('Could not reset quiz. Please retry.'); }
    finally { locked.current = false; setBusy(false); }
    await load();
  }, [load, refreshRewards]);
  const displayed = React.useMemo(() => progress ? { ...progress, settings: { ...progress.settings, language } } : null, [progress, language]);
  return <Context.Provider value={{ bank, progress: displayed, busy, error, retry: () => { void load(); }, commit, reset }}>{children}</Context.Provider>;
}
export function useQuiz() { const value = useContext(Context); if (!value) throw new Error('QuizProvider missing'); return value; }
