export const TASK_CATEGORIES = ["Pranayama", "Work", "Health", "Mind"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskInput = {
  title: string;
  category: TaskCategory;
  timeMinutes?: number;
  recurrence: "daily" | "once";
};
export type TaskRecord = TaskInput & {
  id: string;
  startDate: string;
  archivedDate?: string;
  createdAt: number;
};
export type Task = TaskRecord & { done: boolean; time: string };
export type TasksData = {
  version: 1;
  records: TaskRecord[];
  completions: Record<string, string[]>;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
export function validTaskInput(value: TaskInput) {
  return (
    value.title.trim().length > 0 &&
    value.title.trim().length <= 120 &&
    TASK_CATEGORIES.includes(value.category) &&
    (value.recurrence === "daily" || value.recurrence === "once") &&
    (value.timeMinutes === undefined ||
      (Number.isInteger(value.timeMinutes) &&
        value.timeMinutes >= 0 &&
        value.timeMinutes < 1440))
  );
}

export function parseTasksData(raw: string): TasksData {
  const data = JSON.parse(raw) as TasksData;
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.records) ||
    !data.completions ||
    typeof data.completions !== "object" ||
    Array.isArray(data.completions)
  )
    throw new Error("Invalid task storage");
  const ids = new Set<string>();
  for (const task of data.records) {
    if (
      !task ||
      typeof task.title !== "string" ||
      !validTaskInput(task) ||
      typeof task.id !== "string" ||
      !task.id ||
      ids.has(task.id) ||
      !validDate(task.startDate) ||
      !Number.isFinite(task.createdAt) ||
      (task.archivedDate !== undefined && !validDate(task.archivedDate))
    )
      throw new Error("Invalid task record");
    ids.add(task.id);
  }
  for (const [id, dates] of Object.entries(data.completions)) {
    if (
      !ids.has(id) ||
      !Array.isArray(dates) ||
      dates.some((date) => !validDate(date)) ||
      new Set(dates).size !== dates.length
    )
      throw new Error("Invalid task completion");
  }
  return data;
}

export function seedTasks(date: string): TasksData {
  const definitions: (TaskInput & { id: string })[] = [
    {
      id: "surya",
      title: "Morning Surya Namaskar & 10 min Dhyana",
      category: "Pranayama",
      timeMinutes: 405,
      recurrence: "daily",
    },
    {
      id: "proposal",
      title: "Finish project proposal",
      category: "Work",
      timeMinutes: 660,
      recurrence: "daily",
    },
    {
      id: "walk",
      title: "Gym & evening walk",
      category: "Health",
      timeMinutes: 1140,
      recurrence: "daily",
    },
    {
      id: "read",
      title: "Read 10 pages of Upanishads",
      category: "Mind",
      timeMinutes: 990,
      recurrence: "daily",
    },
  ];
  return {
    version: 1,
    records: definitions.map((task, index) => ({
      ...task,
      startDate: date,
      createdAt: index,
    })),
    completions: {},
  };
}

export function formatTaskTime(minutes?: number) {
  if (minutes === undefined) return "Anytime";
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function tasksForDate(data: TasksData, date: string): Task[] {
  return data.records
    .filter((task) => {
      if (
        task.startDate > date ||
        (task.archivedDate && task.archivedDate <= date)
      )
        return false;
      if (task.recurrence === "daily") return true;
      return !(data.completions[task.id] ?? []).some(
        (completed) => completed < date,
      );
    })
    .map((task) => ({
      ...task,
      done: (data.completions[task.id] ?? []).includes(date),
      time: formatTaskTime(task.timeMinutes),
    }))
    .sort(
      (a, b) =>
        (a.timeMinutes ?? 1440) - (b.timeMinutes ?? 1440) ||
        a.createdAt - b.createdAt ||
        a.id.localeCompare(b.id),
    );
}

export function toggleTaskCompletion(
  data: TasksData,
  id: string,
  date: string,
): TasksData {
  if (!tasksForDate(data, date).some((task) => task.id === id)) return data;
  const dates = data.completions[id] ?? [];
  return {
    ...data,
    completions: {
      ...data.completions,
      [id]: dates.includes(date)
        ? dates.filter((item) => item !== date)
        : [...dates, date],
    },
  };
}
