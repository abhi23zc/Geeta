/** Defer dispatch until navigator effects have registered, then recheck live ownership. */
export function createRitualRouteRestoration(options: {
  target: () => string | null;
  canNavigate: () => boolean;
  replace: (target: string) => boolean;
  frame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
}) {
  let disposed = false, pending: string | null = null;
  let scheduled: { target: string; id: number } | null = null;
  const invalidate = () => {
    if (scheduled) options.cancelFrame(scheduled.id);
    scheduled = null; pending = null;
  };
  const refresh = () => {
    if (disposed) return;
    const target = options.target();
    if (!target || !options.canNavigate()) { invalidate(); return; }
    if (pending === target || scheduled?.target === target) return;
    invalidate();
    const id = options.frame(() => {
      scheduled = null;
      if (disposed || options.target() !== target || !options.canNavigate()) return;
      pending = target;
      if (!options.replace(target)) pending = null;
    });
    scheduled = { target, id };
  };
  return {
    refresh,
    retry() { invalidate(); refresh(); },
    invalidate,
    dispose() { disposed = true; invalidate(); },
  };
}
