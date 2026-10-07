import { useEffect, useId, useSyncExternalStore } from 'react';
import { createTreePlaybackController } from './session-model';
const controller = createTreePlaybackController();
export function useTreePlaybackLease(requested: boolean, priority = 1) {
  const id = useId();
  const current = useSyncExternalStore(controller.subscribe, controller.owner, () => null);
  useEffect(() => {
    if (!requested) return;
    controller.request(id, priority);
    return () => controller.release(id);
  }, [id, requested, priority]);
  return requested && current === id;
}
