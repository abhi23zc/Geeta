import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { localDateKey } from "@/data/gita-verses";
import { useLocalDateKey } from "@/hooks/use-local-date-key";

type DailyReflection = {
  verseId: string;
  text: string;
  completedAt?: string;
};

type GitaProgress = {
  bookmarks: string[];
  reflections: Record<string, DailyReflection>;
  breathingCompletedDates: string[];
};

type GitaContextValue = {
  ready: boolean;
  bookmarks: ReadonlySet<string>;
  completedDates: ReadonlySet<string>;
  breathingCompletedDates: ReadonlySet<string>;
  streak: number;
  getReflection: (dateKey: string) => DailyReflection | undefined;
  toggleBookmark: (verseId: string) => void;
  saveReflection: (dateKey: string, verseId: string, text: string) => void;
  completeReflection: (dateKey: string, verseId: string, text: string) => boolean;
  completeBreathing: (dateKey?: string) => void;
};

const STORAGE_KEY = "morning-ritual:gita-progress-v1";
const EMPTY_PROGRESS: GitaProgress = {
  bookmarks: [],
  reflections: {},
  breathingCompletedDates: [],
};
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

function sanitizeProgress(value: unknown): GitaProgress {
  if (!value || typeof value !== "object") return EMPTY_PROGRESS;
  const candidate = value as Partial<GitaProgress>;
  return {
    bookmarks: Array.isArray(candidate.bookmarks)
      ? candidate.bookmarks.filter((item): item is string => typeof item === "string")
      : [],
    reflections:
      candidate.reflections && typeof candidate.reflections === "object"
        ? candidate.reflections
        : {},
    breathingCompletedDates: Array.isArray(candidate.breathingCompletedDates)
      ? candidate.breathingCompletedDates.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

export function GitaProvider({ children }: PropsWithChildren) {
  const today = useLocalDateKey();
  const [progress, setProgress] = useState<GitaProgress>(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setProgress(sanitizeProgress(JSON.parse(value)));
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch(() => undefined);
  }, [progress, ready]);

  const toggleBookmark = useCallback((verseId: string) => {
    setProgress((current) => ({
      ...current,
      bookmarks: current.bookmarks.includes(verseId)
        ? current.bookmarks.filter((id) => id !== verseId)
        : [...current.bookmarks, verseId],
    }));
  }, []);

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
    [],
  );

  const completeReflection = useCallback(
    (dateKey: string, verseId: string, text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return false;
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
    [],
  );

  const completeBreathing = useCallback((dateKey = localDateKey()) => {
    setProgress((current) =>
      current.breathingCompletedDates.includes(dateKey)
        ? current
        : {
            ...current,
            breathingCompletedDates: [...current.breathingCompletedDates, dateKey],
          },
    );
  }, []);

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
      bookmarks,
      completedDates,
      breathingCompletedDates,
      streak: calculateStreak(completedDates, today),
      getReflection: (dateKey) => progress.reflections[dateKey],
      toggleBookmark,
      saveReflection,
      completeReflection,
      completeBreathing,
    };
  }, [completeBreathing, completeReflection, progress, ready, saveReflection, today, toggleBookmark]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useGitaProgress() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing GitaProvider");
  return context;
}
