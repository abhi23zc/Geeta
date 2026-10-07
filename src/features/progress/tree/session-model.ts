/** A visit starts at launch or after background, never after a brief inactive overlay. */
export function createTreeSession() {
  let revision = 0, backgrounded = false;
  const visited = new Set<string>();
  return {
    get revision() { return revision; },
    change(state: string) {
      if (state === 'background') backgrounded = true;
      if (state === 'active' && backgrounded) { backgrounded = false; revision++; visited.clear(); return true; }
      return false;
    },
    claim(screen: string) { if (visited.has(screen)) return false; visited.add(screen); return true; },
  };
}
export const playbackPriority = { replay: 1, entry: 2, recovery: 3, celebration: 4 } as const;
export function recoverySteps(from: number, to: number, rollover = false) {
  const count = from - to;
  if (rollover || count > 3 || count <= 0) return [{ from, to, duration: 900 }];
  return Array.from({ length: count }, (_, i) => ({ from: from - i, to: from - i - 1, duration: 700 }));
}
/** Higher-priority playback consumes interrupted attempts rather than queuing a restart. */
export function createTreePlaybackController() {
  let owner: string | null = null;
  const requests = new Map<string, number>();
  const listeners = new Set<() => void>();
  const publish = () => {
    const winner = [...requests].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    for (const id of requests.keys()) if (id !== winner) requests.delete(id);
    owner = winner; listeners.forEach(listener => listener());
  };
  return {
    owner: () => owner,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    request(id: string, priority: number) { requests.set(id, priority); publish(); },
    release(id: string) { requests.delete(id); publish(); },
  };
}
type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
export function createTransitionPresentation(storage: Storage) {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    claim(profile: string, revision: number): Promise<boolean> {
      const result = tail.then(async () => {
        try {
          const key = `geeta:tree-transition:${encodeURIComponent(profile)}`;
          const raw = await storage.getItem(key), previous = raw === null ? 0 : Number(raw);
          if (!Number.isSafeInteger(previous) || previous < 0 || revision <= previous) return false;
          await storage.setItem(key, String(revision));
          return true;
        } catch { return false; }
      });
      tail = result;
      return result;
    },
  };
}
