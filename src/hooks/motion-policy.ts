export type MotionEnvironment = { active: boolean; reduced: boolean; motionReady: boolean };
export function decorativeMotionAllowed(focused: boolean, environment: MotionEnvironment) {
  return focused && environment.active && environment.motionReady && !environment.reduced;
}

/** One native listener pair for every mounted decorative animation. */
export function createMotionEnvironmentStore(adapter: {
  active: () => boolean;
  reduced: () => Promise<boolean>;
  listenActive: (publish: (active: boolean) => void) => () => void;
  listenReduced: (publish: (reduced: boolean) => void) => () => void;
}) {
  let snapshot: MotionEnvironment = { active: adapter.active(), reduced: true, motionReady: false };
  const listeners = new Set<() => void>();
  let dispose: (() => void) | undefined;
  let generation = 0;
  const publish = (patch: Partial<MotionEnvironment>) => {
    const next = { ...snapshot, ...patch };
    if (next.active === snapshot.active && next.reduced === snapshot.reduced && next.motionReady === snapshot.motionReady) return;
    snapshot = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (!dispose) {
        const epoch = ++generation;
        publish({ active: adapter.active(), reduced: true, motionReady: false });
        const stopActive = adapter.listenActive(active => publish({ active }));
        let preferenceChanged = false;
        const stopReduced = adapter.listenReduced(reduced => { preferenceChanged = true; publish({ reduced, motionReady: true }); });
        dispose = () => { stopActive(); stopReduced(); };
        void adapter.reduced().then(reduced => {
          if (epoch === generation && !preferenceChanged) publish({ reduced, motionReady: true });
        }).catch(() => { if (epoch === generation) publish({ motionReady: true }); });
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { generation++; dispose?.(); dispose = undefined; }
      };
    },
  };
}
