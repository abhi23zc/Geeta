/** Match native-stack's registration contract against the live state, not a render snapshot. */
export function createRouteRemovalProtection(options: {
  routeKey: string;
  getState: () => { routes: readonly { key: string }[] } | undefined;
  shouldPrevent: () => boolean;
  register: (prevent: boolean) => void;
}) {
  let disposed = false;
  const protectedNow = () => !disposed && options.shouldPrevent() &&
    !!options.getState()?.routes.some(route => route.key === options.routeKey);
  return {
    refresh() { options.register(protectedNow()); },
    beforeRemove(event: { preventDefault: () => void }, handle: () => void) {
      if (!protectedNow()) return;
      event.preventDefault();
      handle();
    },
    dispose() { disposed = true; options.register(false); },
  };
}
