/** Coalesces pending snapshots and permits only one storage write at a time. */
export function createSnapshotWriter<T>(
  save: (snapshot: T) => Promise<void>,
  onError: (failed: boolean) => void,
  delay = 120,
) {
  let pending: T | undefined;
  let running: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = (): Promise<void> => {
    clearTimeout(timer);
    timer = undefined;
    if (running) return running;
    running = (async () => {
      while (pending !== undefined) {
        const snapshot = pending;
        pending = undefined;
        try {
          await save(snapshot);
          onError(false);
        } catch {
          if (pending === undefined) pending = snapshot;
          onError(true);
          break;
        }
      }
    })().finally(() => {
      running = undefined;
    });
    return running;
  };

  const enqueue = (snapshot: T) => {
    pending = snapshot;
    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, delay);
  };
  return { enqueue, flush };
}
