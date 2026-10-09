import { createSnapshotWriter } from './snapshot-writer.ts';

export type RecoveryStorage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
export type RecoveryState<T> = { data: T; ready: boolean; loading: boolean; loadError: string | null; saveError: boolean; corrupt: boolean };

/** No write can precede a successful read or a verified, explicitly requested backup. */
export function createRecoverableStore<T>(storage: RecoveryStorage, key: string, empty: T, parse: (raw: string) => T, salvage: (raw: string) => T) {
  let state: RecoveryState<T> = { data: empty, ready: false, loading: false, loadError: null, saveError: false, corrupt: false };
  const listeners = new Set<() => void>();
  let loading: Promise<void> | null = null;
  const publish = (patch: Partial<RecoveryState<T>>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const writer = createSnapshotWriter<T>(value => storage.setItem(key, JSON.stringify(value)), failed => publish({ saveError: failed }));
  const load = (recover = false, replacement?: (data: T) => T): Promise<void> => {
    if (loading) return loading;
    if (state.ready) return Promise.resolve();
    publish({ loading: true });
    loading = (async () => {
      let raw: string | null;
      try { raw = await storage.getItem(key); }
      catch { publish({ loadError: 'Saved data could not be loaded. Please retry.', corrupt: false }); return; }
      let data = empty;
      if (raw !== null) {
        try { data = parse(raw); }
        catch {
          if (!recover) { publish({ loadError: 'Saved data is damaged. Retry or recover a preserved copy.', corrupt: true }); return; }
          try {
            const backupKey = `${key}:recovery:${Date.now()}:${Math.random().toString(36).slice(2)}`;
            await storage.setItem(backupKey, raw);
            if (await storage.getItem(backupKey) !== raw) throw new Error('Backup verification failed');
            data = salvage(raw);
            if (replacement) data = replacement(data);
            await storage.setItem(key, JSON.stringify(data));
          } catch { publish({ loadError: 'Recovery could not be saved. Your original data is unchanged.', corrupt: true }); return; }
        }
      }
      publish({ data, ready: true, loadError: null, corrupt: false });
    })().finally(() => { loading = null; publish({ loading: false }); });
    return loading;
  };
  return {
    snapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    load: () => load(), recover: (replacement?: (data: T) => T) => load(true, replacement),
    update(change: (data: T) => T) {
      if (!state.ready) return false;
      const next = change(state.data);
      if (next !== state.data) { publish({ data: next }); writer.enqueue(next); }
      return true;
    },
    retrySave: () => writer.flush(), flush: () => writer.flush(),
  };
}
