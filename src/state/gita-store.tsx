import { useRecoverableStore } from "./use-recoverable-store";
import { EMPTY_GITA, parseGitaProgress, salvageGitaProgress, type DailyReflection } from "./persisted-models";
import { getRitualCheckpoint } from "@/services/alarm";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { localDateKey } from "@/data/gita-verses";
import { useLocalDateKey } from "@/hooks/use-local-date-key";

type GitaContextValue = {
  ready: boolean;
  loading: boolean;
  loadError: string | null;
  saveError: boolean;
  corrupt: boolean;
  retryLoad: () => Promise<void>;
  retrySave: () => Promise<void>;
  recover: () => Promise<void>;
  bookmarks: ReadonlySet<string>;
  completedDates: ReadonlySet<string>;
  breathingCompletedDates: ReadonlySet<string>;
  streak: number;
  getReflection: (dateKey: string) => DailyReflection | undefined;
  toggleBookmark: (verseId: string) => void;
  saveReflection: (dateKey: string, verseId: string, text: string) => void;
  completeDailyPractice: (dateKey: string, verseId: string) => void;
  completeReflection: (dateKey: string, verseId: string, text: string) => boolean;
  completeBreathing: (dateKey?: string) => void;
};

const STORAGE_KEY = "morning-ritual:gita-progress-v1";
const Context = createContext<GitaContextValue | null>(null);

function dayBefore(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

function calculateStreak(completed: ReadonlySet<string>, today: string) {
  let cursor = today;
  if (!completed.has(cursor)) cursor = dayBefore(cursor);
  let count = 0;
  while (completed.has(cursor)) {
    count += 1;
    cursor = dayBefore(cursor);
  }
  return count;
}

export function GitaProvider({ children }: PropsWithChildren) {
  const today = useLocalDateKey();
  const store = useRecoverableStore(STORAGE_KEY, EMPTY_GITA, parseGitaProgress, salvageGitaProgress);
  const { data: progress, ready, update: setProgress } = store;
  const pendingBreathing = useRef(new Set<string>());
  useEffect(() => {
    if (!ready) return;
    const checkpoint = getRitualCheckpoint('breathe');
    if (checkpoint?.stage === 'breathe' && checkpoint.elapsed === 70) pendingBreathing.current.add(localDateKey());
    const dates = [...pendingBreathing.current];
    if (dates.length) {
      setProgress(current => ({ ...current, breathingCompletedDates: [...new Set([...current.breathingCompletedDates, ...dates])] }));
      pendingBreathing.current.clear();
    }
  }, [ready, setProgress]);

  const toggleBookmark = useCallback((verseId: string) => {
    setProgress((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(verseId)
        ? current.bookmarks.filter((id) => id !== verseId)
        : [...current.bookmarks, verseId],
    }));
  }, [setProgress]);

  const saveReflection = useCallback(
    (dateKey: string, verseId: string, text: string) => {
      setProgress((current) => ({
        ...current,
        reflections: {
          ...current.reflections,
          [dateKey]: {
            ...current.reflections[dateKey],
            verseId,
            text,
          },
        },
      }));
    },
    [setProgress],
  );

  const completeReflection = useCallback(
    (dateKey: string, verseId: string, text: string) => {
      const cleanText = text.trim();
      if (!cleanText || !ready) return false;
      setProgress((current) => ({
        ...current,
        reflections: {
          ...current.reflections,
          [dateKey]: {
            verseId,
            text: cleanText,
            completedAt: current.reflections[dateKey]?.completedAt ?? new Date().toISOString(),
          },
        },
      }));
      return true;
    },
    [ready, setProgress],
  );

  const completeDailyPractice = useCallback((dateKey: string, verseId: string) => {
    setProgress((current) => {
      if (current.reflections[dateKey]?.completedAt) return current;
      return {
        ...current,
        reflections: {
          ...current.reflections,
          [dateKey]: {
            verseId,
            text: current.reflections[dateKey]?.text ?? "",
            completedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [setProgress]);

  const completeBreathing = useCallback((dateKey = localDateKey()) => {
    if (!ready) { pendingBreathing.current.add(dateKey); return; }
    setProgress((current) =>
      current.breathingCompletedDates.includes(dateKey)
        ? current
        : {
            ...current,
            breathingCompletedDates: [...current.breathingCompletedDates, dateKey],
          },
    );
  }, [ready, setProgress]);

  const value = useMemo<GitaContextValue>(() => {
    const bookmarks = new Set(progress.bookmarks);
    const completedDates = new Set(
      Object.entries(progress.reflections)
        .filter(([, reflection]) => Boolean(reflection.completedAt))
        .map(([date]) => date),
    );
    const breathingCompletedDates = new Set(progress.breathingCompletedDates);
    return {
      ready,
      loading: store.loading, loadError: store.loadError, saveError: store.saveError, corrupt: store.corrupt,
      retryLoad: store.retryLoad, retrySave: store.retrySave, recover: store.recover,
      bookmarks,
      completedDates,
      breathingCompletedDates,
      streak: calculateStreak(completedDates, today),
      getReflection: (dateKey) => progress.reflections[dateKey],
      toggleBookmark,
      saveReflection,
      completeDailyPractice,
      completeReflection,
      completeBreathing,
    };
  }, [completeBreathing, completeDailyPractice, completeReflection, progress, ready, saveReflection, today, toggleBookmark, store.loading, store.loadError, store.saveError, store.corrupt, store.retryLoad, store.retrySave, store.recover]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useGitaProgress() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing GitaProvider");
  return context;
}
