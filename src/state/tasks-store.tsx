import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { localDateKey } from "@/data/gita-verses";
import { useLocalDateKey } from "@/hooks/use-local-date-key";
import { createSnapshotWriter } from "./snapshot-writer";
import {
  parseTasksData,
  seedTasks,
  tasksForDate,
  toggleTaskCompletion,
  validTaskInput,
  type Task,
  type TaskInput,
  type TasksData,
} from "./tasks-model";

export type { Task } from "./tasks-model";
const STORAGE_KEY = "morning-ritual:tasks-v1";
type TasksContext = {
  ready: boolean;
  today: string;
  tasks: Task[];
  done: number;
  loadError: boolean;
  saveError: boolean;
  createTask: (input: TaskInput) => boolean;
  updateTask: (id: string, input: TaskInput) => boolean;
  archiveTask: (id: string) => void;
  toggleCompletion: (id: string) => void;
  retry: () => void;
  reset: () => void;
};
const Context = createContext<TasksContext | null>(null);

export function TasksProvider({ children }: React.PropsWithChildren) {
  const today = useLocalDateKey();
  const [data, setData] = useState<TasksData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const mounted = useRef(true);
  const latest = useRef<TasksData | null>(null);
  const idSequence = useRef(0);
  const [writer] = useState(() =>
    createSnapshotWriter<TasksData>(
      (snapshot) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)),
      (failed) => {
        if (mounted.current) setSaveError(failed);
      },
    ),
  );
  const flush = writer.flush;

  const commit = useCallback(
    (next: TasksData) => {
      latest.current = next;
      writer.enqueue(next);
      setData(next);
    },
    [writer],
  );

  const load = useCallback(() => {
    return AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted.current) return;
        const next =
          raw === null ? seedTasks(localDateKey()) : parseTasksData(raw);
        latest.current = next;
        setData(next);
        setLoadError(false);
        if (raw === null) commit(next);
      })
      .catch(() => {
        if (mounted.current) setLoadError(true);
      });
  }, [commit]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void flush();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      void flush();
    };
  }, [flush, load]);

  const createTask = useCallback(
    (input: TaskInput) => {
      const current = latest.current;
      if (!current || !validTaskInput(input)) return false;
      const createdAt = Date.now();
      const id = `task-${createdAt}-${++idSequence.current}-${Math.random().toString(36).slice(2, 8)}`;
      commit({
        ...current,
        records: [
          ...current.records,
          {
            ...input,
            title: input.title.trim(),
            id,
            createdAt,
            startDate: localDateKey(),
          },
        ],
      });
      return true;
    },
    [commit],
  );
  const updateTask = useCallback(
    (id: string, input: TaskInput) => {
      const current = latest.current;
      if (
        !current ||
        !validTaskInput(input) ||
        !current.records.some((task) => task.id === id && !task.archivedDate)
      )
        return false;
      commit({
        ...current,
        records: current.records.map((task) =>
          task.id === id
            ? { ...task, ...input, title: input.title.trim() }
            : task,
        ),
      });
      return true;
    },
    [commit],
  );
  const archiveTask = useCallback(
    (id: string) => {
      const current = latest.current;
      if (!current) return;
      commit({
        ...current,
        records: current.records.map((task) =>
          task.id === id ? { ...task, archivedDate: localDateKey() } : task,
        ),
      });
    },
    [commit],
  );
  const toggleCompletion = useCallback(
    (id: string) => {
      const current = latest.current;
      if (current) commit(toggleTaskCompletion(current, id, localDateKey()));
    },
    [commit],
  );
  const retry = useCallback(() => {
    if (latest.current) {
      writer.enqueue(latest.current);
      void flush();
    } else void load();
  }, [flush, load, writer]);
  const reset = useCallback(() => {
    setLoadError(false);
    commit(seedTasks(localDateKey()));
  }, [commit]);
  const tasks = useMemo(
    () => (data ? tasksForDate(data, today) : []),
    [data, today],
  );
  const value = useMemo(
    () => ({
      ready: data !== null,
      today,
      tasks,
      done: tasks.filter((task) => task.done).length,
      loadError,
      saveError,
      createTask,
      updateTask,
      archiveTask,
      toggleCompletion,
      retry,
      reset,
    }),
    [
      data,
      today,
      tasks,
      loadError,
      saveError,
      createTask,
      updateTask,
      archiveTask,
      toggleCompletion,
      retry,
      reset,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTasks() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing TasksProvider");
  return context;
}
