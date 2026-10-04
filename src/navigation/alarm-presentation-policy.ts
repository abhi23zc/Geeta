export const ritualRoutes = { wake: 'alarm/wake', breathe: 'breathe', gita: 'gita' } as const;
export function isRitualRoute(route: string | undefined): boolean {
  return route !== undefined && Object.values(ritualRoutes).some(value => value === route);
}

/** A startup snapshot must not be mistaken for an authenticated ritual exit. */
export function canEndRitualOnExit(
  state: { active: boolean; locked: boolean; loading: boolean; stage: string | null },
  route: string,
  focused: boolean,
) {
  return state.active && !state.locked && !state.loading && state.stage !== 'wake' &&
    focused && !isRitualRoute(route);
}

/** Resolve removal destinations before allowing a locked ritual to leave. */
export function ritualRemovalAllowed(
  action: { type: string; payload?: { name?: string; count?: number; routes?: { name: string }[] } },
  state: { index?: number; routes: { name: string }[] } | undefined,
) {
  if (!state) return false;
  if (['REPLACE', 'NAVIGATE', 'PUSH', 'POP_TO'].includes(action.type) && action.payload?.name) return isRitualRoute(action.payload.name);
  if (action.type === 'RESET') return !!action.payload?.routes?.length && action.payload.routes.every(route => isRitualRoute(route.name));
  if (action.type === 'GO_BACK' || action.type === 'POP' || action.type === 'POP_TO_TOP') {
    const index = action.type === 'POP_TO_TOP' ? 0 : (state.index ?? 0) - (action.payload?.count ?? 1);
    return isRitualRoute(state.routes[index]?.name);
  }
  return false;
}
